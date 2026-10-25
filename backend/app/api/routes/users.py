"""
api/routes/users.py
User endpoints:
  GET    /users/me
  PUT    /users/me
  GET    /users/{username}
  POST   /users/{user_id}/follow
  DELETE /users/{user_id}/follow
  POST   /users/{user_id}/block
  DELETE /users/{user_id}/block
  GET    /users/{user_id}/followers
  GET    /users/{user_id}/following
"""
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_current_active_user, get_db
from app.core.dependencies import get_db
from app.api.deps import get_current_user
from app.services.user_service import UserService
from app.schemas.user_schema import UserProfileResponse, UserResponse, UserPublicResponse, UserUpdateRequest
from app.models.user import User
from app.schemas.post_schema import PostResponse
from app.services.post_service import PostService
router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse, summary="Lấy profile bản thân")
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = UserService(db)
    return service.get_profile(current_user.id)

@router.put("/me", response_model=UserResponse, summary="Cập nhật profile")
def update_my_profile(data: UserUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = UserService(db)
    return service.update_profile(current_user.id, data)

@router.get("/me/friends", response_model=List[UserPublicResponse])
def get_my_friends(
    # FastAPI sẽ ưu tiên các Depends lên trước
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    # Sử dụng Query() để ép FastAPI hiểu đây là tham số từ URL (?offset=...)
    offset: int = Query(0, ge=0), 
    limit: int = Query(20, gt=0)
):
    service = UserService(db)
    # Gọi hàm 'có sẵn' mà Hào đã viết rất tốt ở UserService
    return service.get_friends(current_user.id, offset=offset, limit=limit)

@router.get("/me/friends/search", response_model=List[UserPublicResponse])
def search_my_friends(
    q: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = UserService(db)
    return service.search_friends(current_user.id, q)

# --- QUAN TRỌNG: ĐƯA SUGGESTIONS LÊN ĐÂY ---
@router.get("/suggestions", response_model=List[UserPublicResponse])
def get_suggestions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = UserService(db)
    return service.get_suggestions(current_user.id)

@router.get("/search", response_model=List[UserPublicResponse])
def search_users(
    q: str, 
    limit: int = 10, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = UserService(db)
    return service.search_users(q, limit)


@router.get("/me/chat-suggestions", response_model=List[UserPublicResponse])
def get_chat_suggestions(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    service = UserService(db)
    return service.get_chat_suggestions(current_user.id)

# --- CÁC ROUTE CÓ BIẾN {variable} PHẢI ĐỂ Ở DƯỚI CÙNG ---
@router.get("/profile/{username}", response_model=UserProfileResponse, summary="Xem profile đầy đủ")
def get_full_user_profile(
    username: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # Thêm cái này để check is_following
):
    service = UserService(db)
    # Gọi hàm get_full_profile mà anh em mình vừa viết ở UserService
    return service.get_full_profile(current_user.id, username)

@router.post("/{user_id}/follow", status_code=status.HTTP_201_CREATED, summary="Follow user")
def follow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    service.follow_user(current_user.id, user_id)
    return {"message": "Followed successfully"}


@router.delete("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT, summary="Unfollow user")
def unfollow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    service.unfollow_user(current_user.id, user_id)


@router.post("/{user_id}/block", status_code=status.HTTP_201_CREATED, summary="Block user")
def block_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    service.block_user(current_user.id, user_id)
    return {"message": "Blocked successfully"}

@router.get("/me/blocked", response_model=List[UserPublicResponse])
def get_my_blocked_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = UserService(db)
    return service.get_blocked_list(current_user.id)

@router.delete("/{user_id}/block", status_code=status.HTTP_204_NO_CONTENT, summary="Unblock user")
def unblock_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    service.unblock_user(current_user.id, user_id)



@router.get("/{user_id}/followers", response_model=List[UserPublicResponse], summary="Danh sách followers")
def get_followers(user_id: UUID, db: Session = Depends(get_db)):
    service = UserService(db)
    return service.get_followers(user_id)


@router.get("/{user_id}/following", response_model=List[UserPublicResponse], summary="Danh sách đang follow")
def get_following(user_id: UUID, db: Session = Depends(get_db)):
    service = UserService(db)
    return service.get_following(user_id)

@router.get("/{user_id}/posts", response_model=List[PostResponse])
def get_user_posts(
    user_id: UUID, 
    offset: int = 0, 
    limit: int = 20, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # Để kiểm tra is_liked/is_saved
):
    from app.services.post_service import PostService
    service = PostService(db)
    # Truyền current_user.id vào để lấy trạng thái is_liked của chính mình
    return service.get_user_posts(user_id, current_user.id, offset, limit)

@router.get("/{user_id}/friends", response_model=List[UserPublicResponse])
def get_user_friends(
    user_id: UUID,
    offset: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = UserService(db)
    return service.get_friends(user_id, offset, limit)


