import { createContext, useContext } from "react";
import type { ChatSocketClient } from "@/api/ws.client";

interface CallContextValue {
  startCall: (targetId: string, name: string, convId: string) => void;
  handleEndCall: () => void;
  stopAllRingtones: () => void;
  callSocket: ChatSocketClient | null;
}
export const CallContext = createContext<CallContextValue | null>(null);
export function useCallSystem() {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCallSystem must be used within CallProvider");
  return context;
}
