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
  primary: "#2E7D32",
  primaryLight: "#4CAF50",
  primaryContainer: "#E8F5E9",
  cardBackground: "#F1F8E9",
  cardGradientStart: "#2E7D32",
  cardGradientEnd: "#4CAF50",
  badgeBackground: "#C8E6C9",
  badgeForeground: "#1B5E20",
  pillBackground: "#E8F5E9",
  pillForeground: "#2E7D32",
  infoBackground: "#F1F8E9",
  surfaceColor: "#F1F8E9",
  emoji: "⚽",
  gradientColors: ["#2E7D32", "#4CAF50"],
  containerStyle: Platform.select({
    web: { boxShadow: `0px 2px 12px rgba(46, 125, 50, 0.12), 0px 1px 4px rgba(46, 125, 50, 0.06)` },
    default: {
      shadowColor: "#2E7D32",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 3,
    },
  }) as ViewStyle,
  glass: {
    glassColor: "rgba(46, 125, 50, 0.08)",
    blurIntensity: 0,
    borderGlow: "rgba(46, 125, 50, 0.25)",
    backgroundGradient: ["#FFFFFF", "#F1F8E9", "#E8F5E9"],
  },
};

const padelTheme: SportCardTheme = {
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
  emoji: "🏓",
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

const tennisTheme: SportCardTheme = {
  primary: "#D97706",
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

const brandTheme: SportCardTheme = {
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
  emoji: "🏆",
  gradientColors: ["#2C54E8", "#5B7FFF"],
  containerStyle: {
    shadowColor: "#2C54E8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  glass: {
    glassColor: "rgba(44, 84, 232, 0.08)",
    blurIntensity: 0,
    borderGlow: "rgba(44, 84, 232, 0.25)",
    backgroundGradient: ["#FFFFFF", "#F4F6FF", "#EEF2FF"],
  },
};

const themes: Record<SportType, SportCardTheme> = {
  football: footballTheme,
  padel: padelTheme,
  tennis: tennisTheme,
};

export function getSportTheme(sport: SportType | null): SportCardTheme {
  if (!sport) return brandTheme;
  return themes[sport] || brandTheme;
}

export function getSportGradient(sport: SportType | null): [string, string] {
  const theme = getSportTheme(sport);
  return [theme.cardGradientStart, theme.cardGradientEnd];
}
