"""
schemas/report_schema.py
Pydantic schemas cho Report
"""
from pydantic import BaseModel, Field
from uuid import UUID


class ReportCreateRequest(BaseModel):
    """
    Body để báo cáo vi phạm
    Example:
        POST /api/reports
        {"target_type": "post", "target_id": "uuid", "reason": "Spam content"}
    """
    target_type: str = Field(..., pattern="^(user|post)$")
    target_id: UUID
    reason: str = Field(..., min_length=5, max_length=500)