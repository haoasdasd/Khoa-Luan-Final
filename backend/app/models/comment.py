import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
from app.database.base import Base

class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    parent_id = Column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)

    content = Column(Text, nullable=False)
    media_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # ===== RELATIONSHIPS =====
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")

    likes = relationship("CommentLike", backref="comment", cascade="all, delete-orphan")

    # 🔥 SELF RELATION (CHUẨN)
    parent = relationship(
        "Comment",
        remote_side=[id],
        back_populates="children"
    )

    children = relationship(
        "Comment",
        back_populates="parent",
        cascade="save-update, merge",
        order_by="Comment.created_at.asc()"
    )

class CommentLike(Base):
    __tablename__ = "comment_likes" 
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    comment_id = Column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), primary_key=True)
    reaction_type = Column(String(20), default="like")
    created_at = Column(DateTime, default=datetime.utcnow)