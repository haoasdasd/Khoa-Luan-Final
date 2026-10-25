from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.call import CallSession, CallParticipant

class CallRepository:
    def __init__(self, db: Session):
        self.db = db
        
    # Thêm hàm này để chống spam tạo cuộc gọi trùng lặp
    def get_active_call(self, conversation_id: UUID) -> Optional[CallSession]:
        """Lấy cuộc gọi đang diễn ra trong phòng (chưa kết thúc)"""
        return self.db.query(CallSession).filter(
            CallSession.conversation_id == conversation_id,
            CallSession.ended_at.is_(None)
        ).first()

    def create_session(self, conversation_id: UUID, started_by: UUID, call_type: str) -> CallSession:
        """Tạo call session mới (Hoặc trả về session đang chạy nếu có)"""
        # Chặn tạo đúp cuộc gọi
        active_session = self.get_active_call(conversation_id)
        if active_session:
            return active_session
            
        session = CallSession(
            conversation_id=conversation_id,
            started_by=started_by,
            call_type=call_type,
            # Dùng timezone.utc thay cho utcnow()
            created_at=datetime.now(timezone.utc) 
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_session(self, call_id: UUID) -> Optional[CallSession]:
        return self.db.query(CallSession).filter(CallSession.id == call_id).first()

    def end_session(self, call_id: UUID) -> Optional[CallSession]:
        session = self.get_session(call_id)
        if session and session.ended_at is None:
            session.ended_at = datetime.now(timezone.utc)
            self.db.commit()
        return session

    def join_call(self, call_id: UUID, user_id: UUID) -> CallParticipant:
        existing = self.db.query(CallParticipant).filter(
            CallParticipant.call_id == call_id,
            CallParticipant.user_id == user_id
        ).first()
        
        if existing:
            existing.joined_at = datetime.now(timezone.utc)
            existing.left_at = None
            self.db.commit()
            return existing
            
        participant = CallParticipant(
            call_id=call_id,
            user_id=user_id,
            joined_at=datetime.now(timezone.utc)
        )
        self.db.add(participant)
        self.db.commit()
        return participant

    def leave_call(self, call_id: UUID, user_id: UUID) -> Optional[CallParticipant]:
        participant = self.db.query(CallParticipant).filter(
            CallParticipant.call_id == call_id,
            CallParticipant.user_id == user_id
        ).first()
        
        if participant and participant.left_at is None:
            participant.left_at = datetime.now(timezone.utc)
            self.db.commit()
        return participant