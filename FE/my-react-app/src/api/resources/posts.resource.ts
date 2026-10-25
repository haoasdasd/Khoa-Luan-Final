/**
 * api/resources/posts.resource.ts
 * All /posts/* endpoint calls.
 */
import { authorizedFetch } from "@/api/interceptors/auth.interceptor";
import type {
  ApiPost,
  ApiHiddenItem,
  ApiCreatePostPayload,
  ApiUpdatePostPayload,
} from "@/types/api";
import type { PaginationParams } from "@/types/common";

export const postsResource = {
  list({ offset = 0, limit = 20 }: PaginationParams = {}): Promise<ApiPost[]> {
    return authorizedFetch(`/posts?offset=${offset}&limit=${limit}`);
  },

  get(postId: string): Promise<ApiPost> {
    return authorizedFetch(`/posts/${postId}`);
  },

  getUserPosts(
    userId: string,
    { offset = 0, limit = 20 }: PaginationParams = {},
  ): Promise<ApiPost[]> {
    // Lưu ý: Đường dẫn này phải khớp với Backend (@router.get("/users/{user_id}/posts"))
    return authorizedFetch(
      `/users/${userId}/posts?offset=${offset}&limit=${limit}`,
    );
  },

  getSavedPosts({ offset = 0, limit = 20 }: PaginationParams = {}): Promise<ApiPost[]> {
    // Hào kiểm tra Backend xem đường dẫn là /posts/saved hay /users/me/saved-posts nhé
    // Ở đây mình để mặc định theo logic thông thường là /posts/saved
    return authorizedFetch(`/posts/saved?offset=${offset}&limit=${limit}`);
  },

  create(payload: ApiCreatePostPayload): Promise<ApiPost> {
    return authorizedFetch("/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  createAI(payload: { prompt: string }): Promise<ApiPost> {
    return authorizedFetch("/posts/ai-generate", {
      // Đảm bảo đường dẫn này khớp với Route BE của Hào
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(postId: string, payload: ApiUpdatePostPayload): Promise<ApiPost> {
    return authorizedFetch(`/posts/${postId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  delete(postId: string): Promise<void> {
    return authorizedFetch(`/posts/${postId}`, { method: "DELETE" });
  },

  like(postId: string, payload: { type: string }): Promise<ApiPost> {
    return authorizedFetch(`/posts/${postId}/like`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  share(postId: string, payload: { content: string }): Promise<ApiPost> {
    return authorizedFetch(`/posts/${postId}/share`, {
      // PHẢI LÀ authorizedFetch
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  unlike(postId: string): Promise<void> {
    return authorizedFetch(`/posts/${postId}/like`, { method: "DELETE" });
  },

  save(postId: string): Promise<void> {
    return authorizedFetch(`/posts/${postId}/save`, { method: "POST" });
  },

  unsave(postId: string): Promise<void> {
    return authorizedFetch(`/posts/${postId}/save`, { method: "DELETE" });
  },

  myRecent(): Promise<ApiPost[]> {
    return authorizedFetch("/posts/my-recent");
  },
  hide(postId: string): Promise<void> {
    return authorizedFetch(`/posts/${postId}/hide`, {
      method: "POST",
    });
  },

  // 1. Lấy danh sách nội dung đã ẩn (Archive)
  // Hào nhớ check Backend xem path là /posts/hidden/archive hay /posts/archive nhé
  getArchive({ offset = 0, limit = 20 }: PaginationParams = {}): Promise<
    ApiHiddenItem[]
  > {
    return authorizedFetch(
      `/posts/hidden/archive?offset=${offset}&limit=${limit}`,
    );
  },

  // 2. Hàm HIỆN LẠI (Unhide) - Fix dứt điểm lỗi TypeScript
  unhide(targetId: string, targetType: string = "post"): Promise<{ message: string }> {
    // Truyền target_type qua query string để khớp với logic Backend (target_type: str)
    return authorizedFetch(
      `/posts/${targetId}/unhide?target_type=${targetType}`,
      {
        method: "DELETE",
      },
    );
  },

  getTrash({ offset = 0, limit = 20 }: PaginationParams = {}): Promise<ApiPost[]> {
    return authorizedFetch(`/posts/trash?offset=${offset}&limit=${limit}`);
  },

  // 2. Khôi phục bài viết từ thùng rác
  restore(postId: string): Promise<ApiPost> {
    return authorizedFetch(`/posts/${postId}/restore`, {
      method: "POST",
    });
  },

  // 3. Xóa vĩnh viễn (Hard Delete)
  permanentDelete(postId: string): Promise<void> {
    return authorizedFetch(`/posts/${postId}/permanent`, {
      method: "DELETE",
    });
  },
};
