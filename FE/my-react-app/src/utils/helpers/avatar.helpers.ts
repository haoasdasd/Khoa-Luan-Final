/**
 * utils/helpers/avatar.helpers.ts
 * Deterministic initials and gradient from a display name.
 */
import { AVATAR_GRADIENTS, COVER_GRADIENTS } from '@/constants/gradients.constants'

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function getAvatarGradient(name: string | null | undefined): string {
  const code = name?.charCodeAt(0) ?? 0
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length]
}

export function getCoverGradient(name: string | null | undefined): string {
  const code = name?.charCodeAt(0) ?? 0
  return COVER_GRADIENTS[code % COVER_GRADIENTS.length]
}