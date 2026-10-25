import {
  LEFT_NAV_ITEMS,
  LEFT_NAV_SHORTCUTS,
} from "@/constants/navigation.constants";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/api/useAuth";
import { UserAvatar } from "../common/UserAvatar";
import { ROUTES } from "@/config/routes.config";

export function LeftSidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <aside className="hidden xl:flex flex-col w-[300px] sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto px-2 pb-4 scrollbar-hide">
      {/* Profile Link */}
      <Link
        to={ROUTES.PROFILE_USER.replace(":username", user?.username || "")}
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 mb-1"
      >
        <UserAvatar user={user} size="sm" />
        <span className="font-bold text-slate-700">{user?.full_name}</span>
      </Link>

      {/* Menu Items từ Constants */}
      {LEFT_NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`flex items-center gap-3 p-3 rounded-xl transition-all mb-1 group ${pathname === item.to ? "bg-blue-50 text-blue-600" : "hover:bg-slate-100 text-slate-600"}`}
        >
          <div className="w-9 h-9 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            {item.icon}
          </div>
          <span
            className={`font-semibold ${pathname === item.to ? "text-blue-600" : "text-slate-700"}`}
          >
            {item.label}
          </span>
        </Link>
      ))}

      <hr className="my-4 border-slate-200 mx-3" />

      {/* Shortcuts từ Constants */}
      <h3 className="px-4 text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
        Lối tắt của bạn
      </h3>
      {LEFT_NAV_SHORTCUTS.map((shortcut) => (
        <div
          key={shortcut.label}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shadow-sm bg-white border border-slate-100 group-hover:rotate-6 transition-all">
            {shortcut.icon}
          </div>
          <span className="font-semibold text-slate-700">{shortcut.label}</span>
        </div>
      ))}
    </aside>
  );
}
