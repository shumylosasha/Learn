import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LessonSpec } from '@/api/openai';
import type { MistakeCategory } from '@/types';

const KEY = 'path_v2';

/**
 * One lesson in the path. Every lesson is generated FROM a specific recording's
 * mistakes (sessionId), so the path reads as a clear history: each recording →
 * its lessons. A lesson opens a chat at /practice/<id>.
 */
export interface PathLesson {
  id: string;
  sessionId: string;
  title: string;
  summary: string;
  category: MistakeCategory;
  area: string;
  basedOnTypes: string[];
  status: 'available' | 'completed';
  createdAt: number;
}

interface PathState {
  lessons: PathLesson[];
  loaded: boolean;
  load: () => Promise<void>;
  /** Add the lessons generated from one recording (idempotent per session). */
  addForRecording: (sessionId: string, specs: LessonSpec[], createdAt: number) => void;
  markComplete: (id: string) => void;
  removeBySession: (sessionId: string) => void;
  clear: () => void;
}

function persist(lessons: PathLesson[]) {
  AsyncStorage.setItem(KEY, JSON.stringify(lessons)).catch(() => {});
}

export const usePath = create<PathState>((set, get) => ({
  lessons: [],
  loaded: false,

  load: async () => {
    let lessons: PathLesson[] = [];
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) lessons = JSON.parse(raw);
    } catch {
      lessons = [];
    }
    set({ lessons, loaded: true });
  },

  addForRecording: (sessionId, specs, createdAt) => {
    // Don't double-add if this recording already produced lessons.
    if (get().lessons.some((l) => l.sessionId === sessionId)) return;
    const additions: PathLesson[] = specs.map((spec, i) => ({
      id: `lesson_${sessionId}_${i}`,
      sessionId,
      title: spec.title,
      summary: spec.summary,
      category: spec.category,
      area: spec.area,
      basedOnTypes: spec.basedOnTypes,
      status: 'available',
      createdAt,
    }));
    if (additions.length === 0) return;
    const lessons = [...get().lessons, ...additions];
    set({ lessons });
    persist(lessons);
  },

  markComplete: (id) => {
    const lessons = get().lessons.map((l) =>
      l.id === id && l.status !== 'completed' ? { ...l, status: 'completed' as const } : l,
    );
    set({ lessons });
    persist(lessons);
  },

  removeBySession: (sessionId) => {
    const lessons = get().lessons.filter((l) => l.sessionId !== sessionId);
    set({ lessons });
    persist(lessons);
  },

  clear: () => {
    set({ lessons: [] });
    persist([]);
  },
}));
