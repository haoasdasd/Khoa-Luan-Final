import { useInfiniteQuery } from "@tanstack/react-query";
import { postsResource } from "@/api";
import { PostCard } from "@/components/Feed/PostCard";
import { Loader2, Bookmark, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";

export default function SavedPostsPage() {
  const { ref, inView } = useInView();
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ["saved-posts"],
    queryFn: ({ pageParam = 0 }) => 
      postsResource.getSavedPosts({ offset: pageParam, limit: 10 }),
    getNextPageParam: (lastPage, allPages) => {
      // Nếu trang cuối trả về đủ 10 bài thì có khả năng còn trang tiếp theo
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
    initialPageParam: 0,
  });

  // Tự động load thêm khi cuộn xuống cuối trang
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const allSavedPosts = data?.pages.flat() || [];

  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-10">
      {/* HEADER TĨNH */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bài viết đã lưu</h1>
            <p className="text-[12px] text-gray-500 font-medium">Danh sách riêng tư của bạn</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto mt-6 px-4">
        {allSavedPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark size={40} className="text-blue-500" fill="currentColor" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Chưa có bài viết nào</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">
              Lưu bài viết để có thể dễ dàng xem lại chúng sau này.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {allSavedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {/* TRIGGER LOAD MORE */}
            <div ref={ref} className="py-8 flex justify-center">
              {isFetchingNextPage && (
                <Loader2 className="animate-spin text-blue-500" size={24} />
              )}
              {!hasNextPage && allSavedPosts.length > 0 && (
                <p className="text-sm text-gray-400 font-medium italic">Bạn đã xem hết danh sách lưu trữ</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}