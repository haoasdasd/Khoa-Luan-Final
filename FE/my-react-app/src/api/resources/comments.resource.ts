/**
 * api/resources/comments.resource.ts
 */
import { authorizedFetch } from "@/api/interceptors/auth.interceptor";
import type { ApiComment, ApiCreateCommentPayload } from "@/types/api";
import type { PaginationParams } from "@/types/common";

export const commentsResource = {
  list(
    postId: string,
    { offset = 0, limit = 20 }: PaginationParams = {},
  ): Promise<ApiComment[]> {
    return authorizedFetch(
      `/posts/${postId}/comments?offset=${offset}&limit=${limit}`,
    );
  },

  create(
    postId: string,
    payload: ApiCreateCommentPayload,
  ): Promise<ApiComment> {
    return authorizedFetch(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ CẬP NHẬT TẠI ĐÂY: Thêm tham số media_url thứ 3
  update(
    commentId: string, 
    content: string, 
    media_url?: string // Cho phép gửi thêm ảnh khi sửa
  ): Promise<ApiComment> {
    return authorizedFetch(`/comments/${commentId}`, {
      method: "PUT",
      // ✅ Gửi cả content và media_url vào body
      body: JSON.stringify({ content, media_url }),
    });
  },

  delete(commentId: string): Promise<ApiComment> {
    return authorizedFetch(`/comments/${commentId}`, {
      method: "DELETE",
    });
  },

  react(commentId: string, payload: { type: string }): Promise<any> {
    return authorizedFetch(`/comments/${commentId}/react`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  hide(commentId: string): Promise<void> {
    return authorizedFetch(`/comments/${commentId}/hide`, {
      method: "POST",
    });
  },

  restore(commentId: string): Promise<ApiComment> {
    return authorizedFetch(`/comments/${commentId}/restore`, {
      method: "POST",
    });
  },

  trash(): Promise<ApiComment[]> {
    return authorizedFetch(`/comments/trash`);
  },

  permanentDelete(commentId: string): Promise<void> {
    return authorizedFetch(`/comments/${commentId}/permanent`, {
      method: "DELETE",
    });
  },
};
