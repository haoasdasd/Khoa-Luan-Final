import { useState, useEffect, useCallback } from 'react'
import { notificationsResource } from '@/api'
import { socketInstance } from '@/api/socket.instance'
import type { ApiNotification } from '@/types/api'

export function useNotifications() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const init = useCallback(async () => {
    try {
      const [list, countRes] = await Promise.all([
        notificationsResource.list(),
        notificationsResource.getUnreadCount()
      ])
      setNotifications(list)
      setUnreadCount(countRes.unread_count)
    } catch (error) {
      console.error("Lỗi tải thông báo:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { init() }, [init])

  useEffect(() => {
  // Hàm .on() tự trả về một hàm hủy lắng nghe khi thực thi
  const unsubscribe = socketInstance.on((payload) => {
    if (payload.event === "new_notification") {
      const newNotif = payload.data as ApiNotification;
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    }
  });

  // Chỉ cần gọi hàm unsubscribe này ở tầng cleanup của useEffect là xong
  return () => unsubscribe();
}, []);

  const markRead = async (id: string) => {
    try {
      await notificationsResource.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e) }
  };

  const markAllRead = async () => {
    try {
      await notificationsResource.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e) }
  };

  return { notifications, unreadCount, loading, markRead, markAllRead };
}