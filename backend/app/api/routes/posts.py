"""
api/routes/posts.py
Post endpoints:
  POST   /posts
  GET    /posts/feed
  GET    /posts/{post_id}
  PUT    /posts/{post_id}
  DELETE /posts/{post_id}
  POST   /posts/{post_id}/like
  DELETE /posts/{post_id}/like
  POST   /posts/{post_id}/save
  DELETE /posts/{post_id}/save
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.dependencies import get_db
from app.api.deps import get_current_active_user, get_current_user
from app.services.post_service import PostService
from app.schemas.post_schema import AIPostRequest, PostCreateRequest, PostUpdateRequest, PostResponse, ApiLikePayload
from app.models.user import User
from app import models, schemas
router = APIRouter(prefix="/posts", tags=["Posts"])


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    data: PostCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Logic AI (Đã có async/await chuẩn)
    if data.content and data.content.strip().startswith("@AI"):
        from app.services.ai_service import AIService
        bot = db.query(User).filter(User.username == "nttu_bot").first()
        target_id = bot.id if bot else current_user.id
        return await AIService(db).handle_ai_request(target_id, data.content)

    # Đăng bài thường: Cần await nếu hàm này trong Service là async
    # Nếu PostService.create_post chưa chuyển sang async thì để nguyên
    return PostService(db).create_post(current_user.id, data)


@router.get("/feed", response_model=List[PostResponse], summary="Lấy feed")
def get_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Feed gồm bài viết của những người bạn đang follow."""
    return PostService(db).get_feed(current_user.id, offset, limit)

@router.get("/trash", response_model=List[PostResponse])
def get_post_trash(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return PostService(db).get_trash(current_user.id)

@router.get("/saved", response_model=List[PostResponse])
def get_saved_posts(
    offset: int = 0, # 🔥 Phải là int
    limit: int = 10, # 🔥 Phải là int
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return PostService(db).get_saved_posts(user_id=current_user.id, offset=offset, limit=limit)

@router.get("/{post_id}", response_model=PostResponse, summary="Chi tiết bài viết")
def get_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).get_post(post_id, current_user.id)


@router.put("/{post_id}", response_model=PostResponse, summary="Chỉnh sửa bài viết")
def update_post(
    post_id: UUID,
    data: PostUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).update_post(post_id, current_user.id, data)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Xóa bài viết")
def delete_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    PostService(db).delete_post(post_id, current_user.id)


# app/api/routes/posts.py
from app.schemas.post_schema import ApiLikePayload # Đảm bảo đã import Schema

@router.post("/{post_id}/like", status_code=status.HTTP_201_CREATED)
async def like_post( # Thêm async
    post_id: UUID,
    payload: ApiLikePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # THÊM await vì PostService.like_post bây giờ là async (để bắn socket)
    return await PostService(db).like_post(current_user.id, post_id, payload.type)

@router.delete("/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT, summary="Unlike bài viết")
def unlike_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    PostService(db).unlike_post(current_user.id, post_id)


@router.post("/{post_id}/save", status_code=status.HTTP_201_CREATED, summary="Lưu bài viết")
def save_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    PostService(db).save_post(current_user.id, post_id)
    return {"message": "Saved"}


@router.delete("/{post_id}/save", status_code=status.HTTP_204_NO_CONTENT, summary="Bỏ lưu bài viết")
def unsave_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    PostService(db).unsave_post(current_user.id, post_id)

@router.post("/{post_id}/restore")
def restore_post(post_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return PostService(db).restore_post(post_id, current_user.id)

@router.get("/my-recent", response_model=List[PostResponse])
def get_my_recent(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return PostService(db).get_my_recent_posts(current_user.id)

@router.get("", response_model=List[PostResponse])
def get_all_posts(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Hàm này sẽ lấy bài viết theo logic "Feed" (có cả bài của mình)
    return PostService(db).get_feed(current_user.id, offset, limit)

# app/api/routes/posts.py

@router.post("/{post_id}/share", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def share_post( # Thêm async
    post_id: UUID, 
    data: PostCreateRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # THÊM await vì PostService.share_post bây giờ là async (để bắn socket)
    return await PostService(db).share_post(current_user.id, post_id, data.content)

# app/api/routes/posts.py


@router.post("/{post_id}/hide", status_code=status.HTTP_200_OK)
def hide_post_api(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ẩn bài viết"""
    success = PostService(db).hide_post(current_user.id, post_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết để ẩn")
    return {"message": "Đã ẩn bài viết"}

@router.delete("/{target_id}/unhide", status_code=status.HTTP_200_OK)
def unhide_item(
    target_id: UUID,
    target_type: str = "post", # Backend nhặt tham số từ URL (?target_type=...)
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bỏ ẩn bài viết hoặc bình luận"""
    # Hào gọi service và truyền target_type vào
    success = PostService(db).unhide_item(current_user.id, target_id, target_type)
    
    if not success:
        # Nếu không tìm thấy trong archive thì báo lỗi
        raise HTTPException(status_code=404, detail=f"Không tìm thấy {target_type} này trong kho lưu trữ")
        
    return {"message": "Đã hiện lại thành công"}

@router.get("/hidden/archive")
def get_hidden_archive(offset: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Đổi get_archive_posts thành get_archive_items
    return PostService(db).get_archive_items(current_user.id, offset, limit)







