"""
models/interaction.py
SQLAlchemy model cho UserInteraction - tracking hành vi
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base


class UserInteraction(Base):
    """Bảng user_interactions - theo dõi hành vi người dùng"""
    __tablename__ = "user_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"))
    action_type = Column(String(20))   # like / comment / share / view
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    post = relationship("Post")