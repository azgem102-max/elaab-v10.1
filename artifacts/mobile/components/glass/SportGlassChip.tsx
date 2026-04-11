import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  glassRadius,
  glassShadow,
  glassSpacing,
  glassSpring,
  getSportGlassTheme,
} from "@/constants/glassTheme";
import { typography } from "@/constants/typography";
import type { SportType } from "@/context/AppContext";

interface SportGlassChipProps {
  sport: SportType;
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SportGlassChip({
  sport,
  label,
  selected = false,
  onPress,
  emoji,
  style,
}: SportGlassChipProps) {
  const sportTheme = getSportGlassTheme(sport);
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.93, glassSpring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, glassSpring.bouncy);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.chip,
        animatedStyle,
        selected
          ? {
              backgroundColor: "#E0E7FF",
              borderColor: sportTheme.primary,
              borderWidth: 1.5,
            }
          : {
              backgroundColor: "#F4F6FF",
              borderColor: "#E5E7EB",
              borderWidth: 1,
            },
        style,
      ]}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text
        style={[
          styles.label,
          {
            color: selected ? sportTheme.primary : "#6B7280",
          },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: glassSpacing.xs - 2,
    paddingHorizontal: glassSpacing.sm + 2,
    paddingVertical: glassSpacing.xs,
    borderRadius: glassRadius.pill,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    ...typography.bodySm,
  },
});
