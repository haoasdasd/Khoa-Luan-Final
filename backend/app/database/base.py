"""
database/base.py
Base class cho tất cả SQLAlchemy models
Import tất cả models ở đây để Alembic auto-detect khi tạo migration
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class - tất cả model kế thừa từ đây"""
    pass


# Import tất cả models để Alembic nhận biết khi generate migration
from app.models.post import Post, Like, SavedPost, HiddenItem  # noqa: F401, E402
from app.models.comment import Comment  # noqa: F401, E402
from app.models.message import Message, MessageStatus, MessageReaction  # noqa: F401, E402
from app.models.conversation import Conversation, ConversationMember  # noqa: F401, E402
from app.models.notification import Notification  # noqa: F401, E402
from app.models.call import CallSession, CallParticipant  # noqa: F401, E402
from app.models.media import MediaFile  # noqa: F401, E402
from app.models.report import Report  # noqa: F401, E402
from app.models.interaction import UserInteraction  # noqa: F401, E402
from app.models.token import RefreshToken  # noqa: F401, E402
from app.models.typing import TypingStatus  # noqa: F401, E402