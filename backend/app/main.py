"""
app/main.py
FastAPI application factory
- Khởi tạo app
- Đăng ký routers (REST + WebSocket)
- Cấu hình CORS
- Global exception handlers
"""
import cloudinary
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router
from app.websocket.chat_socket import chat_websocket_endpoint

# Khởi tạo
app = FastAPI(
    title=settings.APP_NAME,
    description="Social Network + Chat + Call Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
origins = [
    "http://localhost:3000",     
    "http://localhost:5173",     
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    # Domain production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

# REST API Routes
app.include_router(api_router)

# WebSocket Routes 
# ws://host/ws/chat/{conversation_id}?token=<jwt_access_token>
app.add_api_websocket_route(
    "/ws",
    chat_websocket_endpoint,
)

# Global Exception Handlers 
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Bắt tất cả lỗi không được xử lý và trả về JSON chuẩn (Loại trừ WebSocket)"""
    print(f"Global Exception: {exc}")
    
    # 1. BẢO VỆ WEBSOCKET: Nếu lỗi từ WebSocket, tuyệt đối không trả về JSONResponse
    if request.scope.get("type") == "websocket":
        # FastAPI/Starlette sẽ tự đóng kết nối WS bị lỗi, ta chỉ return để thoát
        return
        
    # 2. XỬ LÝ HTTP NHƯ BÌNH THƯỜNG
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

# Health Check 
@app.get("/health", tags=["Health"])
def health_check():
    """Kiểm tra server đang chạy"""
    return {"status": "ok", "app": settings.APP_NAME}

# Root
@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "health": "/health",
    }

