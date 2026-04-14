import { useColors } from "@/hooks/useColors";
import { SportType, sportLabel } from "@/context/AppContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { typography } from "@/constants/typography";


const SCREEN_W = Dimensions.get("window").width;
const FIELD_W = SCREEN_W - 48;
const FIELD_H = FIELD_W * 0.58;

const SPORT_POSITIONS: Record<string, { key: string; x: number; y: number }[]> = {
  football: [
    { key: "حارس", x: 0.5, y: 0.82 },
    { key: "مدافع", x: 0.5, y: 0.6 },
    { key: "وسط", x: 0.5, y: 0.38 },
    { key: "مهاجم", x: 0.5, y: 0.16 },
  ],
  padel: [
    { key: "يمين", x: 0.28, y: 0.5 },
    { key: "يسار", x: 0.72, y: 0.5 },
  ],
  tennis: [
    { key: "خط الخلفية", x: 0.5, y: 0.75 },
    { key: "الشبكة", x: 0.5, y: 0.32 },
  ],
};

const SPORT_POSITIONS_SINGLE: Record<string, { key: string; x: number; y: number }[]> = {
  padel: [
    { key: "لاعب", x: 0.5, y: 0.5 },
  ],
  tennis: [
    { key: "لاعب", x: 0.5, y: 0.5 },
  ],
};

interface PositionPickerModalProps {
  visible: boolean;
  sport: SportType;
  sportAccentColor: string;
  matchFormat?: "single" | "double" | null;
  initialPosition?: string | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (position: string | undefined) => void;
}

export function PositionPickerModal({
  visible,
  sport,
  sportAccentColor: sc,
  matchFormat,
  initialPosition,
  loading = false,
  onClose,
  onConfirm,
}: PositionPickerModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selectedPosition, setSelectedPosition] = useState<string | null>(initialPosition ?? null);

  React.useEffect(() => {
    if (visible) {
      setSelectedPosition(initialPosition ?? null);
    }
  }, [visible, initialPosition]);

  const isSingle = matchFormat === "single" && (sport === "padel" || sport === "tennis");
  const positions = isSingle
    ? (SPORT_POSITIONS_SINGLE[sport] ?? [])
    : (SPORT_POSITIONS[sport] ?? []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: "#FAFAF0", paddingBottom: botPad + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: sc + "40" }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.onSurface }]}>اختر مركزك</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {sportLabel(sport)} · اختياري
            </Text>
          </View>

          <View style={[styles.field, {
            backgroundColor: sc + "12",
            width: FIELD_W,
            height: FIELD_H,
          }]}>
            {sport === "football" && (
              <>
                <View style={[styles.fieldCenterLine, { backgroundColor: sc + "40" }]} />
                <View style={[styles.fieldCenterCircle, { backgroundColor: sc + "18" }]} />
                <View style={[styles.fieldPenaltyTop, { backgroundColor: sc + "15" }]} />
                <View style={[styles.fieldPenaltyBottom, { backgroundColor: sc + "15" }]} />
              </>
            )}
            {(sport === "padel" || sport === "tennis") && (
              <>
                <View style={[styles.fieldCenterLine, { backgroundColor: sc + "40" }]} />
                <View style={[styles.fieldNetLine, { backgroundColor: sc }]} />
              </>
            )}
            {positions.map((pos) => {
              const left = pos.x * FIELD_W - 20;
              const top = pos.y * FIELD_H - 20;
              const isSelected = selectedPosition === pos.key;
              return (
                <Pressable
                  key={pos.key}
                  style={{ position: "absolute", left, top, alignItems: "center", zIndex: 10 }}
                  onPress={() => setSelectedPosition(pos.key)}
                >
                  <View style={[
                    styles.dot,
                    isSelected
                      ? { backgroundColor: sc }
                      : { backgroundColor: "#FFFFFF" },
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <View style={[styles.dotLabel, {
                    backgroundColor: isSelected ? sc : "#FFFFFF",
                  }]}>
                    <Text style={[styles.dotLabelText, { color: isSelected ? "#fff" : colors.mutedForeground }]}>
                      {pos.key}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.skipBtn, { backgroundColor: colors.surfaceContainerLow }]}
              onPress={() => {
                onClose();
                onConfirm(undefined);
              }}
            >
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>تخطي</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, {
                backgroundColor: selectedPosition ? sc : colors.surfaceContainerHigh,
              }]}
              onPress={() => {
                onClose();
                onConfirm(selectedPosition ?? undefined);
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.confirmText, {
                  color: selectedPosition ? "#fff" : colors.mutedForeground,
                }]}>
                  {selectedPosition ? `انضم كـ${selectedPosition}` : "انضم بدون مركز"}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopStartRadius: 28,
    borderTopEndRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    gap: 16,
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 20 },
    }),
  },
  handle: { width: 44, height: 5, borderRadius: 3 },
  header: { alignItems: "center", gap: 4, width: "100%" },
  title: { fontSize: 20, fontFamily: typography.headlineSm.fontFamily },
  sub: { fontSize: 13, fontFamily: typography.body.fontFamily },
  field: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  fieldCenterLine: { position: "absolute", left: 0, right: 0, top: "50%", height: 1.5 },
  fieldCenterCircle: {
    position: "absolute", width: 50, height: 50, borderRadius: 25,
    left: "50%", top: "50%", marginLeft: -25, marginTop: -25,
  },
  fieldPenaltyTop: {
    position: "absolute", width: "45%", height: "28%",
    left: "27.5%", top: 0, borderRadius: 0,
  },
  fieldPenaltyBottom: {
    position: "absolute", width: "45%", height: "28%",
    left: "27.5%", bottom: 0, borderRadius: 0,
  },
  fieldNetLine: { position: "absolute", left: "10%", right: "10%", top: "50%", height: 3, marginTop: -1 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  dotLabel: {
    marginTop: 3, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8,
  },
  dotLabelText: { fontSize: 10, fontFamily: typography.bodyLg.fontFamily },
  actions: { flexDirection: "row", gap: 12, width: "100%", paddingTop: 4 },
  skipBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 50,
    alignItems: "center", justifyContent: "center",
  },
  skipText: { fontSize: 15, fontFamily: typography.headlineSm.fontFamily },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 50,
    alignItems: "center", justifyContent: "center",
  },
  confirmText: { fontSize: 15, fontFamily: typography.headlineSm.fontFamily },
});
