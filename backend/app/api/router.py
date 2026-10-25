
"""
api/router.py
Central router: đăng ký tất cả route của ứng dụng
Import một lần duy nhất trong main.py
"""
from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.posts import router as posts_router
from app.api.routes.comments import post_comments_router, comments_router
from app.api.routes.chat import router as chat_router
from app.api.routes.messages import conv_messages_router, messages_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.calls import router as calls_router
from app.api.routes.reports import router as reports_router
from app.api.routes.media import router as media_router

# Tổng hợp tất cả routes vào một APIRouter với prefix /api
api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(posts_router)
api_router.include_router(post_comments_router)   # POST /api/posts/{id}/comments
api_router.include_router(comments_router)         # PUT/DELETE /api/comments/{id}
api_router.include_router(chat_router)
api_router.include_router(conv_messages_router)    # POST/GET /api/conversations/{id}/messages
api_router.include_router(messages_router)         # PUT/DELETE/reactions /api/messages/{id}
api_router.include_router(notifications_router)
api_router.include_router(calls_router)
api_router.include_router(reports_router)
api_router.include_router(media_router)