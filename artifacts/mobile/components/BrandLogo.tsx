import { Image } from "expo-image";
import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { typography } from "@/constants/typography";

const arenaMark = require("@/assets/images/arena-mark.png");

type BrandLogoVariant = "mark" | "lockup";
type BrandLogoTone = "dark" | "light";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  tone?: BrandLogoTone;
  size?: "sm" | "md" | "lg" | "xl";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const markSizes = {
  sm: 28,
  md: 42,
  lg: 76,
  xl: 132,
};

const wordSizes = {
  sm: 15,
  md: 21,
  lg: 34,
  xl: 56,
};

export function BrandLogo({
  variant = "lockup",
  tone = "dark",
  size = "md",
  style,
  textStyle,
}: BrandLogoProps) {
  const markSize = markSizes[size];
  const wordSize = wordSizes[size];
  const textColor = tone === "light" ? "#F8FAFC" : "#0F172A";

  return (
    <View style={[styles.container, variant === "mark" ? styles.markOnly : styles.lockup, style]}>
      <Image
        source={arenaMark}
        style={{ width: markSize, height: Math.round(markSize * 0.88) }}
        contentFit="contain"
        transition={120}
        accessible
        accessibilityLabel="ARENA"
      />
      {variant === "lockup" ? (
        <Text
          style={[
            styles.wordmark,
            {
              color: textColor,
              fontSize: wordSize,
              lineHeight: Math.round(wordSize * 1.08),
            },
            textStyle,
          ]}
          numberOfLines={1}
        >
          ARENA
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  lockup: {
    flexDirection: "row",
    gap: 10,
  },
  markOnly: {
    flexDirection: "row",
  },
  wordmark: {
    fontFamily: typography.displaySm.fontFamily,
    fontWeight: "900",
    letterSpacing: 3,
  },
});
