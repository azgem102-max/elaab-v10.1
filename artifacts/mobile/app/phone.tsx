import { api } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { GlassInput } from "@/components/glass/GlassInput";
import { GlassButton } from "@/components/glass/GlassButton";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PhoneScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const [phone, setPhone] = useState(() => {
    if (!prefill) return "";
    if (prefill.startsWith("+966")) return `0${prefill.substring(4)}`;
    return prefill;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const cleanPhone = phone.replace(/\s/g, "");
  const saudiRegex = /^05\d{8}$/;
  const isValid = saudiRegex.test(cleanPhone);

  function formatSaudiPhone(digits: string): string {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0, 3) + " " + digits.slice(3);
    return digits.slice(0, 3) + " " + digits.slice(3, 6) + " " + digits.slice(6);
  }

  function formatPhoneE164(local: string): string {
    const digits = local.replace(/\s/g, "");
    return `+966${digits.substring(1)}`;
  }

  function getValidationHint(): string {
    if (!cleanPhone) return "";
    if (!cleanPhone.startsWith("05")) return "يجب أن يبدأ الرقم بـ 05";
    if (cleanPhone.length < 10) return `أدخل ${10 - cleanPhone.length} أرقام إضافية`;
    if (cleanPhone.length > 10) return "الرقم طويل جداً";
    return "";
  }

  const validationHint = getValidationHint();

  async function handleSend() {
    if (!isValid || loading) return;
    setLoading(true);
    setError("");
    try {
      const formatted = formatPhoneE164(cleanPhone);
      await api.requestOtp(formatted);
      router.push({ pathname: "/otp", params: { phone: formatted } });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

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
          <Ionicons
            name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
            size={22}
            color={colors.onSurface}
          />
        </Pressable>

        <View style={styles.heroSection}>
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainer, borderColor: colors.surfaceContainerHighest }]}>
            <Ionicons
              name="phone-portrait-outline"
              size={32}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>رقم الجوال</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            سنرسل لك رمز التحقق على هذا الرقم
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={[styles.prefixLabel, { backgroundColor: colors.surfaceContainer, borderColor: colors.surfaceContainerHighest }]}>
            <Text style={[styles.prefixText, { color: colors.onSurface }]}>🇸🇦 +966</Text>
          </View>
          <GlassInput
            sport="football"
            value={phone}
            onChangeText={(t) => {
              let digits = t.replace(/[^0-9]/g, "");
              if (digits.startsWith("966")) digits = "0" + digits.slice(3);
              if (digits.length > 10) return;
              setPhone(formatSaudiPhone(digits));
              setError("");
            }}
            placeholder="05X XXX XXXX"
            keyboardType="phone-pad"
            maxLength={12}
            textAlign="right"
            editable={!loading}
            style={[styles.glassInput, { fontSize: 20, fontFamily: "Cairo_600SemiBold" }]}
          />
        </View>

        <View style={styles.note}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.mutedForeground}
          />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            أدخل رقم الجوال بدون رمز الدولة (مثال: 0512345678)
          </Text>
        </View>

        {!!validationHint && !error && cleanPhone.length > 0 && (
          <View style={[styles.errorBox, { backgroundColor: colors.warning + "1A" }]}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={colors.warning}
            />
            <Text style={[styles.errorText, { color: colors.warning }]}>
              {validationHint}
            </Text>
          </View>
        )}

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "1A" }]}>
            <Ionicons
              name="cloud-offline-outline"
              size={16}
              color={colors.destructive}
            />
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        )}

        <GlassButton
          label="إرسال الرمز"
          sport="football"
          onPress={handleSend}
          disabled={!isValid}
          loading={loading}
          size="lg"
          style={styles.sendBtn}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgAccent: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(44, 84, 232, 0.05)",
  },
  inner: { flex: 1, paddingHorizontal: 24, gap: 20 },
  backBtn: {
    alignSelf: "flex-end",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  heroSection: {
    alignItems: "flex-end",
    gap: 8,
  },
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
  title: {
    fontSize: 28,
    fontFamily: "Cairo_900Black",
    textAlign: "right",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
    lineHeight: 22,
  },
  inputGroup: {
    gap: 8,
  },
  prefixLabel: {
    alignSelf: "flex-end",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  prefixText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  glassInput: { width: "100%" },
  note: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  noteText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
  },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "right",
  },
  sendBtn: {
    width: "100%",
    marginTop: 4,
  },
});
