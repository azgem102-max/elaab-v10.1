import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  I18nManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, Locale } from "@/i18n";
import { typography } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { BrandLogo } from "@/components/BrandLogo";

const { width, height } = Dimensions.get("window");

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { setLanguage } = useTranslation();
  const [selected, setSelected] = useState<Locale | null>(null);

  // Animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(-20)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsY = useRef(new Animated.Value(30)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(titleY, {
          toValue: 0,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(cardsY, {
          toValue: 0,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(btnY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  async function handleContinue() {
    if (!selected) return;

    if (Platform.OS === 'web') {
      const currentRtl = I18nManager.isRTL;
      const nextRtl = selected === 'ar';
      
      if (currentRtl !== nextRtl) {
        // Safe redirect to root before reloading to apply RTL changes
        import("@react-native-async-storage/async-storage").then(async ({ default: AsyncStorage }) => {
          await AsyncStorage.setItem("@elab_language", selected);
          // Set direction before redirecting to avoid double-reload inside LanguageProvider
          import("react-native").then(({ I18nManager }) => {
            I18nManager.allowRTL(nextRtl);
            I18nManager.forceRTL(nextRtl);
            window.location.href = "/";
          });
        });
        return;
      }
    }

    await setLanguage(selected);
    router.replace("/");
  }

  const LANGUAGES: { key: Locale; label: string; nativeLabel: string; flag: string; dir: string }[] = [
    { key: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦", dir: "RTL" },
    { key: "en", label: "English", nativeLabel: "English", flag: "🇬🇧", dir: "LTR" },
  ];

  return (
    <View style={[styles.container]}>
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background }]}
      />

      {/* Decorative circles */}
      <View style={[styles.decorCircle1, { backgroundColor: colors.accent + "15" }]} />
      <View style={[styles.decorCircle2, { backgroundColor: colors.primary + "10" }]} />

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoWrap,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <View style={[styles.logoBg, { backgroundColor: "#101719" }]}>
            <BrandLogo variant="mark" tone="light" size="lg" />
          </View>
        </Animated.View>

        {/* Title & Subtitle */}
        <Animated.View
          style={[
            styles.titleWrap,
            { opacity: titleOpacity, transform: [{ translateY: titleY }] },
          ]}
        >
          <Text style={[styles.title, { color: colors.onSurface }]}>Choose Language</Text>
          <Text style={[styles.titleAr, { color: colors.onSurface }]}>اختر اللغة</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            You can change this later in settings
          </Text>
          <Text style={[styles.subtitleAr, { color: colors.mutedForeground }]}>يمكن تغييرها لاحقاً من الإعدادات</Text>
        </Animated.View>

        {/* Language Cards */}
        <Animated.View
          style={[
            styles.cardsWrap,
            { opacity: cardsOpacity, transform: [{ translateY: cardsY }] },
          ]}
        >
          {LANGUAGES.map((lang) => {
            const isSelected = selected === lang.key;
            return (
              <Pressable
                key={lang.key}
                style={[
                  styles.langCard,
                  {
                    backgroundColor: isSelected
                      ? colors.surface
                      : colors.surfaceContainerLow,
                    borderColor: isSelected
                      ? colors.accent
                      : colors.border,
                    borderWidth: isSelected ? 2.5 : 1.5,
                    ...(isSelected ? (
                      Platform.OS === "web"
                        ? { boxShadow: `0px 4px 24px ${colors.accent}40` }
                        : {
                            shadowColor: colors.accent,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 12,
                            elevation: 8,
                          }
                    ) : {}),
                  },
                ]}
                onPress={() => setSelected(lang.key)}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <View style={styles.langTextWrap}>
                  <Text
                    style={[
                      styles.langNative,
                      { color: isSelected ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {lang.nativeLabel}
                  </Text>
                  {lang.key === "ar" && (
                    <Text
                      style={[
                        styles.langSecondary,
                        {
                          color: isSelected
                            ? colors.mutedForeground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {lang.label}
                    </Text>
                  )}
                </View>
                {isSelected && (
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Continue Button */}
        <Animated.View
          style={[
            styles.btnWrap,
            { opacity: btnOpacity, transform: [{ translateY: btnY }] },
          ]}
        >
          <Pressable
            style={[
              styles.continueBtn,
              {
                backgroundColor: selected ? colors.accent : colors.surfaceContainerHigh,
                opacity: selected ? 1 : 0.5,
              },
            ]}
            disabled={!selected}
            onPress={handleContinue}
          >
            <Text
              style={[
                styles.continueBtnText,
                { color: selected ? colors.accentForeground : colors.mutedForeground },
              ]}
            >
              {selected === "ar" ? "متابعة" : selected === "en" ? "Continue" : "Continue / متابعة"}
            </Text>
            <Ionicons
              name={selected === "ar" ? "arrow-back" : "arrow-forward"}
              size={18}
              color={selected ? colors.accentForeground : colors.mutedForeground}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  decorCircle1: {
    position: "absolute",
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    top: -width * 0.2,
    right: -width * 0.2,
  },
  decorCircle2: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    bottom: -width * 0.1,
    left: -width * 0.2,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 32,
  },
  logoWrap: {
    alignItems: "center",
  },
  logoBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0px 8px 32px rgba(0,0,0,0.15)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 12,
      },
    }),
  },
  titleWrap: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontFamily: typography.displaySm.fontFamily,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  titleAr: {
    fontSize: 26,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "center",
    marginTop: -4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    textAlign: "center",
    marginTop: 8,
  },
  subtitleAr: {
    fontSize: 13,
    fontFamily: typography.bodySm.fontFamily,
    textAlign: "center",
  },
  cardsWrap: {
    width: "100%",
    gap: 14,
  },
  langCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: 20,
  },
  flag: {
    fontSize: 36,
  },
  langTextWrap: {
    flex: 1,
    gap: 2,
  },
  langNative: {
    fontSize: 22,
    fontFamily: typography.headlineSm.fontFamily,
    lineHeight: 32,
  },
  langSecondary: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnWrap: {
    width: "100%",
    paddingTop: 8,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 28,
  },
  continueBtnText: {
    fontSize: 17,
    fontFamily: typography.headlineSm.fontFamily,
  },
});
