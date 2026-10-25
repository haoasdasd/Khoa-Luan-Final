import { AlertCircle, X, CheckCircle } from "lucide-react";
import { useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'success';
}

export function ConfirmModal({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmText = "Xác nhận", cancelText = "Hủy", 
  type = 'danger' 
}: ConfirmModalProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch(type) {
      case 'danger':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' };
      case 'warning':
        return { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' };
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' };
    }
  };

  const { icon: Icon, color, bg } = getIcon();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 scale-95">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl ${bg} ${color} animate-bounce-in`}>
            <Icon size={24} />
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-all duration-200 hover:rotate-90"
          >
            <X size={20} />
          </button>
        </div>

        <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-3 px-4 rounded-2xl text-white font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg ${
              type === 'danger' 
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-200' 
                : type === 'warning'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-200'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}