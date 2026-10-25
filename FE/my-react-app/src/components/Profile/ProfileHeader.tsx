import type { ApiUser } from "@/types/api";

import { useState, useRef } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { useToast } from "@/hooks/api/useToast";
import { usersResource } from "@/api";
import { useUserActions } from "@/hooks/api/useUser";

interface ProfileHeaderProps {
  user: ApiUser;
  isMe: boolean;
  isFollowing: boolean;
  onEditClick: () => void;
  onRefresh: () => void;
} // Đảm bảo import đúng hook

export const ProfileHeader = ({
  user,
  isMe,
  isFollowing,
  onEditClick,
  onRefresh,
}: ProfileHeaderProps) => {
  const [isUploading, setIsUploading] = useState<"avatar" | "cover" | null>(
    null,
  );
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();

  // ✅ 1. Lấy hàm follow và trạng thái loading từ hook của Hào
  const { follow, unfollow, isProcessing } = useUserActions();

  // ✅ 2. Hàm xử lý khi nhấn nút Thêm bạn bè / Hủy kết bạn
  const handleFollowToggle = async () => {
    if (isProcessing) return;

    if (isFollowing) {
      // Nếu đang follow thì hủy (Có thể thêm confirm nếu muốn)
      if (window.confirm(`Bạn muốn hủy kết bạn với ${user.full_name}?`)) {
        await unfollow(user.id);
        onRefresh(); // Làm mới data để cập nhật nút và số follow
      }
    } else {
      // Nếu chưa follow thì tiến hành kết nối
      await follow(user.id);
      onRefresh(); // Làm mới data
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(type);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ml_default");

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/dskrtvdcm/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await res.json();
      const imageUrl = data.secure_url;

      const updatePayload =
        type === "avatar" ? { avatar_url: imageUrl } : { cover_url: imageUrl };

      await usersResource.update(updatePayload);
      show(
        `Cập nhật ảnh ${type === "avatar" ? "đại diện" : "bìa"} thành công!`,
        "success",
      );
      onRefresh();
    } catch {
      show("Không thể tải ảnh lên!", "error");
    } finally {
      setIsUploading(null);
    }
  };
  const handleBlockUser = async () => {
    if (
      window.confirm(
        `Bạn có chắc muốn chặn ${user?.full_name}? Họ sẽ không thể xem bài viết hoặc nhắn tin cho bạn.`,
      )
    ) {
      try {
        await usersResource.block(user.id);
        show(`Đã chặn ${user?.full_name}`, "success");

        // Block xong thì nên "tiễn khách" về trang chủ
        window.location.href = "/";
      } catch {
        show("Lỗi khi chặn người dùng này!", "error");
      }
    }
  };
  return (
    <div className="relative w-full bg-white">
      <input
        type="file"
        ref={avatarInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => handleFileChange(e, "avatar")}
      />
      <input
        type="file"
        ref={coverInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => handleFileChange(e, "cover")}
      />

      <div className="relative h-64 md:h-96 w-full bg-slate-200 overflow-hidden group/cover">
        {user.cover_url ? (
          <img
            src={user.cover_url}
            className="w-full h-full object-cover"
            alt="cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-100 to-indigo-100" />
        )}
        {isMe && (
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-6 right-6 flex items-center gap-2 px-5 py-2.5 bg-white/80 hover:bg-white backdrop-blur-md text-slate-900 rounded-2xl text-sm font-black transition-all shadow-xl active:scale-95"
          >
            {isUploading === "cover" ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Camera size={18} />
            )}
            Thay ảnh bìa
          </button>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-6 relative">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-8 -mt-24 md:-mt-32 mb-10">
          <div className="relative group/avatar">
            <div className="p-2 bg-white rounded-[50px] shadow-2xl">
              <div className="relative w-40 h-40 md:w-56 md:h-56">
                <UserAvatar
                  user={user}
                  className="w-full h-full rounded-[42px] border-4 border-white object-cover"
                />
                {isUploading === "avatar" && (
                  <div className="absolute inset-0 bg-black/40 rounded-[42px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" size={40} />
                  </div>
                )}
              </div>
            </div>
            {isMe && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-4 right-4 p-4 bg-blue-600 text-white rounded-[24px] border-[6px] border-white shadow-2xl hover:bg-blue-700 transition-all hover:rotate-12"
              >
                <Camera size={24} />
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col md:flex-row justify-between items-center md:items-end pb-6 gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                  {user.full_name}
                </h1>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
                  <Check size={18} className="text-white stroke-[4px]" />
                </div>
              </div>
              <p className="text-blue-600 font-black text-xl">
                @{user.username}
              </p>
            </div>

            <div className="flex gap-4">
              {isMe ? (
                <button
                  onClick={onEditClick}
                  className="px-10 py-4 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-[24px] transition-all shadow-xl active:scale-95"
                >
                  Thiết lập hồ sơ
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  {/* NÚT KẾT NỐI HIỆN TẠI CỦA HÀO */}
                  <button
                    onClick={handleFollowToggle}
                    disabled={isProcessing}
                    className={`min-w-[180px] px-12 py-4 rounded-[24px] font-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                      isFollowing
                        ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 group"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } ${isProcessing ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : isFollowing ? (
                      <>
                        <span className="group-hover:hidden">Bạn bè</span>
                        <span className="hidden group-hover:inline">
                          Hủy kết bạn
                        </span>
                      </>
                    ) : (
                      "Thêm bạn bè"
                    )}
                  </button>

                  {/* ✅ NÚT CHẶN (BLOCK) MỚI THÊM */}
                  <button
                    onClick={handleBlockUser}
                    title="Chặn người dùng này"
                    className="p-4 bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded-[20px] transition-all shadow-sm active:scale-90 flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
