/** Colours chosen to meet WCAG AA contrast (>= 4.5:1) against their backgrounds. */
export const colors = {
  background: '#FFFFFF',
  surface: '#F4F5F7',
  text: '#111827',
  textMuted: '#4B5563',
  primary: '#1D4ED8',
  onPrimary: '#FFFFFF',
  success: '#166534',
  danger: '#B91C1C',
  border: '#D1D5DB',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const },
  body: { fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600' as const },
  small: { fontSize: 13 },
} as const;

/** Minimum touch target size (Android accessibility guideline: 48dp). */
export const MIN_TOUCH_TARGET = 48;
