import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useLocation } from "react-router-dom";
import { useFeed } from "@/hooks/api/useFeed";
import { PostCard } from "@/components/Feed/PostCard";
import { CreatePost } from "@/components/Feed/CreatePost";
import { LeftSidebar } from "@/components/Navigation/LeftSidebar";
import { RightSidebar } from "@/components/Navigation/RightSidebar";
import { Loader2, RefreshCw } from "lucide-react";

export default function FeedPage() {
  const { ref, inView } = useInView();
  const { hash } = useLocation();
  const { 
    posts, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading, 
    isError, 
    refetch 
  } = useFeed();

  // Logic 1: Infinite Scroll
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Logic 2: Tự động cuộn và Highlight bài viết từ thông báo
  useEffect(() => {
    if (hash && posts.length > 0) {
      // hash có dạng #post-uuid, khớp trực tiếp với id của div bọc PostCard
      const targetId = hash.replace("#", ""); 
      
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          // Cuộn mượt và đưa bài viết vào giữa màn hình
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          
          // Hiệu ứng Highlight: sử dụng ring để nổi bật bài viết
          element.classList.add("ring-4", "ring-blue-500/40", "rounded-2xl", "transition-all", "duration-700");
          
          // Gỡ bỏ highlight sau 3 giây để giao diện trở lại bình thường
          setTimeout(() => {
            element.classList.remove("ring-4", "ring-blue-500/40");
          }, 3000);
        } else {
          console.warn("Không tìm thấy bài viết này trong danh sách hiện tại:", targetId);
        }
      }, 800); // Chờ 800ms để DOM ổn định sau khi dữ liệu Feed load xong
      
      return () => clearTimeout(timer);
    }
  }, [hash, posts]);

  // Hiển thị trạng thái Loading ban đầu
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-[10px]">
          Đang đồng bộ bảng tin...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-20">
      <div className="max-w-[1440px] mx-auto flex justify-center gap-6 px-4">
        
        {/* Sidebar trái */}
        <aside className="hidden xl:block w-[280px] sticky top-20 h-fit">
          <LeftSidebar />
        </aside>

        {/* Cột chính (Feed) */}
        <main className="w-full max-w-[620px] pb-10">
          <CreatePost />
          
          {/* Xử lý lỗi khi tải Feed */}
          {isError && (
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-center mb-6">
              <p className="text-red-600 font-bold mb-2">Ops! Có lỗi khi tải bài viết</p>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 mx-auto text-sm font-black text-red-700 hover:scale-105 transition-transform"
              >
                <RefreshCw size={16} /> THỬ LẠI NGAY
              </button>
            </div>
          )}

          {/* Danh sách bài viết */}
          <div className="space-y-4">
            {posts.map((post) => (
              // ID bọc PostCard để phục vụ tính năng Scroll to Post
              <div key={post.id} id={`post-${post.id}`} className="scroll-mt-24 transition-all"> 
                <PostCard post={post} onSave={() => {}} /> 
              </div>
            ))}
          </div>

          {/* Trigger cho Infinite Scroll */}
          <div ref={ref} className="py-12 flex justify-center">
            {isFetchingNextPage ? (
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            ) : hasNextPage ? (
              <div className="h-1 w-12 bg-slate-200 rounded-full" />
            ) : (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-tighter italic">
                -- Bạn đã xem hết tin mới --
              </p>
            )}
          </div>
        </main>

        {/* Sidebar phải */}
        <aside className="hidden lg:block w-[340px] sticky top-20 h-fit space-y-6">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}