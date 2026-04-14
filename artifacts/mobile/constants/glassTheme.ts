import { Dimensions, Platform, ViewStyle } from "react-native";
import type { SportType } from "@/context/AppContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const glassColors = {
  white: {
    5: "rgba(255, 255, 255, 0.05)",
    10: "rgba(255, 255, 255, 0.10)",
    15: "rgba(255, 255, 255, 0.15)",
    20: "rgba(255, 255, 255, 0.20)",
    30: "rgba(255, 255, 255, 0.30)",
    35: "rgba(255, 255, 255, 0.35)",
    40: "rgba(255, 255, 255, 0.40)",
    50: "rgba(255, 255, 255, 0.50)",
    60: "rgba(255, 255, 255, 0.60)",
    70: "rgba(255, 255, 255, 0.70)",
    75: "rgba(255, 255, 255, 0.75)",
    80: "rgba(255, 255, 255, 0.80)",
    90: "rgba(255, 255, 255, 0.90)",
  },
  black: {
    5: "rgba(0, 0, 0, 0.05)",
    10: "rgba(0, 0, 0, 0.10)",
    15: "rgba(0, 0, 0, 0.15)",
    20: "rgba(0, 0, 0, 0.20)",
    30: "rgba(0, 0, 0, 0.30)",
    40: "rgba(0, 0, 0, 0.40)",
    50: "rgba(0, 0, 0, 0.50)",
    60: "rgba(0, 0, 0, 0.60)",
    70: "rgba(0, 0, 0, 0.70)",
  },
};

export const glassBlur = {
  light: 14,
  medium: 32,
  heavy: 50,
  ultraHeavy: 80,
};

export const glassBorder = {
  light: {
    borderWidth: 1,
    borderColor: "rgba(175, 179, 174, 0.15)", // Ghost border
  },
  medium: {
    borderWidth: 1,
    borderColor: "rgba(175, 179, 174, 0.25)",
  },
  heavy: {
    borderWidth: 1.5,
    borderColor: "rgba(175, 179, 174, 0.40)",
  },
  specular: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
};

export const glassShadow = {
  soft: Platform.select({
    web: { boxShadow: "0px 2px 12px rgba(26, 26, 27, 0.04), 0px 1px 4px rgba(0, 0, 0, 0.02)" },
    default: {
      shadowColor: "#1A1A1B",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
  }) as ViewStyle,
  medium: Platform.select({
    web: { boxShadow: "0px 4px 24px rgba(26, 26, 27, 0.06), 0px 2px 8px rgba(0, 0, 0, 0.03)" },
    default: {
      shadowColor: "#1A1A1B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 24,
      elevation: 4,
    },
  }) as ViewStyle,
  heavy: Platform.select({
    web: { boxShadow: "0px 8px 40px rgba(26, 26, 27, 0.10), 0px 4px 12px rgba(0, 0, 0, 0.05)" },
    default: {
      shadowColor: "#1A1A1B",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius: 40,
      elevation: 8,
    },
  }) as ViewStyle,
  glow: (color: string) =>
    Platform.select({
      web: { boxShadow: `0px 0px 20px ${color}` },
      default: {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 6,
      },
    }) as ViewStyle,
};

export const glassSpring = {
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },
  gentle: { damping: 15, stiffness: 150, mass: 1 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.6 },
  liquid: { damping: 18, stiffness: 120, mass: 1.2 },
};

export const glassRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 100,
};

const isNarrow = SCREEN_WIDTH < 360;
const isWide = SCREEN_WIDTH >= 768;
const scaleFactor = isNarrow ? 0.85 : isWide ? 1.15 : 1;

function sp(base: number): number {
  return Math.round(base * scaleFactor);
}

export const glassSpacing = {
  xxs: sp(4),
  xs: sp(8),
  sm: sp(12),
  md: sp(16),
  lg: sp(20),
  xl: sp(24),
  xxl: sp(32),
  xxxl: sp(48),
  screenH: sp(20),
  screenV: sp(16),
  cardPadding: sp(16),
  cardPaddingLg: sp(20),
  sectionGap: sp(24),
  itemGap: sp(12),
};

export const glassDuration = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
};

export interface SportGlassTheme {
  glassColor: string;
  glassTint: string;
  blurIntensity: number;
  borderGlow: string;
  gradientStart: string;
  gradientEnd: string;
  backgroundGradient: [string, string, string];
  primary: string;
}

const footballGlass: SportGlassTheme = {
  glassColor: "rgba(34, 197, 94, 0.08)",
  glassTint: "rgba(34, 197, 94, 0.12)",
  blurIntensity: 0,
  borderGlow: "rgba(34, 197, 94, 0.30)",
  gradientStart: "#22C55E",
  gradientEnd: "#16A34A",
  backgroundGradient: ["#FFFFFF", "#F0FDF4", "#DCFCE7"],
  primary: "#22C55E",
};

const padelGlass: SportGlassTheme = {
  glassColor: "rgba(0, 71, 171, 0.08)",
  glassTint: "rgba(0, 71, 171, 0.12)",
  blurIntensity: 0,
  borderGlow: "rgba(0, 71, 171, 0.30)",
  gradientStart: "#0047AB",
  gradientEnd: "#003285",
  backgroundGradient: ["#FFFFFF", "#F9F8FF", "#EDEBFF"],
  primary: "#0047AB",
};

const tennisGlass: SportGlassTheme = {
  glassColor: "rgba(210, 105, 30, 0.08)",
  glassTint: "rgba(210, 105, 30, 0.12)",
  blurIntensity: 0,
  borderGlow: "rgba(210, 105, 30, 0.30)",
  gradientStart: "#D2691E",
  gradientEnd: "#B35A1A",
  backgroundGradient: ["#FFFFFF", "#FFFDF9", "#FDF1E6"],
  primary: "#D2691E",
};

const sportGlassThemes: Record<SportType, SportGlassTheme> = {
  football: footballGlass,
  padel: padelGlass,
  tennis: tennisGlass,
};

export function getSportGlassTheme(sport: SportType): SportGlassTheme {
  return sportGlassThemes[sport];
}

export const defaultBackground = {
  gradientColors: ["#FFFFFF", "#F4F6FF", "#EEF2FF"] as const,
};

export const defaultSportTheme: SportGlassTheme = footballGlass;
