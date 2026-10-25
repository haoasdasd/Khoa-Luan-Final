import type { ApiUser } from "@/types/api";


export const ProfileBio = ({ user }: { user: ApiUser }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
      <h3 className="text-lg font-black text-slate-900">Giới thiệu</h3>
      <p className="text-slate-600 leading-relaxed text-[15px]">
        {user.bio || "Người dùng này chưa viết gì về bản thân."}
      </p>
    </div>
  );
};