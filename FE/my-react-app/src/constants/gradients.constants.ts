/**
 * constants/gradients.constants.ts
 * Deterministic colour palettes for avatars and profile covers.
 * Using constants (not magic strings) keeps colours consistent.
 */

export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#1877f2,#0288d1)',
  'linear-gradient(135deg,#f9a825,#e65100)',
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#e53935,#b71c1c)',
  'linear-gradient(135deg,#00bcd4,#006064)',
] as const

export const COVER_GRADIENTS = [
  'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
  'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
  'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
  'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
  'linear-gradient(135deg,#f9a825 0%,#e65100 100%)',
] as const