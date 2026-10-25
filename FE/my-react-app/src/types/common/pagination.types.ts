/**
 * types/common/pagination.types.ts
 * Generic pagination shapes reused across all list queries.
 */

export interface PaginationParams {
  offset?: number
  limit?: number
}

export interface PaginatedResult<T> {
  items: T[]
  offset: number
  limit: number
  hasMore: boolean
}

/** Async data state — wraps any piece of remote data */
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}