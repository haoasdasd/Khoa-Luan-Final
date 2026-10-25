import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/api/useAuth";
import { ChatSocketClient } from "@/api/ws.client";
import { VideoCallModal, type CallSignalData } from "@/components/chat/VideoCallModal";

const CallContext = createContext<any>(null);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  const [incomingOffer, setIncomingOffer] = useState<CallSignalData | null>(null);
  const [callTarget, setCallTarget] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const socketRef = useRef<ChatSocketClient | null>(null);

  // ✅ Quản lý 2 loại âm thanh riêng biệt
  const incomingRingRef = useRef<HTMLAudioElement | null>(null); // Chuông đổ khi có người gọi tới
  const outgoingRingRef = useRef<HTMLAudioElement | null>(null); // Tiếng tút tút khi mình gọi đi

  useEffect(() => {
    incomingRingRef.current = new Audio("/assets/sounds/ringtone.mp3");
    incomingRingRef.current.loop = true;

    outgoingRingRef.current = new Audio("/assets/sounds/ringback.mp3"); // Đổi file mp3 tút tút ở đây
    outgoingRingRef.current.loop = true;
  }, []);

  const playIncomingRing = useCallback(() => {
    if (incomingRingRef.current) {
      incomingRingRef.current.currentTime = 0;
      incomingRingRef.current.play().catch((err) => console.warn("Autoplay bị chặn:", err));
    }
  }, []);

  const playOutgoingRing = useCallback(() => {
    if (outgoingRingRef.current) {
      outgoingRingRef.current.currentTime = 0;
      outgoingRingRef.current.play().catch((err) => console.warn("Autoplay bị chặn:", err));
    }
  }, []);

  const stopAllRingtones = useCallback(() => {
    if (incomingRingRef.current) {
      incomingRingRef.current.pause();
      incomingRingRef.current.currentTime = 0;
    }
    if (outgoingRingRef.current) {
      outgoingRingRef.current.pause();
      outgoingRingRef.current.currentTime = 0;
    }
  }, []);

  const handleEnd = useCallback(() => {
    console.log("☎️ [CallContext] Kết thúc cuộc gọi.");
    stopAllRingtones();
    setIsModalOpen(false);
    setIncomingOffer(null);
    setCallTarget(null);
  }, [stopAllRingtones]);

  useEffect(() => {
    if (!user?.id) {
       // 🛑 Dọn dẹp Socket nếu User đăng xuất
       if (socketRef.current) {
         socketRef.current.disconnect(); 
         socketRef.current = null;
       }
       return;
    }

    if (!socketRef.current) {
      socketRef.current = new ChatSocketClient();
    }

    const unsub = socketRef.current.on((event: any) => {
      // 1. Máy nhận
      if (event.event === "call_offer") {
        playIncomingRing();
        setIncomingOffer({
          call_id: event.call_id || event.data?.call_id,
          from_user_id: event.from_user_id,
          from_user_name: event.from_user_name || "Người dùng",
          conversation_id: event.conversation_id,
          signal_data: event.data?.signal_data || event.data,
        });
        setIsModalOpen(true);
      }

      // 2. Máy gọi nhận tín hiệu "Nhấc máy"
      if (event.event === "call_answer") {
        stopAllRingtones();
      }

      // 3. Tín hiệu cúp máy/rớt mạng
      if (["call_hangup", "call_rejected", "user_offline"].includes(event.event)) {
        handleEnd();
      }
    });

    return () => unsub();
  }, [user?.id, handleEnd, playIncomingRing, stopAllRingtones]);

  const startCall = useCallback((targetId: string, name: string, convId: string) => {
    playOutgoingRing();
    setIncomingOffer(null);
    setCallTarget({ id: targetId, full_name: name, conversation_id: convId });
    setIsModalOpen(true);
  }, [playOutgoingRing]);

  const contextValue = useMemo(
    () => ({
      startCall,
      handleEndCall: handleEnd,
      stopAllRingtones, // ✅ Truyền hàm này xuống Modal để tắt chuông khi nhấn "Nghe"
      callSocket: socketRef.current,
    }),
    [startCall, handleEnd, stopAllRingtones],
  );

  const MemoizedModal = useMemo(() => {
    if (!isModalOpen) return null;
    return (
      <VideoCallModal
        offer={incomingOffer}
        targetUserId={callTarget?.id}
        targetUserName={callTarget?.full_name}
        convId={callTarget?.conversation_id || incomingOffer?.conversation_id}
        socket={socketRef.current}
        onHangup={handleEnd}
        onAccept={stopAllRingtones} // ✅ Tắt chuông khi bắt đầu đàm thoại
      />
    );
  }, [isModalOpen, incomingOffer, callTarget, handleEnd, stopAllRingtones]);

  return (
    <CallContext.Provider value={contextValue}>
      {children}
      {MemoizedModal}
    </CallContext.Provider>
  );
};

export const useCallSystem = () => {
  const context = useContext(CallContext);
  if (!context)
    throw new Error("useCallSystem must be used within CallProvider");
  return context;
};
