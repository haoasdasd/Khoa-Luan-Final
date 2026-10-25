// types/api/auth.types.ts

export interface ApiTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ApiLoginPayload {
  email: string;
  password: string;
}

export interface ApiRegisterPayload {
  username: string;
  email: string;
  password: string;
  full_name: string;
  avatar_url: string;
  bio: string;
}

export interface ApiForgotPasswordPayload {
  email: string;
}

export interface ApiResetPasswordPayload {
  email: string;
  otp: string;
  new_password: string;
}

export interface ApiChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ApiResponse {
  message: string;
}