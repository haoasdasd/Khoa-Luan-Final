import { getInitials, getAvatarGradient } from "@/utils/helpers/avatar.helpers";

interface UserAvatarProps {
  // THÊM "| null" vào đây để khớp với dữ liệu từ useAuth
  user?: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null; 
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({ user, size = "md", className = "" }: UserAvatarProps) {
  // Giữ nguyên các logic bên dưới...
  const sizeClasses = {
    xs: "w-6 h-6 text-[8px]",
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-24 h-24 text-2xl",
  };

  // Dùng Optional Chaining (?.) để an toàn khi user là null
  const name = user?.full_name || user?.username || "?";
  const initials = getInitials(name);
  const gradient = getAvatarGradient(name);

  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden flex items-center justify-center text-white font-bold ring-2 ring-white shadow-sm transition-all ${sizeClasses[size]} ${className}`}
      style={{
        background: user?.avatar_url ? "transparent" : gradient,
      }}
    >
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none"; // Ẩn ảnh lỗi
            target.parentElement!.style.background = gradient; // Hiện lại gradient
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}