"use client";

import { useState, useMemo, useEffect } from "react";
import type { ApiMessage } from "@/types/api/chat.types";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatRelative } from "@/utils/format/date.utils";
import { MediaDisplay } from "@/components/common/MediaDisplay";
import {
  MoreHorizontal,
  Edit3,
  Undo2,
  Smile,
  Reply,
  X,
  Loader2,
} from "lucide-react";
import {
  REACTION_OPTIONS,
  REACTION_BY_LABEL,
} from "@/constants/reactions.constants";

interface ExtendedMessage extends ApiMessage {
  isSending?: boolean;
  isError?: boolean;
  thumbnail_url?: string;
}

interface MessageItemProps {
  message: ExtendedMessage;
  isMine: boolean;
  onReply?: (msg: ApiMessage) => void;
  onEdit?: (msg: ApiMessage) => void;
  onRevoke?: (msgId: string) => void;
  onReact?: (msgId: string, label: string) => void;
  onJump?: (id: string) => void;
  currentUserId?: string;
  isLastFromUser?: boolean;
}

export function MessageItem({
  message,
  isMine,
  onReply,
  onEdit,
  onRevoke,
  onReact,
  onJump,
  currentUserId,
  isLastFromUser,
}: MessageItemProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    const handleHighlight = (e: CustomEvent<{ messageId: string }>) => {
      if (e.detail?.messageId === message.id) {
        setIsHighlighted(true);
        setTimeout(() => setIsHighlighted(false), 2000);
      }
    };
    window.addEventListener("highlight-message", handleHighlight as EventListener);
    return () =>
      window.removeEventListener("highlight-message", handleHighlight as EventListener);
  }, [message.id]);

  const mediaList = useMemo(() => {
    if (!message.media_url) return [];
    return message.media_url.split(",").map((url) => url.trim());
  }, [message.media_url]);

  const isRevoked = !!message.deleted_at;

  // Đảm bảo reactionCounts tính toán lại khi message.reactions thay đổi
  const reactionCounts = useMemo(() => {
    if (!message.reactions) return {};
    return message.reactions.reduce<Record<string, number>>((acc, r) => {
      const label = r.reaction.toLowerCase();
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
  }, [message.reactions]);

  const renderMediaContent = () => {
    if (mediaList.length === 0 || isRevoked) return null;
    return (
      <div
        className={`grid gap-1 mb-1 ${mediaList.length === 1 ? "grid-cols-1 w-full max-w-[320px]" : "grid-cols-2 w-[280px]"}`}
      >
        {mediaList.map((url, index) => {
          if (index > 3) return null;
          const msgType = message.message_type as string;
          const isVideo =
            url.match(/\.(mp4|webm|ogg|mov)$/i) ||
            msgType === "video" ||
            msgType === "short_video";

          return (
            <div
              key={url + index}
              className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-900 aspect-auto shadow-sm group/media"
            >
              {isVideo ? (
                <div className="relative w-full h-full min-h-[180px] flex items-center justify-center bg-black">
                  <video
                    src={url}
                    preload="metadata"
                    playsInline
                    muted
                    controls={!message.isSending}
                    className={`w-full object-cover max-h-[300px] transition-opacity duration-500 ${message.isSending ? "opacity-60" : "opacity-100"}`}
                    onLoadedMetadata={(e) => {
                      e.currentTarget.currentTime = 0.1;
                    }}
                  />
                  {message.isSending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                      <Loader2
                        className="animate-spin text-white/80"
                        size={24}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="relative h-full w-full"
                  onClick={() => !message.isSending && setSelectedImage(url)}
                >
                  <MediaDisplay
                    url={url}
                    context="chat"
                    className={`w-full h-full object-cover ${message.isSending ? "blur-[2px] opacity-70" : ""}`}
                  />
                  {message.isSending && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2
                        className="animate-spin text-blue-500"
                        size={20}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderReactionControl = () => {
    if (isRevoked || message.isSending) return null;

    const hasAnyReaction = message.reactions && message.reactions.length > 0;
    const positionClass = isMine ? "-left-2" : "-right-2";

    return (
      <div
        className={`absolute -bottom-2 ${positionClass} z-40 flex items-center`}
      >
        {/* KHỐI 1: PILL TRẮNG (Chỉ hiện khi có reaction) */}
        {hasAnyReaction && (
          <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-sm px-1.5 py-0.5 rounded-full group/pill hover:scale-110 transition-all duration-200">
            <div className="flex items-center -space-x-0.5">
              {Object.keys(reactionCounts)
                .slice(0, 2)
                .map((label) => (
                  <div key={label} className="flex items-center">
                    <span className="text-[13px] leading-none">
                      {REACTION_BY_LABEL[label]?.emoji || "👍"}
                    </span>
                    {reactionCounts[label] > 1 && (
                      <span className="text-[9px] font-black text-slate-500 ml-0.5">
                        {reactionCounts[label]}
                      </span>
                    )}
                  </div>
                ))}
            </div>

            {/* Nút Smile thu nhỏ bên trong Pill khi đã có reaction (hiện khi hover vào pill) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker(!showEmojiPicker);
              }}
              className={`overflow-hidden transition-all duration-300 flex items-center justify-center w-0 opacity-0 group-hover/pill:w-4 group-hover/pill:opacity-100 group-hover/pill:ml-1 ${showEmojiPicker ? "text-blue-500" : "text-slate-400"}`}
            >
              <Smile size={13} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* KHỐI 2: NÚT SMILE ĐỘC LẬP (Chỉ hiện khi CHƯA có reaction và hover vào tin nhắn) */}
        {!hasAnyReaction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiPicker(!showEmojiPicker);
            }}
            className={`p-1.5 rounded-full bg-white shadow-md border border-slate-100 text-slate-400 hover:text-blue-500 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 ${showEmojiPicker ? "opacity-100 text-blue-500" : ""}`}
          >
            <Smile size={14} strokeWidth={2.5} />
          </button>
        )}

        {/* KHỐI 3: THANH CHỌN ICON (Selector) */}
        {showEmojiPicker && (
          <div
            className={`absolute bottom-[calc(100%+8px)] flex items-center gap-1 bg-white shadow-2xl border border-slate-100 p-1.5 rounded-full z-[100] animate-in fade-in slide-in-from-bottom-2 
              ${isMine ? "right-0 origin-right" : "left-0 origin-left"}`}
            style={{ minWidth: "max-content" }}
          >
            {REACTION_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={(e) => {
                  e.stopPropagation();
                  onReact?.(message.id, opt.label);
                  setShowEmojiPicker(false);
                }}
                className="hover:scale-150 transition-all p-1.5 text-xl leading-none active:scale-90"
              >
                {opt.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if ((message.message_type as string) === "system") {
    const isLeave = message.content?.toLowerCase().includes("rời khỏi");
    return (
      <div className="flex justify-center my-4 w-full animate-in fade-in text-center">
        <div
          className={`px-4 py-1 rounded-full text-[11px] font-bold shadow-sm border ${isLeave ? "bg-red-50 text-red-500 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col w-full mb-1 px-4 group relative ${isMine ? "items-end" : "items-start"}`}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      <div
        className={`flex items-end gap-2 w-full max-w-[85%] md:max-w-[75%] ${isMine ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isMine && (
          <div className="w-8 shrink-0 flex items-end">
            <UserAvatar
              user={message.sender}
              size="sm"
              className={`shadow-sm transition-all duration-300 ${!isLastFromUser ? "opacity-0" : "opacity-100"}`}
            />
          </div>
        )}

        <div className="relative group/bubble flex flex-col max-w-full">
          {message.reply_to && !isRevoked && (
            <div
              onClick={() => onJump?.(message.reply_to!.id)}
              className={`mb-1 p-2 rounded-xl border-l-4 cursor-pointer text-[11px] max-w-full transition-all hover:brightness-95 ${isMine ? "bg-slate-100 border-blue-400" : "bg-slate-200 border-slate-400"}`}
            >
              <p className="font-bold text-blue-600 truncate">
                {message.reply_to.sender?.full_name}
              </p>
              <p className="truncate opacity-70 italic text-slate-700 line-clamp-1">
                {message.reply_to.content || "[Đính kèm]"}
              </p>
            </div>
          )}

          {renderMediaContent()}

          {(message.content || isRevoked) && (
            <div
              className={`px-4 pt-2 pb-2.5 shadow-sm relative z-10 ${isMine ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm" : "bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-sm"} ${isRevoked ? "!bg-slate-50 !text-slate-400 italic border-slate-200" : ""} ${isHighlighted ? "ring-4 ring-blue-400/50 scale-[1.02]" : ""}`}
            >
              <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">
                {isRevoked ? "Tin nhắn đã bị thu hồi" : message.content}
              </p>
            </div>
          )}

          {/* 🔥 CHỈ GỌI MỘT HÀM REACTION DUY NHẤT Ở ĐÂY */}
          {renderReactionControl()}
        </div>

{/* Nút chức năng (Reply, Edit, More) */}
{!isRevoked && !message.isSending && (
  <div className={`
    flex items-center gap-1 
    transition-opacity duration-200 
    opacity-0 group-hover:opacity-100  /* Đảm bảo class 'group' ở div ngoài cùng hoạt động */
    z-50 mb-1
    ${isMine ? "flex-row-reverse" : "flex-row"}
  `}>
    {/* Nút Trả lời */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onReply?.(message);
      }}
      className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-500 transition-colors shadow-sm bg-white border border-slate-50"
      title="Trả lời"
    >
      <Reply size={16} className={isMine ? "" : "scale-x-[-1]"} />
    </button>

    {/* Nút Thêm (Sửa, Thu hồi) */}
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowActions(!showActions);
        }}
        className={`p-2 hover:bg-slate-100 rounded-full text-slate-400 shadow-sm bg-white border border-slate-50 ${showActions ? "text-blue-600 bg-slate-100" : ""}`}
      >
        <MoreHorizontal size={16} />
      </button>

      {/* Menu thả xuống */}
      {showActions && isMine && (
        <div className="absolute bottom-full right-0 mb-2 w-32 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-[120] animate-in fade-in slide-in-from-bottom-2">
          <button
            onClick={() => {
              onEdit?.(message);
              setShowActions(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Edit3 size={14} /> Sửa
          </button>
          <button
            onClick={() => {
              onRevoke?.(message.id);
              setShowActions(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
          >
            <Undo2 size={14} /> Thu hồi
          </button>
        </div>
      )}
    </div>
  </div>
)}
      </div>

{/* Phần thời gian và trạng thái Seen */}
<div className={`mt-1 flex items-center gap-2 mb-2 ${isMine ? "flex-row-reverse pr-1" : "flex-row pl-10"}`}>
  <span className="text-[10px] text-slate-400 font-bold tracking-tighter">
    {message.isSending 
      ? "Đang gửi..." 
      : formatRelative(message.created_at).charAt(0).toUpperCase() + formatRelative(message.created_at).slice(1)}
  </span>

  {/* 🔥 LOGIC MỚI: Chỉ hiện trạng thái cho tin nhắn CUỐI CÙNG của mình gửi */}
  {isMine && isLastFromUser && !isRevoked && !message.isSending && (
    <div className="flex items-center gap-1">
      {(() => {
        // Kiểm tra xem trong các status, có ai (không phải mình) đã "seen" chưa
        const isSeenByOther = message.statuses?.some(
          (s) => s.status === "seen" && String(s.user_id) !== String(currentUserId)
        );

        if (isSeenByOther) {
          return (
            <span className="text-[10px] font-black text-blue-500 animate-in fade-in duration-500">
              Đã xem
            </span>
          );
        }

        // Nếu chưa ai xem thì hiện "Đã gửi"
        return (
          <span className="text-[10px] font-black text-slate-300">
            Đã gửi
          </span>
        );
      })()}
    </div>
  )}
</div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/98 backdrop-blur-xl animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button className="absolute top-6 right-6 text-white/40 hover:text-white p-3 bg-white/5 rounded-full transition-all">
            <X size={32} />
          </button>
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-[95%] max-h-[90vh] object-contain shadow-2xl animate-in zoom-in-95 duration-300"
          />
        </div>
      )}
    </div>
  );
}
