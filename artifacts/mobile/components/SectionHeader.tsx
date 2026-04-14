import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

interface SectionHeaderProps {
  title: string;
  count?: number;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  subtitle?: string;
}

export function SectionHeader({ title, count, icon, subtitle }: SectionHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon && <Ionicons name={icon} size={18} color={colors.primary} />}
        <View>
          <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {count !== undefined && (
        <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.headlineSm,
  },
  subtitle: {
    ...typography.bodySm,
  },
  badge: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 12,
  },
});
