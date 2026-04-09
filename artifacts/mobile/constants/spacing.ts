/**
 * Unified spacing constants for the app.
 * All padding, margin, and gap values should come from this scale.
 */

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  cardPadding: 16,
  cardPaddingLg: 20,
  screenH: 20,
  screenV: 16,
  sectionGap: 24,
  itemGap: 12,
} as const;

export type SpacingKey = keyof typeof spacing;
