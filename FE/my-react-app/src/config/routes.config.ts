/**
 * config/routes.config.ts
 * All application route paths in one place.
 * Change a path here and it updates everywhere automatically.
 */

export const ROUTES = {
  // Public
  AUTH: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot',
  // App
  FEED:          '/feed',
  PROFILE:       '/profile',
  PROFILE_USER:  '/profile/:username',
  CHAT: '/chat',
  CHAT_CONVERSATION: "/chat/:convId",
  NOTIFICATIONS: '/notifications',
  FRIENDS:       '/friends',
  GROUPS:        '/groups',
  MARKETPLACE:   '/marketplace',
  WATCH:         '/watch',
  MEMORIES:      '/memories',
  SAVED:         '/saved',
  EVENTS:        '/events',
  GAMING:        '/gaming',
  CALL: "/call/:convId",
} as const

/** Helper: build a dynamic profile URL */
export const profileUrl = (username: string) => `/profile/${username}`

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]