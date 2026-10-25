import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/api/useAuth"
import { useNavigate, Link } from "react-router-dom"
import { 
  Mail, Lock, UserPlus, Sparkles, 
  ChevronRight, Camera, ImagePlus, Loader2, TextQuote
} from "lucide-react"
import AuthLayout from "@/components/Auth/AuthLayout"
import { uploadImageToCloudinary } from "@/utils/helpers/upload.helpers";
import { getInitials, getAvatarGradient } from "@/utils/helpers/avatar.helpers";

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  
  // 1. Khởi tạo State đầy đủ các trường
  const [formData, setFormData] = useState({ 
    full_name: "", 
    username: "", 
    email: "", 
    password: "", 
    avatar_url: "", 
    bio: "" 
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  
  // State xử lý ảnh
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploadingImg, setIsUploadingImg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hiệu ứng ánh sáng theo chuột
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const handleMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  // 2. Hàm xử lý khi chọn ảnh từ máy
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file)) // Hiện ảnh tạm thời để xem trước
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Kiểm tra xem Hào đã chọn ảnh chưa
    if (!avatarFile) {
      alert("Hào ơi, vui lòng chọn một tấm ảnh đại diện nhé!")
      return
    }

    setIsLoading(true)
    try {
      // BƯỚC 1: Tải ảnh lên Cloudinary lấy Link thực
      setIsUploadingImg(true)
      const finalAvatarUrl = await uploadImageToCloudinary(avatarFile)
      setIsUploadingImg(false)

      // BƯỚC 2: Gửi toàn bộ data (kèm link ảnh vừa lấy được) về Backend
      await register({
        ...formData,
        avatar_url: finalAvatarUrl,
        bio: ""
      })
      
      alert("Đăng ký thành công! Chào mừng bạn gia nhập NTTU.")
      navigate("/auth/login")
    } catch (error) {
      alert("Đăng ký lỗi. Vui lòng kiểm tra lại thông tin hoặc ảnh.")
    } finally {
      setIsLoading(false)
      setIsUploadingImg(false)
    }
  }

  return (
    <AuthLayout 
      title="Bắt đầu hành trình" 
      subtitle="Chỉ mất vài phút để tham gia cùng cộng đồng NTTU"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute w-[500px] h-[500px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-[100px] transition-transform duration-500 ease-out"
          style={{ 
            transform: `translate(${mousePos.x * 0.05}px, ${mousePos.y * 0.05}px)`,
            left: '10%', top: '10%'
          }}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        
        {/* --- KHU VỰC CHỌN ẢNH AVATAR (Hào muốn tự chọn từ máy) --- */}
        <div className="flex flex-col items-center justify-center space-y-3 animate-slide-up">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full border-4 border-white shadow-2xl cursor-pointer group overflow-hidden transition-transform hover:scale-105 active:scale-95"
            style={{ 
               background: !avatarPreview ? getAvatarGradient(formData.full_name) : 'white'
            }}
          >
            {avatarPreview ? (
              <img src={avatarPreview} className="w-full h-full object-cover" alt="Preview" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white">
                <span className="text-2xl font-bold">{getInitials(formData.full_name)}</span>
                <Camera size={18} className="absolute bottom-2 opacity-60" />
              </div>
            )}
            
            {/* Overlay khi hover */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ImagePlus className="text-white" size={24} />
            </div>

            {/* Spinner khi đang xử lý upload */}
            {isUploadingImg && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" />
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*" 
          />
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            {avatarPreview ? "Chạm để đổi ảnh" : "Chọn ảnh từ máy"}
          </p>
        </div>

        {/* Họ tên & Username */}
        <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="space-y-2 group">
            <label className="text-sm font-bold text-slate-700 ml-1">Họ và tên</label>
            <input 
              type="text"
              className="w-full px-5 py-4 bg-white/60 backdrop-blur-md border-2 rounded-2xl outline-none transition-all focus:border-blue-500 shadow-sm font-medium"
              placeholder="Họ và tên đầy đủ"
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2 group">
            <label className="text-sm font-bold text-slate-700 ml-1">Tên người dùng</label>
            <input 
              type="text"
              className="w-full px-5 py-4 bg-white/60 backdrop-blur-md border-2 rounded-2xl outline-none transition-all focus:border-blue-500 shadow-sm font-medium"
              placeholder="Username"
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
          </div>
        </div>

        {/* Email & Mật khẩu */}
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
            <input
              type="email"
              className="w-full px-5 py-4 bg-white/60 backdrop-blur-md border-2 rounded-2xl outline-none transition-all focus:border-blue-500 shadow-sm font-medium"
              placeholder="your_email@gmail.com"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-slate-700 ml-1">Mật khẩu</label>
            <input
              type="password"
              className="w-full px-5 py-4 bg-white/60 backdrop-blur-md border-2 rounded-2xl outline-none transition-all focus:border-blue-500 shadow-sm font-medium"
              placeholder="••••••••"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
        </div>

        {/* Nút Đăng ký */}
        <button
          type="submit"
          disabled={isLoading || isUploadingImg}
          className="relative w-full py-4 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-2xl transition-all duration-500 shadow-xl flex items-center justify-center gap-2 group mt-4 disabled:opacity-70"
        >
          {isLoading ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <UserPlus size={20} />
              <span>Tạo tài khoản mới</span>
              <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform" />
            </>
          )}
        </button>

        <div className="text-center pt-2 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-slate-500 text-sm font-medium">
            Đã có tài khoản?{" "}
            <Link to="/auth/login" className="text-blue-600 font-extrabold hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </form>
      {/* CSS Animations */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-15px); }
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