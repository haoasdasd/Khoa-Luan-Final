"""
models/conversation.py
SQLAlchemy models cho Conversation và ConversationMember
Hỗ trợ cả chat private (1-1) và group chat
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base
from sqlalchemy import Index

class Conversation(Base):
    """Bảng conversations - phòng chat"""
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100))                                                      # Tên nhóm (group chat)
    type = Column(String(20), default="private")                                   # private / group
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))               # Tin nhắn cuối cùng
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True)
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship(
        "ConversationMember",
        back_populates="conversation",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    messages = relationship("Message", back_populates="conversation", foreign_keys="Message.conversation_id")
    call_sessions = relationship("CallSession", back_populates="conversation")

    last_message = relationship("Message", foreign_keys=[last_message_id])
class ConversationMember(Base):
    """Bảng conversation_members - thành viên trong phòng chat"""
    __tablename__ = "conversation_members"

    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(20), default="member", nullable=False)

    is_accepted = Column(
        Boolean,
        server_default="false",
        default=False,
        nullable=False
    )
    # ---------------------

    last_seen_message_id = Column(UUID(as_uuid=True), nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    # Relationships
    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User")


Index(
    "idx_conversation_member_user",
    ConversationMember.user_id
)

Index(
    "idx_conversation_member_conversation",
    ConversationMember.conversation_id
)