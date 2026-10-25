import { REACTION_BY_LABEL, REACTION_OPTIONS } from "@/constants/reactions.constants";
import { formatRelative } from "@/utils/format/date.utils";
import { ThumbsUp } from "lucide-react";

export const CommentActions = ({ 
  comment, 
  onReact, 
  toggleReply, 
  isReplying, 
  showReactions, 
  setShowReactions 
}: any) => (
  <div className="flex items-center gap-4 mt-1 ml-1">
    <span className="text-[10px] text-slate-400 font-medium lowercase">
      {formatRelative(comment.created_at)}
    </span>

    <div className="flex items-center gap-3">
      <div 
        className="relative py-1" 
        onMouseEnter={() => setShowReactions(true)} 
        onMouseLeave={() => setShowReactions(false)}
      >
        <button
          onClick={() => onReact(comment.id, "like")}
          className="text-[11px] font-bold transition-colors"
          style={{ 
            color: comment.is_liked 
              ? REACTION_BY_LABEL[comment.reaction_type?.toLowerCase() || 'like']?.color 
              : "#64748b" 
          }}
        >
          {comment.is_liked ? REACTION_BY_LABEL[comment.reaction_type?.toLowerCase()]?.label : "Thích"}
        </button>

        {showReactions && (
          <div className="absolute bottom-full left-0 z-50 pb-3 animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-200">
            <div className="bg-white shadow-xl border border-slate-100 rounded-full px-2 py-1.5 flex gap-1.5 backdrop-blur-md">
              {REACTION_OPTIONS.map((r) => (
                <button 
                  key={r.label} 
                  onClick={() => { onReact(comment.id, r.label.toLowerCase()); setShowReactions(false); }} 
                  className="text-xl hover:scale-150 transition-all p-1"
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={toggleReply} 
        className={`text-[11px] font-bold transition-colors ${isReplying ? "text-blue-600" : "text-slate-500 hover:text-blue-600"}`}
      >
        Phản hồi
      </button>
    </div>

    {/* Phần hiển thị icon tổng hợp */}
    {comment.like_count > 0 && (
      <div className="flex items-center gap-1 bg-white border border-slate-100 px-1.5 py-0.5 rounded-full shadow-sm">
        <div className="flex -space-x-1 items-center">
          {/* ĐÃ FIX LỖI TS TẠI ĐÂY: type: string, index: number */}
          {comment.top_reactions && comment.top_reactions.length > 0 ? (
            comment.top_reactions.map((type: string, index: number) => (
              <div 
                key={`${type}-${index}`} 
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center bg-white ring-1 ring-white" 
                style={{ zIndex: 5 - index }}
              >
                {type.toLowerCase() === 'like' ? (
                  <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center text-white">
                    <ThumbsUp size={8} fill="currentColor" />
                  </div>
                ) : (
                  <span className="text-[10px] leading-none">
                    {REACTION_BY_LABEL[type.toLowerCase()]?.emoji}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              {comment.reaction_type && comment.reaction_type.toLowerCase() !== 'like' ? (
                <span className="text-[10px] leading-none">
                  {REACTION_BY_LABEL[comment.reaction_type.toLowerCase()]?.emoji}
                </span>
              ) : (
                <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center text-white ring-1 ring-white">
                  <ThumbsUp size={8} fill="currentColor" />
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-600 ml-0.5">
          {comment.like_count}
        </span>
      </div>
    )}
  </div>
);