import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { ProfileHeader } from "@/components/Profile/ProfileHeader";
import { ProfileFollowStats } from "@/components/Profile/ProfileFollowStats";
import { ProfileBio } from "@/components/Profile/ProfileBio";
import { ProfileTabs } from "@/components/Profile/ProfileTabs";
import { EditProfileModal } from "@/components/Profile/EditProfileModal";
import { PostList } from "@/components/Feed/PostList";
import { UserAvatar } from "@/components/common/UserAvatar"; // Thêm để hiện avatar bạn bè
import { useAuth } from "@/hooks/api/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { postsResource, usersResource } from "@/api";
import { Loader2, Image as ImageIcon, Users } from "lucide-react";

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"posts" | "media" | "friends">(
    "posts",
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const targetUsername = username || me?.username;
  const isMe = !username || username === me?.username;

  // 1. Lấy thông tin Profile (Lấy trước để có ID)
  const {
    data: profileData,
    isLoading: isProfileLoading,
    refetch,
  } = useQuery({
    queryKey: ["profile", targetUsername],
    queryFn: () => usersResource.getProfile(targetUsername || ""),
    enabled: !!targetUsername,
  });

  const displayUser = profileData?.user;

  // 2. Lấy bài viết (Dùng ID từ displayUser)
  const { data: userPostsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ["posts", "user", displayUser?.id],
    queryFn: () => postsResource.getUserPosts(displayUser?.id || ""),
    enabled: !!displayUser?.id,
  });

  // 3. Lấy danh sách Bạn bè (Mutual Follow)
  const { data: friendsData, isLoading: isFriendsLoading } = useQuery({
    queryKey: ["friends", displayUser?.id],
    queryFn: () => usersResource.getFriends(displayUser?.id || ""),
    enabled: !!displayUser?.id && activeTab === "friends",
  });

  // --- Hóa giải dữ liệu ---
  const userPosts = useMemo(() => {
    return Array.isArray(userPostsData)
      ? userPostsData
      : (userPostsData as any)?.data || [];
  }, [userPostsData]);

  const friendsList = useMemo(() => {
    return Array.isArray(friendsData)
      ? friendsData
      : (friendsData as any)?.data || [];
  }, [friendsData]);

  const recentMedia = useMemo(() => {
    return userPosts
      .map((p: any) => p.media_url || p.shared_post?.media_url)
      .filter((url: string) => !!url)
      .slice(0, 6);
  }, [userPosts]);

  // Loading state
  if (isProfileLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-500 font-medium">
            Đang tải trang cá nhân...
          </p>
        </div>
      </div>
    );

  if (!profileData)
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800">404</h2>
        <p className="text-slate-500">
          Người dùng không tồn tại hoặc đã bị xóa.
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <ProfileHeader
        user={displayUser}
        isMe={isMe}
        isFollowing={profileData.is_following}
        onEditClick={() => setIsEditModalOpen(true)}
        onRefresh={refetch}
      />

      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* CỘT TRÁI */}
          <div className="lg:col-span-4 space-y-6">
            <ProfileFollowStats
              followers={profileData.followers_count}
              following={profileData.following_count}
              postsCount={profileData.posts_count}
            />
            <ProfileBio user={displayUser} />

            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon size={18} className="text-blue-500" /> Bộ sưu tập
                </h3>

                <button
                  onClick={() => setActiveTab("media")}
                  className="text-xs text-blue-600 font-bold hover:underline transition-all"
                >
                  Xem tất cả
                </button>
              </div>

              {recentMedia && recentMedia.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {recentMedia.map((url: string, idx: number) => {
                    // Kiểm tra xem là video hay ảnh để hiển thị thumbnail phù hợp

                    const isVideo =
                      url?.match(/\.(mp4|webm|ogg)$/i) ||
                      url?.includes("/video/upload/");

                    return (
                      <div
                        key={idx}
                        className="aspect-square rounded-xl overflow-hidden bg-slate-50 group relative cursor-pointer border border-slate-100 shadow-sm"
                      >
                        {isVideo ? (
                          <div className="w-full h-full relative">
                            <video
                              src={url}
                              className="w-full h-full object-cover"
                            />

                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={url}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            alt={`gallery-${idx}`}
                            // Xử lý khi ảnh lỗi không load được

                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://placehold.co/400x400?text=Error";
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <ImageIcon size={24} />
                  </div>

                  <p className="text-xs text-slate-400 font-medium italic">
                    Chưa có khoảnh khắc nào
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* --- CỘT PHẢI --- */}
          <div className="lg:col-span-8 space-y-6">
            <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />

            <div className="min-h-[400px]">
              {/* --- TAB BÀI VIẾT --- */}
              {activeTab === "posts" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {isPostsLoading ? (
                    <div className="flex justify-center py-20">
                      <Loader2
                        className="animate-spin text-blue-500"
                        size={40}
                      />
                    </div>
                  ) : userPosts.length > 0 ? (
                    // ✅ Gọi đúng Component đã bọc PostCard
                    <PostList posts={userPosts} />
                  ) : (
                    <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200">
                      <ImageIcon
                        className="text-slate-300 mx-auto mb-4"
                        size={48}
                      />
                      <p className="text-slate-400 font-bold">
                        Chưa có bài viết nào được đăng.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB ẢNH & VIDEO --- */}
              {activeTab === "media" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-500">
                  {userPosts.filter(
                    (p: any) => p.media_url || p.shared_post?.media_url,
                  ).length > 0 ? (
                    userPosts
                      .filter(
                        (p: any) => p.media_url || p.shared_post?.media_url,
                      )
                      .map((post: any) => {
                        // ✅ Xác định URL cuối cùng để hiển thị
                        const finalMediaUrl =
                          post.media_url || post.shared_post?.media_url;
                        const isVideo =
                          finalMediaUrl?.match(/\.(mp4|webm|ogg)$/i) ||
                          finalMediaUrl?.includes("/video/upload/");

                        return (
                          <div
                            key={post.id}
                            className="group aspect-square rounded-[24px] overflow-hidden bg-slate-200 relative cursor-pointer shadow-sm hover:shadow-xl transition-all"
                          >
                            {isVideo ? (
                              <video
                                src={finalMediaUrl}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={finalMediaUrl}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                alt=""
                              />
                            )}
                            {/* Icon chỉ báo đây là bài share nếu muốn (optional) */}
                            {post.shared_post && (
                              <div className="absolute top-3 left-3 bg-blue-600/80 backdrop-blur-md p-1.5 rounded-lg">
                                <Users size={12} className="text-white" />
                              </div>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold">
                        Người dùng chưa chia sẻ khoảnh khắc nào.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB BẠN BÈ - Đã được cập nhật hiển thị thật */}
              {activeTab === "friends" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {isFriendsLoading ? (
                    <div className="flex justify-center py-20">
                      <Loader2 className="animate-spin text-blue-500" />
                    </div>
                  ) : friendsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {friendsList.map((friend: any) => (
                        <div
                          key={friend.id}
                          className="bg-white p-4 rounded-[24px] border border-slate-100 flex items-center justify-between hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <UserAvatar user={friend} size="md" />
                            <div>
                              <h4 className="font-bold text-slate-900">
                                {friend.full_name}
                              </h4>
                              <p className="text-xs text-slate-400">
                                @{friend.username}
                              </p>
                            </div>
                          </div>
                          <div className="px-3 py-1.5 bg-slate-50 rounded-full text-[11px] font-bold text-slate-500">
                            Bạn bè
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100">
                      <Users
                        size={48}
                        className="mx-auto text-slate-200 mb-4"
                      />
                      <h3 className="font-bold text-slate-900">
                        Chưa có bạn bè
                      </h3>
                      <p className="text-slate-500 text-sm">
                        Cùng theo dõi nhau để trở thành bạn bè.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isEditModalOpen && (
        <EditProfileModal
          user={displayUser}
          onClose={() => setIsEditModalOpen(false)}
          onSave={async (formData: any) => {
            await usersResource.update(formData);
            queryClient.invalidateQueries({
              queryKey: ["profile", targetUsername],
            });
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
