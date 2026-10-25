from typing import Dict, List
from fastapi import WebSocket
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ConnectionManager:

    def __init__(self):

        # =====================================================
        # {
        #   "user_id": [WebSocket, WebSocket]
        # }
        # =====================================================

        self.active_connections: Dict[
            str,
            List[WebSocket]
        ] = {}

        # =====================================================
        # Typing debounce
        # {
        #   "conv:user": timestamp
        # }
        # =====================================================

        self.typing_cache: Dict[
            str,
            float
        ] = {}

    # =========================================================
    # CONNECT
    # =========================================================

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str
    ):

        if user_id not in self.active_connections:

            self.active_connections[user_id] = []

            # ---------------------------------------------
            # User online lần đầu
            # ---------------------------------------------

            await self.broadcast_presence(
                user_id,
                True
            )

        self.active_connections[user_id].append(
            websocket
        )

        logger.info(
            f"[WS CONNECT] {user_id} | "
            f"Total Devices: "
            f"{len(self.active_connections[user_id])}"
        )

    # =========================================================
    # DISCONNECT
    # =========================================================

    def disconnect(
        self,
        user_id: str,
        websocket: WebSocket
    ) -> bool:

        """
        Return:
            True  -> user offline hoàn toàn
            False -> user vẫn còn device khác
        """

        try:

            if user_id not in self.active_connections:
                return False

            if websocket in self.active_connections[user_id]:

                self.active_connections[user_id].remove(
                    websocket
                )

            # ---------------------------------------------
            # Hết device
            # ---------------------------------------------

            if not self.active_connections[user_id]:

                self.active_connections.pop(
                    user_id,
                    None
                )

                logger.info(
                    f"[WS OFFLINE] {user_id}"
                )

                return True

            logger.info(
                f"[WS DISCONNECT DEVICE] "
                f"{user_id} | "
                f"Remain: "
                f"{len(self.active_connections[user_id])}"
            )

            return False

        except Exception as e:

            logger.error(
                f"Disconnect Error: {e}"
            )

            return False

    # =========================================================
    # SEND JSON SAFE
    # =========================================================

    async def _safe_send(
        self,
        websocket: WebSocket,
        payload: dict
    ) -> bool:

        """
        Send JSON safely
        """

        try:

            await websocket.send_text(
                json.dumps(
                    payload,
                    default=str
                )
            )

            return True

        except Exception:

            return False

    # =========================================================
    # PRESENCE
    # =========================================================

    async def broadcast_presence(
        self,
        user_id: str,
        is_online: bool
    ):

        """
        Broadcast online/offline
        """

        payload = {
            "event":
                "user_online"
                if is_online
                else "user_offline",

            "data": {
                "user_id": str(user_id),
                "timestamp":
                    datetime.now(
                        timezone.utc
                    ).isoformat()
            }
        }

        active_items = list(
            self.active_connections.items()
        )

        for uid, connections in active_items:

            for ws in list(connections):

                ok = await self._safe_send(
                    ws,
                    payload
                )

                if not ok:
                    self.disconnect(uid, ws)

    # =========================================================
    # SEND TO USER
    # =========================================================

    async def send_to_user(
        self,
        user_id: str,
        message: dict
    ):

        """
        Gửi tới tất cả device
        """

        if user_id not in self.active_connections:
            return

        disconnected = []

        for ws in list(
            self.active_connections[user_id]
        ):

            ok = await self._safe_send(
                ws,
                message
            )

            if not ok:
                disconnected.append(ws)

        # Cleanup dead sockets
        for ws in disconnected:
            is_offline_completely = self.disconnect(user_id, ws)
            if is_offline_completely:
                # Nếu rớt thiết bị cuối cùng, phải báo offline cho cả server
                await self.broadcast_presence(user_id, False)

    # =========================================================
    # BROADCAST MEMBERS
    # =========================================================

    async def broadcast_to_members(
        self,
        member_ids: list,
        message: dict,
        exclude_user_id: str = None
    ):
        # Biến đổi thành set để tìm kiếm nhanh hơn (O(1))
        exclude = str(exclude_user_id) if exclude_user_id else None
        
        for uid in member_ids:
            user_id_str = str(uid)

            # Lọc ngay từ đầu
            if exclude and user_id_str == exclude:
                continue

            # Gửi đến tất cả các thiết bị của user này
            if user_id_str in self.active_connections:
                # Dùng list(connections) để tránh lỗi 'RuntimeError: dictionary changed size during iteration'
                for ws in list(self.active_connections[user_id_str]):
                    await self._safe_send(ws, message)

    # =========================================================
    # BROADCAST CONVERSATION
    # =========================================================

    async def broadcast_to_conversation(self, conv_id: str, member_ids: list, message: dict, exclude_user_id: str = None):
        # Đơn giản hóa: Gọi trực tiếp broadcast_to_members và để nó tự lọc
        await self.broadcast_to_members(
            member_ids,
            message,
            exclude_user_id=exclude_user_id
        )

    # =========================================================
    # TYPING DEBOUNCE
    # =========================================================

    def can_emit_typing(
        self,
        conv_id: str,
        user_id: str,
        cooldown: float = 0.7
    ) -> bool:

        """
        Chống spam typing
        """

        import time

        key = f"{conv_id}:{user_id}"

        now = time.time()

        last_emit = self.typing_cache.get(
            key,
            0
        )

        # Chưa đủ cooldown
        if now - last_emit < cooldown:
            return False

        self.typing_cache[key] = now

        return True

    # =========================================================
    # ONLINE CHECK
    # =========================================================

    def is_user_online(
        self,
        user_id: str
    ) -> bool:

        return (
            user_id in self.active_connections
            and
            len(
                self.active_connections[user_id]
            ) > 0
        )

    # =========================================================
    # ONLINE USERS
    # =========================================================

    def get_online_users(self):

        return list(
            self.active_connections.keys()
        )

    # =========================================================
    # TOTAL SOCKETS
    # =========================================================

    def total_connections(self) -> int:

        total = 0

        for sockets in (
            self.active_connections.values()
        ):
            total += len(sockets)

        return total


# =============================================================
# GLOBAL INSTANCE
# =============================================================

manager = ConnectionManager()