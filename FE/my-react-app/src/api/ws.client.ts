/**
 * api/ws.client.ts
 * Hoàn thiện định nghĩa để khớp 100% Backend và xử lý hết lỗi TypeScript
 */
import env from "@/config/env.config";
import { tokenService } from "@/services/token.service";
import type { ApiMessage, ApiMessageReaction, ApiNotification, MessageType } from "@/types/api";
import { authResource } from "@/api/resources/auth.resource";
import { ROUTES } from "@/config/routes.config";
// ── Inbound event shapes (Dữ liệu từ Server gửi về) ──────────────────────────

export type WsInboundEvent =
  | { event: "new_notification"; data: ApiNotification }
  | { event: "typing_stop"; data: { conversation_id: string; user_id: string } }
  | { event: "new_message"; data: ApiMessage; conversation_id: string }
  | {
      event: "typing";
      data: { conversation_id: string; user_id: string; is_typing: boolean };
    }
  | {
      event: "message_seen";
      data: {
        conversation_id: string;
        user_id: string;
        message_id?: string;
        seen_at: string;
      };
    }
  | { event: "user_online"; data: { user_id: string; timestamp: string } }
  | { event: "user_offline"; data: { user_id: string; timestamp: string } }
  | {
      event: "message_reaction_updated";
      data: { conversation_id: string; message_id: string; reactions: ApiMessageReaction[] };
    }
  | { event: "message_edited"; data: ApiMessage }
  | {
      event: "message_deleted";
      data: { conversation_id: string; message_id: string; deleted_at: string };
    }
  // ── Call signaling ──────────────────────────────────────────────
  | {
      event: "call_offer";
      from_user_id: string;
      from_user_name?: string;
      conversation_id: string;
      data: RTCSessionDescriptionInit;
      call_id?: string;
    }
  | {
      event: "call_answer";
      from_user_id: string;
      conversation_id: string;
      data: RTCSessionDescriptionInit;
      call_id?: string;
    }
  | { event: "call_rejected"; from_user_id: string; conversation_id: string }
  | {
      event: "call_hangup";
      from_user_id: string;
      conversation_id: string;
      call_id?: string;
    }
  | { event: "ice_candidate"; from_user_id: string; data: RTCIceCandidateInit }
  // ── System ─────────────────────────────────────────────────────
  | { event: "error"; message: string }
  | { event: "pong" };

// ── Outbound event shapes (Dữ liệu gửi lên Server) ───────────────────────────

export type WsOutboundEvent =
  | {
      event: "send_message";
      data: {
        conversation_id: string;
        content: string;
        message_type: MessageType;
        media_url?: string;
        reply_to_id?: string;
      };
    }
  | { event: "typing_start"; data: { conversation_id: string } }
  | { event: "typing_stop"; data: { conversation_id: string } }
  | { event: "mark_seen"; data: { conversation_id: string } }
  | { event: "ping" }
  // ── Call signaling ──────────────────────────────────────────────
  | {
      event: "call_offer";
      data: {
        to_user_id: string;
        conversation_id: string;
        signal_data: RTCSessionDescriptionInit;
        from_user_name?: string;
        call_id?: string;
      };
    }
  | {
      event: "call_answer";
      data: {
        to_user_id: string;
        conversation_id: string;
        signal_data: RTCSessionDescriptionInit;
        call_id?: string;
      };
    }
  | {
      event: "call_rejected";
      data: { to_user_id: string; conversation_id: string };
    }
  | {
      event: "call_hangup";
      data: { to_user_id: string; conversation_id: string; call_id?: string };
    }
  | {
      event: "ice_candidate";
      data: {
        to_user_id: string;
        conversation_id: string;
        signal_data: RTCIceCandidateInit;
      };
    };

type EventListener = (e: WsInboundEvent) => void;

// ── Client ────────────────────────────────────────────────────────────────────

export class ChatSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<EventListener>();
  private closed = false;
  private retryDelay = 3_000;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.connect();
  }

  on(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(payload: WsOutboundEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn(
        "[WS] 🚫 Connection not open. Current state:",
        this.ws?.readyState,
      );
    }
  }

  disconnect(): void {
    this.closed = true;
    this.cleanupTimers();
    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    ) {
      this.ws.close(1000, "Normal closure");
    }
    this.ws = null;
    this.listeners.clear();
  }

  private cleanupTimers() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ event: "ping" });
      }
    }, 25_000);
  }

  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.closed = false;
    const token = tokenService.getAccessToken();
    if (!token) {
      console.warn("[WS] No token found, skipping connection");
      return;
    }

    this.cleanupTimers();

    const wsUrl = `${env.WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      if (this.closed) {
        this.ws?.close();
        return;
      }
      console.log("[WS] ✅ Connected");
      this.startHeartbeat();
    };

    this.ws.onmessage = (e: MessageEvent<string>) => {
      try {
        const data = JSON.parse(e.data) as WsInboundEvent;
        if (data.event === "pong") return;
        this.listeners.forEach((fn) => fn(data));
      } catch {
        /* malformed frame */
      }
    };

    this.ws.onclose = (e) => {
      this.cleanupTimers();

      // Chặn reconnect và gọi refresh token nếu Token hết hạn (Mã 1008)
      if (e.code === 1008) {
        console.warn("[WS] Token hết hạn. Đang tiến hành refresh token...");

        const refreshToken = tokenService.getRefreshToken();
        if (refreshToken) {
          // Gọi API refresh token
          authResource
            .refresh(refreshToken)
            .then((tokens) => {
              // Lưu token mới và kết nối lại Socket ngay lập tức
              tokenService.setTokens(tokens);
              console.log("[WS] Refresh token thành công. Đang kết nối lại...");
              this.connect();
            })
            .catch(() => {
              // Nếu refresh token cũng đã hết hạn/không hợp lệ -> Đăng xuất
              console.error(
                "[WS] Refresh token thất bại. Yêu cầu đăng nhập lại.",
              );
              tokenService.clearTokens();
              if (typeof window !== "undefined") {
                window.location.href = ROUTES.AUTH;
              }
            });
        } else {
          // Không có refresh token -> Đăng xuất
          tokenService.clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = ROUTES.AUTH;
          }
        }
        return;
      }

      // Luồng retry mặc định cho các lỗi mất mạng thông thường
      if (!this.closed) {
        console.warn(`[WS] Closed (${e.code}). Retry in ${this.retryDelay}ms`);
        this.retryTimer = setTimeout(() => this.connect(), this.retryDelay);
      }
    };
  }
}
