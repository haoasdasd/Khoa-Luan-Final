/**
 * constants/reactions.constants.ts
 * Facebook-style reaction options used in PostCard and MessageBubble.
 * Adding a new reaction = add one entry here, nothing else changes.
 */
import type { ReactionOption } from '@/types/ui'

export const REACTION_OPTIONS: ReactionOption[] = [
  { emoji: '👍', label: 'Like',  color: '#1877f2' }, // Xanh Blue
  { emoji: '❤️', label: 'Love',  color: '#f33e58' }, // Đỏ hồng
  { emoji: '😂', label: 'Haha',  color: '#f7b928' }, // Vàng
  { emoji: '😮', label: 'Wow',   color: '#f7b928' }, // Vàng
  { emoji: '😢', label: 'Sad',   color: '#f7b928' }, // Vàng
  { emoji: '😡', label: 'Angry', color: '#e9710f' }, // Cam đỏ
]

/** Quick lookup: tra cứu không phân biệt hoa thường */
export const REACTION_BY_LABEL = Object.fromEntries(
  REACTION_OPTIONS.map(r => [r.label.toLowerCase(), r])
) as Record<string, ReactionOption>