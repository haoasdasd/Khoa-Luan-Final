"""
models/report.py
SQLAlchemy model cho Report - báo cáo vi phạm
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base


class Report(Base):
    """Bảng reports - báo cáo vi phạm"""
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    target_type = Column(String(20))   # user / post
    target_id = Column(UUID(as_uuid=True))
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    reporter = relationship("User")