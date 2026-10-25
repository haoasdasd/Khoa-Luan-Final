"use client";

import { useEffect } from "react";
import { Settings, UserPlus, MessageSquare } from "lucide-react";
import {
  useSuggestedUsers,
  useUserConnections,
  useUserActions,
} from "@/hooks/api/useUser";
import { useAuth } from "@/hooks/api/useAuth";
import { Link } from "react-router-dom";
import { UserAvatar } from "../common/UserAvatar";
import { useQueryClient } from "@tanstack/react-query";
import { socketInstance } from "@/api/socket.instance";
import { useState } from "react";
import { PrivacyCenterModal } from "../modals/PrivacyCenterModal"; // Import file vừa tách

export function RightSidebar() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const { data: suggestedUsers, isLoading: loadingSuggest } =
    useSuggestedUsers();
  const { data: connections, isLoading: loadingConn } = useUserConnections(
    me?.id,
  );
  const { follow, isProcessing } = useUserActions();

  // --- LOGIC SOCKET: Chỉ tập trung Online & Tin nhắn ---
  useEffect(() => {
    const handleStatusEvent = (event: any) => {
      const { event: eventName, data } = event;

      if (eventName === "user_online" || eventName === "user_offline") {
        const userId = data?.user_id; // Lấy trực tiếp từ data bọc từ Backend
        const isOnline = eventName === "user_online";

        // Cập nhật danh sách liên hệ gợi ý trong RAM (React Query cache)
        queryClient.setQueryData(["connections", me?.id], (old: any) => {
          if (!old || !old.following) return old;
          return {
            ...old,
            following: old.following.map((f: any) =>
              String(f.id) === String(userId)
                ? { ...f, is_online: isOnline }
                : f,
            ),
          };
        });
      }
      if (
        eventName === "message_reaction_updated" ||
        eventName === "new_message"
      ) {
        queryClient.invalidateQueries({ queryKey: ["conversations", "all"] });
      }
    };

    const unsubscribe = socketInstance.on(handleStatusEvent);
    return () => unsubscribe();
  }, [queryClient, me?.id]);

  return (
    <div className="space-y-6">
      {/* 1. GỢI Ý BẠN BÈ */}
      <section className="bg-white rounded-[32px] p-5 border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] mb-4">
          Gợi ý
        </h3>
        <div className="space-y-4">
          {suggestedUsers?.slice(0, 5).map((user: any) => (
            <div
              key={user.id}
              className="flex items-center justify-between group"
            >
              <Link
                to={`/profile/${user.username}`}
                className="flex items-center gap-3"
              >
                <UserAvatar user={user} size="md" />
                <div className="max-w-[110px]">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {user.full_name}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => follow(user.id)}
                disabled={isProcessing}
                className="p-2 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"
              >
                <UserPlus size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 2. NGƯỜI LIÊN HỆ ONLINE */}
      <section className="bg-white rounded-[32px] p-5 border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] mb-4">
          Liên hệ
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {connections?.following
            ?.sort((a: any, b: any) => (b.is_online ? 1 : -1))
            .map((friend: any) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-2xl"
              >
                <div className="flex items-center gap-3 relative">
                  <UserAvatar user={friend} size="sm" />
                  {friend.is_online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                  )}
                  <span className="text-xs font-bold">{friend.full_name}</span>
                </div>
                <Link
                  to={`/chat?u=${friend.id}`}
                  className="p-2 text-slate-300 hover:text-blue-500"
                >
                  <MessageSquare size={16} />
                </Link>
              </div>
            ))}
        </div>
      </section>

      {/* 3. CÀI ĐẶT NHANH */}
      <div className="bg-slate-900 rounded-[32px] p-5 text-white shadow-xl relative overflow-hidden">
        <button
          onClick={() => setShowPrivacyModal(true)}
          className="w-full text-left text-[11px] font-bold p-3 hover:bg-white/10 rounded-2xl flex items-center justify-between transition-all"
        >
          Trung tâm bảo mật <Settings size={14} className="text-blue-400" />
        </button>
      </div>

      {/* MODAL RIÊNG BIỆT */}
      <PrivacyCenterModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
}
