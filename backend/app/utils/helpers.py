"""
utils/helpers.py
Các helper function dùng chung
"""
import re
from datetime import datetime, timezone


def utcnow() -> datetime:
    """Trả về thời gian UTC hiện tại (timezone-aware)"""
    return datetime.now(timezone.utc)


def slugify(text: str) -> str:
    """Chuyển text thành slug (URL-friendly)"""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


def mask_email(email: str) -> str:
    """Ẩn một phần email: john@example.com → j***@example.com"""
    parts = email.split("@")
    if len(parts) != 2:
        return email
    local, domain = parts
    masked = local[0] + "***" if len(local) > 1 else "***"
    return f"{masked}@{domain}"