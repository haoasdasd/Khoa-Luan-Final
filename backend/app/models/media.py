"""
models/media.py
SQLAlchemy model cho MediaFile
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base


class MediaFile(Base):
    """Bảng media_files - file upload (ảnh/video)"""
    __tablename__ = "media_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    file_url = Column(Text)
    file_type = Column(String(20))  # image / video / audio
    created_at = Column(DateTime, default=datetime.utcnow)

    uploader = relationship("User", back_populates="media_files")