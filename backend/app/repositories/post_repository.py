"""
repositories/post_repository.py
Data access layer cho Post, Like, SavedPost
"""
from datetime import datetime, timedelta
from sqlalchemy import and_, case, desc, distinct, func, or_, exists, select
from app.models.comment import Comment
from typing import Any, Optional, List
from uuid import UUID
from sqlalchemy.orm import Session, contains_eager, joinedload, selectinload, subqueryload
from app.models.post import Post, Like, SavedPost, HiddenItem
from app.models.user import Follow

class PostRepository:
    """CRUD operations cho Post"""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, post_id: UUID) -> Optional[Post]:
        """Lấy post theo ID (không bị soft-deleted)"""
        return self.db.query(Post).filter(
            Post.id == post_id,
            Post.deleted_at.is_(None)
        ).first()

    def create(self, user_id: UUID, **kwargs) -> Post:
        """Tạo bài viết mới"""
        post = Post(user_id=user_id, **kwargs)
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def update(self, post: Post, **kwargs) -> Post:
        """Cập nhật bài viết"""
        from datetime import datetime
        for key, value in kwargs.items():
            if value is not None:
                setattr(post, key, value)
        post.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(post)
        return post

    def soft_delete(self, post: Post) -> Post:
        """Soft delete bài viết"""
        from datetime import datetime
        post.deleted_at = datetime.utcnow()
        self.db.commit()
        return post

    def get_feed(self, user_id: UUID, offset: int = 0, limit: int = 20):
        eight_hours_ago = datetime.utcnow() - timedelta(hours=8)

        # FIX CẢNH BÁO DÒNG 119: Sử dụng select() rõ ràng cho subquery
        following_ids_stmt = select(Follow.following_id).where(Follow.follower_id == user_id)

        # Tối ưu Subqueries bằng cách Correlate chuẩn xác
        like_count_sub = (
            select(func.count(Like.user_id))
            .where(Like.post_id == Post.id)
            .scalar_subquery()
        )

        comment_count_sub = (
            select(func.count(Comment.id))
            .where(and_(Comment.post_id == Post.id, Comment.deleted_at.is_(None)))
            .scalar_subquery()
        )

        user_react_sub = (
            select(Like.reaction_type)
            .where(and_(Like.post_id == Post.id, Like.user_id == user_id))
            .limit(1)
            .scalar_subquery()
        )

        # Điểm ưu tiên (Priority Score)
        priority_score = case(
            (and_(Post.user_id == user_id, Post.created_at >= eight_hours_ago), 1),
            else_=0
        )

        # QUERY CHÍNH
        # Giữ nguyên logic: Trả về Tuple để Frontend nhận đủ field mở rộng
        return (
            self.db.query(
                Post,
                user_react_sub.label("reaction_type"),
                like_count_sub.label("like_count"),
                comment_count_sub.label("comment_count"),
                # Dùng exists() trực tiếp trong select để giảm overhead
                exists().where(and_(Like.post_id == Post.id, Like.user_id == user_id)).label("is_liked"),
                exists().where(and_(SavedPost.post_id == Post.id, SavedPost.user_id == user_id)).label("is_saved")
            )
            .options(
                joinedload(Post.author),
                # Tối ưu load bài share: dùng joinedload lồng nhau để chỉ tốn 1 lần JOIN SQL
                joinedload(Post.shared_post).joinedload(Post.author)
            )
            .filter(
                and_(
                    Post.deleted_at.is_(None),
                    # Fix lỗi IN: dùng stmt đã tạo ở trên
                    or_(
                        Post.user_id == user_id,
                        Post.user_id.in_(following_ids_stmt)
                    ),
                    or_(
                        Post.visibility == "public",
                        Post.user_id == user_id
                    ),
                    # Loại bỏ bài viết bị ẩn
                    ~exists().where(
                        and_(
                            HiddenItem.target_id == Post.id,
                            HiddenItem.user_id == user_id,
                            HiddenItem.target_type == 'post'
                        )
                    )
                )
            )
            .order_by(
                desc(priority_score),
                desc(Post.created_at),
                desc(Post.id)
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_user_posts(self, target_user_id: UUID, current_user_id: UUID, offset: int = 0, limit: int = 20) -> List[Any]:
        eight_hours_ago = datetime.utcnow() - timedelta(hours=8)

        # Subqueries tương tự get_feed nhưng filter theo current_user_id (người xem)
        like_count_sub = select(func.count(Like.user_id)).where(Like.post_id == Post.id).scalar_subquery()
        comment_count_sub = select(func.count(Comment.id)).where(
            and_(Comment.post_id == Post.id, Comment.deleted_at.is_(None))
        ).scalar_subquery()
        
        user_react_sub = select(Like.reaction_type).where(
            and_(Like.post_id == Post.id, Like.user_id == current_user_id)
        ).limit(1).scalar_subquery()

        return (
            self.db.query(
                Post,
                user_react_sub.label("reaction_type"),
                like_count_sub.label("like_count"),
                comment_count_sub.label("comment_count"),
                exists().where(and_(Like.post_id == Post.id, Like.user_id == current_user_id)).label("is_liked"),
                exists().where(and_(SavedPost.post_id == Post.id, SavedPost.user_id == current_user_id)).label("is_saved")
            )
            .options(
                joinedload(Post.author),
                joinedload(Post.shared_post).joinedload(Post.author)
            )
            .filter(
                and_(
                    Post.user_id == target_user_id,
                    Post.deleted_at.is_(None),
                    or_(Post.visibility == "public", Post.user_id == current_user_id),
                    ~exists().where(
                        and_(
                            HiddenItem.target_id == Post.id,
                            HiddenItem.user_id == current_user_id,
                            HiddenItem.target_type == 'post'
                        )
                    )
                )
            )
            .order_by(
                desc(case((and_(Post.user_id == target_user_id, Post.created_at >= eight_hours_ago), 1), else_=0)),
                desc(Post.created_at)
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_likes(self, post_id: UUID) -> int:
        """Đếm số lượng like"""
        return self.db.query(Like).filter(Like.post_id == post_id).count()

    def count_comments(self, post_id: UUID) -> int:
        """Đếm số comment"""
        from app.models.comment import Comment
        return self.db.query(Comment).filter(
            Comment.post_id == post_id,
            Comment.deleted_at.is_(None)
        ).count()

    # Sửa lại hàm like để hỗ trợ reaction_type
    def like(self, user_id: UUID, post_id: UUID, reaction_type: str = "like") -> Optional[Like]:
        r_type = reaction_type.lower()
        
        # Tìm xem user này đã reaction bài này chưa
        existing = self.db.query(Like).filter_by(user_id=user_id, post_id=post_id).first()
        
        if existing:
            # TRƯỜNG HỢP 1: Bấm trùng icon đang hiện -> XÓA (Unlike)
            if existing.reaction_type == r_type:
                self.db.delete(existing)
                self.db.commit()
                return None
            
            # TRƯỜNG HỢP 2: Bấm icon khác (Đang like chọn haha) -> ĐÈ LÊN (Update)
            existing.reaction_type = r_type
            self.db.commit()
            self.db.refresh(existing)
            return existing

        # TRƯỜNG HỢP 3: Chưa có thì tạo mới
        new_like = Like(user_id=user_id, post_id=post_id, reaction_type=r_type)
        self.db.add(new_like)
        self.db.commit()
        self.db.refresh(new_like)
        return new_like

    def unlike(self, user_id: UUID, post_id: UUID) -> bool:
        """Unlike một bài viết"""
        deleted = self.db.query(Like).filter(
            Like.user_id == user_id, Like.post_id == post_id
        ).delete()
        self.db.commit()
        return deleted > 0

    def is_liked(self, user_id: UUID, post_id: UUID) -> bool:
        """Kiểm tra user đã like bài viết chưa"""
        return self.db.query(Like).filter(
            Like.user_id == user_id, Like.post_id == post_id
        ).first() is not None

    def save_post(self, user_id: UUID, post_id: UUID) -> SavedPost:
        """Lưu bài viết"""
        saved = SavedPost(user_id=user_id, post_id=post_id)
        self.db.add(saved)
        self.db.commit()
        return saved

    def unsave_post(self, user_id: UUID, post_id: UUID) -> bool:
        """Bỏ lưu bài viết"""
        deleted = self.db.query(SavedPost).filter(
            SavedPost.user_id == user_id, SavedPost.post_id == post_id
        ).delete()
        self.db.commit()
        return deleted > 0

    def is_saved(self, user_id: UUID, post_id: UUID) -> bool:
        """Kiểm tra user đã lưu bài viết chưa"""
        return self.db.query(SavedPost).filter(
            SavedPost.user_id == user_id, SavedPost.post_id == post_id
        ).first() is not None

    def create_share(self, user_id: UUID, original_id: UUID, content: Optional[str]) -> Post:
        share = Post(
            user_id=user_id,
            content=content,
            original_post_id=original_id,
            visibility="public" 
        )
        self.db.add(share)
        self.db.commit()
            # Thay vì refresh, ta query lại từ đầu với đầy đủ relationship
        return self.db.query(Post).options(
            joinedload(Post.author),
            joinedload(Post.shared_post).joinedload(Post.author)
        ).filter(Post.id == share.id).first()

    def get_top_reactions(self, post_id: UUID) -> List[str]:
            """Lấy danh sách các loại reaction khác nhau của bài viết"""

            results = (
                self.db.query(Like.reaction_type, func.count().label("count"))
                .filter(Like.post_id == post_id)
                .group_by(Like.reaction_type)
                .order_by(desc("count"))
                .limit(3)
                .all()
            )
            # Trả về mảng string, lọc bỏ None nếu có
            return [r[0].lower() for r in results if r[0]]
    
    def hide_item(self, user_id: UUID, target_id: UUID, target_type: str) -> bool:
        # Sử dụng exists() giúp Database kiểm tra nhanh hơn, không tốn RAM load object
        is_already_hidden = self.db.query(
            self.db.query(HiddenItem).filter_by(
                user_id=user_id, target_id=target_id, target_type=target_type
            ).exists()
        ).scalar()
        
        if not is_already_hidden:
            new_hidden = HiddenItem(
                user_id=user_id, 
                target_id=target_id, 
                target_type=target_type
            )
            self.db.add(new_hidden)
            self.db.commit()
        return True

    def get_hidden_posts(self, user_id: UUID, offset: int = 0, limit: int = 20):
        """Lấy danh sách các bài viết mà User này đã ẩn"""
        # Query lấy Post JOIN với HiddenItem
        return (
            self.db.query(Post)
            .join(HiddenItem, Post.id == HiddenItem.target_id)
            .filter(
                HiddenItem.user_id == user_id,
                HiddenItem.target_type == 'post',
                Post.deleted_at.is_(None)
            )
            .order_by(HiddenItem.created_at.desc())
            .offset(offset).limit(limit).all()
        )
    
    def get_reaction_type(self, user_id: UUID, post_id: UUID) -> Optional[str]:
        """Lấy loại reaction cụ thể của một user trên một bài viết"""
        #  LƯU Ý: Import Like từ app.models.post vì nó nằm chung file Post
        from app.models.post import Like 
        
        like_entry = self.db.query(Like).filter(
            Like.user_id == user_id,
            Like.post_id == post_id
        ).first()
        
        return like_entry.reaction_type.lower() if like_entry and like_entry.reaction_type else None
    
    def get_top_reactions_batch(self, post_ids: List[UUID]):
        results = (
            self.db.query(
                Like.post_id,
                Like.reaction_type,
                func.count().label("count")
            )
            .filter(Like.post_id.in_(post_ids))
            .group_by(Like.post_id, Like.reaction_type)
            .order_by(Like.post_id, desc("count"))
            .all()
        )

        from collections import defaultdict

        grouped = defaultdict(list)

        for post_id, reaction, count in results:
            if reaction:
                grouped[post_id].append((reaction.lower(), count))

        # lấy top 3 mỗi post
        final = {}
        for post_id, items in grouped.items():
            items.sort(key=lambda x: -x[1])  # sort theo count desc
            final[post_id] = [r for r, _ in items[:3]]

        return final
    
    def get_by_user(self, user_id: UUID, offset: int, limit: int):
        return self.db.query(Post).filter(
            Post.user_id == user_id, 
            Post.deleted_at == None
        ).offset(offset).limit(limit).all()