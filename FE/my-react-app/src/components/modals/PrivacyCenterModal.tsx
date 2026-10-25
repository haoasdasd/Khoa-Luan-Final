"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  History,
  Trash2,
  UserMinus,
  EyeOff,
  ShieldAlert,
  Clock,
  ZoomIn,
  Loader2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { postsResource, usersResource } from "@/api";
import { useArchive, useUserActions } from "@/hooks/api/useUser";
import { useCommentTrash, useComments } from "@/hooks/api/useComments";
import { usePostActions } from "@/hooks/api/usePost";
import { differenceInDays } from "date-fns";
import { UserAvatar } from "../common/UserAvatar";
import { useToast } from "@/hooks/api/useToast";

interface PrivacyEntry {
  id: string;
  content?: string | null;
  deleted_at?: string | null;
  post_data?: { content: string | null } | null;
  comment_data?: { content: string | null } | null;
  target_id?: string;
  target_type?: "post" | "comment";
}

type PrivacyTab = "hide" | "trash_posts" | "trash_comments" | "block";

type SelectedEntry = PrivacyEntry & { actionType: "restore_post" | "restore_comment" | "unhide" };

interface PrivacyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyCenterModal({ isOpen, onClose }: PrivacyCenterModalProps) {
  const queryClient = useQueryClient();
  const { show } = useToast();
  const [activeTab, setActiveTab] = useState<PrivacyTab>("hide");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<SelectedEntry | null>(null);

  // --- API HOOKS ---
  const { data: hiddenItems, isLoading: loadingHidden } = useArchive();
  const { unhidePost } = useUserActions();
  const { data: trashComments, isLoading: loadingTrashC } = useCommentTrash();
  const { restoreComment, permanentDelete: deleteComment } = useComments("");
  const { restorePost, permanentDeletePost } = usePostActions();

  const { data: trashPosts, isLoading: loadingTrashP } = useQuery({
    queryKey: ["posts", "trash"],
    queryFn: () => postsResource.getTrash(),
    enabled: isOpen && activeTab === "trash_posts",
  });

  const { data: blockedList, refetch: refetchBlocked, isLoading: loadingBlocked } = useQuery({
    queryKey: ["users", "blocked"],
    queryFn: () => usersResource.getBlockedList(),
    enabled: isOpen && activeTab === "block",
  });

  // --- LOGIC TÌM KIẾM ---
  const filteredItems = useMemo<PrivacyEntry[]>(() => {
    const q = searchQuery.toLowerCase();
    if (activeTab === "trash_posts")
      return trashPosts?.filter((p) => p.content?.toLowerCase().includes(q)) || [];
    if (activeTab === "trash_comments")
      return trashComments?.filter((c) => c.content?.toLowerCase().includes(q)) || [];
    if (activeTab === "hide")
      return hiddenItems?.filter((h) =>
        (h.post_data?.content || h.comment_data?.content)?.toLowerCase().includes(q)
      ) || [];
    return [];
  }, [searchQuery, activeTab, trashPosts, trashComments, hiddenItems]);

  if (!isOpen) return null;

  const handleAction = async () => {
    if (!selectedItem) return;
    const id = selectedItem.id;
    try {
      if (selectedItem.actionType === "restore_post") await restorePost(id);
      else if (selectedItem.actionType === "restore_comment") await restoreComment(id);
      else if (selectedItem.target_id && selectedItem.target_type) await unhidePost({ targetId: selectedItem.target_id, targetType: selectedItem.target_type });
      else return;
      
      setSelectedItem(null);
      show("Đã khôi phục thành công!", "success");
      queryClient.invalidateQueries(); // Làm mới lại toàn bộ để đồng bộ
    } catch {
      show("Có lỗi xảy ra", "error");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-slate-100">
        
        {/* Header */}
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-900 text-2xl tracking-tighter uppercase">Bảo mật & Nội dung</h3>
            <button onClick={onClose} className="p-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-[24px] gap-1 mb-6">
            {([
              { id: "hide", label: "Đang ẩn", icon: <EyeOff size={14} /> },
              { id: "trash_posts", label: "Bài viết xóa", icon: <History size={14} /> },
              { id: "trash_comments", label: "Bình luận xóa", icon: <Trash2 size={14} /> },
              { id: "block", label: "Đã chặn", icon: <UserMinus size={14} /> },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setSearchQuery(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[20px] text-[10px] font-black transition-all ${activeTab === t.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
              >
                {t.icon} {t.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Search */}
          {activeTab !== "block" && (
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm nội dung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="px-8 pb-8 overflow-y-auto custom-scrollbar flex-1">
          {activeTab.includes("trash") && (
            <div className="flex items-center gap-3 mb-6 p-4 bg-amber-50 rounded-3xl border border-amber-100">
              <ShieldAlert size={18} className="text-amber-600 flex-shrink-0" />
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                Nội dung sẽ bị xóa vĩnh viễn sau 30 ngày.
              </p>
            </div>
          )}

          {loadingTrashC || loadingTrashP || loadingBlocked || loadingHidden ? (
             <div className="flex flex-col items-center py-20"><Loader2 className="animate-spin text-slate-300" size={40} /></div>
          ) : activeTab === "block" ? (
            blockedList?.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl mb-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} size="sm" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{user.full_name}</p>
                    <p className="text-[10px] text-slate-400">@{user.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => usersResource.unblock(user.id).then(() => refetchBlocked())}
                  className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-blue-600 transition-all uppercase"
                >
                  Mở chặn
                </button>
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 text-slate-300 uppercase text-[10px] font-black tracking-widest">Không có dữ liệu</div>
          ) : (
            filteredItems.map((item) => (
              <PrivacyItem
                key={item.id}
                item={item}
                type={activeTab === "trash_posts" ? "post_trash" : activeTab === "trash_comments" ? "comment_trash" : "hide"}
                onClick={() => setSelectedItem({ ...item, actionType: activeTab === "trash_posts" ? "restore_post" : activeTab === "trash_comments" ? "restore_comment" : "unhide" })}
              />
            ))
          )}
        </div>
      </div>

      {/* Mini Confirm Modal (Nested) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-md bg-white rounded-[48px] p-10 text-center relative shadow-2xl">
            <button onClick={() => setSelectedItem(null)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full"><X size={20} /></button>
            <div className="inline-flex p-5 bg-blue-50 text-blue-500 rounded-3xl mb-6"><History size={32} /></div>
            <h4 className="text-2xl font-black text-slate-900 mb-6 tracking-tighter">Xác nhận khôi phục?</h4>
            <div className="p-6 bg-slate-50 rounded-[32px] text-left text-xs text-slate-600 mb-8 max-h-40 overflow-y-auto">
                {selectedItem.content || selectedItem.post_data?.content || "Dữ liệu đa phương tiện"}
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={handleAction} className="w-full py-5 rounded-3xl font-black text-white bg-blue-600 shadow-lg shadow-blue-100 active:scale-95 transition-all">KHÔI PHỤC NGAY</button>
                <button onClick={() => {
                   if(window.confirm("Xóa vĩnh viễn?")) {
                      if(selectedItem.actionType === "restore_post") permanentDeletePost(selectedItem.id);
                      else deleteComment(selectedItem.id);
                      setSelectedItem(null);
                   }
                }} className="text-red-400 font-bold text-[10px] py-2 uppercase tracking-widest">Xóa vĩnh viễn</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

// Sub-component Helper
function PrivacyItem({ item, type, onClick }: { item: PrivacyEntry; type: "post_trash" | "comment_trash" | "hide"; onClick: () => void }) {
  const isTrash = type.includes("trash");
  const daysLeft = useMemo(() => {
    if (!item.deleted_at) return 30;
    const diff = 30 - differenceInDays(new Date(), new Date(item.deleted_at));
    return Math.max(0, diff);
  }, [item.deleted_at]);

  const config = type === "post_trash" ? { label: "Bài viết", color: "text-orange-500 bg-orange-50", icon: <History size={20} /> }
               : type === "comment_trash" ? { label: "Bình luận", color: "text-red-500 bg-red-50", icon: <Trash2 size={20} /> }
               : { label: "Đang ẩn", color: "text-blue-500 bg-blue-50", icon: <EyeOff size={20} /> };

  return (
    <div onClick={onClick} className="flex items-center justify-between p-5 border border-slate-100 rounded-[32px] hover:shadow-xl transition-all cursor-pointer bg-white group mb-3">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.color}`}>{config.icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{config.label}</p>
          <p className="text-sm font-bold text-slate-700 truncate">{item.content || item.post_data?.content || "Dữ liệu đa phương tiện"}</p>
          {isTrash && <p className="text-[9px] font-bold mt-1 text-slate-400"><Clock size={10} className="inline mr-1" /> {daysLeft} ngày còn lại</p>}
        </div>
      </div>
      <ZoomIn size={18} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
    </div>
  );
}