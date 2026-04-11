import { useColorScheme } from "react-native";

import {
  defaultSportTheme,
  getSportGlassTheme,
  glassBlur,
  glassBorder,
  glassColors,
  glassDuration,
  glassRadius,
  glassShadow,
  glassSpacing,
  glassSpring,
  type SportGlassTheme,
} from "@/constants/glassTheme";
import { typography } from "@/constants/typography";
import { useActiveSport } from "@/context/SportFilterContext";

export interface AppTheme {
  sportTheme: SportGlassTheme;
  isDark: boolean;
  colors: typeof glassColors;
  blur: typeof glassBlur;
  border: typeof glassBorder;
  shadow: typeof glassShadow;
  spacing: typeof glassSpacing;
  radius: typeof glassRadius;
  spring: typeof glassSpring;
  duration: typeof glassDuration;
  typography: typeof typography;
  text: { primary: string; secondary: string; muted: string; inverse: string };
  surface: { card: string; input: string; overlay: string };
  primary: string;
  gradientStart: string;
  gradientEnd: string;
  gradientColors: [string, string];
}

/**
 * Returns the full unified app theme, automatically reacting to:
 * - The active sport (from SportFilterContext)
 * - The device color scheme (light / dark)
 *
 * Use this hook in any component that needs to read design tokens or
 * sport-aware colors instead of calling getSportGlassTheme() directly.
 */
export function useTheme(): AppTheme {
  const { activeSport } = useActiveSport();
  const isDark = useColorScheme() === "dark";

  const sportTheme = activeSport
    ? getSportGlassTheme(activeSport)
    : defaultSportTheme;

  const text = {
    primary: isDark ? "#FFFFFF" : "#212529",
    secondary: isDark ? "rgba(255,255,255,0.75)" : "rgba(33,37,41,0.75)",
    muted: isDark ? "rgba(255,255,255,0.45)" : "rgba(33,37,41,0.45)",
    inverse: isDark ? "#212529" : "#FFFFFF",
  };

  const surface = {
    card: isDark ? glassColors.black[30] : glassColors.white[60],
    input: isDark ? glassColors.black[20] : glassColors.white[40],
    overlay: isDark ? "rgba(33, 37, 41, 0.70)" : "rgba(255, 255, 255, 0.70)",
  };

  return {
    sportTheme,
    isDark,
    colors: glassColors,
    blur: glassBlur,
    border: glassBorder,
    shadow: glassShadow,
    spacing: glassSpacing,
    radius: glassRadius,
    spring: glassSpring,
    duration: glassDuration,
    typography,
    text,
    surface,
    primary: sportTheme.primary,
    gradientStart: sportTheme.gradientStart,
    gradientEnd: sportTheme.gradientEnd,
    gradientColors: [sportTheme.gradientStart, sportTheme.gradientEnd],
  };
}
