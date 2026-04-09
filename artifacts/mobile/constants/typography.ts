import { Platform, TextStyle } from "react-native";

const BASE_LINE_HEIGHT_MULTIPLIER = 1.2;

function lineHeight(fontSize: number): number {
  return Math.round(fontSize * BASE_LINE_HEIGHT_MULTIPLIER * 10) / 10;
}

const fontFamily = Platform.select({
  ios: "Cairo_400Regular",
  android: "Cairo_400Regular",
  default: "Cairo_400Regular, sans-serif",
});

const fontFamilySemiBold = Platform.select({
  ios: "Cairo_600SemiBold",
  android: "Cairo_600SemiBold",
  default: "Cairo_600SemiBold, sans-serif",
});

const fontFamilyBold = Platform.select({
  ios: "Cairo_700Bold",
  android: "Cairo_700Bold",
  default: "Cairo_700Bold, sans-serif",
});

const fontFamilyBlack = Platform.select({
  ios: "Cairo_900Black",
  android: "Cairo_900Black",
  default: "Cairo_900Black, sans-serif",
});

export const typography = {
  displayLg: {
    fontFamily: fontFamilyBlack,
    fontSize: 36,
    lineHeight: lineHeight(36),
    letterSpacing: -0.5,
    writingDirection: "rtl",
  } as TextStyle,

  displayMd: {
    fontFamily: fontFamilyBlack,
    fontSize: 28,
    lineHeight: lineHeight(28),
    letterSpacing: -0.25,
    writingDirection: "rtl",
  } as TextStyle,

  displaySm: {
    fontFamily: fontFamilyBlack,
    fontSize: 24,
    lineHeight: lineHeight(24),
    letterSpacing: -0.1,
    writingDirection: "rtl",
  } as TextStyle,

  headline: {
    fontFamily: fontFamilyBold,
    fontSize: 24,
    lineHeight: lineHeight(24),
    letterSpacing: 0,
    writingDirection: "rtl",
  } as TextStyle,

  headlineSm: {
    fontFamily: fontFamilyBold,
    fontSize: 20,
    lineHeight: lineHeight(20),
    letterSpacing: 0,
    writingDirection: "rtl",
  } as TextStyle,

  bodyLg: {
    fontFamily: fontFamilySemiBold,
    fontSize: 16,
    lineHeight: lineHeight(16),
    letterSpacing: 0,
    writingDirection: "rtl",
  } as TextStyle,

  body: {
    fontFamily: fontFamily,
    fontSize: 15,
    lineHeight: lineHeight(15),
    letterSpacing: 0,
    writingDirection: "rtl",
  } as TextStyle,

  bodySm: {
    fontFamily: fontFamily,
    fontSize: 13,
    lineHeight: lineHeight(13),
    letterSpacing: 0,
    writingDirection: "rtl",
  } as TextStyle,

  label: {
    fontFamily: fontFamilySemiBold,
    fontSize: 12,
    lineHeight: lineHeight(12),
    letterSpacing: 0.2,
    writingDirection: "rtl",
  } as TextStyle,

  labelSm: {
    fontFamily: fontFamilySemiBold,
    fontSize: 10,
    lineHeight: lineHeight(10),
    letterSpacing: 0.4,
    writingDirection: "rtl",
  } as TextStyle,
};

export type TypographyVariant = keyof typeof typography;
