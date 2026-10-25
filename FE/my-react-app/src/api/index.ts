/**
 * api/index.ts
 * Single import point for all API resources.
 * Usage: import { postsResource, chatResource } from '@/api'
 */
export { authResource }         from './resources/auth.resource'
export { usersResource }        from './resources/users.resource'
export { postsResource }        from './resources/posts.resource'
export { commentsResource }     from './resources/comments.resource'
export { chatResource }         from './resources/chat.resource'
export { notificationsResource }from './resources/notifications.resource'
export { reportsResource }       from './resources/reports.resource'
export { ChatSocketClient }     from './ws.client'
export * from './resources/call.api'
export { ApiError }             from './interceptors/auth.interceptor'

