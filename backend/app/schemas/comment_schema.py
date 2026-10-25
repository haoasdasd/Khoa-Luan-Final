"""
schemas/comment_schema.py
"""
from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.schemas.user_schema import UserPublicResponse

class CommentCreateRequest(BaseModel):
    content: Optional[str] = Field(None, max_length=2000)
    parent_id: Optional[UUID] = None 
    media_url: Optional[str] = None

class CommentUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    media_url: Optional[str] = None
    
class CommentResponse(BaseModel):
    id: UUID
    post_id: UUID
    parent_id: Optional[UUID] = None
    content: str
    media_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: UserPublicResponse
    reply_count: int = 0
    replies: List[CommentResponse] = []
    is_deleted: bool = False
    is_liked: bool = False
    reaction_type: Optional[str] = None 
    like_count: int = 0
    top_reactions: List[str] = []
    
    model_config = ConfigDict(from_attributes=True)

CommentResponse.model_rebuild()