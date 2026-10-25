/**
 * config/env.config.ts
 * Single source of truth for all environment variables.
 * Import this instead of accessing import.meta.env directly anywhere else.
 */

const env = {
  /** Base URL for the FastAPI REST API (no trailing slash) */
  API_BASE_URL: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000/api',

  /** Derived WebSocket base (swaps http→ws and strips /api) */
  get WS_BASE_URL(): string {
    return this.API_BASE_URL.replace(/^http/, 'ws').replace('/api', '')
  },

  /** Whether the app is running in development mode */
  IS_DEV: import.meta.env.DEV as boolean,
} as const

export default env