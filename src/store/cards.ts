import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeType } from '@/lib/mistakes';
import type { Mistake, MistakeCategory } from '@/types';

const KEY = 'cards_v1';
const DAY = 86400000;
// Leitner intervals (days) by box. "Got it" promotes a box; "again" resets to 1.
const INTERVALS = [1, 2, 4, 8, 16];

export interface Card {
  key: string; // normalised mistake type — one card per recurring type
  type: string;
  category: MistakeCategory;
  quote: string;
  correction: string;
  explanation: string;
  box: number; // 1..5
  due: number; // timestamp; <= now means due for review
  createdAt: number;
}

interface CardsState {
  cards: Record<string, Card>;
  loaded: boolean;
  load: () => Promise<void>;
  /** Add/refresh cards from a recording's mistakes (keeps scheduling state). */
  upsertFromMistakes: (mistakes: Mistake[]) => void;
  grade: (key: string, gotIt: boolean) => void;
  clear: () => void;
}

function persist(cards: Record<string, Card>) {
  AsyncStorage.setItem(KEY, JSON.stringify(cards)).catch(() => {});
}

export function dueCards(cards: Record<string, Card>, now = Date.now()): Card[] {
  return Object.values(cards)
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due);
}

export const useCards = create<CardsState>((set, get) => ({
  cards: {},
  loaded: false,

  load: async () => {
    let cards: Record<string, Card> = {};
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) cards = JSON.parse(raw);
    } catch {
      cards = {};
    }
    set({ cards, loaded: true });
  },

  upsertFromMistakes: (mistakes) => {
    const now = Date.now();
    const cards = { ...get().cards };
    for (const m of mistakes) {
      const key = normalizeType(m.type);
      const prev = cards[key];
      cards[key] = {
        key,
        type: m.type,
        category: m.category,
        quote: m.quote,
        correction: m.correction,
        explanation: m.explanation,
        // Keep scheduling if the card already exists; new cards are due now.
        box: prev?.box ?? 1,
        due: prev?.due ?? now,
        createdAt: prev?.createdAt ?? now,
      };
    }
    set({ cards });
    persist(cards);
  },

  grade: (key, gotIt) => {
    const now = Date.now();
    const card = get().cards[key];
    if (!card) return;
    const box = gotIt ? Math.min(5, card.box + 1) : 1;
    const due = now + INTERVALS[box - 1] * DAY;
    const cards = { ...get().cards, [key]: { ...card, box, due } };
    set({ cards });
    persist(cards);
  },

  clear: () => {
    set({ cards: {} });
    persist({});
  },
}));
