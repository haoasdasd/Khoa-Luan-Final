"use client";

import React, { useState } from "react";
import { Search, Users, UserPlus, Loader2, SearchX, UserCheck, Sparkles, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usersResource } from "@/api/resources/users.resource";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Link } from "react-router-dom";
import { useUserActions, useSuggestedUsers } from "@/hooks/api/useUser";
import { useDebounce } from "@/hooks/api/useDebounce";

type TabType = "all" | "suggestions";

export default function FriendsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const { follow, isProcessing } = useUserActions();
  const debouncedSearch = useDebounce(searchTerm, 400);

  const { data: myFriends, isLoading: loadingFriends } = useQuery({
    queryKey: ["my-friends"],
    queryFn: () => usersResource.getMyFriends(),
    enabled: activeTab === "all" && !debouncedSearch,
    staleTime: 1000 * 60 * 5,
  });

  const { data: suggestions, isLoading: loadingSuggest } = useSuggestedUsers();

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["users-global-search", debouncedSearch],
    queryFn: () => usersResource.globalSearch(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500 pb-24">
      {/* HEADER: Gọn gàng và tập trung vào tiêu đề */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mọi người</h1>
          <p className="text-slate-500 mt-1 text-sm">Tìm kiếm và kết nối với cộng đồng của bạn.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <TabBtn active={activeTab === "all"} onClick={() => setActiveTab("all")} label="BẠN BÈ" />
          <TabBtn active={activeTab === "suggestions"} onClick={() => setActiveTab("suggestions")} label="GỢI Ý" />
        </div>
      </div>

      {/* SEARCH: Tối giản, không viền, chỉ có underline khi focus */}
      <div className="mb-12 relative group">
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Nhập tên hoặc username..."
          className="w-full pl-8 pr-4 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none text-lg transition-all placeholder:text-slate-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {isSearching && <Loader2 className="absolute right-0 top-1/2 -translate-y-1/2 animate-spin text-slate-300" size={18} />}
      </div>

      {/* CONTENT: Hiển thị dạng danh sách tinh tế */}
      <div className="space-y-4">
        {debouncedSearch ? (
          <div className="grid grid-cols-1 gap-3">
             {searchResults?.map(u => <FriendCard key={u.id} user={u} action="profile" onAction={() => follow(u.id)} isProcessing={isProcessing} />)}
             {!isSearching && !searchResults?.length && <EmptyState text="Không tìm thấy kết quả" />}
          </div>
        ) : activeTab === "all" ? (
          <div className="grid grid-cols-1 gap-3">
            {loadingFriends ? <LoadingList /> : myFriends?.map(u => <FriendCard key={u.id} user={u} action="view" />)}
            {!loadingFriends && !myFriends?.length && <EmptyState text="Bạn chưa có người bạn nào" />}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {loadingSuggest ? <LoadingList /> : suggestions?.map(u => (
              <FriendCard key={u.id} user={u} action="follow" onAction={() => follow(u.id)} isProcessing={isProcessing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// THẺ NGƯỜI DÙNG: Ngang, đơn giản, tập trung vào Avatar và Tên
function FriendCard({ user, action, onAction, isProcessing }: any) {
  return (
    <div className="group bg-white p-4 rounded-2xl border border-slate-100 flex items-center hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-300">
      <Link to={`/profile/${user.username}`} className="flex items-center gap-4 flex-1">
        <div className="relative">
          <UserAvatar user={user} size="lg" className="ring-2 ring-transparent group-hover:ring-blue-100 transition-all" />
          {user.is_online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        <div className="text-left">
          <h4 className="font-semibold text-slate-900 leading-tight">{user.full_name}</h4>
          <p className="text-xs text-slate-400 mt-0.5">@{user.username}</p>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {action === "view" ? (
          <>
            <Link
              to={`/chat?u=${user.id}`}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title="Nhắn tin"
            >
              <MessageCircle size={20} />
            </Link>
            <Link 
              to={`/profile/${user.username}`}
              className="px-4 py-2 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              HỒ SƠ
            </Link>
          </>
        ) : (
          <button 
            onClick={onAction} 
            disabled={isProcessing} 
            className="px-5 py-2 bg-slate-900 text-white text-[11px] font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-all"
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : "THEO DÕI"}
          </button>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`px-5 py-2 rounded-lg text-[10px] font-bold tracking-widest transition-all ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function LoadingList() {
  return <>{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-2xl" />)}</>;
}

function EmptyState({ text }: any) {
  return (
    <div className="py-20 text-center">
      <SearchX className="mx-auto text-slate-200 mb-4" size={48} />
      <p className="text-slate-400 font-medium">{text}</p>
    </div>
  );
}