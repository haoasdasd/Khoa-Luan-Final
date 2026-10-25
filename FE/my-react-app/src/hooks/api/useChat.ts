"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { chatResource } from "@/api";
import type { ApiMessage, ApiConversation } from "@/types/api/chat.types";
import { socketInstance } from "@/api/socket.instance";
import { useAuth } from "./useAuth";

/* =========================
   TYPES
========================= */

type TypingState =
  | false
  | {
      user_id: string;
      full_name: string;
    };

interface UseChatReturn {
  messages: ApiMessage[];
  conversation: ApiConversation | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  isPartnerTyping: TypingState;

  sendMessage: (
    content: string,
    files?: File[],
    replyToId?: string,
  ) => Promise<void>;
  loadMore: () => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  reactMessage: (messageId: string, reaction: string) => Promise<void>;
  deleteMessage: (
    messageId: string,
    mode: "revoke" | "delete_for_me",
  ) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  refreshConversation: () => Promise<void>;
}

/* =========================
   HOOK
========================= */

export function useChat(convId: string | undefined): UseChatReturn {
  const { user } = useAuth();

  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [conversation, setConversation] = useState<ApiConversation | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isPartnerTyping, setIsPartnerTyping] = useState<TypingState>(false);

  const convIdRef = useRef(convId);
  // 🔥 Dùng Ref để lưu trữ conversation, giúp Socket không bị render lại khi có tin nhắn mới
  const convRef = useRef<ApiConversation | null>(null);
  const limit = 20;

  useEffect(() => {
    convIdRef.current = convId;
  }, [convId]);

  useEffect(() => {
    convRef.current = conversation;
  }, [conversation]);

  /* =========================
     LOAD CONVERSATION DETAIL
  ========================= */

  const loadConversationDetail = useCallback(async () => {
    if (!convId || convId === "undefined") return;

    try {
      const data = await chatResource.getConversationDetail(convId);
      setConversation(data);
    } catch (error) {
      console.error("Failed to load conversation detail:", error);
    }
  }, [convId]);

  /* =========================
     LOAD MESSAGES
  ========================= */

  const loadMessages = useCallback(
    async (isLoadMore = false) => {
      if (!convId || convId === "undefined") return;

      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const currentOffset = isLoadMore ? messages.length : 0;

        const data = await chatResource.messages(convId, {
          offset: currentOffset,
          limit,
        });

        const newMessages = [...data].reverse();

        if (isLoadMore) {
          setMessages((prev) => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
        }

        setHasMore(data.length === limit);
      } catch (error) {
        console.error("Load messages error:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [convId, messages.length],
  );

  const loadMore = useCallback(async () => {
    if (!isLoadingMore && hasMore) {
      await loadMessages(true);
    }
  }, [isLoadingMore, hasMore, loadMessages]);

  /* =========================
     INIT 
  ========================= */

  useEffect(() => {
    if (!convId || convId === "undefined") {
      setMessages([]);
      setConversation(null);
      setHasMore(true);
      return;
    }

    loadMessages();
    loadConversationDetail();
    setIsPartnerTyping(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId]);

  /* =========================
     SOCKET LISTENER
  ========================= */

  useEffect(() => {
    if (!convId || convId === "undefined") return;

    const unsubscribe = socketInstance.on((event: any) => {
      const { event: eventName, data: eventData } = event;
      const eventUserId = eventData?.user_id || event.user_id;

      if (eventName === "user_online" || eventName === "user_offline") {
        const isOnline = eventName === "user_online";

        setConversation((prev) => {
          if (!prev) return prev;

          if (
            prev.type === "private" &&
            prev.members.some((m) => String(m.user.id) === String(eventUserId))
          ) {
            return { ...prev, is_online: isOnline };
          }

          return {
            ...prev,
            members: prev.members.map((m) =>
              String(m.user.id) === String(eventUserId)
                ? { ...m, user: { ...m.user, is_online: isOnline } }
                : m,
            ),
          };
        });
        return;
      }

      const eventConvId = String(
        event.conversation_id || eventData?.conversation_id || "",
      );
      if (eventConvId !== String(convIdRef.current)) return;

      switch (eventName) {
        case "new_message": {
          setMessages((prev) => {
            if (prev.some((m) => m.id === eventData.id)) return prev;
            const filtered = prev.filter(
              (m) => !((m as any).isSending && m.content === eventData.content),
            );
            return [...filtered, eventData];
          });
          // Nếu có tin nhắn mới, chắc chắn người kia đã ngừng gõ
          setIsPartnerTyping(false);
          break;
        }

        case "message_reaction_updated": {
          setMessages((prev) =>
            prev.map((m) =>
              String(m.id) === String(eventData.message_id)
                ? { ...m, reactions: eventData.reactions }
                : m,
            ),
          );
          break;
        }

        case "message_seen": {
          const seenUserId = eventData?.user_id || event.user_id;
          const seenAt = eventData?.seen_at || event.seen_at;

          setMessages((prev) =>
            prev.map((m) => {
              if (String(m.sender.id) !== String(user?.id)) return m;
              const alreadySeen = m.statuses?.some(
                (s) => String(s.user_id) === String(seenUserId),
              );
              if (alreadySeen) return m;

              return {
                ...m,
                statuses: [
                  ...(m.statuses || []),
                  { user_id: seenUserId, status: "seen", seen_at: seenAt },
                ],
              };
            }),
          );
          break;
        }

        // 🔥 FIX TRIỆT ĐỂ LỖI LOGIC REACT ANTI-PATTERN
        case "typing": {
          if (String(eventUserId) === String(user?.id)) return;

          // Phải check biến is_typing từ Backend gửi về
          if (eventData?.is_typing) {
            const member = convRef.current?.members?.find(
              (m) => String(m.user.id) === String(eventUserId),
            );
            setIsPartnerTyping({
              user_id: String(eventUserId),
              full_name: member?.user.full_name || "Ai đó",
            });
          } else {
            // Nếu is_typing = false -> Tắt trạng thái đang gõ
            setIsPartnerTyping(false);
          }
          break;
        }
        case "typing_stop": {
          if (String(eventUserId) === String(user?.id)) return;

          setIsPartnerTyping((prev) => {
            // Chỉ tắt nếu cái người vừa stop CHÍNH LÀ người đang hiện chữ "đang nhập"
            if (prev && String(prev.user_id) === String(eventUserId)) {
              return false;
            }
            return prev;
          });
          break;
        }

        case "message_edited": {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === eventData.id
                ? { ...m, ...eventData, isSending: false }
                : m,
            ),
          );
          break;
        }

        case "message_deleted": {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === eventData.message_id
                ? {
                    ...m,
                    deleted_at: eventData.deleted_at,
                    content: "Tin nhắn đã bị thu hồi",
                    media_url: null,
                  }
                : m,
            ),
          );
          break;
        }
      }
    });

    return () => {
      unsubscribe();
      setIsPartnerTyping(false);
    };
  }, [convId, user?.id]);

  /* =========================
     AUTO SEEN 
  ========================= */

  useEffect(() => {
    if (!convId || messages.length === 0 || !user) return;

    const lastMsg = messages[messages.length - 1];
    if (String(lastMsg.sender.id) === String(user.id)) return;

    const alreadySeen = lastMsg.statuses?.some(
      (s) => String(s.user_id) === String(user.id) && s.status === "seen",
    );

    if (alreadySeen) return;

    // TÌM ĐOẠN NÀY:
    const timer = setTimeout(() => {
      socketInstance.send({
        event: "mark_seen",
        data: { conversation_id: convId },
      });
      // Tự đánh dấu "seen" ở máy mình để ngắt vòng lặp gọi API vô tận
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];

        // Nếu chưa có trạng thái seen của mình thì thêm vào
        if (
          !lastMsg.statuses?.some((s) => String(s.user_id) === String(user.id))
        ) {
          newMessages[newMessages.length - 1] = {
            ...lastMsg,
            statuses: [
              ...(lastMsg.statuses || []),
              {
                user_id: user.id,
                status: "seen",
                seen_at: new Date().toISOString(),
              },
            ],
          };
        }
        return newMessages;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [convId, messages, user]);

  /* =========================
     SEND MESSAGE
  ========================= */

  const sendMessage = useCallback(
    async (content: string, files?: File[], replyToId?: string) => {
      if (!content.trim() && (!files || files.length === 0)) return;
      if (!convId || !user) return;

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: any = {
        id: tempId,
        content: content.trim(),
        media_url: files
          ? files.map((f) => URL.createObjectURL(f)).join(",")
          : undefined,
        message_type: files?.[0]?.type.startsWith("video")
          ? "video"
          : files && files.length > 0
            ? "image"
            : "text",
        sender: user,
        created_at: new Date().toISOString(),
        isSending: true,
        reply_to: replyToId
          ? messages.find((m) => m.id === replyToId) || null
          : null,
        reactions: [],
        statuses: [],
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        let finalMediaUrls = "";
        if (files && files.length > 0) {
          const { mediaResource } =
            await import("@/api/resources/media.resource");
          const uploadResults = await Promise.all(
            files.map((file) => mediaResource.upload_file(file)),
          );
          finalMediaUrls = uploadResults.map((res) => res.url).join(",");
        }

        socketInstance.send({
          event: "send_message",
          data: {
            conversation_id: convId,
            content: content.trim(),
            media_url: finalMediaUrls,
            reply_to_id: replyToId,
            message_type: optimisticMsg.message_type,
          },
        });
      } catch (error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, isSending: false, isError: true } : m,
          ),
        );
      }
    },
    [convId, user, messages],
  );

  const reactMessage = async (messageId: string, type: string) => {
    // Giữ nguyên logic React của Hào
    if (!user) return;
    const previousMessages = [...messages];
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const myOldReact = msg.reactions?.find(
            (r) => String(r.user_id) === String(user.id),
          );
          let newReactions = [...(msg.reactions || [])];
          if (
            myOldReact &&
            myOldReact.reaction.toLowerCase() === type.toLowerCase()
          ) {
            newReactions = newReactions.filter(
              (r) => String(r.user_id) !== String(user.id),
            );
          } else if (myOldReact) {
            newReactions = newReactions.map((r) =>
              String(r.user_id) === String(user.id)
                ? { ...r, reaction: type }
                : r,
            );
          } else {
            newReactions.push({
              user_id: user.id,
              reaction: type,
              created_at: new Date().toISOString(),
            });
          }
          return { ...msg, reactions: newReactions };
        }
        return msg;
      }),
    );
    try {
      await chatResource.reactMessage(messageId, type);
    } catch (error) {
      setMessages(previousMessages);
    }
  };

  const deleteMessage = async (
    messageId: string,
    mode: "revoke" | "delete_for_me",
  ) => {
    if (mode === "delete_for_me") {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } else {
      try {
        await chatResource.deleteMessage(messageId);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: newContent, isSending: true }
            : m,
        ),
      );
      await chatResource.editMessage(messageId, newContent);
    } catch (error) {
      console.error(error);
    }
  };

  /* =========================
     TYPING
  ========================= */
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!convId) return;
      socketInstance.send({
        event: isTyping ? "typing_start" : "typing_stop",
        data: { conversation_id: convId },
      });
    },
    [convId],
  );

  return {
    messages,
    conversation,
    isLoading,
    isLoadingMore,
    hasMore,
    isPartnerTyping,
    sendMessage,
    loadMore,
    sendTyping,
    reactMessage,
    deleteMessage,
    editMessage,
    refreshConversation: loadConversationDetail,
  };
}
