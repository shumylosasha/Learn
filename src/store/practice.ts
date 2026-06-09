import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@/types';

// A single, ongoing "practise my weak spots" chat thread that isn't tied to one
// recording — it draws on the cumulative weak spots and the latest review.
const KEY = 'weakspots_practice_v1';

interface PracticeState {
  messages: ChatMessage[];
  loaded: boolean;
  load: () => Promise<void>;
  append: (m: ChatMessage) => void;
  reset: () => void;
}

async function persist(messages: ChatMessage[]) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(messages));
  } catch {
    /* best effort */
  }
}

export const usePractice = create<PracticeState>((set, get) => ({
  messages: [],
  loaded: false,

  load: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    let messages: ChatMessage[] = [];
    if (raw) {
      try {
        messages = JSON.parse(raw);
      } catch {
        messages = [];
      }
    }
    set({ messages, loaded: true });
  },

  append: (m: ChatMessage) => {
    const messages = [...get().messages, m];
    set({ messages });
    persist(messages);
  },

  reset: () => {
    set({ messages: [] });
    persist([]);
  },
}));
