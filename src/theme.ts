// Two palettes — a clean light theme and a deep, comfortable dark theme — sharing
// the same keys so any component can theme itself by reading `useColors()`.
import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/store/theme';

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  danger: string;
  warning: string;
  success: string;
  user: string;
}

export const lightColors: Palette = {
  bg: '#F6F7F9', // app canvas — soft off-white
  surface: '#FFFFFF', // cards
  surfaceAlt: '#EDF0F4', // pills, alt rows, subtle fills
  border: '#E3E7ED',
  text: '#111827', // near-black slate
  textMuted: '#5C6672',
  textFaint: '#98A1AE',
  accent: '#4F46E5', // indigo
  accentSoft: '#E5E9FD', // light indigo (chat bubbles, soft fills)
  accentText: '#FFFFFF', // text/icons on the accent colour
  danger: '#DC2626',
  warning: '#B45309',
  success: '#059669',
  user: '#E5E9FD',
};

export const darkColors: Palette = {
  bg: '#0E1116', // deep slate canvas
  surface: '#171B22', // cards
  surfaceAlt: '#222834', // pills, alt rows, subtle fills
  border: '#2A313C',
  text: '#F2F4F8', // near-white
  textMuted: '#9AA5B3',
  textFaint: '#69727F',
  accent: '#818CF8', // lighter indigo reads better on dark
  accentSoft: '#2A3157', // muted indigo for soft fills / chat bubbles
  accentText: '#FFFFFF',
  danger: '#F87171',
  warning: '#FBBF24',
  success: '#34D399',
  user: '#2A3157',
};

// A static default (light) for non-component code and helper fallbacks.
export const colors = lightColors;

/** The active palette for the current theme. Call inside a component. */
export function useColors(): Palette {
  const system = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const resolved = mode === 'system' ? system ?? 'light' : mode;
  return resolved === 'dark' ? darkColors : lightColors;
}

export const severityColor = (severity: number) => {
  if (severity >= 3) return colors.danger;
  if (severity === 2) return colors.warning;
  return colors.textMuted;
};

export const trendColor = (status: string) => {
  switch (status) {
    case 'resolved':
      return colors.success;
    case 'improved':
      return '#10B981';
    case 'persistent':
      return colors.textMuted;
    case 'worse':
      return colors.danger;
    case 'new':
      return colors.warning;
    default:
      return colors.textMuted;
  }
};

export const categoryColor = (category: string) => {
  switch (category) {
    case 'grammar':
      return '#2563EB';
    case 'vocabulary':
      return '#7C3AED';
    case 'register':
      return '#B45309';
    default:
      return colors.textMuted;
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const font = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  small: 14,
  tiny: 12,
};
