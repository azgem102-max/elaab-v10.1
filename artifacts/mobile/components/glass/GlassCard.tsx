import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";

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
  style?: StyleProp<ViewStyle>;
  borderless?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

import colors from "@/constants/colors";

const variantConfig = {
  light: {
    bg: colors.light.card,
    border: "transparent",
    shadow: glassShadow.soft,
  },
  medium: {
    bg: colors.light.surfaceContainerLow,
    border: "transparent",
    shadow: glassShadow.soft,
  },
  dark: {
    bg: colors.light.surfaceContainer,
    border: "transparent",
    shadow: glassShadow.medium,
  },
  sport: {
    bg: colors.light.card,
    border: "transparent",
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
          borderWidth: 0,
          borderColor: "transparent",
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
