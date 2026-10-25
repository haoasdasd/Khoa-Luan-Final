import { useState, useRef, useCallback, useMemo } from "react";
import type { ApiPost } from "@/types/api";
import { Send, Loader2, ImagePlus, X, Lock, MessageCircle } from "lucide-react";
import { usePostActions } from "@/hooks/api/usePost";
import { useComments } from "@/hooks/api/useComments";
import { CommentItem } from "@/components/Feed/CommentItem";
import { useAuth } from "@/hooks/api/useAuth";
import { REACTION_BY_LABEL } from "@/constants/reactions.constants";
import { PostHeader } from "./PostHeader";
import { PostStats } from "./PostStats";
import { PostActions } from "./PostActions";
import { MediaDisplay } from "@/components/common/MediaDisplay";
import { UserAvatar } from "../common/UserAvatar";

export function PostCard({
  post,
  isSharedChild = false,
}: {
  post: ApiPost;
  isSharedChild?: boolean;
}) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [hasOpenedComments, setHasOpenedComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // State quản lý upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const {
    likePost,
    unlikePost,
    sharePost,
    hidePost,
    savePost,
    unsavePost,
    deletePost,
  } = usePostActions();

  const {
    comments,
    isLoading: loadingComments,
    addComment,
    deleteComment,
    updateComment,
    isCommenting,
    reactComment,
    hideComment,
  } = useComments(post.id, hasOpenedComments);

  const currentReaction = useMemo(() => {
    if (!post.is_liked) return REACTION_BY_LABEL.like;
    const type = post.reaction_type?.toLowerCase();
    return type && REACTION_BY_LABEL[type] ? REACTION_BY_LABEL[type] : REACTION_BY_LABEL.like;
  }, [post.reaction_type, post.is_liked]);

  const reactionColor = useMemo(
    () => post.is_liked && currentReaction ? currentReaction.color : "#64748b",
    [post.is_liked, currentReaction]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };
  const isSubmittingRef = useRef(false);
  const handleSendComment = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 1. CHẶN TỨC THÌ: Khóa bằng useRef và isCommenting
  if ((!commentText.trim() && !selectedFile) || isCommenting || isSubmittingRef.current) {
    return;
  }

  try {
    // 2. SẬP BẪY KHÓA: Đặt bằng true ngay lập tức để chặn các cú nhấn Enter tiếp theo
    isSubmittingRef.current = true;

    let finalUrl = "";
    if (selectedFile) {
      try {
        const type = selectedFile.type.startsWith("video") ? "video" : "image";
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("upload_preset", "ml_default");
        const res = await fetch(`https://api.cloudinary.com/v1_1/dskrtvdcm/${type}/upload`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.secure_url) finalUrl = data.secure_url;
      } catch (error) {
        console.error("Lỗi upload:", error);
        return;
      }
    }

    // 3. Gọi hàm tạo comment
    await addComment({ content: commentText, media_url: finalUrl });
    
    // 4. Xóa form sau khi thành công
    setCommentText("");
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

  } catch (error) {
    console.error("Lỗi gửi bình luận:", error);
  } finally {
    // 5. MỞ KHÓA: Chỉ mở lại cổng khi mọi tác vụ bất đồng bộ đã chạy xong
    isSubmittingRef.current = false;
  }
};

  const toggleComments = useCallback(() => {
    if (!hasOpenedComments) setHasOpenedComments(true);
    setShowComments((prev) => !prev);
  }, [hasOpenedComments]);

  const handleHidePost = useCallback(() => {
    if (window.confirm("Bạn có chắc chắn muốn ẩn bài viết này?")) {
      hidePost(post.id);
    }
  }, [hidePost, post.id]);

  const handleSaveToggle = useCallback(() => {
    if (post.is_saved) unsavePost(post.id);
    else savePost(post.id);
  }, [post.id, post.is_saved, savePost, unsavePost]);

  return (
    <article
      className={`bg-white transition-all duration-500 overflow-hidden ${
        isSharedChild
          ? "rounded-xl border border-slate-200 bg-slate-50/30"
          : "rounded-2xl shadow-sm border border-slate-100 mb-6 hover:shadow-md"
      }`}
    >
      {/* 1. Header */}
      <PostHeader
        post={post}
        isSharedChild={isSharedChild}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        onSave={handleSaveToggle}
        onHide={handleHidePost}
        onDelete={deletePost}
        meId={user?.id}
      />

      {/* Content */}
      {post.content && (
        <div className="px-5 pb-3">
          <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
            {post.content}
          </p>
        </div>
      )}

      {/* Media */}
      {post.media_url && (
        <div className="w-full pb-3">
          <MediaDisplay url={post.media_url} context="post" />
        </div>
      )}

      {/* Shared Post */}
      {post.shared_post && (
        <div className="px-5 pb-5 animate-in fade-in zoom-in-95 duration-500">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden shadow-sm">
            <div className="p-3 flex items-center gap-2 border-b border-slate-100 bg-white/50">
              <UserAvatar user={post.shared_post.author} size="xs" />
              <span className="text-[13px] font-bold text-slate-700">
                {post.shared_post.author?.full_name}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {post.shared_post.content && (
                <p className="text-[14px] text-slate-600 leading-relaxed">
                  {post.shared_post.content}
                </p>
              )}
              {post.shared_post.media_url && (
                <div className="rounded-xl overflow-hidden border">
                  <MediaDisplay url={post.shared_post.media_url} context="shared" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats & Actions */}
      {!isSharedChild && (
        <>
          <PostStats post={post} onToggleComments={toggleComments} />

          <div className="px-2">
            <PostActions
              post={post}
              currentReaction={currentReaction}
              reactionColor={reactionColor}
              onLike={() => {
                if (post.is_liked) unlikePost(post.id);
                else likePost({ postId: post.id, type: "like" });
              }}
              onReaction={(labelFromPicker: string) => {
                likePost({
                  postId: post.id,
                  type: labelFromPicker.toLowerCase(),
                });
              }}
              onToggleComments={toggleComments}
              onShare={() => {
                const content = prompt("Bạn muốn viết gì về bài chia sẻ này?");
                if (content !== null) sharePost({ postId: post.id, content });
              }}
              onSave={handleSaveToggle}
            />
          </div>

          {/* Comment Section */}
          {showComments && (
            <div className="border-t border-slate-50 bg-slate-50/40 p-4 rounded-b-2xl animate-in slide-in-from-top-3 duration-300">
              {loadingComments ? (
                <div className="flex flex-col items-center py-10 gap-3 opacity-40">
                  <Loader2 className="animate-spin text-blue-500" size={28} />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Đang tải thảo luận...</span>
                </div>
              ) : (
                <div className="space-y-5 max-h-[550px] overflow-y-auto custom-scrollbar pr-1 scroll-smooth">
                  {comments?.filter((c) => !c.parent_id).length === 0 ? (
                    <div className="py-8 text-center opacity-40">
                      <MessageCircle size={32} className="mx-auto mb-2" />
                      <p className="text-xs font-medium">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                    </div>
                  ) : (
                    comments?.filter((c) => !c.parent_id).map((c) => (
                      <CommentItem
                        key={c.id}
                        comment={c}
                        meId={user?.id}
                        postAuthorId={post.author.id}
                        onDelete={deleteComment}
                        onUpdate={(id: string, content: string) => updateComment({ id, content })}
                        onReply={(pid: string, content: string, media_url?: string) =>
                          addComment({ content, parent_id: pid, media_url })
                        }
                        onReact={(commentId: string, type: string) => reactComment({ commentId, type })}
                        onHide={hideComment}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Input Section */}
              <div className="mt-5 transition-all">
                {!post.is_locked ? (
                  <div className="space-y-3">
                    {previewUrl && (
                      <div className="relative w-24 h-24 mb-2 ml-4 group animate-in zoom-in-95">
                        <img src={previewUrl} className="w-full h-full object-cover rounded-xl border-4 border-white shadow-lg" />
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:scale-110 transition-transform"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleSendComment} className="flex gap-2 items-center bg-white p-2 pl-4 rounded-2xl border border-slate-200 focus-within:border-blue-400 transition-all shadow-sm">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-500 rounded-full">
                        <ImagePlus size={20} />
                      </button>
                      <input ref={commentInputRef} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Viết phản hồi công khai..." className="flex-1 text-[14px] outline-none bg-transparent font-medium" />
                      <button type="submit" disabled={isCommenting || (!commentText.trim() && !selectedFile)} className="p-2.5 bg-blue-600 text-white rounded-xl disabled:opacity-20 hover:bg-blue-700 active:scale-90 shadow-md">
                        {isCommenting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="py-4 px-6 bg-slate-100/80 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center gap-3 animate-in fade-in duration-500">
                    <div className="p-2 bg-slate-200 rounded-full"><Lock size={16} className="text-slate-500" /></div>
                    <div className="flex flex-col">
                      <p className="text-[13px] text-slate-600 font-bold">Tính năng bình luận đã đóng</p>
                      <p className="text-[11px] text-slate-400">Chủ bài viết đã hạn chế người có thể bình luận.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
}