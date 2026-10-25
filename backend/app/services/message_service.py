"""
services/message_service.py
Business logic cho Message, Status và Reaction
"""
from uuid import UUID
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.repositories.message_repository import MessageRepository
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.message_schema import (
    MessageCreateRequest, 
    MessageResponse, 
    MessageStatusResponse, 
    MessageReactionResponse
)
from app.schemas.user_schema import UserPublicResponse


class MessageService:
    def __init__(self, db: Session):
        self.message_repo = MessageRepository(db)
        self.conv_repo = ConversationRepository(db)

    f, user_id: UUID, conversation_id: UUID, data: MessageCreateRequest) -> MessageResponse:
        """Gửi tin nhắn mới - User phải là thành viên trong hội thoại"""
        if not self.conv_repo.is_member(conversation_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Bạn không có quyền gửi tin nhắn vào hội thoại này"
            )

        message = self.message_repo.create(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=data.content,
            media_url=data.media_url,
            message_type=data.message_type
        )
        
        # Tự động tạo trạng thái 'sent' cho người gửi
        self.message_repo.upsert_status(message.id, user_id, "seen")
        
        return self._build_response(message)

    def get_messages(self, user_id: UUID, conversation_id: UUID, offset: int = 0, limit: int = 50) -> List[MessageResponse]:
        """Lấy danh sách tin nhắn trong hội thoại"""
        if not self.conv_repo.is_member(conversation_id, user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")

        messages = self.message_repo.get_conversation_messages(conversation_id, offset, limit)
        
        # Logic đánh dấu 'seen' cho tin nhắn mới nhất khi user mở hội thoại có thể xử lý ở đây 
        # hoặc qua một endpoint riêng.
        
        return [self._build_response(m) for m in messages]

    def update_message(self, user_id: UUID, message_id: UUID, content: str) -> MessageResponse:
        """Sửa tin nhắn - Chỉ người gửi mới được sửa"""
        message = self._get_or_404(message_id)
        if message.sender_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn chỉ có thể sửa tin nhắn của chính mình")
        
        updated_msg = self.message_repo.update(message, content)
        return self._build_response(updated_msg)

    def delete_message(self, user_id: UUID, message_id: UUID) -> bool:
        """Xóa tin nhắn (Xóa mềm)"""
        message = self._get_or_404(message_id)
        if message.sender_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa tin nhắn này")
        
        self.message_repo.soft_delete(message)
        return True

    def mark_as_seen(self, user_id: UUID, message_id: UUID) -> MessageStatusResponse:
        """Đánh dấu tin nhắn đã xem"""
        message = self._get_or_404(message_id)
        if not self.conv_repo.is_member(message.conversation_id, user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền")
            
        status_obj = self.message_repo.upsert_status(message_id, user_id, "seen")
        return MessageStatusResponse.model_validate(status_obj)

    def add_reaction(self, user_id: UUID, message_id: UUID, reaction: str) -> MessageReactionResponse:
        """Thêm cảm xúc vào tin nhắn"""
        message = self._get_or_404(message_id)
        if not self.conv_repo.is_member(message.conversation_id, user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền")
            
        react_obj = self.message_repo.add_reaction(message_id, user_id, reaction)
        return MessageReactionResponse.model_validate(react_obj)

    def remove_reaction(self, user_id: UUID, message_id: UUID) -> bool:
        """Xóa cảm xúc"""
        message = self._get_or_404(message_id)
        return self.message_repo.remove_reaction(message.id, user_id)

    def _get_or_404(self, message_id: UUID):
        message = self.message_repo.get_by_id(message_id)
        if not message:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tin nhắn không tồn tại hoặc đã bị xóa")
        return message

    def _build_response(self, message) -> MessageResponse:
        """Convert SQLAlchemy model sang Pydantic response"""
        return MessageResponse(
            id=message.id,
            conversation_id=message.conversation_id,
            content=message.content,
            media_url=message.media_url,
            message_type=message.message_type,
            created_at=message.created_at,
            edited_at=message.edited_at,
            sender=UserPublicResponse.model_validate(message.sender),
            statuses=[MessageStatusResponse.model_validate(s) for s in message.statuses],
            reactions=[MessageReactionResponse.model_validate(r) for r in message.reactions]
        )