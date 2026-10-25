/**
 * types/api/post.types.ts
 */
import type { ApiUserPublic } from './user.types'

// types/api/post.types.ts

export type PostVisibility = 'public' | 'friends' | 'private'

// SỬA Ở ĐÂY: Đưa về chữ thường để khớp với DB và logic so sánh .toLowerCase()
export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'

export interface ApiPost {
  [x: string]: any;
  id: string;
  content: string | null;
  media_url: string | null;
  visibility: PostVisibility;
  created_at: string;
  updated_at: string | null;
  is_edited: boolean; // Sửa lại thành boolean
  author: ApiUserPublic;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_saved: boolean;
  reaction_type: string | null;
  // THÊM DÒNG NÀY ĐỂ LIÊN KẾT VỚI BÀI GỐC KHI SHARE
  shared_post?: ApiPost | null; 
  top_reactions: string[];
}
export interface ApiComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  media_url: string | null;
  created_at: string;
  updated_at: string | null;
  author: ApiUserPublic;
  replies: ApiComment[];
  is_deleted: boolean; 
  reply_count: number;
  // --- PHẢI CÓ 4 DÒNG NÀY ĐỂ ĐỒNG BỘ LIKE & ICON ---
  is_liked: boolean;
  like_count: number;
  reaction_type: string | null; // Loại reaction của chính mình (like, haha, tim...)
  top_reactions: string[];      // QUAN TRỌNG: Danh sách icon tổng hợp (['like', 'haha'])
}


// Cập nhật payload cho hành động Like/Reaction
export interface ApiLikePayload {
  type: ReactionType
}

export interface ApiCreatePostPayload {
  content?: string
  media_url?: string
  visibility?: PostVisibility
}

export interface ApiUpdatePostPayload {
  content?: string
  visibility?: PostVisibility
}

export interface ApiCreateCommentPayload {
  content: string
  parent_id?: string
  media_url?: string;
}