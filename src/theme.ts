// A small, calm design system. British-racing-green accent for character.

export const colors = {
  bg: '#0E1311',
  surface: '#18201D',
  surfaceAlt: '#212B27',
  border: '#2C3833',
  text: '#F2F5F3',
  textMuted: '#9BA8A2',
  textFaint: '#69756F',
  accent: '#1F6F54', // British racing green
  accentSoft: '#234A3C',
  accentText: '#EAFBF4',
  danger: '#E0685B',
  warning: '#E0B15B',
  success: '#5BC08A',
  user: '#234A3C',
};

export const severityColor = (severity: number) => {
  if (severity >= 3) return colors.danger;
  if (severity === 2) return colors.warning;
  return colors.textMuted;
};

export const categoryColor = (category: string) => {
  switch (category) {
    case 'grammar':
      return '#6FA8E0';
    case 'vocabulary':
      return '#C08AE0';
    case 'register':
      return '#E0B15B';
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
