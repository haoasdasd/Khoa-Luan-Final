"""
schemas/conversation_schema.py
Pydantic schemas cho Conversation và ConversationMember
"""
from enum import member

from pydantic import BaseModel, Field
from typing import Literal, Optional, List
from datetime import datetime
from uuid import UUID
from app.schemas.user_schema import UserPublicResponse
from app.schemas.message_schema import MessageResponse


class ConversationCreateRequest(BaseModel):
    """
    Body để tạo conversation
    Example:
        POST /api/conversations
        {
            "type": "private",
            "member_ids": ["uuid1", "uuid2"]
        }
    """
    name: Optional[str] = None
    type: str = "private"   # private / group
    member_ids: List[UUID] = Field(..., min_length=1)


class AddMemberRequest(BaseModel):
    """Body để thêm thành viên vào group"""
    user_id: UUID


class MemberResponse(BaseModel):
    """Thành viên trong conversation"""
    user: UserPublicResponse
    role: Literal["owner", "admin", "member"]
    joined_at: datetime
    is_accepted: bool
    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    """Response trả về conversation"""
    id: UUID
    name: Optional[str]
    type: str
    created_at: datetime
    members: List[MemberResponse] = []
    unread_count: int = 0
    last_message: Optional[MessageResponse] = None
    model_config = {"from_attributes": True}
    is_online: bool = False

class Config:
        from_attributes = True