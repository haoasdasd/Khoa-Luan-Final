import type { InfiniteData } from "@tanstack/react-query";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { postsResource } from "@/api";
import type { ApiPost } from "@/types/api";

const PAGE_SIZE = 10; // Hào có thể chỉnh số lượng bài mỗi lần load ở đây

export function useFeed() {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["feed"], // Key để quản lý cache của bảng tin
    
    // Hàm lấy dữ liệu: pageParam sẽ tự động tăng dựa trên getNextPageParam
    queryFn: async ({ pageParam = 0 }) => {
      return await postsResource.list({ 
        offset: pageParam, 
        limit: PAGE_SIZE 
      });
    },

    initialPageParam: 0,

    // Logic để xác định trang tiếp theo
    getNextPageParam: (lastPage, allPages) => {
      // Nếu số bài trả về ít hơn PAGE_SIZE tức là đã hết bài
      if (lastPage.length < PAGE_SIZE) return undefined;
      
      // Tính toán offset tiếp theo = tổng số bài hiện có
      return allPages.length * PAGE_SIZE;
    },
  });

  /** * CÁC HÀM TIỆN ÍCH ĐỂ CẬP NHẬT UI TỨC THÌ (OPTIMISTIC UPDATE)
   */

  // Thêm bài viết mới lên đầu bảng tin mà không cần load lại trang
  const prependPost = (newPost: ApiPost) => {
    queryClient.setQueryData(["feed"], (oldData: InfiniteData<ApiPost[], number> | undefined) => {
      // Nếu chưa có data (do chưa load feed lần nào), tạo trang đầu tiên chứa bài viết mới
      if (!oldData || !oldData.pages) {
        return {
          pages: [[newPost]],
          pageParams: [0],
        };
      }
      return {
        ...oldData,
        pages: [
          [newPost, ...oldData.pages[0]], 
          ...oldData.pages.slice(1),
        ],
      };
    });
  };

  // Xóa bài viết khỏi cache
  const removePostById = (postId: string) => {
    queryClient.setQueryData(["feed"], (oldData: InfiniteData<ApiPost[], number> | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: ApiPost[]) =>
          page.filter((post) => post.id !== postId)
        ),
      };
    });
  };

  // Cập nhật một bài viết (ví dụ: cập nhật like_count)
  const updatePostById = (postId: string, patch: Partial<ApiPost>) => {
    queryClient.setQueryData(["feed"], (oldData: InfiniteData<ApiPost[], number> | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: ApiPost[]) =>
          page.map((post) => 
            post.id === postId 
              ? { ...post, ...patch, ...(patch.top_reactions ? {} : { top_reactions: post.top_reactions || [] }) }
              : post
          )
        ),
      };
    });
  };

  return {
    ...query,
    posts: query.data?.pages.flat() ?? [], // Trải phẳng mảng các trang thành 1 mảng posts duy nhất
    prependPost,
    removePostById,
    updatePostById,
  };
}