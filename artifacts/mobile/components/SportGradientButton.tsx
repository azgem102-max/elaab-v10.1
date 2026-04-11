import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  glassRadius,
  glassShadow,
  glassSpring,
} from "@/constants/glassTheme";
import { typography } from "@/constants/typography";

interface SportGradientButtonProps {
  label: string;
  gradientStart: string;
  gradientEnd: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SportGradientButton({
  label,
  gradientStart,
  gradientEnd,
  onPress,
  disabled = false,
  loading = false,
  style,
  textColor = "#FFFFFF",
}: SportGradientButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, glassSpring.snappy);
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
      disabled={disabled || loading}
      style={[
        styles.wrapper,
        glassShadow.soft,
        animatedStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.gradient, { backgroundColor: gradientStart }]}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: glassRadius.pill,
    overflow: "hidden",
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  label: {
    ...typography.bodyLg,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});
