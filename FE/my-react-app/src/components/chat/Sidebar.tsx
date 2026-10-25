"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatResource } from "@/api";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/api/useAuth";
import { Search, Edit, Loader2, MessageCircleWarning } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { socketInstance } from "@/api/socket.instance";
import { useDebounce } from "@/hooks/api/useDebounce";
import { ConversationItem } from "./ConversationItem";
import type { ApiConversation } from "@/types/api";

export default function Sidebar() {
  const navigate = useNavigate();
  const { convId: activeId } = useParams();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // 1. Fetch dữ liệu hội thoại (Accepted & Pending)
  const { data: allConversations = [], isLoading } = useQuery({
    queryKey: ["conversations", "all"],
    queryFn: async () => {
      const [accepted, pending] = await Promise.all([
        chatResource.conversations(true),
        chatResource.conversations(false),
      ]);
      // Đảm bảo không trùng lặp ID giữa 2 danh sách
      const uniqueMap = new Map<string, ApiConversation>();
      [...accepted, ...pending].forEach(c => uniqueMap.set(String(c.id), c));
      return Array.from(uniqueMap.values());
    },
    staleTime: 1000 * 60 * 5, // Dữ liệu giữ độ "tươi" trong 5 phút
  });

  // 2. Hàm cập nhật cache trực tiếp vào RAM (Tốc độ cực nhanh)
  const updateCache = useCallback((convId: string, updateFn: (c: ApiConversation) => ApiConversation) => {
    queryClient.setQueryData(["conversations", "all"], (old: ApiConversation[] | undefined) => {
      if (!old) return old;
      return old.map(c => (String(c.id) === String(convId) ? updateFn(c) : c));
    });
  }, [queryClient]);

  // 3. Xử lý Socket Real-time
useEffect(() => {
    const handleSocket = (event: any) => {
      const { event: eventName, data, conversation_id } = event;
      const targetId = conversation_id || data?.conversation_id;

      // 1. XỬ LÝ TIN NHẮN MỚI / SỬA / THU HỒI
      if (["new_message", "message_edited", "message_deleted"].includes(eventName)) {
        updateCache(targetId, (c) => ({
          ...c,
          // Nếu là tin nhắn mới, cập nhật last_message và tăng count
          // Nếu là edit/delete, cập nhật nội dung hiển thị ở Sidebar
          last_message: eventName === "new_message" ? data : (
            eventName === "message_deleted" 
            ? { ...c.last_message, content: "Tin nhắn đã bị thu hồi", deleted_at: data.deleted_at }
            : (String(c.last_message?.id) === String(data.id) ? data : c.last_message)
          ),
          unread_count: eventName === "new_message" && String(data.sender.id) !== String(me?.id) 
                        ? (c.unread_count || 0) + 1 : c.unread_count,
          updated_at: new Date().toISOString() 
        }));
        
        // CHỈ invalidate khi thực sự cần đồng bộ sâu, còn không thì updateCache ở trên là đủ hiện rồi
        return;
      }

      // 2. REACTION & SEEN (Không fetch API, chỉ cập nhật trạng thái sắp xếp)
      if (["message_reaction_updated", "messages_seen"].includes(eventName)) {
        updateCache(targetId, (c) => ({ 
          ...c, 
          // Nếu là tin nhắn cuối bị Seen bởi mình, reset thông báo đỏ ngay
          unread_count: (eventName === "messages_seen" && String(data.user_id) === String(me?.id)) ? 0 : c.unread_count,
          updated_at: new Date().toISOString() 
        }));
        return;
      }

      // 3. TRẠNG THÁI ONLINE / OFFLINE (Giữ nguyên setQueryData trực tiếp)
      if (eventName === "user_online" || eventName === "user_offline") {
        const userId = data?.user_id || event.user_id;
        queryClient.setQueryData(["conversations", "all"], (old: ApiConversation[] | undefined) => {
          if (!old) return old;
          return old.map(c => {
            const isTarget = c.members?.some(m => String(m.user.id) === String(userId));
            return isTarget && c.type === "private" ? { ...c, is_online: eventName === "user_online" } : c;
          });
        });
      }
    };

    const unsubscribe = socketInstance.on(handleSocket);
    return () => unsubscribe();
  }, [me?.id, updateCache, queryClient]);

  // 4. Lọc & Sắp xếp dữ liệu (Sửa lại để chuẩn thời gian tin nhắn cuối)
  const groups = useMemo(() => {
    const sorted = [...allConversations].sort((a, b) => {
      // Ưu tiên lấy thời gian của tin nhắn cuối cùng, nếu không có thì mới dùng updated_at của hội thoại
      const timeA = new Date(a.last_message?.created_at || a.updated_at || a.created_at).getTime();
      const timeB = new Date(b.last_message?.created_at || b.updated_at || b.created_at).getTime();
      
      return timeB - timeA; // Mới nhất lên đầu
    });

    const filtered = sorted.filter(c => {
      if (!debouncedSearch) return true;
      const other = c.members?.find(m => String(m.user.id) !== String(me?.id))?.user;
      return other?.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase());
    });

    return {
      accepted: filtered.filter(c => c.members?.find(m => String(m.user.id) === String(me?.id))?.is_accepted !== false),
      pending: filtered.filter(c => c.members?.find(m => String(m.user.id) === String(me?.id))?.is_accepted === false),
    };
  }, [allConversations, debouncedSearch, me?.id]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 w-full select-none">
      {/* Header Section */}
      <div className="p-5 flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Đoạn chat</h2>
        <button className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all shadow-sm active:scale-95 text-slate-600">
          <Edit size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Search Section */}
      <div className="px-4 pb-4">
        <div className="relative group">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-blue-500' : 'text-slate-400'}`} size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm cuộc trò chuyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-100/70 border-none rounded-[20px] text-sm outline-none focus:ring-4 ring-blue-500/5 transition-all font-bold placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-200">
            <Loader2 className="animate-spin mb-2" size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Đang đồng bộ</span>
          </div>
        ) : (
          <div className="space-y-1 pb-10">
            {/* Accepted Conversations */}
            {groups.accepted.map(conv => (
              <ConversationItem 
                key={conv.id} 
                conv={conv} 
                isActive={String(activeId) === String(conv.id)} 
                currentUserId={me?.id}
                onClick={() => navigate(`/chat/${conv.id}`)}
              />
            ))}

            {/* Pending Section */}
            {groups.pending.length > 0 && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 px-4 mb-3 opacity-60">
                  <MessageCircleWarning size={14} className="text-amber-600" />
                  <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Tin nhắn chờ</p>
                </div>
                {groups.pending.map(conv => (
                  <ConversationItem 
                    key={conv.id} 
                    conv={conv} 
                    isActive={String(activeId) === String(conv.id)} 
                    currentUserId={me?.id}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && allConversations.length === 0 && (
                <div className="text-center py-20 opacity-20">
                    <p className="text-xs font-black uppercase tracking-[0.3em]">Trống</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}