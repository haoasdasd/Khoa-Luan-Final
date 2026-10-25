# api/routes/media.py
import logging
import cloudinary.uploader
from fastapi import APIRouter, Depends, status, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db
from app.api.deps import get_current_user
from app.repositories.media_repository import MediaRepository
from app.schemas.media_schema import MediaUploadRequest, MediaResponse
from app.models.user import User

# Khởi tạo logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["Media"])

@router.post("/upload", summary="Upload file lên Cloudinary")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # 1. Kiểm tra định dạng file
    if not file.content_type.startswith(("image/", "video/")):
        raise HTTPException(status_code=400, detail="Định dạng file không hợp lệ")
        
    try:
        # 2. Upload dạng Stream (trực tiếp từ file.file) để không ngốn RAM
        result = cloudinary.uploader.upload(
            file.file, 
            folder="chat_app",
            resource_type="auto"
        )
        return {
            "url": result.get("secure_url"),
            "file_type": "image" if file.content_type.startswith("image/") else "video"
        }
    except Exception as e:
        # 3. Ghi log chuẩn xác thay vì print()
        logger.error(f"Lỗi Cloudinary upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Lỗi xử lý file từ server")
    finally:
        await file.close()

@router.post("", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
def upload_media_metadata(
    data: MediaUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = MediaRepository(db)
    media = repo.create(
        uploader_id=current_user.id,
        file_url=data.file_url,
        file_type=data.file_type,
    )
    return MediaResponse.model_validate(media)

@router.get("", response_model=List[MediaResponse])
def get_my_media(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = MediaRepository(db)
    items = repo.get_by_user(current_user.id, offset, limit)
    return [MediaResponse.model_validate(m) for m in items]