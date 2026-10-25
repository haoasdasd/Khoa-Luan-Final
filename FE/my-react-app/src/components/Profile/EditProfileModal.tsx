import { useToast } from "@/hooks/api/useToast";
import { X, Save, Loader2 } from "lucide-react";
import { useState } from "react";

export function EditProfileModal({ user, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    bio: user.bio,
    // avatar_url, cover_url...
  });
  const { show } = useToast();

  const handleSave = async () => {
    try {
      await onSave(formData);
      show("Cập nhật thông tin thành công!", "success");
      onClose();
    } catch (err) {
      show("Không thể lưu thay đổi", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-900">Chỉnh sửa Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 space-y-5">
           <div className="space-y-2">
             <label className="text-sm font-bold text-slate-700">Tên hiển thị</label>
             <input 
               value={formData.full_name}
               onChange={e => setFormData({...formData, full_name: e.target.value})}
               className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none transition-all font-medium" 
             />
           </div>

           <div className="space-y-2">
             <label className="text-sm font-bold text-slate-700">Tiểu sử (Bio)</label>
             <textarea 
               value={formData.bio}
               rows={4}
               onChange={e => setFormData({...formData, bio: e.target.value})}
               className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none transition-all font-medium resize-none" 
               placeholder="Giới thiệu một chút về bạn..."
             />
           </div>
        </div>

        {/* Footer Modal */}
        <div className="p-6 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-600 hover:text-slate-900 transition-colors">
            Hủy bỏ
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} /> Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}