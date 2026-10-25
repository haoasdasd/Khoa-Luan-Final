"use client";

import { useQuery } from "@tanstack/react-query";
import { chatResource } from "@/api";
import { UserAvatar } from "@/components/common/UserAvatar";
import { X, Search, Loader2, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/api/useAuth";
import type { ApiUserPublic, ApiConversation } from "@/types/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (userIds: string[]) => void; // 🔥 Đổi từ string sang string[]
  excludeIds: string[];
}

export default function AddMemberModal({ isOpen, onClose, onSelect, excludeIds }: Props) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // 🔥 State lưu danh sách ID đã chọn
  const { user: currentUser } = useAuth();

  const { data: acceptedConvs = [], isLoading } = useQuery({
    queryKey: ["conversations", "accepted-only"],
    queryFn: () => chatResource.conversations(true), 
    enabled: isOpen,
  });

  const availableUsers = useMemo(() => {
    const partners = acceptedConvs
      .filter((c: ApiConversation) => c.type === "private")
      .map((c: ApiConversation) => {
        return c.members.find((m) => String(m.user.id) !== String(currentUser?.id))?.user;
      })
      .filter((u): u is ApiUserPublic => !!u);

    const filtered = partners.filter(u => !excludeIds.includes(String(u.id)));
    const unique = Array.from(new Map(filtered.map(u => [u.id, u])).values());

    if (!search) return unique;
    const q = search.toLowerCase();
    return unique.filter(
      u => u.full_name?.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    );
  }, [acceptedConvs, currentUser?.id, excludeIds, search]);

  // 🔥 Hàm xử lý khi tích chọn/bỏ chọn
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) return;
    onSelect(selectedIds); // Gửi mảng các ID về ChatPage
    setSelectedIds([]); // Reset
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thêm vào nhóm</h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Đã chọn {selectedIds.length} người</p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all"><X size={20}/></button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          {/* SEARCH BAR */}
          <div className="relative mb-4">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${search ? 'text-blue-500' : 'text-slate-400'}`} size={18} />
            <input 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border-none rounded-[20px] text-sm font-medium outline-none focus:ring-2 ring-blue-500/20 transition-all"
              placeholder="Tìm bạn bè..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* LIST USERS */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : availableUsers.length > 0 ? (
              availableUsers.map(u => {
                const isSelected = selectedIds.includes(String(u.id));
                return (
                  <div 
                    key={u.id}
                    onClick={() => toggleSelect(String(u.id))}
                    className={`flex items-center gap-4 p-3 rounded-[22px] cursor-pointer transition-all group ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="relative">
                      <UserAvatar user={u} size="lg" />
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-600 border-2 border-white w-5 h-5 rounded-full flex items-center justify-center animate-in zoom-in">
                          <Check size={10} className="text-white" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-[15px] truncate ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>{u.full_name}</p>
                      <p className="text-[12px] text-slate-400 font-bold">@{u.username}</p>
                    </div>
                    {/* Checkbox circle */}
                    <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-200'}`}>
                       {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-10 text-slate-400 text-xs font-black uppercase">Không có người phù hợp</p>
            )}
          </div>
        </div>

        {/* FOOTER BUTTON */}
        <div className="p-4 bg-slate-50 shrink-0">
          <button 
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className={`w-full py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
              selectedIds.length > 0 
              ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 active:scale-95' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Xác nhận tạo nhóm ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}