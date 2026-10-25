"""
api/routes/calls.py
Call endpoints:
  POST   /calls/start
  POST   /calls/{call_id}/join
  POST   /calls/{call_id}/leave
  POST   /calls/{call_id}/end
  GET    /calls/{call_id}
"""
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.api.deps import get_current_user
from app.services.call_service import CallService
from app.schemas.call_schema import StartCallRequest, CallSessionResponse
from app.models.user import User

router = APIRouter(prefix="/calls", tags=["Calls"])


@router.post(
    "/start",
    response_model=CallSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bắt đầu cuộc gọi",
)
def start_call(
    data: StartCallRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Tạo phiên gọi mới. Người gọi tự động được join vào.

    **Request body:**
    ```json
    {
        "conversation_id": "uuid",
        "call_type": "voice"   // hoặc "video"
    }
    ```
    """
    return CallService(db).start_call(current_user.id, data)


@router.post(
    "/{call_id}/join",
    response_model=CallSessionResponse,
    summary="Tham gia cuộc gọi",
)
def join_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Người nhận nhấn 'Nghe máy' - ghi nhận tham gia phiên gọi."""
    return CallService(db).join_call(call_id, current_user.id)


@router.post(
    "/{call_id}/leave",
    status_code=status.HTTP_200_OK,
    summary="Rời cuộc gọi (vẫn còn người ở lại)",
)
def leave_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User rời phòng nhưng cuộc gọi vẫn tiếp tục (nếu còn người khác)."""
    CallService(db).leave_call(call_id, current_user.id)
    return {"message": "Left call successfully"}


@router.post(
    "/{call_id}/end",
    response_model=CallSessionResponse,
    summary="Kết thúc cuộc gọi (người khởi tạo)",
)
def end_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Chỉ người khởi tạo cuộc gọi mới được kết thúc hoàn toàn."""
    return CallService(db).end_call(call_id, current_user.id)


@router.get(
    "/{call_id}",
    response_model=CallSessionResponse,
    summary="Lấy thông tin cuộc gọi",
)
def get_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy trạng thái và danh sách người tham gia cuộc gọi."""
    return CallService(db).get_call(call_id, current_user.id)