import { useState, useRef, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

interface MediaDisplayProps {
  url: string;
  context?: "post" | "comment" | "chat" | "shared";
  className?: string;
  isSharedChild?: boolean;
}

export const MediaDisplay = ({
  url,
  context = "post",
  className = "",
  isSharedChild,
}: MediaDisplayProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Nhận diện Video
  const isVideo = useMemo(() => {
    if (!url) return false;
    return (
      url.match(/\.(mp4|webm|ogg|mov|quicktime)$/i) ||
      url.includes("/video/upload/") ||
      (url.includes("res.cloudinary.com") && url.includes("/video/"))
    );
  }, [url]);

  // 2. Logic Điều khiển Video (Autoplay & Stop when Modal open)
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !isVideo) return;

    // Hàm xử lý khi nhận tín hiệu Modal mở/đóng
    const handleModalState = () => {
      videoElement.pause(); 
    };

    // Lắng nghe sự kiện từ RightSidebar
    window.addEventListener('MODAL_OPENED', handleModalState);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Khi video vào tầm mắt, cố gắng phát (phải muted mới chạy được)
            videoElement.play().catch(() => {
              // Fail-safe nếu trình duyệt chặn
              videoElement.muted = true;
              videoElement.play().catch(() => {});
            });
          } else {
            videoElement.pause();
          }
        });
      },
      { threshold: 0.5 } // Hiện trên 50% diện tích thì mới phát
    );

    observer.observe(videoElement);

    return () => {
      window.removeEventListener('MODAL_OPENED', handleModalState);
      if (videoElement) observer.unobserve(videoElement);
    };
  }, [url, isVideo]);

  if (!url) return null;

  const contextStyles = {
    post: "rounded-xl w-full",
    shared: "rounded-xl w-full",
    comment: "max-h-48 rounded-lg w-fit",
    chat: "max-h-80 rounded-2xl w-fit",
  };

  return (
    <div
      className={`relative overflow-hidden border border-slate-100 bg-slate-100 flex items-center justify-center ${contextStyles[context]} ${className}`}
      style={{ 
        width: '100%',
        backgroundColor: "#000",
      }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-0 bg-slate-50">
          <Loader2 size={20} className="animate-spin text-slate-300" />
        </div>
      )}

      {isVideo ? (
        <video
          ref={videoRef}
          key={url}
          src={url}
          controls
          muted
          loop
          playsInline
          className="w-full h-auto max-h-[600px] object-contain relative z-20 block shadow-inner"
          onLoadedData={() => setIsLoaded(true)}
        />
      ) : (
        <img
          src={url}
          key={url}
          className="w-full h-auto max-h-[600px] object-cover relative z-10 block" 
          onLoad={() => setIsLoaded(true)}
          alt="Content"
        />
      )}
    </div>
  );
};