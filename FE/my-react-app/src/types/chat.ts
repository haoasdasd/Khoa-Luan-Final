import type { ApiMessage } from "./api";
export interface ChatMessage extends ApiMessage {
  isSending?: boolean;
  isError?: boolean;
  thumbnail_url?: string;
}
