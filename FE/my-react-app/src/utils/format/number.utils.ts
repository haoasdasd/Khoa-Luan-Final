// src/utils/format/number.utils.ts
/**
 * utils/format/number.utils.ts
 * Các hàm định dạng số cho hiển thị.
 * Ví dụ: 1500 => "1.5K", 2000000 => "2M"
 */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Formats a friend/follower count with label: "1,284 friends" */
export function formatFriendCount(n: number): string {
  return `${n.toLocaleString()} friend${n !== 1 ? 's' : ''}`
}