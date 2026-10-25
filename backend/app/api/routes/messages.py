"""
api/routes/messages.py
Message endpoints:
  POST   /conversations/{id}/messages
  GET    /conversations/{id}/messages
  PUT    /messages/{id}
  DELETE /messages/{id}
  POST   /messages/{id}/reactions
  DELETE /messages/{id}/reactions
  POST   /messages/{id}/status
"""
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.api.deps import get_current_user
from app.schemas.conversation_schema import ConversationResponse
from app.services.chat_service import ChatService
from app.schemas.message_schema import (
    MessageCreateRequest, MessageUpdateRequest,
    MessageReactionRequest, MessageResponse
)
from app.models.user import User

# Router cho messages trong conversation
conv_messages_router = APIRouter(prefix="/conversations", tags=["Messages"])
# Router cho thao tác trực tiếp trên message
messages_router = APIRouter(prefix="/messages", tags=["Messages"])


class MessageStatusRequest(BaseModel):
    status: str  # sent / delivered / seen


@conv_messages_router.post(
    "/{conv_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Gửi tin nhắn",
)
def send_message(
    conv_id: UUID,
    data: MessageCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ChatService(db).send_message(conv_id, current_user.id, data)


# Thêm route lấy danh sách cuộc hội thoại (Inbox vs Message Request)
@conv_messages_router.get(
    "", 
    response_model=List[ConversationResponse], 
    summary="Lấy danh sách cuộc hội thoại (lọc theo trạng thái chấp nhận)"
)
def get_user_conversations(
    accepted: bool = Query(True, description="True: Hộp thư chính, False: Tin nhắn chờ"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    FE sẽ gọi:
    - /api/conversations?accepted=true -> Hiện ở Tab Tin nhắn
    - /api/conversations?accepted=false -> Hiện ở Tab Người lạ
    """
    return ChatService(db).get_user_conversations(current_user.id, accepted)


# Thêm route Chấp nhận tin nhắn người lạ
@conv_messages_router.put(
    "/{conv_id}/accept", 
    summary="Chấp nhận tin nhắn từ người lạ"
)
def accept_message_request(
    conv_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Khi user nhấn 'Chấp nhận' ở màn hình tin nhắn chờ
    """
    ChatService(db).accept_message_request(conv_id, current_user.id)
    return {"message": "Đã chuyển vào hộp thư chính"}

@conv_messages_router.get("/{conv_id}/messages", response_model=List[MessageResponse], summary="Lấy tin nhắn")
def get_messages(
    conv_id: UUID,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ChatService(db).get_messages(conv_id, current_user.id, offset, limit)


@messages_router.put("/{message_id}", response_model=MessageResponse, summary="Sửa tin nhắn")
def edit_message(
    message_id: UUID,
    data: MessageUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ChatService(db).edit_message(
    message_id=message_id, 
    user_id=current_user.id, 
    new_content=data.content  
)


@messages_router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Xóa tin nhắn")
def delete_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ChatService(db).delete_message(message_id, current_user.id)


@messages_router.post("/{message_id}/reactions", status_code=status.HTTP_201_CREATED, summary="React tin nhắn")
async def react_message(
    message_id: UUID,
    data: MessageReactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Gọi service xử lý DB (Hàm này phải là async def)
    result = await ChatService(db).react_to_message(message_id, current_user.id, data)
    
    # 2. Lấy lại thông tin tin nhắn để biết cần bắn socket cho ai (nhóm nào)
    # Bước này thường được xử lý luôn bên trong ChatService.react_to_message 
    # Nhưng nếu Service chỉ trả về kết quả DB, Hào có thể thêm logic bắn socket ở đây.

    return result


@messages_router.delete("/{message_id}/reactions", status_code=status.HTTP_204_NO_CONTENT, summary="Xóa reaction")
async def remove_reaction(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Tương tự như Post, chuyển sang async để đợi xử lý và bắn socket ngầm
    await ChatService(db).remove_reaction(message_id, current_user.id)
    
    return None


@messages_router.post("/{message_id}/status", summary="Cập nhật trạng thái tin nhắn")
def update_message_status(
    message_id: UUID,
    data: MessageStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ChatService(db).update_message_status(message_id, current_user.id, data.status)
    return {"message": "Status updated"}