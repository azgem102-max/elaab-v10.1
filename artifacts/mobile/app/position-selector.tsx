import { useApp, SportType, Player } from "@/context/AppContext";
import { api } from "@/services/api";

import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { FootballIcon, PadelIcon, TennisIcon } from "@/components/icons/SportIcons";
import { GlassCard } from "@/components/glass/GlassCard";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SPORT_COLORS: Record<SportType, string> = {
  football: "#2E7D32",
  padel: "#0288D1",
  tennis: "#EF6C00",
};

const SPORT_BG: Record<SportType, string> = {
  football: "#E8F5E9",
  padel: "#E3F2FD",
  tennis: "#FFF3E0",
};

const SPORT_LABELS: Record<SportType, string> = {
  football: "كرة القدم",
  padel: "بادل",
  tennis: "تنس",
};

const SPORT_ICONS: Record<SportType, React.FC<{ color?: string; size?: number }>> = {
  football: FootballIcon,
  padel: PadelIcon,
  tennis: TennisIcon,
};

interface PositionDef {
  key: string;
  label: string;
  icon?: string;
}

const POSITIONS: Record<SportType, PositionDef[]> = {
  football: [
    { key: "حارس", label: "حارس المرمى", icon: "shield-outline" },
    { key: "مدافع", label: "مدافع", icon: "body-outline" },
    { key: "وسط", label: "لاعب وسط", icon: "swap-horizontal-outline" },
    { key: "مهاجم", label: "مهاجم", icon: "flash-outline" },
  ],
  padel: [
    { key: "يمين", label: "الجانب الأيمن" },
    { key: "يسار", label: "الجانب الأيسر" },
  ],
  tennis: [
    { key: "خط الخلفية", label: "خط الخلفية", icon: "arrow-back-outline" },
    { key: "الشبكة", label: "لاعب الشبكة", icon: "grid-outline" },
  ],
};

function PadelCourt({
  selectedPositions,
  onToggle,
  color,
}: {
  selectedPositions: string[];
  onToggle: (key: string) => void;
  color: string;
}) {
  const rightSelected = selectedPositions.includes("يمين");
  const leftSelected = selectedPositions.includes("يسار");

  return (
    <View style={courtStyles.wrapper}>
      <View style={[courtStyles.court, { borderColor: color + "60" }]}>
        <View style={courtStyles.opponentHalf}>
          <View style={courtStyles.opponentNet} />
          <View style={courtStyles.opponentDivider} />
          <Text style={courtStyles.opponentLabel}>الخصم</Text>
        </View>

        <View style={[courtStyles.netRow, { backgroundColor: color }]}>
          <View style={courtStyles.netLine} />
          <View style={courtStyles.netPost} />
          <View style={courtStyles.netPost} />
          <View style={courtStyles.netLine} />
        </View>

        <View style={courtStyles.playerHalf}>
          <Pressable
            style={[
              courtStyles.zone,
              courtStyles.zoneLeft,
              leftSelected
                ? { backgroundColor: color + "28", borderColor: color, borderWidth: 2.5 }
                : { backgroundColor: "#F8F9FA", borderColor: "#DEE2E6", borderWidth: 1.5 },
            ]}
            onPress={() => onToggle("يسار")}
          >
            {leftSelected && (
              <View style={[courtStyles.checkBadge, { backgroundColor: color }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
            <Ionicons
              name="person"
              size={22}
              color={leftSelected ? color : "#ADB5BD"}
            />
            <Text style={[courtStyles.zoneLabel, { color: leftSelected ? color : "#6C757D" }]}>
              الأيسر
            </Text>
          </Pressable>

          <View style={[courtStyles.halfDivider, { backgroundColor: color + "40" }]} />

          <Pressable
            style={[
              courtStyles.zone,
              courtStyles.zoneRight,
              rightSelected
                ? { backgroundColor: color + "28", borderColor: color, borderWidth: 2.5 }
                : { backgroundColor: "#F8F9FA", borderColor: "#DEE2E6", borderWidth: 1.5 },
            ]}
            onPress={() => onToggle("يمين")}
          >
            {rightSelected && (
              <View style={[courtStyles.checkBadge, { backgroundColor: color }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
            <Ionicons
              name="person"
              size={22}
              color={rightSelected ? color : "#ADB5BD"}
            />
            <Text style={[courtStyles.zoneLabel, { color: rightSelected ? color : "#6C757D" }]}>
              الأيمن
            </Text>
          </Pressable>
        </View>
      </View>
      <Text style={courtStyles.hint}>اضغط لاختيار جانبك — يمكن اختيار الاثنين</Text>
    </View>
  );
}

const courtStyles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: 12 },
  court: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2.5,
    backgroundColor: "#E8F5E9",
  },
  opponentHalf: {
    height: 90,
    backgroundColor: "#ECEFF1",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  opponentNet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "#90A4AE",
  },
  opponentDivider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1.5,
    backgroundColor: "#B0BEC5",
  },
  opponentLabel: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#90A4AE",
  },
  netRow: {
    height: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  netLine: { flex: 1, height: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  netPost: {
    width: 8,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
  },
  playerHalf: {
    height: 130,
    flexDirection: "row",
    backgroundColor: "#C8E6C9",
  },
  zone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 0,
    position: "relative",
  },
  zoneLeft: { borderRightWidth: 0 },
  zoneRight: { borderLeftWidth: 0 },
  halfDivider: {
    width: 1.5,
    alignSelf: "stretch",
  },
  zoneLabel: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#6C757D",
    textAlign: "center",
  },
});

export default function PositionSelectorScreen() {
  const insets = useSafeAreaInsets();
  const { user, completeOnboarding } = useApp();
  const sports = user?.sports ?? [];
  const [step, setStep] = useState(0);
  const [positions, setPositions] = useState<Partial<Record<SportType, string[]>>>({});
  const [finishing, setFinishing] = useState(false);
  const [saveError, setSaveError] = useState("");
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function navigateAfterOnboarding() {
    const pendingInviteToken = await AsyncStorage.getItem(
      STORAGE_KEYS.PENDING_INVITE_TOKEN
    );
    if (pendingInviteToken) {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_INVITE_TOKEN);
      router.replace({
        pathname: "/invite/[token]",
        params: { token: pendingInviteToken },
      });
    } else {
      router.replace("/(tabs)");
    }
  }

  useEffect(() => {
    if (sports.length === 0) {
      navigateAfterOnboarding();
    }
  }, [sports.length]);

  if (sports.length === 0) {
    return null;
  }

  const currentSport = sports[step];
  const sc = SPORT_COLORS[currentSport];
  const sbg = SPORT_BG[currentSport];
  const sportPositions = POSITIONS[currentSport];
  const isLast = step === sports.length - 1;
  const selectedCount = positions[currentSport]?.length ?? 0;

  function animateStep(direction: "forward" | "back") {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction === "forward" ? -40 : 40,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      slideAnim.setValue(direction === "forward" ? 40 : -40);
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

  async function finishOnboarding(updatedUser: Player) {
    setFinishing(true);
    setSaveError("");
    const apiSportProfiles: Record<
      string,
      { sport: string; skillLevel: string; position: string }
    > = {};
    updatedUser.sports.forEach((s) => {
      const sp = updatedUser.sportProfiles[s];
      apiSportProfiles[s] = {
        sport: s,
        skillLevel: sp?.skillLevel ?? "متوسط",
        position: (sp?.position ?? []).join(","),
      };
    });
    let saved = true;
    try {
      await api.updateProfile({
        sports: updatedUser.sports,
        sportProfiles: apiSportProfiles,
      });
    } catch {
      saved = false;
    }
    if (!saved) {
      setSaveError("تعذّر حفظ البيانات على الخادم. ستُحفظ محلياً.");
      setFinishing(false);
      await completeOnboarding(updatedUser);
      setTimeout(() => navigateAfterOnboarding(), 1500);
      return;
    }
    await completeOnboarding(updatedUser);
    navigateAfterOnboarding();
  }

  async function handleNext() {
    if (finishing) return;
    if (!isLast) {
      animateStep("forward");
      setTimeout(() => setStep((s) => s + 1), 150);
    } else {
      if (user) {
        const updatedProfiles = { ...user.sportProfiles };
        sports.forEach((s) => {
          const posArr = positions[s] ?? [];
          if (updatedProfiles[s]) {
            updatedProfiles[s] = { ...updatedProfiles[s]!, position: posArr };
          } else if (posArr.length > 0) {
            updatedProfiles[s] = {
              sport: s,
              skillLevel: "متوسط",
              position: posArr,
            };
          }
        });
        const updatedUser: Player = { ...user, sportProfiles: updatedProfiles };
        await finishOnboarding(updatedUser);
      } else {
        navigateAfterOnboarding();
      }
    }
  }

  function togglePosition(key: string) {
    setPositions((p) => {
      const current = p[currentSport] ?? [];
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      return { ...p, [currentSport]: next };
    });
  }

  function getConfirmBtnText() {
    if (finishing) return "";
    if (selectedCount === 0) {
      return "متابعة بدون مركز";
    }
    if (isLast) {
      return `تأكيد ${selectedCount} ${selectedCount === 1 ? "مركز" : "مراكز"} والبدء`;
    }
    return `تأكيد ${selectedCount} ${selectedCount === 1 ? "مركز" : "مراكز"}`;
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topPad + 16, paddingBottom: botPad + 24 },
      ]}
    >
      <View style={[styles.bgAccent, { backgroundColor: sbg }]} />

      <View style={[styles.progressRow, { paddingHorizontal: 4 }]}>
        <Pressable
          onPress={() => {
            if (step > 0) {
              animateStep("back");
              setTimeout(() => setStep((s) => s - 1), 150);
            } else {
              router.back();
            }
          }}
          style={[styles.backBtn, { borderColor: sc + "40" }]}
        >
          <Ionicons
            name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
            size={20}
            color={sc}
          />
        </Pressable>
        <OnboardingProgress currentStep={3} totalSteps={4} color={sc} />
        <View style={{ width: 42 }} />
      </View>

      <Animated.View
        style={[
          styles.sportHeader,
          { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
        ]}
      >
        <View
          style={[
            styles.sportBadge,
            { backgroundColor: sbg, borderColor: sc + "40", borderWidth: 1.5 },
          ]}
        >
          {React.createElement(SPORT_ICONS[currentSport], {
            size: 18,
            color: sc,
          })}
          <Text style={[styles.sportStep, { color: sc }]}>
            {SPORT_LABELS[currentSport]}
          </Text>
        </View>
        <Text style={[styles.sportTitle, { color: "#212529" }]}>
          ما مركزك في {SPORT_LABELS[currentSport]}؟
        </Text>
        <Text style={[styles.sportSub, { color: "#6C757D" }]}>
          اختر مركزاً أو أكثر — يساعدك في إيجاد المباريات المناسبة
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.positionsList,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {currentSport === "padel" ? (
          <PadelCourt
            selectedPositions={positions[currentSport] ?? []}
            onToggle={togglePosition}
            color={sc}
          />
        ) : (
          sportPositions.map((pos) => {
            const selected = positions[currentSport]?.includes(pos.key) ?? false;
            return (
              <Pressable
                key={pos.key}
                onPress={() => togglePosition(pos.key)}
              >
                <GlassCard
                  variant={selected ? "sport" : "light"}
                  padding="none"
                  style={[
                    styles.posCard,
                    selected
                      ? {
                          borderColor: sc,
                          borderWidth: 2,
                          backgroundColor: sbg,
                        }
                      : {
                          borderColor: "#E9ECEF",
                          borderWidth: 1,
                        },
                  ]}
                >
                  <View style={styles.posRow}>
                    <View
                      style={[
                        styles.posIndicator,
                        { backgroundColor: selected ? sc : "#CED4DA" },
                      ]}
                    />
                    {pos.icon && (
                      <Ionicons
                        name={pos.icon as any}
                        size={20}
                        color={selected ? sc : "#ADB5BD"}
                      />
                    )}
                    <Text
                      style={[
                        styles.posLabel,
                        { color: selected ? sc : "#495057", flex: 1, textAlign: "right" },
                      ]}
                    >
                      {pos.label}
                    </Text>
                    {selected && (
                      <View
                        style={[styles.checkCircle, { backgroundColor: sc }]}
                      >
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      </View>
                    )}
                  </View>
                </GlassCard>
              </Pressable>
            );
          })
        )}
      </Animated.View>

      <View style={{ flex: 1 }} />

      {!!saveError && (
        <View style={[styles.saveErrorBox, { backgroundColor: sc + "15" }]}>
          <Ionicons name="cloud-offline-outline" size={14} color={sc} />
          <Text style={[styles.saveErrorText, { color: sc }]}>{saveError}</Text>
        </View>
      )}

      <Pressable
        style={[
          styles.nextBtn,
          finishing
            ? { backgroundColor: sc + "40" }
            : { backgroundColor: sc },
          {
            ...Platform.select({
              web: { boxShadow: `0px 6px 20px ${sc}50` },
              default: {
                shadowColor: sc,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              },
            }),
          },
        ]}
        onPress={handleNext}
        disabled={finishing}
      >
        {finishing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            {!isLast && (
              <Ionicons name="chevron-back" size={20} color="#fff" />
            )}
            <Text style={[styles.nextBtnText, { color: "#fff" }]}>
              {getConfirmBtnText()}
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={styles.skipBtn}
        onPress={handleNext}
        disabled={finishing}
      >
        <Text
          style={[
            styles.skipText,
            { color: sc + "80" },
            finishing && { opacity: 0.5 },
          ]}
        >
          تخطي — يمكنك التحديث لاحقاً
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, gap: 16, backgroundColor: "#FFFFFF" },
  bgAccent: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.5,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    ...Platform.select({
      web: { boxShadow: "0px 2px 8px rgba(0,0,0,0.08)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  sportHeader: { gap: 6, alignItems: "flex-end" },
  sportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 50,
    alignSelf: "flex-end",
  },
  sportStep: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  sportTitle: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },
  sportSub: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
  },
  positionsList: { gap: 10 },
  posCard: {
    overflow: "hidden",
  },
  posRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  posIndicator: { width: 11, height: 11, borderRadius: 5.5 },
  posLabel: { fontSize: 15, fontFamily: "Cairo_600SemiBold" },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    paddingVertical: 16,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  nextBtnText: { fontSize: 17, fontFamily: "Cairo_700Bold" },
  skipBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  skipText: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
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
});
