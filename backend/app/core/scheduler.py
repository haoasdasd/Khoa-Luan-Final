import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import timezone as pytz_timezone

# 🔥 ĐÃ SỬA: Import đúng đường dẫn sâu vào file session.py
from app.database.session import SessionLocal
from app.models.post import Post
from app.models.comment import Comment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
vn_tz = pytz_timezone('Asia/Ho_Chi_Minh')

def cleanup_expired_trash():
    db: Session = SessionLocal()
    try:
        now_vn = datetime.now(vn_tz)
        logger.info(f"--- BẮT ĐẦU QUÉT RÁC: {now_vn.strftime('%H:%M:%S')} ---")
        
        # Mốc 30 ngày
        limit_date = now_vn - timedelta(days=30)

        # Xóa Post rác
        deleted_posts = db.query(Post).filter(
            Post.deleted_at.isnot(None),
            Post.deleted_at <= limit_date
        ).delete(synchronize_session=False)

        # Xóa Comment rác
        deleted_comments = db.query(Comment).filter(
            Comment.deleted_at.isnot(None),
            Comment.deleted_at <= limit_date
        ).delete(synchronize_session=False)

        db.commit()
        if deleted_posts > 0 or deleted_comments > 0:
            logger.info(f"Đã dọn dẹp vĩnh viễn {deleted_posts} bài viết và {deleted_comments} bình luận.")
    except Exception as e:
        db.rollback()
        logger.error(f"Lỗi scheduler: {str(e)}")
    finally:
        db.close()

# --- KHỞI TẠO BỘ LỊCH (SCHEDULER) ---

scheduler = BackgroundScheduler(timezone=vn_tz)

# Lên lịch chạy mỗi ngày một lần vào lúc 00:00 (nửa đêm)
scheduler.add_job(
    cleanup_expired_trash, 
    'cron', 
    hour=0, 
    minute=0,
    id='daily_cleanup_job',
    replace_existing=True
)

def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler quét rác đã khởi động (Chạy vào 00:00 mỗi đêm).")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler quét rác đã dừng.")