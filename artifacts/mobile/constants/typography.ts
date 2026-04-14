import { Platform, TextStyle } from "react-native";
import type { Locale } from "@/i18n";

const BASE_LINE_HEIGHT_MULTIPLIER = 1.2;

function lineHeight(fontSize: number): number {
  return Math.round(fontSize * BASE_LINE_HEIGHT_MULTIPLIER * 10) / 10;
}

// === Arabic Fonts (Visual Silence Luxury Identity) ===
const tajawalRegular = Platform.select({
  ios: "Tajawal_400Regular",
  android: "Tajawal_400Regular",
  default: "Tajawal_400Regular, sans-serif",
});

const tajawalMedium = Platform.select({
  ios: "Tajawal_500Medium",
  android: "Tajawal_500Medium",
  default: "Tajawal_500Medium, sans-serif",
});

const alexandriaBold = Platform.select({
  ios: "Alexandria_700Bold",
  android: "Alexandria_700Bold",
  default: "Alexandria_700Bold, sans-serif",
});

const alexandriaBlack = Platform.select({
  ios: "Alexandria_900Black",
  android: "Alexandria_900Black",
  default: "Alexandria_900Black, sans-serif",
});

const ibmPlexRegular = Platform.select({
  ios: "IBMPlexSansArabic_400Regular",
  android: "IBMPlexSansArabic_400Regular",
  default: "IBMPlexSansArabic_400Regular, sans-serif",
});

const ibmPlexSemiBold = Platform.select({
  ios: "IBMPlexSansArabic_600SemiBold",
  android: "IBMPlexSansArabic_600SemiBold",
  default: "IBMPlexSansArabic_600SemiBold, sans-serif",
});

// === English Fonts (Manrope & Inter) ===
const interRegular = Platform.select({
  ios: "Inter_400Regular",
  android: "Inter_400Regular",
  default: "Inter_400Regular, sans-serif",
});

const interSemiBold = Platform.select({
  ios: "Inter_600SemiBold",
  android: "Inter_600SemiBold",
  default: "Inter_600SemiBold, sans-serif",
});

const manropeRegular = Platform.select({
  ios: "Manrope_400Regular",
  android: "Manrope_400Regular",
  default: "Manrope_400Regular, sans-serif",
});

const manropeSemiBold = Platform.select({
  ios: "Manrope_600SemiBold",
  android: "Manrope_600SemiBold",
  default: "Manrope_600SemiBold, sans-serif",
});

const manropeBold = Platform.select({
  ios: "Manrope_700Bold",
  android: "Manrope_700Bold",
  default: "Manrope_700Bold, sans-serif",
});

const manropeExtraBold = Platform.select({
  ios: "Manrope_800ExtraBold",
  android: "Manrope_800ExtraBold",
  default: "Manrope_800ExtraBold, sans-serif",
});

// === Font Resolution ===
function getFonts(locale: Locale) {
  if (locale === "en") {
    return {
      regular: manropeRegular,
      semiBold: manropeSemiBold,
      bold: manropeBold,
      black: manropeExtraBold,
      labelRegular: interRegular,
      labelSemiBold: interSemiBold,
    };
  }
  return {
    regular: tajawalRegular,
    semiBold: tajawalMedium,
    bold: alexandriaBold,
    black: alexandriaBlack,
    labelRegular: ibmPlexRegular,
    labelSemiBold: ibmPlexSemiBold,
  };
}

function getWritingDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

function getTextAlign(locale: Locale): "right" | "left" {
  return locale === "ar" ? "right" : "left";
}

// === Dynamic Typography Generator ===
export function getTypography(locale: Locale) {
  const fonts = getFonts(locale);
  const direction = getWritingDirection(locale);

  return {
    displayLg: {
      fontFamily: fonts.black,
      fontSize: 36,
      lineHeight: lineHeight(36),
      letterSpacing: -0.5,
      writingDirection: direction,
    } as TextStyle,

    displayMd: {
      fontFamily: fonts.black,
      fontSize: 28,
      lineHeight: lineHeight(28),
      letterSpacing: -0.25,
      writingDirection: direction,
    } as TextStyle,

    displaySm: {
      fontFamily: fonts.black,
      fontSize: 24,
      lineHeight: lineHeight(24),
      letterSpacing: -0.1,
      writingDirection: direction,
    } as TextStyle,

    headline: {
      fontFamily: fonts.bold,
      fontSize: 24,
      lineHeight: lineHeight(24),
      letterSpacing: 0,
      writingDirection: direction,
    } as TextStyle,

    headlineSm: {
      fontFamily: fonts.bold,
      fontSize: 20,
      lineHeight: lineHeight(20),
      letterSpacing: 0,
      writingDirection: direction,
    } as TextStyle,

    bodyLg: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      lineHeight: lineHeight(16),
      letterSpacing: 0,
      writingDirection: direction,
    } as TextStyle,

    body: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: lineHeight(15),
      letterSpacing: 0,
      writingDirection: direction,
    } as TextStyle,

    bodySm: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: lineHeight(13),
      letterSpacing: 0,
      writingDirection: direction,
    } as TextStyle,

    label: {
      fontFamily: fonts.labelSemiBold,
      fontSize: 12,
      lineHeight: lineHeight(12),
      letterSpacing: 0.2,
      writingDirection: direction,
    } as TextStyle,

    labelSm: {
      fontFamily: fonts.labelSemiBold,
      fontSize: 10,
      lineHeight: lineHeight(10),
      letterSpacing: 0.4,
      writingDirection: direction,
    } as TextStyle,
  };
}

// === Backward Compatibility: Default typography (Arabic) ===
export const typography = getTypography("ar");

export type TypographyVariant = keyof ReturnType<typeof getTypography>;

// === Helper functions for direct font access ===
export function getFontFamily(locale: Locale, weight: "regular" | "semiBold" | "bold" | "black" = "regular"): string {
  const fonts = getFonts(locale);
  return fonts[weight] ?? fonts.regular;
}

export { getTextAlign, getWritingDirection };
