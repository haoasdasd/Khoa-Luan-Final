"""
core/dependencies.py
Các dependency dùng chung trong toàn ứng dụng
(Tránh circular import với api/deps.py)
"""
from app.database.session import SessionLocal
from sqlalchemy.orm import Session
from typing import Generator


def get_db() -> Generator[Session, None, None]:
    """
    Dependency: cung cấp database session cho mỗi request
    Tự động đóng session sau khi request kết thúc
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()