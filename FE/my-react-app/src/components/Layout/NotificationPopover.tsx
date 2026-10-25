import { Bell, CheckCheck, MessageCircle, Heart, Share2, UserPlus, Reply } from "lucide-react";
import { parseISO, formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { vi } from "date-fns/locale";
import { useNotifications } from "@/hooks/api/useNotifications";
import { UserAvatar } from "../common/UserAvatar";

// --- Utility: Xử lý hiển thị thời gian chuyên nghiệp ---
function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  try {
    const utcString = iso.endsWith('Z') || iso.includes('+') 
      ? iso 
      : `${iso.replace(' ', 'T')}Z`;
    const date = parseISO(utcString);
    return formatDistanceToNow(date, { addSuffix: true, locale: vi });
  } catch {
    return 'vừa xong';
  }
}

function getDayLabel(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isToday(d)) return 'Hôm nay';
    if (isYesterday(d)) return 'Hôm qua';
    return format(d, 'dd/MM/yyyy', { locale: vi });
  } catch {
    return '';
  }
}

export function NotificationPopover() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className="w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[550px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <h3 className="text-lg font-extrabold text-slate-900">Thông báo</h3>
        {unreadCount > 0 && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              markAllRead();
            }}
            className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-all flex items-center gap-1"
          >
            <CheckCheck size={14} /> Đánh dấu đã đọc
          </button>
        )}
      </div>

      {/* Danh sách thông báo */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
        {notifications.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-slate-400">
            <Bell size={48} className="mb-3 opacity-10" />
            <p className="text-sm font-semibold">Chưa có thông báo nào mới</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)} // Chỉ đánh dấu đã đọc, không điều hướng
              className={`p-4 flex gap-3 cursor-default transition-all border-b border-slate-50 last:border-0 ${!n.is_read ? 'bg-blue-50/30' : 'bg-white'}`}
            >
              {/* Avatar & Icon Badge cảm xúc */}
              <div className="relative h-fit">
                <UserAvatar user={n.sender} size="md" />
                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white shadow-sm border-2 border-white flex items-center justify-center ${getTypeStyles(n.type, n.content)}`}>
                   {getTypeIcon(n.type, n.content)}
                </div>
              </div>
              
              {/* Nội dung text thông báo */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] leading-snug break-words">
                  <span className="font-bold text-slate-900">{n.sender?.full_name || "Người dùng"}</span>
                  {" "}
                  <span className="text-slate-600">
                    {/* Hiển thị nội dung chuẩn từ Backend */}
                    {n.content || "đã tương tác với bạn"}
                  </span>
                </p>
                
                {/* Hiển thị thời gian kép */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`text-[11px] font-bold ${!n.is_read ? 'text-blue-600' : 'text-slate-400'}`}>
                    {formatRelativeTime(n.created_at)}
                  </span>
                  <span className="text-[10px] text-slate-300">•</span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {getDayLabel(n.created_at)}
                  </span>
                </div>
              </div>

              {/* Chấm xanh đánh dấu chưa đọc */}
              {!n.is_read && (
                <div className="flex items-center ml-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- Helpers: Tự động bắt từ khóa trong content để hiển thị Icon chuẩn ---
const getTypeIcon = (type: string, content: string | null) => {
  const text = String(content || "").toLowerCase();
  
  if (type === 'like' || type === 'reaction') {
    if (text.includes('haha')) return <span className="text-[10px] leading-none">😆</span>;
    if (text.includes('wow') || text.includes('ngạc nhiên')) return <span className="text-[10px] leading-none">😮</span>;
    if (text.includes('sad') || text.includes('buồn')) return <span className="text-[10px] leading-none">😢</span>;
    if (text.includes('angry') || text.includes('phẫn nộ')) return <span className="text-[10px] leading-none">😡</span>;
    if (text.includes('yêu thích') || text.includes('love')) return <Heart size={10} fill="currentColor" />;
    return <Heart size={10} fill="currentColor" />; // Mặc định là Like (Tim)
  }
  
  if (type === 'comment') return <MessageCircle size={10} fill="currentColor" />;
  if (type === 'reply') return <Reply size={10} fill="currentColor" />;
  if (type === 'share') return <Share2 size={10} fill="currentColor" />;
  if (type === 'follow') return <UserPlus size={10} fill="currentColor" />;
  
  return <Bell size={10} fill="currentColor" />;
};

const getTypeStyles = (type: string, content: string | null) => {
  const text = String(content || "").toLowerCase();
  
  if (type === 'like' || type === 'reaction') {
    if (text.includes('haha') || text.includes('wow')) return 'bg-yellow-400';
    if (text.includes('angry')) return 'bg-orange-600';
    if (text.includes('sad')) return 'bg-blue-400';
    return 'bg-rose-500'; // Đỏ cho Tim
  }
  
  if (type === 'comment' || type === 'reply') return 'bg-emerald-500';
  if (type === 'share') return 'bg-blue-500';
  if (type === 'follow') return 'bg-amber-500';
  
  return 'bg-slate-500';
};