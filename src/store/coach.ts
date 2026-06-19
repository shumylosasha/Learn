import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateCoach, type CoachInsightResult } from '@/api/openai';
import { useSettings } from '@/store/settings';
import { useSessions } from '@/store/sessions';
import { aggregateRecurringMistakes, recurringMistakesContext } from '@/lib/mistakes';

const KEY = 'coach_v1';

export interface CoachInsight extends CoachInsightResult {
  generatedAt: number;
  basis: number; // how many analysed recordings it was based on
}

interface CoachState {
  insight: CoachInsight | null;
  generating: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  generate: () => Promise<void>;
}

export const useCoach = create<CoachState>((set, get) => ({
  insight: null,
  generating: false,
  loaded: false,

  load: async () => {
    let insight: CoachInsight | null = null;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) insight = JSON.parse(raw);
    } catch {
      insight = null;
    }
    set({ insight, loaded: true });
  },

  generate: async () => {
    if (get().generating) return;
    const { apiKey, prefs } = useSettings.getState();
    if (!apiKey) return;
    const sessions = useSessions.getState().sessions.filter((s) => s.analysis);
    if (sessions.length === 0) return;

    set({ generating: true });
    try {
      const recurring = aggregateRecurringMistakes(useSessions.getState().sessions);
      const recentTopics = sessions
        .slice(-12)
        .map((s) => `- ${s.topic}`)
        .join('\n');
      const result = await generateCoach(
        apiKey,
        prefs.smartModel,
        recurringMistakesContext(recurring, 14),
        recentTopics || '(none yet)',
      );
      const insight: CoachInsight = { ...result, generatedAt: Date.now(), basis: sessions.length };
      set({ insight });
      AsyncStorage.setItem(KEY, JSON.stringify(insight)).catch(() => {});
    } finally {
      set({ generating: false });
    }
  },
}));
