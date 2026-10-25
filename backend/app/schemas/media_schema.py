"""
schemas/media_schema.py
Pydantic schemas cho MediaFile
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class MediaUploadRequest(BaseModel):
    """Body để upload media metadata"""
    file_url: str
    file_type: str  # image / video / audio


class MediaResponse(BaseModel):
    """Response trả về media file"""
    id: UUID
    file_url: str
    file_type: str
    created_at: datetime

    model_config = {"from_attributes": True}