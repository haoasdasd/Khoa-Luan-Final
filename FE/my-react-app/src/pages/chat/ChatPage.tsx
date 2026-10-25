"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useChat } from "@/hooks/api/useChat";
import { useAuth } from "@/hooks/api/useAuth";
import { useCallSystem } from "@/context/CallContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiMessage, ApiConversation } from "@/types/api";
import Sidebar from "@/components/chat/Sidebar";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import AddMemberModal from "@/components/chat/AddMemberModal";
import {
  Phone,
  Video,
  Info,
  Loader2,
  MessageSquare,
  UserPlus,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { UserAvatar } from "@/components/common/UserAvatar";
import { chatResource } from "@/api";
import { toast } from "sonner";

export default function ChatPage() {
  const [replyingMessage, setReplyingMessage] = useState<ApiMessage | null>(
    null,
  );
  const [isAddModalOpen, setIsAddMemberOpen] = useState(false);

  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const convId = params?.convId as string;
  const targetUserIdFromUrl = searchParams.get("u");

  const { user } = useAuth();
  const { startCall } = useCallSystem();

  const { data: strangerConv, isLoading: isCreatingConv } = useQuery({
    queryKey: ["conversation", "private", targetUserIdFromUrl],
    queryFn: () => chatResource.getOrCreatePrivate(targetUserIdFromUrl!),
    enabled: !!targetUserIdFromUrl && !convId,
  });

  useEffect(() => {
    if (strangerConv?.id) {
      queryClient.invalidateQueries({ queryKey: ["conversations", "all"] });
      navigate(`/chat/${strangerConv.id}`, { replace: true });
    }
  }, [strangerConv, navigate, queryClient]);

  const {
    messages,
    loadMore,
    hasMore,
    isLoadingMore,
    sendMessage,
    sendTyping,
    conversation: detailConversation,
    isLoading: isLoadingMessages,
    isPartnerTyping,
    reactMessage,
    deleteMessage,
    editMessage,
  } = useChat(convId);

  const cachedConversation = useMemo(() => {
    if (!convId) return null;
    const all = queryClient.getQueryData<ApiConversation[]>([
      "conversations",
      "all",
    ]);
    return all?.find((c) => String(c.id) === String(convId));
  }, [convId, queryClient]);

  const conversation = detailConversation || cachedConversation;

  const targetUser = useMemo(() => {
    if (!conversation) return null;
    return conversation.members?.find(
      (m: any) => String(m.user.id) !== String(user?.id),
    )?.user;
  }, [conversation, user?.id]);

  const myMemberInfo = useMemo(() => {
    return conversation?.members?.find(
      (m: any) => String(m.user.id) === String(user?.id),
    );
  }, [conversation, user?.id]);

  const isAccepted = myMemberInfo?.is_accepted !== false;

  const isGroupOnline = useMemo(() => {
    if (!conversation) return false;
    if (conversation.type !== "group") return conversation.is_online;
    return conversation.members?.some(
      (m: any) => String(m.user.id) !== String(user?.id) && m.user.is_online,
    );
  }, [conversation, user?.id]);

  const typingUserFullName = useMemo(() => {
    if (!isPartnerTyping || typeof isPartnerTyping !== "object") return null;
    const member = conversation?.members?.find(
      (m: any) => String(m.user.id) === String(isPartnerTyping.user_id),
    );
    return member?.user?.full_name;
  }, [isPartnerTyping, conversation]);

  const handleJumpToMessage = useCallback((messageId: string) => {
    console.log("Nhảy tới tin nhắn:", messageId);
  }, []);

  const handleSelectUserToGroup = async (selectedFriendIds: string[]) => {
    try {
      if (conversation?.type === "private") {
        // ✅ VÁ LỖI 1: Gom cả ID của Hào (user?.id), bạn cũ (targetUser?.id) và bạn mới vào nhóm
        const memberIds = [
          user?.id,
          targetUser?.id,
          ...selectedFriendIds,
        ].filter(Boolean) as string[];

        const newGroup = await chatResource.create({
          name: `Nhóm của ${user?.full_name || "tôi"}`,
          type: "group",
          member_ids: memberIds,
        });

        toast.success("Đã tạo nhóm mới");
        navigate(`/chat/${newGroup.id}`);
      } else {
        await chatResource.addMembers(convId, selectedFriendIds);
        toast.success(`Đã thêm ${selectedFriendIds.length} thành viên`);
      }

      // Đống invalidate này chuẩn vì tạo nhóm/thêm người là hành động tĩnh (HTTP), cần fetch lại data mới
      queryClient.invalidateQueries({ queryKey: ["conversations", "all"] });

      // ✅ VÁ LỖI 2: Đảm bảo trùng khớp với Query Key lấy chi tiết phòng chat của Hào
      queryClient.invalidateQueries({ queryKey: ["conversations", convId] });
    } catch (e) {
      toast.error("Thao tác thất bại");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Bạn có chắc muốn rời khỏi nhóm này?")) return;
    try {
      await chatResource.leaveGroup(convId);
      toast.success("Đã rời nhóm thành công");
      navigate("/chat");
      queryClient.invalidateQueries({ queryKey: ["conversations", "all"] });
    } catch (e) {
      toast.error("Không thể rời nhóm");
    }
  };

  const handleAcceptChat = async () => {
    const t = toast.loading("Đang chấp nhận...");
    try {
      await chatResource.acceptRequest(convId);

      // 🔥 BƯỚC QUAN TRỌNG: Cập nhật lại cache ngay lập tức
      // 1. Làm mới danh sách hội thoại ở Sidebar
      await queryClient.invalidateQueries({
        queryKey: ["conversations", "all"],
      });

      // 2. Làm mới chi tiết hội thoại hiện tại để cập nhật biến isAccepted
      await queryClient.invalidateQueries({
        queryKey: ["conversation", convId],
      });

      // 3. (Tùy chọn) Nếu muốn mượt hơn nữa, bạn có thể setQueryData thủ công
      // nhưng invalidateQueries là đủ để React Query tự fetch lại và đổi UI rồi.

      toast.success("Đã chấp nhận lời mời", { id: t });
    } catch (e) {
      toast.error("Thao tác thất bại", { id: t });
      console.error(e);
    }
  };

  const isLoading = isLoadingMessages || isCreatingConv;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-[15px]">
      <aside
        className={`w-80 shrink-0 border-r border-slate-100 ${convId ? "hidden md:block" : "block w-full md:w-80"}`}
      >
        <Sidebar />
      </aside>

      <main
        className={`flex-1 flex flex-col min-w-0 bg-white relative ${!convId && !targetUserIdFromUrl ? "hidden md:flex" : "flex"}`}
      >
        {convId || targetUserIdFromUrl ? (
          <>
            <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-100 shadow-sm bg-white/95 backdrop-blur-md shrink-0 z-20">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <button
                  onClick={() => navigate("/chat")}
                  className="md:hidden p-1 -ml-1 hover:bg-slate-100 rounded-full text-slate-500"
                >
                  <ChevronLeft size={24} />
                </button>
                {conversation ? (
                  <>
                    <div className="relative shrink-0">
                      <UserAvatar
                        user={targetUser}
                        size="md"
                        className="ring-2 ring-slate-50"
                      />
                      {isGroupOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full ring-1 ring-black/5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-slate-800 truncate text-[15px] md:text-[16px]">
                        {conversation.type === "group"
                          ? conversation.name
                          : targetUser?.full_name}
                      </h2>
                      <div className="flex items-center gap-1.5">
                        {isAccepted ? (
                          conversation.type === "group" ? (
                            <p className="text-[12px] font-medium text-slate-500">
                              {conversation.members?.length} thành viên
                              {isGroupOnline && (
                                <span className="text-green-500 ml-1">
                                  • Đang hoạt động
                                </span>
                              )}
                            </p>
                          ) : (
                            <p
                              className={`text-[12px] font-medium ${isGroupOnline ? "text-green-500" : "text-slate-500"}`}
                            >
                              {isGroupOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                            </p>
                          )
                        ) : (
                          <p className="text-[12px] font-bold text-amber-500 tracking-tight">
                            Lời mời kết nối
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-100" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 bg-slate-100 rounded" />
                      <div className="h-2 w-20 bg-slate-50 rounded" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-0.5 md:gap-1">
                {isAccepted && conversation && (
                  <>
                    <button
                      onClick={() => setIsAddMemberOpen(true)}
                      className="p-2 md:p-2.5 hover:bg-blue-50 rounded-full text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      <UserPlus size={20} />
                    </button>
                    {conversation.type === "group" && (
                      <button
                        onClick={handleLeaveGroup}
                        className="p-2 md:p-2.5 hover:bg-red-50 rounded-full text-slate-500 hover:text-red-500 transition-colors"
                      >
                        <LogOut size={20} />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        startCall(targetUser!.id, targetUser!.full_name, convId)
                      }
                      className="p-2 md:p-2.5 hover:bg-slate-100 rounded-full text-slate-500"
                    >
                      <Phone size={20} />
                    </button>
                    <button
                      onClick={() =>
                        startCall(targetUser!.id, targetUser!.full_name, convId)
                      }
                      className="p-2 md:p-2.5 hover:bg-slate-100 rounded-full text-slate-500"
                    >
                      <Video size={22} />
                    </button>
                  </>
                )}
                <button className="p-2 md:p-2.5 hover:bg-slate-100 rounded-full text-slate-500">
                  <Info size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-[#f8f9fa]">
              {isLoading && messages.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <Loader2
                    className="animate-spin text-blue-500 mb-4"
                    size={32}
                  />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Đang kết nối...
                  </p>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  currentUserId={user?.id}
                  onReply={setReplyingMessage}
                  onEdit={(msg) =>
                    editMessage(
                      msg.id,
                      window.prompt("Sửa tin nhắn:", msg.content || "") || "",
                    )
                  }
                  onRevoke={(id) => deleteMessage(id, "revoke")}
                  onDelete={(id) => deleteMessage(id, "delete_for_me")}
                  onReact={reactMessage}
                  onJump={handleJumpToMessage}
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={loadMore}
                />
              )}
              {isPartnerTyping && (
                <div className="absolute bottom-4 left-6 z-20 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white/90 backdrop-blur shadow-sm border border-slate-100 px-3 py-1.5 rounded-2xl flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                    </div>

                    <p className="text-[11px] text-blue-600 font-bold tracking-tighter">
                      {conversation?.type === "group"
                        ? typingUserFullName
                          ? `${typingUserFullName} đang nhập...`
                          : "Ai đó đang nhập..."
                        : `${targetUser?.full_name || "Đối phương"} đang nhập...`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <footer className="bg-white border-t border-slate-100 shrink-0">
              {isAccepted ? (
                <div className="max-w-6xl mx-auto w-full p-2 md:p-4">
                  <ChatInput
                    sendMessage={sendMessage}
                    sendTyping={sendTyping}
                    replyingMessage={replyingMessage}
                    onCancelReply={() => setReplyingMessage(null)}
                  />
                </div>
              ) : (
                <div className="p-4 md:p-8 bg-slate-50/50 flex flex-col items-center gap-4">
                  <div className="flex flex-col items-center text-center max-w-sm">
                    <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                      Cẩn thận với người lạ!!!
                    </p>
                    <p className="text-[12px] text-slate-500 mt-1">
                      Chấp nhận để bắt đầu trò chuyện với{" "}
                      <b>{targetUser?.full_name}</b>.
                    </p>
                  </div>
                  <div className="flex gap-3 w-full max-w-xs">
                    <button
                      onClick={handleAcceptChat}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold text-[12px] uppercase hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <UserPlus size={16} /> Chấp nhận
                    </button>
                    <button
                      onClick={() => navigate("/chat")}
                      className="flex-1 bg-white border border-slate-200 text-slate-500 py-3 rounded-2xl font-bold text-[12px] uppercase hover:bg-slate-50 transition-all active:scale-95"
                    >
                      Bỏ qua
                    </button>
                  </div>
                </div>
              )}
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f8f9fa]">
            <div className="w-20 h-20 bg-white rounded-[32px] shadow-xl shadow-blue-100/50 flex items-center justify-center mb-6 border border-slate-50">
              <MessageSquare className="text-blue-500 opacity-20" size={40} />
            </div>
            <h1 className="text-lg font-bold text-slate-800 mb-2">Hộp thư</h1>
            <p className="text-slate-400 max-w-[240px] text-[12px] font-medium leading-relaxed">
              Chọn một người bạn từ danh sách để bắt đầu trò chuyện.
            </p>
          </div>
        )}
      </main>

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSelect={handleSelectUserToGroup}
        // ✅ VÁ LỖI: Chặn toàn bộ những người đã có sẵn trong phòng (Dù là group 5-10 người)
        excludeIds={
          conversation?.members?.map((m: any) => String(m.user.id)) || [
            String(user?.id),
          ]
        }
      />
    </div>
  );
}
