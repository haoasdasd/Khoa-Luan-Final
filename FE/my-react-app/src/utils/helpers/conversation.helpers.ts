/**
 * utils/helpers/conversation.helpers.ts
 * Pure helpers for conversation display logic.
 */
import type { ApiConversation, ApiConversationMember } from '@/types/api'

/** Returns the display name for a conversation from the current user's perspective. */
export function getConvName(conv: ApiConversation, meId?: string): string {
  if (conv.type === 'group') return conv.name ?? 'Group chat'
  const other = getOtherMember(conv, meId)
  return other?.user.full_name ?? other?.user.username ?? 'Chat'
}

/** Returns the other participant in a private conversation. */
export function getOtherMember(
  conv: ApiConversation,
  meId?: string,
): ApiConversationMember | undefined {
  return conv.members.find(m => m.user.id !== meId)
}