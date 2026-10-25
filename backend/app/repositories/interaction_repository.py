"""
repositories/interaction_repository.py
Data access layer cho UserInteraction - tracking hành vi
"""
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.interaction import UserInteraction
from app.models.post import HiddenItem

class InteractionRepository:
    def __init__(self, db: Session):
        self.db = db

    def log(self, user_id: UUID, post_id: UUID, action_type: str) -> UserInteraction:
        """Ghi lại hành vi tương tác (like, comment, share, view)"""
        interaction = UserInteraction(
            user_id=user_id,
            post_id=post_id,
            action_type=action_type
        )
        self.db.add(interaction)
        self.db.commit()
        return interaction
    
    def hide_item(self, user_id: UUID, target_id: UUID, target_type: str):
        """Lưu thông tin ẩn item vào bảng hidden_items"""
        # Kiểm tra xem đã ẩn chưa để tránh trùng lặp
        exists = self.db.query(HiddenItem).filter(
            HiddenItem.user_id == user_id,
            HiddenItem.target_id == target_id,
            HiddenItem.target_type == target_type
        ).first()

        if not exists:
            new_hidden = HiddenItem(
                user_id=user_id,
                target_id=target_id,
                target_type=target_type
            )
            self.db.add(new_hidden)
            self.db.commit()
            return True
        return False