"""
api/deps.py
FastAPI dependencies cho authentication
get_current_user: inject vào mọi protected route
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.security import decode_token
from app.core.dependencies import get_db
from app.repositories.user_repository import UserRepository
from app.models.user import User

# Sử dụng Bearer token scheme
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency: lấy user hiện tại từ JWT Bearer token
    Inject vào route bằng: current_user: User = Depends(get_current_user)

    Raises 401 nếu:
    - Token không hợp lệ
    - Token hết hạn
    - User không tồn tại hoặc bị xóa
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id_str: str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)

    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    return user

# app/api/deps.py

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Hàm này dùng để đảm bảo User không những phải đăng nhập (có token hợp lệ)
    mà còn phải đang ở trạng thái Active (không bị khóa tài khoản).
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user