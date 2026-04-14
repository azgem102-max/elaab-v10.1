import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { typography } from "@/constants/typography";
import type { MatchFilters } from "./FilterBottomSheet";

const SKILL_LEVEL_LABELS: Record<string, string> = {
  beginner: "مبتدئ 🌱",
  intermediate: "متوسط ⚡",
  advanced: "متقدم 🔥",
};

const TIME_OF_DAY_LABELS: Record<string, string> = {
  morning: "صباح ☀️",
  afternoon: "ظهراً 🌤",
  evening: "مساء 🌙",
};

interface ActiveFilterChipsProps {
  filters: MatchFilters;
  onRemoveSkillLevel: () => void;
  onRemoveTimeOfDay: () => void;
  onRemoveHasSpots: () => void;
  onRemoveDistance?: () => void;
}

export function ActiveFilterChips({
  filters,
  onRemoveSkillLevel,
  onRemoveTimeOfDay,
  onRemoveHasSpots,
  onRemoveDistance,
}: ActiveFilterChipsProps) {
  const colors = useColors();
  const chips: { label: string; onRemove: () => void; key: string }[] = [];

  if (filters.distanceRadius != null && onRemoveDistance) {
    chips.push({
      key: "distance",
      label: `📍 ${filters.distanceRadius} كم`,
      onRemove: onRemoveDistance,
    });
  }

  if (filters.skillLevel) {
    chips.push({
      key: "skill",
      label: SKILL_LEVEL_LABELS[filters.skillLevel] ?? filters.skillLevel,
      onRemove: onRemoveSkillLevel,
    });
  }

  if (filters.timeOfDay) {
    chips.push({
      key: "time",
      label: TIME_OF_DAY_LABELS[filters.timeOfDay] ?? filters.timeOfDay,
      onRemove: onRemoveTimeOfDay,
    });
  }

  if (filters.hasSpots) {
    chips.push({
      key: "spots",
      label: "أماكن متاحة",
      onRemove: onRemoveHasSpots,
    });
  }

  if (chips.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip) => (
        <View
          key={chip.key}
          style={[styles.chip, { backgroundColor: colors.surfaceContainerHighest, borderWidth: 0 }]}
        >
          <Text style={[styles.chipLabel, { color: colors.onSurface }]}>{chip.label}</Text>
          <Pressable onPress={chip.onRemove} hitSlop={8} style={[styles.removeBtn, { backgroundColor: colors.mutedForeground + "15" }]}>
            <Ionicons name="close" size={12} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  chipLabel: {
    ...typography.label,
  },
  removeBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
