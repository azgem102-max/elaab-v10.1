import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";


interface StatBadgeProps {
  value: string | number;
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  color?: string;
  size?: "sm" | "md" | "lg";
  variant?: "pill" | "card";
}

export function StatBadge({
  value,
  label,
  icon,
  color,
  size = "md",
  variant = "pill",
}: StatBadgeProps) {
  const colors = useColors();
  const accentColor = color ?? colors.primary;

  if (variant === "card") {
    return (
      <View style={[styles.card, { backgroundColor: accentColor + "12" }]}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: accentColor + "20" }]}>
            <Ionicons name={icon} size={size === "sm" ? 14 : size === "lg" ? 22 : 18} color={accentColor} />
          </View>
        )}
        <Text
          style={[
            styles.cardValue,
            { color: colors.onSurface, fontSize: size === "sm" ? 20 : size === "lg" ? 28 : 24 },
          ]}
        >
          {value}
        </Text>
        {label && (
          <Text style={[styles.cardLabel, { color: accentColor + "CC" }]}>{label}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.pill, { backgroundColor: accentColor + "18" }]}>
      {icon && (
        <Ionicons
          name={icon}
          size={size === "sm" ? 12 : size === "lg" ? 16 : 14}
          color={accentColor}
        />
      )}
      <Text
        style={[
          styles.pillText,
          {
            color: accentColor,
            fontSize: size === "sm" ? 11 : size === "lg" ? 15 : 13,
          },
        ]}
      >
        {value}
        {label ? ` ${label}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: 100,
  },
  pillText: {
    fontFamily: typography.bodyLg.fontFamily,
  },
  card: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 70,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardValue: {
    fontFamily: typography.headlineSm.fontFamily,
    lineHeight: 32,
  },
  cardLabel: {
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 11,
  },
});
