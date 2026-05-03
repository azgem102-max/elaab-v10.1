import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { typography } from "@/constants/typography";


interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  color?: string;
}

export function OnboardingProgress({ currentStep, totalSteps, color = "#2E7D32" }: OnboardingProgressProps) {
  const safeStep = Math.min(currentStep, totalSteps);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: safeStep / totalSteps,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [safeStep, totalSteps]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.barTrack, { backgroundColor: "#EEF2FF", borderWidth: 0 }]}>
        <Animated.View
          style={[
            styles.barFill,
            { width: widthInterpolated, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.label, { color }]}>
        {safeStep} من {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontFamily: typography.headlineSm.fontFamily,
    minWidth: 44,
    textAlign: "center",
  },
});
