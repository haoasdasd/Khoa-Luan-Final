"""
api/routes/comments.py
Đã fix lỗi TypeError bằng cách thêm async/await cho các hàm tương tác.
"""
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.dependencies import get_db
from app.api.deps import get_current_user
from app.services.comment_service import CommentService
from app.schemas.comment_schema import CommentCreateRequest, CommentUpdateRequest, CommentResponse
from app.models.user import User

# Router cho comments trên post
post_comments_router = APIRouter(prefix="/posts", tags=["Comments"])
# Router cho thao tác trên comment cụ thể
comments_router = APIRouter(prefix="/comments", tags=["Comments"])

class ReactionRequest(BaseModel):
    type: str

# --- 1. Tạo comment hoặc reply ---
@post_comments_router.post(
    "/{post_id}/comments",
    status_code=status.HTTP_201_CREATED,
    summary="Thêm comment hoặc reply"
)
async def create_comment(
    post_id: UUID,
    data: CommentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Phải có await vì có tạo thông báo real-time bên trong
    return await CommentService(db).create_comment(post_id, current_user.id, data)

# --- 2. Thả cảm xúc vào comment (FIX LỖI TẠI ĐÂY) ---
@comments_router.post("/{comment_id}/react")
async def react_to_comment( # Thêm async
    comment_id: UUID,
    data: ReactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Phải có await ở đây
    return await CommentService(db).toggle_reaction(
        comment_id=comment_id, 
        user_id=current_user.id, 
        reaction_type=data.type
    )

# --- 3. Lấy danh sách comment ---
@post_comments_router.get(
    "/{post_id}/comments",
    summary="Lấy danh sách comment (dạng cây)"
)
def get_comments(
    post_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user), 
):
    return CommentService(db).get_post_comments(post_id, current_user.id, offset, limit)

# --- 4. Sửa comment ---
@comments_router.put("/{comment_id}", summary="Sửa nội dung")
def update_comment(
    comment_id: UUID,
    data: CommentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CommentService(db).update_comment(comment_id, current_user.id, data)

# --- 5. Xóa comment (Soft delete) ---
@comments_router.delete("/{comment_id}")
def delete_comment(
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CommentService(db).delete_comment(comment_id, current_user.id)

# --- 6. Khôi phục comment ---
@comments_router.post("/{comment_id}/restore")
def restore_comment(
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return CommentService(db).restore_comment(comment_id, current_user.id)

# --- 7. Xem thùng rác ---
@comments_router.get("/trash", summary="Xem thùng rác comment")
def get_comment_trash(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return CommentService(db).get_my_trash(current_user.id)

# --- 8. Xóa vĩnh viễn ---
@comments_router.delete("/{comment_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def permanent_delete_comment(
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    CommentService(db).permanent_delete(comment_id, current_user.id)
    return None

# --- 9. Lấy replies ---
@comments_router.get("/{comment_id}/replies", summary="Lấy danh sách phản hồi của một comment")
def get_comment_replies(
    comment_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CommentService(db).get_comment_replies(
        parent_id=comment_id, 
        current_user_id=current_user.id, 
        offset=offset, 
        limit=limit
    )

# --- 10. Ẩn bình luận ---
@comments_router.post("/{comment_id}/hide", summary="Ẩn bình luận")
def hide_comment(
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CommentService(db).hide_comment(current_user.id, comment_id)