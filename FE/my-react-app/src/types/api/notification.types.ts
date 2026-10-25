/**
 * types/api/notification.types.ts
 */

import type { ReactNode } from "react";

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'message'
  | 'mention'
  | 'tag'
  | 'share'
  | 'friend_request'

export interface ApiNotification {
  content: ReactNode;
  sender: { full_name?: string | null | undefined; username?: string | null | undefined; avatar_url?: string | null | undefined } | null | undefined
  id: string
  user_id: string
  type: NotificationType
  reference_id: string | null
  is_read: boolean
  created_at: string
}