"""
api/routes/auth.py
Authentication endpoints:
  POST /auth/register
  POST /auth/login
  POST /auth/refresh
  POST /auth/logout
  POST /auth/change-password
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.api.deps import get_current_user
from app.services.auth_service import AuthService
from app.schemas.user_schema import (
    UserRegisterRequest, UserLoginRequest,
    TokenResponse, RefreshTokenRequest,
    ChangePasswordRequest, UserResponse, ForgotPasswordRequest, ResetPasswordRequest 
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản mới",
)
def register(data: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Đăng ký tài khoản mới.

    **Request body:**
    ```json
    {
        "username": "johndoe",
        "email": "john@example.com",
        "password": "SecurePass123",
        "full_name": "John Doe"
    }
    ```
    """
    service = AuthService(db)
    user = service.register(data)
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Đăng nhập",
)
def login(data: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Đăng nhập và nhận JWT tokens.

    **Response:**
    ```json
    {
        "access_token": "eyJ...",
        "refresh_token": "eyJ...",
        "token_type": "bearer"
    }
    ```
    """
    service = AuthService(db)
    return service.login(data)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Làm mới access token",
)
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Dùng refresh token để lấy access token mới (token rotation)."""
    service = AuthService(db)
    return service.refresh_token(data)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Đăng xuất",
)
def logout(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Logout: thu hồi refresh token."""
    service = AuthService(db)
    service.logout(data.refresh_token)


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Đổi mật khẩu",
)
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Đổi mật khẩu - yêu cầu xác thực."""
    service = AuthService(db)
    service.change_password(current_user.id, data)
    return {"message": "Password changed successfully"}

# --- QUÊN MẬT KHẨU ---
@router.post(
    "/forgot-password", 
    status_code=status.HTTP_200_OK, 
    summary="Gửi mã OTP quên mật khẩu"
)
async def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    B1: Kiểm tra email -> Tạo OTP 4 số -> Lưu DB -> Gửi Mail thực tế
    """
    service = AuthService(db)
    # Bắt buộc phải có await vì hàm này gửi mail (async)
    await service.send_otp_forgot_password(data.email)
    return {"message": "Mã OTP đã được gửi về email của bạn"}


# --- ĐẶT LẠI MẬT KHẨU ---
@router.post(
    "/reset-password", 
    status_code=status.HTTP_200_OK, 
    summary="Xác thực OTP và đổi mật khẩu mới"
)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    B2: Kiểm tra OTP -> Nếu đúng thì cập nhật mật khẩu mới trong DB
    """
    service = AuthService(db)
    # Hàm này thường là đồng bộ (sync) vì chỉ làm việc với DB
    service.reset_password_with_otp(data)
    return {"message": "Mật khẩu đã được cập nhật thành công"}