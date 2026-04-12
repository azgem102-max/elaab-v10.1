import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/components/glass/GlassCard";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const SPORTS = [
  {
    label: "كرة القدم",
    icon: "football-outline" as const,
    delay: 0,
    color: "#2E7D32",
    bg: "#E8F5E9",
    border: "#A5D6A7",
  },
  {
    label: "بادل",
    icon: "tennisball-outline" as const,
    delay: 120,
    color: "#0288D1",
    bg: "#E3F2FD",
    border: "#90CAF9",
  },
  {
    label: "تنس",
    icon: "tennisball" as const,
    delay: 240,
    color: "#EF6C00",
    bg: "#FFF3E0",
    border: "#FFCC80",
  },
];

function SportCard({
  sport,
  index,
  isSelected,
  onPress,
  primary,
  textDark,
}: {
  sport: (typeof SPORTS)[0];
  index: number;
  isSelected: boolean;
  onPress: () => void;
  primary: string;
  textDark: string;
}) {
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const selectedScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 60,
        friction: 9,
        delay: 350 + sport.delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: 350 + sport.delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(selectedScale, {
      toValue: isSelected ? 1.08 : 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [isSelected]);

  function handlePressIn() {
    Animated.spring(pressScale, {
      toValue: 0.93,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(pressScale, {
      toValue: 1,
      tension: 200,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }

  const rotation =
    index === 0 ? "-6deg" : index === 2 ? "6deg" : "0deg";
  const marginTop = index === 1 ? -16 : 8;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.sportCard,
          {
            backgroundColor: isSelected ? sport.bg : "#FFFFFF",
            transform: [
              { rotate: rotation },
              { translateY },
              { scale: pressScale },
              { scale: selectedScale },
            ],
            marginTop,
            opacity,
            width: (width - 96) / 3,
            borderWidth: isSelected ? 2 : 1.5,
            borderColor: isSelected ? sport.color : primary + "50",
          },
        ]}
      >
        <View
          style={[
            styles.sportIconWrap,
            {
              borderRadius: 18,
              backgroundColor: isSelected
                ? sport.color + "22"
                : primary + "18",
            },
          ]}
        >
          <Ionicons
            name={sport.icon}
            size={32}
            color={isSelected ? sport.color : primary}
          />
        </View>
        <Text
          style={[
            styles.sportLabel,
            { color: isSelected ? sport.color : textDark },
          ]}
        >
          {sport.label}
        </Text>
        {isSelected && (
          <View
            style={[
              styles.sportSelectedDot,
              { backgroundColor: sport.color },
            ]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isOnboarded } = useApp();
  const colors = useColors();
  const [selectedSport, setSelectedSport] = useState<number | null>(null);

  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const btnTranslateY = useRef(new Animated.Value(40)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOnboarded) {
      router.replace("/(tabs)");
      return;
    }

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          delay: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(btnTranslateY, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(btnOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [isOnboarded]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topPad,
          paddingBottom: botPad + 24,
        },
      ]}
    >
      <View style={styles.bgAccent1} />
      <View style={styles.bgAccent2} />

      <Animated.View
        style={[
          styles.topSection,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={[styles.logoWrap, { backgroundColor: colors.primary }]}>
          <View style={styles.logoInner}>
            <Text style={[styles.logoText, { color: colors.primaryForeground }]}>ع</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.titleSection,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        <Text style={[styles.appName, { color: colors.onSurface }]}>العب</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          مجتمع الرياضة الموثوق في المملكة
        </Text>
        <Animated.Text
          style={[
            styles.description,
            { color: colors.mutedForeground, opacity: taglineOpacity },
          ]}
        >
          منصة لتنظيم المباريات الرياضية مع الأصدقاء
        </Animated.Text>
      </Animated.View>

      <View style={styles.cardsRow}>
        {SPORTS.map((sport, i) => (
          <SportCard
            key={i}
            sport={sport}
            index={i}
            isSelected={selectedSport === i}
            onPress={() =>
              setSelectedSport((prev) => (prev === i ? null : i))
            }
            primary={colors.primary}
            textDark={colors.onSurface}
          />
        ))}
      </View>

      <Animated.View style={[styles.features, { opacity: featuresOpacity }]}>
        {[
          { icon: "shield-checkmark-outline" as const, text: "مؤشر الموثوقية™" },
          { icon: "wallet-outline" as const, text: "دفتر القطة" },
          { icon: "people-outline" as const, text: "مجتمع اللاعبين" },
        ].map((f, i) => (
          <GlassCard key={i} variant="medium" padding="none">
            <View style={styles.featureRow}>
              <Text style={[styles.featureText, { color: colors.onSurface }]}>
                {f.text}
              </Text>
              <View
                style={[
                  styles.featureIcon,
                  { borderRadius: 14, backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons name={f.icon} size={20} color={colors.primary} />
              </View>
            </View>
          </GlassCard>
        ))}
      </Animated.View>

      <Animated.View
        style={[
          styles.startButtonWrap,
          { opacity: btnOpacity, transform: [{ translateY: btnTranslateY }] },
        ]}
      >
        <Pressable
          style={[styles.startButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/phone")}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name="rocket-outline"
              size={20}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.startButtonText}>ابدأ الآن</Text>
          </View>
          <View style={[styles.startArrow, { backgroundColor: colors.accent }]}>
            <Ionicons name="chevron-back-outline" size={20} color={colors.accentForeground} />
          </View>
        </Pressable>
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  bgAccent1: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(44, 84, 232, 0.06)",
  },
  bgAccent2: {
    position: "absolute",
    bottom: 60,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(193, 244, 34, 0.08)",
  },
  topSection: { alignItems: "center", marginTop: 16 },
  titleSection: { alignItems: "center", gap: 4 },
  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0px 8px 32px rgba(44,84,232,0.35)" },
      default: {
        shadowColor: "#2C54E8",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 12,
      },
    }),
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 38, fontFamily: "Cairo_900Black" },
  appName: {
    fontSize: 76,
    fontFamily: "Cairo_900Black",
    letterSpacing: -2,
    lineHeight: 90,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  description: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 2,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sportCard: {
    paddingVertical: 26,
    borderRadius: 26,
    alignItems: "center",
    gap: 10,
    ...Platform.select({
      web: { boxShadow: "0px 2px 12px rgba(44, 84, 232, 0.10)" },
      default: {
        shadowColor: "#2C54E8",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  sportIconWrap: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  sportLabel: { fontSize: 11, fontFamily: "Cairo_700Bold", textAlign: "center" },
  sportSelectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -4,
  },
  features: { width: "100%", gap: 10 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    lineHeight: 24,
  },
  startButtonWrap: { width: "100%", gap: 12, alignItems: "center" },
  startButton: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    ...Platform.select({
      web: { boxShadow: "0px 4px 24px rgba(44,84,232,0.30)" },
      default: {
        shadowColor: "#2C54E8",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  startButtonText: { fontSize: 18, fontFamily: "Cairo_700Bold", color: "#fff" },
  startArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
