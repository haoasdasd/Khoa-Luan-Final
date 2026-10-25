import { create } from 'zustand';
import type { ApiConversation } from '@/types/api';

interface ConversationState {
  conversations: ApiConversation[];
  setConversations: (update: ApiConversation[] | ((prev: ApiConversation[]) => ApiConversation[])) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  setConversations: (update) => set((state) => ({
    conversations: typeof update === 'function' ? update(state.conversations) : update
  })),
}));