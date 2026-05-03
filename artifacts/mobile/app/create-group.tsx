import { useApp, SportType } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

import { getSportTheme } from "@/constants/sportTheme";
import { typography } from "@/constants/typography";
import { SportGradientButton } from "@/components/SportGradientButton";
import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import {
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


type SportOption = {
  key: SportType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  bgLight: string;
};

const SPORT_OPTIONS: SportOption[] = [
  {
    key: "football",
    label: "sports.football", // We will translate this below
    icon: "football-outline",
    color: getSportTheme("football").primary,
    gradientStart: getSportTheme("football").primary,
    gradientEnd: getSportTheme("football").primaryLight,
    bgLight: getSportTheme("football").pillBackground,
  },
  {
    key: "padel",
    label: "sports.padel",
    icon: "tennisball-outline",
    color: getSportTheme("padel").primary,
    gradientStart: getSportTheme("padel").primary,
    gradientEnd: getSportTheme("padel").primaryLight,
    bgLight: getSportTheme("padel").pillBackground,
  },
  {
    key: "tennis",
    label: "sports.tennis",
    icon: "tennisball",
    color: getSportTheme("tennis").primary,
    gradientStart: getSportTheme("tennis").primary,
    gradientEnd: getSportTheme("tennis").primaryLight,
    bgLight: getSportTheme("tennis").pillBackground,
  },
];

const SPORT_INDICES: Record<SportType, number> = { football: 0, padel: 1, tennis: 2 };

function validateName(val: string, t: any): string {
  if (!val.trim()) return t("createGroup.nameRequired");
  if (val.trim().length < 3) return t("createGroup.nameMinLength");
  return "";
}

function validateDescription(val: string, t: any): string {
  if (val.trim() && val.trim().length < 10) return t("createGroup.descMinLength");
  return "";
}

export default function CreateGroupScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createGroup, user } = useApp();
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [description, setDescription] = useState("");
  const [descTouched, setDescTouched] = useState(false);
  const [descFocused, setDescFocused] = useState(false);
  const [sport, setSport] = useState<SportType>("football");
  const [isPublic, setIsPublic] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const sportOpt = SPORT_OPTIONS.find((s) => s.key === sport)!;

  const nameError = nameTouched ? validateName(name, t) : "";
  const descError = descTouched ? validateDescription(description, t) : "";

  const sportAnim = useRef(new Animated.Value(0)).current;

  const cardScales = useRef(
    Object.fromEntries(SPORT_OPTIONS.map((s) => [s.key, new Animated.Value(s.key === "football" ? 1 : 0.97)])) as Record<SportType, Animated.Value>
  ).current;

  const animatedAccentBg = sportAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [SPORT_OPTIONS[0].bgLight, SPORT_OPTIONS[1].bgLight, SPORT_OPTIONS[2].bgLight],
  });

  const animatedToggleBg = sportAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [SPORT_OPTIONS[0].bgLight + "60", SPORT_OPTIONS[1].bgLight + "60", SPORT_OPTIONS[2].bgLight + "60"],
  });

  function handleSelectSport(key: SportType) {
    if (key === sport) return;
    Haptics.selectionAsync();
    const idx = SPORT_INDICES[key];
    Animated.timing(sportAnim, {
      toValue: idx,
      duration: 300,
      useNativeDriver: false,
    }).start();
    SPORT_OPTIONS.forEach((s) => {
      Animated.spring(cardScales[s.key], {
        toValue: s.key === key ? 1 : 0.97,
        useNativeDriver: true,
        friction: 7,
        tension: 120,
      }).start();
    });
    setSport(key);
  }

  function validateAll(): boolean {
    setNameTouched(true);
    setDescTouched(true);
    return !validateName(name, t) && !validateDescription(description, t);
  }

  async function handleCreate() {
    if (!validateAll() || submitting) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const newGroupId = await createGroup({
        name: name.trim(),
        sport,
        description: description.trim(),
        memberCount: 1,
        adminId: user?.id ?? "",
        adminName: user?.nickname ?? t("createMatch.unknownLabel"),
        isPublic,
        nextMatch: null,
      });
      if (!newGroupId) {
        setSubmitError(t("createGroup.createFailed"));
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/group-detail?id=${newGroupId}` as Parameters<typeof router.replace>[0]);
    } catch {
      setSubmitError(t("createGroup.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: "transparent" }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <GlassScreenHeader style={{ paddingTop: topPad + 8, paddingBottom: 8 }}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={[typography.displayMd, styles.title, { color: colors.onSurface }]}>{t("createGroup.title")}</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.background, borderWidth: 0 }, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </GlassScreenHeader>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sport Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>{t("createGroup.sport")}</Text>
          <View style={styles.sportCardsRow}>
            {SPORT_OPTIONS.map((s) => {
              const selected = sport === s.key;
              return (
                <Animated.View
                  key={s.key}
                  style={[styles.sportCardWrapper, { transform: [{ scale: cardScales[s.key] }] }]}
                >
                  <Pressable
                    onPress={() => handleSelectSport(s.key)}
                    style={[styles.sportCard, { borderWidth: selected ? 2 : 0, borderColor: selected ? s.color : "transparent" }]}
                  >
                    {selected ? (
                      <View style={[styles.sportCardFill, { backgroundColor: s.color }]}>
                        <View style={styles.sportCardSelectedCheck}>
                          <Ionicons name="checkmark-circle" size={14} color="#fff" />
                        </View>
                        <View style={styles.sportIconCircleSelected}>
                          <Ionicons name={s.icon} size={28} color="#fff" />
                        </View>
                        <Text style={styles.sportCardLabelSelected}>{t(s.label)}</Text>
                      </View>
                    ) : (
                      <View style={[styles.sportCardFill, { backgroundColor: s.bgLight }]}>
                        <View style={[styles.sportIconCircle, { backgroundColor: "#fff" }]}>
                          <Ionicons name={s.icon} size={26} color={s.color} />
                        </View>
                        <Text style={[styles.sportCardLabel, { color: s.color }]}>{t(s.label)}</Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Group Name Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>{t("createGroup.groupName")}</Text>
          <Animated.View
            style={[
              styles.softInputWrap,
              {
                borderBottomColor: nameFocused ? sportOpt.color : (nameError ? colors.destructive : colors.mutedForeground + "40"),
                borderBottomWidth: nameFocused ? 2 : 1,
                backgroundColor: nameFocused ? animatedAccentBg : "transparent",
              },
            ]}
          >
            <TextInput
              style={[styles.softInput, { color: colors.onSurface, fontFamily: typography.bodyLg.fontFamily }]}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameTouched(true);
              }}
              onFocus={() => setNameFocused(true)}
              onBlur={() => {
                setNameFocused(false);
                setNameTouched(true);
              }}
              placeholder={t("createGroup.groupNamePlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
              maxLength={40}
            />
            {nameFocused && (
              <Ionicons name="create-outline" size={18} color={sportOpt.color} style={styles.inputIcon} />
            )}
          </Animated.View>
          {nameError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={13} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{nameError}</Text>
            </View>
          ) : null}
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
            <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>{t("createGroup.description")}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: typography.body.fontFamily }}>({t("common.optional")})</Text>
          </View>
          <Animated.View
            style={[
              styles.softTextareaWrap,
              {
                borderBottomColor: descFocused ? sportOpt.color : (descError ? colors.destructive : colors.mutedForeground + "40"),
                borderBottomWidth: descFocused ? 2 : 1,
                backgroundColor: descFocused ? animatedAccentBg : "transparent",
              },
            ]}
          >
            <TextInput
              style={[styles.softTextarea, { color: colors.onSurface, fontFamily: typography.body.fontFamily }]}
              value={description}
              onChangeText={(t) => {
                setDescription(t);
                setDescTouched(true);
              }}
              onFocus={() => setDescFocused(true)}
              onBlur={() => {
                setDescFocused(false);
                setDescTouched(true);
              }}
              placeholder={t("createGroup.descriptionPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
          </Animated.View>
          {descError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={13} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{descError}</Text>
            </View>
          ) : null}
          <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
            {description.length}/200
          </Text>
        </View>

        {/* Public/Private Selector */}
        <View style={[styles.toggleCard, { backgroundColor: colors.background, borderWidth: 0 }]}>
          <Text style={[styles.toggleTitle, { color: colors.onSurface, marginBottom: 4 }]}>{t("createGroup.visibility")}</Text>
          <View style={styles.visibilityRow}>
            <Pressable
              style={({ pressed }) => [
                styles.visibilityBtn,
                isPublic
                  ? { backgroundColor: sportOpt.color, borderColor: sportOpt.color }
                  : { backgroundColor: colors.muted, borderColor: "transparent" },
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
              onPress={() => {
                if (!isPublic) {
                  Haptics.selectionAsync();
                  setIsPublic(true);
                }
              }}
            >
              <Ionicons name="globe-outline" size={16} color={isPublic ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.visibilityBtnText, { color: isPublic ? "#fff" : colors.mutedForeground }]}>
                {t("createMatch.public")}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.visibilityBtn,
                !isPublic
                  ? { backgroundColor: sportOpt.color, borderColor: sportOpt.color }
                  : { backgroundColor: colors.muted, borderColor: "transparent" },
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
              onPress={() => {
                if (isPublic) {
                  Haptics.selectionAsync();
                  setIsPublic(false);
                }
              }}
            >
              <Ionicons name="lock-closed-outline" size={16} color={!isPublic ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.visibilityBtnText, { color: !isPublic ? "#fff" : colors.mutedForeground }]}>
                {t("createMatch.private")}
              </Text>
            </Pressable>
          </View>
          <Animated.View style={[styles.toggleInfoRow, { backgroundColor: animatedToggleBg, borderRadius: 12 }]}>
            <Ionicons
              name={isPublic ? "globe-outline" : "lock-closed-outline"}
              size={16}
              color={isPublic ? sportOpt.color : colors.mutedForeground}
            />
            <Text style={[styles.toggleInfoText, { color: isPublic ? sportOpt.color : colors.mutedForeground }]}>
              {isPublic ? t("createGroup.publicGroup") : t("createGroup.privateGroup")}
            </Text>
          </Animated.View>
        </View>

        {/* Submit error */}
        {submitError ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{submitError}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <SportGradientButton
          label={submitting ? t("createGroup.creating") : t("createGroup.createBtn")}
          gradientStart={sportOpt.gradientStart}
          gradientEnd={sportOpt.gradientEnd}
          onPress={handleCreate}
          loading={submitting}
          disabled={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { textAlign: "center" },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 20, gap: 22 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 14, fontFamily: typography.headlineSm.fontFamily, textAlign: "right" },

  /* Sport Cards */
  sportCardsRow: { flexDirection: "row", gap: 10 },
  sportCardWrapper: { flex: 1 },
  sportCard: { borderRadius: 18, overflow: "hidden", height: 105 },
  sportCardFill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 10 },
  sportCardSelectedCheck: { position: "absolute", top: 8, left: 8 },
  sportIconCircleSelected: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  sportIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  sportCardLabel: { fontSize: 12, fontFamily: typography.headlineSm.fontFamily },
  sportCardLabelSelected: { fontSize: 12, fontFamily: typography.headlineSm.fontFamily, color: "#fff" },

  /* Soft Focus Inputs */
  softInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderBottomWidth: 1,
  },
  softInput: { flex: 1, fontSize: 16, paddingVertical: 10, textAlign: "right" },
  inputIcon: { marginLeft: 4 },
  softTextareaWrap: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderBottomWidth: 1,
  },
  softTextarea: { fontSize: 15, minHeight: 100, paddingVertical: 10, textAlign: "right" },
  charCount: { fontSize: 11, fontFamily: typography.body.fontFamily, textAlign: "left" },

  /* Error */
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "flex-end" },
  errorText: { fontSize: 12, fontFamily: typography.body.fontFamily, textAlign: "right" },

  /* Toggle Card */
  toggleCard: { borderRadius: 20, padding: 16, gap: 12 },
  toggleTitle: { fontSize: 15, fontFamily: typography.headlineSm.fontFamily, textAlign: "right" },
  visibilityRow: { flexDirection: "row", gap: 10 },
  visibilityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  visibilityBtnText: { fontSize: 14, fontFamily: typography.headlineSm.fontFamily },
  toggleInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10 },
  toggleInfoText: { flex: 1, fontSize: 12, fontFamily: typography.body.fontFamily, textAlign: "right" },
});
