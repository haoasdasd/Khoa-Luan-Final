//types/index.ts
export interface User {
  id: string
  username: string
  email: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string
  is_active: boolean
  created_at: string
}

export interface UserPublic {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

export interface Post {
  id: string
  content: string | null
  media_url: string | null
  visibility: string
  created_at: string
  updated_at: string | null
  author: UserPublic
  like_count: number
  comment_count: number
  is_liked: boolean
  is_saved: boolean
}

export interface Comment {
  id: string
  post_id: string
  content: string
  created_at: string
  updated_at: string | null
  author: UserPublic
}

export interface MessageStatus {
  user_id: string
  status: string
  seen_at: string | null
}

export interface MessageReaction {
  user_id: string
  reaction: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  content: string | null
  media_url: string | null
  message_type: string
  created_at: string
  edited_at: string | null
  sender: UserPublic
  statuses: MessageStatus[]
  reactions: MessageReaction[]
}

export interface ConvMember {
  user: UserPublic
  role: string
  joined_at: string
}

export interface Conversation {
  id: string
  name: string | null
  type: string
  created_at: string
  members: ConvMember[]
}

export interface Notification {
  id: string
  type: string
  reference_id: string | null
  is_read: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// Thêm/Sửa các dòng này vào file types
export interface ApiResponse {
  message: string;
}

export interface ApiChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ApiForgotPasswordPayload {
  email: string;
}

export interface ApiResetPasswordPayload {
  email: string;
  otp: string;
  new_password: string;
}