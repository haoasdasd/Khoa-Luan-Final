import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { PhoneOff, Phone, X, Video, VideoOff, Mic, MicOff, RefreshCcw } from "lucide-react";
import type { ChatSocketClient } from "@/api/ws.client";
import callResource from "@/api/resources/call.api";
import { useAuth } from "@/hooks/api/useAuth";
import { UserAvatar } from "@/components/common/UserAvatar";

export interface CallSignalData {
  call_id: string;
  from_user_id: string;
  from_user_name?: string;
  conversation_id: string;
  signal_data: RTCSessionDescriptionInit;
}

interface Props {
  offer: CallSignalData | null;
  targetUserId?: string;
  targetUserName?: string;
  convId?: string;
  socket: ChatSocketClient | null;
  onHangup: () => void;
  onAccept: () => void;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const VideoCallModal = memo(
  ({ offer, targetUserId, convId, socket, onHangup, onAccept }: Props) => {
    const { user } = useAuth();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isAccepted, setIsAccepted] = useState(false);

    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [isLocalMain, setIsLocalMain] = useState(true);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    
    // Sử dụng Ref cho stream để bẻ gãy vòng lặp Dependency của React Hook
    const localStreamRef = useRef<MediaStream | null>(null);
    
    const isStarted = useRef(false);
    const isCleaningUp = useRef(false);
    const candidateQueue = useRef<RTCIceCandidateInit[]>([]);

    const toggleMic = useCallback(() => {
      if (localStreamRef.current) {
        const newState = !isMicOn;
        localStreamRef.current.getAudioTracks().forEach((track) => (track.enabled = newState));
        setIsMicOn(newState);
      }
    }, [isMicOn]);

    const toggleCam = useCallback(() => {
      if (localStreamRef.current) {
        const newState = !isCamOn;
        localStreamRef.current.getVideoTracks().forEach((track) => (track.enabled = newState));
        setIsCamOn(newState);
      }
    }, [isCamOn]);

    // ✅ Đã gỡ bỏ localStream khỏi dependency để chống rớt mạng ngầm
    const cleanupResources = useCallback(() => {
      if (isCleaningUp.current) return;
      isCleaningUp.current = true;
      console.log("🛑 Hệ thống: Đang ngắt kết nối phần cứng...");

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const domStream = localVideoRef.current.srcObject as MediaStream;
        domStream.getTracks().forEach((track) => track.stop());
        localVideoRef.current.srcObject = null;
      }

      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      if (pcRef.current) {
        pcRef.current.getSenders().forEach((sender) => {
          if (sender.track) sender.track.stop();
        });
        pcRef.current.close();
        pcRef.current = null;
      }

      setLocalStream(null);
      setRemoteStream(null);
      localStreamRef.current = null;
      
      isStarted.current = false;
      isCleaningUp.current = false;
    }, []);

    const handleHangup = useCallback(() => {
      cleanupResources();
      const remoteId = offer ? offer.from_user_id : targetUserId;
      const currentConvId = offer?.conversation_id || convId;
      
      if (socket && remoteId && currentConvId) {
        socket.send({
          event: !isAccepted && offer ? "call_rejected" : "call_hangup",
          data: { to_user_id: remoteId, conversation_id: currentConvId },
        } as any);
      }
      onHangup();
    }, [socket, offer, targetUserId, onHangup, isAccepted, convId, cleanupResources]);

    // Dùng ref để hàm initWebRTC không bị thay đổi liên tục
    const handleHangupRef = useRef(handleHangup);
    useEffect(() => {
      handleHangupRef.current = handleHangup;
    }, [handleHangup]);

    const initWebRTC = useCallback(async () => {
      if (isStarted.current || isCleaningUp.current || !socket) return;
      isStarted.current = true;
      const isStillMounted = { current: true };

      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        const remoteId = offer ? offer.from_user_id : targetUserId;
        if (e.candidate && socket && remoteId && (pc.signalingState as string) !== "closed") {
          socket.send({
            event: "ice_candidate",
            data: { to_user_id: remoteId, signal_data: e.candidate.toJSON() },
          } as any);
        }
      };

      pc.ontrack = (e) => {
        if (isStillMounted.current) setRemoteStream(e.streams[0]);
      };

      const unsub = socket.on(async (event: any) => {
        if (!pcRef.current || pcRef.current.signalingState === "closed") return;

        if (event.event === "ice_candidate") {
          const candidateData = event.data?.signal_data || event.data;
          if (pcRef.current.remoteDescription) {
            pcRef.current.addIceCandidate(new RTCIceCandidate(candidateData)).catch((e) => console.warn(e));
          } else {
            candidateQueue.current.push(candidateData);
          }
        }

        if (event.event === "call_answer") {
          try {
            const answerSignal = event.data?.signal_data || event.data;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answerSignal));
            
            // Xả hàng đợi có kiểm tra trạng thái an toàn
            candidateQueue.current.forEach((cand) => {
              if (pcRef.current && pcRef.current.signalingState !== "closed") {
                pcRef.current.addIceCandidate(new RTCIceCandidate(cand)).catch((e) => console.warn(e));
              }
            });
            candidateQueue.current = [];
          } catch (e) {
            console.error("Lỗi setRemoteDescription:", e);
          }
        }
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        if (!isStillMounted.current || !pcRef.current || (pcRef.current.signalingState as string) === "closed") {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);
        localStreamRef.current = stream; // Lưu vào ref để chống dependency loop

        stream.getTracks().forEach((track) => {
          try {
            if ((pc.signalingState as string) !== "closed") {
              pc.addTrack(track, stream);
            } else {
              track.stop();
            }
          } catch (err) {
            console.warn("Bỏ qua addTrack do ngắt kết nối:", err);
            track.stop();
          }
        });

        const currentConvId = offer?.conversation_id || convId;

        if (offer) {
          if ((pc.signalingState as string) === "closed") return;
          await pc.setRemoteDescription(new RTCSessionDescription(offer.signal_data));

          candidateQueue.current.forEach((cand) => {
             if ((pc.signalingState as string) !== "closed") {
               pc.addIceCandidate(new RTCIceCandidate(cand)).catch((e) => console.warn(e));
             }
          });
          candidateQueue.current = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.send({
            event: "call_answer",
            data: {
              to_user_id: offer.from_user_id,
              conversation_id: currentConvId,
              signal_data: answer,
              call_id: offer.call_id,
            },
          } as any);
          callResource.join(offer.call_id).catch(() => {});
        } else if (targetUserId) {
          const session = await callResource.start({
            conversation_id: currentConvId as string,
            call_type: "video",
            participant_ids: [],
          });
          
          if (!isStillMounted.current || !pcRef.current || pcRef.current.signalingState === "closed") {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          const off = await pc.createOffer();
          await pc.setLocalDescription(off);
          socket.send({
            event: "call_offer",
            data: {
              call_id: session.id,
              to_user_id: targetUserId,
              conversation_id: currentConvId,
              signal_data: off,
              from_user_name: user?.full_name || "Người dùng",
            },
          } as any);
        }
      } catch (err) {
        console.error("WebRTC Error:", err);
        handleHangupRef.current(); // Gọi qua Ref để an toàn tuyệt đối
      }
      
      return () => {
        isStillMounted.current = false;
        unsub();
      };
    }, [offer, targetUserId, convId, socket, user?.full_name]);

    useEffect(() => {
      let cleanFn: any;
      if (!offer || isAccepted) {
        initWebRTC().then((fn) => (cleanFn = fn));
      }
      return () => {
        if (cleanFn) cleanFn();
      };
    }, [isAccepted, initWebRTC, offer]);

    useEffect(() => {
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }, [localStream, isLocalMain]);

    useEffect(() => {
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }, [remoteStream, isLocalMain]);

    useEffect(() => {
      return () => cleanupResources();
    }, [cleanupResources]);

    // ✅ GIAO DIỆN CHỜ (INCOMING CALL)
    if (offer && !isAccepted) {
      return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl">
          <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
            {/* Hiệu ứng Radar Avatar */}
            <div className="relative flex items-center justify-center mb-8">
              <div
                className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping scale-150"
                style={{ animationDuration: "2s" }}
              ></div>
              <div
                className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping scale-110"
                style={{ animationDuration: "2s", animationDelay: "0.5s" }}
              ></div>
              <div className="relative z-10 w-28 h-28 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-2xl overflow-hidden">
                <span className="text-3xl font-black text-white">
                  {offer.from_user_name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            <h2 className="text-white text-3xl font-bold tracking-tight mb-2">
              {offer.from_user_name}
            </h2>
            <p className="text-slate-400 text-lg mb-12">
              Cuộc gọi video đến...
            </p>

            <div className="flex gap-10">
              <button
                onClick={handleHangup}
                className="group flex flex-col items-center gap-3"
              >
                <div className="bg-red-500 hover:bg-red-600 p-5 rounded-full text-white shadow-lg shadow-red-500/20 active:scale-90 transition-all">
                  <X size={32} strokeWidth={2.5} />
                </div>
                <span className="text-white/60 font-medium group-hover:text-white transition-colors">
                  Từ chối
                </span>
              </button>

              <button
                onClick={() => {
                  onAccept();
                  setIsAccepted(true);
                }}
                className="group flex flex-col items-center gap-3"
              >
                <div className="bg-green-500 hover:bg-green-600 p-5 rounded-full text-white shadow-lg shadow-green-500/20 active:scale-90 transition-all animate-bounce">
                  <Phone size={32} strokeWidth={2.5} fill="currentColor" />
                </div>
                <span className="text-white/60 font-medium group-hover:text-white transition-colors">
                  Nghe máy
                </span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ✅ LOGIC CHIA CLASS CHO TÍNH NĂNG SWAP PIP
    const mainVideoClass = "w-full h-full object-cover";
    const subVideoClass =
      "absolute top-6 right-6 w-32 h-48 bg-slate-800 rounded-2xl border-2 border-white/10 overflow-hidden z-20 shadow-2xl cursor-pointer hover:scale-105 hover:border-white/30 transition-all duration-300 group";

    // ✅ GIAO DIỆN ĐÀM THOẠI
    return (
      <div className="fixed inset-0 z-[999] bg-slate-950 flex items-center justify-center">
        <div className="relative w-full h-full max-w-6xl bg-black md:rounded-3xl overflow-hidden shadow-2xl border border-white/5">
          {/* MAIN VIDEO (Khung to) */}
          <video
            ref={isLocalMain ? localVideoRef : remoteVideoRef}
            autoPlay
            playsInline
            muted={isLocalMain} // Luôn tắt tiếng nếu khung to là mình
            className={`${mainVideoClass} ${isLocalMain ? "scale-x-[-1]" : ""}`}
          />
          {!isLocalMain && !remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <span className="text-white/50 animate-pulse">
                Đang kết nối hình ảnh...
              </span>
            </div>
          )}

          {/* SUB VIDEO (Khung nhỏ góc phải) */}
          <div
            className={subVideoClass}
            onClick={() => setIsLocalMain(!isLocalMain)} // Bấm để đảo ngược
          >
            <video
              ref={isLocalMain ? remoteVideoRef : localVideoRef}
              autoPlay
              playsInline
              muted={!isLocalMain} // Tắt tiếng nếu khung nhỏ là mình
              className={`w-full h-full object-cover ${!isLocalMain ? "scale-x-[-1]" : ""}`}
            />
            {/* Lớp phủ hover báo hiệu có thể click để Swap */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <RefreshCcw className="text-white" size={24} />
            </div>

            {/* Trạng thái tắt Cam của khung nhỏ */}
            {!isLocalMain && !isCamOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 z-10">
                <UserAvatar user={user} size="sm" />
                <span className="text-[10px] text-white/60 mt-2 font-medium">
                  Cam Off
                </span>
              </div>
            )}
          </div>

          {/* THANH ĐIỀU KHIỂN (FOOTER CONTROLS) */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 bg-slate-900/60 backdrop-blur-xl rounded-[2rem] z-30 border border-white/10 shadow-2xl">
            {/* Nút Mic */}
            <button
              onClick={toggleMic}
              className={`p-4 rounded-2xl transition-all active:scale-90 ${isMicOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-900"}`}
            >
              {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
            </button>

            {/* Nút Dập máy */}
            <button
              onClick={handleHangup}
              className="bg-red-500 hover:bg-red-600 px-8 py-4 rounded-2xl text-white shadow-lg active:scale-90 mx-2 transition-colors flex items-center gap-2 font-semibold"
            >
              <PhoneOff size={22} fill="currentColor" />
            </button>

            {/* Nút Camera */}
            <button
              onClick={toggleCam}
              className={`p-4 rounded-2xl transition-all active:scale-90 ${isCamOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-900"}`}
            >
              {isCamOn ? <Video size={22} /> : <VideoOff size={22} />}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

VideoCallModal.displayName = "VideoCallModal";
