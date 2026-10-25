/**
 * api/resources/reports.resource.ts
 * POST /reports — report a user or post for policy violation.
 */
import { authorizedFetch } from '@/api/interceptors/auth.interceptor'

export type ReportTargetType = 'user' | 'post'

export interface ReportPayload {
  target_type: ReportTargetType
  target_id:   string
  reason:      string
}

export const reportsResource = {
  create(payload: ReportPayload): Promise<void> {
    return authorizedFetch('/reports', {
      method: 'POST',
      body:   JSON.stringify(payload),
    })
  },
}