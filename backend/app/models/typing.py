"""
models/typing.py
SQLAlchemy model cho TypingStatus
Lưu trạng thái đang gõ tin nhắn (dùng cho real-time WebSocket)
"""
from datetime import datetime
from sqlalchemy import Column, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base


class TypingStatus(Base):
    """Bảng typing_status - trạng thái đang gõ"""
    __tablename__ = "typing_status"

    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    is_typing = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    conversation = relationship("Conversation")
    user = relationship("User")