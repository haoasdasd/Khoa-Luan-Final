import { useEffect } from "react";
import { socketInstance } from "@/api/socket.instance";
import { useConversationStore } from "@/store/useConversationStore";

export function usePresence() {
  const setConversations = useConversationStore((state) => state.setConversations);

  useEffect(() => {
    const unsubscribe = socketInstance.on((event: any) => {
      if (event.event === "user_online" || event.event === "user_offline") {
        const isOnline = event.event === "user_online";
        const userId = event.user_id;

        setConversations((prev) => 
          prev.map(conv => ({
            ...conv,
            is_online: conv.members.some((m) => String(m.user.id) === String(userId)) ? isOnline : conv.is_online
          }))
        );
      }
    });
    return () => unsubscribe();
  }, [setConversations]);
}