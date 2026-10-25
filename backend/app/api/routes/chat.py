"""
api/routes/chat.py
Conversation endpoints:
  POST   /conversations
  GET    /conversations
  POST   /conversations/{id}/members
  DELETE /conversations/{id}/members/{user_id}
"""
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.dependencies import get_db
from app.api.deps import get_current_active_user, get_current_user
from app.services.chat_service import ChatService
from app.schemas.conversation_schema import ConversationCreateRequest, ConversationResponse, AddMemberRequest
from app.models.user import User
from app.schemas.message_schema import MessageResponse
from app.services import chat_service
from app.schemas.chat_schemas import AddMembersRequest
router = APIRouter(prefix="/conversations", tags=["Chat"])


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED, summary="Tạo conversation")
def create_conversation(
    data: ConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Tạo private chat hoặc group chat.

    **Request body:**
    ```json
    {
        "type": "group",
        "name": "Team Alpha",
        "member_ids": ["uuid1", "uuid2"]
    }
    ```
    """
    return ChatService(db).create_conversation(current_user.id, data)


@router.get("", response_model=List[ConversationResponse], summary="Lấy danh sách conversations")
def get_conversations(
    accepted: bool = True,  # 🔥 Thêm dòng này để nhận ?accepted=true/false
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Truyền thêm tham số accepted vào Service
    return ChatService(db).get_user_conversations(current_user.id, accepted=accepted)


@router.post("/{conv_id}/members")
async def add_members( # 🔥 Thêm async vào đây
    conv_id: UUID, 
    data: AddMembersRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ChatService(db)
    # Vì service là hàm đồng bộ, ta gọi bình thường hoặc chuyển service sang async luôn
    success = service.add_members_to_existing_group(conv_id, current_user.id, data.member_ids)
    if not success:
        raise HTTPException(status_code=400, detail="Thêm thành viên thất bại")
    return {"message": "Thành công"}


@router.delete("/{conv_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Xóa thành viên")
def remove_member(
    conv_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ChatService(db).remove_member(conv_id, current_user.id, user_id)

@router.delete("/{conv_id}/reject", summary="Từ chối/Xóa tin nhắn chờ")
def reject_conversation(
    conv_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Hào gọi hàm xóa trong ChatService
    success = ChatService(db).reject_message_request(conv_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy hội thoại")
    return {"status": "success", "message": "Đã xóa hội thoại chờ"}

@router.get("/token")
def get_stringee_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        service = ChatService(db)
        return service.get_stringee_token(current_user.id)
    except Exception as e:
        # Ép nó phải hiện lỗi ra Terminal để mình xem
        print(f"LỖI TẠI ROUTE TOKEN: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/private/{friend_id}", response_model=ConversationResponse)
def get_or_create_chat(
    friend_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ChatService(db)
    # Hàm này sẽ check: Nếu đã có phòng chat giữa Hào & Friend thì trả về ID phòng đó
    # Nếu chưa có thì tạo mới rồi trả về ID phòng mới.
    return service.get_or_create_private_chat(current_user.id, friend_id)

@router.patch("/{conv_id}/accept", summary="Chấp nhận tin nhắn chờ")
def accept_conversation(
    conv_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ChatService(db)
    # Gọi service để update is_accepted = True cho current_user trong conv_id
    success = service.accept_conversation(conv_id, current_user.id)
    if not success:
        raise HTTPException(status_code=400, detail="Không thể chấp nhận hội thoại này")
    return {"message": "Đã chấp nhận hội thoại"}

@router.get("/{conv_id}")
def get_conversation_detail(conv_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return ChatService(db).get_conversation_detail(conv_id, current_user.id)


@router.post("/{conv_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_conversation(
    conv_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ChatService(db).remove_member(conv_id, current_user.id, current_user.id)

@router.put("/messages/{message_id}")
async def update_message(
    message_id: UUID, 
    content: str, # Hoặc body schema
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Sử dụng chat_service đã import ở trên
    return chat_service.edit_message(db, current_user.id, message_id, content)

@router.delete("/{conv_id}/leave") 
def leave_conversation(
    conv_id: UUID, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ChatService(db)
    success = service.leave_group(conv_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Không thể rời nhóm hoặc bạn không ở trong nhóm này")
        
    return {"message": "Đã rời nhóm thành công"}

@router.put("/{conv_id}/admins/{user_id}")
def promote_admin(
    conv_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ChatService(db).promote_to_admin(
        conv_id,
        current_user.id,
        user_id
    )

    return {"message": "Đã cấp quyền admin"}

@router.delete("/{conv_id}/admins/{user_id}")
def demote_admin(
    conv_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ChatService(db).demote_admin(
        conv_id,
        current_user.id,
        user_id
    )

    return {"message": "Đã gỡ quyền admin"}

@router.put("/{conv_id}/owner/{user_id}")
def transfer_owner(
    conv_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ChatService(db).transfer_owner(
        conv_id,
        current_user.id,
        user_id
    )

    return {"message": "Đã chuyển quyền owner"}