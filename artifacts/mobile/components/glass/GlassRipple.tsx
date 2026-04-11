import React, { useCallback } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  AnimatedStyle,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { glassColors } from "@/constants/glassTheme";

export function useGlassRipple(color: string = glassColors.white[30]) {
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  const triggerRipple = useCallback(() => {
    rippleScale.value = 0;
    rippleOpacity.value = 0.6;
    rippleScale.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
    rippleOpacity.value = withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.ease),
    });
  }, [rippleScale, rippleOpacity]);

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value * 2.5 }] as const,
    opacity: rippleOpacity.value,
    backgroundColor: color,
  }));

  return { triggerRipple, rippleStyle };
}

const styles = StyleSheet.create({
  rippleContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 9999,
  },
});

export function GlassRippleOverlay({
  rippleStyle,
}: {
  rippleStyle: AnimatedStyle<ViewStyle>;
}) {
  return (
    <View style={styles.rippleContainer} pointerEvents="none">
      <Animated.View style={[styles.ripple, rippleStyle]} />
    </View>
  );
}
