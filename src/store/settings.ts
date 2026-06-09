import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureDelete, secureGet, secureSet } from './secureStore';

const API_KEY = 'openai_api_key';
const PREFS_KEY = 'model_prefs_v1';

export interface ModelPrefs {
  transcriptionModel: string;
  analysisModel: string;
  ttsModel: string;
  ttsVoice: string;
  /** Auto-generate a cumulative review every N days (0 = manual only). */
  reviewCadenceDays: number;
}

export const DEFAULT_PREFS: ModelPrefs = {
  // gpt-4o-transcribe is higher quality than whisper-1; both accept m4a.
  transcriptionModel: 'gpt-4o-transcribe',
  // gpt-5.4 is the previous flagship: mid-tier price ($2.50/$15 per 1M vs
  // gpt-5.5's $5/$30) and still supports the JSON-schema structured outputs
  // this app requires. gpt-5.5 / gpt-5.5-pro are available for more quality.
  analysisModel: 'gpt-5.4',
  ttsModel: 'gpt-4o-mini-tts',
  ttsVoice: 'ash', // a clear, fairly neutral voice
  reviewCadenceDays: 7,
};

export const TTS_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'onyx',
  'nova',
  'sage',
  'shimmer',
];

interface SettingsState {
  apiKey: string | null;
  prefs: ModelPrefs;
  loaded: boolean;
  load: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  setPrefs: (prefs: Partial<ModelPrefs>) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  apiKey: null,
  prefs: DEFAULT_PREFS,
  loaded: false,

  load: async () => {
    const [storedKey, rawPrefs] = await Promise.all([
      secureGet(API_KEY),
      AsyncStorage.getItem(PREFS_KEY),
    ]);
    // Fall back to a key baked into the build at compile time via
    // EXPO_PUBLIC_OPENAI_API_KEY (.env). Lets the app work on-device with no
    // manual Settings step. A key the user saves in Settings always wins.
    const envKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() || null;
    const key = storedKey ?? envKey;
    let prefs = DEFAULT_PREFS;
    if (rawPrefs) {
      try {
        prefs = { ...DEFAULT_PREFS, ...JSON.parse(rawPrefs) };
      } catch {
        /* keep defaults */
      }
    }
    set({ apiKey: key, prefs, loaded: true });
  },

  setApiKey: async (key: string) => {
    const trimmed = key.trim();
    await secureSet(API_KEY, trimmed);
    set({ apiKey: trimmed });
  },

  clearApiKey: async () => {
    await secureDelete(API_KEY);
    set({ apiKey: null });
  },

  setPrefs: async (partial: Partial<ModelPrefs>) => {
    const next = { ...get().prefs, ...partial };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    set({ prefs: next });
  },
}));
