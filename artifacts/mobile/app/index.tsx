import { BrandLogo } from "@/components/BrandLogo";
import { GlassCard } from "@/components/glass/GlassCard";
import { useApp } from "@/context/AppContext";
import { hasChosenLanguage, useTranslation } from "@/i18n";
import { saveToken } from "@/services/api";
import { typography } from "@/constants/typography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BRAND_DARK = "#101719";
const BRAND_DARKER = "#0F172A";
const BRAND_GREEN = "#15803D";
const BRAND_GREEN_BRIGHT = "#22C55E";

const SPORT_META = [
  {
    key: "football",
    icon: "football-outline" as const,
    color: "#15803D",
    bg: "rgba(21,128,61,0.18)",
  },
  {
    key: "padel",
    icon: "tennisball-outline" as const,
    color: "#0288D1",
    bg: "rgba(2,136,209,0.16)",
  },
  {
    key: "tennis",
    icon: "tennisball" as const,
    color: "#D97706",
    bg: "rgba(217,119,6,0.16)",
  },
] as const;

function ShowcaseStat({
  icon,
  title,
  body,
  isRTL,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  isRTL: boolean;
}) {
  return (
    <GlassCard
      variant="medium"
      padding="none"
      style={styles.featureCard}
    >
      <View style={[styles.featureInner, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
        <View style={styles.featureIcon}>
          <Ionicons name={icon} size={18} color={BRAND_GREEN_BRIGHT} />
        </View>
        <View style={[styles.featureCopy, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.featureTitle, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.featureBody, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
            {body}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isOnboarded, completeOnboarding } = useApp();
  const { t, isRTL, isLanguageLoaded } = useTranslation();
  const [selectedSport, setSelectedSport] = useState<(typeof SPORT_META)[number]["key"]>("football");

  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const heroY = useRef(new Animated.Value(18)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const cardsY = useRef(new Animated.Value(26)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const ctaY = useRef(new Animated.Value(24)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLanguageLoaded) return;

    hasChosenLanguage().then((chosen) => {
      if (!chosen) {
        router.replace("/language");
        return;
      }
      if (isOnboarded) {
        router.replace("/(tabs)");
        return;
      }

      Animated.sequence([
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 80,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(heroY, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(heroOpacity, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(cardsY, {
            toValue: 0,
            duration: 500,
            delay: 80,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(cardsOpacity, {
            toValue: 1,
            duration: 500,
            delay: 80,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ctaY, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(ctaOpacity, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, [isLanguageLoaded, isOnboarded]);

  const features = useMemo(
    () => [
      {
        icon: "shield-checkmark-outline" as const,
        title: t("welcome.feature1Title"),
        body: t("welcome.feature1Desc"),
      },
      {
        icon: "people-outline" as const,
        title: t("welcome.feature2Title"),
        body: t("welcome.feature2Desc"),
      },
      {
        icon: "wallet-outline" as const,
        title: t("welcome.feature3Title"),
        body: t("welcome.feature3Desc"),
      },
    ],
    [t]
  );

  const horizontalPadding = width < 370 ? 18 : 24;
  const markSize = width < 370 ? "lg" : "xl";

  async function handleDevBypass() {
    const phone = "+966500000000";
    await saveToken("dev_token", "dev_user_id");
    await completeOnboarding({
      id: "dev_user_id",
      nickname: "Dev Tester",
      phone,
      sports: ["football", "padel", "tennis"],
      sportProfiles: {},
      matchesPlayed: 0,
      reliability: 100,
    });
    router.replace("/(tabs)");
  }

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" style="light" />
      <LinearGradient
        colors={[BRAND_DARKER, BRAND_DARK, "#07110D"]}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.fieldLineTop} />
      <View style={styles.fieldLineBottom} />
      <View style={styles.fieldStripe} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: (Platform.OS === "web" ? 48 : insets.top) + 34,
            paddingBottom: (Platform.OS === "web" ? 28 : insets.bottom) + 24,
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.brandStage,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.brandHalo}>
            <BrandLogo variant="mark" tone="light" size={markSize} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.heroCopy,
            {
              opacity: heroOpacity,
              transform: [{ translateY: heroY }],
            },
          ]}
        >
          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText} numberOfLines={1}>
              {t("welcome.arenaPill")}
            </Text>
          </View>

          <Text style={styles.appName}>{t("welcome.appName")}</Text>
          <Text style={styles.tagline}>{t("welcome.tagline")}</Text>
          <Text style={styles.subline}>{t("welcome.brandSubline")}</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.sportsRow,
            {
              opacity: cardsOpacity,
              transform: [{ translateY: cardsY }],
            },
          ]}
        >
          {SPORT_META.map((sport) => {
            const selected = selectedSport === sport.key;
            return (
              <Pressable
                key={sport.key}
                onPress={() => setSelectedSport(sport.key)}
                style={({ pressed }) => [
                  styles.sportCard,
                  {
                    backgroundColor: selected ? sport.bg : "rgba(255,255,255,0.07)",
                    borderColor: selected ? `${sport.color}88` : "rgba(255,255,255,0.10)",
                    transform: [{ scale: pressed ? 0.96 : selected ? 1.03 : 1 }],
                  },
                ]}
              >
                <View style={[styles.sportIcon, { backgroundColor: sport.bg }]}>
                  <Ionicons name={sport.icon} size={22} color={sport.color} />
                </View>
                <Text style={styles.sportLabel} numberOfLines={1}>
                  {t(`sports.${sport.key}`)}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        <Animated.View
          style={[
            styles.featureGrid,
            {
              opacity: cardsOpacity,
              transform: [{ translateY: cardsY }],
            },
          ]}
        >
          {features.map((feature) => (
            <ShowcaseStat key={feature.title} {...feature} isRTL={isRTL} />
          ))}
        </Animated.View>

        <Animated.View
          style={[
            styles.footer,
            {
              opacity: ctaOpacity,
              transform: [{ translateY: ctaY }],
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.cta,
              { transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            onPress={() => router.push("/phone")}
          >
            <LinearGradient
              colors={[BRAND_GREEN_BRIGHT, BRAND_GREEN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.ctaGradient, { flexDirection: isRTL ? "row-reverse" : "row" }]}
            >
              <Text style={styles.ctaText}>{t("welcome.startNow")}</Text>
              <View style={styles.ctaIcon}>
                <Ionicons
                  name={isRTL ? "chevron-back" : "chevron-forward"}
                  size={18}
                  color="#0B1B12"
                />
              </View>
            </LinearGradient>
          </Pressable>

          {__DEV__ ? (
            <Pressable style={styles.devButton} onPress={handleDevBypass}>
              <Text style={styles.devButtonText}>{t("welcome.devBypass")}</Text>
            </Pressable>
          ) : null}

          <Text style={styles.disclaimer}>{t("welcome.disclaimer")}</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND_DARK,
  },
  content: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: 22,
  },
  fieldLineTop: {
    position: "absolute",
    top: 86,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  fieldLineBottom: {
    position: "absolute",
    bottom: 142,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  fieldStripe: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  brandStage: {
    alignItems: "center",
    paddingTop: 8,
  },
  brandHalo: {
    width: 192,
    height: 192,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    ...Platform.select({
      web: { boxShadow: "0px 24px 80px rgba(34,197,94,0.20)" },
      default: {
        shadowColor: BRAND_GREEN_BRIGHT,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.18,
        shadowRadius: 40,
        elevation: 10,
      },
    }),
  },
  heroCopy: {
    alignItems: "center",
    gap: 10,
  },
  pill: {
    maxWidth: "100%",
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BRAND_GREEN_BRIGHT,
  },
  pillText: {
    color: "rgba(248,250,252,0.74)",
    fontSize: 12,
    fontFamily: typography.bodyLg.fontFamily,
    textAlign: "center",
    flexShrink: 1,
  },
  appName: {
    color: "#F8FAFC",
    fontSize: 58,
    lineHeight: 64,
    fontFamily: typography.displaySm.fontFamily,
    letterSpacing: 0,
    textAlign: "center",
  },
  tagline: {
    color: "#D7FBE3",
    fontSize: 18,
    lineHeight: 28,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "center",
  },
  subline: {
    maxWidth: 330,
    color: "rgba(226,232,240,0.72)",
    fontSize: 13,
    lineHeight: 21,
    fontFamily: typography.body.fontFamily,
    textAlign: "center",
  },
  sportsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  sportCard: {
    flex: 1,
    minHeight: 106,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  sportIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sportLabel: {
    color: "#F8FAFC",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "center",
  },
  featureGrid: {
    gap: 10,
  },
  featureCard: {
    backgroundColor: "rgba(255,255,255,0.075)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  featureInner: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(34,197,94,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureCopy: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: typography.headlineSm.fontFamily,
  },
  featureBody: {
    color: "rgba(226,232,240,0.66)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.body.fontFamily,
  },
  footer: {
    gap: 12,
    alignItems: "center",
  },
  cta: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0px 18px 48px rgba(34,197,94,0.24)" },
      default: {
        shadowColor: BRAND_GREEN_BRIGHT,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.24,
        shadowRadius: 28,
        elevation: 8,
      },
    }),
  },
  ctaGradient: {
    minHeight: 60,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 26,
    fontFamily: typography.headlineSm.fontFamily,
  },
  ctaIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  devButton: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  devButtonText: {
    color: "rgba(248,250,252,0.72)",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.bodyLg.fontFamily,
  },
  disclaimer: {
    color: "rgba(226,232,240,0.52)",
    fontSize: 11,
    lineHeight: 18,
    fontFamily: typography.body.fontFamily,
    textAlign: "center",
  },
});
