/**
 * hooks/ui/useToast.ts
 * Lightweight toast queue — no external library needed.
 */
import { useState, useCallback } from 'react'
import type { ToastState } from '@/types/ui'

let toastId = 0

interface UseToastReturn {
  toasts: ToastState[]
  show:   (message: string, type?: ToastState['type'], duration?: number) => void
  dismiss:(id: string) => void
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((
    message:  string,
    type:     ToastState['type'] = 'info',
    duration: number = 3000,
  ) => {
    const id = String(++toastId)
    setToasts(prev => [...prev, { id, message, type, duration }])
    setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  return { toasts, show, dismiss }
}