from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.post import Post

def cleanup_trash(db: Session):
    # Tính mốc 30 ngày trước
    limit_date = datetime.now() - timedelta(days=30)
    
    # Thực hiện XÓA CỨNG (Hard Delete) khỏi Database
    db.query(Post).filter(Post.deleted_at <= limit_date).delete()
    db.commit()
