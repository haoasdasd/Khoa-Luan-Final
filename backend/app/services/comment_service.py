from __future__ import annotations
from uuid import UUID
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException, status
from datetime import datetime


if TYPE_CHECKING:
    from app.schemas.comment_schema import CommentResponse

class CommentService:
    def __init__(self, db: Session):
        from app.repositories.comment_repository import CommentRepository
        from app.repositories.post_repository import PostRepository
        from app.repositories.notification_repository import NotificationRepository
        from app.repositories.interaction_repository import InteractionRepository
        from app.services.notification_service import NotificationService
        self.db = db
        self.comment_repo = CommentRepository(db)
        self.post_repo = PostRepository(db)
        self.notif_service = NotificationService(db)
        self.interaction_repo = InteractionRepository(db)

    def _get_deleted_author_placeholder(self):
        return {
            "id": "00000000-0000-0000-0000-000000000000", 
            "username": "deleted_user", 
            "full_name": "Người dùng", 
            "avatar_url": None,
            "bio": None
        }

    def _build_response(self, comment, current_user_id: UUID = None, show_deleted: bool = False) -> "CommentResponse":
        from app.schemas.comment_schema import CommentResponse
        from app.schemas.user_schema import UserPublicResponse
        
        is_deleted = comment.deleted_at is not None
        
        # --- PHẦN FIX: Lấy trực tiếp từ __dict__ để tránh query lẻ ---
        l_count = comment.__dict__.get('cached_like_count', 0)
        r_count = comment.__dict__.get('cached_reply_count', 0)
        is_l = comment.__dict__.get('cached_is_liked', False)
        user_reaction = comment.__dict__.get('cached_reaction_type', None)
        print(f"DEBUG: Comment {comment.id} has {r_count} replies")
        # Top reactions: Chỉ lấy nếu thực sự cần, ở đây mình tạm để trống 
        # để triệt tiêu hoàn toàn lỗi N+1 trong log của bạn.
        top_types = [] 

        # Xử lý nội dung hiển thị
        if is_deleted and not show_deleted:
            display_content = "Bình luận này đã bị xóa."
            display_media = None
            author_data = self._get_deleted_author_placeholder()
        else:
            display_content = comment.content
            display_media = comment.media_url
            try:
                author_data = UserPublicResponse.model_validate(comment.author)
            except:
                author_data = self._get_deleted_author_placeholder()

        return CommentResponse(
            id=comment.id,
            post_id=comment.post_id,
            parent_id=comment.parent_id,
            content=display_content,
            media_url=display_media,
            author=author_data,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            is_deleted=is_deleted,
            
            # Gán giá trị đã lấy từ __dict__
            reply_count=comment.__dict__.get('cached_reply_count', 0),
            like_count=l_count,
            is_liked=is_l,
            reaction_type=user_reaction,
            top_reactions=top_types,
            replies=[]
        )

    def get_post_comments(self, post_id: UUID, current_user_id: UUID = None, offset: int = 0, limit: int = 20):
        all_comments = self.comment_repo.get_all_by_post(post_id, current_user_id)
        
        results = []
        for c in all_comments:
            # Gọi _build_response để lấy object CommentResponse
            resp_obj = self._build_response(c, current_user_id)
            
            # 🔥 DÒNG QUAN TRỌNG: Ép sang dict và lấy cả các trường mới gán
            data = resp_obj.model_dump(mode='json')
            
            # Backup chắc chắn: Nếu Pydantic vẫn làm mất, ta gán đè vào dict luôn
            data['reply_count'] = c.__dict__.get('cached_reply_count', 0)
            
            results.append(data)
            
        return results

    def get_comment_replies(self, parent_id: UUID, current_user_id: UUID, offset=0, limit=10):
        # Truyền thêm current_user_id vào repo
        replies = self.comment_repo.get_replies(parent_id, current_user_id, offset, limit)
        return [self._build_response(r, current_user_id).model_dump() for r in replies]


    def _get_formatted_comment_dict(self, comment_id: UUID, user_id: UUID, show_deleted: bool = False) -> dict:
        """
        Hàm dùng chung: Lấy comment từ DB (kèm stats) và format ra dict chuẩn cho Frontend.
        """
        # Bắt buộc phải có hàm get_comment_with_stats trong repository (đã hướng dẫn ở trên)
        comment_obj = self.comment_repo.get_comment_with_stats(comment_id, user_id)
        if not comment_obj:
            raise HTTPException(404, "Không tìm thấy bình luận")

        resp_obj = self._build_response(comment_obj, user_id, show_deleted=show_deleted)
        data = resp_obj.model_dump(mode='json')
        
        # Cứu lại các trường hay bị Pydantic drop mất
        data['reply_count'] = comment_obj.__dict__.get('cached_reply_count', 0)
        data['like_count'] = comment_obj.__dict__.get('cached_like_count', 0)
        data['is_liked'] = comment_obj.__dict__.get('cached_is_liked', False)
        data['reaction_type'] = comment_obj.__dict__.get('cached_reaction_type', None)
        
        return data

    async def create_comment(self, post_id: UUID, user_id: UUID, data: any) -> dict:
        post = self.post_repo.get_by_id(post_id)
        if not post: raise HTTPException(404, "Bài viết không tồn tại")
        
        parent_id = getattr(data, 'parent_id', None)
        parent = None
        if parent_id:
            parent = self.comment_repo.get_by_id(parent_id)
            if not parent: raise HTTPException(404, "Bình luận cha không tồn tại")

        comment = self.comment_repo.create(
            post_id=post_id, user_id=user_id, content=data.content,
            parent_id=parent_id, media_url=data.media_url
        )

        try:
            if parent_id and parent.user_id != user_id:
                await self.notif_service.create_notification(
                    user_id=parent.user_id, sender_id=user_id, 
                    notification_type="reply", reference_id=comment.id, content_text=data.content
                )
            elif not parent_id and post.user_id != user_id:
                await self.notif_service.create_notification(
                    user_id=post.user_id, sender_id=user_id, 
                    notification_type="comment", reference_id=post_id, content_text=data.content
                )
        except Exception as e:
            print(f"Lỗi Socket: {e}")

        # TRẢ VỀ: Gọi hàm helper dùng chung
        return self._get_formatted_comment_dict(comment.id, user_id)

    def update_comment(self, comment_id: UUID, user_id: UUID, data: any) -> dict:
        comment = self._get_or_404(comment_id)
        if comment.user_id != user_id: raise HTTPException(403, "Không có quyền")
        
        comment.content = data.content
        if hasattr(data, 'media_url') and data.media_url is not None:
            comment.media_url = data.media_url

        self.db.commit()
        # TRẢ VỀ: Gọi hàm helper dùng chung
        return self._get_formatted_comment_dict(comment.id, user_id)

    async def toggle_reaction(self, comment_id: UUID, user_id: UUID, reaction_type: str) -> dict:
        self.comment_repo.react(comment_id, user_id, reaction_type)
        
        # Bắt buộc phải query lại comment gốc để xem nó của ai gửi thông báo
        comment_obj = self._get_or_404(comment_id)
        
        if comment_obj.user_id != user_id:
            await self.notif_service.create_notification(
                user_id=comment_obj.user_id,
                sender_id=user_id,
                notification_type="reaction",
                reference_id=comment_obj.post_id,
                content_text=reaction_type
            )
            
        # TRẢ VỀ: Gọi hàm helper dùng chung (tự động load lại stats mới nhất)
        return self._get_formatted_comment_dict(comment_id, user_id)

    def delete_comment(self, comment_id: UUID, user_id: UUID):
        comment = self._get_or_404(comment_id)
        if comment.user_id != user_id: raise HTTPException(403, "Không có quyền")
        self.comment_repo.soft_delete(comment)
        
        # TRẢ VỀ: Trả về comment nhưng đã đánh dấu is_deleted = True
        return self._get_formatted_comment_dict(comment.id, user_id)

    def restore_comment(self, comment_id: UUID, user_id: UUID):
        comment = self.comment_repo.restore(comment_id)
        if comment.user_id != user_id: raise HTTPException(403, "Không có quyền")
        
        # TRẢ VỀ: Trả về comment đã khôi phục (show_deleted=True để nó không bị mask text xóa)
        return self._get_formatted_comment_dict(comment.id, user_id, show_deleted=True)

    def get_my_trash(self, user_id: UUID):
        # 1. Gọi Repo đã tối ưu (đã có like_count, reply_count sẵn trong cached_)
        items = self.comment_repo.get_archived_by_user(user_id)
        
        responses = []
        for c in items:
            # 2. Thay vì dùng _build_response (thằng này hay tự ý query thêm)
            # Ta tự tạo object response từ dữ liệu đã có sẵn
            responses.append({
                "id": str(c.id),
                "content": c.content, # Hiện nội dung gốc để user biết mà khôi phục
                "media_url": c.media_url,
                "created_at": c.created_at.isoformat(),
                "like_count": getattr(c, 'cached_like_count', 0),
                "reply_count": getattr(c, 'cached_reply_count', 0),
                "is_liked": getattr(c, 'cached_is_liked', False),
                "author": {
                    "full_name": c.author.full_name if c.author else "Người dùng",
                    "avatar_url": c.author.avatar_url if c.author else None
                }
            })
        return responses

    def permanent_delete(self, comment_id: UUID, user_id: UUID):
        comment = self._get_or_404(comment_id)
        if comment.user_id != user_id: raise HTTPException(403, "Không có quyền")
        return self.comment_repo.hard_delete(comment_id)
    
    def _get_or_404(self, id: UUID):
        res = self.comment_repo.get_by_id(id)
        if not res: raise HTTPException(404, "Không tìm thấy")
        return res
    
    def hide_comment(self, user_id: UUID, comment_id: UUID):
        # Lưu vào bảng hidden_items để ẩn vĩnh viễn với user này
        return self.interaction_repo.hide_item(user_id, comment_id, "comment")