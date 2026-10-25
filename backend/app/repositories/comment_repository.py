"""
repositories/comment_repository.py
Optimized production-ready version (fixed + safer + faster)
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
import sqlalchemy
from sqlalchemy.orm import Session, joinedload, aliased, selectinload
from sqlalchemy import select, func, and_, exists, literal
from app.models.comment import Comment, CommentLike
from app.models.post import HiddenItem


class CommentRepository:
    def __init__(self, db: Session):
        self.db = db

    # ======================================================
    # CORE SUBQUERY BUILDER (FIXED + OPTIMIZED)
    # ======================================================

    def _reaction_subqueries(self, current_user_id):
        Reply = aliased(Comment)

        # 1. LIKE COUNT: Dùng select() để rành mạch
        like_count_sub = (
            select(
                CommentLike.comment_id.label("like_comment_id"),
                func.count(CommentLike.user_id).label("total_likes")
            )
            .group_by(CommentLike.comment_id)
            .subquery()
        )

        # 2. REPLY COUNT
        reply_count_sub = (
            select(
                Reply.parent_id.label("reply_parent_id"),
                func.count(Reply.id).label("total_replies")
            )
            .where(Reply.deleted_at.is_(None))
            .group_by(Reply.parent_id)
            .subquery()
        )

        # 3. USER STATE (Chỉ chạy nếu có user_id)
        if current_user_id:
            is_liked_sq = exists().where(
                and_(
                    CommentLike.comment_id == Comment.id,
                    CommentLike.user_id == current_user_id
                )
            ).label("is_liked")

            reaction_type_sq = (
                select(CommentLike.reaction_type)
                .where(
                    and_(
                        CommentLike.comment_id == Comment.id,
                        CommentLike.user_id == current_user_id
                    )
                )
                .limit(1)
                .scalar_subquery()
                .label("reaction_type")
            )
        else:
            is_liked_sq = literal(False).label("is_liked")
            reaction_type_sq = literal(None).label("reaction_type")

        return like_count_sub, reply_count_sub, is_liked_sq, reaction_type_sq

    # ======================================================
    # BASIC CRUD
    # ======================================================

    def get_by_id(self, comment_id: UUID) -> Optional[Comment]:
        return (
            self.db.query(Comment)
            .filter(Comment.id == comment_id)
            .first()
        )

    def get_comment_with_stats(self, comment_id: UUID, current_user_id: UUID = None) -> Optional[Comment]:
        """
        Lấy chi tiết 1 comment kèm theo tất cả bộ đếm (Like, Reply, Trạng thái Like)
        """
        like_count_sub, reply_count_sub, is_liked_sq, reaction_type_sq = \
            self._reaction_subqueries(current_user_id)

        query = (
            self.db.query(
                Comment,
                func.coalesce(like_count_sub.c.total_likes, 0).label("like_count"),
                func.coalesce(reply_count_sub.c.total_replies, 0).label("reply_count"),
                is_liked_sq,
                reaction_type_sq
            )
            .options(joinedload(Comment.author))
            .outerjoin(like_count_sub, like_count_sub.c.like_comment_id == Comment.id)
            .outerjoin(reply_count_sub, reply_count_sub.c.reply_parent_id == Comment.id)
            .filter(Comment.id == comment_id)
        )

        result = query.first()
        if not result:
            return None
            
        return self._format_results([result])[0]

    def create(self, post_id: UUID, user_id: UUID, content: str,
               parent_id: UUID = None, media_url: str = None):

        comment = Comment(
            post_id=post_id,
            user_id=user_id,
            content=content,
            parent_id=parent_id,
            media_url=media_url
        )
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def update(self, comment: Comment, content: str, media_url: str = None):
        comment.content = content
        if media_url is not None:
            comment.media_url = media_url

        comment.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def soft_delete(self, comment: Comment):
        comment.deleted_at = datetime.utcnow()
        self.db.commit()
        return comment

    def restore(self, comment_id: UUID):
        comment = self.get_by_id(comment_id)
        if comment and comment.deleted_at:
            comment.deleted_at = None
            comment.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(comment)
        return comment

    def hard_delete(self, comment_id: UUID):
        comment = self.get_by_id(comment_id)
        if comment:
            self.db.delete(comment)
            self.db.commit()
            return True
        return False

    # ======================================================
    # ROOT COMMENTS
    # ======================================================

    def get_roots_by_post(
        self,
        post_id: UUID,
        offset: int,
        limit: int,
        current_user_id: UUID = None
    ):

        like_count, reply_count, is_liked, reaction_type = \
            self._reaction_subqueries(current_user_id)

        query = (
            self.db.query(
                Comment,
                func.coalesce(like_count.c.like_count, 0).label("like_count"),
                func.coalesce(reply_count.c.reply_count, 0).label("reply_count"),
                is_liked.label("is_liked"),
                reaction_type.label("reaction_type")
            )
            .options(joinedload(Comment.author))
            .outerjoin(like_count, like_count.c.comment_id == Comment.id)
            .outerjoin(reply_count, reply_count.c.comment_id == Comment.id)
            .filter(
                Comment.post_id == post_id,
                Comment.parent_id.is_(None),
                Comment.deleted_at.is_(None)
            )
        )

        # hidden filter (SAFE EXISTS)
        if current_user_id:
            query = query.filter(
                ~exists().where(
                    and_(
                        HiddenItem.target_id == Comment.id,
                        HiddenItem.user_id == current_user_id,
                        HiddenItem.target_type == "comment"
                    )
                )
            )

        results = (
            query.order_by(Comment.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return self._format_results(results)

    # ======================================================
    # REPLIES
    # ======================================================

    def get_replies(self, parent_id: UUID, current_user_id: UUID = None, offset: int = 0, limit: int = 10):
        # Sử dụng lại logic subqueries để có like_count, is_liked cho đám reply con
        like_count_sub, reply_count_sub, is_liked_sq, reaction_type_sq = \
            self._reaction_subqueries(current_user_id)

        query = (
            self.db.query(
                Comment,
                func.coalesce(like_count_sub.c.total_likes, 0).label("like_count"),
                func.coalesce(reply_count_sub.c.total_replies, 0).label("reply_count"),
                is_liked_sq,
                reaction_type_sq
            )
            .options(joinedload(Comment.author))
            .outerjoin(like_count_sub, like_count_sub.c.like_comment_id == Comment.id)
            .outerjoin(reply_count_sub, reply_count_sub.c.reply_parent_id == Comment.id)
            .filter(
                Comment.parent_id == parent_id # Lấy con của thằng này
            )
            .order_by(Comment.created_at.asc()) # Reply con thì nên hiện từ cũ đến mới
        )

        return self._format_results(query.offset(offset).limit(limit).all())

    # ======================================================
    # REACTIONS
    # ======================================================

    ALLOWED_REACTIONS = {"like", "love", "haha", "wow", "sad", "angry"}

    def react(self, comment_id: UUID, user_id: UUID, reaction_type: str):

        r_type = reaction_type.lower()

        if r_type not in self.ALLOWED_REACTIONS:
            raise ValueError("Invalid reaction type")

        existing = (
            self.db.query(CommentLike)
            .filter_by(user_id=user_id, comment_id=comment_id)
            .with_for_update()
            .first()
        )

        if existing:
            if existing.reaction_type == r_type:
                self.db.delete(existing)
                self.db.commit()
                return False

            existing.reaction_type = r_type
            self.db.commit()
            return True

        self.db.add(CommentLike(
            user_id=user_id,
            comment_id=comment_id,
            reaction_type=r_type
        ))
        self.db.commit()
        return True

    def check_is_liked(self, comment_id: UUID, user_id: UUID) -> bool:
        if not user_id:
            return False

        return self.db.query(
            exists().where(
                and_(
                    CommentLike.comment_id == comment_id,
                    CommentLike.user_id == user_id
                )
            )
        ).scalar()

    def get_user_reaction(self, comment_id: UUID, user_id: UUID):
        if not user_id:
            return None

        record = (
            self.db.query(CommentLike)
            .filter_by(user_id=user_id, comment_id=comment_id)
            .first()
        )

        return record.reaction_type if record else None

    # ======================================================
    # ARCHIVE
    # ======================================================

    def get_archived_by_user(self, user_id: UUID) -> List[Comment]:
        # 1. Khởi tạo subqueries để đếm stats (Like/Reply)
        like_count_sub, reply_count_sub, is_liked_sq, reaction_type_sq = \
            self._reaction_subqueries(user_id)

        # 2. Query gộp tất cả thông tin vào 1 lần fetch
        query = (
            self.db.query(
                Comment,
                func.coalesce(like_count_sub.c.total_likes, 0).label("like_count"),
                func.coalesce(reply_count_sub.c.total_replies, 0).label("reply_count"),
                is_liked_sq,
                reaction_type_sq
            )
            .options(joinedload(Comment.author)) # Load luôn người comment
            .outerjoin(like_count_sub, like_count_sub.c.like_comment_id == Comment.id)
            .outerjoin(reply_count_sub, reply_count_sub.c.reply_parent_id == Comment.id)
            .filter(
                Comment.user_id == user_id,
                Comment.deleted_at.is_not(None) # Chỉ lấy hàng trong thùng rác
            )
            .order_by(Comment.deleted_at.desc())
        )

        # 3. Trả về kết quả sau khi qua hàm format (để gán cached_)
        return self._format_results(query.all())

    # ======================================================
    # FORMATTER
    # ======================================================

    def _format_results(self, results):
        out = []
        for row in results:
            # 1. Trường hợp là object Comment thuần túy
            if isinstance(row, Comment):
                comment = row
                l_count, r_count, is_l, react = 0, 0, False, None
            else:
                # 2. Trường hợp là Row (kết quả JOIN)
                comment = row[0]
                
                # Sử dụng Mapping để lấy dữ liệu theo tên cột cực kỳ an toàn
                # Bản SQLAlchemy mới dùng ._mapping, bản cũ dùng dict(row)
                row_map = row._mapping if hasattr(row, '_mapping') else row
                
                l_count = row_map.get('like_count', 0)
                r_count = row_map.get('reply_count', 0)
                is_l = row_map.get('is_liked', False)
                react = row_map.get('reaction_type', None)

            # 3. NHỒI DỮ LIỆU VÀO __dict__ (Cách duy nhất để Service thấy được)
            comment.__dict__['cached_like_count'] = int(l_count or 0)
            comment.__dict__['cached_reply_count'] = int(r_count or 0)
            comment.__dict__['cached_is_liked'] = bool(is_l)
            comment.__dict__['cached_reaction_type'] = react
            
            out.append(comment)
        return out
    # ======================================================
    # GET ALL BY POST
    # ======================================================

    def get_all_by_post(self, post_id: UUID, current_user_id: UUID = None):
        # 1. Gọi subqueries để chuẩn bị dữ liệu đếm
        like_count_sub, reply_count_sub, is_liked_sq, reaction_type_sq = \
            self._reaction_subqueries(current_user_id)

        # 2. Xây dựng câu Query chính
        query = (
            self.db.query(
                Comment,
                # Đếm Like từ subquery
                func.coalesce(like_count_sub.c.total_likes, 0).label("like_count"),
                # 🔥 ĐẾM REPLY TỪ SUBQUERY (Chỗ này Hào hay bị thiếu)
                func.coalesce(reply_count_sub.c.total_replies, 0).label("reply_count"),
                is_liked_sq,
                reaction_type_sq
            )
            .options(joinedload(Comment.author))
            .outerjoin(like_count_sub, like_count_sub.c.like_comment_id == Comment.id)
            # 🔥 QUAN TRỌNG: Phải Outer Join với reply_count_sub thì mới có số 1 kia
            .outerjoin(reply_count_sub, reply_count_sub.c.reply_parent_id == Comment.id)
            .filter(
                Comment.post_id == post_id,
                Comment.parent_id.is_(None) # Chỉ lấy comment cha ở tầng này
            )
            .order_by(Comment.created_at.asc())
        )

        # 3. Format kết quả để gán vào cached_reply_count
        return self._format_results(query.all())

    def get_comment_with_stats(self, comment_id: UUID, current_user_id: UUID = None) -> Optional[Comment]:
        """
        Lấy chi tiết 1 comment kèm theo tất cả bộ đếm (Like, Reply, Trạng thái Like)
        Dùng để trả về Frontend sau khi tương tác.
        """
        like_count_sub, reply_count_sub, is_liked_sq, reaction_type_sq = \
            self._reaction_subqueries(current_user_id)

        query = (
            self.db.query(
                Comment,
                func.coalesce(like_count_sub.c.total_likes, 0).label("like_count"),
                func.coalesce(reply_count_sub.c.total_replies, 0).label("reply_count"),
                is_liked_sq,
                reaction_type_sq
            )
            .options(joinedload(Comment.author))
            .outerjoin(like_count_sub, like_count_sub.c.like_comment_id == Comment.id)
            .outerjoin(reply_count_sub, reply_count_sub.c.reply_parent_id == Comment.id)
            .filter(Comment.id == comment_id)
        )

        result = query.first()
        if not result:
            return None
            
        # Bắt buộc phải đưa vào list để xài hàm format, sau đó rút phần tử đầu tiên ra
        return self._format_results([result])[0]