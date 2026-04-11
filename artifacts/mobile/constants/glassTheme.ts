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
    borderColor: "#E5E7EB",
  },
  medium: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  heavy: {
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
  },
  specular: {
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
};

export const glassShadow = {
  soft: Platform.select({
    web: { boxShadow: "0px 2px 12px rgba(44, 84, 232, 0.08), 0px 1px 4px rgba(0, 0, 0, 0.04)" },
    default: {
      shadowColor: "#2C54E8",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
  }) as ViewStyle,
  medium: Platform.select({
    web: { boxShadow: "0px 4px 24px rgba(44, 84, 232, 0.12), 0px 2px 8px rgba(0, 0, 0, 0.06)" },
    default: {
      shadowColor: "#2C54E8",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 6,
    },
  }) as ViewStyle,
  heavy: Platform.select({
    web: { boxShadow: "0px 8px 40px rgba(44, 84, 232, 0.16), 0px 4px 12px rgba(0, 0, 0, 0.08)" },
    default: {
      shadowColor: "#2C54E8",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 40,
      elevation: 10,
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
  glassColor: "rgba(44, 84, 232, 0.08)",
  glassTint: "rgba(44, 84, 232, 0.12)",
  blurIntensity: 0,
  borderGlow: "rgba(44, 84, 232, 0.30)",
  gradientStart: "#2C54E8",
  gradientEnd: "#5B7FFF",
  backgroundGradient: ["#FFFFFF", "#F4F6FF", "#EEF2FF"],
  primary: "#2C54E8",
};

const padelGlass: SportGlassTheme = {
  glassColor: "rgba(13, 148, 136, 0.08)",
  glassTint: "rgba(13, 148, 136, 0.12)",
  blurIntensity: 0,
  borderGlow: "rgba(13, 148, 136, 0.30)",
  gradientStart: "#0D9488",
  gradientEnd: "#14B8A6",
  backgroundGradient: ["#FFFFFF", "#F0FDFA", "#CCFBF1"],
  primary: "#0D9488",
};

const tennisGlass: SportGlassTheme = {
  glassColor: "rgba(217, 119, 6, 0.08)",
  glassTint: "rgba(217, 119, 6, 0.12)",
  blurIntensity: 0,
  borderGlow: "rgba(217, 119, 6, 0.30)",
  gradientStart: "#D97706",
  gradientEnd: "#F59E0B",
  backgroundGradient: ["#FFFFFF", "#FFFBEB", "#FEF3C7"],
  primary: "#D97706",
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
