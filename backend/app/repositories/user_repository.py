"""
repositories/user_repository.py
Data access layer cho User
Chỉ chứa logic truy vấn database, không chứa business logic
"""
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID
from sqlalchemy import desc, func, literal_column, not_, or_, text
from sqlalchemy.orm import Session
from app.models.user import User, Follow, BlockedUser

class UserRepository:
    """CRUD operations cho User"""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Lấy user theo ID"""
        return self.db.query(User).filter(
            User.id == user_id,
            User.deleted_at.is_(None)
        ).first()

    def get_by_email(self, email: str) -> Optional[User]:
        """Lấy user theo email"""
        return self.db.query(User).filter(
            User.email == email,
            User.deleted_at.is_(None)
        ).first()

    def get_by_username(self, username: str) -> Optional[User]:
        """Lấy user theo username"""
        return self.db.query(User).filter(
            User.username == username,
            User.deleted_at.is_(None)
        ).first()

    def create(self, **kwargs) -> User:
        """Tạo user mới"""
        user = User(**kwargs)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User, **kwargs) -> User:
        """Cập nhật thông tin user và xử lý múi giờ an toàn"""
        for key, value in kwargs.items():
            if value is not None:
                # 🔥 XỬ LÝ MÚI GIỜ: Nếu là biến datetime, ép nó về UTC để tránh lỗi subtract offset-naive
                if isinstance(value, datetime) and value.tzinfo is None:
                    value = value.replace(tzinfo=timezone.utc)
                setattr(user, key, value)
        
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_followers(self, user_id: UUID) -> List[User]:
        """Lấy danh sách người đang follow user này"""
        return (
            self.db.query(User)
            .join(Follow, Follow.follower_id == User.id)
            .filter(Follow.following_id == user_id)
            .all()
        )

    def get_following(self, user_id: UUID) -> List[User]:
        """Lấy danh sách user mà user này đang follow"""
        return (
            self.db.query(User)
            .join(Follow, Follow.following_id == User.id)
            .filter(Follow.follower_id == user_id)
            .all()
        )

    def follow(self, follower_id: UUID, following_id: UUID) -> Follow:
        """Tạo quan hệ follow"""
        follow = Follow(follower_id=follower_id, following_id=following_id)
        self.db.add(follow)
        self.db.commit()
        return follow

    def unfollow(self, follower_id: UUID, following_id: UUID) -> bool:
        """Xóa quan hệ follow"""
        deleted = self.db.query(Follow).filter(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
        ).delete()
        self.db.commit()
        return deleted > 0

    def is_following(self, follower_id: UUID, following_id: UUID) -> bool:
        """Kiểm tra user A có đang follow user B không"""
        return self.db.query(Follow).filter(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
        ).first() is not None

    def block(self, user_id: UUID, blocked_user_id: UUID) -> BlockedUser:
        """Block một user"""
        block = BlockedUser(user_id=user_id, blocked_user_id=blocked_user_id)
        self.db.add(block)
        self.db.commit()
        return block

    def unblock(self, user_id: UUID, blocked_user_id: UUID) -> bool:
        """Unblock một user"""
        deleted = self.db.query(BlockedUser).filter(
            BlockedUser.user_id == user_id,
            BlockedUser.blocked_user_id == blocked_user_id,
        ).delete()
        self.db.commit()
        return deleted > 0

    def is_blocked(self, user_id: UUID, blocked_user_id: UUID) -> bool:
        """Kiểm tra user A có bị block bởi user B không"""
        return self.db.query(BlockedUser).filter(
            BlockedUser.user_id == user_id,
            BlockedUser.blocked_user_id == blocked_user_id,
        ).first() is not None

    def get_suggestions(self, user_id: UUID, limit: int = 10) -> List[User]:
        """Lấy gợi ý người dùng (Ưu tiên bạn chung, không dùng random)"""
        # 1. Lấy danh sách ID đang follow và bị block (scalar_subquery để tối ưu)
        following_ids = self.db.query(Follow.following_id).filter(Follow.follower_id == user_id).scalar_subquery()
        blocked_ids = self.db.query(BlockedUser.blocked_user_id).filter(BlockedUser.user_id == user_id).scalar_subquery()
        blocker_ids = self.db.query(BlockedUser.user_id).filter(BlockedUser.blocked_user_id == user_id).scalar_subquery()

        # 2. Query chính: Tìm những người mình chưa follow, không block nhau
        # Ưu tiên những người có bạn chung
        query = (
            self.db.query(User, func.count(Follow.follower_id).label("mutual_count"))
            .join(Follow, Follow.following_id == User.id)
            .filter(
                User.id != user_id,
                User.deleted_at.is_(None),
                not_(User.id.in_(following_ids)),
                not_(User.id.in_(blocked_ids)),
                not_(User.id.in_(blocker_ids))
            )
            .filter(Follow.follower_id.in_(following_ids)) 
            .group_by(User.id)
            .order_by(desc("mutual_count"), User.created_at.desc()) # 🔥 Bỏ random, dùng created_at
            .limit(limit)
        )
        
        raw_results = query.all()
        suggestions = []
        for user_obj, m_count in raw_results:
            user_obj.mutual_count = m_count
            suggestions.append(user_obj)

        # 3. Fallback: Nếu ít bạn chung quá thì lấy người mới nhất hệ thống
        if len(suggestions) < limit:
            exclude_ids = [u.id for u in suggestions] + [user_id]
            fallbacks = (
                self.db.query(User)
                .filter(
                    User.deleted_at.is_(None),
                    not_(User.id.in_(exclude_ids)),
                    not_(User.id.in_(following_ids)),
                    not_(User.id.in_(blocked_ids)),
                    not_(User.id.in_(blocker_ids))
                )
                .order_by(User.created_at.desc()) # 🔥 Người mới nhất
                .limit(limit - len(suggestions))
                .all()
            )
            for u in fallbacks:
                u.mutual_count = 0
                suggestions.append(u)

        return suggestions 
    
    def search_global_users(self, query_str: str, current_user_id: UUID, limit: int = 10):
        # 1. Tạo filter tìm kiếm theo Tên hoặc Username
        search_filter = or_(
            User.username.ilike(f"%{query_str}%"),
            User.full_name.ilike(f"%{query_str}%")
        )
        
        # 2. Subqueries loại trừ Block (scalar_subquery để tránh lỗi log)
        blocked_ids = self.db.query(BlockedUser.blocked_user_id).filter(BlockedUser.user_id == current_user_id).scalar_subquery()
        blocker_ids = self.db.query(BlockedUser.user_id).filter(BlockedUser.blocked_user_id == current_user_id).scalar_subquery()

        # 3. Thực hiện Query
        return (
            self.db.query(User)
            .filter(
                search_filter,
                User.id != current_user_id, # Không tìm chính mình
                User.deleted_at.is_(None),
                not_(User.id.in_(blocked_ids)),
                not_(User.id.in_(blocker_ids))
            )
            .limit(limit)
            .all()
        )

    def get_profile_by_username(self, current_user_id: UUID, username: str):
        """
        Lấy thông tin profile đầy đủ cho trang cá nhân
        Trả về: User object kèm các chỉ số thống kê và trạng thái follow
        """
        from app.models.post import Post # Import tại chỗ để tránh circular import nếu cần
        from sqlalchemy import and_, exists

        # 1. Tìm User theo username
        user = self.db.query(User).filter(
            func.lower(User.username) == func.lower(username), 
            User.deleted_at.is_(None)
        ).first()
        
        if not user:
            return None

        # 2. Đếm các chỉ số thống kê (Triệt tiêu N+1 bằng scalar subqueries)
        followers_count = self.db.query(func.count(Follow.follower_id)).filter(
            Follow.following_id == user.id
        ).scalar()
        
        following_count = self.db.query(func.count(Follow.following_id)).filter(
            Follow.follower_id == user.id
        ).scalar()
        
        posts_count = self.db.query(func.count(Post.id)).filter(
            Post.user_id == user.id, 
            Post.deleted_at.is_(None)
        ).scalar()

        # 3. Kiểm tra xem user hiện tại (mình) có đang follow người này không
        is_following = self.db.query(exists().where(and_(
            Follow.follower_id == current_user_id,
            Follow.following_id == user.id
        ))).scalar()

        # Trả về một dictionary chứa đầy đủ "đồ chơi" cho Frontend
        return {
            "user": user,
            "followers_count": followers_count or 0,
            "following_count": following_count or 0,
            "posts_count": posts_count or 0,
            "is_following": is_following
        }
    
    def get_friends(self, user_id: UUID, offset: int = 0, limit: int = 20):
        # Lấy những người mà user_id đang follow
        following_sub = self.db.query(Follow.following_id).filter(Follow.follower_id == user_id).subquery()
        
        # Lấy những người đang follow user_id
        followers_sub = self.db.query(Follow.follower_id).filter(Follow.following_id == user_id).subquery()
        
        # Giao của 2 tập hợp trên chính là BẠN BÈ
        friends = (
            self.db.query(User)
            .filter(User.id.in_(following_sub))
            .filter(User.id.in_(followers_sub))
            .filter(User.deleted_at.is_(None))
            .offset(offset).limit(limit).all()
        )
        return friends
    
    def get_blocked_users(self, user_id: UUID):
        """Lấy danh sách những người mà user_id đã chặn"""
        return (
            self.db.query(User)
            .join(BlockedUser, BlockedUser.blocked_user_id == User.id)
            .filter(BlockedUser.user_id == user_id)
            .all()
        )
    
    def search_friends(self, user_id: UUID, query: str, limit: int = 10):
        """Tìm bạn bè theo tên hoặc username (dùng cho thanh search chat)"""
        # Tận dụng logic lấy subquery bạn bè
        following_sub = self.db.query(Follow.following_id).filter(Follow.follower_id == user_id).subquery()
        followers_sub = self.db.query(Follow.follower_id).filter(Follow.following_id == user_id).subquery()

        return (
            self.db.query(User)
            .filter(
                User.id.in_(following_sub),
                User.id.in_(followers_sub),
                User.deleted_at.is_(None),
                # Thêm logic search ở đây
                (User.full_name.ilike(f"%{query}%")) | (User.username.ilike(f"%{query}%"))
            )
            .limit(limit)
            .all()
        )
    
    def is_mutual_friend(self, user_id1: UUID, user_id2: UUID) -> bool:
        """Kiểm tra xem hai người có follow lẫn nhau (Bạn bè) không"""
        # Check 1: A follow B
        f1 = self.db.query(Follow).filter(
            Follow.follower_id == user_id1,
            Follow.following_id == user_id2
        ).first()
        
        # Check 2: B follow A
        f2 = self.db.query(Follow).filter(
            Follow.follower_id == user_id2,
            Follow.following_id == user_id1
        ).first()
        
        return (f1 is not None) and (f2 is not None)
    
    def is_mutual_follow(self, user_id1: UUID, user_id2: UUID) -> bool:
        """Kiểm tra xem hai người có follow lẫn nhau hay không"""
        # 1. Check A follow B
        follow_a_b = self.db.query(Follow).filter(
            Follow.follower_id == user_id1,
            Follow.following_id == user_id2
        ).first()
        
        if not follow_a_b:
            return False
            
        # 2. Check B follow A
        follow_b_a = self.db.query(Follow).filter(
            Follow.follower_id == user_id2,
            Follow.following_id == user_id1
        ).first()
        
        return follow_b_a is not None
    
    def get_chat_suggestions(self, user_id: UUID):
        """Lấy gợi ý chat: Bạn bè thân thiết nhưng chưa tạo hội thoại"""
        # Hào nên dùng tham số :uid để tránh SQL Injection
        query = text("""
            SELECT u.* FROM users u
            WHERE u.id IN (
                SELECT f1.following_id FROM follows f1
                INNER JOIN follows f2 ON f1.following_id = f2.follower_id
                WHERE f1.follower_id = :uid AND f2.following_id = :uid
            )
            AND u.id NOT IN (
                SELECT cm2.user_id FROM conversation_members cm1
                JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
                WHERE cm1.user_id = :uid AND cm1.user_id != cm2.user_id
            )
            AND u.deleted_at IS NULL
            ORDER BY u.last_seen DESC NULLS LAST -- 🔥 Ưu tiên người vừa online
            LIMIT 10
        """)
        return self.db.query(User).from_statement(query).params(uid=user_id).all()
