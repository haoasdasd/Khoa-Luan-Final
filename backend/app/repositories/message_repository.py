"""
repositories/message_repository.py
Data access layer cho Message, MessageStatus, MessageReaction
"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import func, and_
from sqlalchemy.orm import Session, joinedload, selectinload
from app.models.message import Message, MessageStatus, MessageReaction
from app.models.conversation import Conversation, ConversationMember


class MessageRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, message_id: UUID) -> Optional[Message]:
        return (
            self.db.query(Message)
            .options(
                joinedload(Message.sender),
                selectinload(Message.statuses),
                selectinload(Message.reactions),
            )
            .filter(Message.id == message_id)
            .first()
        )

    def create(self, conversation_id: UUID, sender_id: UUID, **kwargs) -> Message:
        now = datetime.now(timezone.utc)
        msg = Message(conversation_id=conversation_id, sender_id=sender_id, **kwargs)
        self.db.add(msg)
        self.db.flush() 

        self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).update({
            "last_message_id": msg.id,
            "updated_at": now
        })

        self.db.commit()
        self.db.refresh(msg)
        return msg

    def update(self, message: Message, content: str) -> Message:
        message.content = content
        message.edited_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(message)
        return message

    def soft_delete(self, message: Message) -> Message:
        message.deleted_at = datetime.now(timezone.utc)
        self.db.commit()
        return message

    def get_conversation_messages(
        self, conversation_id: UUID, offset: int = 0, limit: int = 50, show_deleted: bool = True
    ) -> List[Message]:
        query = self.db.query(Message).filter(Message.conversation_id == conversation_id)

        if not show_deleted:
            query = query.filter(Message.deleted_at.is_(None))

        return (
            query.options(
                joinedload(Message.sender),
                selectinload(Message.statuses),
                selectinload(Message.reactions),
                joinedload(Message.replied_message).joinedload(Message.sender)
            )
            .order_by(Message.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def upsert_status(self, message_id: UUID, user_id: UUID, status: str) -> MessageStatus:
        existing = self.db.query(MessageStatus).filter(
            MessageStatus.message_id == message_id,
            MessageStatus.user_id == user_id
        ).first()

        now = datetime.now(timezone.utc)
        if existing:
            existing.status = status
            if status == "seen":
                existing.seen_at = now
            self.db.commit()
            return existing
        else:
            ms = MessageStatus(
                message_id=message_id,
                user_id=user_id,
                status=status,
                seen_at=now if status == "seen" else None
            )
            self.db.add(ms)
            self.db.commit()
            return ms

    def remove_reaction(self, message_id: UUID, user_id: UUID) -> bool:
        deleted = self.db.query(MessageReaction).filter(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id
        ).delete()
        self.db.commit()
        return deleted > 0
    
    def mark_all_as_seen(self, conversation_id: UUID, user_id: UUID):
        now = datetime.now(timezone.utc)
        unread_messages = self.db.query(Message.id).filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            ~Message.statuses.any(MessageStatus.user_id == user_id)
        ).all()

        if unread_messages:
            statuses = [
                MessageStatus(message_id=m.id, user_id=user_id, status="seen", seen_at=now)
                for m in unread_messages
            ]
            self.db.add_all(statuses)
            self.db.commit()

    def count_unread(self, conversation_id: UUID, user_id: UUID) -> int:
        return (
            self.db.query(Message)
            .outerjoin(
                MessageStatus, 
                and_(
                    MessageStatus.message_id == Message.id,
                    MessageStatus.user_id == user_id,
                    MessageStatus.status == "seen"
                )
            )
            .filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                MessageStatus.message_id.is_(None), 
                Message.deleted_at.is_(None)
            )
            .count()
        )
    
    def get_private_conversation(self, user_id: UUID, friend_id: UUID):
        return self.db.query(Conversation).join(
            ConversationMember, Conversation.id == ConversationMember.conversation_id
        ).filter(
            Conversation.type == "private",
            ConversationMember.user_id.in_([user_id, friend_id])
        ).group_by(Conversation.id).having(
            func.count(ConversationMember.user_id) == 2
        ).first()
    
    def soft_delete_messages_by_conversation(self, conv_id: UUID):
        self.db.query(Message).filter(
            Message.conversation_id == conv_id,
            Message.deleted_at.is_(None)
        ).update(
            {Message.deleted_at: datetime.now(timezone.utc)},
            synchronize_session=False
        )
        self.db.commit()