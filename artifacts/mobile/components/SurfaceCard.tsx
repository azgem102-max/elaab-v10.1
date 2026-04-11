import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import {
  glassRadius,
  glassShadow,
} from "@/constants/glassTheme";

interface SurfaceCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export function SurfaceCard({ children, style, elevated = false }: SurfaceCardProps) {
  const shadow = elevated ? glassShadow.medium : glassShadow.soft;

  return (
    <View
      style={[
        styles.card,
        shadow,
        style,
      ]}
    >
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: glassRadius.lg,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  content: {
    padding: 16,
  },
});
