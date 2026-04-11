import { Platform, ViewStyle } from "react-native";
import type { SportType } from "@/context/AppContext";

export interface SportGlassConfig {
  glassColor: string;
  blurIntensity: number;
  borderGlow: string;
  backgroundGradient: [string, string, string];
}

export interface SportCardTheme {
  cardBackground: string;
  cardGradientStart: string;
  cardGradientEnd: string;
  badgeBackground: string;
  badgeForeground: string;
  pillBackground: string;
  pillForeground: string;
  infoBackground: string;
  surfaceColor: string;
  primary: string;
  primaryLight: string;
  primaryContainer: string;
  containerStyle: ViewStyle;
  glass: SportGlassConfig;
  emoji: string;
  gradientColors: [string, string];
}

const footballTheme: SportCardTheme = {
  primary: "#2C54E8",
  primaryLight: "#5B7FFF",
  primaryContainer: "#E0E7FF",
  cardBackground: "#F4F6FF",
  cardGradientStart: "#2C54E8",
  cardGradientEnd: "#5B7FFF",
  badgeBackground: "#E0E7FF",
  badgeForeground: "#1E3FA0",
  pillBackground: "#EEF2FF",
  pillForeground: "#2C54E8",
  infoBackground: "#F4F6FF",
  surfaceColor: "#F4F6FF",
  emoji: "⚽",
  gradientColors: ["#2C54E8", "#5B7FFF"],
  containerStyle: Platform.select({
    web: { boxShadow: `0px 2px 12px rgba(44, 84, 232, 0.12), 0px 1px 4px rgba(44, 84, 232, 0.06)` },
    default: {
      shadowColor: "#2C54E8",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 3,
    },
  }) as ViewStyle,
  glass: {
    glassColor: "rgba(44, 84, 232, 0.08)",
    blurIntensity: 0,
    borderGlow: "rgba(44, 84, 232, 0.25)",
    backgroundGradient: ["#FFFFFF", "#F4F6FF", "#EEF2FF"],
  },
};

const padelTheme: SportCardTheme = {
<<<<<<< HEAD
  primary: "#059669",
  primaryContainer: "#D1FAE5",
  cardBackground: "#F0FDF9",
  cardGradientStart: "#059669",
  cardGradientEnd: "#34D399",
  badgeBackground: "#D1FAE5",
  badgeForeground: "#065F46",
  pillBackground: "#ECFDF5",
  pillForeground: "#059669",
  infoBackground: "#F0FDF9",
  surfaceColor: "#F0FDF9",
  containerStyle: Platform.select({
    web: { boxShadow: `0px 2px 12px rgba(5, 150, 105, 0.10), 0px 1px 4px rgba(5, 150, 105, 0.06)` },
    default: {
      shadowColor: "#059669",
=======
  primary: "#0D9488",
  primaryLight: "#14B8A6",
  primaryContainer: "#CCFBF1",
  cardBackground: "#F0FDFA",
  cardGradientStart: "#0D9488",
  cardGradientEnd: "#14B8A6",
  badgeBackground: "#CCFBF1",
  badgeForeground: "#0F766E",
  pillBackground: "#F0FDFA",
  pillForeground: "#0D9488",
  infoBackground: "#F0FDFA",
  surfaceColor: "#F0FDFA",
  emoji: "🏓",
  gradientColors: ["#0D9488", "#14B8A6"],
  containerStyle: Platform.select({
    web: { boxShadow: `0px 2px 12px rgba(13, 148, 136, 0.12), 0px 1px 4px rgba(13, 148, 136, 0.06)` },
    default: {
      shadowColor: "#0D9488",
>>>>>>> 70b5f8f (feat(mobile): Home & Explore UI/UX Polish (Task #21))
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 3,
    },
  }) as ViewStyle,
  glass: {
<<<<<<< HEAD
    glassColor: "rgba(5, 150, 105, 0.08)",
    blurIntensity: 0,
    borderGlow: "rgba(5, 150, 105, 0.25)",
    backgroundGradient: ["#FFFFFF", "#F0FDF9", "#D1FAE5"],
=======
    glassColor: "rgba(13, 148, 136, 0.08)",
    blurIntensity: 0,
    borderGlow: "rgba(13, 148, 136, 0.25)",
    backgroundGradient: ["#FFFFFF", "#F0FDFA", "#CCFBF1"],
>>>>>>> 70b5f8f (feat(mobile): Home & Explore UI/UX Polish (Task #21))
  },
};

const tennisTheme: SportCardTheme = {
  primary: "#D97706",
<<<<<<< HEAD
  primaryContainer: "#FEF3C7",
  cardBackground: "#FFFBEB",
  cardGradientStart: "#D97706",
  cardGradientEnd: "#FBBF24",
  badgeBackground: "#FEF3C7",
  badgeForeground: "#92400E",
  pillBackground: "#FFF7ED",
  pillForeground: "#D97706",
  infoBackground: "#FFFBEB",
  surfaceColor: "#FFFBEB",
  containerStyle: Platform.select({
    web: { boxShadow: `0px 2px 12px rgba(217, 119, 6, 0.10), 0px 1px 4px rgba(217, 119, 6, 0.06)` },
=======
  primaryLight: "#F59E0B",
  primaryContainer: "#FEF3C7",
  cardBackground: "#FFFBEB",
  cardGradientStart: "#D97706",
  cardGradientEnd: "#F59E0B",
  badgeBackground: "#FEF3C7",
  badgeForeground: "#92400E",
  pillBackground: "#FFFBEB",
  pillForeground: "#D97706",
  infoBackground: "#FFFBEB",
  surfaceColor: "#FFFBEB",
  emoji: "🎾",
  gradientColors: ["#D97706", "#F59E0B"],
  containerStyle: Platform.select({
    web: { boxShadow: `0px 2px 12px rgba(217, 119, 6, 0.12), 0px 1px 4px rgba(217, 119, 6, 0.06)` },
>>>>>>> 70b5f8f (feat(mobile): Home & Explore UI/UX Polish (Task #21))
    default: {
      shadowColor: "#D97706",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 3,
    },
  }) as ViewStyle,
  glass: {
    glassColor: "rgba(217, 119, 6, 0.08)",
    blurIntensity: 0,
    borderGlow: "rgba(217, 119, 6, 0.25)",
    backgroundGradient: ["#FFFFFF", "#FFFBEB", "#FEF3C7"],
  },
};

const themes: Record<SportType, SportCardTheme> = {
  football: footballTheme,
  padel: padelTheme,
  tennis: tennisTheme,
};

export function getSportTheme(sport: SportType): SportCardTheme {
  return themes[sport];
}

export function getSportGradient(sport: SportType): [string, string] {
  const theme = themes[sport];
  return [theme.cardGradientStart, theme.cardGradientEnd];
}
