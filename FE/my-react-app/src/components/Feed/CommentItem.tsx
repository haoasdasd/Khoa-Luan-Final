import type { ApiComment } from "@/types/api";

import { useState, useRef, memo } from "react";
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Send,
  ImagePlus,
  X,
  Info,
  EyeOff,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ConfirmModal } from "@/components/Feed/ConfirmModal";
import { MediaDisplay } from "@/components/common/MediaDisplay";
import { CommentHeader } from "./CommentHeader";
import { CommentActions } from "./CommentActions";
import { UserAvatar } from "../common/UserAvatar";
import { usersResource } from "@/api";

interface CommentItemProps {
  comment: ApiComment;
  meId?: string;
  postAuthorId: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onReply: (id: string, content: string, mediaUrl?: string) => Promise<ApiComment | void>;
  onReact: (id: string, type: string) => void;
  onHide: (id: string) => void;
}

// ✅ Dùng memo để chặn re-render vô tận khi cha thay đổi
export const CommentItem = memo(function CommentItem({
  comment,
  meId,
  postAuthorId,
  onDelete,
  onUpdate,
  onReply,
  onReact,
  onHide,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [editValue, setEditValue] = useState(comment.content);
  const [replyValue, setReplyValue] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [replyPreview, setReplyPreview] = useState<string | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingReply, setIsUploadingReply] = useState(false);

  const [replies, setReplies] = useState<ApiComment[]>(comment.replies || []);
  const [showReplies, setShowReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  // ✅ Fix ID check cho cả trường hợp user_id hoặc author object
  const isMyComment = String(comment.author?.id || comment.user_id) === String(meId);
  const isPostAuthor = String(postAuthorId) === String(meId);
  const canManage = isMyComment || isPostAuthor;

  // ✅ Logic đếm chuẩn: Ưu tiên mảng local, sau đó đến số từ Backend
  const replyCount = replies.length > 0 ? replies.length : Number(comment.reply_count || 0);

  const handleLoadReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    if (replies.length > 0) {
      setShowReplies(true);
      return;
    }

    setIsLoadingReplies(true);
    try {
      const data = await usersResource.getCommentReplies(comment.id);
      const finalData = data;
      setReplies(finalData);
      setShowReplies(true);
    } catch (error) {
      console.error("Lỗi load replies:", error);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyValue.trim() && !replyFile) return;
    setIsUploadingReply(true);
    let finalUrl = "";

    try {
      if (replyFile) {
        const formData = new FormData();
        formData.append("file", replyFile);
        formData.append("upload_preset", "ml_default");
        const res = await fetch(`https://api.cloudinary.com/v1_1/dskrtvdcm/image/upload`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        finalUrl = data.secure_url;
      }

      // ✅ Nhận object reply mới từ onReply để update state tại chỗ
      const newReply = await onReply(comment.id, replyValue, finalUrl);

      setReplyValue("");
      setReplyFile(null);
      setReplyPreview(null);
      setIsReplying(false);

      if (newReply) {
        setReplies((prev) => [...prev, newReply]);
        setShowReplies(true);
      } else {
        // Fallback: Fetch lại nếu onReply không trả về data
        const data = await usersResource.getCommentReplies(comment.id);
        setReplies(data);
        setShowReplies(true);
      }
    } catch (error) {
      console.error("Lỗi gửi reply:", error);
    } finally {
      setIsUploadingReply(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReplyFile(file);
      setReplyPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className={`group/item flex flex-col gap-1 transition-all duration-500 ${comment.is_deleted ? "opacity-80" : ""}`}>
      <div className="flex gap-3 items-start">
        <UserAvatar
          user={comment.author}
          size={comment.parent_id ? "xs" : "sm"}
          className={comment.is_deleted ? "grayscale opacity-50" : "mt-1"}
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2 group/bubble relative">
              <div
                className={`px-4 py-2.5 rounded-2xl max-w-full break-words shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all ${
                  comment.is_deleted
                    ? "bg-slate-50 border border-slate-100 italic text-slate-400"
                    : "bg-slate-100 group-hover/bubble:bg-slate-200/70"
                }`}
              >
                {comment.is_deleted ? (
                  <div className="flex items-center gap-2 py-0.5">
                    <Info size={14} className="opacity-60" />
                    <span className="text-[13px] font-medium tracking-tight">Bình luận đã bị gỡ bỏ</span>
                  </div>
                ) : (
                  <CommentHeader
                    comment={comment}
                    postAuthorId={postAuthorId}
                    isEditing={isEditing}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    onUpdate={onUpdate}
                    setIsEditing={setIsEditing}
                  />
                )}
              </div>

              {!comment.is_deleted && !isEditing && (
                <div className="relative self-center">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 opacity-0 group-hover/bubble:opacity-100 hover:bg-slate-200 rounded-full transition-all text-slate-500"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-1.5">
                      {canManage ? (
                        <>
                          {isMyComment && (
                            <button
                              onClick={() => { setIsEditing(true); setShowMenu(false); }}
                              className="w-full px-4 py-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                            >
                              <Edit2 size={14} className="text-blue-500" /> Chỉnh sửa
                            </button>
                          )}
                          <button
                            onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}
                            className="w-full px-4 py-2 text-left text-[13px] font-semibold text-red-500 hover:bg-red-50 flex items-center gap-3"
                          >
                            <Trash2 size={14} /> {isPostAuthor && !isMyComment ? "Gỡ bình luận" : "Xóa"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { onHide(comment.id); setShowMenu(false); }}
                          className="w-full px-4 py-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                        >
                          <EyeOff size={14} className="text-slate-500" /> Ẩn bình luận
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!comment.is_deleted && comment.media_url && (
              <div className="ml-2 mt-2 w-fit group/cmt-media relative animate-in zoom-in-95 duration-300">
                <div className="max-w-[280px] rounded-2xl overflow-hidden ring-4 ring-white shadow-md">
                  <MediaDisplay url={comment.media_url} context="comment" />
                </div>
              </div>
            )}
          </div>

          {!comment.is_deleted && (
            <CommentActions
              comment={comment}
              onReact={onReact}
              isReplying={isReplying}
              toggleReply={() => {
                setIsReplying(!isReplying);
                setReplyValue(`@${comment.author?.full_name || ""} `);
              }}
              showReactions={showReactions}
              setShowReactions={setShowReactions}
            />
          )}

          {isReplying && (
            <div className="ml-2 mt-3 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col gap-2">
                {replyPreview && (
                  <div className="relative w-20 h-20 ml-2">
                    <img src={replyPreview} className="w-full h-full object-cover rounded-lg border-2 border-white shadow-sm" />
                    <button onClick={() => { setReplyFile(null); setReplyPreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <input type="file" ref={replyFileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  <button onClick={() => replyFileInputRef.current?.click()} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"><ImagePlus size={18}/></button>
                  <input
                    value={replyValue}
                    onChange={(e) => setReplyValue(e.target.value)}
                    placeholder="Viết phản hồi..."
                    className="flex-1 bg-transparent text-[13px] outline-none font-medium"
                    autoFocus
                  />
                  <button
                    onClick={handleReplySubmit}
                    disabled={isUploadingReply || (!replyValue.trim() && !replyFile)}
                    className="p-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-30"
                  >
                    {isUploadingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Nút Xem phản hồi nằm ngoài !is_deleted để chủ bài viết vẫn xem được con của cmt bị xóa */}
      {replyCount > 0 && (
        <div className="ml-12 mt-1">
          <button
            onClick={handleLoadReplies}
            className="text-[12px] font-black text-slate-500 hover:text-blue-600 flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-100 transition-all"
          >
            {isLoadingReplies ? (
              <Loader2 size={14} className="animate-spin text-blue-500" />
            ) : showReplies ? (
              <><ChevronUp size={14} /> Thu gọn phản hồi</>
            ) : (
              <><ChevronDown size={14} /> Xem {replyCount} phản hồi...</>
            )}
          </button>
        </div>
      )}

      {showReplies && replies.length > 0 && (
        <div className="ml-6 pl-6 border-l-2 border-slate-100 space-y-4 mt-2">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              meId={meId}
              postAuthorId={postAuthorId}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onReply={onReply}
              onReact={onReact}
              onHide={onHide}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => onDelete(comment.id)}
        title={isPostAuthor && !isMyComment ? "Gỡ bình luận này?" : "Xóa bình luận của bạn?"}
        message={isPostAuthor && !isMyComment ? "Bạn đang thực hiện quyền của chủ bài viết." : "Nội dung này không thể khôi phục."}
        type="danger"
      />
    </div>
  );
});