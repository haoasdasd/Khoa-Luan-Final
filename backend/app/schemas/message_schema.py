"""
schemas/message_schema.py
Pydantic schemas cho Message, MessageStatus, MessageReaction
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.schemas.user_schema import UserPublicResponse


class MessageCreateRequest(BaseModel):
    content: Optional[str] = None
    media_url: Optional[str] = None
    message_type: str = "text"  # text, image, video, audio, file
    
    # --- BỔ SUNG THÊM ---
    # Để lưu metadata như: {"duration": 15, "file_name": "ghi_am.mp3", "size": 1024}
    media_metadata: Optional[dict] = None 
    # Nếu Hào muốn làm tính năng Reply (Trả lời tin nhắn cụ thể)
    reply_to_id: Optional[UUID] = None

class MessageShortResponse(BaseModel):
    id: UUID
    content: Optional[str]
    media_url: Optional[str]
    message_type: str
    conversation_id: UUID
    created_at: datetime
    sender: UserPublicResponse
    model_config = {"from_attributes": True}

class MessageUpdateRequest(BaseModel):
    """Body để sửa tin nhắn"""
    content: str = Field(..., min_length=1)


class MessageReactionRequest(BaseModel):
    """Body để react tin nhắn"""
    type: str


class MessageStatusResponse(BaseModel):
    """Trạng thái tin nhắn của từng user"""
    user_id: UUID
    status: str
    seen_at: Optional[datetime]

    model_config = {"from_attributes": True}


class MessageReactionResponse(BaseModel):
    """Reaction trên tin nhắn"""
    user_id: UUID
    reaction: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    content: Optional[str]
    media_url: Optional[str]
    message_type: str
    created_at: datetime
    edited_at: Optional[datetime] = None
    # Thêm trường này để check nhanh tin nhắn đã bị xóa (Soft Delete) ở Frontend
    deleted_at: Optional[datetime] = None 
    sender: UserPublicResponse
    statuses: List[MessageStatusResponse] = []
    reactions: List[MessageReactionResponse] = []
    
    # --- BỔ SUNG NẾU LÀM REPLY ---
    reply_to_id: Optional[UUID] = None
    reply_to: Optional["MessageResponse"] = None 

    model_config = {"from_attributes": True}  

class Config:
        from_attributes = True

