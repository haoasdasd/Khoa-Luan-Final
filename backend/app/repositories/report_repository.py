"""
repositories/report_repository.py
Data access layer cho Report
"""
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.report import Report


class ReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, reporter_id: UUID, target_type: str, target_id: UUID, reason: str) -> Report:
        """Tạo báo cáo vi phạm"""
        report = Report(
            reporter_id=reporter_id,
            target_type=target_type,
            target_id=target_id,
            reason=reason
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report