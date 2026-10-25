/**
 * api/resources/call.api.ts
 * All /calls/* endpoint calls.
 */
import { authorizedFetch } from '@/api/interceptors/auth.interceptor'
import type { ApiCallSession, ApiStartCallPayload } from '@/types/api'

const callResource = {
  /**
   * Bắt đầu cuộc gọi mới — người gọi tự động được join.
   * POST /calls/start
   */
  start(payload: ApiStartCallPayload): Promise<ApiCallSession> {
    return authorizedFetch('/calls/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Người nhận nhấn "Nghe máy" — ghi nhận join phiên gọi.
   * POST /calls/{call_id}/join
   */
  join(callId: string): Promise<ApiCallSession> {
    return authorizedFetch(`/calls/${callId}/join`, { method: 'POST' })
  },

  /**
   * User rời phòng (cuộc gọi vẫn còn nếu có người khác).
   * POST /calls/{call_id}/leave
   */
  leave(callId: string): Promise<void> {
    return authorizedFetch(`/calls/${callId}/leave`, { method: 'POST' })
  },

  /**
   * Chỉ người khởi tạo mới được kết thúc hoàn toàn phiên gọi.
   * POST /calls/{call_id}/end
   */
  end(callId: string): Promise<ApiCallSession> {
    return authorizedFetch(`/calls/${callId}/end`, { method: 'POST' })
  },

  /**
   * Lấy thông tin & trạng thái cuộc gọi.
   * GET /calls/{call_id}
   */
  get(callId: string): Promise<ApiCallSession> {
    return authorizedFetch(`/calls/${callId}`)
  },
}

export default callResource