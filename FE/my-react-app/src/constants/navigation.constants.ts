/**
 * constants/navigation.constants.ts
 * Top navbar tabs and left sidebar items.
 * Centralised so adding a new page only requires one file change.
 */
import { ROUTES } from '@/config/routes.config'
import type { NavTab } from '@/types/ui'

/** Centre tabs in the main navbar */
export const NAVBAR_TABS: NavTab[] = [
  { to: ROUTES.FEED,      label: 'Home',    icon: '🏠' },
  { to: ROUTES.WATCH,     label: 'Watch',   icon: '📺' },
  { to: ROUTES.FRIENDS,   label: 'Friends', icon: '👥' },
  { to: ROUTES.GROUPS,    label: 'Groups',  icon: '🏘️' },
  { to: ROUTES.GAMING,    label: 'Gaming',  icon: '🎮' },
]

/** Left sidebar navigation items */
export const LEFT_NAV_ITEMS = [
  { to: ROUTES.FEED,        icon: '🏠', label: 'Feed',           color: 'linear-gradient(135deg,#1877f2,#0288d1)' },
  { to: ROUTES.FRIENDS,     icon: '👥', label: 'Friends',        color: 'linear-gradient(135deg,#00d9f5,#0062ff)' },
  { to: ROUTES.WATCH,       icon: '📺', label: 'Watch',          color: 'linear-gradient(135deg,#1877f2,#1565c0)' },
  { to: ROUTES.MARKETPLACE, icon: '🏪', label: 'Marketplace',    color: 'linear-gradient(135deg,#f44336,#c62828)' },
  { to: ROUTES.GROUPS,      icon: '🏘️', label: 'Groups',         color: 'linear-gradient(135deg,#1877f2,#0288d1)' },
  { to: ROUTES.GAMING,      icon: '🎮', label: 'Gaming',         color: 'linear-gradient(135deg,#9c27b0,#673ab7)' },
  { to: ROUTES.MEMORIES,    icon: '🕰️', label: 'Memories',       color: 'linear-gradient(135deg,#9c27b0,#4a148c)' },
  { to: ROUTES.SAVED,       icon: '🔖', label: 'Saved',          color: 'linear-gradient(135deg,#673ab7,#512da8)' },
  { to: ROUTES.EVENTS,      icon: '📅', label: 'Events',         color: 'linear-gradient(135deg,#e53935,#b71c1c)' },
] as const

/** Left sidebar shortcut groups (user-configurable in real FB) */
export const LEFT_NAV_SHORTCUTS = [
  { label: 'Photography Club', icon: '📷', color: '#ff6f00' },
  { label: 'Web Developers',   icon: '💻', color: '#1565c0' },
  { label: 'Hiking Trails',    icon: '🏔️', color: '#2e7d32' },
] as const

/** Profile page tab labels */
export const PROFILE_TABS = ['posts', 'about', 'friends', 'photos', 'videos'] as const
export type ProfileTabId = (typeof PROFILE_TABS)[number]

/** Notification type → human-readable label + icon */
export const NOTIFICATION_META: Record<string, { icon: string; label: string }> = {
  like:           { icon: '👍', label: 'liked your post' },
  comment:        { icon: '💬', label: 'commented on your post' },
  follow:         { icon: '👥', label: 'sent you a friend request' },
  message:        { icon: '💌', label: 'sent you a message' },
  mention:        { icon: '🏷️', label: 'mentioned you in a post' },
  tag:            { icon: '🏷️', label: 'tagged you in a photo' },
  share:          { icon: '🔄', label: 'shared your post' },
  friend_request: { icon: '👥', label: 'sent you a friend request' },
}