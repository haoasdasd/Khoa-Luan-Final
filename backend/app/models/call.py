"""
models/call.py
SQLAlchemy models cho CallSession và CallParticipant
Lưu lịch sử cuộc gọi voice/video
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base


class CallSession(Base):
    """Bảng call_sessions - lịch sử cuộc gọi"""
    __tablename__ = "call_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"))
    started_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    call_type = Column(String(20))  # voice / video
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="call_sessions")
    initiator = relationship("User")
    participants = relationship("CallParticipant", back_populates="call_session")


class CallParticipant(Base):
    """Bảng call_participants - thành viên tham gia cuộc gọi"""
    __tablename__ = "call_participants"

    call_id = Column(UUID(as_uuid=True), ForeignKey("call_sessions.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    joined_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)

    # Relationships
    call_session = relationship("CallSession", back_populates="participants")
    user = relationship("User")

    