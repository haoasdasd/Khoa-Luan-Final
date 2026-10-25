import type { ApiPost } from "@/types/api";
import type { ReactionOption } from "@/types/ui";

import {
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  BookmarkCheck,
  Loader2,
} from "lucide-react";
import { REACTION_OPTIONS } from "@/constants/reactions.constants";

interface PostActionsProps {
  post: ApiPost;
  isLiking?: boolean;
  isSharing?: boolean;
  currentReaction: ReactionOption;
  reactionColor: string;
  likedAnimation?: boolean;
  onLike: () => void;
  onReaction: (label: string) => void;
  onToggleComments: () => void;
  onShare: () => void;
  onSave: () => void;
}

export const PostActions = ({
  post,
  isLiking,
  isSharing,
  currentReaction,
  reactionColor,
  likedAnimation,
  onLike,
  onReaction,
  onToggleComments,
  onShare,
  onSave,
}: PostActionsProps) => {
  return (
    <div className="px-2 py-1 flex items-center gap-1 border-t border-slate-100">
      {/* Nút Like & Reaction Picker */}
      <div className="relative flex-1 py-1 group/like">
        <button
          onClick={onLike}
          disabled={isLiking}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${likedAnimation ? "animate-bounce-in" : ""}`}
          style={{ color: post.is_liked ? reactionColor : "#64748b" }}
        >
          {/* Logic hiển thị Emoji/Icon cực kỳ quan trọng */}
          {post.is_liked ? (
            <span className="text-lg animate-in zoom-in duration-300">
              {/* Ưu tiên dùng Emoji từ currentReaction truyền từ cha xuống */}
              {currentReaction?.emoji || "👍"}
            </span>
          ) : (
            <ThumbsUp size={18} />
          )}

          {/* Hiển thị Label (Haha, Tim, Thích...) */}
          <span>
            {post.is_liked ? currentReaction?.label || "Thích" : "Thích"}
          </span>
        </button>

        {/* Hover để hiện Reaction Picker */}
        <div className="absolute bottom-full left-0 z-50 pb-3 hidden group-hover/like:block animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-200">
          <div className="bg-white shadow-xl border border-slate-100 rounded-full px-2 py-1.5 flex gap-1 backdrop-blur-md bg-white/90">
            {REACTION_OPTIONS.map((r) => (
              <button
                key={r.label}
                onClick={() => onReaction(r.label)} // Đảm bảo r.label truyền vào đây là "Love", "Haha"...
                className="text-2xl hover:scale-150 hover:-translate-y-1 transition-all p-1.5"
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onToggleComments}
        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50"
      >
        <MessageCircle size={18} /> <span>Bình luận</span>
      </button>

      <button
        onClick={onShare}
        disabled={isSharing}
        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50"
      >
        {isSharing ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Share2 size={18} />
        )}{" "}
        <span>Chia sẻ</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onSave(); // Gọi hàm onSave truyền từ PostCard xuống
        }}
        className={`p-2 rounded-xl transition-all active:scale-90 ${
          post.is_saved
            ? "text-amber-500 bg-amber-50"
            : "text-slate-400 hover:bg-slate-50"
        }`}
      >
        {post.is_saved ? (
          <BookmarkCheck size={18} fill="currentColor" />
        ) : (
          <Bookmark size={18} />
        )}
      </button>
    </div>
  );
};
