import { useApp, sportColor, Match } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { DatePickerField } from "@/components/DatePickerField";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  Animated,
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
import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { SportGradientButton } from "@/components/SportGradientButton";

import { LiquidProgressBar } from "@/components/glass/LiquidProgressBar";
import { typography } from "@/constants/typography";


function toYMD(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const VENUES = ["ملعب الأمير محمد", "أكاديمية بادل الرياض", "نادي التنس الملكي", "ملعب الهلال الصغير", "مركز الشباب الرياضي"];
const TIMES = ["07:00", "08:00", "09:00", "10:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

function todayAtMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function withAlpha(color: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  if (!result) return color;
  const r = parseInt(result[1]!, 16);
  const g = parseInt(result[2]!, 16);
  const b = parseInt(result[3]!, 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const softStyles = StyleSheet.create({
  label: { fontSize: 14, fontFamily: typography.headlineSm.fontFamily, textAlign: "right" },
  inputWrap: {
    borderRadius: 14,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
    overflow: "hidden",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
  },
  inputFlex: { flex: 1 },
  input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  errorText: { fontSize: 12, fontFamily: typography.body.fontFamily, textAlign: "right" },
});

interface VenueInputProps {
  venue: string;
  onChangeVenue: (v: string) => void;
  onBlur: () => void;
  hasError: boolean;
  accentColor: string;
  colors: ReturnType<typeof useColors>;
}

function VenueInput({ venue, onChangeVenue, onBlur, hasError, accentColor, colors }: VenueInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        softStyles.inputWrap,
        focused ? { backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: accentColor } : { borderWidth: 1, borderColor: "#E5E7EB" },
        { backgroundColor: focused ? colors.surfaceContainerHigh : colors.surfaceContainer ?? colors.surfaceContainerHigh },
        focused && !hasError && { borderBottomColor: accentColor, borderBottomWidth: 2 },
        hasError && { borderBottomColor: colors.destructive, borderBottomWidth: 2 },
        !focused && !hasError && { borderBottomWidth: 1, borderBottomColor: withAlpha(colors.mutedForeground ?? "#888", 0.2) },
      ]}
    >
      <View style={softStyles.iconRow}>
        <TextInput
          style={[softStyles.input, softStyles.inputFlex, { color: colors.onSurface, fontFamily: typography.bodyLg.fontFamily }]}
          value={venue}
          onChangeText={onChangeVenue}
          placeholder="اسم الملعب..."
          placeholderTextColor={colors.mutedForeground}
          textAlign="right"
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur(); }}
        />
        <Ionicons name="location-outline" size={18} color={focused ? accentColor : colors.mutedForeground} style={{ marginLeft: 12 }} />
      </View>
    </View>
  );
}

interface SoftInputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  accentColor: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "url";
  error?: string;
  label: string;
  colors: ReturnType<typeof useColors>;
  onBlur?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}

function SoftInput({ value, onChangeText, placeholder, accentColor, multiline, keyboardType, error, label, colors, onBlur, icon }: SoftInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[softStyles.label, { color: colors.onSurface }]}>{label}</Text>
      <View
        style={[
          softStyles.inputWrap,
          focused ? { backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: accentColor } : { borderWidth: 1, borderColor: "#E5E7EB" },
          { backgroundColor: focused ? colors.surfaceContainerHigh : colors.surfaceContainer ?? colors.surfaceContainerHigh },
          focused && !error && { borderBottomColor: accentColor, borderBottomWidth: 2 },
          !!error && { borderBottomColor: colors.destructive, borderBottomWidth: 2 },
          !focused && !error && { borderBottomWidth: 1, borderBottomColor: withAlpha(colors.mutedForeground ?? "#888", 0.2) },
        ]}
      >
        {icon ? (
          <View style={softStyles.iconRow}>
            <TextInput
              style={[
                softStyles.input,
                softStyles.inputFlex,
                { color: colors.onSurface, fontFamily: typography.bodyLg.fontFamily },
                multiline && { minHeight: 80, textAlignVertical: "top" },
              ]}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
              multiline={multiline}
              keyboardType={keyboardType ?? "default"}
              onFocus={() => setFocused(true)}
              onBlur={() => { setFocused(false); onBlur?.(); }}
            />
            <Ionicons name={icon} size={18} color={focused ? accentColor : colors.mutedForeground} style={{ marginLeft: 12 }} />
          </View>
        ) : (
          <TextInput
            style={[
              softStyles.input,
              { color: colors.onSurface, fontFamily: typography.bodyLg.fontFamily },
              multiline && { minHeight: 80, textAlignVertical: "top" },
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
            multiline={multiline}
            keyboardType={keyboardType ?? "default"}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
          />
        )}
      </View>
      {error ? <Text style={[softStyles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

export default function EditMatchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matches, updateMatch, user } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const match = matches.find((m) => m.id === id) as Match | undefined;

  const [title, setTitle] = useState(match?.title ?? "");
  const [venue, setVenue] = useState(match?.venue ?? "");
  const [venueUrl, setVenueUrl] = useState(match?.location ?? "");
  const [cost, setCost] = useState(String(match?.cost ?? 0));
  const [description, setDescription] = useState(match?.description ?? "");
  const [selectedTime, setSelectedTime] = useState(match?.time ?? "20:00");
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);

  const [maxPlayers, setMaxPlayers] = useState(match?.maxPlayers ?? 10);
  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "advanced" | null>(
    (match?.skillLevel as "beginner" | "intermediate" | "advanced" | null | undefined) ?? null
  );

  const getInitialDate = (): Date => {
    if (!match) return todayAtMidnight();
    const matchDate = match.date instanceof Date ? new Date(match.date) : new Date(match.date);
    matchDate.setHours(0, 0, 0, 0);
    const today = todayAtMidnight();
    return matchDate >= today ? matchDate : today;
  };
  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate);

  const [venueUrlError, setVenueUrlError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const sc = match ? sportColor(match.sport, colors) : colors.primary;

  if (!match) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center", backgroundColor: "transparent" }]}>
        <Text style={{ color: colors.onSurface, fontFamily: typography.headlineSm.fontFamily, fontSize: 16 }}>المباراة غير موجودة</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: sc, fontFamily: typography.headlineSm.fontFamily, fontSize: 14 }}>العودة</Text>
        </Pressable>
      </View>
    );
  }

  if (match.organizerId !== user?.id) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center", backgroundColor: "transparent" }]}>
        <Text style={{ color: colors.onSurface, fontFamily: typography.headlineSm.fontFamily, fontSize: 16 }}>غير مخوّل بتعديل هذه المباراة</Text>
      </View>
    );
  }

  function isValidUrl(url: string): boolean {
    if (!url.trim()) return true;
    try { new URL(url.trim()); return true; } catch { return false; }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "أدخل عنوان المباراة";
    if (!venue.trim()) e.venue = "أدخل اسم الملعب";
    if (isNaN(Number(cost)) || Number(cost) < 0) e.cost = "أدخل مبلغ صحيح";
    if (!isValidUrl(venueUrl)) {
      setVenueUrlError("رابط غير صحيح، تأكد من أنه يبدأ بـ https://");
      setErrors(e);
      return false;
    }
    setVenueUrlError("");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || saving) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);

    const dateStr: string = toYMD(selectedDate);

    const ok = await updateMatch(match!.id, {
      title: title.trim(),
      venue: venue.trim(),
      location: venueUrl.trim() || null,
      date: dateStr,
      time: selectedTime,
      cost: Number(cost),
      maxPlayers: match!.sport === "football" ? maxPlayers : match!.maxPlayers,
      description: description.trim() || undefined,
      skillLevel: skillLevel,
    });

    setSaving(false);
    if (ok) {
      router.back();
    } else {
      Alert.alert("خطأ", "تعذّر تحديث المباراة، يرجى المحاولة مجدداً");
    }
  }

  const isPadelOrTennis = match.sport === "padel" || match.sport === "tennis";

  return (
    <Animated.View style={[styles.container, { backgroundColor: "transparent", opacity: fadeAnim }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <GlassScreenHeader
          style={{
            paddingTop: topPad + 8,
            paddingBottom: 0,
            backgroundColor: "#EEF2FF",
          }}
        >
          <View style={styles.navHeader}>
            <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", backgroundColor: withAlpha(sc, 0.12) }]}>
              <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={22} color={sc} />
            </Pressable>
            <Text style={[styles.navTitle, { color: sc }]}>تعديل المباراة</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ paddingHorizontal: 0, paddingTop: 8, paddingBottom: 0 }}>
            <LiquidProgressBar progress={1} sport={match.sport} height={4} showShimmer />
          </View>
        </GlassScreenHeader>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24, paddingTop: 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: sc }]}>المعلومات الأساسية</Text>

            <SoftInput
              label="عنوان المباراة"
              value={title}
              onChangeText={(v) => { setTitle(v); if (v.trim()) setErrors((e) => ({ ...e, title: "" })); }}
              placeholder="مثال: مباراة الجمعة المعتادة"
              accentColor={sc}
              error={errors.title}
              colors={colors}
              icon="trophy-outline"
            />

            <SoftInput
              label="وصف (اختياري)"
              value={description}
              onChangeText={setDescription}
              placeholder="أضف تفاصيل إضافية..."
              accentColor={sc}
              multiline
              colors={colors}
              icon="document-text-outline"
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: sc }]}>الموعد والمكان</Text>

            <View style={{ gap: 6 }}>
              <Text style={[softStyles.label, { color: colors.onSurface }]}>التاريخ</Text>
              <DatePickerField
                value={selectedDate}
                onChange={setSelectedDate}
                accentColor={sc}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[softStyles.label, { color: colors.onSurface }]}>الوقت</Text>
              <View style={styles.timesGrid}>
                {TIMES.map((t) => (
                  <Pressable
                    key={t}
                    style={[
                      styles.timeChip,
                      selectedTime === t
                        ? { backgroundColor: sc }
                        : [{ borderWidth: 1, borderColor: "#E5E7EB" }, { backgroundColor: colors.surfaceContainerHigh }],
                    ]}
                    onPress={() => setSelectedTime(t)}
                  >
                    <Text style={[styles.timeText, { color: selectedTime === t ? "#fff" : colors.onSurfaceVariant }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[softStyles.label, { color: colors.onSurface }]}>الملعب</Text>
              <VenueInput
                venue={venue}
                onChangeVenue={(v) => {
                  setVenue(v);
                  setShowVenueSuggestions(v.length > 0);
                  if (v.trim()) setErrors((e) => ({ ...e, venue: "" }));
                }}
                onBlur={() => { if (!venue.trim()) setErrors((e) => ({ ...e, venue: "أدخل اسم الملعب" })); }}
                hasError={!!errors.venue}
                accentColor={sc}
                colors={colors}
              />
              {showVenueSuggestions && (
                <View style={[styles.suggestions, { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: colors.surfaceContainerLow, borderRadius: 16 }]}>
                  {VENUES.filter((v) => v.includes(venue)).map((v) => (
                    <Pressable key={v} style={styles.suggestion} onPress={() => { setVenue(v); setShowVenueSuggestions(false); }}>
                      <Ionicons name="location-outline" size={16} color={sc} />
                      <Text style={[styles.suggestionText, { color: colors.onSurface, fontFamily: typography.body.fontFamily }]}>{v}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {errors.venue && <Text style={[softStyles.errorText, { color: colors.destructive }]}>{errors.venue}</Text>}
            </View>

            <SoftInput
              label="رابط موقع الملعب (اختياري)"
              value={venueUrl}
              onChangeText={(v) => {
                setVenueUrl(v);
                if (!v.trim() || isValidUrl(v)) setVenueUrlError("");
              }}
              onBlur={() => {
                if (venueUrl.trim() && !isValidUrl(venueUrl)) {
                  setVenueUrlError("رابط غير صحيح، تأكد من أنه يبدأ بـ https://");
                }
              }}
              placeholder="https://maps.google.com/..."
              accentColor={sc}
              error={venueUrlError}
              colors={colors}
              keyboardType="url"
              icon="link-outline"
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: sc }]}>الإعدادات</Text>

            {match.sport === "football" && (
              <View style={{ gap: 6 }}>
                <Text style={[softStyles.label, { color: colors.onSurface }]}>عدد اللاعبين</Text>
                <View style={[styles.counterRow, { backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 18, padding: 8 }]}>
                  <Pressable
                    style={[styles.counterBtn, { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: colors.surfaceContainerLow }]}
                    onPress={() => setMaxPlayers((p) => Math.max(2, p - 2))}
                  >
                    <Ionicons name="remove" size={20} color={colors.onSurface} />
                  </Pressable>
                  <Text style={[styles.counterVal, { color: sc }]}>{maxPlayers}</Text>
                  <Pressable
                    style={[styles.counterBtn, { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: colors.surfaceContainerLow }]}
                    onPress={() => setMaxPlayers((p) => Math.min(22, p + 2))}
                  >
                    <Ionicons name="add" size={20} color={colors.onSurface} />
                  </Pressable>
                </View>
              </View>
            )}

            {isPadelOrTennis && (
              <View style={[styles.fixedBadge, { backgroundColor: withAlpha(sc, 0.1) }]}>
                <Ionicons name="information-circle-outline" size={16} color={sc} />
                <Text style={[styles.fixedBadgeText, { color: sc }]}>
                  عدد اللاعبين ثابت: {match.maxPlayers} لاعب
                </Text>
              </View>
            )}

            <View style={{ gap: 8 }}>
              <Text style={[softStyles.label, { color: colors.onSurface }]}>مستوى اللاعب</Text>
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
                          ? { backgroundColor: withAlpha(sc, 0.15), borderColor: sc, borderWidth: 1.5 }
                          : { backgroundColor: colors.surfaceContainerHigh },
                      ]}
                      onPress={() => setSkillLevel(lvl.key)}
                    >
                      <Text style={styles.skillChipEmoji}>{lvl.icon}</Text>
                      <Text style={[styles.skillChipText, { color: isSelected ? sc : colors.onSurface }]}>{lvl.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <SoftInput
              label="التكلفة لكل لاعب (ر.س)"
              value={cost}
              onChangeText={(v) => {
                setCost(v);
                if (!isNaN(Number(v)) && Number(v) >= 0) setErrors((e) => ({ ...e, cost: "" }));
              }}
              placeholder="0"
              accentColor={sc}
              keyboardType="numeric"
              error={errors.cost}
              colors={colors}
              icon="cash-outline"
              onBlur={() => {
                if (isNaN(Number(cost)) || Number(cost) < 0) setErrors((e) => ({ ...e, cost: "أدخل مبلغ صحيح" }));
              }}
            />
          </View>

          <SportGradientButton
            label={saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            gradientStart={sc}
            gradientEnd={sc + "AA"}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navTitle: { fontSize: 18, fontFamily: typography.headlineSm.fontFamily, lineHeight: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  scroll: { paddingHorizontal: 20, gap: 0 },

  section: { gap: 16, paddingBottom: 20 },
  sectionTitle: { fontSize: 17, fontFamily: typography.headlineSm.fontFamily, textAlign: "right" },

  timesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  timeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  timeText: { fontSize: 14, fontFamily: typography.bodyLg.fontFamily },

  suggestions: { marginTop: 4, overflow: "hidden" },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, justifyContent: "flex-end" },
  suggestionText: { fontSize: 14 },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 16, justifyContent: "center" },
  counterBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  counterVal: { fontSize: 22, fontFamily: typography.headlineSm.fontFamily, minWidth: 40, textAlign: "center" },

  fixedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: "flex-end",
  },
  fixedBadgeText: { fontSize: 14, fontFamily: typography.bodyLg.fontFamily },

  skillChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  skillChipEmoji: { fontSize: 15 },
  skillChipText: { fontSize: 13, fontFamily: typography.headlineSm.fontFamily },
});
