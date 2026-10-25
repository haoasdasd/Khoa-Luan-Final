/**
 * types/api/chat.types.ts
 * Conversation, Message, MessageStatus, Reaction contracts.
 */
import type { ApiUserPublic } from './user.types'

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'call' | 'system'
export type MessageStatusValue = 'sent' | 'delivered' | 'seen'
export type ConversationType = 'private' | 'group'

export interface ApiMessageStatus {
  user_id: string
  status: MessageStatusValue
  seen_at: string | null
}

export interface ApiMessageReaction {
  user_id: string
  reaction: string
  created_at: string
}

export interface ApiMessage {
  status: string
  id: string
  conversation_id: string
  content: string | null
  media_url: string | null
  message_type: MessageType
  created_at: string
  edited_at: string | null
  deleted_at: string | null
  sender: ApiUserPublic
  statuses: ApiMessageStatus[]
  reactions: ApiMessageReaction[]
  reply_to: ApiMessageShort | null
}

export interface ApiConversationMember {
  user: ApiUserPublic
  role: 'admin' | 'member'
  joined_at: string
  is_accepted: boolean
  last_seen_message_id: string | null
}

export interface ApiConversation {
  id: string
  name: string | null
  avatar_url?: string // 👈 Tự động map từ đối phương nếu là chat private
  type: ConversationType
  created_at: string
  updated_at?: string
  last_message: ApiMessage | null // 👈 Chứa object tin nhắn cuối để hiện ở Sidebar
  members: ApiConversationMember[]
  is_online?: boolean // 👈 Trạng thái trực tuyến real-time
  unread_count?: number // 👈 Số tin nhắn chưa đọc
}

export interface ApiCreateConversationPayload {
  type: ConversationType
  name?: string
  member_ids: string[]
}

export interface ApiSendMessagePayload {
  content?: string
  media_url?: string
  message_type?: MessageType
}

export interface ApiUpdateMessageStatusPayload {
  status: MessageStatusValue // 'sent' | 'delivered' | 'seen'
}

export interface ApiReactionPayload {
  reaction: string
}

export interface ApiStringeeToken {
  token: string
  user_id: string
  expire_in: number
}

export interface ApiMessageShort {
  id: string
  content: string | null
  media_url: string | null
  message_type: MessageType
  sender: ApiUserPublic
}