/**
 * hooks/api/useProfile.ts
 * Loads a user profile (own or public) plus their followers / following lists.
 */
import { useState, useEffect, useCallback } from "react";
import { usersResource } from "@/api";
import type { ApiUser, ApiUserPublic } from "@/types/api";

interface UseProfileResult {
  profile: ApiUser | ApiUserPublic | null;
  followers: ApiUserPublic[];
  following: ApiUserPublic[];
  isFollowing: boolean;
  loading: boolean;
  error: string | null;
  follow: () => Promise<void>;
  unfollow: () => Promise<void>;
  updateLocal: (patch: Partial<ApiUser>) => void;
}

export function useProfile(
  username: string | undefined,
  meId: string | undefined,
): UseProfileResult {
  const isOwnProfile = !username || !meId;
  const [profile, setProfile] = useState<ApiUser | ApiUserPublic | null>(null);
  const [followers, setFollowers] = useState<ApiUserPublic[]>([]);
  const [following, setFollowing] = useState<ApiUserPublic[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const response = isOwnProfile
      ? await usersResource.me()
      : await usersResource.getProfile(username!);

    // 🔥 Bước quan trọng: 
    // Nếu là profile người khác, lấy trường .user từ response.
    // Nếu là profile của mình (me), thường API trả về thẳng object user.
    const userDetail = 'user' in response ? response.user : response;

    setProfile(userDetail);

    // Sử dụng userDetail.id thay vì response.id để tránh lỗi TypeScript
    const [frs, fng] = await Promise.all([
      usersResource.followers(userDetail.id),
      usersResource.following(userDetail.id),
    ]);

    setFollowers(frs);
    setFollowing(fng);
    setIsFollowing(frs.some(f => f.id === meId));

    // Nếu Backend có trả về sẵn is_following trong response profile, 
    // Hào nên ưu tiên dùng nó luôn cho nhanh:
    if ('is_following' in response) {
      setIsFollowing(response.is_following);
    }

  } catch (e) {
    setError(e instanceof Error ? e.message : 'Failed to load profile');
  } finally {
    setLoading(false);
  }
}, [username, isOwnProfile, meId]);

  useEffect(() => {
    void load();
  }, [load]);

  const follow = async () => {
    if (!profile) return;
    await usersResource.follow(profile.id);
    setIsFollowing(true);
    setFollowers((prev) =>
      prev.some((f) => f.id === meId)
        ? prev
        : [
            ...prev,
            {
              id: meId!,
              username: "",
              full_name: null,
              avatar_url: null,
              bio: null,
            },
          ],
    );
  };

  const unfollow = async () => {
    if (!profile) return;
    await usersResource.unfollow(profile.id);
    setIsFollowing(false);
    setFollowers((prev) => prev.filter((f) => f.id !== meId));
  };

  const updateLocal = (patch: Partial<ApiUser>) =>
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));

  return {
    profile,
    followers,
    following,
    isFollowing,
    loading,
    error,
    follow,
    unfollow,
    updateLocal,
  };
}
