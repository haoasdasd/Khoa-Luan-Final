import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentsResource } from "@/api";
import { useAuth } from "./useAuth";
import type { ApiComment } from "@/types/api";
import { useMemo } from "react";

export function useCommentTrash() {
  return useQuery({
    queryKey: ["comments", "trash"],
    queryFn: () => commentsResource.trash(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useComments(postId: string, isEnabled: boolean = false) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: queryData, isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => commentsResource.list(postId),
    enabled: isEnabled && !!postId && !postId.startsWith("temp"),
  });

  const comments: ApiComment[] = useMemo(() => {
    const rawData = queryData || [];
    if (!Array.isArray(rawData)) return [];

    const buildTree = (
      items: ApiComment[],
      parentId: string | null = null,
    ): ApiComment[] => {
      return items
        .filter((item) => item.parent_id === parentId)
        .map((item) => ({
          ...item,
          replies: buildTree(items, item.id),
        }));
    };

    return buildTree(rawData);
  }, [queryData]);

  // HÀM HELPER: Cập nhật 1 item duy nhất trong cây comment (Cache)
  const updateSingleCommentInCache = (updatedComment: ApiComment) => {
    queryClient.setQueryData(
      ["comments", postId],
      (old: ApiComment[] | undefined) => {
        if (!old) return [];
        const sync = (list: ApiComment[]): ApiComment[] =>
          list.map((c: ApiComment) => {
            if (c.id === updatedComment.id) {
              return { ...c, ...updatedComment, replies: c.replies }; // Giữ lại replies cũ nếu có
            }
            if (c.replies?.length) return { ...c, replies: sync(c.replies) };
            return c;
          });
        return sync(old);
      },
    );
  };

  // 1. THÊM COMMENT/REPLY (Optimistic Update - Hiện ngay lập tức)
  const addCommentMutation = useMutation({
    mutationFn: (payload: {
      content: string;
      parent_id?: string;
      media_url?: string;
    }) => commentsResource.create(postId, payload),

    // Bước 1: Khi vừa nhấn nút Gửi
    onMutate: async (newPayload) => {
      // Hủy các request lấy comment đang chạy để tránh ghi đè dữ liệu cũ lên cái mới
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });

      // Lưu lại danh sách comment hiện tại để phòng trường hợp lỗi thì khôi phục (rollback)
      const previousComments = queryClient.getQueryData<ApiComment[]>([
        "comments",
        postId,
      ]);

      // Tạo một Comment "giả" với ID tạm thời
      const optimisticComment: ApiComment = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        parent_id: newPayload.parent_id || null,
        content: newPayload.content,
        media_url: newPayload.media_url || "",
        created_at: new Date().toISOString(),
        updated_at: null,
        author: {
          id: user?.id || "me",
          username: user?.username || "me",
          full_name: user?.full_name || "Bạn",
          avatar_url: user?.avatar_url || null,
          bio: user?.bio || null,
        },
        replies: [],
        is_deleted: false,
        is_liked: false,
        like_count: 0,
        reaction_type: null,
        top_reactions: [],
        reply_count: 0
      };

      // Cập nhật Cache ngay lập tức: Nhét vào đầu mảng
      queryClient.setQueryData(
        ["comments", postId],
        (old: ApiComment[] | undefined) => {
          return [optimisticComment, ...(old || [])];
        },
      );

      // Trả về context chứa dữ liệu cũ
      return { previousComments };
    },

    // Bước 2: Nếu Server báo lỗi (ví dụ rớt mạng)
    onError: (err, _newComment, context) => {
      // Khôi phục lại danh sách cũ, xóa cái comment "giả" đi
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", postId],
          context.previousComments,
        );
      }
      console.error("Lỗi khi đăng bình luận:", err);
    },

    // Bước 3: Khi Server trả về kết quả thật (sau 2.58s)
    onSuccess: (newCommentFromServer: ApiComment) => {
      queryClient.setQueryData(
        ["comments", postId],
        (old: ApiComment[] | undefined) => {
          const list = old || [];
          // Thay thế cái comment "giả" (temp-...) bằng comment thật có ID từ DB
          return list.map((c) =>
            c.id.toString().startsWith("temp-") &&
            c.content === newCommentFromServer.content
              ? newCommentFromServer
              : c,
          );
        },
      );

      // Cập nhật lại số lượng comment ngoài Feed
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },

    // Bước cuối: Đảm bảo dữ liệu đồng bộ 100%
    onSettled: () => {
      // Không cần invalidate ["comments"] nữa vì mình đã sync thủ công rất kỹ ở onSuccess rồi
      // Điều này giúp tránh việc load lại toàn bộ cây làm mất vị trí cuộn trang
    },
  });

  // 2. PHẢN ỨNG (LIKE/HAHA)
  const reactCommentMutation = useMutation({
    mutationFn: ({ commentId, type }: { commentId: string; type: string }) =>
      commentsResource.react(commentId, { type }),
    onSuccess: (updatedComment: ApiComment) =>
      updateSingleCommentInCache(updatedComment),
  });

  // 3. XÓA COMMENT (SOFT DELETE)
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentsResource.delete(commentId),
    onSuccess: (deletedCommentFromServer: ApiComment) =>
      updateSingleCommentInCache(deletedCommentFromServer),
  });

  // 4. CHỈNH SỬA COMMENT
  const updateCommentMutation = useMutation({
    mutationFn: ({
      id,
      content,
      media_url,
    }: {
      id: string;
      content: string;
      media_url?: string;
    }) => commentsResource.update(id, content, media_url),
    onSuccess: (updatedComment: ApiComment) =>
      updateSingleCommentInCache(updatedComment),
  });

  // 5. KHÔI PHỤC COMMENT
  const restoreCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentsResource.restore(commentId),
    onSuccess: (restoredComment: ApiComment) => {
      updateSingleCommentInCache(restoredComment);
      queryClient.invalidateQueries({ queryKey: ["comments", "trash"] });
    },
  });

  // 6. XÓA VĨNH VIỄN
  const permanentDeleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      commentsResource.permanentDelete(commentId),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData(
        ["comments", postId],
        (old: ApiComment[] | undefined) => {
          if (!old) return [];
          const removeFromTree = (list: ApiComment[]): ApiComment[] =>
            list
              .filter((c) => c.id !== commentId)
              .map((c) => ({ ...c, replies: removeFromTree(c.replies || []) }));
          return removeFromTree(old);
        },
      );
      queryClient.invalidateQueries({ queryKey: ["comments", "trash"] });
    },
  });
const hideCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentsResource.hide(commentId),
    onSuccess: (_, commentId) => {
      // Khi ẩn thành công, xóa nó khỏi danh sách hiển thị (Cache)
      queryClient.setQueryData(["comments", postId], (old: ApiComment[] | undefined) => {
        if (!old) return [];
        const removeFromTree = (list: ApiComment[]): ApiComment[] =>
          list
            .filter((c) => c.id !== commentId)
            .map((c) => ({ ...c, replies: removeFromTree(c.replies || []) }));
        return removeFromTree(old);
      });
    },
  });
  return {
    comments,
    isLoading,
    addComment: addCommentMutation.mutateAsync,
    deleteComment: deleteCommentMutation.mutate,
    hideComment: hideCommentMutation.mutate,
    updateComment: updateCommentMutation.mutate,
    reactComment: reactCommentMutation.mutate,
    restoreComment: restoreCommentMutation.mutate,
    permanentDelete: permanentDeleteMutation.mutate,
    isCommenting: addCommentMutation.isPending,
    isDeleting: deleteCommentMutation.isPending,
    isRestoring: restoreCommentMutation.isPending,
    isHardDeleting: permanentDeleteMutation.isPending,
    isHiding: hideCommentMutation.isPending,
  };
}
