import type { ApiTokenResponse } from '@/types/api'

// Thống nhất tên key để không bị lẫn lộn giữa các phiên bản
const ACCESS_KEY = 'social_app_access_token'
const REFRESH_KEY = 'social_app_refresh_token'

export const tokenService = {
  getAccessToken(): string | null { 
    return localStorage.getItem(ACCESS_KEY) 
  },

  getRefreshToken(): string | null { 
    return localStorage.getItem(REFRESH_KEY) 
  },

  setTokens(tokens: ApiTokenResponse): void {
    localStorage.setItem(ACCESS_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  },

  clearTokens(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },

  /** Kiểm tra xem có access token hay không */
  hasTokens(): boolean {
    return Boolean(this.getAccessToken())
  },

  /** * Giải mã JWT để kiểm tra thời hạn (expiry)
   * Giúp ứng dụng chủ động refresh token trước khi gửi request bị lỗi 401
   */
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      // payload.exp là thời gian tính bằng giây, cần nhân 1000 để so sánh với ms
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  }
}