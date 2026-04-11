import { useApp, SportType, SkillLevel, Player } from "@/context/AppContext";
import { api, getSavedUserId } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { LevelPickerSheet, getLevelLabel } from "@/components/LevelPickerSheet";
import { FootballIcon, PadelIcon, TennisIcon } from "@/components/icons/SportIcons";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassInput } from "@/components/glass/GlassInput";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SPORTS: {
  key: SportType;
  label: string;
  icon: React.FC<{ color?: string; size?: number }>;
  color: string;
  bg: string;
}[] = [
  { key: "football", label: "كرة القدم", icon: FootballIcon, color: "#2E7D32", bg: "#E8F5E9" },
  { key: "padel", label: "بادل", icon: PadelIcon, color: "#0288D1", bg: "#E3F2FD" },
  { key: "tennis", label: "تنس", icon: TennisIcon, color: "#EF6C00", bg: "#FFF3E0" },
];

const FOOTBALL_LEVELS: SkillLevel[] = ["مبتدئ", "متوسط", "محترف"];

function numericLevelToSkillLevel(value: number): SkillLevel {
  if (value <= 2.5) return "مبتدئ";
  if (value <= 4.0) return "متوسط";
  return "محترف";
}

export default function ProfileSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setUser, refreshProfile } = useApp();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState("");
  const [selectedSports, setSelectedSports] = useState<SportType[]>([]);
  const [skillLevels, setSkillLevels] = useState<Partial<Record<SportType, SkillLevel>>>({});
  const [numericLevels, setNumericLevels] = useState<Partial<Record<SportType, number>>>({});
  const [levelPickerSport, setLevelPickerSport] = useState<SportType | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const sportHasLevel = (s: SportType) => {
    if (s === "football") return !!skillLevels[s];
    return !!numericLevels[s];
  };

  const step0Valid = nickname.trim().length >= 2;
  const step1Valid =
    selectedSports.length > 0 && selectedSports.every((s) => sportHasLevel(s));
  const canContinue = step === 0 ? step0Valid : step1Valid && !saving;

  function toggleSport(sport: SportType) {
    setSelectedSports((prev) => {
      if (prev.includes(sport)) {
        return prev.filter((s) => s !== sport);
      } else {
        if (sport === "padel" || sport === "tennis") {
          setTimeout(() => setLevelPickerSport(sport), 300);
        }
        return [...prev, sport];
      }
    });
  }

  function goToStep(nextStep: number) {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: nextStep > step ? -40 : 40,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(nextStep > step ? 40 : -40);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  async function handleContinue() {
    if (step === 0) {
      goToStep(1);
      return;
    }
    setSaving(true);
    const sportProfiles: Partial<
      Record<
        SportType,
        {
          sport: SportType;
          skillLevel: SkillLevel;
          skillLevelNumeric?: number | null;
          position: string[];
        }
      >
    > = {};
    selectedSports.forEach((s) => {
      const numeric = numericLevels[s] ?? null;
      const textLevel =
        skillLevels[s] ?? (numeric ? numericLevelToSkillLevel(numeric) : "متوسط");
      sportProfiles[s] = {
        sport: s,
        skillLevel: textLevel,
        skillLevelNumeric: numeric,
        position: [],
      };
    });
    const savedUserId = await getSavedUserId();

    const primarySport = selectedSports[0];
    const primaryNumeric = numericLevels[primarySport ?? "football"] ?? null;
    const primarySkillLevel =
      skillLevels[primarySport ?? "football"] ??
      (primaryNumeric ? numericLevelToSkillLevel(primaryNumeric) : undefined);

    const apiSportProfiles: Record<
      string,
      {
        sport: string;
        skillLevel: string;
        skillLevelNumeric?: number | null;
        position: string;
      }
    > = {};
    selectedSports.forEach((s) => {
      const sp = sportProfiles[s]!;
      apiSportProfiles[s] = {
        sport: s,
        skillLevel: sp.skillLevel,
        skillLevelNumeric: sp.skillLevelNumeric ?? null,
        position: "",
      };
    });

    setSaveError("");
    let apiSucceeded = false;
    try {
      await api.updateProfile({
        name: nickname.trim(),
        sports: selectedSports,
        skillLevel: primarySkillLevel,
        sportProfiles: apiSportProfiles,
      });
      apiSucceeded = true;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "تعذّر حفظ البيانات. تحقق من اتصالك وحاول مرة أخرى.";
      setSaveError(msg);
      setSaving(false);
      return;
    }

    const userObj: Player = {
      id: savedUserId ?? "",
      nickname: nickname.trim(),
      sports: selectedSports,
      sportProfiles,
      matchesPlayed: 0,
      reliability: null,
    };
    setUser(userObj);
    setSaving(false);
    if (apiSucceeded) {
      refreshProfile().catch(() => {});
    }
    router.push("/position-selector");
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.bgAccent} />

      <View
        style={[
          styles.topBar,
          { paddingTop: topPad + 16, paddingHorizontal: 24 },
        ]}
      >
        <Pressable
          onPress={() => (step > 0 ? goToStep(step - 1) : router.back())}
          style={[styles.backBtn, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border }]}
        >
          <Ionicons
            name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
            size={20}
            color={colors.onSurface}
          />
        </Pressable>
        <OnboardingProgress
          currentStep={step + 1}
          totalSteps={4}
          color={colors.primary}
        />
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: botPad + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.stepContent,
            { transform: [{ translateX: slideAnim }], opacity: fadeAnim },
          ]}
        >
          {step === 0 ? (
            <>
              <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainer, borderColor: colors.surfaceContainerHighest }]}>
                  <Ionicons name="person" size={36} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.onSurface }]}>أنشئ ملفك الرياضي</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  ليعرف زملاؤك من أنت في الملعب
                </Text>
              </View>

              <GlassCard variant="medium" padding="md">
                <View style={styles.section}>
                  <Text style={[styles.label, { color: colors.primary }]}>الاسم المستعار</Text>
                  <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>
                    الاسم الذي سيراه اللاعبون الآخرون
                  </Text>
                  <GlassInput
                    sport="football"
                    label="مثال: الصخرة، الغزال، الحارس..."
                    value={nickname}
                    onChangeText={(t) => {
                      setNickname(t);
                      setSaveError("");
                    }}
                    textAlign="right"
                    maxLength={20}
                  />
                  <View style={styles.nicknameHintRow}>
                    <Text
                      style={[
                        styles.nicknameHint,
                        {
                          color:
                            nickname.trim().length > 0 &&
                            nickname.trim().length < 2
                              ? colors.warning
                              : colors.mutedForeground,
                        },
                      ]}
                    >
                      {nickname.trim().length > 0 && nickname.trim().length < 2
                        ? "الاسم قصير جداً (٢ أحرف على الأقل)"
                        : `${nickname.trim().length}/20`}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.onSurface }]}>اختر رياضاتك</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  يمكنك اختيار أكثر من رياضة وتحديد مستواك
                </Text>
              </View>

              <GlassCard variant="light" padding="md">
                <View style={styles.sportsRow}>
                  {SPORTS.map((sport) => {
                    const selected = selectedSports.includes(sport.key);
                    return (
                      <Pressable
                        key={sport.key}
                        style={[
                          styles.sportChip,
                          {
                            backgroundColor: selected ? sport.bg : colors.background,
                            borderColor: selected ? sport.color : colors.border,
                            borderWidth: selected ? 2 : 1,
                          },
                        ]}
                        onPress={() => toggleSport(sport.key)}
                      >
                        <View
                          style={[
                            styles.sportIconBubble,
                            {
                              backgroundColor: selected
                                ? sport.color + "22"
                                : colors.surfaceContainerLow,
                            },
                          ]}
                        >
                          <sport.icon
                            size={22}
                            color={selected ? sport.color : colors.mutedForeground}
                          />
                        </View>
                        <Text
                          style={[
                            styles.sportChipText,
                            {
                              color: selected ? sport.color : colors.onSurface,
                            },
                          ]}
                        >
                          {sport.label}
                        </Text>
                        {selected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={sport.color}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </GlassCard>

              {selectedSports.map((sportKey) => {
                const sport = SPORTS.find((s) => s.key === sportKey)!;
                const isRacket = sportKey === "padel" || sportKey === "tennis";

                if (isRacket) {
                  const numericValue = numericLevels[sportKey] ?? null;
                  const hasLevel = numericValue !== null;
                  const levelLabel = hasLevel
                    ? getLevelLabel(numericValue, sportKey)
                    : null;

                  return (
                    <GlassCard
                      key={sportKey}
                      variant="dark"
                      padding="md"
                      style={{ borderColor: sport.color + "40", borderWidth: 1.5 }}
                    >
                      <View style={styles.section}>
                        <Text style={[styles.label, { color: sport.color }]}>
                          مستواك في {sport.label}
                        </Text>
                        <Pressable
                          style={[
                            styles.levelPickerBtn,
                            {
                              backgroundColor: hasLevel
                                ? sport.color + "15"
                                : colors.background,
                              borderColor: hasLevel ? sport.color : colors.border,
                              borderWidth: hasLevel ? 2 : 1,
                            },
                          ]}
                          onPress={() => setLevelPickerSport(sportKey)}
                        >
                          {hasLevel ? (
                            <>
                              <Ionicons
                                name="star"
                                size={16}
                                color={sport.color}
                              />
                              <Text
                                style={[
                                  styles.levelPickerBtnText,
                                  { color: sport.color },
                                ]}
                              >
                                {levelLabel}
                              </Text>
                              <Ionicons
                                name="chevron-back"
                                size={14}
                                color={sport.color}
                              />
                            </>
                          ) : (
                            <>
                              <Ionicons
                                name="trophy-outline"
                                size={16}
                                color={colors.mutedForeground}
                              />
                              <Text
                                style={[
                                  styles.levelPickerBtnText,
                                  { color: colors.mutedForeground },
                                ]}
                              >
                                اضغط لاختيار مستواك
                              </Text>
                              <Ionicons
                                name="chevron-back"
                                size={14}
                                color={colors.mutedForeground}
                              />
                            </>
                          )}
                        </Pressable>
                      </View>
                    </GlassCard>
                  );
                }

                return (
                  <GlassCard
                    key={sportKey}
                    variant="dark"
                    padding="md"
                    style={{ borderColor: sport.color + "40", borderWidth: 1.5 }}
                  >
                    <View style={styles.section}>
                      <Text style={[styles.label, { color: sport.color }]}>
                        مستواك في {sport.label}
                      </Text>
                      <View style={styles.levelsRow}>
                        {FOOTBALL_LEVELS.map((level) => {
                          const active = skillLevels[sportKey] === level;
                          return (
                            <Pressable
                              key={level}
                              style={[
                                styles.levelChip,
                                {
                                  backgroundColor: active
                                    ? sport.color + "18"
                                    : colors.background,
                                  borderColor: active ? sport.color : colors.border,
                                  borderWidth: active ? 2 : 1,
                                },
                              ]}
                              onPress={() =>
                                setSkillLevels((prev) => ({
                                  ...prev,
                                  [sportKey]: level,
                                }))
                              }
                            >
                              <Text
                                style={[
                                  styles.levelText,
                                  {
                                    color: active ? sport.color : colors.mutedForeground,
                                  },
                                ]}
                              >
                                {level}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </>
          )}
        </Animated.View>

        {!!saveError && (
          <View style={[styles.saveErrorBox, { backgroundColor: colors.warning + "1A" }]}>
            <Ionicons
              name="cloud-offline-outline"
              size={16}
              color={colors.warning}
            />
            <Text style={[styles.saveErrorText, { color: colors.warning }]}>{saveError}</Text>
          </View>
        )}

        {saving ? (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.savingText, { color: colors.mutedForeground }]}>جاري الحفظ...</Text>
          </View>
        ) : (
          <GlassButton
            label={step === 0 ? "التالي: اختيار الرياضات" : "اختيار المراكز"}
            sport="football"
            onPress={handleContinue}
            disabled={!canContinue}
            size="lg"
            style={styles.btn}
          />
        )}
      </ScrollView>

      {levelPickerSport &&
        (levelPickerSport === "padel" || levelPickerSport === "tennis") && (
          <LevelPickerSheet
            visible={!!levelPickerSport}
            sport={levelPickerSport}
            currentValue={numericLevels[levelPickerSport] ?? null}
            onClose={() => setLevelPickerSport(null)}
            onConfirm={(value) => {
              setNumericLevels((prev) => ({
                ...prev,
                [levelPickerSport]: value,
              }));
              setSkillLevels((prev) => ({
                ...prev,
                [levelPickerSport]: numericLevelToSkillLevel(value),
              }));
            }}
          />
        )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgAccent: {
    position: "absolute",
    bottom: 100,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(193, 244, 34, 0.06)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  scroll: { paddingHorizontal: 24, gap: 20 },
  stepContent: { gap: 20 },
  header: { alignItems: "center", gap: 10, paddingTop: 8 },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
    ...Platform.select({
      web: { boxShadow: "0px 6px 20px rgba(44,84,232,0.14)" },
      default: {
        shadowColor: "#2C54E8",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
  },
  section: { gap: 10 },
  label: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },
  sublabel: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
    marginTop: -4,
  },
  nicknameHintRow: { alignItems: "flex-end", marginTop: -4 },
  nicknameHint: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  sportsRow: { gap: 12 },
  sportChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
  },
  sportIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sportChipText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },
  levelsRow: { flexDirection: "row", gap: 10 },
  levelChip: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 50,
    alignItems: "center",
  },
  levelText: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },
  levelPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 50,
  },
  levelPickerBtnText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "right",
  },
  saveErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveErrorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "right",
  },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  savingText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
  },
  btn: {
    width: "100%",
    marginTop: 8,
  },
});
