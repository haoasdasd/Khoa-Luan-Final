from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from app.core.config import settings
from fastapi import HTTPException

# Cấu hình kết nối
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    # Chỉnh sửa ở đây: Nếu không dùng template file thì để None hoặc xóa hẳn dòng này
    TEMPLATE_FOLDER=None 
) if all((settings.MAIL_USERNAME, settings.MAIL_PASSWORD, settings.MAIL_FROM)) else None

fastmail = FastMail(conf) if conf is not None else None

async def send_otp_email(email_to: str, otp_code: str):
    if fastmail is None:
        raise HTTPException(status_code=503, detail="Email service is not configured")

    # Nội dung HTML gửi đi
    html = f"""
    <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2d89ef;">Xác thực tài khoản</h2>
        <p>Chào bạn,</p>
        <p>Mã OTP để khôi phục mật khẩu của bạn là:</p>
        <p style="font-size: 24px; font-weight: bold; color: #ff4757; letter-spacing: 5px;">{otp_code}</p>
        <p>Mã này sẽ hết hạn sau <b>5 phút</b>.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
    </div>
    """
    
    message = MessageSchema(
        subject="Mã OTP Khôi Phục Mật Khẩu",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html
    )
    
    # Gửi mail
    await fastmail.send_message(message)
