import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatCost, transcriptionCost, ttsCost } from '@/lib/pricing';

const KEY = 'usage_v1';

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
  calls: number;
}
export interface TranscriptionUsage {
  seconds: number;
  calls: number;
}
export interface TtsUsage {
  chars: number;
  calls: number;
}

interface UsageState {
  chat: Record<string, ChatUsage>;
  transcription: Record<string, TranscriptionUsage>;
  tts: Record<string, TtsUsage>;
  loaded: boolean;
  load: () => Promise<void>;
  recordChat: (model: string, inputTokens: number, outputTokens: number) => void;
  recordTranscription: (model: string, seconds: number) => void;
  recordTts: (model: string, chars: number) => void;
  reset: () => void;
}

function persist(state: Pick<UsageState, 'chat' | 'transcription' | 'tts'>) {
  AsyncStorage.setItem(
    KEY,
    JSON.stringify({ chat: state.chat, transcription: state.transcription, tts: state.tts }),
  ).catch(() => {});
}

export const useUsage = create<UsageState>((set, get) => ({
  chat: {},
  transcription: {},
  tts: {},
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        set({ chat: p.chat ?? {}, transcription: p.transcription ?? {}, tts: p.tts ?? {} });
      }
    } catch {
      /* keep empty */
    }
    set({ loaded: true });
  },

  recordChat: (model, inputTokens, outputTokens) => {
    if (!model) return;
    const prev = get().chat[model] ?? { inputTokens: 0, outputTokens: 0, calls: 0 };
    const chat = {
      ...get().chat,
      [model]: {
        inputTokens: prev.inputTokens + (inputTokens || 0),
        outputTokens: prev.outputTokens + (outputTokens || 0),
        calls: prev.calls + 1,
      },
    };
    set({ chat });
    persist({ chat, transcription: get().transcription, tts: get().tts });
  },

  recordTranscription: (model, seconds) => {
    const prev = get().transcription[model] ?? { seconds: 0, calls: 0 };
    const transcription = {
      ...get().transcription,
      [model]: { seconds: prev.seconds + (seconds || 0), calls: prev.calls + 1 },
    };
    set({ transcription });
    persist({ chat: get().chat, transcription, tts: get().tts });
  },

  recordTts: (model, chars) => {
    const prev = get().tts[model] ?? { chars: 0, calls: 0 };
    const tts = {
      ...get().tts,
      [model]: { chars: prev.chars + (chars || 0), calls: prev.calls + 1 },
    };
    set({ tts });
    persist({ chat: get().chat, transcription: get().transcription, tts });
  },

  reset: () => {
    const empty = { chat: {}, transcription: {}, tts: {} };
    set(empty);
    persist(empty);
  },
}));

export interface UsageSummary {
  chatTokens: number;
  chatCost: number;
  transcriptionMinutes: number;
  transcriptionCost: number;
  ttsChars: number;
  ttsCost: number;
  totalCost: number;
}

export function summarizeUsage(s: Pick<UsageState, 'chat' | 'transcription' | 'tts'>): UsageSummary {
  let chatTokens = 0;
  let chatTotal = 0;
  for (const [model, u] of Object.entries(s.chat)) {
    chatTokens += u.inputTokens + u.outputTokens;
    chatTotal += chatCost(model, u.inputTokens, u.outputTokens);
  }
  let seconds = 0;
  let transcribeTotal = 0;
  for (const [model, u] of Object.entries(s.transcription)) {
    seconds += u.seconds;
    transcribeTotal += transcriptionCost(model, u.seconds);
  }
  let ttsChars = 0;
  let ttsTotal = 0;
  for (const [model, u] of Object.entries(s.tts)) {
    ttsChars += u.chars;
    ttsTotal += ttsCost(model, u.chars);
  }
  return {
    chatTokens,
    chatCost: chatTotal,
    transcriptionMinutes: seconds / 60,
    transcriptionCost: transcribeTotal,
    ttsChars,
    ttsCost: ttsTotal,
    totalCost: chatTotal + transcribeTotal + ttsTotal,
  };
}
