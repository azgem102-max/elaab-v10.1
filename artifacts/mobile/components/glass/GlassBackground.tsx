import React from "react";
import { StyleSheet, View } from "react-native";

interface GlassBackgroundProps {
  children: React.ReactNode;
}

export function GlassBackground({ children }: GlassBackgroundProps) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },
});
