import { ChatSocketClient } from "./ws.client";

// Khởi tạo duy nhất 1 lần tại đây
export const socketInstance = new ChatSocketClient();