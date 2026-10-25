import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { 
  Mail, ArrowLeft, Send, Lock, 
  KeyRound, Eye, EyeOff, CheckCircle2, Sparkles, ShieldCheck, ChevronRight 
} from "lucide-react"
import AuthLayout from "@/components/Auth/AuthLayout"
import { useAuth } from "@/hooks/api/useAuth" 

type Step = 'SEND_EMAIL' | 'VERIFY_RESET' | 'SUCCESS'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { forgotPassword, resetPassword } = useAuth()

  const [step, setStep] = useState<Step>('SEND_EMAIL')
  const [showPassword, setShowPassword] = useState(false)
  
  // States cho dữ liệu form
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLocalLoading, setIsLocalLoading] = useState(false) 
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Hiệu ứng ánh sáng theo chuột (Mouse Glow)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const handleMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLocalLoading(true)
    try {
      await forgotPassword(email) 
      setStep('VERIFY_RESET')
    } catch (error) {
      alert("Email không tồn tại hoặc có lỗi xảy ra!")
    } finally {
      setIsLocalLoading(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!")
      return
    }
    setIsLocalLoading(true)
    try {
      await resetPassword({
        email,
        otp,
        new_password: newPassword
      })
      setStep('SUCCESS')
    } catch (error) {
      alert("Mã OTP không chính xác hoặc đã hết hạn!")
    } finally {
      setIsLocalLoading(false)
    }
  }

  return (
    <AuthLayout 
      title={step === 'SUCCESS' ? "Hoàn tất!" : "Khôi phục tài khoản"} 
      subtitle={
        step === 'SEND_EMAIL' ? "Nhập email sinh viên để nhận mã OTP xác thực." :
        step === 'VERIFY_RESET' ? `Mã OTP đã được gửi đến ${email}` :
        "Mật khẩu của bạn đã được cập nhật thành công."
      }
    >
      {/* Hiệu ứng ánh sáng nền */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute w-[500px] h-[500px] bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-[100px] transition-transform duration-500 ease-out"
          style={{ 
            transform: `translate(${mousePos.x * 0.05}px, ${mousePos.y * 0.05}px)`,
            left: '10%', top: '10%'
          }}
        />
      </div>

      <div className="relative z-10 space-y-6">


        {/* --- BƯỚC 1: NHẬP EMAIL --- */}
        {step === 'SEND_EMAIL' && (
          <form onSubmit={handleSendEmail} className="space-y-6 animate-slide-up">
            <div className="space-y-2 group">
              <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                Email đăng ký <Sparkles className="w-3 h-3 text-blue-400 opacity-0 group-focus-within:opacity-100 transition-opacity" />
              </label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${focusedField === 'email' ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-md border-2 rounded-2xl outline-none transition-all duration-300
                    focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/50 shadow-sm font-medium"
                  placeholder="Nhập email bạn đã đăng ký"
                />
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ${focusedField === 'email' ? 'w-[90%]' : 'w-0'}`} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLocalLoading}
              className="relative w-full py-4 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-2xl transition-all duration-500 
                transform hover:scale-[1.01] active:scale-[0.99] shadow-xl hover:shadow-blue-500/30
                flex items-center justify-center gap-2 overflow-hidden group"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isLocalLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  <span>Gửi mã xác nhận</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* --- BƯỚC 2: NHẬP OTP + MẬT KHẨU MỚI --- */}
        {step === 'VERIFY_RESET' && (
          <form onSubmit={handleResetSubmit} className="space-y-5 animate-slide-up">
            <div className="space-y-2 group">
              <label className="text-sm font-bold text-slate-700 ml-1">Mã xác thực OTP</label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${focusedField === 'otp' ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
                  <KeyRound size={20} />
                </div>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={otp}
                  onFocus={() => setFocusedField('otp')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-md border-2 rounded-2xl outline-none transition-all duration-300
                    focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/50 shadow-sm font-mono tracking-[0.5em] text-center text-xl"
                  placeholder="0000"
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-sm font-bold text-slate-700 ml-1">Mật khẩu mới</label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${focusedField === 'pass' ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onFocus={() => setFocusedField('pass')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white/60 backdrop-blur-md border-2 rounded-2xl outline-none transition-all duration-300
                    focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/50 shadow-sm font-medium"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-slate-400 hover:text-blue-600">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-sm font-bold text-slate-700 ml-1">Xác nhận mật khẩu</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-5 py-4 bg-white/60 backdrop-blur-md border-2 rounded-2xl outline-none transition-all duration-300
                  focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/50 shadow-sm font-medium"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLocalLoading}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-xl shadow-green-200 transition-all active:scale-[0.98]"
            >
              {isLocalLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
            </button>
          </form>
        )}

        {/* --- BƯỚC 3: THÀNH CÔNG --- */}
        {step === 'SUCCESS' && (
          <div className="text-center space-y-8 py-4 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-green-200">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Thành công!</h3>
              <p className="text-slate-500 font-medium leading-relaxed">Tài khoản của bạn đã sẵn sàng. Hãy đăng nhập để bắt đầu.</p>
            </div>
            <button 
              onClick={() => navigate('/auth/login')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Vào trang đăng nhập</span>
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* FOOTER */}
        {step !== 'SUCCESS' && (
          <div className="mt-10 pt-6 border-t border-slate-100 text-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Link to="/auth/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-all duration-300 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
              Quay lại đăng nhập
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-down { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
        .animate-slide-down { animation: slide-down 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
      `}</style>
    </AuthLayout>
  )
}