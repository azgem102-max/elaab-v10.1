import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { glassShadow, glassRadius } from "@/constants/glassTheme";

interface EmptyStateAction {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  variant?: "primary" | "secondary";
}

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
}

export function EmptyState({ icon, title, description, actions }: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, glassShadow.soft, { backgroundColor: colors.primaryContainer, borderColor: `${colors.primary}25` }]}>
        <Ionicons name={icon} size={44} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>
      ) : null}
      {actions && actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action, i) => {
            const isPrimary = !action.variant || action.variant === "primary";
            if (isPrimary) {
              return (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { opacity: pressed ? 0.85 : 1, backgroundColor: colors.accent },
                  ]}
                  onPress={action.onPress}
                >
                  {action.icon && (
                    <Ionicons name={action.icon} size={18} color={colors.accentForeground} />
                  )}
                  <Text style={[styles.primaryBtnText, { color: colors.accentForeground }]}>{action.label}</Text>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { opacity: pressed ? 0.8 : 1, backgroundColor: colors.primaryContainer, borderColor: `${colors.primary}25` },
                ]}
                onPress={action.onPress}
              >
                {action.icon && (
                  <Ionicons name={action.icon} size={16} color={colors.primary} />
                )}
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  title: {
    ...typography.headlineSm,
    textAlign: "center",
  },
  description: {
    ...typography.bodySm,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    gap: spacing.xs,
    width: "100%",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  primaryBtn: {
    borderRadius: 24,
    width: "80%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  primaryBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
});
