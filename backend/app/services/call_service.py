"""
services/call_service.py
Business logic cho Call Session
"""
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.repositories.call_repository import CallRepository
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.call_schema import StartCallRequest, CallSessionResponse, CallParticipantResponse
from app.schemas.user_schema import UserPublicResponse


class CallService:
    def __init__(self, db: Session):
        self.call_repo = CallRepository(db)
        self.conv_repo = ConversationRepository(db)

    def start_call(self, user_id: UUID, data: StartCallRequest) -> CallSessionResponse:
        """Bắt đầu cuộc gọi - user phải là member của conversation"""
        if not self.conv_repo.is_member(data.conversation_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a conversation member"
            )

        session = self.call_repo.create_session(
            conversation_id=data.conversation_id,
            started_by=user_id,
            call_type=data.call_type
        )
        # Người tạo tự động join
        self.call_repo.join_call(session.id, user_id)
        return self._build_response(self.call_repo.get_session(session.id))

    def get_call(self, call_id: UUID, user_id: UUID) -> CallSessionResponse:
        """Lấy thông tin cuộc gọi"""
        session = self._get_or_404(call_id)
        return self._build_response(session)

    def join_call(self, call_id: UUID, user_id: UUID) -> CallSessionResponse:
        """User tham gia cuộc gọi"""
        session = self._get_or_404(call_id)
        if session.ended_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Call has ended"
            )
        self.call_repo.join_call(call_id, user_id)
        return self._build_response(self.call_repo.get_session(call_id))

    def leave_call(self, call_id: UUID, user_id: UUID) -> bool:
        """User rời cuộc gọi"""
        self._get_or_404(call_id)
        self.call_repo.leave_call(call_id, user_id)
        return True

    def end_call(self, call_id: UUID, user_id: UUID) -> CallSessionResponse:
        """Kết thúc cuộc gọi - chỉ người khởi tạo hoặc admin"""
        session = self._get_or_404(call_id)
        if session.started_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only call initiator can end call"
            )
        session = self.call_repo.end_session(call_id)
        return self._build_response(session)

    def _get_or_404(self, call_id: UUID):
        session = self.call_repo.get_session(call_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        return session

    def _build_response(self, session) -> CallSessionResponse:
        participants = [
            CallParticipantResponse(
                user=UserPublicResponse.model_validate(p.user),
                joined_at=p.joined_at,
                left_at=p.left_at,
            )
            for p in session.participants
        ]
        return CallSessionResponse(
            id=session.id,
            conversation_id=session.conversation_id,
            call_type=session.call_type,
            started_at=session.started_at,
            ended_at=session.ended_at,
            participants=participants,
        )