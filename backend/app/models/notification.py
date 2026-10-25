"""
models/notification.py
SQLAlchemy model cho Notification
Hỗ trợ nhiều loại thông báo: like, comment, follow, message...
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False) # Người nhận
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # Người gửi (MỚI)
    
    type = Column(String(50), nullable=False) # like, comment, follow...
    reference_id = Column(UUID(as_uuid=True)) # Link tới bài viết/comment
    content = Column(String(255), nullable=True) # Nội dung chữ (Ví dụ: "đã thích bài viết của bạn")
    
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    sender = relationship("User", foreign_keys=[sender_id]) # (MỚI)