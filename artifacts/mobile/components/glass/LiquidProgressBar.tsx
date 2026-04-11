import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  glassSpring,
} from "@/constants/glassTheme";
import { getSportTheme } from "@/constants/sportTheme";
import type { SportType } from "@/context/AppContext";

interface LiquidProgressBarProps {
  progress: number;
  sport: SportType;
  height?: number;
  showShimmer?: boolean;
  overrideColor?: string;
}

export function LiquidProgressBar({
  progress,
  sport,
  height = 8,
  showShimmer = false,
  overrideColor,
}: LiquidProgressBarProps) {
  const animatedProgress = useSharedValue(0);
  const sportTheme = getSportTheme(sport);

  useEffect(() => {
    animatedProgress.value = withSpring(
      Math.min(Math.max(progress, 0), 1),
      glassSpring.liquid
    );
  }, [progress, animatedProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const gradStart = overrideColor ?? sportTheme.primary;
  const trackColor = overrideColor ? `${overrideColor}22` : sportTheme.primaryContainer;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
      <Animated.View
        style={[
          styles.fill,
          fillStyle,
          { height, borderRadius: height / 2 },
        ]}
      >
        <View style={[StyleSheet.absoluteFill, { borderRadius: height / 2, backgroundColor: gradStart }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    overflow: "hidden",
    position: "relative",
  },
});
