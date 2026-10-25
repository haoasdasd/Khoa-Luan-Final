// hooks/api/useUserPosts.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { postsResource } from '@/api' // Đảm bảo trong api/posts.ts có hàm getUserPosts
import type { ApiPost } from '@/types/api'

interface UseUserPostsResult {
  posts:      ApiPost[]
  loading:    boolean
  hasMore:    boolean
  loadMore:   () => void
  prepend:    (p: ApiPost) => void
  removeById: (id: string) => void
}
const PAGE_SIZE = 20

export function useUserPosts(userId: string | undefined): UseUserPostsResult {
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const offsetRef = useRef(0)

  const fetchProfilePosts = useCallback(async (isReset: boolean = false) => {
    if (!userId) return
    
    if (isReset) {
      setLoading(true)
      // Không nên setOffset(0) ở đây vì offset phụ thuộc vào state cũ khi render
    }

    try {
      const currentOffset = isReset ? 0 : offsetRef.current
      
      // SỬA Ở ĐÂY: Gọi đúng endpoint lấy bài của riêng User này
      // Endpoint này ở Backend sẽ KHÔNG lọc 8h
      const data = await postsResource.getUserPosts(userId, { 
        offset: currentOffset, 
        limit: PAGE_SIZE 
      })

      setPosts(prev => isReset ? data : [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
      offsetRef.current = currentOffset + data.length
    } catch (error) {
      console.error("Lỗi lấy bài viết profile:", error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Lắng nghe sự thay đổi của userId để tải lại trang
  useEffect(() => { 
    fetchProfilePosts(true) 
  }, [fetchProfilePosts])

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    fetchProfilePosts(false)
  }, [loading, hasMore, fetchProfilePosts])

  const prepend = (p: ApiPost) => setPosts(prev => [p, ...prev])
  const removeById = (id: string) => setPosts(prev => prev.filter(x => x.id !== id))

  return { posts, loading, hasMore, loadMore, prepend, removeById }
}