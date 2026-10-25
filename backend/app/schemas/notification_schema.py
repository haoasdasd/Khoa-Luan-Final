from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.schemas.user_schema import UserPublicResponse

class NotificationResponse(BaseModel):
    id: UUID
    type: str
    reference_id: Optional[UUID]
    is_read: bool
    created_at: datetime
    content: Optional[str]
    sender: Optional[UserPublicResponse] # Chứa avatar và tên người gửi

    class Config:
        from_attributes = True

class UnreadCountResponse(BaseModel): # Schema mới cho Bước 4
    unread_count: int