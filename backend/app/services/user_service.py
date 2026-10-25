"""
services/user_service.py
Business logic cho User: profile, follow, block
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.repositories.user_repository import UserRepository
from app.repositories.notification_repository import NotificationRepository
from app.schemas.user_schema import UserProfileResponse, UserResponse, UserPublicResponse, UserUpdateRequest
from app.websocket.manager import manager


class UserService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)
        self.notif_repo = NotificationRepository(db)

    def get_profile(self, user_id: UUID) -> UserResponse:
        """Lấy profile đầy đủ của bản thân"""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return UserResponse.model_validate(user)

    def get_public_profile(self, username: str) -> UserPublicResponse:
        """Lấy profile công khai của user khác"""
        user = self.user_repo.get_by_username(username)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return UserPublicResponse.model_validate(user)

    def update_profile(self, user_id: UUID, data: UserUpdateRequest) -> UserResponse:
        """Cập nhật thông tin profile"""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        updated = self.user_repo.update(
            user,
            full_name=data.full_name,
            bio=data.bio,
            avatar_url=data.avatar_url
        )
        return UserResponse.model_validate(updated)

    def follow_user(self, follower_id: UUID, following_id: UUID) -> bool:
        """Follow user - tạo notification cho người được follow"""
        if follower_id == following_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot follow yourself"
            )
        target = self.user_repo.get_by_id(following_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if self.user_repo.is_following(follower_id, following_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already following")
        if self.user_repo.is_blocked(following_id, follower_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Blocked by this user")

        self.user_repo.follow(follower_id, following_id)
        # Tạo notification
        self.notif_repo.create(
            user_id=following_id,
            sender_id=follower_id,
            type="follow",
            reference_id=follower_id,
            content="đã bắt đầu theo dõi bạn"
        )
        return True

    def unfollow_user(self, follower_id: UUID, following_id: UUID) -> bool:
        """Unfollow user"""
        if not self.user_repo.is_following(follower_id, following_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not following")
        return self.user_repo.unfollow(follower_id, following_id)

    def block_user(self, user_id: UUID, blocked_id: UUID) -> bool:
        """Block user - tự động unfollow nếu đang follow"""
        if user_id == blocked_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot block yourself"
            )
            
        target = self.user_repo.get_by_id(blocked_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            
        if self.user_repo.is_blocked(user_id, blocked_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already blocked")

        # 🔥 Sửa logic: Thực hiện block trước, sau đó xóa các mối quan hệ follow
        self.user_repo.block(user_id, blocked_id)
        
        # Tự động hủy follow cả 2 chiều
        self.user_repo.unfollow(follower_id=user_id, following_id=blocked_id)
        self.user_repo.unfollow(follower_id=blocked_id, following_id=user_id)
        
        return True

    def unblock_user(self, user_id: UUID, blocked_id: UUID) -> bool:
        """Unblock user"""
        if not self.user_repo.is_blocked(user_id, blocked_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not blocked")
        return self.user_repo.unblock(user_id, blocked_id)

    def get_followers(self, user_id: UUID) -> List[UserPublicResponse]:
        users = self.user_repo.get_followers(user_id)
        return [UserPublicResponse.model_validate(u) for u in users]

    def get_following(self, user_id: UUID) -> List[UserPublicResponse]:
        users = self.user_repo.get_following(user_id)
        
        result = []
        for u in users:
            user_data = UserPublicResponse.model_validate(u)
            
            # 🔥 Bây giờ 'manager' đã là đối tượng, nó sẽ thấy hàm 'is_user_online'
            user_data.is_online = manager.is_user_online(str(u.id))
            
            result.append(user_data)
            
        return result
    
    def get_suggestions(self, user_id: UUID) -> List[UserPublicResponse]:
            """
            Lấy danh sách gợi ý người dùng.
            🔥 TỐI ƯU: Logic Repo nên sắp xếp theo created_at DESC thay vì random().
            """
            results = self.user_repo.get_suggestions(user_id)
            return [UserPublicResponse.model_validate(user) for user in results]
    
    def get_full_profile(self, current_user_id: UUID, username: str) -> UserProfileResponse:
        """
        Logic lấy Profile đầy đủ: 
        Dùng cho cả trang của mình và trang người khác
        """
        # 1. Gọi Repo lấy cục data tổng hợp (User + Counts + isFollowing)
        profile_data = self.user_repo.get_profile_by_username(current_user_id, username)
        
        if not profile_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User not found"
            )

        # 2. Map dữ liệu vào Schema và trả về
        return UserProfileResponse(
            user=UserResponse.model_validate(profile_data["user"]),
            followers_count=profile_data["followers_count"],
            following_count=profile_data["following_count"],
            posts_count=profile_data["posts_count"],
            is_following=profile_data["is_following"]
        )
    def search_friends(self, user_id: UUID, query: str, limit: int = 10) -> List[UserPublicResponse]:
        """Tìm kiếm trong danh sách bạn bè để bắt đầu chat"""
        friends = self.user_repo.search_friends(user_id, query, limit)
        return [UserPublicResponse.model_validate(f) for f in friends]
    
    def search_global_users(self, query: str, current_user_id: UUID):
        users = self.user_repo.search_global_users(query, current_user_id)
        from app.schemas.user_schema import UserPublicResponse
        return [UserPublicResponse.model_validate(u) for u in users]

    def get_friends(self, user_id: UUID, offset: int = 0, limit: int = 20) -> List[UserPublicResponse]:
        """Lấy danh sách bạn bè (người theo dõi lẫn nhau)"""
        friends = self.user_repo.get_friends(user_id, offset, limit)
        # Map list User object sang Schema Response để trả về JSON
        return [UserPublicResponse.model_validate(f) for f in friends]
    
    def get_blocked_list(self, user_id: UUID) -> List[UserPublicResponse]:
        """Lấy danh sách đen của user hiện tại"""
        users = self.user_repo.get_blocked_users(user_id) # Hào đã có hàm này ở Repo rồi
        return [UserPublicResponse.model_validate(u) for u in users]
    
    def get_chat_suggestions(self, user_id: UUID) -> List[UserPublicResponse]:
        """Lấy danh sách bạn bè follow chéo nhưng chưa bao giờ nhắn tin"""
        results = self.user_repo.get_chat_suggestions(user_id)
        # Vì Repo dùng db.execute().all() nên kết quả trả về là Row objects
        return [UserPublicResponse.model_validate(row) for row in results]
    
    def update_last_seen(self, user_id: UUID):
        user = self.user_repo.get_by_id(user_id)
        if not user:
            return
        
        # 🔥 SỬA TẠI ĐÂY: Dùng datetime.now(timezone.utc) để có múi giờ
        now = datetime.now(timezone.utc)
        
        # Đảm bảo user.last_seen cũng được xử lý nếu nó chưa có múi giờ (đề phòng)
        last_seen = user.last_seen
        if last_seen and last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc)

        if not last_seen or (now - last_seen) > timedelta(minutes=1):
            # Cập nhật vào DB
            self.user_repo.update(user, last_seen=now)