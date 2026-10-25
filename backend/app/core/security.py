"""
core/security.py
Xử lý bảo mật: hash password (bcrypt) và JWT token
- Tạo access token (ngắn hạn)
- Tạo refresh token (dài hạn)
- Verify token
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

# Khởi tạo bcrypt context để hash/verify password
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Mã hóa mật khẩu"""
    # Ép kiểu password về string và giới hạn để an toàn với bcrypt
    if isinstance(password, str):
        password = password.encode('utf-8')
    
    # Passlib sẽ tự xử lý hash, nhưng bcrypt giới hạn 72 bytes
    # Ta hash bản text để passlib xử lý
    return pwd_context.hash(password.decode('utf-8'))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra mật khẩu"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Tạo JWT access token (ngắn hạn, mặc định 30 phút)
    data: payload cần encode (thường là {"sub": user_id})
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """
    Tạo JWT refresh token (dài hạn, mặc định 7 ngày)
    Dùng để lấy access token mới khi hết hạn
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decode và verify JWT token
    Trả về payload nếu hợp lệ, None nếu không hợp lệ
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None