import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersResource } from "@/api/resources/users.resource";
import { postsResource } from "@/api/resources/posts.resource";
import type { ApiUpdateUserPayload } from "@/types/api/user.types";

export function useUserProfile(username: string | undefined) {
  return useQuery({
    queryKey: ["user", username],
    queryFn: async () => {
      if (!username || username === "me") return await usersResource.me();
      return await usersResource.getProfile(username);
    },
    // Quan trọng: Tự động tải lại khi mình bấm Follow/Unfollow ở component khác
    staleTime: 1000 * 60 * 2,
  });
}

// 2. Hook lấy danh sách Connections
export function useUserConnections(userId: string | undefined) {
  return useQuery({
    queryKey: ["connections", userId],
    queryFn: async () => {
      if (!userId) return { followers: [], following: [] };
      const [followers, following] = await Promise.all([
        usersResource.followers(userId),
        usersResource.following(userId),
      ]);
      return { followers, following };
    },
    enabled: !!userId,
  });
}

// 3. Hook thực hiện TOÀN BỘ ACTIONS
export function useUserActions() {
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: (userId: string) => usersResource.follow(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["users", "suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => usersResource.unfollow(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["users", "suggestions"] });
    },
  });

  const unhideMutation = useMutation({
    mutationFn: ({
      targetId,
      targetType,
    }: {
      targetId: string;
      targetType: string;
    }) => postsResource.unhide(targetId, targetType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archive"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: ApiUpdateUserPayload) =>
      usersResource.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  return {
    follow: followMutation.mutate,
    unfollow: unfollowMutation.mutate,
    unhidePost: unhideMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    isProcessing:
      followMutation.isPending ||
      unfollowMutation.isPending ||
      unhideMutation.isPending ||
      updateProfileMutation.isPending,
  };
}

// 4. Hook lấy GỢI Ý (Thêm Export ở đây)
export function useSuggestedUsers() {
  return useQuery({
    queryKey: ["users", "suggestions"],
    queryFn: () => usersResource.suggestions(),
    staleTime: 1000 * 60 * 10,
  });
}

// 5. Hook lấy KHO LƯU TRỮ
export function useArchive() {
  return useQuery({
    queryKey: ["archive"],
    queryFn: () => postsResource.getArchive(),
  });
}
export function useCommentReplies(commentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["comments", commentId, "replies"],
    queryFn: () => usersResource.getCommentReplies(commentId),
    enabled: enabled, // Chỉ gọi API khi user bấm nút "Xem phản hồi"
  });
}