/**
 * hooks/api/useConversations.ts
 */
import { useState, useEffect, useCallback } from 'react'
import { chatResource } from '@/api'
import type { ApiConversation, ApiCreateConversationPayload } from '@/types/api'

interface UseConversationsReturn {
  conversations: ApiConversation[]
  loading:       boolean
  create:        (payload: ApiCreateConversationPayload) => Promise<ApiConversation>
  prepend:       (conv: ApiConversation) => void
}

export function useConversations(p0: boolean): UseConversationsReturn {
  const [conversations, setConversations] = useState<ApiConversation[]>([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    chatResource.conversations()
      .then(cs => setConversations(cs))
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [])

const create = useCallback(async (payload: ApiCreateConversationPayload) => {
  const conv = await chatResource.create({
    ...payload,
    name: payload.name ?? "" // ✅ Đảm bảo name không bị undefined
  })
  setConversations(prev => [conv, ...prev])
  return conv
}, [])

  const prepend = useCallback((conv: ApiConversation) => {
    setConversations(prev => [conv, ...prev])
  }, [])

  return { conversations, loading, create, prepend }
}