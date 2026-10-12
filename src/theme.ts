/**
 * Minimal dark-neutral palette with a single restrained accent.
 */
export const colors = {
  background: '#0F1115',
  surface: '#1A1D24',
  surfaceElevated: '#22262E',
  surfacePressed: '#2A2F39',
  border: '#2C313A',
  textPrimary: '#F5F6F7',
  textSecondary: '#9AA0A6',
  textMuted: '#6B7078',
  accent: '#4F8CFF',
  accentPressed: '#3A72D6',
  onAccent: '#FFFFFF',
  danger: '#E5484D',
  success: '#46A758',
  warning: '#E8A33D',
  maskFill: 'rgba(79, 140, 255, 0.35)',
  maskStroke: 'rgba(79, 140, 255, 0.85)',
  scrim: 'rgba(0, 0, 0, 0.55)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
