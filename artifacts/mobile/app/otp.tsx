import { useApp } from "@/context/AppContext";
import { api, saveToken } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/glass/GlassCard";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COUNTDOWN_SECONDS = 60;

function OtpDigitBox({
  digit,
  refObj,
  onChangeText,
  onKeyPress,
  onFocus,
  onBlur,
  hasError,
  isFocused,
  loading,
  colors,
}: {
  digit: string;
  refObj: React.RefObject<TextInput | null>;
  onChangeText: (v: string) => void;
  onKeyPress: (e: { nativeEvent: { key: string } }) => void;
  onFocus: () => void;
  onBlur: () => void;
  hasError: boolean;
  isFocused: boolean;
  loading: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (digit) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.12,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [digit]);

  const borderColor = hasError ? colors.destructive : isFocused ? colors.primary : colors.border;
  const borderWidth = isFocused || hasError ? 2 : 1;
  const textColor = hasError ? colors.destructive : digit ? colors.primary : colors.onSurface;

  return (
    <Animated.View
      style={[
        styles.otpWrap,
        {
          backgroundColor: isFocused ? colors.surfaceContainer : hasError ? colors.destructive + "0F" : colors.background,
          borderColor,
          borderWidth,
          transform: [{ scale }],
          ...Platform.select({
            web: {
              boxShadow: isFocused
                ? "0px 4px 16px rgba(44,84,232,0.18)"
                : "0px 1px 4px rgba(0,0,0,0.06)",
            },
            default: {
              shadowColor: isFocused ? "#2C54E8" : "#000",
              shadowOffset: { width: 0, height: isFocused ? 4 : 1 },
              shadowOpacity: isFocused ? 0.18 : 0.06,
              shadowRadius: isFocused ? 12 : 4,
              elevation: isFocused ? 4 : 1,
            },
          }),
        },
      ]}
    >
      <TextInput
        ref={refObj}
        style={[styles.otpBox, { color: textColor }]}
        value={digit}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType="numeric"
        maxLength={1}
        textAlign="center"
        selectionColor={colors.primary}
        editable={!loading}
      />
    </Animated.View>
  );
}

export default function OtpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const { completeOnboarding, refreshProfile } = useApp();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const refs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const displayPhone = phone
    ? phone.startsWith("+966")
      ? `+966 ${phone.substring(4)}`
      : `+966 ${phone}`
    : "+966";
  const otpValue = otp.join("");
  const isComplete = otpValue.length === 6;

  const timerProgress = useRef(new Animated.Value(1)).current;
  const timerAnimation = useRef<Animated.CompositeAnimation | null>(null);

  function startTimer() {
    timerAnimation.current?.stop();
    timerProgress.setValue(1);
    timerAnimation.current = Animated.timing(timerProgress, {
      toValue: 0,
      duration: COUNTDOWN_SECONDS * 1000,
      useNativeDriver: false,
    });
    timerAnimation.current.start();
  }

  useEffect(() => {
    startTimer();
    const focusTimeout = setTimeout(() => refs[0].current?.focus(), 300);
    return () => clearTimeout(focusTimeout);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const autoVerifyRef = useRef(false);
  const verifyInFlightRef = useRef(false);

  function handleChange(val: string, idx: number) {
    const digits = val.replace(/[^0-9]/g, "");

    if (digits.length >= 6 && idx === 0) {
      const pasted = digits.slice(0, 6).split("");
      const newOtp = [
        pasted[0] ?? "",
        pasted[1] ?? "",
        pasted[2] ?? "",
        pasted[3] ?? "",
        pasted[4] ?? "",
        pasted[5] ?? "",
      ];
      setOtp(newOtp);
      setError("");
      refs[5].current?.focus();
      if (newOtp.join("").length === 6) {
        autoVerifyRef.current = true;
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[idx] = digits.slice(-1);
    setOtp(newOtp);
    setError("");
    if (digits && idx < 5) {
      refs[idx + 1].current?.focus();
    }
    if (newOtp.join("").length === 6) {
      autoVerifyRef.current = true;
    }
  }

  useEffect(() => {
    if (autoVerifyRef.current && otp.join("").length === 6 && !loading) {
      autoVerifyRef.current = false;
      handleVerify();
    }
  }, [otp]);

  function handleKeyPress(e: { nativeEvent: { key: string } }, idx: number) {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  }

  async function handleVerify() {
    if (!isComplete || loading || verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await api.verifyOtp(phone ?? "", otpValue);
      if (result.success && result.token) {
        await saveToken(result.token, result.userId);
        if (result.isNewUser) {
          router.replace("/profile-setup");
        } else {
          try {
            const profileRes = await api.getProfile();
            const u = profileRes.user;
            const validSports = (u.sports ?? []).filter(
              (s): s is "football" | "padel" | "tennis" =>
                ["football", "padel", "tennis"].includes(s)
            );
            await completeOnboarding({
              id: u.id,
              nickname: u.name ?? "مستخدم",
              phone: u.phone,
              avatarUri: u.avatarUrl ?? null,
              sports: validSports,
              sportProfiles: {},
              matchesPlayed: u.matchesPlayed,
              reliability: u.reliability,
            });
            refreshProfile().catch(() => {});
          } catch {
            await completeOnboarding({
              id: result.userId ?? "user",
              nickname: "مستخدم",
              sports: [],
              sportProfiles: {},
              matchesPlayed: 0,
              reliability: null,
            });
          }
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
      } else {
        setError("الرمز غير صحيح. حاول مرة أخرى.");
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => refs[0].current?.focus(), 50);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "تعذّر التحقق من الرمز";
      setError(msg);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => refs[0].current?.focus(), 50);
    } finally {
      setLoading(false);
      verifyInFlightRef.current = false;
    }
  }

  async function handleResend() {
    if (resending || !phone) return;
    setResending(true);
    setError("");
    try {
      await api.requestOtp(phone);
      setCountdown(COUNTDOWN_SECONDS);
      setOtp(["", "", "", "", "", ""]);
      startTimer();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "تعذّر إعادة الإرسال";
      setError(msg);
    } finally {
      setResending(false);
    }
  }

  const timerBarWidth = timerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.bgAccent} />

      <View
        style={[
          styles.inner,
          { paddingTop: topPad + 20, paddingBottom: botPad + 24 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>

        <GlassCard variant="dark" padding="md" style={styles.headerCard}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: "#DBEAFE", borderColor: "#93C5FD" }]}>
              <Ionicons
                name="shield-checkmark-outline"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: colors.onSurface }]}>رمز التحقق</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>أدخل الرمز المرسل إلى</Text>
            <Text style={[styles.phoneHint, { color: colors.primary }]}>{displayPhone}</Text>
          </View>
        </GlassCard>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <OtpDigitBox
              key={i}
              digit={digit}
              refObj={refs[i]}
              onChangeText={(v) => handleChange(v, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              onFocus={() => setFocusedIdx(i)}
              onBlur={() => setFocusedIdx(-1)}
              hasError={!!error}
              isFocused={focusedIdx === i}
              loading={loading}
              colors={colors}
            />
          ))}
        </View>

        {!!error && !loading && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "1A" }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.verifyBtn,
            {
              backgroundColor: isComplete && !loading ? colors.primary : colors.muted,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          onPress={handleVerify}
          disabled={!isComplete || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.verifyBtnText, { color: isComplete ? colors.primaryForeground : colors.mutedForeground }]}>
              تحقق من الرمز
            </Text>
          )}
        </Pressable>

        <View style={styles.timerSection}>
          {countdown > 0 ? (
            <>
              <View style={[styles.timerBar, { backgroundColor: colors.border }]}>
                <Animated.View
                  style={[styles.timerFill, { width: timerBarWidth, backgroundColor: colors.primary }]}
                />
              </View>
              <Text style={[styles.timerText, { color: colors.mutedForeground }]}>
                إعادة الإرسال بعد {countdown} ثانية
              </Text>
            </>
          ) : (
            <Pressable
              style={[styles.resendBtn, { backgroundColor: colors.surfaceContainer, borderColor: colors.surfaceContainerHighest }]}
              onPress={handleResend}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.resendLink, { color: colors.primary }]}>إعادة إرسال الرمز</Text>
              )}
            </Pressable>
          )}
        </View>

        <Pressable
          style={styles.changePhone}
          onPress={() =>
            router.replace({
              pathname: "/phone",
              params: { prefill: phone ?? "" },
            })
          }
        >
          <Text style={[styles.changePhoneText, { color: colors.primary }]}>تغيير رقم الجوال</Text>
        </Pressable>

        {__DEV__ && (
          <Pressable
            style={[styles.devBtn, { backgroundColor: colors.warning + "30" }]}
            onPress={() => {
              setOtp(["1", "2", "3", "4", "5", "6"]);
              setError("");
            }}
          >
            <Text style={[styles.devBtnText, { color: colors.warning }]}>⚡ Dev: ملء 123456 تلقائياً</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgAccent: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(44, 84, 232, 0.05)",
  },
  inner: { flex: 1, paddingHorizontal: 24, gap: 24, alignItems: "center" },
  backBtn: {
    alignSelf: "flex-end",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerCard: { width: "100%" },
  header: { alignItems: "center", gap: 6, width: "100%" },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
    ...Platform.select({
      web: { boxShadow: "0px 4px 16px rgba(44,84,232,0.14)" },
      default: {
        shadowColor: "#2C54E8",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  title: { fontSize: 28, fontFamily: "Cairo_700Bold", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "center" },
  phoneHint: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  otpRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  otpWrap: {
    width: 46,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBox: {
    width: 46,
    height: 56,
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    width: "100%",
  },
  errorText: { flex: 1, fontSize: 14, fontFamily: "Cairo_600SemiBold", textAlign: "center" },
  verifyBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0px 4px 20px rgba(44,84,232,0.25)" },
      default: {
        shadowColor: "#2C54E8",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
      },
    }),
  },
  verifyBtnText: { fontSize: 17, fontFamily: "Cairo_700Bold" },
  timerSection: { alignItems: "center", gap: 10, width: "100%" },
  timerBar: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  timerFill: { height: 6, borderRadius: 3 },
  timerText: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  resendBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1,
  },
  resendLink: { fontSize: 14, fontFamily: "Cairo_700Bold" },
  changePhone: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 50 },
  changePhoneText: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },
  devBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 50 },
  devBtnText: { fontSize: 13, fontFamily: "Cairo_700Bold" },
});
