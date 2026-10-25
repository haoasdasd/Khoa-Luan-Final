import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/api/useAuth"
import { useNavigate, Link } from "react-router-dom"
import { 
  Eye, EyeOff, Mail, Lock, Sparkles, 
  ChevronRight, ShieldCheck
} from "lucide-react"
import AuthLayout from "@/components/Auth/AuthLayout"
import { useQueryClient } from "@tanstack/react-query";
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false); // Sửa lại state rememberMe nếu Hào cần bind vào UI

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setIsLoggingIn(true);
  try {
    // 1. Gọi đăng nhập và chờ xử lý xong
    await login({ email, password });
    
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
    }

    // ❌ XÓA hoặc COMMENT dòng navigate cũ đi
    // navigate("/", { replace: true }); 

    // 2. 🔥 VŨ KHÍ TỐI THƯỢNG: Ép trình duyệt chuyển trang và nạp lại toàn bộ state tươi nhất!
    window.location.replace("/");

  } catch (error) {
    alert("Đăng nhập thất bại. Hào vui lòng kiểm tra lại thông tin nhé!");
    setIsLoggingIn(false);
  }
};

  return (
    <AuthLayout 
      title="Chào mừng trở lại" 
      subtitle="Đăng nhập để kết nối cùng cộng đồng "
    >
      {/* Hiệu ứng ánh sáng theo chuột */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute w-[500px] h-[500px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-[100px] transition-transform duration-500 ease-out"
          style={{ 
            left: '10%', top: '10%'
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-[80px] transition-transform duration-700 ease-out"
          style={{ 
            right: '10%', bottom: '10%'
          }}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        {/* Badge Bảo mật với hiệu ứng */}
        <div className="flex justify-center mb-6 animate-slide-down">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-md rounded-full border border-blue-200/30 shadow-sm group hover:shadow-md transition-all duration-300">
            <ShieldCheck className="w-4 h-4 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-[11px] font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent uppercase tracking-tighter">
                An toàn & Bảo mật
            </span>
          </div>
        </div>

        {/* Ô Nhập Email với hiệu ứng đẹp */}
        <div className="space-y-2 group animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Địa chỉ Email
            <Sparkles className="w-3 h-3 text-blue-400 opacity-0 group-focus-within:opacity-100 transition-opacity" />
          </label>
          <div className="relative">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${emailFocused ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
              <Mail size={20} />
            </div>
            <input
              type="email"
              value={email}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-md border-2 rounded-2xl outline-none transition-all duration-300
                focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/50 shadow-sm hover:shadow-md
                font-medium placeholder:text-slate-400"
              placeholder="Nhập email của bạn"
              required
            />
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ${emailFocused ? 'w-[90%]' : 'w-0'}`} />
          </div>
        </div>

        {/* Ô Nhập Mật khẩu với hiệu ứng đẹp */}
        <div className="space-y-2 group animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex justify-between items-center ml-1">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Mật khẩu
            </label>
            <Link 
              to="/auth/forgot" 
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-all duration-300 hover:underline underline-offset-4 flex items-center gap-1 group"
            >
              Quên mật khẩu?
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="relative">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${passwordFocused ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
              <Lock size={20} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white/60 backdrop-blur-md border-2 rounded-2xl outline-none transition-all duration-300
                focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/50 shadow-sm hover:shadow-md
                font-medium placeholder:text-slate-400"
              placeholder="••••••••"
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-slate-400 hover:text-blue-600 transition-all duration-300 hover:scale-110"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ${passwordFocused ? 'w-[90%]' : 'w-0'}`} />
          </div>
        </div>


        {/* Nút Đăng nhập cao cấp */}
        <button
          type="submit"
          disabled={isLoggingIn}
          className="relative w-full py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 
            hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 
            text-white font-bold rounded-2xl transition-all duration-500 
            transform hover:scale-[1.02] active:scale-[0.98] 
            shadow-xl hover:shadow-2xl hover:shadow-blue-500/30
            flex items-center justify-center gap-2 overflow-hidden group mt-6"
        >
          {/* Hiệu ứng gradient chuyển động */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          {isLoggingIn ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <span>Đăng Nhập Ngay</span>
              <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform duration-300" />
            </>
          )}
        </button>

        {/* Chân trang với hiệu ứng */}
        <div className="text-center pt-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-slate-500 font-medium">
            Chưa có tài khoản?{" "}
            <Link 
              to="/auth/register" 
              className="text-blue-600 font-extrabold hover:text-blue-800 transition-all duration-300 relative group"
            >
              Tạo tài khoản ngay
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </p>
          
          {/* Thêm thông tin hỗ trợ */}
          <p className="text-xs text-slate-400 mt-4">
            Bằng cách đăng nhập, bạn đồng ý với{" "}
            <a href="#" className="text-blue-500 hover:underline">Điều khoản</a> và{" "}
            <a href="#" className="text-blue-500 hover:underline">Chính sách bảo mật</a>
          </p>
        </div>
      </form>

      {/* CSS Animations */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }
        .animate-slide-down {
          animation: slide-down 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </AuthLayout>
  )
}