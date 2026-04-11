import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";

interface SkeletonLoaderProps {
  count?: number;
  variant?: "card" | "list" | "compact";
}

function SkeletonBlock({ width, height, borderRadius = 8 }: { width?: number | string; height: number; borderRadius?: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        { height, borderRadius },
        width !== undefined ? { width: width as number } : { flex: 1 },
        { backgroundColor: colors.surfaceContainerHigh },
      ]}
    />
  );
}

function SingleSkeleton({ variant }: { variant: "card" | "list" | "compact" }) {
  const colors = useColors();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  if (variant === "compact") {
    return (
      <Animated.View
        style={[
          styles.compactCard,
          { borderWidth: 1, borderColor: "#E5E7EB" },
          { backgroundColor: colors.surfaceContainerLow, opacity },
        ]}
      >
        <View style={styles.compactRow}>
          <SkeletonBlock width={70} height={22} borderRadius={12} />
          <SkeletonBlock width={50} height={22} borderRadius={12} />
        </View>
        <SkeletonBlock height={18} borderRadius={9} />
        <View style={styles.compactBottom}>
          <SkeletonBlock height={6} borderRadius={3} />
          <SkeletonBlock width={50} height={20} borderRadius={10} />
        </View>
      </Animated.View>
    );
  }

  if (variant === "list") {
    return (
      <Animated.View
        style={[
          styles.listCard,
          { borderWidth: 1, borderColor: "#E5E7EB" },
          { backgroundColor: colors.surfaceContainerLow, opacity },
        ]}
      >
        <View style={styles.listRow}>
          <SkeletonBlock width={40} height={40} borderRadius={20} />
          <View style={styles.listTextCol}>
            <SkeletonBlock height={16} borderRadius={8} />
            <SkeletonBlock width="60%" height={12} borderRadius={6} />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        { borderWidth: 1, borderColor: "#E5E7EB" },
        { backgroundColor: colors.surfaceContainerLow, opacity },
      ]}
    >
      <View style={styles.topRow}>
        <SkeletonBlock width={80} height={26} borderRadius={13} />
        <SkeletonBlock width={55} height={26} borderRadius={13} />
      </View>
      <SkeletonBlock height={20} borderRadius={10} />
      <View style={[styles.infoBlock, { backgroundColor: colors.surfaceContainerHigh }]}>
        <SkeletonBlock height={14} borderRadius={7} />
        <SkeletonBlock width="70%" height={14} borderRadius={7} />
        <SkeletonBlock width="80%" height={14} borderRadius={7} />
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.progressCol}>
          <SkeletonBlock height={6} borderRadius={3} />
        </View>
        <SkeletonBlock width={60} height={24} borderRadius={12} />
      </View>
    </Animated.View>
  );
}

export function SkeletonLoader({ count = 3, variant = "card" }: SkeletonLoaderProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <SingleSkeleton key={i} variant={variant} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  infoBlock: {
    borderRadius: 12,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressCol: {
    flex: 1,
  },
  compactCard: {
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  compactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  compactBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  listCard: {
    borderRadius: 12,
    padding: spacing.sm,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  listTextCol: {
    flex: 1,
    gap: spacing.xs,
  },
});
