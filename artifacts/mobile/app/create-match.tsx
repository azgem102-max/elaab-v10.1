import { useApp, SportType } from "@/context/AppContext";
import { getSportIcon } from "@/components/icons/SportIcons";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n";
import { typography } from "@/constants/typography";
import { SportGradientButton } from "@/components/SportGradientButton";
import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { LiquidProgressBar } from "@/components/glass/LiquidProgressBar";
import { DatePickerField } from "@/components/DatePickerField";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  I18nManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import themeColors from "@/constants/colors";
import { getSportTheme } from "@/constants/sportTheme";

const SCREEN_WIDTH = Dimensions.get("window").width;

const getSportOptions = (t: any) => [
  { key: "football" as SportType, label: t("positions.sports.football"), color: getSportTheme("football").primary, lightBg: getSportTheme("football").pillBackground },
  { key: "padel" as SportType, label: t("positions.sports.padel"), color: getSportTheme("padel").primary, lightBg: getSportTheme("padel").pillBackground },
  { key: "tennis" as SportType, label: t("positions.sports.tennis"), color: getSportTheme("tennis").primary, lightBg: getSportTheme("tennis").pillBackground },
];

const SPORT_COLOR_MAP: Record<SportType, string> = {
  football: getSportTheme("football").primary,
  padel: getSportTheme("padel").primary,
  tennis: getSportTheme("tennis").primary,
};


const getSportLabels = (t: any): Record<string, string> => ({
  football: t("positions.sports.football"),
  padel: t("positions.sports.padel"),
  tennis: t("positions.sports.tennis"),
});

const VENUES = ["ملعب الأمير محمد", "أكاديمية بادل الرياض", "نادي التنس الملكي", "ملعب الهلال الصغير", "مركز الشباب الرياضي"];
const TIMES = ["07:00", "08:00", "09:00", "10:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

function todayAtMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const getStepLabels = (t: any) => [
  t("createMatch.steps.privacy"),
  t("createMatch.steps.sport"),
  t("createMatch.steps.name"),
  t("createMatch.steps.time"),
  t("createMatch.steps.location"),
  t("createMatch.steps.settings"),
  t("createMatch.steps.review")
];
const TOTAL_STEPS = 7;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0");
}

function interpolateColor(from: string, to: string, progress: number): string {
  const f = hexToRgb(from);
  const t = hexToRgb(to);
  const r = Math.round(f.r + (t.r - f.r) * progress);
  const g = Math.round(f.g + (t.g - f.g) * progress);
  const b = Math.round(f.b + (t.b - f.b) * progress);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function withAlpha(color: string, alpha: number): string {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

function AnimatedCheckmark({ visible, color, size = 24 }: { visible: boolean; color: string; size?: number }) {
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 280, mass: 0.6 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <Ionicons name="checkmark-circle" size={size} color={color} />
    </Animated.View>
  );
}

interface SoftInputProps {
  value: string;
  onChangeText: (v: string) => void;
  onBlurValidate?: () => void;
  onChangeValidate?: (v: string) => void;
  placeholder: string;
  accentColor: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "url";
  error?: string;
  label: string;
  hint?: string;
  colors: ReturnType<typeof useColors>;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
}

function SoftInput({
  value, onChangeText, onBlurValidate, onChangeValidate,
  placeholder, accentColor, multiline, keyboardType, error, label, hint,
  colors, autoCapitalize, autoCorrect,
}: SoftInputProps) {
  const [focused, setFocused] = useState(false);

  const baseBg = colors.surfaceContainerLow;
  const focusBg = colors.surfaceContainerHigh;
  const errorBg = withAlpha(colors.destructive, 0.05);

  return (
    <View style={{ gap: 6 }}>
      <Text style={[softStyles.label, { color: colors.onSurface }]}>{label}</Text>
      <View
        style={[
          softStyles.inputWrap,
          { 
            backgroundColor: error ? errorBg : (focused ? focusBg : baseBg),
            borderWidth: 0,
          },
        ]}
      >
        <TextInput
          style={[
            softStyles.input,
            { color: colors.onSurface, ...typography.body },
            multiline && { minHeight: 80, textAlignVertical: "top" },
          ]}
          value={value}
          onChangeText={(v) => {
            onChangeText(v);
            onChangeValidate?.(v);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          textAlign="right"
          multiline={multiline}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={autoCapitalize ?? "sentences"}
          autoCorrect={autoCorrect ?? true}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlurValidate?.();
          }}
        />
      </View>
      {error ? (
        <Text style={[softStyles.errorText, { color: colors.destructive }]}>{error}</Text>
      ) : hint ? (
        <Text style={[softStyles.hintText, { color: colors.mutedForeground }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const softStyles = StyleSheet.create({
  label: { fontSize: 14, fontFamily: typography.headlineSm.fontFamily, textAlign: "right" },
  inputWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  errorText: { fontSize: 12, fontFamily: typography.body.fontFamily, textAlign: "right" },
  hintText: { fontSize: 12, fontFamily: typography.body.fontFamily, textAlign: "right", opacity: 0.8 },
});

export default function CreateMatchScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createMatch, user, groups } = useApp();
  
  const SPORT_OPTIONS = getSportOptions(t);
  const SPORT_LABELS = getSportLabels(t);
  const STEP_LABELS = getStepLabels(t);

  const params = useLocalSearchParams<{ groupId?: string; venue?: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const initialGroupId = params.groupId ?? undefined;
  const initialVenue = params.venue ?? "";

  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [isPublic, setIsPublic] = useState(!initialGroupId);
  const [sport, setSport] = useState<SportType | null>(null);
  const [prevSport, setPrevSport] = useState<SportType | "brand">("brand");
  const sportTransition = useRef(new Animated.Value(1)).current;
  const [animatedAccent, setAnimatedAccent] = useState(colors.primary);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(todayAtMidnight);
  const [selectedTime, setSelectedTime] = useState("20:00");
  const [venue, setVenue] = useState(initialVenue);
  const [venueUrl, setVenueUrl] = useState("");
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [matchFormat, setMatchFormat] = useState<"single" | "double">("double");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [totalCost, setTotalCost] = useState("500");
  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "advanced" | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(initialGroupId);
  const [venueUrlError, setVenueUrlError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const sportOpt = sport ? SPORT_OPTIONS.find((s) => s.key === sport)! : { key: "brand", label: t("createMatch.sportPlaceholder"), color: colors.primary, lightBg: colors.surfaceContainerHigh };
  const myGroups = groups.filter((g) => g.isJoined);
  const selectedGroup = myGroups.find((g) => g.id === selectedGroupId);

  const accentColor = animatedAccent;
  const accentBg = (sportOpt as any).lightBg;

  useEffect(() => {
    const fromColor = prevSport === "brand" ? colors.primary : SPORT_COLOR_MAP[prevSport as SportType];
    const toColor = sport ? SPORT_COLOR_MAP[sport] : colors.primary;
    sportTransition.setValue(0);
    const listener = sportTransition.addListener(({ value }) => {
      setAnimatedAccent(interpolateColor(fromColor, toColor, value));
    });
    Animated.timing(sportTransition, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start(() => {
      sportTransition.removeListener(listener);
      setAnimatedAccent(toColor);
    });
    return () => {
      sportTransition.removeListener(listener);
    };
  }, [sport, prevSport]);

  const isPadelOrTennis = sport === "padel" || sport === "tennis";

  function handleSportChange(newSport: SportType) {
    if (newSport === sport) return;
    setPrevSport(sport || "brand");
    setSport(newSport);
    if (newSport === "padel" || newSport === "tennis") {
      setMaxPlayers(matchFormat === "single" ? 2 : 4);
    } else {
      setMaxPlayers(newSport === "football" ? 10 : 4);
    }
    Haptics.selectionAsync();
  }

  function handleFormatChange(format: "single" | "double") {
    setMatchFormat(format);
    setMaxPlayers(format === "single" ? 2 : 4);
    Haptics.selectionAsync();
  }

  function goToStep(next: number) {
    Haptics.selectionAsync();
    const isForward = next > currentStep;
    const startX = isForward ? SCREEN_WIDTH : -SCREEN_WIDTH;
    slideAnim.setValue(startX);
    setCurrentStep(next);
    setErrors({});
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: false,
      damping: 18,
      stiffness: 220,
      mass: 0.7,
    }).start();
  }

  function normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return "https://" + trimmed;
  }

  function isValidUrl(url: string): boolean {
    if (!url.trim()) return true;
    try {
      const parsed = new URL(normalizeUrl(url));
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (currentStep === 1) {
      if (!sport) e.sport = t("createMatch.errors.sportRequired");
    }
    if (currentStep === 2) {
      if (!title.trim()) e.title = t("createMatch.errors.titleRequired");
    }
    if (currentStep === 4) {
      if (!venue.trim()) e.venue = t("createMatch.errors.clubRequired");
      if (!isValidUrl(venueUrl)) {
        setVenueUrlError(t("createMatch.errors.urlInvalid"));
        setErrors(e);
        return false;
      }
      setVenueUrlError("");
    }
    if (currentStep === 5) {
      if (isNaN(Number(totalCost)) || Number(totalCost) < 0) e.cost = t("createMatch.errors.feeInvalid");
    }
    if (currentStep === 6) {
      if (!isPublic && !selectedGroupId) e.group = t("createMatch.errors.groupRequired");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateAll(): boolean {
    const e: Record<string, string> = {};
    if (!sport) e.sport = t("createMatch.errors.sportRequired");
    if (!title.trim()) e.title = t("createMatch.errors.titleRequired");
    if (!venue.trim()) e.venue = t("createMatch.errors.clubRequired");
    if (isNaN(Number(totalCost)) || Number(totalCost) < 0) e.cost = t("createMatch.errors.feeInvalid");
    if (!isPublic && !selectedGroupId) e.group = t("createMatch.errors.groupRequired");
    if (!isValidUrl(venueUrl)) {
      setVenueUrlError(t("createMatch.errors.urlInvalid"));
      setErrors(e);
      return false;
    }
    setVenueUrlError("");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validateStep()) return;
    if (currentStep < TOTAL_STEPS - 1) {
      goToStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    } else {
      router.back();
    }
  }

  async function handleCreate() {
    if (!validateAll() || submitting) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    setSubmitError("");
    const effectiveMaxPlayers = isPadelOrTennis ? (matchFormat === "single" ? 2 : 4) : (sport === "football" ? maxPlayers : 4);
    const totalCostNum = Number(totalCost) || 0;
    const costPerPlayer = effectiveMaxPlayers > 0 ? Math.round((totalCostNum / effectiveMaxPlayers) * 100) / 100 : 0;
    let matchCoords: { lat: number; lng: number } | null = null;
    if (Platform.OS !== "web") {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          matchCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {
        matchCoords = null;
      }
    }
    try {
      const newId = await createMatch({
        title: title.trim(),
        sport: sport!,
        date: selectedDate,
        time: selectedTime,
        venue,
        location: venueUrl.trim() ? normalizeUrl(venueUrl) : undefined,
        maxPlayers: effectiveMaxPlayers,
        cost: costPerPlayer,
        isPublic,
        organizerId: user?.id ?? "",
        organizerName: user?.nickname ?? t("createMatch.unknownLabel"),
        organizerReliability: user?.reliability ?? null,
        status: "upcoming",
        sessionType: "match",
        matchFormat: isPadelOrTennis ? matchFormat : undefined,
        skillLevel: skillLevel ?? undefined,
        description: description.trim() || undefined,
        invitedGroupId: isPublic ? undefined : selectedGroupId,
      }, matchCoords);
      if (newId) {
        router.replace({ pathname: "/match-details", params: { id: newId } });
      } else {
        router.replace("/(tabs)");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("createMatch.errors.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const effectiveMaxPlayers = isPadelOrTennis ? (matchFormat === "single" ? 2 : 4) : (sport === "football" ? maxPlayers : 4);
  
  const previewDateStr = selectedDate
    ? selectedDate.toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" })
    : "";

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: "transparent" }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <GlassScreenHeader style={{ paddingTop: topPad + 8, paddingBottom: 8 }}>
        <View style={styles.navHeader}>
          <Pressable onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }]}>
            <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={22} color={colors.onSurface} />
          </Pressable>
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={[styles.navTitle, { color: colors.onSurface }]}>{t("createMatch.headerTitle")}</Text>
            <Text style={[styles.navStepIndicator, { color: accentColor }]}>
              {STEP_LABELS[currentStep]} · {currentStep + 1}/{TOTAL_STEPS}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </GlassScreenHeader>

      <View style={[styles.sportAccentBar, { backgroundColor: accentColor }]} />

      <View style={[styles.stepperContainer, { paddingHorizontal: 16, marginBottom: 8 }]}>
        <View style={[styles.stepProgressTrack, { backgroundColor: colors.mutedForeground + "20" }]}>
          <Animated.View
            style={[
              styles.stepProgressFill,
              {
                backgroundColor: accentColor,
                width: `${((currentStep) / (TOTAL_STEPS - 1)) * 100}%`,
              },
            ]}
          />
          {STEP_LABELS.map((label, i) => {
            const isDone = i < currentStep;
            const isActive = i === currentStep;
            return (
              <View
                key={i}
                style={[
                  styles.stepNode,
                  {
                    left: `${(i / (TOTAL_STEPS - 1)) * 100}%`,
                    backgroundColor: isDone || isActive ? accentColor : colors.surfaceContainerHigh,
                    borderColor: isDone || isActive ? accentColor : colors.mutedForeground + "40",
                    transform: [{ scale: isActive ? 1.25 : 1 }],
                  },
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={9} color="#fff" />
                ) : (
                  <Text style={[styles.stepNodeText, { color: isActive ? "#fff" : colors.mutedForeground }]}>{i + 1}</Text>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.stepLabelsRow}>
          {STEP_LABELS.map((label, i) => (
            <Text
              key={i}
              style={[
                styles.stepLabel,
                {
                  color: i === currentStep ? accentColor : i < currentStep ? accentColor + "CC" : colors.mutedForeground + "80",
                  fontFamily: i === currentStep ? "Cairo_700Bold" : "Cairo_400Regular",
                },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>
      </View>

      <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]} showsVerticalScrollIndicator={false}>

          {/* Step 0: الخصوصية */}
          {currentStep === 0 && (
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleAccent, { backgroundColor: accentColor }]} />
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>{t("createMatch.privacy")}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{t("createMatch.privacyDesc")}</Text>

              <View style={{ gap: 14, marginTop: 16 }}>
                <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>{t("createMatch.privacyLvl")}</Text>
                <Pressable
                  style={[
                    styles.typeCard,
                    isPublic
                      ? { backgroundColor: sportOpt.lightBg, borderWidth: 0 }
                      : { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 },
                  ]}
                  onPress={() => { setIsPublic(true); setSelectedGroupId(undefined); Haptics.selectionAsync(); }}
                >
                  <View style={[styles.typeCardIcon, { backgroundColor: isPublic ? accentColor : colors.surfaceContainerHigh }]}>
                    <Ionicons name="globe-outline" size={28} color={isPublic ? "#fff" : colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.typeCardInfo}>
                    <Text style={[styles.typeCardTitle, { color: isPublic ? accentColor : colors.onSurface }]}>{t("createMatch.public")}</Text>
                    <Text style={[styles.typeCardDesc, { color: colors.mutedForeground }]}>{t("createMatch.publicDesc")}</Text>
                  </View>
                  <AnimatedCheckmark visible={isPublic} color={accentColor} />
                </Pressable>

                <Pressable
                  style={[
                    styles.typeCard,
                    !isPublic
                      ? { backgroundColor: sportOpt.lightBg, borderWidth: 0 }
                      : { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 },
                  ]}
                  onPress={() => { setIsPublic(false); Haptics.selectionAsync(); }}
                >
                  <View style={[styles.typeCardIcon, { backgroundColor: !isPublic ? accentColor : colors.surfaceContainerHigh }]}>
                    <Ionicons name="lock-closed-outline" size={28} color={!isPublic ? "#fff" : colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.typeCardInfo}>
                    <Text style={[styles.typeCardTitle, { color: !isPublic ? accentColor : colors.onSurface }]}>{t("createMatch.private")}</Text>
                    <Text style={[styles.typeCardDesc, { color: colors.mutedForeground }]}>{t("createMatch.privateDesc")}</Text>
                  </View>
                  <AnimatedCheckmark visible={!isPublic} color={accentColor} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Step 1: الرياضة */}
          {currentStep === 1 && (
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleAccent, { backgroundColor: accentColor }]} />
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>{t("createMatch.chooseSport")}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{t("createMatch.chooseSportDesc")}</Text>

              <View style={{ gap: 14, marginTop: 8 }}>
                {SPORT_OPTIONS.map((s) => {
                  const OptionSportIcon = getSportIcon(s.key as SportType);
                  return (
                  <Pressable
                    key={s.key}
                    style={[
                      styles.sportCard,
                      sport === s.key
                        ? { backgroundColor: s.lightBg, borderWidth: 0 }
                        : { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 },
                    ]}
                    onPress={() => handleSportChange(s.key as SportType)}
                  >
                    <View style={[styles.sportCardBadge, { backgroundColor: sport === s.key ? s.color : colors.surfaceContainerHigh }]}>
                      <OptionSportIcon color={sport === s.key ? "#fff" : colors.onSurfaceVariant} size={24} />
                    </View>
                    <View style={styles.sportCardInfo}>
                      <Text style={[styles.sportCardTitle, { color: sport === s.key ? s.color : colors.onSurface }]}>{s.label}</Text>
                      <Text style={[styles.sportCardDesc, { color: colors.mutedForeground }]}>
                        {s.key === "football" ? t("createMatch.footballDesc") : t("createMatch.padelTennisDesc")}
                      </Text>
                    </View>
                    <AnimatedCheckmark visible={sport === s.key} color={s.color} />
                  </Pressable>
                  );
                })}
              </View>

              {isPadelOrTennis && (
                <View style={{ gap: 10, marginTop: 16 }}>
                  <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>{t("createMatch.playType")}</Text>
                  <View style={{ gap: 10 }}>
                    <Pressable
                      style={[
                        styles.typeCard,
                        { borderWidth: 1, borderColor: colors.border },
                        matchFormat === "single"
                          ? { backgroundColor: sportOpt.lightBg, borderColor: accentColor }
                          : { backgroundColor: colors.surfaceContainerLow, borderColor: "transparent" },
                      ]}
                      onPress={() => handleFormatChange("single")}
                    >
                      <View style={[styles.typeCardIcon, { backgroundColor: matchFormat === "single" ? accentColor : colors.surfaceContainerHigh }]}>
                        <Ionicons name="person-outline" size={26} color={matchFormat === "single" ? "#fff" : colors.onSurfaceVariant} />
                      </View>
                      <View style={styles.typeCardInfo}>
                        <Text style={[styles.typeCardTitle, { color: matchFormat === "single" ? accentColor : colors.onSurface }]}>{t("createMatch.singleType")}</Text>
                        <Text style={[styles.typeCardDesc, { color: colors.mutedForeground }]}>{t("createMatch.singleTypeDesc")}</Text>
                      </View>
                      <AnimatedCheckmark visible={matchFormat === "single"} color={accentColor} />
                    </Pressable>

                    <Pressable
                      style={[
                        styles.typeCard,
                        { borderWidth: 1, borderColor: colors.border },
                        matchFormat === "double"
                          ? { backgroundColor: sportOpt.lightBg, borderColor: accentColor }
                          : { backgroundColor: colors.surfaceContainerLow, borderColor: "transparent" },
                      ]}
                      onPress={() => handleFormatChange("double")}
                    >
                      <View style={[styles.typeCardIcon, { backgroundColor: matchFormat === "double" ? accentColor : colors.surfaceContainerHigh }]}>
                        <Ionicons name="people-outline" size={26} color={matchFormat === "double" ? "#fff" : colors.onSurfaceVariant} />
                      </View>
                      <View style={styles.typeCardInfo}>
                        <Text style={[styles.typeCardTitle, { color: matchFormat === "double" ? accentColor : colors.onSurface }]}>{t("createMatch.doubleType")}</Text>
                        <Text style={[styles.typeCardDesc, { color: colors.mutedForeground }]}>{t("createMatch.doubleTypeDesc")}</Text>
                      </View>
                      <AnimatedCheckmark visible={matchFormat === "double"} color={accentColor} />
                    </Pressable>
                  </View>
                </View>
              )}
              {errors.sport && (
                <Text style={[softStyles.errorText, { color: colors.destructive, marginTop: 12, textAlign: "center" }]}>{errors.sport}</Text>
              )}
            </View>
          )}

          {/* Step 2: العنوان والوصف */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleAccent, { backgroundColor: accentColor }]} />
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>{t("createMatch.matchName")}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{t("createMatch.matchNameDesc")}</Text>

              <View style={{ gap: 20, marginTop: 8 }}>
                <SoftInput
                  label={t("createMatch.titleLabel")}
                  value={title}
                  onChangeText={setTitle}
                  onChangeValidate={(v) => {
                    if (v.trim()) setErrors((e) => ({ ...e, title: "" }));
                  }}
                  onBlurValidate={() => {
                    if (!title.trim()) setErrors((e) => ({ ...e, title: t("createMatch.errors.titleRequired") }));
                  }}
                  placeholder={
                    sport === "football" ? t("createMatch.footballExample") :
                    sport === "padel" ? t("createMatch.padelExample") :
                    t("createMatch.tennisExample")
                  }
                  accentColor={accentColor}
                  error={errors.title}
                  hint={t("createMatch.titleHint")}
                  colors={colors}
                />

                <SoftInput
                  label={t("createMatch.descLabel")}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("createMatch.descPlaceholder")}
                  accentColor={accentColor}
                  multiline
                  colors={colors}
                />
              </View>
            </View>
          )}

          {/* Step 3: التاريخ والوقت */}
          {currentStep === 3 && (
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleAccent, { backgroundColor: accentColor }]} />
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>{t("createMatch.timing")}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{t("createMatch.timingDesc")}</Text>

              <View style={{ gap: 16, marginTop: 8 }}>
                <View style={[styles.surfaceCard, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }]}>
                  <View style={[styles.surfaceCardHeader, { borderBottomColor: withAlpha(accentColor, 0.12) }]}>
                    <Ionicons name="calendar-outline" size={18} color={accentColor} />
                    <Text style={[styles.surfaceCardTitle, { color: colors.onSurface }]}>{t("createMatch.date")}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
                    <DatePickerField
                      value={selectedDate}
                      onChange={setSelectedDate}
                      accentColor={accentColor}
                    />
                  </View>
                </View>

                <View style={[styles.surfaceCard, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }]}>
                  <View style={[styles.surfaceCardHeader, { borderBottomColor: withAlpha(accentColor, 0.12) }]}>
                    <Ionicons name="time-outline" size={18} color={accentColor} />
                    <Text style={[styles.surfaceCardTitle, { color: colors.onSurface }]}>{t("createMatch.time")}</Text>
                  </View>
                  <View style={styles.timesGrid}>
                    {TIMES.map((t) => (
                      <Pressable
                        key={t}
                        style={[
                          styles.timeChip,
                          selectedTime === t
                            ? { backgroundColor: accentColor }
                            : [{ backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.border }],
                        ]}
                        onPress={() => setSelectedTime(t)}
                      >
                        <Text style={[styles.timeText, { color: selectedTime === t ? "#fff" : colors.onSurfaceVariant }]}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Step 4: الملعب */}
          {currentStep === 4 && (
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleAccent, { backgroundColor: accentColor }]} />
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>{t("createMatch.clubCenter")}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{t("createMatch.clubCenterDesc")}</Text>

              <View style={{ gap: 20, marginTop: 8 }}>
                <View style={{ gap: 6 }}>
                  <Text style={[softStyles.label, { color: colors.onSurface }]}>{t("createMatch.clubCenterName")}</Text>
                  <View style={[
                    softStyles.inputWrap,
                    {
                      backgroundColor: errors.venue ? withAlpha(colors.destructive, 0.03) : colors.surface,
                      borderColor: errors.venue ? colors.destructive : accentColor,
                      borderWidth: 1,
                      borderBottomWidth: errors.venue ? 2 : 1,
                    },
                  ]}>
                    <TextInput
                      style={[softStyles.input, { color: colors.onSurface, fontFamily: typography.bodyLg.fontFamily }]}
                      value={venue}
                      onChangeText={(v) => {
                        setVenue(v);
                        setShowVenueSuggestions(v.length > 0);
                        if (v.trim()) setErrors((e) => ({ ...e, venue: "" }));
                      }}
                      onBlur={() => {
                        if (!venue.trim()) setErrors((e) => ({ ...e, venue: t("createMatch.errors.clubRequired") }));
                        setTimeout(() => setShowVenueSuggestions(false), 200);
                      }}
                      placeholder={t("createMatch.clubCenterPlaceholder")}
                      placeholderTextColor={colors.mutedForeground}
                      textAlign="right"
                    />
                  </View>
                  {showVenueSuggestions && (
                    <View style={[styles.suggestions, { backgroundColor: colors.surfaceContainerLow, borderRadius: 16, borderWidth: 1, borderColor: colors.border }]}>
                      {VENUES.filter((v) => v.includes(venue)).map((v) => (
                        <Pressable key={v} style={styles.suggestion} onPress={() => { setVenue(v); setShowVenueSuggestions(false); }}>
                          <Ionicons name="location-outline" size={16} color={accentColor} />
                          <Text style={[styles.suggestionText, { color: colors.onSurface, fontFamily: typography.body.fontFamily }]}>{v}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {errors.venue ? (
                    <Text style={[softStyles.errorText, { color: colors.destructive }]}>{errors.venue}</Text>
                  ) : (
                    <Text style={[softStyles.hintText, { color: colors.mutedForeground }]}>{t("createMatch.clubCenterHint")}</Text>
                  )}
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={[softStyles.label, { color: colors.onSurface }]}>{t("createMatch.locationUrl")}</Text>
                  <View style={[
                    softStyles.inputWrap,
                    {
                      backgroundColor: venueUrlError ? withAlpha(colors.destructive, 0.03) : colors.surface,
                      borderColor: venueUrlError ? colors.destructive : accentColor,
                      borderWidth: 1,
                      borderBottomWidth: venueUrlError ? 2 : 1,
                    },
                  ]}>
                    <TextInput
                      style={[softStyles.input, { color: colors.onSurface, fontFamily: typography.bodyLg.fontFamily }]}
                      value={venueUrl}
                      onChangeText={(v) => {
                        setVenueUrl(v);
                        setVenueUrlError("");
                      }}
                      onBlur={() => {
                        if (venueUrl.trim() && !isValidUrl(venueUrl)) {
                          setVenueUrlError(t("createMatch.errors.urlInvalid"));
                        } else {
                          setVenueUrlError("");
                        }
                      }}
                      placeholder="https://maps.google.com/..."
                      placeholderTextColor={colors.mutedForeground}
                      textAlign="right"
                      keyboardType="url"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {venueUrlError ? (
                    <Text style={[softStyles.errorText, { color: colors.destructive }]}>{venueUrlError}</Text>
                  ) : (
                    <Text style={[softStyles.hintText, { color: colors.mutedForeground }]}>{t("createMatch.locationUrlHint")}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Step 5: عدد اللاعبين والتكلفة */}
          {currentStep === 5 && (
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleAccent, { backgroundColor: accentColor }]} />
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>{t("createMatch.playersAndFee")}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{t("createMatch.playersAndFeeDesc")}</Text>

              <View style={{ gap: 20, marginTop: 8 }}>
                <View style={{ gap: 8 }}>
                  <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>{t("createMatch.numberOfPlayers")}</Text>
                  {sport === "football" ? (
                    <View style={[styles.counterRow, { backgroundColor: colors.surface, borderRadius: 18, padding: 8, borderWidth: 1, borderColor: colors.border }]}>
                      <Pressable
                        style={[styles.counterBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }]}
                        onPress={() => setMaxPlayers((p) => Math.max(2, p - 2))}
                      >
                        <Ionicons name="remove" size={20} color={colors.onSurface} />
                      </Pressable>
                      <Text style={[styles.counterVal, { color: accentColor }]}>{maxPlayers}</Text>
                      <Pressable
                        style={[styles.counterBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }]}
                        onPress={() => setMaxPlayers((p) => Math.min(22, p + 2))}
                      >
                        <Ionicons name="add" size={20} color={colors.onSurface} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={[styles.fixedPlayersBadge, { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border }]}>
                      <View style={[styles.fixedPlayersNum, { backgroundColor: withAlpha(accentColor, 0.1) }]}>
                        <Text style={[styles.fixedPlayersNumText, { color: accentColor }]}>{effectiveMaxPlayers}</Text>
                      </View>
                      <View style={styles.fixedPlayersInfo}>
                        <Text style={[styles.fixedPlayersTitle, { color: colors.onSurface }]}>
                          {isPadelOrTennis
                            ? (matchFormat === "single" ? t("createMatch.singlePlayers") : t("createMatch.doublePlayers"))
                            : t("createMatch.fixedPlayers", { count: 4 })}
                        </Text>
                        <Text style={[styles.fixedPlayersDesc, { color: colors.mutedForeground }]}>
                          {isPadelOrTennis
                            ? (matchFormat === "single" ? t("createMatch.singleFormat", { sport: sportOpt.label }) : t("createMatch.doubleFormat", { sport: sportOpt.label }))
                            : t("createMatch.twoTeamsFormat", { sport: sportOpt.label })}
                        </Text>
                      </View>
                      <Ionicons name="information-circle-outline" size={18} color={accentColor} />
                    </View>
                  )}
                </View>

                <SoftInput
                  label={t("createMatch.totalFee", { currency: t("createMatch.currencySymbol") })}
                  value={totalCost}
                  onChangeText={setTotalCost}
                  onChangeValidate={(v) => {
                    if (!isNaN(Number(v)) && Number(v) >= 0) {
                      setErrors((e) => ({ ...e, cost: "" }));
                    } else {
                      setErrors((e) => ({ ...e, cost: t("createMatch.errors.feeInvalid") }));
                    }
                  }}
                  onBlurValidate={() => {
                    if (isNaN(Number(totalCost)) || Number(totalCost) < 0) {
                      setErrors((e) => ({ ...e, cost: t("createMatch.errors.feeInvalid") }));
                    }
                  }}
                  placeholder={t("createMatch.feePrompt")}
                  accentColor={accentColor}
                  keyboardType="numeric"
                  error={errors.cost}
                  hint={t("createMatch.feeHint", { 
                    count: effectiveMaxPlayers, 
                    fee: effectiveMaxPlayers > 0 ? Math.round((Number(totalCost) || 0) / effectiveMaxPlayers * 100) / 100 : 0,
                    currency: t("createMatch.currencySymbol")
                  })}
                  colors={colors}
                />
              </View>
            </View>
          )}

          {/* Step 6: المستوى والمجموعة والمراجعة */}
          {currentStep === 6 && (
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleAccent, { backgroundColor: accentColor }]} />
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>{t("createMatch.reviewAndPublish")}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{t("createMatch.reviewAndPublishDesc")}</Text>

              <View style={{ gap: 20, marginTop: 8 }}>
                <View style={{ gap: 8 }}>
                  <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>{t("createMatch.playerLevel")}</Text>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {([
                      { key: null, label: t("createMatch.allLevels"), icon: "🎯" },
                      { key: "beginner" as const, label: t("createMatch.beginner"), icon: "🌱" },
                      { key: "intermediate" as const, label: t("createMatch.intermediate"), icon: "⚡" },
                      { key: "advanced" as const, label: t("createMatch.advanced"), icon: "🏆" },
                    ] as { key: "beginner" | "intermediate" | "advanced" | null; label: string; icon: string }[]).map((lvl) => {
                      const isSelected = skillLevel === lvl.key;
                      return (
                        <Pressable
                          key={String(lvl.key)}
                          style={[
                            styles.skillChip,
                            isSelected
                              ? [{ backgroundColor: withAlpha(accentColor, 0.15), borderColor: accentColor, borderWidth: 1.5 }]
                              : [{ backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }],
                          ]}
                          onPress={() => { setSkillLevel(lvl.key); Haptics.selectionAsync(); }}
                        >
                          <Text style={styles.skillChipEmoji}>{lvl.icon}</Text>
                          <Text style={[styles.skillChipText, { color: isSelected ? accentColor : colors.onSurface }]}>{lvl.label}</Text>
                          {isSelected && <Ionicons name="checkmark-circle" size={14} color={accentColor} />}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {!isPublic && (
                  <View style={{ gap: 8 }}>
                    <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>{t("createMatch.chooseGroup")}</Text>
                    {myGroups.length === 0 ? (
                      <View style={[styles.note, { backgroundColor: colors.surfaceContainerLow }]}>
                        <Ionicons name="alert-circle-outline" size={16} color={colors.mutedForeground} />
                        <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{t("createMatch.groupRequired")}</Text>
                      </View>
                    ) : (
                      <View style={styles.groupsRow}>
                        {myGroups.map((g) => (
                          <Pressable
                            key={g.id}
                            style={[
                              styles.groupChip,
                              selectedGroupId === g.id
                                ? [{ backgroundColor: accentBg, borderWidth: 1.5, borderColor: accentColor + "40" }]
                                : [{ backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }],
                            ]}
                            onPress={() => setSelectedGroupId(g.id)}
                          >
                            <Text style={[styles.groupChipText, { color: selectedGroupId === g.id ? accentColor : colors.onSurfaceVariant }]}>{g.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {errors.group && <Text style={[softStyles.errorText, { color: colors.destructive }]}>{errors.group}</Text>}
                  </View>
                )}

                <View style={styles.previewSection}>
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>{t("createMatch.matchPreview")}</Text>

                  <View style={[styles.previewCard, { backgroundColor: accentBg }]}>
                    <View style={[styles.previewAccentStripe, { backgroundColor: accentColor }]} />

                    <View style={styles.previewContent}>
                      <View style={styles.previewTopRow}>
                        <View style={[styles.previewSportPill, { backgroundColor: accentBg }]}>
                          <View style={[styles.previewSportDot, { backgroundColor: accentColor }]} />
                          <Text style={[styles.previewSportPillText, { color: accentColor }]}>
                            {sport ? SPORT_LABELS[sport] : t("createMatch.sportPlaceholder")}
                          </Text>
                        </View>
                        <View style={[styles.previewStatusPill, { backgroundColor: accentBg }]}>
                          <Text style={[styles.previewStatusPillText, { color: accentColor }]}>
                            {isPublic ? t("createMatch.public") : t("createMatch.private")}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.previewTitle, { color: colors.onSurface }]} numberOfLines={1}>
                        {title.trim() || (sport ? SPORT_LABELS[sport] : t("createMatch.newMatchPlaceholder"))}
                      </Text>

                      <View style={[styles.previewInfoCard, { backgroundColor: colors.surfaceContainerLow }]}>
                        <View style={styles.previewInfoRow}>
                          <Text style={[styles.previewInfoText, { color: colors.mutedForeground }]}>{selectedTime}</Text>
                          <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                        </View>
                        <View style={styles.previewInfoRow}>
                          <Text style={[styles.previewInfoText, { color: colors.mutedForeground }]}>{previewDateStr}</Text>
                          <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
                        </View>
                        {venue.trim() ? (
                          <View style={styles.previewInfoRow}>
                            <Text style={[styles.previewInfoText, { color: colors.mutedForeground }]} numberOfLines={1}>{venue}</Text>
                            <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.previewBottomRow}>
                        <View style={styles.previewSpotsSection}>
                          <View style={styles.previewSpotsTextRow}>
                            <Text style={[styles.previewSpotsRemaining, { color: colors.success }]}>
                              {t("createMatch.spotsCount", { count: effectiveMaxPlayers })}
                            </Text>
                            <Text style={[styles.previewSpotsTotal, { color: colors.onSurfaceVariant }]}>
                              {t("createMatch.spotsRatio", { filled: 1, total: effectiveMaxPlayers })}
                            </Text>
                          </View>
                          <LiquidProgressBar progress={1 / Math.max(effectiveMaxPlayers, 1)} sport={sport} height={6} />
                        </View>

                        <View style={styles.previewCostCol}>
                          <Text style={[styles.previewCostValue, { color: colors.onSurface }]}>
                            {effectiveMaxPlayers > 0 ? Math.round((Number(totalCost) || 0) / effectiveMaxPlayers * 100) / 100 : 0}{" "}
                            <Text style={[styles.previewCostUnit, { color: colors.onSurfaceVariant }]}>{t("createMatch.currencySymbol")}</Text>
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {submitError ? (
                  <View style={[styles.submitErrorBox, { backgroundColor: colors.destructive + "18", borderRadius: 14 }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
                    <Text style={[styles.submitErrorText, { color: colors.destructive }]}>{submitError}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          <View style={styles.actionsRow}>
            {currentStep < TOTAL_STEPS - 1 ? (
              <SportGradientButton
                label={t("createMatch.next")}
                gradientStart={accentColor}
                gradientEnd={withAlpha(accentColor, 0.8)}
                onPress={handleNext}
              />
            ) : (
              <SportGradientButton
                label={t("createMatch.publish")}
                gradientStart={accentColor}
                gradientEnd={withAlpha(accentColor, 0.8)}
                onPress={handleCreate}
                loading={submitting}
                disabled={submitting}
              />
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  navTitle: { fontSize: 18, fontFamily: typography.headlineSm.fontFamily, lineHeight: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  stepperContainer: { flexDirection: "column", alignItems: "stretch", marginBottom: 4, gap: 8 },
  stepProgressTrack: { height: 4, borderRadius: 2, position: "relative", marginHorizontal: 12, marginTop: 12 },
  stepProgressFill: { height: 4, borderRadius: 2, position: "absolute", top: 0, left: 0 },
  stepNode: {
    position: "absolute", top: -9, width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
    marginLeft: -11,
  },
  stepNodeText: { fontSize: 9, fontFamily: typography.headlineSm.fontFamily },
  stepLabelsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 4 },
  stepLabel: { fontSize: 8 },
  navStepIndicator: { fontSize: 11, fontFamily: typography.bodyLg.fontFamily },
  sportAccentBar: { height: 3, width: "100%", opacity: 0.75 },

  scroll: { paddingHorizontal: 20, gap: 0 },
  stepContent: { gap: 0, paddingBottom: 16 },
  stepTitleAccent: { height: 4, width: 40, borderRadius: 2, alignSelf: "flex-end", marginBottom: 6, marginTop: 8 },
  stepTitle: { fontSize: 22, fontFamily: typography.headlineSm.fontFamily, textAlign: "right", lineHeight: 36, marginBottom: 4 },
  stepSubtitle: { fontSize: 14, fontFamily: typography.body.fontFamily, textAlign: "right", lineHeight: 22, marginBottom: 8 },
  sectionLabel: { fontSize: 14, fontFamily: typography.headlineSm.fontFamily, textAlign: "right" },

  typeCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 24, borderWidth: 1.5, borderColor: "transparent" },
  typeCardIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  typeCardInfo: { flex: 1, gap: 2, alignItems: "flex-end" },
  typeCardTitle: { fontSize: 17, fontFamily: typography.headlineSm.fontFamily },
  typeCardDesc: { fontSize: 12, fontFamily: typography.body.fontFamily, textAlign: "right", lineHeight: 20 },

  sportCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 20 },
  sportCardBadge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  sportCardInfo: { flex: 1, gap: 2, alignItems: "flex-end" },
  sportCardTitle: { fontSize: 17, fontFamily: typography.headlineSm.fontFamily },
  sportCardDesc: { fontSize: 12, fontFamily: typography.body.fontFamily, textAlign: "right" },

  surfaceCard: { borderRadius: 20, padding: 16, gap: 12 },
  surfaceCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 10, justifyContent: "flex-end" },
  surfaceCardTitle: { fontSize: 14, fontFamily: typography.headlineSm.fontFamily },

  timesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  timeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  timeText: { fontSize: 14, fontFamily: typography.bodyLg.fontFamily },

  suggestions: { marginTop: 4, overflow: "hidden" },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, justifyContent: "flex-end" },
  suggestionText: { fontSize: 14 },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 16, justifyContent: "center" },
  counterBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  counterVal: { fontSize: 22, fontFamily: typography.headlineSm.fontFamily, minWidth: 40, textAlign: "center" },

  fixedPlayersBadge: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  fixedPlayersNum: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  fixedPlayersNumText: { fontSize: 22, fontFamily: typography.headlineSm.fontFamily },
  fixedPlayersInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  fixedPlayersTitle: { fontSize: 15, fontFamily: typography.headlineSm.fontFamily },
  fixedPlayersDesc: { fontSize: 12, fontFamily: typography.body.fontFamily, textAlign: "right", lineHeight: 20 },

  skillChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  skillChipEmoji: { fontSize: 15 },
  skillChipText: { fontSize: 13, fontFamily: typography.headlineSm.fontFamily },

  groupsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  groupChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  groupChipText: { fontSize: 13, fontFamily: typography.headlineSm.fontFamily },

  note: { flexDirection: "row", gap: 6, alignItems: "center", padding: 10, borderRadius: 10 },
  noteText: { fontSize: 12, fontFamily: typography.bodyLg.fontFamily, flex: 1, textAlign: "right", lineHeight: 20 },

  previewSection: { gap: 10 },
  previewLabel: { fontSize: 12, fontFamily: typography.bodyLg.fontFamily, textAlign: "center" },

  previewCard: {
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    minHeight: 130,
    position: "relative",
  },
  previewAccentStripe: {
    width: 4,
    borderTopStartRadius: 16,
    borderBottomStartRadius: 16,
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  previewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  previewSportPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  previewSportDot: { width: 6, height: 6, borderRadius: 3 },
  previewSportPillText: { fontSize: 11, fontFamily: typography.bodyLg.fontFamily },
  previewStatusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  previewStatusPillText: { fontSize: 11, fontFamily: typography.bodyLg.fontFamily },
  previewTitle: {
    fontSize: 16,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "right",
  },
  previewInfoCard: {
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  previewInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
  },
  previewInfoText: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    textAlign: "right",
    flex: 1,
  },
  previewBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
  },
  previewSpotsSection: { flex: 1, gap: 4 },
  previewSpotsTextRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewSpotsRemaining: { fontSize: 12, fontFamily: typography.headlineSm.fontFamily },
  previewSpotsTotal: { fontSize: 11, fontFamily: typography.bodyLg.fontFamily },
  previewCostCol: { alignItems: "flex-end" },
  previewCostValue: { fontSize: 16, fontFamily: typography.headlineSm.fontFamily, lineHeight: 22 },
  previewCostUnit: { fontSize: 11, fontFamily: typography.body.fontFamily },

  actionsRow: { marginTop: 8 },

  submitErrorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, justifyContent: "flex-end" },
  submitErrorText: { fontSize: 13, fontFamily: typography.bodyLg.fontFamily, textAlign: "right", flex: 1, lineHeight: 20 },
});
