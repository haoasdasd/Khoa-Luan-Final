

import { MoreHorizontal, Bookmark, EyeOff, Trash2 } from "lucide-react";
import { formatRelative } from "@/utils/format/date.utils";
import { getInitials, getAvatarGradient } from "@/utils/helpers/avatar.helpers";
import type { ApiPost } from "@/types/api";

interface PostHeaderProps {
  post: ApiPost;
  isSharedChild: boolean;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  onSave: () => void;
  onHide: () => void;
  onDelete: (id: string) => void;
  meId?: string;
}

const UserAvatar = ({ author, size }: { author: ApiPost["author"], size: "sm" | "md" }) => {
  const sizeClass = size === "sm" ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-xs";
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold shadow-sm overflow-hidden transition-all cursor-pointer hover:brightness-90 active:scale-95`}
      style={{ background: getAvatarGradient(author.full_name || "User") }}
    >
      {author.avatar_url ? (
        <img src={author.avatar_url} className="w-full h-full object-cover" alt="" />
      ) : (
        getInitials(author.full_name || "User")
      )}
    </div>
  );
};

export const PostHeader = ({ 
  post, 
  isSharedChild, 
  showMenu, 
  setShowMenu, 
  onSave, 
  onHide,
  onDelete,
  meId 
}: PostHeaderProps) => {
  const isMyPost = String(post.author.id) === String(meId);

  return (
    <div className={`${isSharedChild ? "p-3" : "p-4"} flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <UserAvatar author={post.author} size={isSharedChild ? "sm" : "md"} />
        <div className="flex flex-col">
          <h4 className={`${isSharedChild ? "text-sm" : "text-[15px]"} font-bold text-slate-900 leading-tight hover:text-blue-600 transition-colors cursor-pointer`}>
            {post.author.full_name}
          </h4>
          <time className="text-[10px] text-slate-400 font-medium">
            {formatRelative(post.created_at)}
          </time>
        </div>
      </div>

      {!isSharedChild && (
        <div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Tránh kích hoạt click vào post card
              setShowMenu(!showMenu);
            }} 
            className={`p-2 rounded-full transition-all ${showMenu ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
          >
            <MoreHorizontal size={18} />
          </button>
          
          {showMenu && (
            <>
              {/* Overlay vô hình để bấm ra ngoài là đóng menu */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)}
              ></div>

              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] z-50 py-1.5 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Nút Lưu */}
                <button 
                  onClick={() => { onSave(); setShowMenu(false); }} 
                  className={`w-full px-4 py-2.5 text-left text-[13px] flex items-center gap-3 transition-colors ${post.is_saved ? 'text-blue-600 bg-blue-50/50 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Bookmark size={16} fill={post.is_saved ? "currentColor" : "none"} className={post.is_saved ? "animate-in zoom-in duration-300" : ""} /> 
                  {post.is_saved ? "Đã lưu bài viết" : "Lưu bài viết"}
                </button>

                {/* Nút Ẩn (Chỉ bài người khác) */}
                {!isMyPost && (
                  <button 
                    onClick={() => { onHide(); setShowMenu(false); }} 
                    className="w-full px-4 py-2.5 text-left text-[13px] text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                  >
                    <EyeOff size={16} /> Ẩn bài viết này
                  </button>
                )}

                {/* Nút Xóa (Chỉ bài của mình) */}
                {isMyPost && (
                  <>
                    <div className="h-[1px] bg-slate-100 my-1 mx-2"></div>
                    <button 
                      onClick={() => { 
                        if(window.confirm("Xóa bài viết này?")) onDelete(post.id); 
                        setShowMenu(false); 
                      }} 
                      className="w-full px-4 py-2.5 text-left text-[13px] text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold"
                    >
                      <Trash2 size={16} /> Xóa bài viết
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};