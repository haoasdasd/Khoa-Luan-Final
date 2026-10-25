"""
api/routes/notifications.py
Notification endpoints:
  GET  /notifications
  POST /notifications/{id}/read
  POST /notifications/read-all
"""
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db
from app.api.deps import get_current_user
from app.services.notification_service import NotificationService
from app.schemas.notification_schema import NotificationResponse, UnreadCountResponse
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse], summary="Lấy thông báo")
def get_notifications(
    offset: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationService(db).get_notifications(current_user.id, offset, limit)


@router.post("/{notification_id}/read", summary="Đánh dấu đã đọc")
def mark_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    NotificationService(db).mark_as_read(notification_id, current_user.id)
    return {"message": "Marked as read"}


@router.post("/read-all", summary="Đánh dấu tất cả đã đọc")
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = NotificationService(db).mark_all_as_read(current_user.id)
    return {"message": f"Marked {count} notifications as read"}

@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = NotificationService(db).get_unread_count(current_user.id)
    return {"unread_count": count}