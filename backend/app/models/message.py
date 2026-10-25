"""
models/message.py
SQLAlchemy models cho Message, MessageStatus, MessageReaction
Hỗ trợ soft delete và tracking trạng thái tin nhắn
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base


class Message(Base):
    """Bảng messages - tin nhắn trong chat"""
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text)
    media_url = Column(Text)
    message_type = Column(String(20), default="text")  # text / image / video / file / call
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)  # Soft delete
    reply_to_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True)
    # Relationships
    conversation = relationship("Conversation", back_populates="messages", foreign_keys=[conversation_id])
    sender = relationship("User")
    statuses = relationship("MessageStatus", back_populates="message")
    reactions = relationship("MessageReaction", back_populates="message")
    replied_message = relationship("Message", remote_side=[id], backref="replies")

class MessageStatus(Base):
    """Bảng message_status - trạng thái tin nhắn (sent/delivered/seen)"""
    __tablename__ = "message_status"

    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    status = Column(String(20), default="sent")  # sent / delivered / seen
    seen_at = Column(DateTime, nullable=True)

    # Relationships
    message = relationship("Message", back_populates="statuses")
    user = relationship("User")


class MessageReaction(Base):
    """Bảng message_reactions - reaction vào tin nhắn (emoji)"""
    __tablename__ = "message_reactions"

    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    reaction = Column(String(20), nullable=False)  # ❤️ 😂 👍 etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    message = relationship("Message", back_populates="reactions")
    user = relationship("User")