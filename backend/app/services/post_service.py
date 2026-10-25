from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from typing import Optional, List

from sympy import limit
from app.repositories.post_repository import PostRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.interaction_repository import InteractionRepository
from app.schemas.post_schema import PostCreateRequest, PostUpdateRequest, PostResponse, HiddenItemResponse
from app.schemas.user_schema import UserPublicResponse
from app.models.post import HiddenItem, Post, SavedPost
from app import models
from app.models.user import User
from app.models.post import Post, SavedPost

class PostService:
    def __init__(self, db: Session):
        self.db = db
        self.post_repo = PostRepository(db)
        from app.services.notification_service import NotificationService
        self.notif_service = NotificationService(db)
        self.interaction_repo = InteractionRepository(db)
        from app.repositories.comment_repository import CommentRepository
        self.comment_repo = CommentRepository(db)

    # ==========================================================
    # NHÓM 1: CRUD CƠ BẢN
    # ==========================================================
    def create_post(self, user_id: UUID, data: PostCreateRequest) -> PostResponse:
        if not data.content and not data.media_url:
            raise HTTPException(status_code=400, detail="Post must have content or media")
        post = self.post_repo.create(user_id=user_id, content=data.content, media_url=data.media_url, visibility=data.visibility)
        post = self.post_repo.get_by_id(post.id)
        return self._build_response(post, user_id)

    def get_post(self, post_id: UUID, current_user_id: UUID) -> PostResponse:
        post = self.post_repo.get_by_id(post_id)
        if not post: raise HTTPException(status_code=404, detail="Post not found")
        return self._build_response(post, current_user_id)

    def update_post(self, post_id: UUID, user_id: UUID, data: PostUpdateRequest) -> PostResponse:
        post = self.post_repo.get_by_id(post_id)
        if not post or post.user_id != user_id: raise HTTPException(status_code=403, detail="Forbidden")
        post = self.post_repo.update(post, content=data.content, media_url=data.media_url, visibility=data.visibility)
        return self._build_response(post, user_id)

    def delete_post(self, post_id: UUID, user_id: UUID) -> bool:
        post = self.post_repo.get_by_id(post_id)
        if not post or post.user_id != user_id: raise HTTPException(status_code=403, detail="Forbidden")
        self.post_repo.soft_delete(post)
        return True

    # ==========================================================
    # NHÓM 2: FEED & PROFILE
    # ==========================================================
    # app/services/post_service.py

    def get_feed(self, user_id: UUID, offset=0, limit=20):
        results = self.post_repo.get_feed(user_id, offset, limit)
        if not results: return []

        # 1. Thu thập ID để batch lấy top reactions
        post_ids = [row[0].id for row in results]
        top_reactions_map = self.post_repo.get_top_reactions_batch(post_ids)

        responses = []
        for row in results:
            post = row[0]
            # 2. Gán top reactions vào object TRƯỚC
            post.cached_top_reactions = top_reactions_map.get(post.id, [])
            
            # 3. Ép hàm map phải xử lý và gán tất cả stats từ Tuple vào object
            responses.append(self._map_tuple_to_response(row, user_id))

        return responses
    # ==========================================================
    # NHÓM 3: TƯƠNG TÁC (LIKE, SAVE, SHARE)
    # ==========================================================

    async def like_post(self, user_id: UUID, post_id: UUID, reaction_type: str = "Like") -> PostResponse:
        # 1. Thực hiện Like/Unlike (giữ nguyên logic repo)
        result = self.post_repo.like(user_id, post_id, reaction_type)
        
        # 2. Lấy post kèm Author
        post_obj = self.db.query(Post).options(joinedload(Post.author)).filter(Post.id == post_id).first()
        if not post_obj:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # 3. GỬI THÔNG BÁO REAL-TIME (Chỉ gửi nếu có reaction mới và không phải tự like bài mình)
        if result and post_obj.user_id != user_id:
            # Lấy tên tiếng Việt: "thích", "yêu thích", "Haha"...
            
            await self.notif_service.create_notification(
                user_id=post_obj.user_id, # Người nhận
                sender_id=user_id,        # Người gửi (Hào)
                notification_type="like", 
                reference_id=post_id,
                content_text=reaction_type
            )

        # 4. Gán cache và trả về response
        post_obj.cached_reaction_type = reaction_type.lower() if result else None
        post_obj.cached_is_liked = True if result else False
        post_obj.cached_top_reactions = self.post_repo.get_top_reactions(post_id)
        post_obj.cached_likes = self.post_repo.count_likes(post_id)
        post_obj.cached_comments = self.post_repo.count_comments(post_id)

        return self._build_response(post_obj, user_id)
    
    def unlike_post(self, user_id: UUID, post_id: UUID):
        result = self.post_repo.unlike(user_id, post_id)
        return True

    def save_post(self, user_id: UUID, post_id: UUID):
        if self.post_repo.is_saved(user_id, post_id): raise HTTPException(status_code=409, detail="Already saved")
        self.post_repo.save_post(user_id, post_id)
        return True

    async def share_post(self, user_id: UUID, post_id: UUID, content: Optional[str]):
        target_post = self.post_repo.get_by_id(post_id)
        if not target_post:
            raise HTTPException(status_code=404, detail="Post not found")

        root_id = target_post.original_post_id if target_post.original_post_id else target_post.id

        share = self.post_repo.create_share(
            user_id=user_id, 
            original_id=root_id,
            content=content
        )

        # 4. GỬI THÔNG BÁO SHARE
        if target_post.user_id != user_id:
            await self.notif_service.create_notification(
                user_id=target_post.user_id,
                sender_id=user_id,
                notification_type="share",
                reference_id=share.id, # Link tới bài share mới
                content_text="đã chia sẻ bài viết của bạn."
            )

        return self._build_response(share, user_id)

    # ==========================================================
    # NHÓM 4: HỆ THỐNG ẨN & KHO LƯU TRỮ (NEW)
    # ==========================================================
    def hide_post(self, user_id: UUID, post_id: UUID):
        # Hào giữ nguyên logic gọi repo, chỉ đổi tên hàm thôi
        return self.post_repo.hide_item(user_id, post_id, "post")

    def unhide_item(self, user_id: UUID, target_id: UUID, target_type: str):
        item = self.db.query(HiddenItem).filter_by(user_id=user_id, target_id=target_id, target_type=target_type).first()
        if item:
            self.db.delete(item)
            self.db.commit()
            return True
        return False

    def get_archive_items(self, user_id: UUID, offset: int = 0, limit: int = 20):
        # 1. Lấy danh sách ẩn (Không đổi)
        hidden_records = self.db.query(HiddenItem)\
            .filter_by(user_id=user_id)\
            .order_by(HiddenItem.created_at.desc())\
            .offset(offset).limit(limit).all()
            
        results = []
        for item in hidden_records:
            res = {"id": item.id, "target_id": item.target_id, "target_type": item.target_type, 
                "created_at": item.created_at, "post_data": None, "comment_data": None}
            
            if item.target_type == 'post':
                from app.models.post import Post
                # DÙNG joinedload ĐỂ GỘP BÀI VIẾT + TÁC GIẢ (Giảm 1 câu SQL)
                post_obj = self.db.query(Post).options(joinedload(Post.author))\
                    .filter(Post.id == item.target_id).first()
                
                if post_obj:
                    # --- PHẦN QUAN TRỌNG ---
                    post_obj.cached_likes = 0
                    post_obj.cached_comments = 0
                    post_obj.cached_is_liked = False
                    post_obj.cached_is_saved = False
                    
                    # THÊM DÒNG NÀY: Ép nó thành mảng rỗng để không bị lỗi Pydantic
                    post_obj.cached_top_reactions = [] 
                    
                    res["post_data"] = self._build_response(post_obj, user_id, is_child=True)
                    
            elif item.target_type == 'comment':
                from app.models.comment import Comment
                # Tương tự cho comment, lấy kèm Author luôn
                comment_obj = self.db.query(Comment).options(joinedload(Comment.author))\
                    .filter(Comment.id == item.target_id).first()
                if comment_obj:
                    res["comment_data"] = self._build_comment_simple(comment_obj, user_id)
                    
            results.append(res)
        return results

    # ==========================================================
    # NHÓM 5: HELPERS
    # ==========================================================
    def _build_response(self, post, current_user_id: UUID, is_child: bool = False) -> PostResponse:
        shared_post_data = None
        
        # 1. Logic cho bài viết được share
        if not is_child and hasattr(post, 'shared_post') and post.shared_post:
            if post.shared_post.deleted_at is None:
                shared_post_data = self._build_response(post.shared_post, current_user_id, is_child=True)
            else:
                shared_post_data = self._build_deleted_shared_post(post.shared_post)

        # 2. Kiểm tra Cache thủ công để chặn đứng N+1
        # Nếu đã có dữ liệu gộp từ Tuple (cached_...), dùng luôn.
        # Nếu KHÔNG có (ví dụ khi gọi get_post đơn lẻ), lúc đó mới query DB.
        
        l_count = post.cached_likes if hasattr(post, 'cached_likes') else (self.post_repo.count_likes(post.id) if not is_child else 0)
        c_count = post.cached_comments if hasattr(post, 'cached_comments') else (self.post_repo.count_comments(post.id) if not is_child else 0)
        is_l = post.cached_is_liked if hasattr(post, 'cached_is_liked') else (self.post_repo.is_liked(current_user_id, post.id) if not is_child else False)
        is_s = post.cached_is_saved if hasattr(post, 'cached_is_saved') else (self.post_repo.is_saved(current_user_id, post.id) if not is_child else False)
        r_type = post.cached_reaction_type if hasattr(post, 'cached_reaction_type') else (self.post_repo.get_reaction_type(current_user_id, post.id) if not is_child else None)
        t_reactions = post.cached_top_reactions if hasattr(post, 'cached_top_reactions') else (self.post_repo.get_top_reactions(post.id) if not is_child else [])

        return PostResponse(
            id=post.id, 
            content=post.content, 
            media_url=post.media_url, 
            visibility=post.visibility,
            created_at=post.created_at, 
            updated_at=post.updated_at,
            author=UserPublicResponse.model_validate(post.author),
            like_count=l_count,
            comment_count=c_count,
            is_liked=is_l,
            is_saved=is_s,
            reaction_type=r_type,
            top_reactions=t_reactions,
            original_post_id=post.original_post_id,
            shared_post=shared_post_data
        )
    
    def _map_tuple_to_response(self, row, current_user_id: UUID) -> PostResponse:
        # Tuple: (Post, reaction_type, like_count, comment_count, is_liked, is_saved)
        post, reaction_type, like_count, comment_count, is_liked, is_saved = row
        
        # 🔥 CỰC KỲ QUAN TRỌNG: Gán cứng vào thuộc tính để _build_response không được phép query DB
        post.cached_likes = like_count if like_count is not None else 0
        post.cached_comments = comment_count if comment_count is not None else 0
        post.cached_is_liked = is_liked if is_liked is not None else False
        post.cached_is_saved = is_saved if is_saved is not None else False
        post.cached_reaction_type = reaction_type
        
        # Nếu chưa có top_reactions thì gán mảng rỗng để tránh N+1
        if not hasattr(post, 'cached_top_reactions'):
            post.cached_top_reactions = []

        return self._build_response(post, current_user_id)

    
    def _build_comment_simple(self, comment, user_id):
        return {"id": comment.id, "content": comment.content, "created_at": comment.created_at, "author": UserPublicResponse.model_validate(comment.author), "media_url": comment.media_url, "is_deleted": comment.deleted_at is not None}
    
        # Thêm hàm này vào bên trong class PostService (ngang hàng với các hàm khác)
    def _build_deleted_shared_post(self, post_obj) -> PostResponse:
        """Hàm này dùng để hiện tên 'Chủ post' cũ khi bài bị xóa"""
        return PostResponse(
            id=post_obj.id,
            content="Nội dung này hiện không hiển thị do bài viết gốc đã bị xóa.",
            media_url=None,
            visibility="public",
            created_at=post_obj.created_at,
            updated_at=None,
            # Lấy thông tin chủ bài viết từ chính object post_obj
            author=UserPublicResponse.model_validate(post_obj.author), 
            like_count=0,
            comment_count=0,
            is_liked=False,
            is_saved=False,
            reaction_type=None,
            top_reactions=[]
        )
    
    def get_user_posts(self, target_user_id: UUID, current_user_id: UUID, offset: int = 0, limit: int = 20):
        # 1. Gọi hàm REPO xịn (hàm trả về Tuple ấy)
        results = self.post_repo.get_user_posts(target_user_id, current_user_id, offset, limit)
        
        if not results: return []

        # 2. Lấy Batch Top Reactions (như làm với Feed)
        post_ids = [row[0].id for row in results]
        top_reactions_map = self.post_repo.get_top_reactions_batch(post_ids)

        responses = []
        for row in results:
            post = row[0]
            # 3. Gán Top Reactions
            post.cached_top_reactions = top_reactions_map.get(post.id, [])
            
            # 4. Dùng hàm Map xịn để gán is_liked, like_count... vào Response
            responses.append(self._map_tuple_to_response(row, current_user_id))

        return responses
    

    def unsave_post(self, user_id: str, post_id: str):
        # 1. Tìm bản ghi post đã lưu trong database
        # Giả sử bạn có bảng 'saved_posts' hoặc tương tự
        saved_post = self.db.query(SavedPost).filter(
            SavedPost.user_id == user_id,
            SavedPost.post_id == post_id
        ).first()

        if saved_post:
            # 2. Xóa bản ghi đó
            self.db.delete(saved_post)
            self.db.commit()
            return True
        
        return False


    def get_saved_posts(self, user_id: UUID, offset: int, limit: int):
        posts = (
            self.db.query(Post) # 🔥 Bỏ models.
            .join(SavedPost, Post.id == SavedPost.post_id) # 🔥 Bỏ models.
            .filter(SavedPost.user_id == user_id) # 🔥 Bỏ models.
            .order_by(SavedPost.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return posts
    
    def get_trash(self, user_id: UUID):
        # Lấy các bài viết mà deleted_at KHÁC NULL (đã xóa mềm)
        return (
            self.db.query(Post)
            .filter(
                Post.user_id == user_id,
                Post.deleted_at != None  # 🔥 Chỉ lấy những bài đã xóa
            )
            .order_by(Post.deleted_at.desc())
            .all()
        )

    def restore_post(self, post_id: UUID, user_id: UUID):
        # Tìm bài viết trong đống đã xóa
        post = self.db.query(Post).filter(
            Post.id == post_id, 
            Post.user_id == user_id
        ).first()
        
        if not post:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
            
        # 🔥 Khôi phục bằng cách đặt lại deleted_at thành None
        post.deleted_at = None
        self.db.commit()
        self.db.refresh(post)
        return post