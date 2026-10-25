/**
 * types/api/user.types.ts
 * Shapes that mirror the FastAPI /users endpoints exactly.
 * Never add UI-only fields here — keep API contract pure.
 */

export interface ApiUser {
  id: string
  username: string
  email: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string
  is_active: boolean
  created_at: string
  updated_at: string | null
  cover_url?: string | null
  deleted_at: string | null
}

/** Public projection returned by GET /users/:username */
export interface ApiUserPublic {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  is_online?: boolean
  mutual_count?: number
}

export interface ApiUpdateUserPayload {
  cover_url?: string
  full_name?: string
  bio?: string
  avatar_url?: string
}

export interface ApiUserProfileResponse {
  user: ApiUser;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;

}