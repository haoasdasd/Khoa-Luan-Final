"use client";

import { useRef, useLayoutEffect, useMemo, useCallback } from "react";
import { MessageItem } from "@/components/chat/MessageItem";
import type { ApiMessage } from "@/types/api/chat.types";
import { Loader2, MessageSquare } from "lucide-react";

interface MessageListProps {
  messages: ApiMessage[];
  currentUserId?: string;
  onReply: (msg: ApiMessage) => void;
  onEdit: (msg: ApiMessage) => void;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, label: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onJump?: (id: string) => void;
}

export default function MessageList({
  messages,
  currentUserId,
  onReply,
  onEdit,
  onRevoke,
  onReact,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onJump,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollHeight = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);

  const uniqueMessages = useMemo(() => {
    const map = new Map();
    messages.forEach((msg) => {
      if (msg.id) map.set(msg.id, msg);
    });
    return Array.from(map.values());
  }, [messages]);

  const handleJumpToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      window.dispatchEvent(new CustomEvent("highlight-message", { 
        detail: { messageId } 
      }));
    } else {
      onJump?.(messageId);
    }
  }, [onJump]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollDiff = container.scrollHeight - lastScrollHeight.current;

    if (!isFirstLoad.current && container.scrollTop < 100 && scrollDiff > 0) {
      container.style.scrollBehavior = "auto";
      container.scrollTop = scrollDiff;
      container.style.scrollBehavior = "smooth";
    } 
    else if (isFirstLoad.current || (container.scrollHeight > lastScrollHeight.current && container.scrollTop > container.scrollHeight - container.clientHeight - 200)) {
      container.style.scrollBehavior = "auto";
      container.scrollTop = container.scrollHeight;
      isFirstLoad.current = false;
    }

    lastScrollHeight.current = container.scrollHeight;
  }, [uniqueMessages]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container || isLoadingMore || !hasMore) return;

    if (container.scrollTop <= 5) {
      onLoadMore?.();
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-transparent custom-scrollbar scroll-smooth"
    >
      {hasMore && (
        <div className="flex justify-center py-2">
          {isLoadingMore ? (
            <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm border border-slate-100">
              <Loader2 className="animate-spin text-blue-500" size={18} />
            </div>
          ) : (
            <div className="h-4" /> 
          )}
        </div>
      )}

      {uniqueMessages.length === 0 && !isLoadingMore ? (
        <div className="flex h-full flex-col items-center justify-center text-slate-400 gap-3 opacity-60">
          <div className="p-4 bg-slate-50 rounded-full border border-slate-100">
             <MessageSquare className="text-slate-300" size={32} />
          </div>
          <p className="text-[11px] font-bold">Chưa có tin nhắn nào</p>
        </div>
      ) : (
        uniqueMessages.map((msg, index) => {
          const isMine = String(msg.sender?.id) === String(currentUserId);
          const nextMsg = uniqueMessages[index + 1];
          const isLastFromUser = !nextMsg || String(nextMsg.sender?.id) !== String(msg.sender?.id);

          return (
            <div 
              key={msg.id} 
              id={`message-${msg.id}`} 
              className="w-full"
            >
              <MessageItem
                message={msg}
                isMine={isMine}
                onJump={handleJumpToMessage}
                currentUserId={currentUserId}
                isLastFromUser={isLastFromUser}
                onReply={onReply}
                onEdit={onEdit}
                onRevoke={onRevoke}
                onReact={onReact}
              />
            </div>
          );
        })
      )}
    </div>
  );
}