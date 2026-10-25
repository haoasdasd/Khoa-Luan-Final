import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postsResource } from "@/api";
import type { ApiPost } from "@/types/api";
import { useAuth } from "./useAuth";

export function usePostActions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // --- 1. LIKE MUTATION (Đã fix lỗi nhảy icon) ---
  const likeMutation = useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: string }) =>
      postsResource.like(postId, { type }),

    onMutate: async ({ postId, type }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData(["feed"]);

      queryClient.setQueryData(["feed"], (old: any) => {
        if (!old) return old;

        const updateLogic = (p: ApiPost) => {
          if (p.id !== postId) return p;

          const rType = type.toLowerCase();
          const isOverwriting = p.is_liked;

          // Cập nhật danh sách icon hiển thị tạm thời
          let newTopReactions = [...(p.top_reactions || [])];
          if (!newTopReactions.includes(rType)) {
            newTopReactions = [rType, ...newTopReactions].slice(0, 3);
          }

          return {
            ...p,
            is_liked: true,
            reaction_type: rType, // Đổi icon nút bấm ngay lập tức
            like_count: isOverwriting ? p.like_count : p.like_count + 1,
            top_reactions: newTopReactions,
          };
        };

        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: ApiPost[]) => page.map(updateLogic)),
          };
        }
        return Array.isArray(old) ? old.map(updateLogic) : old;
      });
      return { previousFeed };
    },

    onSuccess: (updatedPostFromServer, variables) => {
      queryClient.setQueryData(["feed"], (old: any) => {
        if (!old) return old;

        const updateLogic = (p: ApiPost) => {
          if (p.id === variables.postId) {
            return {
              ...p,
              ...updatedPostFromServer, // Lấy like_count và top_reactions thật từ BE
              // ÉP CHỐT: Giữ đúng loại reaction user vừa bấm để tránh bị null từ BE đè lên
              reaction_type: variables.type.toLowerCase(),
              is_liked: true,
              // Đảm bảo top_reactions được cập nhật để PostStats hiển thị icon mới
              top_reactions:
                updatedPostFromServer.top_reactions || p.top_reactions,
            };
          }
          return p;
        };

        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: ApiPost[]) => page.map(updateLogic)),
          };
        }
        return Array.isArray(old) ? old.map(updateLogic) : old;
      });
    },

    onError: (_err, _vars, context) => {
      if (context?.previousFeed)
        queryClient.setQueryData(["feed"], context.previousFeed);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

  // --- 2. UNLIKE MUTATION ---
  const unlikeMutation = useMutation({
    mutationFn: (postId: string) => postsResource.unlike(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData(["feed"]);

      const logic = (p: ApiPost) =>
        p.id === postId
          ? {
              ...p,
              is_liked: false,
              reaction_type: null,
              like_count: Math.max(0, p.like_count - 1),
            }
          : p;

      queryClient.setQueryData(["feed"], (old: any) => {
        if (!old) return old;
        if (old.pages)
          return {
            ...old,
            pages: old.pages.map((page: ApiPost[]) => page.map(logic)),
          };
        return Array.isArray(old) ? old.map(logic) : old;
      });
      return { previousFeed };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

  // --- 3. SHARE MUTATION ---
  const shareMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      postsResource.share(postId, { content }),

    onMutate: async ({ postId, content }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData(["feed"]);

      const findPostInCache = (oldData: any): ApiPost | undefined => {
        if (!oldData) return undefined;
        const targetId = String(postId).toLowerCase();
        let found: ApiPost | undefined;
        if (oldData.pages) {
          for (const page of oldData.pages) {
            found = page.find(
              (p: any) => String(p.id).toLowerCase() === targetId,
            );
            if (found) break;
          }
        } else if (Array.isArray(oldData)) {
          found = oldData.find(
            (p: any) => String(p.id).toLowerCase() === targetId,
          );
        }
        return found;
      };

      const originalPost = findPostInCache(previousFeed);

      const optimisticShare: ApiPost = {
        id: `temp-share-${Date.now()}`,
        content: content,
        author: {
          id: user?.id || "me",
          full_name: user?.full_name || "Lê Anh Hào",
          avatar_url: user?.avatar_url || null,
          username: user?.username || "leanhhao",
          bio: user?.bio || null,
        },
        media_url: null,
        visibility: "public",
        created_at: new Date().toISOString(),
        updated_at: null,
        like_count: 0,
        comment_count: 0,
        is_liked: false,
        is_saved: false,
        reaction_type: null,
        top_reactions: [],
        is_edited: false,
        shared_post: originalPost ? { ...originalPost } : null,
      };

      queryClient.setQueryData(["feed"], (old: any) => {
        if (!old) return old;
        if (old.pages) {
          const newPages = [...old.pages];
          newPages[0] = [optimisticShare, ...newPages[0]];
          return { ...old, pages: newPages };
        }
        return [optimisticShare, ...old];
      });

      return { previousFeed, tempId: optimisticShare.id };
    },

    onSuccess: (realPost, variables, context) => {
      queryClient.setQueryData(["feed"], (old: any) => {
        if (!old) return old;
        const updateId = (p: ApiPost) =>
          p.id === context?.tempId ? realPost : p;

        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: ApiPost[]) => page.map(updateId)),
          };
        }
        return Array.isArray(old) ? old.map(updateId) : old;
      });
    },

    onError: (_err, _vars, context) => {
      if (context?.previousFeed)
        queryClient.setQueryData(["feed"], context.previousFeed);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

  // --- 4. HIDE & SAVE MUTATIONS ---
  const hidePostMutation = useMutation({
    mutationFn: (postId: string) => postsResource.hide(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData(["feed"]);
      const removeLogic = (p: ApiPost) => p.id !== postId;

      queryClient.setQueryData(["feed"], (old: any) => {
        if (!old) return old;
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: ApiPost[]) => page.filter(removeLogic)),
          };
        }
        return Array.isArray(old) ? old.filter(removeLogic) : old;
      });
      return { previousFeed };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

// --- 4. HIDE & SAVE MUTATIONS ---
  
  // Hàm dùng chung để cập nhật trạng thái is_saved trong Cache cho cả 2 trang Feed và Saved
  const updateSaveStatusInCache = (postId: string, isSaved: boolean) => {
    // 1. Cập nhật is_saved trong Query "feed" (Trang chủ/Cá nhân)
    queryClient.setQueryData(["feed"], (old: any) => {
      if (!old) return old;
      const logic = (p: ApiPost) => p.id === postId ? { ...p, is_saved: isSaved } : p;
      if (old.pages) {
        return { ...old, pages: old.pages.map((page: ApiPost[]) => page.map(logic)) };
      }
      return Array.isArray(old) ? old.map(logic) : old;
    });

    // 2. Cập nhật is_saved trong Query "saved-posts" (Trang danh sách đã lưu)
    queryClient.setQueryData(["saved-posts"], (old: any) => {
      if (!old) return old;
      // Nếu là bỏ lưu (unsave), thì xóa bài viết đó khỏi danh sách Saved luôn cho chuyên nghiệp
      if (!isSaved) {
        const filterLogic = (p: ApiPost) => p.id !== postId;
        if (old.pages) return { ...old, pages: old.pages.map((page: ApiPost[]) => page.filter(filterLogic)) };
        return Array.isArray(old) ? old.filter(filterLogic) : old;
      }
      // Nếu là lưu (save), cập nhật trạng thái
      const updateLogic = (p: ApiPost) => p.id === postId ? { ...p, is_saved: true } : p;
      if (old.pages) return { ...old, pages: old.pages.map((page: ApiPost[]) => page.map(updateLogic)) };
      return Array.isArray(old) ? old.map(updateLogic) : old;
    });
  };

// --- MUTATION SAVE (LƯU BÀI VIẾT) ---
const saveMutation = useMutation({
    mutationFn: (postId: string) => postsResource.save(postId),
    onMutate: async (postId) => {
      // Hủy mọi request để tránh dữ liệu cũ đè dữ liệu mới
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData(["feed"]);

      // 🔥 ÉP ĐỔI MÀU TRONG RAM
      queryClient.setQueryData(["feed"], (old: any) => {
        if (!old) return old;
        const updateLogic = (p: ApiPost) => {
          // Nếu bài này trùng ID, hoặc bài này là bài share chứa bài gốc trùng ID
          if (p.id === postId) return { ...p, is_saved: true };
          if (p.shared_post?.id === postId) return { ...p, shared_post: { ...p.shared_post, is_saved: true } };
          return p;
        };

        if (old.pages) {
          return { ...old, pages: old.pages.map((page: any) => page.map(updateLogic)) };
        }
        return Array.isArray(old) ? old.map(updateLogic) : old;
      });

      return { previousFeed };
    },
    onError: (err, variables, context) => {
      if (context?.previousFeed) queryClient.setQueryData(["feed"], context.previousFeed);
    }
  });

  // --- MUTATION UNSAVE (BỎ LƯU) ---
  const unsaveMutation = useMutation({
    mutationFn: (postId: string) => postsResource.unsave(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      await queryClient.cancelQueries({ queryKey: ["saved-posts"] });

      const previousFeed = queryClient.getQueryData(["feed"]);
      const previousSaved = queryClient.getQueryData(["saved-posts"]);

      // 🔥 CẬP NHẬT RAM: Bỏ lưu
      // 1. Ở Feed: Chỉ đổi icon sang xám
      queryClient.setQueryData(["feed"], (old: any) => {
        if (!old) return old;
        const logic = (p: ApiPost) => p.id === postId ? { ...p, is_saved: false } : p;
        if (old.pages) return { ...old, pages: old.pages.map((page: ApiPost[]) => page.map(logic)) };
        return Array.isArray(old) ? old.map(logic) : old;
      });

      // 2. Ở trang Saved: Xóa bài viết khỏi danh sách hiển thị luôn
      queryClient.setQueryData(["saved-posts"], (old: any) => {
        if (!old) return old;
        const filterLogic = (p: ApiPost) => p.id !== postId;
        if (old.pages) return { ...old, pages: old.pages.map((page: ApiPost[]) => page.filter(filterLogic)) };
        return Array.isArray(old) ? old.filter(filterLogic) : old;
      });

      return { previousFeed, previousSaved };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeed) queryClient.setQueryData(["feed"], context.previousFeed);
      if (context?.previousSaved) queryClient.setQueryData(["saved-posts"], context.previousSaved);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => postsResource.delete(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData(["feed"]);
      const filterLogic = (p: ApiPost) => p.id !== postId;

      queryClient.setQueryData(["feed"], (old: any) => {
        if (!old) return old;
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: ApiPost[]) => page.filter(filterLogic)),
          };
        }
        return Array.isArray(old) ? old.filter(filterLogic) : old;
      });
      return { previousFeed };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
  const restorePostMutation = useMutation({
  mutationFn: (postId: string) => postsResource.restore(postId), // Backend: POST /api/posts/{id}/restore
  onSuccess: () => {
    // Làm mới feed và thùng rác sau khi khôi phục thành công
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["posts", "trash"] });
  },
});

// 2. Mutation Xóa vĩnh viễn (Hard Delete)
const permanentDeletePostMutation = useMutation({
  mutationFn: (postId: string) => postsResource.permanentDelete(postId), // Backend: DELETE /api/posts/{id}/permanent
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["posts", "trash"] });
  },
});
  return {
    likePost: likeMutation.mutate,
    unlikePost: unlikeMutation.mutate,
    sharePost: shareMutation.mutate,
    hidePost: hidePostMutation.mutate,
    savePost: saveMutation.mutate,
    unsavePost: unsaveMutation.mutate,
    deletePost: deleteMutation.mutate,
    isLiking: likeMutation.isPending,
    isUnliking: unlikeMutation.isPending,
    isSharing: shareMutation.isPending,
    isHiding: hidePostMutation.isPending,
    isDeleting: deleteMutation.isPending,
    restorePost: restorePostMutation.mutate,
  permanentDeletePost: permanentDeletePostMutation.mutate,
  isRestoringPost: restorePostMutation.isPending,
  };
}
