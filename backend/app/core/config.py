"""
core/config.py
Quản lý cấu hình ứng dụng từ .env
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):

    # ===== Database =====
    DATABASE_URL: str

    # ===== JWT =====
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ===== App =====
    APP_NAME: str = "Social Network API"
    DEBUG: bool = False
    
    # ===== Mail Config =====
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "Social Network"

    # ===== Cloudinary Config =====
    CLOUDINARY_CLOUD_NAME: str = "SocialNetwork"
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
    )
    

@lru_cache
def get_settings():
    return Settings()

settings = get_settings()