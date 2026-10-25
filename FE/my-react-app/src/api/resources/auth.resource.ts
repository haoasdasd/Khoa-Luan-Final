/**
 * api/resources/auth.resource.ts
 * All /auth/* endpoint calls. Pure functions — no state, no side-effects beyond HTTP.
 */
import {
  publicFetch,
  authorizedFetch,
} from "@/api/interceptors/auth.interceptor";
import type {
  ApiTokenResponse,
  ApiLoginPayload,
  ApiRegisterPayload,
  ApiChangePasswordPayload,
  ApiUser,
  ApiForgotPasswordPayload,
  ApiResetPasswordPayload,
  ApiResponse,
  ApiUserPublic,
} from "@/types/api";

export const authResource = {
  login(payload: ApiLoginPayload): Promise<ApiTokenResponse> {
    return publicFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  register(payload: ApiRegisterPayload): Promise<ApiUser> {
    return publicFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  logout(refreshToken: string): Promise<void> {
    return authorizedFetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  /** Dùng refresh token để lấy access token mới */
  refresh(refreshToken: string): Promise<ApiTokenResponse> {
    return publicFetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  changePassword(payload: ApiChangePasswordPayload): Promise<ApiResponse> {
    return authorizedFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  forgotPassword(payload: ApiForgotPasswordPayload): Promise<ApiResponse> {
    return publicFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  resetPassword(payload: ApiResetPasswordPayload): Promise<ApiResponse> {
    return publicFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getBlockedList(): Promise<ApiUserPublic[]> {
    return authorizedFetch("/users/me/blocked");
  },
};
