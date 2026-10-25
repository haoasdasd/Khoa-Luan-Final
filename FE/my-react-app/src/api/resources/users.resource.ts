/**
 * api/resources/users.resource.ts
 * All /users/* endpoint calls.
 */
import { authorizedFetch } from "@/api/interceptors/auth.interceptor";
import type {
  ApiUser,
  ApiUserPublic,
  ApiUpdateUserPayload,
  ApiUserProfileResponse,
} from "@/types/api";

export const usersResource = {
  me(): Promise<ApiUser> {
    return authorizedFetch("/users/me");
  },

  getProfile(username: string): Promise<ApiUserProfileResponse> {
    return authorizedFetch(`/users/profile/${username}`);
  },

  update(payload: ApiUpdateUserPayload): Promise<ApiUser> {
    return authorizedFetch("/users/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  follow(userId: string): Promise<void> {
    return authorizedFetch(`/users/${userId}/follow`, { method: "POST" });
  },

  unfollow(userId: string): Promise<void> {
    return authorizedFetch(`/users/${userId}/follow`, { method: "DELETE" });
  },

  block(userId: string): Promise<void> {
    return authorizedFetch(`/users/${userId}/block`, { method: "POST" });
  },

  unblock(userId: string): Promise<void> {
    return authorizedFetch(`/users/${userId}/block`, { method: "DELETE" });
  },

  followers(userId: string): Promise<ApiUserPublic[]> {
    return authorizedFetch(`/users/${userId}/followers`);
  },

  following(userId: string): Promise<ApiUserPublic[]> {
    return authorizedFetch(`/users/${userId}/following`);
  },

  suggestions(): Promise<any[]> {
    return authorizedFetch("/users/suggestions");
  },

  getFriends(userId: string): Promise<ApiUserPublic[]> {
    return authorizedFetch(`/users/${userId}/friends`);
  },
  getBlockedList(): Promise<ApiUserPublic[]> {
    return authorizedFetch("/users/me/blocked");
  },
  getCommentReplies(commentId: string): Promise<any[]> {
    return authorizedFetch(`/comments/${commentId}/replies`);
  },

  getMyFriends(offset = 0, limit = 20): Promise<ApiUserPublic[]> {
    return authorizedFetch(`/users/me/friends?offset=${offset}&limit=${limit}`);
  },

  // 2. Tìm kiếm trong danh sách bạn bè (API tìm kiếm anh em mình vừa viết)
  searchFriends(query: string, limit = 10): Promise<ApiUserPublic[]> {
    return authorizedFetch(
      `/users/me/friends/search?q=${query}&limit=${limit}`,
    );
  },
  getChatSuggestions(): Promise<ApiUserPublic[]> {
    // Đây là endpoint trả về những người follow chéo nhưng chưa chat
    return authorizedFetch("/users/me/chat-suggestions");
  },
  globalSearch(query: string): Promise<ApiUserPublic[]> {
  return authorizedFetch(`/users/search?q=${query}`);
},
};
