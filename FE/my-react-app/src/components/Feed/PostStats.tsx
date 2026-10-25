import { ThumbsUp } from "lucide-react";
import { formatCount } from "@/utils/format/number.utils";
import { REACTION_BY_LABEL } from "@/constants/reactions.constants";
import type { ApiPost } from "@/types/api";

export const PostStats = ({ post, onToggleComments }: { post: ApiPost; onToggleComments: () => void }) => {
  if (post.like_count === 0 && post.comment_count === 0) return null;

  return (
    <div className="px-4 py-2 flex justify-between items-center text-[12px] text-slate-500 border-t border-slate-50">
      <div className="flex items-center gap-1.5">
        {post.like_count > 0 && (
          <div className="flex items-center">
            <div className="flex -space-x-1 relative mr-2 items-center">
              {post.top_reactions && post.top_reactions.length > 0 ? (
                post.top_reactions.map((type: string, index: number) => (
                  <div key={type} className="w-4 h-4 rounded-full flex items-center justify-center shadow-sm ring-1 ring-white bg-white overflow-hidden" style={{ zIndex: 3 - index }}>
                    {type.toLowerCase() === "like" ? (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white"><ThumbsUp size={10} fill="currentColor" /></div>
                    ) : (
                      <span className="text-[11px] leading-none">{REACTION_BY_LABEL[type.toLowerCase()]?.emoji }</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white ring-1 ring-white"><ThumbsUp size={10} fill="currentColor" /></div>
              )}
            </div>
            <span className="font-medium">{formatCount(post.like_count)}</span>
          </div>
        )}
      </div>
      {post.comment_count > 0 && (
        <button onClick={onToggleComments} className="hover:underline font-medium transition-colors">
          {formatCount(post.comment_count)} bình luận
        </button>
      )}
    </div>
  );
};