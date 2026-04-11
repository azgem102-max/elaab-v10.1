import React from "react";
import {
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import {
  glassRadius,
  glassShadow,
} from "@/constants/glassTheme";

interface GlassScreenHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassScreenHeader({ children, style }: GlassScreenHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      {children}
      <View style={styles.bottomBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    borderBottomStartRadius: glassRadius.lg,
    borderBottomEndRadius: glassRadius.lg,
    backgroundColor: "#FFFFFF",
    ...glassShadow.soft,
  },
  bottomBorder: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
});
