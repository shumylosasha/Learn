import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lesson } from '@/types';
import type { LessonSpec } from '@/api/openai';

const KEY = 'learning_path_v1';

interface LessonsState {
  lessons: Lesson[];
  loaded: boolean;
  load: () => Promise<void>;
  /** Replace the path with a freshly generated set, preserving completion of
   *  lessons whose title still appears in the new set. */
  setFromSpecs: (specs: LessonSpec[]) => void;
  markComplete: (id: string) => void;
  clear: () => void;
}

function persist(lessons: Lesson[]) {
  AsyncStorage.setItem(KEY, JSON.stringify(lessons)).catch(() => {});
}

function lessonId(spec: LessonSpec, index: number): string {
  const slug = spec.area.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `lesson_${slug || 'area'}_${index}`;
}

export const useLessons = create<LessonsState>((set, get) => ({
  lessons: [],
  loaded: false,

  load: async () => {
    let lessons: Lesson[] = [];
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) lessons = JSON.parse(raw);
    } catch {
      lessons = [];
    }
    set({ lessons, loaded: true });
  },

  setFromSpecs: (specs: LessonSpec[]) => {
    const prev = get().lessons;
    const now = Date.now();
    const lessons: Lesson[] = specs.map((spec, i) => {
      // Carry over a previous "completed" status if the same lesson title returns.
      const existing = prev.find((l) => l.title === spec.title);
      return {
        id: lessonId(spec, i),
        title: spec.title,
        area: spec.area,
        category: spec.category,
        summary: spec.summary,
        basedOnTypes: spec.basedOnTypes,
        status: existing?.status ?? 'available',
        createdAt: now,
        completedAt: existing?.completedAt,
      };
    });
    set({ lessons });
    persist(lessons);
  },

  markComplete: (id: string) => {
    const lessons = get().lessons.map((l) =>
      l.id === id && l.status !== 'completed'
        ? { ...l, status: 'completed' as const, completedAt: Date.now() }
        : l,
    );
    set({ lessons });
    persist(lessons);
  },

  clear: () => {
    set({ lessons: [] });
    persist([]);
  },
}));
