import type { CallSignalData } from "@/components/chat/VideoCallModal";
// hooks/useCall.ts
import { useState, useCallback } from "react";

export interface UseCallReturn {
  targetUserId: string | null;
  incomingOffer: CallSignalData | null;
  makeCall: (userId: string) => void;
  receiveCall: (offer: CallSignalData) => void;
  endCall: () => void;
}

export function useCall(): UseCallReturn {
  // Trạng thái khi MÌNH LÀ NGƯỜI GỌI (Chủ động)
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  
  // Trạng thái khi CÓ NGƯỜI GỌI ĐẾN (Bị động)
  const [incomingOffer, setIncomingOffer] = useState<CallSignalData | null>(null);

  // 1. Nút bấm gọi ai đó (Chỉ cần set ID để hiện Modal)
  const makeCall = useCallback((userId: string) => {
    setTargetUserId(userId);
  }, []);

  // 2. Khi Socket nhận được tín hiệu 'call_offer' từ người khác
  const receiveCall = useCallback((offer: CallSignalData) => {
    setIncomingOffer(offer);
  }, []);

  // 3. Khi dập máy, từ chối, hoặc kết thúc cuộc gọi
  const endCall = useCallback(() => {
    setTargetUserId(null);
    setIncomingOffer(null);
  }, []);

  return { 
    targetUserId, 
    incomingOffer, 
    makeCall, 
    receiveCall, 
    endCall 
  };
}