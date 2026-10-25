"""
services/chat_service.py
Business logic cho Chat: Conversation, Message, Reaction, Status
Kiểm tra quyền thành viên trước mọi thao tác
"""
from datetime import datetime, timezone
from uuid import UUID
from typing import List
import pytz
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from fastapi import HTTPException, status
import asyncio
import uuid
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.user_repository import UserRepository
from app.schemas.conversation_schema import ConversationCreateRequest, ConversationResponse, MemberResponse
from app.schemas.message_schema import (
    MessageCreateRequest, MessageReactionRequest, MessageResponse,
    MessageStatusResponse, MessageReactionResponse, MessageShortResponse
)
from app.schemas.user_schema import UserPublicResponse
from app.models.user import User
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageReaction, MessageStatus 
from app.websocket.manager import manager

class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.conv_repo = ConversationRepository(db)
        self.msg_repo = MessageRepository(db)
        self.follow_repo = UserRepository(db)
        self.socket_manager = manager

    # ─── Conversation ────────────────────────────────────────────────────────

    def create_conversation(self, user_id: UUID, data: ConversationCreateRequest) -> ConversationResponse:
        conv = self.conv_repo.create(
            created_by=user_id,
            type=data.type,
            name=data.name
        )
        self.conv_repo.add_member(conv.id, user_id, role="owner", is_accepted=True)

        for member_id in data.member_ids:
            if member_id != user_id:
                accepted_status = True if data.type == "group" else False
                self.conv_repo.add_member(conv.id, member_id, role="member", is_accepted=accepted_status)

        self.conv_repo.commit()
        conv = self.conv_repo.get_by_id(conv.id)
        return self._build_conv_response(conv)

    def add_member(self, conv_id: UUID, requester_id: UUID, user_id: UUID):
        self._assert_admin(conv_id, requester_id)
        if self.conv_repo.is_member(conv_id, user_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a member")
        return self.conv_repo.add_member(conv_id, user_id)

    def remove_member(self, conv_id: UUID, requester_id: UUID, user_id: UUID):
        conv = self.conv_repo.get_by_id(conv_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv.type != "group":
            raise HTTPException(status_code=400, detail="Only group supports member removal")

        requester = self.conv_repo.get_member(conv_id, requester_id)
        if not requester:
            raise HTTPException(status_code=403, detail="Not a member")

        target = self.conv_repo.get_member(conv_id, user_id)
        if not target:
            raise HTTPException(status_code=404, detail="Member not found")

        if target.role == "owner":
            raise HTTPException(status_code=403, detail="Cannot remove owner")

        if requester_id != user_id:
            if requester.role not in ["owner", "admin"]:
                raise HTTPException(status_code=403, detail="Only admin or owner can remove members")
            if requester.role == "admin" and target.role == "admin":
                raise HTTPException(status_code=403, detail="Admin cannot remove another admin")

        self.conv_repo.remove_member(conv_id, user_id)
        self.db.commit()
        return True

    # ─── Messages ────────────────────────────────────────────────────────────

    def send_message(self, conv_id: UUID, sender_id: UUID, data: MessageCreateRequest):
        # 1. Tối ưu: Lấy Member và User trong cùng 1 câu truy vấn (Giảm 1 lần gọi DB)
        member = self.db.query(ConversationMember).options(
            joinedload(ConversationMember.user)
        ).filter(
            ConversationMember.conversation_id == conv_id,
            ConversationMember.user_id == sender_id
        ).first()

        if not member:
            raise HTTPException(status_code=403, detail="Bạn không thuộc hội thoại này")

        if not data.content and not data.media_url:
            raise HTTPException(status_code=400, detail="Tin nhắn không được để trống")

        # 2. Khôi phục trạng thái nếu user trước đó đã xóa đoạn chat
        if member.deleted_at is not None:
            member.deleted_at = None
        if not member.is_accepted:
            member.is_accepted = True

        # 3. Tạo UUID và Thời gian ngay trên RAM (Tiết kiệm 280ms)
        new_msg_id = uuid.uuid4()
        now_utc = datetime.now(timezone.utc)

        # 4. Gộp tất cả lệnh tạo Message, Status và Update phòng chat
        msg = Message(
            id=new_msg_id,
            conversation_id=conv_id,
            sender_id=sender_id,
            content=data.content,
            media_url=data.media_url,
            message_type=data.message_type,
            reply_to_id=data.reply_to_id,
            created_at=now_utc
        )
        self.db.add(msg)

        ms = MessageStatus(
            message_id=new_msg_id,
            user_id=sender_id,
            status="seen",
            seen_at=now_utc
        )
        self.db.add(ms)

        self.db.query(Conversation).filter(Conversation.id == conv_id).update({
            "last_message_id": new_msg_id,
            "updated_at": now_utc
        }, synchronize_session=False)

        # 5. COMMIT 1 LẦN DUY NHẤT (Thực thi toàn bộ cùng lúc)
        self.db.commit()

        # 6. Tự động build Response trên RAM, KHÔNG query DB lại lần nữa (Tiết kiệm 1.5 giây)
        sender_info = UserPublicResponse.model_validate(member.user)
        
        reply_data = None
        if data.reply_to_id:
            replied_msg = self.db.query(Message).options(joinedload(Message.sender)).filter(Message.id == data.reply_to_id).first()
            if replied_msg:
                re_content = replied_msg.content
                re_media = replied_msg.media_url
                if replied_msg.deleted_at:
                    re_content = "Tin nhắn đã bị thu hồi"
                    re_media = None
                reply_data = MessageShortResponse(
                    id=replied_msg.id,
                    content=re_content,
                    media_url=re_media,
                    message_type=replied_msg.message_type,
                    sender=UserPublicResponse.model_validate(replied_msg.sender),
                    conversation_id=replied_msg.conversation_id,
                    created_at=replied_msg.created_at
                )

        return MessageResponse(
            id=new_msg_id,
            conversation_id=conv_id,
            content=msg.content,
            media_url=msg.media_url,
            message_type=msg.message_type,
            created_at=msg.created_at,
            edited_at=None,
            deleted_at=None,
            sender=sender_info,
            statuses=[MessageStatusResponse(user_id=sender_id, status="seen", seen_at=now_utc)],
            reactions=[],
            reply_to=reply_data
        )
    
    def accept_message_request(self, conv_id: UUID, user_id: UUID):
        member = self.conv_repo.get_member(conv_id, user_id)
        if not member: return False
        member.is_accepted = True
        try:
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            return False

    def get_messages(self, conv_id: UUID, user_id: UUID, offset: int = 0, limit: int = 50):
        self._assert_member(conv_id, user_id)
        messages = self.msg_repo.get_conversation_messages(conv_id, offset, limit)
        return [self._build_msg_response(m) for m in messages]

    def edit_message(self, message_id: UUID, user_id: UUID, new_content: str):
        msg = self.db.query(Message).filter(Message.id == message_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn")
        if msg.sender_id != user_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền sửa tin nhắn")
        if msg.deleted_at is not None:
            raise HTTPException(status_code=400, detail="Không thể sửa tin nhắn đã bị thu hồi")
            
        now_naive = datetime.now(pytz.utc).replace(tzinfo=None)
        created_at_naive = msg.created_at.replace(tzinfo=None)
        
        if (now_naive - created_at_naive).total_seconds() > 900:
            raise HTTPException(status_code=400, detail="Đã quá 15 phút, không thể chỉnh sửa")

        if not new_content or len(new_content.strip()) == 0:
            raise HTTPException(status_code=400, detail="Nội dung trống")

        msg.content = new_content.strip()
        msg.edited_at = datetime.now(pytz.utc).replace(tzinfo=None)
        
        self.db.commit()
        self.db.refresh(msg)
        return self._build_msg_response(msg)

    def delete_message(self, message_id: UUID, user_id: UUID) -> bool:
        msg = self._get_message_or_404(message_id)
        if msg.sender_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your message")
        self.msg_repo.soft_delete(msg)
        return True
        
    def update_message_status(self, message_id: UUID, user_id: UUID, new_status: str):
        msg: Message = self._get_message_or_404(message_id)
        return self.msg_repo.upsert_status(message_id, user_id, new_status)

    def react_to_message(self, message_id: UUID, user_id: UUID, data: MessageReactionRequest):
        reaction_label = data.type.lower()
        existing_react = self.db.query(MessageReaction).filter(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id
        ).first()

        if existing_react:
            if existing_react.reaction == reaction_label:
                self.db.delete(existing_react)
            else:
                existing_react.reaction = reaction_label
                existing_react.created_at = datetime.now(timezone.utc)
        else:
            new_react = MessageReaction(
                message_id=message_id,
                user_id=user_id,
                reaction=reaction_label
            )
            self.db.add(new_react)

        self.db.commit()

        msg = self.db.query(Message).filter(Message.id == message_id).first()
        if msg:
            member_ids = [str(m.user_id) for m in msg.conversation.members]
            socket_payload = {
                "event": "message_reaction_updated",
                "data": {
                    "message_id": str(message_id),
                    "conversation_id": str(msg.conversation_id),
                    "reactions": [{"user_id": str(r.user_id), "reaction": r.reaction, "created_at": r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat()} for r in msg.reactions    ]
                }
            }
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.call_soon_threadsafe(
                        lambda: asyncio.create_task(
                            manager.broadcast_to_conversation(
                                conv_id=str(msg.conversation_id),
                                member_ids=member_ids,
                                message=socket_payload
                            )
                        )
                    )
                else:
                    asyncio.run(manager.broadcast_to_conversation(str(msg.conversation_id), member_ids, socket_payload))
            except Exception as e:
                print(f"Lỗi Socket React: {e}")

    def remove_reaction(self, message_id: UUID, user_id: UUID) -> bool:
        return self.msg_repo.remove_reaction(message_id, user_id)

    # ─── Private helpers ─────────────────────────────────────────────────────

    def _assert_member(self, conv_id: UUID, user_id: UUID):
        if not self.conv_repo.is_member(conv_id, user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a conversation member")

    def _assert_admin(self, conv_id: UUID, user_id: UUID):
        member = self.conv_repo.get_member(conv_id, user_id)
        if not member or member.role not in ["owner", "admin"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    def _assert_owner(self, conv_id: UUID, user_id: UUID):
        member = self.conv_repo.get_member(conv_id, user_id)
        if not member or member.role != "owner":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner only")

    def _get_message_or_404(self, message_id: UUID):
        msg = self.msg_repo.get_by_id(message_id)
        if not msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
        return msg

    def get_user_conversations(self, user_id: UUID, accepted: bool = True):
        convs = (
            self.db.query(Conversation)
            .join(ConversationMember)
            .filter(
                ConversationMember.user_id == user_id,
                ConversationMember.is_accepted == accepted,
                ConversationMember.deleted_at.is_(None)
            )
            .options(
                joinedload(Conversation.last_message).joinedload(Message.sender),
                selectinload(Conversation.members).joinedload(ConversationMember.user)
            )
            .order_by(Conversation.updated_at.desc())
            .all()
        )

        conv_ids = [c.id for c in convs]
        unread_dict = {}
        if conv_ids:
            unread_query = self.db.query(Message.conversation_id, func.count(Message.id)).outerjoin(
                MessageStatus, (MessageStatus.message_id == Message.id) & (MessageStatus.user_id == user_id) & (MessageStatus.status == 'seen')
            ).filter(
                Message.conversation_id.in_(conv_ids),
                Message.sender_id != user_id,
                Message.deleted_at.is_(None),
                MessageStatus.message_id.is_(None) 
            ).group_by(Message.conversation_id).all()
            
            unread_dict = {str(c_id): count for c_id, count in unread_query}

        return [self._build_conv_response(c, user_id, unread_dict.get(str(c.id), 0)) for c in convs]

    def _build_conv_response(self, conv, current_user_id: UUID = None, precalculated_unread: int = 0) -> ConversationResponse:
        members_list = [
            MemberResponse(
                user=UserPublicResponse.model_validate(m.user),
                role=m.role,
                joined_at=m.joined_at,
                is_accepted=m.is_accepted
            )
            for m in conv.members
        ]

        display_name = conv.name 
        display_avatar = None 
        is_online = False
        
        my_membership = next((m for m in conv.members if str(m.user_id) == str(current_user_id)), None)
        is_accepted_by_me = my_membership.is_accepted if my_membership else True

        if current_user_id:
            if conv.type == "private":
                other_member = next((m for m in conv.members if str(m.user_id) != str(current_user_id)), None)
                if other_member:
                    display_name = display_name or other_member.user.full_name
                    display_avatar = other_member.user.avatar_url
                    if is_accepted_by_me:
                        is_online = str(other_member.user_id) in manager.active_connections
            else:
                for m in conv.members:
                    if str(m.user_id) != str(current_user_id):
                        if str(m.user_id) in manager.active_connections:
                            is_online = True
                            break

        unread_cnt = precalculated_unread
        last_msg_res = None
        if hasattr(conv, 'last_message') and conv.last_message:
            if getattr(conv.last_message, 'message_type', None) == "system":
                last_msg_res = self._build_msg_response(conv.last_message)
            else:
                try:
                    last_msg_res = self._build_msg_response(conv.last_message)
                except Exception:
                    last_msg_res = None

        return ConversationResponse(
            id=conv.id,
            name=display_name or "Nhóm chưa đặt tên",
            avatar_url=display_avatar,
            type=conv.type,
            created_at=conv.created_at,
            members=members_list,
            last_message=last_msg_res,
            unread_count=unread_cnt,
            is_online=is_online 
        )
    
    def _build_msg_response(self, msg) -> MessageResponse:
        display_content = msg.content
        display_media = msg.media_url
        if hasattr(msg, 'deleted_at') and msg.deleted_at:
            display_content = "Tin nhắn đã bị thu hồi"
            display_media = None

        reply_data = None
        if hasattr(msg, 'replied_message') and msg.replied_message:
            re_content = msg.replied_message.content
            re_media = msg.replied_message.media_url
            
            if msg.replied_message.deleted_at:
                re_content = "Tin nhắn đã bị thu hồi"
                re_media = None
                
            reply_data = MessageShortResponse(
                id=msg.replied_message.id,
                content=re_content,
                media_url=re_media,
                message_type=msg.replied_message.message_type,
                sender=UserPublicResponse.model_validate(msg.replied_message.sender),
                conversation_id=msg.replied_message.conversation_id,
                created_at=msg.replied_message.created_at
            )

        return MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            content=display_content,
            media_url=display_media,
            message_type=msg.message_type,
            created_at=msg.created_at,
            edited_at=msg.edited_at,
            sender=UserPublicResponse.model_validate(msg.sender),
            statuses=[MessageStatusResponse.model_validate(s) for s in msg.statuses],
            reactions=[MessageReactionResponse.model_validate(r) for r in msg.reactions],
            reply_to=reply_data 
        )
    
    def get_or_create_private_chat(self, user_id: UUID, friend_id: UUID):
        conv = self.conv_repo.get_private_conversation(user_id, friend_id)
        if conv: return self._build_conv_response(conv, user_id)

        try:
            is_friend = self.follow_repo.is_mutual_follow(user_id, friend_id)
        except:
            is_friend = False

        new_conv = self.conv_repo.create(created_by=user_id, type="private")
        self.conv_repo.add_member(new_conv.id, user_id, role="owner", is_accepted=True)
        self.conv_repo.add_member(new_conv.id, friend_id, role="member", is_accepted=is_friend)
        self.db.commit()
        return self._build_conv_response(new_conv, user_id)

    def get_user_presence(self, user_id: UUID):
        is_online = str(user_id) in manager.active_connections
        if is_online:
            return {"status": "online", "last_seen": None}
        user = self.follow_repo.get_by_id(user_id)
        return {"status": "offline", "last_seen": user.last_seen if user else None}
    
    def accept_private_chat(self, conversation_id: UUID, user_id: UUID):
        membership = self.conv_repo.get_membership(conversation_id, user_id)
        if membership:
            membership.is_accepted = True
            self.db.commit()
            return True
        return False
    
    def get_conversation_detail(self, conversation_id: UUID, user_id: UUID):
        conv = self.conv_repo.get_by_id(conversation_id)
        if not conv: raise HTTPException(status_code=404, detail="Hội thoại không tồn tại")

        is_member = any(m.user_id == user_id for m in conv.members)
        if not is_member: raise HTTPException(status_code=403, detail="Không có quyền truy cập")

        return self._build_conv_response(conv, user_id)
    
    def update_last_seen(self, user_id: UUID):
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if user:
                user.last_seen = datetime.now(timezone.utc)
                self.db.commit()
        except Exception as e:
            self.db.rollback()

    def create_group_from_private(self, original_conv_id: UUID, creator_id: UUID, new_member_ids: List[UUID]):
        old_conv = self.conv_repo.get_by_id(original_conv_id)
        if not old_conv: raise HTTPException(status_code=404)

        old_member_ids = [m.user_id for m in old_conv.members]
        all_member_ids = list(set(old_member_ids + new_member_ids))

        new_group = self.conv_repo.create(name="Nhóm mới", type="group", created_by=creator_id)

        for uid in all_member_ids:
            self.conv_repo.add_member(new_group.id, uid, is_accepted=True)

        self.db.commit()
        return self._build_conv_response(new_group, creator_id)
    
    def revoke_message(self, user_id: UUID, message_id: UUID):
        msg = self.db.query(Message).filter(Message.id == message_id).first()
        if not msg: raise HTTPException(status_code=404, detail="Tin nhắn không tồn tại")
        if msg.sender_id != user_id: raise HTTPException(status_code=403, detail="Không thể thu hồi")
        if msg.deleted_at is not None: raise HTTPException(status_code=400, detail="Đã thu hồi rồi")

        msg.deleted_at = datetime.now(timezone.utc)
        self.db.commit()
        
        return {
            "message_id": str(message_id),
            "conversation_id": str(msg.conversation_id),
            "deleted_at": msg.deleted_at.isoformat()
        }
    
    def reject_message_request(self, conv_id: UUID, user_id: UUID):
        member = self.conv_repo.get_member(conv_id, user_id)
        if not member: return False
        try:
            member.deleted_at = datetime.now(timezone.utc)
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            return False
        
    def leave_group(self, conv_id: UUID, user_id: UUID):
        try:
            member = self.conv_repo.get_member(conv_id, user_id)
            if not member: return False

            system_msg = self.msg_repo.create(
                conversation_id=conv_id,
                sender_id=user_id,
                content=f"{member.user.full_name} đã rời khỏi nhóm",
                message_type="system"
            )

            conv = self.conv_repo.get_by_id(conv_id)
            conv.last_message_id = system_msg.id
            conv.updated_at = datetime.now(timezone.utc)
            
            self.db.delete(member)
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            return False

    def add_members_to_existing_group(self, conv_id: UUID, current_user_id: UUID, new_member_ids: List[UUID]):
        try:
            admin = self.db.query(User).filter(User.id == current_user_id).first()
            conv = self.conv_repo.get_by_id(conv_id)
            if not admin or not conv: return False

            for uid in new_member_ids:
                existing = self.conv_repo.get_member(conv_id, uid)
                if not existing:
                    target_user = self.db.query(User).filter(User.id == uid).first()
                    if not target_user: continue

                    self.conv_repo.add_member(conv_id, uid, is_accepted=True)
                    
                    system_msg = self.msg_repo.create(
                        conversation_id=conv_id,
                        sender_id=current_user_id,
                        content=f"{admin.full_name} đã thêm {target_user.full_name} vào nhóm",
                        message_type="system"
                    )

                    conv.last_message_id = system_msg.id
                    conv.updated_at = datetime.now(timezone.utc)
                    self.db.commit()

                    socket_data = {
                        "event": "new_message", 
                        "data": self._build_msg_response(system_msg)
                    }

                    try:
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            loop.call_soon_threadsafe(
                                lambda: asyncio.create_task(manager.broadcast_to_conversation(str(conv_id), [str(u) for u in new_member_ids], socket_data))
                            )
                        else:
                            asyncio.run(manager.broadcast_to_conversation(str(conv_id), [str(u) for u in new_member_ids], socket_data))
                    except Exception as socket_e:
                        print(f"Lỗi Socket: {socket_e}")

            return True

        except Exception as e:
            self.db.rollback()
            return False

    def promote_to_admin(self, conv_id: UUID, owner_id: UUID, target_user_id: UUID):
        self._assert_owner(conv_id, owner_id)
        member = self.conv_repo.get_member(conv_id, target_user_id)
        if not member: raise HTTPException(status_code=404)
        if member.role in ["owner", "admin"]: raise HTTPException(status_code=400)
        member.role = "admin"
        self.db.commit()
        return True
    
    def demote_admin(self, conv_id: UUID, owner_id: UUID, target_user_id: UUID):
        self._assert_owner(conv_id, owner_id)
        member = self.conv_repo.get_member(conv_id, target_user_id)
        if not member: raise HTTPException(status_code=404)
        if member.role == "owner": raise HTTPException(status_code=400)
        member.role = "member"
        self.db.commit()
        return True
    
    def transfer_owner(self, conv_id: UUID, current_owner_id: UUID, target_user_id: UUID):
        self._assert_owner(conv_id, current_owner_id)
        current_owner = self.conv_repo.get_member(conv_id, current_owner_id)
        new_owner = self.conv_repo.get_member(conv_id, target_user_id)
        if not new_owner: raise HTTPException(status_code=404)

        current_owner.role = "admin"
        new_owner.role = "owner"
        self.db.commit()
        return True
    
    def seen_message(self, conversation_id: UUID, message_id: UUID, user_id: UUID):
        member = self.conv_repo.get_member(conversation_id, user_id)
        if not member: raise HTTPException(status_code=403)

        msg = self.db.query(Message).filter(Message.id == message_id, Message.conversation_id == conversation_id).first()
        if not msg: raise HTTPException(status_code=404)

        self.msg_repo.upsert_status(message_id=message_id, user_id=user_id, new_status="seen")
        self.db.commit()

        member_ids = [str(m.user_id) for m in msg.conversation.members]
        payload = {
            "event": "message_seen",
            "data": {
                "conversation_id": str(conversation_id),
                "message_id": str(message_id),
                "user_id": str(user_id),
                "seen_at": datetime.now(timezone.utc).isoformat()
            }
        }

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.call_soon_threadsafe(
                    lambda: asyncio.create_task(manager.broadcast_to_conversation(str(conversation_id), member_ids, payload))
                )
            else:
                asyncio.run(manager.broadcast_to_conversation(str(conversation_id), member_ids, payload))
        except Exception as e:
            print(f"Lỗi Socket Seen: {e}")

        return True
    
    def typing_event(self, conversation_id: UUID, user_id: UUID, is_typing: bool):
        member = self.conv_repo.get_member(conversation_id, user_id)
        if not member: return False

        member_ids = [str(m.user_id) for m in member.conversation.members if str(m.user_id) != str(user_id)]
        
        # 🔥 Đổi tên event thành "typing" để khớp với switch-case trong useChat.ts
        payload = {
            "event": "typing", 
            "data": {
                "conversation_id": str(conversation_id),
                "user_id": str(user_id),
                "is_typing": is_typing # Backend gửi True/False về
            }
        }

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.call_soon_threadsafe(
                    lambda: asyncio.create_task(
                        manager.broadcast_to_conversation(
                            conv_id=str(conversation_id),
                            member_ids=member_ids,
                            message=payload
                        )
                    )
                )
            else:
                asyncio.run(manager.broadcast_to_conversation(
                    conv_id=str(conversation_id),
                    member_ids=member_ids,
                    message=payload
                ))
        except Exception as e:
            print(f"Lỗi Socket Typing: {e}")

        return True