import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'theme_mode_v1';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  loaded: boolean;
  load: () => Promise<void>;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  loaded: false,

  load: async () => {
    let mode: ThemeMode = 'system';
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') mode = raw;
    } catch {
      /* keep default */
    }
    set({ mode, loaded: true });
  },

  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(KEY, mode).catch(() => {});
  },
}));
