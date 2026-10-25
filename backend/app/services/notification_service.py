"""
services/notification_service.py
Xử lý logic nghiệp vụ cho thông báo, bao gồm tạo nội dung và bắn Real-time.
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification_schema import NotificationResponse
from app.websocket.manager import manager 

# 1. Định nghĩa map nội dung cho từng loại reaction cụ thể để FE hiển thị đúng Icon
REACTION_MESSAGES = {
    "like": "đã thích bài viết của bạn.",
    "love": "đã yêu thích bài viết của bạn.",
    "haha": "đã bày tỏ cảm xúc Haha về bài viết của bạn.",
    "wow": "đã bày tỏ cảm xúc Ngạc nhiên về bài viết của bạn.",
    "sad": "đã bày tỏ cảm xúc Buồn về bài viết của bạn.",
    "angry": "đã bày tỏ cảm xúc Phẫn nộ về bài viết của bạn."
}

# 2. Template cho các hành động khác
NOTIFICATION_MESSAGES = {
    "comment": "đã bình luận về bài viết của bạn.",
    "share": "đã chia sẻ bài viết của bạn.",
    "follow": "đã bắt đầu theo dõi bạn.",
    "reply": "đã trả lời một bình luận của bạn.",
    "mention": "đã nhắc đến bạn trong một bài viết."
}

# Thêm biến này để tránh lỗi ImportError ở các service khác nếu họ có import
REACTION_NAMES = {k: k for k in REACTION_MESSAGES.keys()}

class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepository(db)

    async def create_notification(
        self, 
        user_id: UUID,        
        sender_id: UUID,      
        notification_type: str, 
        reference_id: UUID,   
        content_text: Optional[str] = None 
    ):
        """Tạo thông báo mới và bắn Real-time qua Socket"""
        if user_id == sender_id:
            return None

        # Logic xử lý nội dung chuẩn xác dựa trên loại tương tác
        if notification_type in ["like", "reaction"]:
            # content_text ở đây sẽ là 'haha', 'angry', 'like'...
            final_content = REACTION_MESSAGES.get(content_text, REACTION_MESSAGES["like"])
        elif notification_type == "comment" and content_text:
            short_text = (content_text[:47] + '...') if len(content_text) > 50 else content_text
            final_content = f"đã bình luận: \"{short_text}\""
        else:
            final_content = NOTIFICATION_MESSAGES.get(notification_type, "đã tương tác với bạn.")

        # Lưu vào Database
        new_notif = self.repo.create(
            user_id=user_id,
            sender_id=sender_id,
            type=notification_type,
            reference_id=reference_id,
            content=final_content
        )

        # Bắn Real-time qua Socket.io
        try:
            notification_data = NotificationResponse.model_validate(new_notif).model_dump()
            await manager.send_to_user(str(user_id), {
                "event": "new_notification",
                "data": notification_data
            })
        except Exception as e:
            print(f"Lỗi Socket khi gửi thông báo: {e}")

        return new_notif

    # --- CÁC HÀM CÒN THIẾU DẪN ĐẾN LỖI 500 ---

    def get_notifications(self, user_id: UUID, offset: int = 0, limit: int = 30) -> List[NotificationResponse]:
        """Lấy danh sách thông báo cho user"""
        notifications = self.repo.get_user_notifications(user_id, offset, limit)
        return [NotificationResponse.model_validate(n) for n in notifications]

    def mark_as_read(self, notification_id: UUID, user_id: UUID) -> bool:
        """Đánh dấu một thông báo cụ thể là đã đọc"""
        success = self.repo.mark_as_read(notification_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
        return success

    def mark_all_as_read(self, user_id: UUID) -> int:
        """Đánh dấu toàn bộ thông báo là đã đọc"""
        return self.repo.mark_all_as_read(user_id)

    def get_unread_count(self, user_id: UUID) -> int:
        """Lấy số lượng thông báo chưa đọc cho Badge trên Header"""
        return self.repo.count_unread(user_id)