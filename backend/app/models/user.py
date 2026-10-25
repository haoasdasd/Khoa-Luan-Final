"""
models/user.py
SQLAlchemy models cho User, Follow, BlockedUser
Mapping trực tiếp với schema PostgreSQL
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base


class User(Base):
    """Bảng users - tài khoản người dùng"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(100))
    avatar_url = Column(Text)
    bio = Column(Text)
    role = Column(String(20), default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    # Relationships
    posts = relationship("Post", back_populates="author", foreign_keys="Post.user_id")
    comments = relationship("Comment", back_populates="author")
    followers = relationship("Follow", foreign_keys="Follow.following_id", back_populates="following_user")
    following = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower_user")
    notifications = relationship("Notification", back_populates="user",foreign_keys="[Notification.user_id]")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    media_files = relationship("MediaFile", back_populates="uploader")


class Follow(Base):
    """Bảng follows - quan hệ follow giữa users"""
    __tablename__ = "follows"

    follower_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)

    following_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Constraint: không thể tự follow chính mình
    __table_args__ = (
        CheckConstraint("follower_id <> following_id", name="no_self_follow"),
    )

    follower_user = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following_user = relationship("User", foreign_keys=[following_id], back_populates="followers")


class BlockedUser(Base):
    """Bảng blocked_users - danh sách block"""
    __tablename__ = "blocked_users"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    blocked_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("user_id <> blocked_user_id", name="no_self_block"),
    )