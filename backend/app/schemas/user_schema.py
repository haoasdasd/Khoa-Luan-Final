"""
schemas/user_schema.py
Pydantic schemas cho User
Dùng để validate request/response data
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr

# ─── Request Schemas ────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    """
    Body để đăng ký tài khoản mới
    Example:
        POST /api/auth/register
        {
            "username": "johndoe",
            "email": "john@example.com",
            "password": "SecurePass123",
            "full_name": "John Doe"
        }
    """
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)
    avatar_url: Optional[str] = None
    bio: Optional[str] = "" 

    model_config = {"from_attributes": True}

class UserLoginRequest(BaseModel):
    """Body để đăng nhập"""
    email: EmailStr
    password: str


class UserUpdateRequest(BaseModel):
    """Body để cập nhật profile"""
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    """Body để đổi mật khẩu"""
    current_password: str
    new_password: str = Field(..., min_length=6)


# ─── Response Schemas ────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """Response trả về thông tin user (không gồm password)"""
    id: UUID
    username: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    followers_count: int = 0
    following_count: int = 0
    model_config = {"from_attributes": True}


class UserPublicResponse(BaseModel):
    """Response công khai (cho người dùng khác xem)"""
    id: UUID
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_online: bool = False
    bio: Optional[str]
    mutual_count: int = 0
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Response sau khi đăng nhập thành công"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Body để lấy access token mới"""
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str  # Mã 4 số
    new_password: str

class UserProfileResponse(BaseModel):
    """Schema đầy đủ cho trang Profile cá nhân và người khác"""
    user: UserResponse
    followers_count: int
    following_count: int
    posts_count: int
    is_following: bool # Trạng thái mình có đang follow người này không

    model_config = {"from_attributes": True}