"""
repositories/token_repository.py
Data access layer cho RefreshToken
"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.token import RefreshToken


class TokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: UUID, token: str, expires_at: datetime) -> RefreshToken:
        """Lưu refresh token mới"""
        rt = RefreshToken(user_id=user_id, token=token, expires_at=expires_at)
        self.db.add(rt)
        self.db.commit()
        return rt

    def get_by_token(self, token: str) -> Optional[RefreshToken]:
        """Tìm refresh token trong DB"""
        return self.db.query(RefreshToken).filter(RefreshToken.token == token).first()

    def delete_by_token(self, token: str) -> bool:
        """Xóa refresh token (logout)"""
        deleted = self.db.query(RefreshToken).filter(RefreshToken.token == token).delete()
        self.db.commit()
        return deleted > 0

    def delete_all_for_user(self, user_id: UUID) -> int:
        """Xóa tất cả refresh token của user (logout everywhere)"""
        count = self.db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()
        self.db.commit()
        return count