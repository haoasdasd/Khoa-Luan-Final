// api/interceptors/auth.interceptor.ts

import env from '@/config/env.config'
import { ROUTES } from '@/config/routes.config'
import { tokenService } from '@/services/token.service'
import type { ApiTokenResponse } from '@/types/api'

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = tokenService.getRefreshToken()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${env.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) return false

      const tokens = await res.json() as ApiTokenResponse
      tokenService.setTokens(tokens)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  }
  const token = tokenService.getAccessToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export class ApiError extends Error {
  public readonly status: number
  public readonly detail: unknown // Đổi thành any để chứa được Object lỗi từ FastAPI

  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : 'API Error')
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export async function publicFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${env.API_BASE_URL}${path}`;
  
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    let detail = 'Public API Error';
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

export async function authorizedFetch<T>(
  path: string,
  init: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const url = `${env.API_BASE_URL}${path}`
  
  // 1. Khởi tạo headers từ hàm buildHeaders
  const heads = buildHeaders(init.headers as Record<string, string>)
  
  // 2. 🔥 QUAN TRỌNG: Nếu gửi File (FormData), phải xóa Content-Type để trình duyệt tự set boundary
  if (init.body instanceof FormData) {
    delete heads['Content-Type'];
  }

  const res = await fetch(url, { ...init, headers: heads })

  // 3. Xử lý Refresh Token (401)
  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefreshToken()
    if (refreshed) return authorizedFetch<T>(path, init, true)

    tokenService.clearTokens()
    if (typeof window !== 'undefined') {
        window.location.href = ROUTES.AUTH
    }
    throw new ApiError(401, 'Session expired')
  }

  // 4. Xử lý lỗi (để không bị lỗi res.json() khi gặp 422, 500, 404)
  if (!res.ok) {
    let errorDetail;
    try {
      const errorBody = await res.json();
      errorDetail = errorBody.detail || 'Unknown error';
    } catch {
      errorDetail = res.statusText;
    }
    throw new ApiError(res.status, errorDetail);
  }

  if (res.status === 204) return undefined as T;
  
  // 5. Trả về kết quả JSON
  return res.json() as Promise<T>
}