"""
schemas/call_schema.py
Pydantic schemas cho CallSession và CallParticipant
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.schemas.user_schema import UserPublicResponse


class StartCallRequest(BaseModel):
    """
    Body để bắt đầu cuộc gọi
    Example:
        POST /api/calls/start
        {"conversation_id": "uuid", "call_type": "video"}
    """
    conversation_id: UUID
    call_type: str = "voice"  # voice / video


class CallParticipantResponse(BaseModel):
    """Thành viên trong cuộc gọi"""
    user: UserPublicResponse
    joined_at: Optional[datetime]
    left_at: Optional[datetime]

    model_config = {"from_attributes": True}


class CallSessionResponse(BaseModel):
    """Response trả về thông tin cuộc gọi"""
    id: UUID
    conversation_id: UUID
    call_type: str
    started_at: datetime
    ended_at: Optional[datetime]
    participants: List[CallParticipantResponse] = []

    model_config = {"from_attributes": True}