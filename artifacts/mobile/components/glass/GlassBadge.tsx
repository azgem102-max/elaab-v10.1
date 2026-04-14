import React from "react";
import { StyleSheet, Text, View, ViewStyle, StyleProp } from "react-native";

import {
  glassRadius,
  glassSpacing,
  getSportGlassTheme,
} from "@/constants/glassTheme";
import { typography } from "@/constants/typography";
import type { SportType } from "@/context/AppContext";

type BadgeVariant = "default" | "sport" | "success" | "warning" | "error";

interface GlassBadgeProps {
  label: string;
  variant?: BadgeVariant;
  sport?: SportType;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

const variantColors: Record<
  Exclude<BadgeVariant, "sport">,
  { bg: string; fg: string }
> = {
  default: {
    bg: "#EEF2FF",
    fg: "#6B7280",
  },
  success: {
    bg: "rgba(22, 163, 74, 0.12)",
    fg: "#16A34A",
  },
  warning: {
    bg: "rgba(217, 119, 6, 0.12)",
    fg: "#D97706",
  },
  error: {
    bg: "rgba(220, 38, 38, 0.12)",
    fg: "#DC2626",
  },
};

export function GlassBadge({
  label,
  variant = "default",
  sport,
  size = "md",
  style,
}: GlassBadgeProps) {
  let bg: string;
  let fg: string;

  if (variant === "sport" && sport) {
    const sportTheme = getSportGlassTheme(sport);
    bg = "#E0E7FF";
    fg = sportTheme.primary;
  } else {
    const c = variantColors[variant === "sport" ? "default" : variant];
    bg = c.bg;
    fg = c.fg;
  }

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingHorizontal: isSmall ? glassSpacing.xs : glassSpacing.sm,
          paddingVertical: isSmall ? glassSpacing.xxs / 2 : glassSpacing.xxs,
        },
        style,
      ]}
    >
      <Text
        style={[
          isSmall ? typography.labelSm : typography.label,
          { color: fg },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: glassRadius.pill,
    alignSelf: "flex-start",
  },
});
