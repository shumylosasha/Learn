// A clean, light design system. Off-white canvas, near-black text, indigo accent.

export const colors = {
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
