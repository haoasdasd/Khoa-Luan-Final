/**
 * types/ui/component.types.ts
 * UI-only types: props shapes, theme variants, interaction state.
 * These never touch the backend wire format.
 */
import type React from 'react'

// ── Generic prop helpers ──────────────────────────────────────────────────────

export type WithChildren = { children: React.ReactNode }
export type WithClassName = { className?: string }
export type WithStyle = { style?: React.CSSProperties }
export type WithTestId = { 'data-testid'?: string }

// ── Button variants ───────────────────────────────────────────────────────────

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'blue-light'

export type ButtonSize = 'sm' | 'md' | 'lg'

// ── Avatar ────────────────────────────────────────────────────────────────────

export interface AvatarProps extends WithStyle {
  src?: string | null
  name?: string | null
  size?: number
  online?: boolean
  className?: string
}

// ── Tab / navigation ──────────────────────────────────────────────────────────

export interface NavTab {
  to: string
  label: string
  icon: string
  badge?: number
}

// ── Story card ────────────────────────────────────────────────────────────────

export interface StoryCard {
  id: string
  authorName: string
  gradient: string
}

// ── Reaction ──────────────────────────────────────────────────────────────────

export interface ReactionOption {
  emoji: string
  label: string
  color: string
}

// ── Toast notification ────────────────────────────────────────────────────────

export interface ToastState {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}