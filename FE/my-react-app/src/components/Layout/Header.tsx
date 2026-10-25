import { useState, useRef } from "react";
import { Bell, Search, LogOut, User, Settings } from "lucide-react";
import { useNotifications } from "@/hooks/api/useNotifications";
import { NotificationPopover } from "./NotificationPopover";
import { UserAvatar } from "../common/UserAvatar";
import { useAuth } from "@/hooks/api/useAuth";
import { Link } from "react-router-dom";
import { useOnClickOutside } from "@/hooks/api/useOnClickOutside";

export function Header() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications(); // Lấy số lượng chưa đọc từ Hook
  const [showNotif, setShowNotif] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

  // Đóng popover khi click ra ngoài
  useOnClickOutside(notifRef, () => setShowNotif(false));

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Search */}
        <div className="flex items-center gap-4 flex-1">
          <Link
            to="/"
            className="text-2xl font-black text-blue-600 tracking-tighter"
          >
            Social Network
          </Link>
          <div className="hidden md:flex items-center bg-slate-100 px-3 py-2 rounded-full w-64 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm trên ..."
              className="bg-transparent border-none outline-none ml-2 text-sm w-full"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Nút Thông báo (Bell) */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              className={`p-2.5 rounded-full transition-all relative ${
                showNotif
                  ? "bg-blue-50 text-blue-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Bell size={20} />
              {/* Badge số đỏ: Chỉ hiện khi có thông báo chưa đọc */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Popover Thông báo */}
            {showNotif && (
              <div className="absolute right-0 mt-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                <NotificationPopover />
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3 pl-2 border-l border-slate-100">
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-slate-900 leading-none">
                {user?.full_name}
              </p>
            </div>
            <div className="group relative cursor-pointer">
              <UserAvatar user={user} size="md" />
              {/* Menu nhanh khi hover avatar */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link
                  to={`/profile/${user?.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <User size={16} /> Trang cá nhân
                </Link>
                <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  <Settings size={16} /> Cài đặt
                </button>
                <hr className="my-1 border-slate-50" />
                <button
                  onClick={() => logout()} // ✅ Bọc vào arrow function để không truyền 'event' vào hàm logout
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} /> Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
