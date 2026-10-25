/**
 * api/resources/chat.resource.ts
 * Quản lý toàn bộ tài nguyên Chat: Hội thoại, Tin nhắn, Hành động thành viên
 */
import { authorizedFetch } from "@/api/interceptors/auth.interceptor";
import type {
  ApiConversation,
  ApiMessage,
  ApiSendMessagePayload,
  ApiStringeeToken,
} from "@/types/api";
import type { PaginationParams } from "@/types/common";

export const chatResource = {
  /**
   * Lấy danh sách hội thoại
   * @param accepted true: Hộp thư chính, false: Tin nhắn chờ
   */
  conversations(accepted = true): Promise<ApiConversation[]> {
    return authorizedFetch(`/conversations?accepted=${accepted}`);
  },

  /**
   * Lấy thông tin chi tiết một cuộc hội thoại (Tên, thành viên, is_accepted...)
   */
  getConversationDetail(convId: string): Promise<ApiConversation> {
    return authorizedFetch(`/conversations/${convId}`);
  },

  /**
   * Tạo conversation mới (Thường dùng cho Group)
   */
  create(payload: {
    name: string;
    type: string;
    member_ids: string[];
  }): Promise<ApiConversation> {
    return authorizedFetch("/conversations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Tìm hoặc tạo mới private chat 1-1 với một user
   * Thường dùng khi nhấn vào người đang theo dõi
   */
  getOrCreatePrivate(friendId: string): Promise<ApiConversation> {
    return authorizedFetch(`/conversations/private/${friendId}`, {
      method: "POST",
    });
  },

  /**
   * Lấy danh sách tin nhắn trong hội thoại (phân trang)
   */
  messages(
    convId: string,
    { offset = 0, limit = 20 }: PaginationParams = {},
  ): Promise<ApiMessage[]> {
    return authorizedFetch(
      `/conversations/${convId}/messages?offset=${offset}&limit=${limit}`,
    );
  },

  /**
   * Gửi tin nhắn mới qua API (Nếu không dùng Socket hoàn toàn cho việc gửi)
   */
  send(convId: string, payload: ApiSendMessagePayload): Promise<ApiMessage> {
    return authorizedFetch(`/conversations/${convId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Chỉnh sửa nội dung tin nhắn (Chỉ trong vòng 15 phút)
   */
  editMessage(messageId: string, content: string): Promise<ApiMessage> {
    return authorizedFetch(`/messages/${messageId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  },

  /**
   * Thu hồi tin nhắn (Soft delete)
   */
  deleteMessage(
    messageId: string,
  ): Promise<{ status: string; message_id: string }> {
    return authorizedFetch(`/messages/${messageId}`, {
      method: "DELETE",
    });
  },

  /**
   * React (Thả cảm xúc) vào tin nhắn
   * @param type Label của reaction (like, love, haha...)
   */
  reactMessage(
    messageId: string,
    type: string,
  ): Promise<{ status: string; reaction: string | null }> {
    return authorizedFetch(`/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ type }),
    });
  },

  /**
   * Xóa reaction của chính mình
   */
  removeReaction(messageId: string): Promise<void> {
    return authorizedFetch(`/messages/${messageId}/reactions`, {
      method: "DELETE",
    });
  },

  /**
   * Cập nhật trạng thái tin nhắn (sent / delivered / seen)
   */
  updateStatus(
    messageId: string,
    status: "sent" | "delivered" | "seen",
  ): Promise<void> {
    return authorizedFetch(`/messages/${messageId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },

  /**
/**
   * Đánh dấu "Đã xem" toàn bộ tin nhắn trong phòng để xóa in đậm Sidebar
   */
  markSeen(convId: string): Promise<{ status: string }> {
    return authorizedFetch(`/conversations/${convId}/messages`, {
      method: "PUT", // Khớp với cách update trạng thái của phòng chat ở Backend
    });
  },

  /**
   * CHẤP NHẬN tin nhắn từ người lạ (Chuyển từ Tin nhắn chờ sang Hộp thư chính)
   */
acceptRequest(convId: string): Promise<{ status: string; message: string }> {
    return authorizedFetch(`/conversations/${convId}/accept`, {
      method: "PATCH", // Đổi từ PUT thành PATCH để khớp 100% với Backend dòng 102
    });
  },

  /**
   * TỪ CHỐI hoặc XÓA cuộc hội thoại chờ
   */
  rejectRequest(convId: string): Promise<void> {
    return authorizedFetch(`/conversations/${convId}/reject`, {
      method: "DELETE",
    });
  },

  removeMember(convId: string, userId: string): Promise<void> {
    return authorizedFetch(`/conversations/${convId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  /**
   * Token hỗ trợ Video Call (Stringee hoặc tương đương)
   */
  getStringeeToken(): Promise<ApiStringeeToken> {
    return authorizedFetch("/conversations/token");
  },

  addMembers(convId: string, memberIds: string[]) {
    return authorizedFetch(`/conversations/${convId}/members`, {
      method: "POST",
      body: JSON.stringify({ member_ids: memberIds }),
    });
  },

  leaveGroup(convId: string): Promise<void> {
    return authorizedFetch(`/conversations/${convId}/leave`, {
      method: 'POST', // Đổi từ DELETE thành POST để khớp với Backend dòng 134
    });
  },
};
