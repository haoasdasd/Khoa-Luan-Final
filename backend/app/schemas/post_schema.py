"""
schemas/post_schema.py
Pydantic schemas cho Post, Like, SavedPost
"""
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.schemas.user_schema import UserPublicResponse
from app.schemas.comment_schema import CommentResponse


class PostCreateRequest(BaseModel):
    """
    Body để tạo bài viết mới
    Example:
        POST /api/posts
        {
            "content": "Hello World!",
            "media_url": "https://cdn.example.com/img.jpg",
            "visibility": "public"
        }
    """
    content: Optional[str] = None
    media_url: Optional[str] = None
    visibility: str = "public"  # public / private / friends

class AIPostRequest(BaseModel):
    prompt: str
    
class PostUpdateRequest(BaseModel):
    """Body để chỉnh sửa bài viết"""
    content: Optional[str] = None
    media_url: Optional[str] = None
    visibility: Optional[str] = None


class PostResponse(BaseModel):
    """Response trả về thông tin bài viết"""
    id: UUID
    content: Optional[str] = None
    media_url: Optional[str] = None
    visibility: str
    created_at: datetime
    updated_at: Optional[datetime]
    author: UserPublicResponse
    like_count: int = 0
    comment_count: int = 0
    is_liked: bool = False
    is_saved: bool = False
    reaction_type: Optional[str] = None
    top_reactions: List[str] = []
    original_post_id: Optional[UUID] = None
    shared_post: Optional["PostResponse"] = None

    model_config = ConfigDict(from_attributes=True)

PostResponse.model_rebuild()

class ApiLikePayload(BaseModel):
    """Body nhận loại reaction từ Frontend"""
    type: str = "like"

class HiddenItemResponse(BaseModel):
    id: UUID
    target_id: UUID
    target_type: str  # 'post' hoặc 'comment'
    created_at: datetime
    
    # LỒNG DỮ LIỆU VÀO ĐÂY:
    # Nếu là post bị ẩn, field này sẽ có dữ liệu, ngược lại là null
    post_data: Optional[PostResponse] = None
    
    # Nếu là comment bị ẩn, field này sẽ có dữ liệu, ngược lại là null
    comment_data: Optional[CommentResponse] = None
    
    model_config = ConfigDict(from_attributes=True)