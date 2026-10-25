"""
utils/pagination.py
Helper cho pagination - dùng chung toàn ứng dụng
"""
from typing import TypeVar, Generic, List
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Wrapper chuẩn cho response có phân trang

    Example response:
    {
        "items": [...],
        "total": 100,
        "offset": 0,
        "limit": 20,
        "has_more": true
    }
    """
    items: List[T]
    total: int
    offset: int
    limit: int
    has_more: bool

    @classmethod
    def create(cls, items: List[T], total: int, offset: int, limit: int):
        return cls(
            items=items,
            total=total,
            offset=offset,
            limit=limit,
            has_more=(offset + limit) < total,
        )