"""
models/post.py
SQLAlchemy models cho Post, Like, SavedPost
Hỗ trợ soft delete qua deleted_at
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base


class Post(Base):
    """Bảng posts - bài viết"""
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text)
    media_url = Column(String, nullable=True)
    visibility = Column(String(20), default="public")  # public / private / friends
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)  # Soft delete
    original_post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)
    author = relationship("User", back_populates="posts", foreign_keys=[user_id])
    # Relationships
    shared_post = relationship(
        "Post", 
        remote_side="Post.id",
        foreign_keys=[original_post_id],
        backref="shares"
    )
    comments = relationship("Comment", back_populates="post")
    likes = relationship("Like", back_populates="post")
    saves = relationship("SavedPost", back_populates="post")


# models/post.py

class Like(Base):
    __tablename__ = "likes"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    
    # SỬA DÒNG NÀY: Bỏ default, cho phép null
    reaction_type = Column(String(20), nullable=True) 
    
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="likes")
    user = relationship("User")


class SavedPost(Base):
    """Bảng saved_posts - lưu bài viết yêu thích"""
    __tablename__ = "saved_posts"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="saves")
    user = relationship("User")


class HiddenItem(Base):
    """Bảng hidden_items - Lưu vết bài viết hoặc bình luận bị ẩn của từng user"""
    __tablename__ = "hidden_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(UUID(as_uuid=True), nullable=False)  # ID của Post hoặc Comment
    target_type = Column(String(20), nullable=False)       # 'post' hoặc 'comment'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Nếu muốn truy vấn ngược lại user từ bảng này
    user = relationship("User")