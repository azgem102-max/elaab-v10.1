import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import colors from "@/constants/colors";

import {
  glassRadius,
  glassShadow,
  glassSpacing,
  glassSpring,
  getSportGlassTheme,
} from "@/constants/glassTheme";
import { typography } from "@/constants/typography";
import type { SportType } from "@/context/AppContext";

interface GlassButtonProps {
  label: string;
  sport: SportType;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "accent";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeConfig = {
  sm: {
    paddingVertical: glassSpacing.xs,
    paddingHorizontal: glassSpacing.lg,
    minHeight: 40,
  },
  md: {
    paddingVertical: glassSpacing.sm,
    paddingHorizontal: glassSpacing.xl,
    minHeight: 52,
  },
  lg: {
    paddingVertical: glassSpacing.md + 2,
    paddingHorizontal: glassSpacing.xxl + 4,
    minHeight: 60,
  },
};

export function GlassButton({
  label,
  sport,
  onPress,
  disabled = false,
  loading = false,
  style,
  size = "md",
  variant = "primary",
}: GlassButtonProps) {
  const scale = useSharedValue(1);
  const theme = getSportGlassTheme(sport);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, glassSpring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, glassSpring.bouncy);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeStyle = sizeConfig[size];

  // Primary: Sport Gradient
  // Accent: Tonal shift (Secondary background)
  const isPrimary = variant === "primary";
  const labelColor = isPrimary ? "#FFFFFF" : colors.light.foreground;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.wrapper,
        glassShadow.soft,
        animatedStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {isPrimary ? (
        <View style={[styles.gradient, sizeStyle, { backgroundColor: theme.primary }]}>
          {loading ? (
            <ActivityIndicator color={labelColor} size="small" />
          ) : (
            <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
              {label}
            </Text>
          )}
        </View>
      ) : (
        <View style={[styles.gradient, sizeStyle, { backgroundColor: colors.light.surfaceVariant }]}>
          {loading ? (
            <ActivityIndicator color={labelColor} size="small" />
          ) : (
            <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
              {label}
            </Text>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: glassRadius.pill,
    overflow: "hidden",
  },
  gradient: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.bodyLg,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});
