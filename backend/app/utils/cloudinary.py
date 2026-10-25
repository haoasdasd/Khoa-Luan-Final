import cloudinary
import cloudinary.uploader
from app.core.config import settings

# Khi server chạy, dòng này sẽ cấu hình quyền truy cập
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

def upload_to_cloudinary(file_object):
    """Hàm đẩy file thực tế lên Cloudinary từ Backend"""
    try:
        result = cloudinary.uploader.upload(
            file_object,
            folder="posts_assets",
            resource_type="auto"
        )
        return result.get("secure_url")
    except Exception as e:
        print(f"Lỗi Cloudinary: {e}")
        return None