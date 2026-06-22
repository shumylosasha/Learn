import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'reviewed_sessions_v1';

/**
 * Tracks which recordings' mistake-flashcard decks the learner has finished, so
 * the journey can tick that step off (and grey it out) like a completed lesson.
 */
interface ReviewedState {
  ids: Record<string, number>; // sessionId -> completedAt
  loaded: boolean;
  load: () => Promise<void>;
  markReviewed: (sessionId: string) => void;
}

export const useReviewed = create<ReviewedState>((set, get) => ({
  ids: {},
  loaded: false,

  load: async () => {
    let ids: Record<string, number> = {};
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) ids = JSON.parse(raw);
    } catch {
      ids = {};
    }
    set({ ids, loaded: true });
  },

  markReviewed: (sessionId) => {
    if (get().ids[sessionId]) return;
    const ids = { ...get().ids, [sessionId]: Date.now() };
    set({ ids });
    AsyncStorage.setItem(KEY, JSON.stringify(ids)).catch(() => {});
  },
}));
