/**
 * api/resources/notifications.resource.ts
 */
import { authorizedFetch } from '@/api/interceptors/auth.interceptor'
import type { ApiNotification } from '@/types/api'

export const notificationsResource = {
  // Lấy danh sách thông báo (phân trang)
  list(offset = 0, limit = 20): Promise<ApiNotification[]> {
    return authorizedFetch(`/notifications?offset=${offset}&limit=${limit}`)
  },

  // Lấy riêng số lượng chưa đọc để hiện Badge cho nhẹ
  getUnreadCount(): Promise<{ unread_count: number }> {
    return authorizedFetch('/notifications/unread-count')
  },

  // Đánh dấu 1 cái đã đọc
  markRead(id: string): Promise<void> {
    return authorizedFetch(`/notifications/${id}/read`, { method: 'POST' })
  },

  // Đánh dấu tất cả đã đọc
  markAllRead(): Promise<void> {
    return authorizedFetch('/notifications/read-all', { method: 'POST' })
  }
}