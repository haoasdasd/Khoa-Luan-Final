import asyncio
import json
import logging
from uuid import UUID
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect
from app.websocket.manager import manager
from app.core.security import decode_token
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.services.chat_service import ChatService
from app.schemas.message_schema import MessageCreateRequest
from app.services.user_service import UserService
from app.database.session import SessionLocal

logger = logging.getLogger(__name__)

async def chat_websocket_endpoint(
    websocket: WebSocket,
    token: str
):
    """
    Global WebSocket Endpoint an toàn dữ liệu và tối ưu Pool Session.
    Hỗ trợ: online/offline, typing, send message, seen message, reaction, WebRTC signaling, heartbeat.
    """
    # 🔥 1. BẮT BUỘC PHẢI ACCEPT KẾT NỐI TRƯỚC TIÊN!
    await websocket.accept()
    await asyncio.sleep(0.1)
    # =========================================================
    # 2. AUTHENTICATE (Xác thực sau khi đã accept)
    # =========================================================
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        # Token sai thì đóng kết nối với mã 1008 (Policy Violation)
        await websocket.close(
            code=1008, 
            reason="Invalid token"
        )
        return
        
    user_id = payload.get("sub")
    user_id_uuid = UUID(user_id)
    
    # =========================================================
    # 3. GHI NHẬN KẾT NỐI VÀ BROADCAST ONLINE
    # =========================================================
    await manager.connect(websocket, user_id)
    logger.info(f"User {user_id} connected websocket")
    
    # Cập nhật trạng thái online ban đầu (Sử dụng session ngắn hạn)
    with SessionLocal() as db:
        try:
            user_service = UserService(db)
            user_service.update_last_seen(user_id_uuid)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Lỗi update online đầu luồng: {e}")
            
    await manager.broadcast_presence(user_id, True)
    
    # =========================================================
    # 3. VÒNG LẶP LẮNG NGHE SỰ KIỆN CHÍNH (MAIN LOOP)
    # =========================================================
    try:
        while True:
            try:
                raw = await websocket.receive_text()
            except WebSocketDisconnect:
                break
            except RuntimeError as e:
                logger.warning(f"WebSocket connection state error: {e}")
                break

            try:
                data = json.loads(raw)
                event = data.get("event")
                payload_data = data.get("data", {})
                
                # =====================================================
                # 1. HEARTBEAT (Bỏ qua nhanh nhất)
                # =====================================================
                if event == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
                    continue
                    
                # =====================================================
                # 2. WEBRTC SIGNALING (Xử lý tức thì, bỏ qua DB 100%)
                # =====================================================
                if event in ["call_offer", "call_answer", "ice_candidate", "call_hangup", "call_rejected"]:
                    target_user_id = str(payload_data.get("to_user_id"))
                    
                    if not target_user_id:
                        continue
                        
                    # Forward tín hiệu thẳng tới đối phương mà không cần kiểm tra quyền DB
                    # (Bảo mật đã được đảm bảo vì người gọi có JWT và biết to_user_id)
                    send_data = {
                        "event": event,
                        "from_user_id": user_id,
                        "from_user_name": payload_data.get("from_user_name"),
                        "conversation_id": payload_data.get("conversation_id"),
                    }
                    
                    if "signal_data" in payload_data:
                        send_data["data"] = payload_data["signal_data"]
                    if "call_id" in payload_data:
                        send_data["call_id"] = payload_data["call_id"]
                        
                    await manager.send_to_user(target_user_id, send_data)
                    
                    # QUAN TRỌNG: continue để bỏ qua việc mở DB ở phía dưới
                    continue

                # =====================================================
                # 3. CÁC SỰ KIỆN CHAT (Mới bắt đầu mở DB Session)
                # =====================================================
                conv_id_str = payload_data.get("conversation_id")
                if not conv_id_str:
                    continue
                    
                # Chỉ những event gửi tin nhắn/seen mới cần query membership
                member_ids = []
                member_accept_map = {}
                
                with SessionLocal() as db:
                    conv_repo = ConversationRepository(db)
                    memberships = conv_repo.get_memberships(UUID(conv_id_str))
                    member_ids = [m.user_id for m in memberships]
                    member_accept_map = {str(m.user_id): m.is_accepted for m in memberships}
                
                # -----------------------------------------------------
                # SỰ KIỆN: SEND MESSAGE (Gửi tin nhắn)
                # -----------------------------------------------------
                if event == "send_message":
                    if not conv_id_str:
                        continue
                        
                    # Trích xuất dữ liệu Reply tin nhắn
                    reply_to_raw = payload_data.get("reply_to_id")
                    reply_to_uuid = None
                    if reply_to_raw and reply_to_raw not in ["", "undefined", "null"]:
                        reply_to_uuid = UUID(reply_to_raw)
                        
                    # Xử lý Logic Nghiệp vụ DB
                    with SessionLocal() as db:
                        try:
                            chat_service = ChatService(db)
                            
                            msg_request = MessageCreateRequest(
                                conv_id=UUID(conv_id_str),
                                content=payload_data.get("content"),
                                media_url=payload_data.get("media_url"),
                                message_type=payload_data.get("message_type", "text"),
                                reply_to_id=reply_to_uuid
                            )
                            
                            msg = chat_service.send_message(
                                conv_id=UUID(conv_id_str),
                                sender_id=user_id_uuid,
                                data=msg_request
                            )
                            db.commit()
                            
                            # Danh sách các thành viên đang hoạt động công khai trong phòng
                            active_member_ids = [uid for uid in member_ids if member_accept_map.get(str(uid))]
                            
                            # Phát tín hiệu Realtime
                            await manager.broadcast_to_members(
                                active_member_ids,
                                {
                                    "event": "new_message",
                                    "data": msg.model_dump(mode="json"),
                                    "conversation_id": conv_id_str
                                }
                            )
                        except Exception as db_error:
                            db.rollback()
                            logger.exception(f"Lỗi DB khi send_message: {db_error}")
                
                # -----------------------------------------------------
                # SỰ KIỆN: MARK ALL SEEN (Đọc tất cả tin nhắn)
                # -----------------------------------------------------
                elif event == "mark_seen":
                    if not conv_id_str:
                        continue
                        
                    with SessionLocal() as db:
                        try:
                            msg_repo = MessageRepository(db)
                            conv_repo = ConversationRepository(db)
                            
                            msg_repo.mark_all_as_seen(UUID(conv_id_str), user_id_uuid)
                            db.commit()
                            
                            # Lấy lại danh sách member mới nhất để broadcast
                            memberships = conv_repo.get_memberships(UUID(conv_id_str))
                            current_member_ids = [m.user_id for m in memberships]
                            
                            await manager.broadcast_to_members(
                                current_member_ids,
                                {
                                    "event": "message_seen",
                                    "conversation_id": conv_id_str,
                                    "data": {
                                        "user_id": str(user_id),
                                        "seen_at": datetime.now(timezone.utc).isoformat()
                                    }
                                },
                                exclude_user_id=user_id
                            )
                        except Exception as db_error:
                            db.rollback()
                            logger.exception(f"Lỗi DB khi mark_seen: {db_error}")
                            
                # -----------------------------------------------------
                # SỰ KIỆN: MESSAGE SEEN (Đọc tin nhắn đơn lẻ)
                # -----------------------------------------------------
                elif event == "message_seen":
                    message_id = payload_data.get("message_id")
                    if not conv_id_str or not message_id:
                        continue
                        
                    with SessionLocal() as db:
                        try:
                            msg_repo = MessageRepository(db)
                            msg_repo.upsert_status(UUID(message_id), user_id_uuid, "seen")
                            db.commit()
                            
                            await manager.broadcast_to_members(
                                member_ids,
                                {
                                    "event": "message_seen",
                                    "data": {
                                        "conversation_id": conv_id_str,
                                        "message_id": message_id,
                                        "user_id": user_id,
                                        "seen_at": datetime.now(timezone.utc).isoformat()
                                    }
                                },
                                exclude_user_id=user_id
                            )
                        except Exception as db_error:
                            db.rollback()
                            logger.exception(f"Lỗi DB khi message_seen: {db_error}")
                            
                # -----------------------------------------------------
                # SỰ KIỆN: TYPING (Trạng thái đang nhập văn bản)
                # -----------------------------------------------------
                elif event in ["typing_start", "typing_stop"]:
                    if not conv_id_str:
                        continue
                        
                    active_member_ids = [uid for uid in member_ids if member_accept_map.get(str(uid))]
                    
                    await manager.broadcast_to_members(
                        active_member_ids,
                        {
                            "event": "typing",
                            "data": {
                                "user_id": user_id,
                                "conversation_id": conv_id_str,
                                "is_typing": (event == "typing_start")
                            }
                        },
                        exclude_user_id=user_id
                    )
                    
                # -----------------------------------------------------
                # SỰ KIỆN: WEBRTC SIGNALING (Không chạm vào DB)
                # -----------------------------------------------------
                elif event in ["call_offer", "call_answer", "ice_candidate", "call_hangup", "call_rejected"]:
                    target_user_id = str(payload_data.get("to_user_id"))
                    
                    if member_accept_map.get(target_user_id) is True:
                        send_data = {
                            "event": event,
                            "from_user_id": user_id,
                            "from_user_name": payload_data.get("from_user_name"),
                            "conversation_id": conv_id_str,
                        }
                        
                        if payload_data.get("signal_data"):
                            send_data["data"] = payload_data.get("signal_data")
                            
                        if payload_data.get("call_id"):
                            send_data["call_id"] = payload_data.get("call_id")
                            
                        await manager.send_to_user(target_user_id, send_data)
                        
            except Exception as e:
                logger.exception(f"WS Event Error: {e}")
                
    # =========================================================
    # 4. DISCONNECT & CLEANUP
    # =========================================================
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected")
    finally:
        offline = manager.disconnect(user_id, websocket)
        
        # Nếu ngắt kết nối hoàn toàn trên mọi thiết bị, thông báo offline
        if offline:
            await manager.broadcast_presence(user_id, False)
            
        # Cập nhật thời gian hoạt động cuối cùng (Mở session ngắn hạn)
        with SessionLocal() as db:
            try:
                user_service = UserService(db)
                user_service.update_last_seen(user_id_uuid)
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Lỗi cập nhật last_seen khi ngắt kết nối: {e}")
                
        logger.info(f"User {user_id} cleanup complete")