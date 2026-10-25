import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/api/useAuth";
import { useFeed } from "@/hooks/api/useFeed";
import { postsResource } from "@/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
// Nhớ Import thêm Video và Film
import { Image, Film, Smile, Loader2, X, Send } from "lucide-react";
import { toast } from "sonner";
// 1. IMPORT THƯ VIỆN NÉN ẢNH
import imageCompression from "browser-image-compression";
import { UserAvatar } from "../common/UserAvatar";

// CẤU HÌNH GIỚI HẠN
const MAX_IMAGE_SIZE_MB = 1; // Bóp ảnh về dưới 1MB
const MAX_VIDEO_SIZE_MB = 10; // Giới hạn video tối đa 10MB

export function CreatePost() {
  const { user } = useAuth();
  const { prependPost } = useFeed();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "video" | null>(null); // Nhận diện loại file
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOGIC 1: NÉN ẢNH CỰC MẠNH ---
  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: MAX_IMAGE_SIZE_MB, // Nén về dưới 1MB
      maxWidthOrHeight: 1920, // Giới hạn chiều rộng/cao tối đa (Full HD)
      useWebWorker: true, // Chạy ngầm để không lag giao diện
      initialQuality: 0.8, // Chất lượng ảnh ban đầu
    };
    try {
      toast.info("Đang tối ưu hóa hình ảnh...");
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Lỗi nén ảnh:", error);
      return file; // Nếu lỗi thì dùng file gốc (ít xảy ra)
    }
  };

  // CreatePost.tsx

  const uploadToCloudinary = async (file: File, type: "image" | "video") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "social_preset"); // Đaảm bảo trên web Hào đặt tên y hệt thế này

    // THAY 'socialnetwork' THÀNH 'dskrtvdcm'
    const apiUrl = `https://api.cloudinary.com/v1_1/dskrtvdcm/${type}/upload`;

    const response = await fetch(apiUrl, { method: "POST", body: formData });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("LỖI TỪ CLOUDINARY:", errorData.error.message);
      throw new Error(errorData.error.message);
    }

    const data = await response.json();
    return data.secure_url;
  };

  const createMutation = useMutation({
    mutationFn: async (payload: {
      content: string;
      media_url?: string;
      media_type?: string;
    }) => postsResource.create(payload), // Nhớ cập nhật Backend/Hook để nhận media_type nhé Hào
    onSuccess: (newPost) => {
      prependPost(newPost);
      handleReset();
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Đã đăng bài viết mới!");
    },
    onError: () => toast.error("Có lỗi xảy ra, thử lại nhé Hào!"),
  });

  const handleReset = () => {
    setContent("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileType(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  // --- LOGIC 3: XỬ LÝ CHỌN FILE (KIỂM TRA DUNG LƯỢNG) ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (isImage) {
      // Ảnh thì không chặn dung lượng ở đây vì mình sẽ nén nó sau
      setFileType("image");
    } else if (isVideo) {
      // VIDEO: CHẶN NẾU QUÁ GIỚI HẠN MB
      const fileSizeMB = file.size / 1024 / 1024;
      if (fileSizeMB > MAX_VIDEO_SIZE_MB) {
        toast.error(
          `Video quá nặng! Vui lòng chọn file dưới ${MAX_VIDEO_SIZE_MB}MB.`,
        );
        e.target.value = ""; // Reset input file
        return;
      }
      setFileType("video");
    } else {
      toast.error("Định dạng file không hỗ trợ!");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handlePost = async () => {
    if (!content.trim() && !selectedFile) return;

    try {
      setIsUploading(true);
      let media_url = "";

      if (selectedFile && fileType) {
        let fileToUpload = selectedFile;

        // NẾU LÀ ẢNH -> THỰC HIỆN BÓP ẢNH TRƯỚC
        if (fileType === "image") {
          fileToUpload = await compressImage(selectedFile);
          console.log(
            `Kích thước sau khi nén: ${fileToUpload.size / 1024 / 1024} MB`,
          );
        }

        // Đẩy lên Cloudinary (Video giữ nguyên dung lượng vì đã chặn ở bước chọn file)
        toast.info(
          fileType === "video"
            ? "Đang tải video lên (có thể mất chút thời gian)..."
            : "Đang tải ảnh lên...",
        );
        media_url = await uploadToCloudinary(fileToUpload, fileType);
      }

      createMutation.mutate({
        content: content.trim(),
        media_url: media_url || undefined,
        media_type: fileType || undefined, // Gửi kèm loại file để BE biết đường render
      });
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tải dữ liệu lên!");
    } finally {
      setIsUploading(false);
    }
  };
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [content]);
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border transition-all duration-500 ${
        isFocused || previewUrl
          ? "ring-2 ring-blue-50 border-blue-200"
          : "border-slate-100"
      }`}
    >
      <div className="p-4">
        <div className="flex gap-3 items-start">
          {/* Avatar bên trái */}
          <UserAvatar user={user} size="md" className="mt-1" />

          {/* Cột nội dung bên phải */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tên người dùng hiện ngay trên ô nhập cho thân thiện */}
            <span className="text-sm font-bold text-slate-700 ml-1 mb-0.5">
              {user?.full_name}
            </span>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full bg-transparent border-none py-1 text-slate-800 text-[17px] outline-none resize-none placeholder:text-slate-400 min-h-[45px] transition-all duration-200 ease-in-out"
              placeholder={`${user?.full_name?.split(" ").pop()} ơi, hôm nay có gì vui?`}
              rows={1}
            />

            {/* AREA: PREVIEW ĐỘNG (ẢNH HOẶC VIDEO) */}
            {previewUrl && (
              <div className="relative mt-3 group animate-in zoom-in-95 duration-300">
                {fileType === "video" ? (
                  <video
                    src={previewUrl}
                    controls
                    className="rounded-xl w-full max-h-[400px] bg-black border border-slate-100"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="rounded-xl w-full object-cover max-h-[400px] border border-slate-100"
                  />
                )}
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all backdrop-blur-sm"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-50 bg-slate-50/30 rounded-b-2xl">
        <div className="flex gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*" // Chấp nhận cả ảnh và video
            className="hidden"
          />

          {/* Nút bấm thông minh: Nếu có file thì hiện nút đổi file, không thì hiện nút chọn file */}
          {!previewUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:bg-green-50 hover:text-green-600 transition-all font-medium"
            >
              <Image size={20} className="text-green-500" />
              <span className="text-sm hidden sm:inline">Ảnh/Video</span>
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-all font-medium animate-in fade-in"
            >
              <Film size={20} className="text-blue-500" />
              <span className="text-sm hidden sm:inline">Đổi file khác</span>
            </button>
          )}

          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:bg-yellow-50 hover:text-yellow-600 transition-all font-medium">
            <Smile size={20} className="text-yellow-500" />
            <span className="text-sm hidden sm:inline">Cảm xúc</span>
          </button>
        </div>

        <button
          onClick={handlePost}
          disabled={
            (!content.trim() && !selectedFile) ||
            createMutation.isPending ||
            isUploading
          }
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-100 active:scale-95"
        >
          {createMutation.isPending || isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send size={16} />
          )}
          Đăng bài
        </button>
      </div>
    </div>
  );
}
