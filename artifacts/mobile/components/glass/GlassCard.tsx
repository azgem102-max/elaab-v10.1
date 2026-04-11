import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import {
  glassRadius,
  glassShadow,
  glassSpacing,
  getSportGlassTheme,
} from "@/constants/glassTheme";
import type { SportType } from "@/context/AppContext";

export type GlassVariant = "light" | "medium" | "dark" | "sport";

interface GlassCardProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  sport?: SportType;
  style?: ViewStyle;
  borderless?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const variantConfig = {
  light: {
    bg: "#FFFFFF",
    border: "#E5E7EB",
    shadow: glassShadow.soft,
  },
  medium: {
    bg: "#F4F6FF",
    border: "#D1D5DB",
    shadow: glassShadow.medium,
  },
  dark: {
    bg: "#EEF2FF",
    border: "#C7D2FE",
    shadow: glassShadow.medium,
  },
  sport: {
    bg: "#FFFFFF",
    border: "#E0E7FF",
    shadow: glassShadow.soft,
  },
};

const paddingMap = {
  none: 0,
  sm: glassSpacing.sm,
  md: glassSpacing.cardPadding,
  lg: glassSpacing.cardPaddingLg,
};

export function GlassCard({
  children,
  variant = "light",
  sport,
  style,
  borderless = false,
  padding = "md",
}: GlassCardProps) {
  const config = variantConfig[variant];
  const sportTheme = sport ? getSportGlassTheme(sport) : null;

  const cardBg =
    variant === "sport" && sportTheme ? "#FFFFFF" : config.bg;
  const contentPadding = paddingMap[padding];

  return (
    <View
      style={[
        styles.container,
        config.shadow,
        {
          backgroundColor: cardBg,
          borderWidth: borderless ? 0 : 1,
          borderColor: borderless ? "transparent" : config.border,
        },
        style,
      ]}
    >
      <View style={{ padding: contentPadding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: glassRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
});
