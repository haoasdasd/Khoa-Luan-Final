import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/api/useAuth";
import { socketInstance } from "@/api/socket.instance";
import { VideoCallModal, type CallSignalData } from "@/components/chat/VideoCallModal";

import { CallContext } from "./call-context";
interface CallTarget { id: string; full_name: string; conversation_id: string; }

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  const [incomingOffer, setIncomingOffer] = useState<CallSignalData | null>(null);
  const [callTarget, setCallTarget] = useState<CallTarget | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const socket = socketInstance;

  // ✅ Quản lý 2 loại âm thanh riêng biệt
  const incomingRingRef = useRef<HTMLAudioElement | null>(null); // Chuông đổ khi có người gọi tới
  const outgoingRingRef = useRef<HTMLAudioElement | null>(null); // Tiếng tút tút khi mình gọi đi

  useEffect(() => {
    incomingRingRef.current = new Audio("/assets/sounds/ringtone.mp3");
    incomingRingRef.current.loop = true;

    outgoingRingRef.current = new Audio("/assets/sounds/ringback.mp3"); // Đổi file mp3 tút tút ở đây
    outgoingRingRef.current.loop = true;
    return () => {
      incomingRingRef.current?.pause();
      outgoingRingRef.current?.pause();
    };
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

  const activePeerId = incomingOffer?.from_user_id || callTarget?.id;
  const activeConversationId = incomingOffer?.conversation_id || callTarget?.conversation_id;
  useEffect(() => {
    if (!user?.id) return;
    const callSocket = socket;
    callSocket.connect();
    const unsub = callSocket.on((event) => {
      // 1. Máy nhận
      if (event.event === "call_offer") {
        playIncomingRing();
        setIncomingOffer({
          call_id: event.call_id,
          from_user_id: event.from_user_id,
          from_user_name: event.from_user_name || "Người dùng",
          conversation_id: event.conversation_id,
          signal_data: event.data,
        });
        setIsModalOpen(true);
      }

      // 2. Máy gọi nhận tín hiệu "Nhấc máy"
      if (event.event === "call_answer" && event.from_user_id === activePeerId && event.conversation_id === activeConversationId) {
        stopAllRingtones();
      }

      // 3. Tín hiệu cúp máy/rớt mạng
      if (
        ((event.event === "call_hangup" || event.event === "call_rejected") && event.from_user_id === activePeerId && event.conversation_id === activeConversationId) ||
        (event.event === "user_offline" && event.data.user_id === activePeerId)
      ) {
        handleEnd();
      }
    });

    return () => {
      unsub();
    };
  }, [user?.id, handleEnd, playIncomingRing, stopAllRingtones, socket, activePeerId, activeConversationId]);

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
      callSocket: socket,
    }),
    [startCall, handleEnd, stopAllRingtones, socket],
  );

  const MemoizedModal = useMemo(() => {
    if (!isModalOpen) return null;
    return (
      <VideoCallModal
        offer={incomingOffer}
        targetUserId={callTarget?.id}
        targetUserName={callTarget?.full_name}
        convId={callTarget?.conversation_id || incomingOffer?.conversation_id}
        socket={socket}
        onHangup={handleEnd}
        onAccept={stopAllRingtones} // ✅ Tắt chuông khi bắt đầu đàm thoại
      />
    );
  }, [isModalOpen, incomingOffer, callTarget, handleEnd, stopAllRingtones, socket]);

  return (
    <CallContext.Provider value={contextValue}>
      {children}
      {MemoizedModal}
    </CallContext.Provider>
  );
};
