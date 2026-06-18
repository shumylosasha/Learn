import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@/types';

// Practice threads are keyed by id:
//   'weakspots'      → the ongoing, global weak-spots tutor (never "completes")
//   <a session id>   → a finite drill on one recording's mistakes (can complete)
const keyFor = (id: string) => `practice_v2_${id}`;

/** The id of the single global/ongoing practice thread. */
export const GLOBAL_PRACTICE_ID = 'weakspots';

interface PracticeState {
  threads: Record<string, ChatMessage[]>;
  loaded: Record<string, boolean>;
  load: (id: string) => Promise<void>;
  append: (id: string, m: ChatMessage) => void;
  reset: (id: string) => void;
}

async function persist(id: string, messages: ChatMessage[]) {
  try {
    await AsyncStorage.setItem(keyFor(id), JSON.stringify(messages));
  } catch {
    /* best effort */
  }
}

export const usePractice = create<PracticeState>((set, get) => ({
  threads: {},
  loaded: {},

  load: async (id: string) => {
    if (get().loaded[id]) return;
    let messages: ChatMessage[] = [];
    try {
      const raw = await AsyncStorage.getItem(keyFor(id));
      if (raw) messages = JSON.parse(raw);
    } catch {
      messages = [];
    }
    set((s) => ({
      threads: { ...s.threads, [id]: messages },
      loaded: { ...s.loaded, [id]: true },
    }));
  },

  append: (id: string, m: ChatMessage) => {
    const messages = [...(get().threads[id] ?? []), m];
    set((s) => ({ threads: { ...s.threads, [id]: messages } }));
    persist(id, messages);
  },

  reset: (id: string) => {
    set((s) => ({ threads: { ...s.threads, [id]: [] } }));
    persist(id, []);
  },
}));
