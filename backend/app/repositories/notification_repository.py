"""
repositories/notification_repository.py
Data access layer cho Notification
"""
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from app.models.notification import Notification

class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: UUID, sender_id: UUID, type: str, reference_id: UUID, content: str) -> Notification:
        notif = Notification(
            user_id=user_id, 
            sender_id=sender_id, 
            type=type, 
            reference_id=reference_id, 
            content=content
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def get_user_notifications(self, user_id: UUID, offset: int = 0, limit: int = 30) -> List[Notification]:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .options(joinedload(Notification.sender)) # Load avatar/tên người gửi trong 1 query
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_unread(self, user_id: UUID) -> int:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id, 
            Notification.is_read == False
        ).count()

    def mark_as_read(self, notification_id: UUID, user_id: UUID) -> bool:
        result = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).update({"is_read": True})
        self.db.commit()
        return result > 0

    def mark_all_read(self, user_id: UUID) -> int:
        count = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True})
        self.db.commit()
        return count
    
    def mark_all_as_read(self, user_id: UUID) -> int:
        """Đánh dấu tất cả thông báo của user là đã đọc"""
        from app.models.notification import Notification # Đảm bảo đúng đường dẫn model
        
        result = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({Notification.is_read: True}, synchronize_session=False)
        
        self.db.commit()
        return result