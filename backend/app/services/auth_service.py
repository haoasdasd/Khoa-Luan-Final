"""
services/auth_service.py
Business logic cho Authentication
- Register, Login, Refresh token, Logout, Change password
Layer này không biết gì về HTTP, chỉ xử lý business rules
"""
from datetime import datetime, timedelta, timezone
from random import choices
import string
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.repositories.token_repository import TokenRepository
from app.schemas.user_schema import (
    UserRegisterRequest, UserLoginRequest,
    TokenResponse, RefreshTokenRequest, ChangePasswordRequest
)
from app.core.mail import send_otp_email
from app.models.otp import OtpCode

# Đưa Schema ra ngoài để FastAPI nhận diện toàn cục
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str  # Mã 4 số
    new_password: str

class AuthService:
    """Xử lý toàn bộ logic authentication"""

    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.token_repo = TokenRepository(db)

    def register(self, data: UserRegisterRequest):
        if self.user_repo.get_by_email(data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        if self.user_repo.get_by_username(data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

        user = self.user_repo.create(
            username=data.username,
            email=data.email,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            avatar_url=data.avatar_url,
            bio=data.bio
        )
        return user

    def login(self, data: UserLoginRequest) -> TokenResponse:
        user = self.user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )

        token_data = {"sub": str(user.id)}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        self.token_repo.create(
            user_id=user.id,
            token=refresh_token,
            expires_at=expires_at
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token
        )

    def refresh_token(self, data: RefreshTokenRequest) -> TokenResponse:
        payload = decode_token(data.refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        db_token = self.token_repo.get_by_token(data.refresh_token)
        if not db_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked"
            )

        if db_token.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
            self.token_repo.delete_by_token(data.refresh_token)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired"
            )

        user_id = payload.get("sub")
        token_data = {"sub": user_id}
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)

        self.token_repo.delete_by_token(data.refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        self.token_repo.create(
            user_id=UUID(user_id),
            token=new_refresh_token,
            expires_at=expires_at
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token
        )

    def logout(self, refresh_token: str) -> bool:
        return self.token_repo.delete_by_token(refresh_token)

    def change_password(self, user_id: UUID, data: ChangePasswordRequest) -> bool:
        user = self.user_repo.get_by_id(user_id)
        if not user or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        self.user_repo.update(user, password_hash=hash_password(data.new_password))
        self.token_repo.delete_all_for_user(user_id)
        return True

    async def send_otp_forgot_password(self, email: str):
        user = self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="Email không tồn tại")

        # Tạo OTP 4 số
        otp_code = "".join(choices(string.digits, k=4))
        
        # Lưu vào DB
        new_otp = OtpCode(
            email=email, 
            code=otp_code, 
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
        )
        self.db.add(new_otp)
        self.db.commit()

        # Gửi mail thực tế
        await send_otp_email(email, otp_code)

    def reset_password_with_otp(self, data: ResetPasswordRequest):
        # 1. Tìm mã OTP mới nhất, chưa dùng, chưa hết hạn
        otp_record = self.db.query(OtpCode).filter(
            OtpCode.email == data.email,
            OtpCode.code == data.otp,
            OtpCode.is_used == False
        ).order_by(OtpCode.expires_at.desc()).first()

        # 2. Kiểm tra tính hợp lệ
        if not otp_record or otp_record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Mã OTP không đúng hoặc đã hết hạn")

        # 3. Cập nhật mật khẩu cho User
        user = self.user_repo.get_by_email(data.email)
        if not user:
            raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
        
        user.password_hash = hash_password(data.new_password)
        
        # 4. Vô hiệu hóa mã OTP sau khi dùng thành công
        otp_record.is_used = True
        
        # 5. Logout tất cả thiết bị để đảm bảo an toàn
        self.token_repo.delete_all_for_user(user.id)
        
        self.db.commit()
        return True