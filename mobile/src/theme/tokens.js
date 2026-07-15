// Central design tokens. Import these everywhere instead of hardcoding
// colors/spacing so the whole app stays visually consistent.

export const colors = {
  bg: '#0B0F1A',
  surface: '#151B2C',
  surfaceAlt: '#1D2438',
  border: '#2A3352',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#6366F1',      // indigo - primary CTA color
  accentAlt: '#22D3EE',   // cyan - secondary accent for AI features
  success: '#34D399',
  danger: '#F87171',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  h3: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  body: { fontSize: 14, fontWeight: '400', color: colors.textPrimary },
  caption: { fontSize: 12, fontWeight: '400', color: colors.textSecondary },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.4 },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
};
