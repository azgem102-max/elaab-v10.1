import { useApp, SportType } from "@/context/AppContext";
import { getSportIcon } from "@/components/icons/SportIcons";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useRef, useEffect, useCallback } from "react";
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

const SCREEN_WIDTH = Dimensions.get("window").width;

const _sc = themeColors.light;
const SPORT_OPTIONS: { key: SportType; label: string; color: string; lightBg: string }[] = [
  { key: "football", label: "كرة القدم", color: _sc.football, lightBg: _sc.footballContainer },
  { key: "padel", label: "بادل", color: _sc.padel, lightBg: _sc.padelContainer },
  { key: "tennis", label: "تنس", color: _sc.tennis, lightBg: _sc.tennisContainer },
];

const SPORT_COLOR_MAP: Record<SportType, string> = {
  football: _sc.football,
  padel: _sc.padel,
  tennis: _sc.tennis,
};


const SPORT_LABELS: Record<string, string> = {
  football: "كرة القدم",
  padel: "بادل",
  tennis: "تنس",
};

const VENUES = ["ملعب الأمير محمد", "أكاديمية بادل الرياض", "نادي التنس الملكي", "ملعب الهلال الصغير", "مركز الشباب الرياضي"];
const TIMES = ["07:00", "08:00", "09:00", "10:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

function todayAtMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const STEP_LABELS = ["النوع", "الرياضة", "العنوان", "الموعد", "الملعب", "الإعدادات", "المراجعة"];
const TOTAL_STEPS = STEP_LABELS.length;

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
  return (
    <View style={{ gap: 6 }}>
      <Text style={[softStyles.label, { color: colors.onSurface }]}>{label}</Text>
      <View
        style={[
          softStyles.inputWrap,
          { backgroundColor: colors.surfaceContainerHigh },
          focused && !error && { borderBottomColor: accentColor, borderBottomWidth: 2 },
          !!error && { borderBottomColor: colors.destructive, borderBottomWidth: 2 },
          !focused && !error && { borderBottomWidth: 1, borderBottomColor: withAlpha(colors.mutedForeground ?? "#888", 0.2) },
        ]}
      >
        <TextInput
          style={[
            softStyles.input,
            { color: colors.onSurface, fontFamily: "Cairo_600SemiBold" },
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
  label: { fontSize: 14, fontFamily: "Cairo_700Bold", textAlign: "right" },
  inputWrap: {
    borderRadius: 14,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
    overflow: "hidden",
  },
  input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  errorText: { fontSize: 12, fontFamily: "Cairo_400Regular", textAlign: "right" },
  hintText: { fontSize: 12, fontFamily: "Cairo_400Regular", textAlign: "right", opacity: 0.8 },
});

export default function CreateMatchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createMatch, user, groups } = useApp();
  const params = useLocalSearchParams<{ groupId?: string; venue?: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const initialGroupId = params.groupId ?? undefined;
  const initialVenue = params.venue ?? "";

  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [isPublic, setIsPublic] = useState(!initialGroupId);
  const [sport, setSport] = useState<SportType>("football");
  const [prevSport, setPrevSport] = useState<SportType>("football");
  const sportTransition = useRef(new Animated.Value(1)).current;
  const [animatedAccent, setAnimatedAccent] = useState(SPORT_COLOR_MAP.football);

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

  const sportOpt = SPORT_OPTIONS.find((s) => s.key === sport)!;
  const myGroups = groups.filter((g) => g.isJoined);
  const selectedGroup = myGroups.find((g) => g.id === selectedGroupId);

  const accentColor = animatedAccent;
  const accentBg = sportOpt.lightBg;

  useEffect(() => {
    const fromColor = SPORT_COLOR_MAP[prevSport];
    const toColor = SPORT_COLOR_MAP[sport];
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
    setPrevSport(sport);
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
    if (currentStep === 2) {
      if (!title.trim()) e.title = "أدخل عنوان المباراة";
    }
    if (currentStep === 4) {
      if (!venue.trim()) e.venue = "أدخل اسم الملعب";
      if (!isValidUrl(venueUrl)) {
        setVenueUrlError("رابط غير صحيح، تأكد من أنه يبدأ بـ http:// أو https://");
        setErrors(e);
        return false;
      }
      setVenueUrlError("");
    }
    if (currentStep === 5) {
      if (isNaN(Number(totalCost)) || Number(totalCost) < 0) e.cost = "أدخل مبلغ صحيح";
    }
    if (currentStep === 6) {
      if (!isPublic && !selectedGroupId) e.group = "يجب اختيار مجموعة للمباراة الخاصة";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateAll(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "أدخل عنوان المباراة";
    if (!venue.trim()) e.venue = "أدخل اسم الملعب";
    if (isNaN(Number(totalCost)) || Number(totalCost) < 0) e.cost = "أدخل مبلغ صحيح";
    if (!isPublic && !selectedGroupId) e.group = "يجب اختيار مجموعة للمباراة الخاصة";
    if (!isValidUrl(venueUrl)) {
      setVenueUrlError("رابط غير صحيح، تأكد من أنه يبدأ بـ http:// أو https://");
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
        sport,
        date: selectedDate,
        time: selectedTime,
        venue,
        location: venueUrl.trim() ? normalizeUrl(venueUrl) : undefined,
        maxPlayers: effectiveMaxPlayers,
        cost: costPerPlayer,
        isPublic,
        organizerId: user?.id ?? "",
        organizerName: user?.nickname ?? "مجهول",
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
      setSubmitError(err instanceof Error ? err.message : "فشل إنشاء المباراة، يرجى المحاولة مجدداً");
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
          <Pressable onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }]}>
            <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={22} color={colors.onSurface} />
          </Pressable>
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={[styles.navTitle, { color: colors.onSurface }]}>إنشاء مباراة</Text>
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
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>خصوصية المباراة</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>اختر هل المباراة مفتوحة للجميع أم خاصة</Text>

              <View style={{ gap: 14, marginTop: 16 }}>
                <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>مستوى الخصوصية</Text>
                <Pressable
                  style={[
                    styles.typeCard,
                    { borderWidth: 1, borderColor: colors.border },
                    isPublic
                      ? { backgroundColor: sportOpt.lightBg, borderColor: accentColor }
                      : { backgroundColor: colors.surfaceContainerLow, borderColor: "transparent" },
                  ]}
                  onPress={() => { setIsPublic(true); setSelectedGroupId(undefined); Haptics.selectionAsync(); }}
                >
                  <View style={[styles.typeCardIcon, { backgroundColor: isPublic ? accentColor : colors.surfaceContainerHigh }]}>
                    <Ionicons name="globe-outline" size={28} color={isPublic ? "#fff" : colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.typeCardInfo}>
                    <Text style={[styles.typeCardTitle, { color: isPublic ? accentColor : colors.onSurface }]}>عامة</Text>
                    <Text style={[styles.typeCardDesc, { color: colors.mutedForeground }]}>مفتوحة لأي لاعب، تظهر في الاستكشاف</Text>
                  </View>
                  <AnimatedCheckmark visible={isPublic} color={accentColor} />
                </Pressable>

                <Pressable
                  style={[
                    styles.typeCard,
                    { borderWidth: 1, borderColor: colors.border },
                    !isPublic
                      ? { backgroundColor: sportOpt.lightBg, borderColor: accentColor }
                      : { backgroundColor: colors.surfaceContainerLow, borderColor: "transparent" },
                  ]}
                  onPress={() => { setIsPublic(false); Haptics.selectionAsync(); }}
                >
                  <View style={[styles.typeCardIcon, { backgroundColor: !isPublic ? accentColor : colors.surfaceContainerHigh }]}>
                    <Ionicons name="lock-closed-outline" size={28} color={!isPublic ? "#fff" : colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.typeCardInfo}>
                    <Text style={[styles.typeCardTitle, { color: !isPublic ? accentColor : colors.onSurface }]}>خاصة</Text>
                    <Text style={[styles.typeCardDesc, { color: colors.mutedForeground }]}>مرتبطة بمجموعة محددة، بدعوة فقط</Text>
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
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>اختر الرياضة</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>الألوان ستتغير تدريجياً حسب رياضتك المختارة</Text>

              <View style={{ gap: 14, marginTop: 8 }}>
                {SPORT_OPTIONS.map((s) => {
                  const OptionSportIcon = getSportIcon(s.key);
                  return (
                  <Pressable
                    key={s.key}
                    style={[
                      styles.sportCard,
                      { borderWidth: 1, borderColor: colors.border },
                      sport === s.key
                        ? { backgroundColor: s.lightBg, borderWidth: 1.5, borderColor: s.color }
                        : { backgroundColor: colors.surfaceContainerLow, borderWidth: 1.5, borderColor: "transparent" },
                    ]}
                    onPress={() => handleSportChange(s.key)}
                  >
                    <View style={[styles.sportCardBadge, { backgroundColor: sport === s.key ? s.color : colors.surfaceContainerHigh }]}>
                      <OptionSportIcon color={sport === s.key ? "#fff" : colors.onSurfaceVariant} size={24} />
                    </View>
                    <View style={styles.sportCardInfo}>
                      <Text style={[styles.sportCardTitle, { color: sport === s.key ? s.color : colors.onSurface }]}>{s.label}</Text>
                      <Text style={[styles.sportCardDesc, { color: colors.mutedForeground }]}>
                        {s.key === "football" ? "حتى 22 لاعب" : "فردي (2) أو مزدوج (4)"}
                      </Text>
                    </View>
                    <AnimatedCheckmark visible={sport === s.key} color={s.color} />
                  </Pressable>
                  );
                })}
              </View>

              {isPadelOrTennis && (
                <View style={{ gap: 10, marginTop: 16 }}>
                  <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>نوع اللعب</Text>
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
                        <Text style={[styles.typeCardTitle, { color: matchFormat === "single" ? accentColor : colors.onSurface }]}>فردي (1 ضد 1)</Text>
                        <Text style={[styles.typeCardDesc, { color: colors.mutedForeground }]}>لاعبان فقط — مباراة فردية</Text>
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
                        <Text style={[styles.typeCardTitle, { color: matchFormat === "double" ? accentColor : colors.onSurface }]}>مزدوج (2 ضد 2)</Text>
                        <Text style={[styles.typeCardDesc, { color: colors.mutedForeground }]}>أربعة لاعبين — مباراة مزدوجة</Text>
                      </View>
                      <AnimatedCheckmark visible={matchFormat === "double"} color={accentColor} />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Step 2: العنوان والوصف */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleAccent, { backgroundColor: accentColor }]} />
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>اسم المباراة</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>أعطِ مبارتك اسماً يعكس روحها</Text>

              <View style={{ gap: 20, marginTop: 8 }}>
                <SoftInput
                  label="عنوان المباراة"
                  value={title}
                  onChangeText={setTitle}
                  onChangeValidate={(v) => {
                    if (v.trim()) setErrors((e) => ({ ...e, title: "" }));
                  }}
                  onBlurValidate={() => {
                    if (!title.trim()) setErrors((e) => ({ ...e, title: "أدخل عنوان المباراة" }));
                  }}
                  placeholder={
                    sport === "football" ? "كرة قدم مع الزملاء" :
                    sport === "padel" ? "تحدي بادل الأسبوعي" :
                    "تنس الجمعة المعتاد"
                  }
                  accentColor={accentColor}
                  error={errors.title}
                  hint="مثال: كرة قدم مع الزملاء أو الجمعة الأسبوعية"
                  colors={colors}
                />

                <SoftInput
                  label="وصف (اختياري)"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="أضف تفاصيل مفيدة للاعبين — مستوى اللعب، ماذا يجلبون..."
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
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>الموعد</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>متى ستُقام المباراة؟</Text>

              <View style={{ gap: 16, marginTop: 8 }}>
                <View style={[styles.surfaceCard, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }]}>
                  <View style={[styles.surfaceCardHeader, { borderBottomColor: withAlpha(accentColor, 0.12) }]}>
                    <Ionicons name="calendar-outline" size={18} color={accentColor} />
                    <Text style={[styles.surfaceCardTitle, { color: colors.onSurface }]}>التاريخ</Text>
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
                    <Text style={[styles.surfaceCardTitle, { color: colors.onSurface }]}>الوقت</Text>
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
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>موقع الملعب</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>أين ستُقام المباراة؟</Text>

              <View style={{ gap: 20, marginTop: 8 }}>
                <View style={{ gap: 6 }}>
                  <Text style={[softStyles.label, { color: colors.onSurface }]}>اسم الملعب</Text>
                  <View style={[
                    softStyles.inputWrap,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderBottomColor: errors.venue ? colors.destructive : accentColor,
                      borderBottomWidth: errors.venue ? 2 : 1,
                    },
                  ]}>
                    <TextInput
                      style={[softStyles.input, { color: colors.onSurface, fontFamily: "Cairo_600SemiBold" }]}
                      value={venue}
                      onChangeText={(v) => {
                        setVenue(v);
                        setShowVenueSuggestions(v.length > 0);
                        if (v.trim()) setErrors((e) => ({ ...e, venue: "" }));
                      }}
                      onBlur={() => {
                        if (!venue.trim()) setErrors((e) => ({ ...e, venue: "أدخل اسم الملعب" }));
                        setTimeout(() => setShowVenueSuggestions(false), 200);
                      }}
                      placeholder="ملعب الحي — شارع العليا"
                      placeholderTextColor={colors.mutedForeground}
                      textAlign="right"
                    />
                  </View>
                  {showVenueSuggestions && (
                    <View style={[styles.suggestions, { backgroundColor: colors.surfaceContainerLow, borderRadius: 16, borderWidth: 1, borderColor: colors.border }]}>
                      {VENUES.filter((v) => v.includes(venue)).map((v) => (
                        <Pressable key={v} style={styles.suggestion} onPress={() => { setVenue(v); setShowVenueSuggestions(false); }}>
                          <Ionicons name="location-outline" size={16} color={accentColor} />
                          <Text style={[styles.suggestionText, { color: colors.onSurface, fontFamily: "Cairo_400Regular" }]}>{v}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {errors.venue ? (
                    <Text style={[softStyles.errorText, { color: colors.destructive }]}>{errors.venue}</Text>
                  ) : (
                    <Text style={[softStyles.hintText, { color: colors.mutedForeground }]}>ابدأ بالكتابة لترى اقتراحات الملاعب القريبة</Text>
                  )}
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={[softStyles.label, { color: colors.onSurface }]}>رابط موقع الملعب (اختياري)</Text>
                  <View style={[
                    softStyles.inputWrap,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderBottomColor: venueUrlError ? colors.destructive : accentColor,
                      borderBottomWidth: venueUrlError ? 2 : 1,
                    },
                  ]}>
                    <TextInput
                      style={[softStyles.input, { color: colors.onSurface, fontFamily: "Cairo_600SemiBold" }]}
                      value={venueUrl}
                      onChangeText={(v) => {
                        setVenueUrl(v);
                        setVenueUrlError("");
                      }}
                      onBlur={() => {
                        if (venueUrl.trim() && !isValidUrl(venueUrl)) {
                          setVenueUrlError("رابط غير صحيح، تأكد من أنه يبدأ بـ http:// أو https://");
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
                    <Text style={[softStyles.hintText, { color: colors.mutedForeground }]}>الصق رابط Google Maps أو أي رابط يبدأ بـ https://</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Step 5: عدد اللاعبين والتكلفة */}
          {currentStep === 5 && (
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleAccent, { backgroundColor: accentColor }]} />
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>اللاعبون والتكلفة</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>حدد عدد المشاركين والقطة الإجمالية</Text>

              <View style={{ gap: 20, marginTop: 8 }}>
                <View style={{ gap: 8 }}>
                  <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>عدد اللاعبين</Text>
                  {sport === "football" ? (
                    <View style={[styles.counterRow, { backgroundColor: colors.surfaceContainerHigh, borderRadius: 18, padding: 8, borderWidth: 1, borderColor: colors.border }]}>
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
                    <View style={[styles.fixedPlayersBadge, { backgroundColor: colors.surfaceContainerHigh, borderRadius: 18, borderWidth: 1, borderColor: colors.border }]}>
                      <View style={[styles.fixedPlayersNum, { backgroundColor: withAlpha(accentColor, 0.1) }]}>
                        <Text style={[styles.fixedPlayersNumText, { color: accentColor }]}>{effectiveMaxPlayers}</Text>
                      </View>
                      <View style={styles.fixedPlayersInfo}>
                        <Text style={[styles.fixedPlayersTitle, { color: colors.onSurface }]}>
                          {isPadelOrTennis
                            ? (matchFormat === "single" ? "فردي — لاعبان" : "مزدوج — 4 لاعبين")
                            : "4 لاعبين (ثابت)"}
                        </Text>
                        <Text style={[styles.fixedPlayersDesc, { color: colors.mutedForeground }]}>
                          {isPadelOrTennis
                            ? (matchFormat === "single" ? `${sportOpt.label} فردي (1 ضد 1)` : `${sportOpt.label} مزدوج (2 ضد 2)`)
                            : `${sportOpt.label} يُلعب بفريقين من لاعبين`}
                        </Text>
                      </View>
                      <Ionicons name="information-circle-outline" size={18} color={accentColor} />
                    </View>
                  )}
                </View>

                <SoftInput
                  label="التكلفة الإجمالية (ر.س)"
                  value={totalCost}
                  onChangeText={setTotalCost}
                  onChangeValidate={(v) => {
                    if (!isNaN(Number(v)) && Number(v) >= 0) {
                      setErrors((e) => ({ ...e, cost: "" }));
                    } else {
                      setErrors((e) => ({ ...e, cost: "أدخل مبلغ صحيح" }));
                    }
                  }}
                  onBlurValidate={() => {
                    if (isNaN(Number(totalCost)) || Number(totalCost) < 0) {
                      setErrors((e) => ({ ...e, cost: "أدخل مبلغ صحيح" }));
                    }
                  }}
                  placeholder="500"
                  accentColor={accentColor}
                  keyboardType="numeric"
                  error={errors.cost}
                  hint={`القطة تُقسَّم تلقائياً على ${effectiveMaxPlayers} لاعبين = ${
                    effectiveMaxPlayers > 0 ? Math.round((Number(totalCost) || 0) / effectiveMaxPlayers * 100) / 100 : 0
                  } ر.س للفرد`}
                  colors={colors}
                />
              </View>
            </View>
          )}

          {/* Step 6: المستوى والمجموعة والمراجعة */}
          {currentStep === 6 && (
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleAccent, { backgroundColor: accentColor }]} />
              <Text style={[styles.stepTitle, { color: colors.onSurface }]}>المراجعة والنشر</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>اختر مستوى اللاعبين ثم راجع المباراة قبل النشر</Text>

              <View style={{ gap: 20, marginTop: 8 }}>
                <View style={{ gap: 8 }}>
                  <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>مستوى اللاعب</Text>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {([
                      { key: null, label: "كل المستويات", icon: "🎯" },
                      { key: "beginner" as const, label: "مبتدئ", icon: "🌱" },
                      { key: "intermediate" as const, label: "متوسط", icon: "⚡" },
                      { key: "advanced" as const, label: "متقدم", icon: "🏆" },
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
                    <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>اختر المجموعة</Text>
                    {myGroups.length === 0 ? (
                      <View style={[styles.note, { backgroundColor: colors.surfaceContainerLow }]}>
                        <Ionicons name="alert-circle-outline" size={16} color={colors.mutedForeground} />
                        <Text style={[styles.noteText, { color: colors.mutedForeground }]}>انضم لمجموعة أولاً لإنشاء مباراة خاصة بها</Text>
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
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>معاينة المباراة — هكذا ستبدو للاعبين</Text>

                  <View style={[styles.previewCard, { backgroundColor: accentBg }]}>
                    <View style={[styles.previewAccentStripe, { backgroundColor: accentColor }]} />

                    <View style={styles.previewContent}>
                      <View style={styles.previewTopRow}>
                        <View style={[styles.previewSportPill, { backgroundColor: accentBg }]}>
                          <View style={[styles.previewSportDot, { backgroundColor: accentColor }]} />
                          <Text style={[styles.previewSportPillText, { color: accentColor }]}>
                            {SPORT_LABELS[sport]}
                          </Text>
                        </View>
                        <View style={[styles.previewStatusPill, { backgroundColor: accentBg }]}>
                          <Text style={[styles.previewStatusPillText, { color: accentColor }]}>
                            {isPublic ? "عامة" : "خاصة"}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.previewTitle, { color: colors.onSurface }]} numberOfLines={1}>
                        {title.trim() || sportOpt.label}
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
                              {effectiveMaxPlayers} مكان
                            </Text>
                            <Text style={[styles.previewSpotsTotal, { color: colors.onSurfaceVariant }]}>
                              1/{effectiveMaxPlayers}
                            </Text>
                          </View>
                          <LiquidProgressBar progress={1 / Math.max(effectiveMaxPlayers, 1)} sport={sport} height={6} />
                        </View>

                        <View style={styles.previewCostCol}>
                          <Text style={[styles.previewCostValue, { color: colors.onSurface }]}>
                            {effectiveMaxPlayers > 0 ? Math.round((Number(totalCost) || 0) / effectiveMaxPlayers * 100) / 100 : 0}{" "}
                            <Text style={[styles.previewCostUnit, { color: colors.onSurfaceVariant }]}>ر.س</Text>
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
                label="التالي"
                gradientStart={accentColor}
                gradientEnd={withAlpha(accentColor, 0.8)}
                onPress={handleNext}
              />
            ) : (
              <SportGradientButton
                label="نشر المباراة"
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
  navTitle: { fontSize: 18, fontFamily: "Cairo_700Bold", lineHeight: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  stepperContainer: { flexDirection: "column", alignItems: "stretch", marginBottom: 4, gap: 8 },
  stepProgressTrack: { height: 4, borderRadius: 2, position: "relative", marginHorizontal: 12, marginTop: 12 },
  stepProgressFill: { height: 4, borderRadius: 2, position: "absolute", top: 0, left: 0 },
  stepNode: {
    position: "absolute", top: -9, width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
    marginLeft: -11,
  },
  stepNodeText: { fontSize: 9, fontFamily: "Cairo_700Bold" },
  stepLabelsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 4 },
  stepLabel: { fontSize: 8 },
  navStepIndicator: { fontSize: 11, fontFamily: "Cairo_600SemiBold" },
  sportAccentBar: { height: 3, width: "100%", opacity: 0.75 },

  scroll: { paddingHorizontal: 20, gap: 0 },
  stepContent: { gap: 0, paddingBottom: 16 },
  stepTitleAccent: { height: 4, width: 40, borderRadius: 2, alignSelf: "flex-end", marginBottom: 6, marginTop: 8 },
  stepTitle: { fontSize: 22, fontFamily: "Cairo_700Bold", textAlign: "right", lineHeight: 36, marginBottom: 4 },
  stepSubtitle: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "right", lineHeight: 22, marginBottom: 8 },
  sectionLabel: { fontSize: 14, fontFamily: "Cairo_700Bold", textAlign: "right" },

  typeCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 24, borderWidth: 1.5, borderColor: "transparent" },
  typeCardIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  typeCardInfo: { flex: 1, gap: 2, alignItems: "flex-end" },
  typeCardTitle: { fontSize: 17, fontFamily: "Cairo_700Bold" },
  typeCardDesc: { fontSize: 12, fontFamily: "Cairo_400Regular", textAlign: "right", lineHeight: 20 },

  sportCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 20 },
  sportCardBadge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  sportCardInfo: { flex: 1, gap: 2, alignItems: "flex-end" },
  sportCardTitle: { fontSize: 17, fontFamily: "Cairo_700Bold" },
  sportCardDesc: { fontSize: 12, fontFamily: "Cairo_400Regular", textAlign: "right" },

  surfaceCard: { borderRadius: 20, padding: 16, gap: 12 },
  surfaceCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 10, justifyContent: "flex-end" },
  surfaceCardTitle: { fontSize: 14, fontFamily: "Cairo_700Bold" },

  timesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  timeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  timeText: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },

  suggestions: { marginTop: 4, overflow: "hidden" },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, justifyContent: "flex-end" },
  suggestionText: { fontSize: 14 },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 16, justifyContent: "center" },
  counterBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  counterVal: { fontSize: 22, fontFamily: "Cairo_700Bold", minWidth: 40, textAlign: "center" },

  fixedPlayersBadge: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  fixedPlayersNum: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  fixedPlayersNumText: { fontSize: 22, fontFamily: "Cairo_700Bold" },
  fixedPlayersInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  fixedPlayersTitle: { fontSize: 15, fontFamily: "Cairo_700Bold" },
  fixedPlayersDesc: { fontSize: 12, fontFamily: "Cairo_400Regular", textAlign: "right", lineHeight: 20 },

  skillChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  skillChipEmoji: { fontSize: 15 },
  skillChipText: { fontSize: 13, fontFamily: "Cairo_700Bold" },

  groupsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  groupChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  groupChipText: { fontSize: 13, fontFamily: "Cairo_700Bold" },

  note: { flexDirection: "row", gap: 6, alignItems: "center", padding: 10, borderRadius: 10 },
  noteText: { fontSize: 12, fontFamily: "Cairo_600SemiBold", flex: 1, textAlign: "right", lineHeight: 20 },

  previewSection: { gap: 10 },
  previewLabel: { fontSize: 12, fontFamily: "Cairo_600SemiBold", textAlign: "center" },

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
  previewSportPillText: { fontSize: 11, fontFamily: "Cairo_600SemiBold" },
  previewStatusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  previewStatusPillText: { fontSize: 11, fontFamily: "Cairo_600SemiBold" },
  previewTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
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
    fontFamily: "Cairo_400Regular",
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
  previewSpotsRemaining: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  previewSpotsTotal: { fontSize: 11, fontFamily: "Cairo_600SemiBold" },
  previewCostCol: { alignItems: "flex-end" },
  previewCostValue: { fontSize: 16, fontFamily: "Cairo_700Bold", lineHeight: 22 },
  previewCostUnit: { fontSize: 11, fontFamily: "Cairo_400Regular" },

  actionsRow: { marginTop: 8 },

  submitErrorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, justifyContent: "flex-end" },
  submitErrorText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", textAlign: "right", flex: 1, lineHeight: 20 },
});
