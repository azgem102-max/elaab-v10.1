import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  glassShadow,
  glassSpacing,
} from "@/constants/glassTheme";
import { typography } from "@/constants/typography";

interface GlassHeaderProps {
  title: string;
  scrollOffset?: SharedValue<number>;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function GlassHeader({
  title,
  scrollOffset,
  leading,
  trailing,
}: GlassHeaderProps) {
  const insets = useSafeAreaInsets();

  const titleAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollOffset) return { opacity: 1, transform: [{ translateY: 0 }] };
    return {
      opacity: interpolate(scrollOffset.value, [0, 60, 120], [1, 0.8, 1]),
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [0, 60, 120],
            [0, -4, 0]
          ),
        },
      ],
    };
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: "#FFFFFF" }]}>
      <View style={styles.headerRow}>
        <View style={styles.side}>{leading}</View>
        <Animated.View style={[styles.titleWrap, titleAnimatedStyle]}>
          <Text
            style={[styles.title, { color: "#111827" }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </Animated.View>
        <View style={styles.side}>{trailing}</View>
      </View>
      <View style={styles.bottomBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 10,
    ...glassShadow.soft,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    paddingHorizontal: glassSpacing.md,
  },
  side: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    ...typography.headlineSm,
    textAlign: "center",
  },
  bottomBorder: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
});
