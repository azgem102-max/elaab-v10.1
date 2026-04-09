import { router, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { SportGradientButton } from "@/components/SportGradientButton";
import { typography } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: "الصفحة غير موجودة", headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.code, { color: colors.matteBlack }]}>٤٠٤</Text>
        <Text style={[styles.title, { color: colors.matteBlack }]}>
          هذه الصفحة غير موجودة
        </Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          يبدو أن الرابط خاطئ أو انتهت صلاحيته
        </Text>
        <SportGradientButton
          label="العودة للرئيسية"
          gradientStart={colors.football}
          gradientEnd={colors.primaryLight}
          onPress={() => router.replace("/")}
          style={styles.button}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  code: {
    ...typography.displayLg,
    fontSize: 96,
    lineHeight: 112,
    letterSpacing: -2,
    marginBottom: 8,
  },
  title: {
    ...typography.headline,
    textAlign: "center",
  },
  description: {
    ...typography.bodySm,
    textAlign: "center",
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    minWidth: 200,
  },
});
