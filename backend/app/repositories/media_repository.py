"""
repositories/media_repository.py
Data access layer cho MediaFile
"""
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.media import MediaFile


class MediaRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, uploader_id: UUID, file_url: str, file_type: str) -> MediaFile:
        """Lưu metadata file upload"""
        media = MediaFile(uploader_id=uploader_id, file_url=file_url, file_type=file_type)
        self.db.add(media)
        self.db.commit()
        self.db.refresh(media)
        return media

    def get_by_user(self, user_id: UUID, offset: int = 0, limit: int = 20) -> List[MediaFile]:
        """Lấy danh sách media của user"""
        return (
            self.db.query(MediaFile)
            .filter(MediaFile.uploader_id == user_id)
            .order_by(MediaFile.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )