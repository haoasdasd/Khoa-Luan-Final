"use client";

import { memo } from "react";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatRelative } from "@/utils/format/date.utils";
import type { ApiConversation } from "@/types/api";

interface Props {
  conv: ApiConversation;
  isActive: boolean;
  currentUserId?: string;
  onClick: () => void;
}

export const ConversationItem = memo(({ conv, isActive, currentUserId, onClick }: Props) => {
  const otherMember = conv.members?.find(m => String(m.user.id) !== String(currentUserId));
  const displayUser = otherMember?.user;
  const isUnread = (conv.unread_count || 0) > 0 && !isActive;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3.5 cursor-pointer rounded-[24px] transition-all relative group mb-1 ${
        isActive ? "bg-slate-100 shadow-sm" : "hover:bg-slate-50"
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-blue-600 rounded-r-full shadow-sm shadow-blue-200" />
      )}
      
      <div className="relative shrink-0 transition-transform group-hover:scale-105">
        <UserAvatar user={displayUser} size="lg" />
        {conv.is_online && (
          <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-[3px] border-white rounded-full z-10 shadow-sm">
            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25"></span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <p className={`text-[14.5px] truncate transition-all ${isUnread ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
            {displayUser?.full_name}
          </p>
          <span className="text-[10px] font-black text-slate-400 tracking-tighter uppercase">
            {conv.last_message && formatRelative(conv.last_message.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[13px] truncate transition-all ${isUnread ? "font-black text-slate-800" : "font-bold text-slate-400"}`}>
            {String(conv.last_message?.sender.id) === String(currentUserId) && <span className="opacity-60 text-[11px]">Bạn: </span>}
            {conv.last_message?.content || ""}
          </p>
          {isUnread && (
            <div className="shrink-0 w-2.5 h-2.5 bg-blue-600 rounded-full shadow-lg shadow-blue-200" />
          )}
        </div>
      </div>
    </div>
  );
});

ConversationItem.displayName = "ConversationItem";