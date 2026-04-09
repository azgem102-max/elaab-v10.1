import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
          style={styles.chip}
        >
          <Text style={styles.chipLabel}>{chip.label}</Text>
          <Pressable onPress={chip.onRemove} hitSlop={8} style={styles.removeBtn}>
            <Ionicons name="close" size={12} color="#2C54E8" />
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
    backgroundColor: "#E0E7FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#2C54E8",
  },
  removeBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(44, 84, 232, 0.15)",
  },
});
