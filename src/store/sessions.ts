import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage, Session, SessionAnalysis } from '@/types';
import { aggregateRecurringMistakes } from '@/lib/mistakes';

const STORAGE_KEY = 'sessions_v1';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface SessionsState {
  sessions: Session[];
  loaded: boolean;
  load: () => Promise<void>;
  createSession: (input: { topic: string; audioUri: string | null; durationMs: number }) => Session;
  getSession: (id: string) => Session | undefined;
  updateSession: (id: string, patch: Partial<Session>) => void;
  setAnalysis: (id: string, analysis: SessionAnalysis) => void;
  appendPractice: (id: string, message: ChatMessage) => void;
  deleteSession: (id: string) => void;
  recurring: () => ReturnType<typeof aggregateRecurringMistakes>;
}

async function persist(sessions: Session[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* best effort */
  }
}

export const useSessions = create<SessionsState>((set, get) => ({
  sessions: [],
  loaded: false,

  load: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let sessions: Session[] = [];
    if (raw) {
      try {
        sessions = JSON.parse(raw);
      } catch {
        sessions = [];
      }
    }
    sessions.sort((a, b) => b.createdAt - a.createdAt);
    set({ sessions, loaded: true });
  },

  createSession: ({ topic, audioUri, durationMs }) => {
    const session: Session = {
      id: uid(),
      topic,
      createdAt: Date.now(),
      audioUri,
      durationMs,
      transcript: '',
      analysis: null,
      status: 'recorded',
      practice: [],
    };
    const sessions = [session, ...get().sessions];
    set({ sessions });
    persist(sessions);
    return session;
  },

  getSession: (id) => get().sessions.find((s) => s.id === id),

  updateSession: (id, patch) => {
    const sessions = get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s));
    set({ sessions });
    persist(sessions);
  },

  setAnalysis: (id, analysis) => {
    get().updateSession(id, { analysis, status: 'ready', error: undefined });
  },

  appendPractice: (id, message) => {
    const sessions = get().sessions.map((s) =>
      s.id === id ? { ...s, practice: [...s.practice, message] } : s,
    );
    set({ sessions });
    persist(sessions);
  },

  deleteSession: (id) => {
    const sessions = get().sessions.filter((s) => s.id !== id);
    set({ sessions });
    persist(sessions);
  },

  recurring: () => aggregateRecurringMistakes(get().sessions),
}));
