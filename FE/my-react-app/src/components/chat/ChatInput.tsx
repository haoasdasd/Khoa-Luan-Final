import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Image, Smile, Paperclip, Loader2, X, Plus, Reply } from "lucide-react";
import type { ApiMessage } from "@/types/api/chat.types";

interface Props {
  sendMessage: (content: string, files?: File[], replyToId?: string) => void;
  sendTyping: (isTyping: boolean) => void;
  replyingMessage?: ApiMessage | null;
  onCancelReply?: () => void;
}

interface FilePreview {
  id: string;
  file: File;
  previewUrl: string;
  type: "image" | "video";
}

export default function ChatInput({ sendMessage, sendTyping, replyingMessage, onCancelReply }: Props) {
  const [text, setText] = useState("");
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🔥 BỘ ĐIỀU KHIỂN TYPING CHUẨN XÁC
  const isTypingRef = useRef(false); // Lưu trạng thái để không spam gửi lên server
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Hàm BẬT typing (Khi bấm vào hoặc gõ)
const stopTyping = useCallback(() => {
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
  }

  isTypingRef.current = false;
  sendTyping(false);
}, [sendTyping]);

const startTyping = useCallback(() => {
  // 1. Chỉ gửi start nếu chưa gửi
  if (!isTypingRef.current) {
    isTypingRef.current = true;
    sendTyping(true);
  }

  // 2. Luôn luôn reset đồng hồ 1.5 giây
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }

  typingTimeoutRef.current = setTimeout(() => {
    stopTyping();
  }, 1500); // 1.5 giây sau khi ngừng gõ mới tắt
}, [sendTyping, stopTyping]);

  useEffect(() => {
    if (replyingMessage) {
      inputRef.current?.focus();
      startTyping(); // Bấm reply cũng tính là đang tương tác
    }
  }, [replyingMessage, startTyping]);

  // Xử lý dọn dẹp khi chuyển phòng chat hoặc tắt component
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews: FilePreview[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith("video") ? "video" : "image",
    }));

    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 10));
    e.target.value = ""; 
    startTyping(); // Đính kèm file cũng tính là đang nhập
  };

  const handleRemoveFile = (id: string) => {
    setPreviews((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  // Xử lý gõ phím
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    // Tự động giãn chiều cao
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";

    // Kích hoạt Typing
    startTyping();
  };

  const handleSend = () => {
    if (!text.trim() && previews.length === 0) return;

    const filesToSend = previews.map((p) => p.file);
    sendMessage(text.trim(), filesToSend.length > 0 ? filesToSend : undefined, replyingMessage?.id);

    // Gửi xong là Dọn dẹp & Tắt Typing luôn
    stopTyping();
    setText("");
    previews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPreviews([]);
    
    if (onCancelReply) onCancelReply();

    if (inputRef.current) {
      inputRef.current.style.height = "40px";
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border-t border-gray-100 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
      
      {/* 1. KHU VỰC REPLY */}
      {replyingMessage && (
        <div className="px-4 py-2 bg-gray-50/80 border-l-4 border-blue-500 flex justify-between items-center animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <Reply size={16} className="text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-blue-600 truncate">
                Đang trả lời {replyingMessage.sender.full_name}
              </p>
              <p className="text-xs text-gray-500 truncate italic">
                {replyingMessage.content || (replyingMessage.media_url ? "[Hình ảnh/Video]" : "Tin nhắn không xác định")}
              </p>
            </div>
          </div>
          <button 
            onClick={onCancelReply}
            className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. KHU VỰC PREVIEW FILE */}
      {previews.length > 0 && (
        <div className="flex gap-3 p-3 px-4 overflow-x-auto pb-2 scrollbar-hide border-b border-gray-50">
          {previews.map((item) => (
            <div key={item.id} className="relative flex-shrink-0 group">
              {item.type === "image" ? (
                <img src={item.previewUrl} className="h-20 w-20 object-cover rounded-xl border-2 border-white shadow-sm" alt="preview" />
              ) : (
                <div className="h-20 w-20 bg-slate-900 rounded-xl flex items-center justify-center border-2 border-white shadow-sm overflow-hidden relative">
                  <video src={item.previewUrl} className="object-cover h-full w-full opacity-70" />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="bg-white/20 p-1 rounded-full backdrop-blur-sm">
                        <Loader2 size={12} className="text-white animate-pulse" />
                     </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => handleRemoveFile(item.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-all scale-0 group-hover:scale-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="h-20 w-20 flex-shrink-0 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-400 transition-all bg-slate-50/50"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* 3. KHUNG NHẬP CHÍNH */}
      <div className="p-3">
        <div className="flex items-end gap-2 p-1.5 bg-slate-50 rounded-2xl border border-transparent focus-within:border-blue-200 focus-within:bg-white focus-within:shadow-md transition-all">
          <div className="flex items-center gap-1 px-1 border-r border-gray-200 mb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            >
              <Image size={20} />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
            />

            <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all hidden sm:block">
              <Paperclip size={20} />
            </button>
          </div>

          {/* 🔥 Gắn 3 sự kiện kích hoạt Typing vào đây */}
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onFocus={startTyping} // Bấm vào (Focus) là hiện chữ đang nhập
            onBlur={stopTyping}   // Bấm ra ngoài (Blur) là mất chữ ngay lập tức
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] py-2 outline-none text-gray-700 resize-none max-h-32"
            style={{ height: "40px" }}
          />

          <div className="flex items-center gap-1 mb-1">
            <button className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-xl transition-all">
              <Smile size={20} />
            </button>

            <button
              onClick={handleSend}
              disabled={!text.trim() && previews.length === 0}
              className={`p-2.5 rounded-xl transition-all ${
                text.trim() || previews.length > 0
                  ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
