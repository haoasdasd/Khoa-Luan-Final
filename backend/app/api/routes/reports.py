"""
api/routes/reports.py
Report endpoints:
  POST /reports
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.api.deps import get_current_user
from app.repositories.report_repository import ReportRepository
from app.schemas.report_schema import ReportCreateRequest
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("", status_code=status.HTTP_201_CREATED, summary="Báo cáo vi phạm")
def create_report(
    data: ReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Báo cáo user hoặc post vi phạm.

    **Request:**
    ```json
    {
        "target_type": "post",
        "target_id": "uuid",
        "reason": "Spam content"
    }
    ```
    """
    repo = ReportRepository(db)
    repo.create(
        reporter_id=current_user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
    )
    return {"message": "Report submitted"}