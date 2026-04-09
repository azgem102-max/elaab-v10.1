import React, { useCallback } from "react";
import {
  I18nManager,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  glassRadius,
  glassSpacing,
  glassSpring,
} from "@/constants/glassTheme";
import { typography } from "@/constants/typography";
import type { SportType } from "@/context/AppContext";

interface GlassInputProps extends TextInputProps {
  sport?: SportType;
  label?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const PRIMARY_BLUE = "#2C54E8";
const BORDER_DEFAULT = "#E5E7EB";
const BG_DEFAULT = "#FFFFFF";
const PLACEHOLDER_COLOR = "rgba(107, 114, 128, 0.6)";
const TEXT_COLOR = "#111827";
const LABEL_COLOR_DEFAULT = "#6B7280";

export function GlassInput({
  sport = "football",
  label,
  onFocus,
  onBlur,
  value,
  placeholder,
  ...rest
}: GlassInputProps) {
  const isRTL = I18nManager.isRTL;

  const focusProgress = useSharedValue(0);
  const labelPosition = useSharedValue(value ? 1 : 0);

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
      focusProgress.value = withSpring(1, glassSpring.gentle);
      labelPosition.value = withSpring(1, glassSpring.gentle);
      onFocus?.(e);
    },
    [focusProgress, labelPosition, onFocus]
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
      focusProgress.value = withSpring(0, glassSpring.gentle);
      if (!value) {
        labelPosition.value = withSpring(0, glassSpring.gentle);
      }
      onBlur?.(e);
    },
    [focusProgress, labelPosition, onBlur, value]
  );

  const borderStyle = useAnimatedStyle(() => {
    "worklet";
    const isFocused = focusProgress.value > 0.5;
    return {
      borderWidth: isFocused ? 2 : 1,
      borderColor: isFocused ? PRIMARY_BLUE : BORDER_DEFAULT,
      backgroundColor: BG_DEFAULT,
    };
  });

  const labelAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [
        { translateY: interpolate(labelPosition.value, [0, 1], [0, -22]) },
        { scale: interpolate(labelPosition.value, [0, 1], [1, 0.85]) },
      ],
      opacity: interpolate(labelPosition.value, [0, 1], [0.6, 1]),
    };
  });

  const labelColorStyle = useAnimatedStyle(() => {
    "worklet";
    const isFocused = focusProgress.value > 0.5;
    return {
      color: isFocused ? PRIMARY_BLUE : LABEL_COLOR_DEFAULT,
    };
  });

  return (
    <AnimatedView style={[styles.container, borderStyle]}>
      {label && (
        <Animated.Text
          style={[
            styles.floatingLabel,
            labelAnimatedStyle,
            labelColorStyle,
            isRTL ? { right: glassSpacing.md } : { left: glassSpacing.md },
          ]}
        >
          {label}
        </Animated.Text>
      )}
      <TextInput
        value={value}
        placeholder={label ? undefined : placeholder}
        placeholderTextColor={PLACEHOLDER_COLOR}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.input,
          {
            color: TEXT_COLOR,
            paddingTop: label ? glassSpacing.lg + 2 : glassSpacing.sm + 2,
            textAlign: isRTL ? "right" : "left",
          },
        ]}
        {...rest}
      />
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: glassRadius.md,
    overflow: "hidden",
    position: "relative",
    minHeight: 56,
  },
  input: {
    ...typography.body,
    paddingHorizontal: glassSpacing.md,
    paddingBottom: glassSpacing.sm + 2,
    minHeight: 56,
    color: "#111827",
  },
  floatingLabel: {
    ...typography.label,
    position: "absolute",
    top: glassSpacing.md + 2,
    zIndex: 1,
  },
});
