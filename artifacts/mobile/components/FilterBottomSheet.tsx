import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type TimeOfDay = "morning" | "afternoon" | "evening";
export type DistanceRadius = 5 | 10 | 25 | 50;

export interface MatchFilters {
  skillLevel: SkillLevel | null;
  timeOfDay: TimeOfDay | null;
  hasSpots: boolean;
  distanceRadius: DistanceRadius | null;
}

interface FilterBottomSheetProps {
  visible: boolean;
  filters: MatchFilters;
  onChange: (filters: MatchFilters) => void;
  onClose: () => void;
  showDistanceFilter?: boolean;
  previewCount?: number | null;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

const DISTANCE_OPTIONS: { key: DistanceRadius; label: string }[] = [
  { key: 5, label: "٥ كم" },
  { key: 10, label: "١٠ كم" },
  { key: 25, label: "٢٥ كم" },
  { key: 50, label: "٥٠ كم" },
];

const SKILL_LEVELS: { key: SkillLevel; label: string; icon: string }[] = [
  { key: "beginner", label: "مبتدئ", icon: "🌱" },
  { key: "intermediate", label: "متوسط", icon: "⚡" },
  { key: "advanced", label: "متقدم", icon: "🏆" },
];

const TIME_OF_DAY: { key: TimeOfDay; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "morning", label: "صباح (5 - 12)", icon: "sunny-outline" },
  { key: "afternoon", label: "ظهراً (12 - 5م)", icon: "partly-sunny-outline" },
  { key: "evening", label: "مساء (5م - 12م)", icon: "moon-outline" },
];

function toArabicNumeral(n: number): string {
  return n.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

export function FilterBottomSheet({ visible, filters, onChange, onClose, showDistanceFilter = true, previewCount }: FilterBottomSheetProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  const toggleSkillLevel = useCallback((key: SkillLevel) => {
    onChange({ ...filters, skillLevel: filters.skillLevel === key ? null : key });
  }, [filters, onChange]);

  const toggleTimeOfDay = useCallback((key: TimeOfDay) => {
    onChange({ ...filters, timeOfDay: filters.timeOfDay === key ? null : key });
  }, [filters, onChange]);

  const toggleHasSpots = useCallback(() => {
    onChange({ ...filters, hasSpots: !filters.hasSpots });
  }, [filters, onChange]);

  const toggleDistance = useCallback((key: DistanceRadius) => {
    onChange({ ...filters, distanceRadius: filters.distanceRadius === key ? null : key });
  }, [filters, onChange]);

  const resetAll = useCallback(() => {
    onChange({ skillLevel: null, timeOfDay: null, hasSpots: false, distanceRadius: null });
  }, [onChange]);

  const activeCount = [
    filters.skillLevel !== null,
    filters.timeOfDay !== null,
    filters.hasSpots,
    filters.distanceRadius !== null,
  ].filter(Boolean).length;

  const hasPreviewCount = previewCount !== null && previewCount !== undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity, pointerEvents: visible ? "auto" : "none" }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: "#FFFFFF",
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: "#D1D5DB" }]} />

          <View style={styles.header}>
            <Pressable
              onPress={resetAll}
              style={[styles.resetBtn, { opacity: activeCount > 0 ? 1 : 0.4 }]}
              disabled={activeCount === 0}
            >
              <Text style={[styles.resetBtnText, { color: "#DC2626" }]}>مسح الكل</Text>
            </Pressable>

            <Text style={[styles.headerTitle, { color: "#111827" }]}>تصفية متقدمة</Text>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {showDistanceFilter && (
              <>
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="navigate-outline" size={18} color="#2C54E8" />
                    <Text style={[styles.sectionTitle, { color: "#111827" }]}>المسافة (من موقعك)</Text>
                  </View>
                  <View style={styles.optionsRow}>
                    {DISTANCE_OPTIONS.map(({ key, label }) => {
                      const isActive = filters.distanceRadius === key;
                      return (
                        <Pressable
                          key={key}
                          style={[
                            styles.optionChip,
                            isActive
                              ? { backgroundColor: "#E0E7FF", borderColor: "#2C54E8", borderWidth: 1.5 }
                              : { backgroundColor: "#F4F6FF", borderColor: "#E5E7EB", borderWidth: 1 },
                          ]}
                          onPress={() => toggleDistance(key)}
                        >
                          <Text
                            style={[
                              styles.optionLabel,
                              { color: isActive ? "#2C54E8" : "#6B7280" },
                            ]}
                          >
                            {label}
                          </Text>
                          {isActive && (
                            <Ionicons name="checkmark-circle" size={14} color="#2C54E8" />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: "#E5E7EB" }]} />
              </>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart-outline" size={18} color="#2C54E8" />
                <Text style={[styles.sectionTitle, { color: "#111827" }]}>مستوى اللاعب</Text>
              </View>
              <View style={styles.optionsRow}>
                {SKILL_LEVELS.map(({ key, label, icon }) => {
                  const isActive = filters.skillLevel === key;
                  return (
                    <Pressable
                      key={key}
                      style={[
                        styles.optionChip,
                        isActive
                          ? { backgroundColor: "#E0E7FF", borderColor: "#2C54E8", borderWidth: 1.5 }
                          : { backgroundColor: "#F4F6FF", borderColor: "#E5E7EB", borderWidth: 1 },
                      ]}
                      onPress={() => toggleSkillLevel(key)}
                    >
                      <Text style={styles.optionEmoji}>{icon}</Text>
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: isActive ? "#2C54E8" : "#6B7280" },
                        ]}
                      >
                        {label}
                      </Text>
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={14} color="#2C54E8" />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: "#E5E7EB" }]} />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={18} color="#2C54E8" />
                <Text style={[styles.sectionTitle, { color: "#111827" }]}>وقت اللعب</Text>
              </View>
              <View style={styles.optionsColumn}>
                {TIME_OF_DAY.map(({ key, label, icon }) => {
                  const isActive = filters.timeOfDay === key;
                  return (
                    <Pressable
                      key={key}
                      style={[
                        styles.optionRow,
                        isActive
                          ? { backgroundColor: "#E0E7FF", borderColor: "#2C54E8", borderWidth: 1.5 }
                          : { backgroundColor: "#F4F6FF", borderColor: "#E5E7EB", borderWidth: 1 },
                      ]}
                      onPress={() => toggleTimeOfDay(key)}
                    >
                      <View style={styles.optionRowLeft}>
                        {isActive ? (
                          <Ionicons name="checkmark-circle" size={20} color="#2C54E8" />
                        ) : (
                          <Ionicons name="ellipse-outline" size={20} color="#9CA3AF" />
                        )}
                      </View>
                      <Ionicons name={icon} size={18} color={isActive ? "#2C54E8" : "#6B7280"} />
                      <Text
                        style={[
                          styles.optionRowLabel,
                          { color: isActive ? "#2C54E8" : "#6B7280" },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: "#E5E7EB" }]} />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={18} color="#2C54E8" />
                <Text style={[styles.sectionTitle, { color: "#111827" }]}>الأماكن الشاغرة</Text>
              </View>
              <Pressable
                style={[
                  styles.optionRow,
                  filters.hasSpots
                    ? { backgroundColor: "rgba(22, 163, 74, 0.10)", borderColor: "#16A34A", borderWidth: 1.5 }
                    : { backgroundColor: "#F4F6FF", borderColor: "#E5E7EB", borderWidth: 1 },
                ]}
                onPress={toggleHasSpots}
              >
                <View style={styles.optionRowLeft}>
                  {filters.hasSpots ? (
                    <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color="#9CA3AF" />
                  )}
                </View>
                <Ionicons name="person-add-outline" size={18} color={filters.hasSpots ? "#16A34A" : "#6B7280"} />
                <Text
                  style={[
                    styles.optionRowLabel,
                    { color: filters.hasSpots ? "#16A34A" : "#6B7280" },
                  ]}
                >
                  مباريات بأماكن متاحة فقط
                </Text>
              </Pressable>
            </View>

            <View style={{ height: 12 }} />
          </ScrollView>

          {hasPreviewCount && (
            <View style={[styles.previewBar, { backgroundColor: "#FFFFFF", borderTopColor: "#E5E7EB" }]}>
              <Ionicons name="search-outline" size={16} color="#2C54E8" />
              <Text style={[styles.previewText, { color: "#111827" }]}>
                سيظهر{" "}
                <Text style={{ color: "#2C54E8", fontFamily: "Cairo_700Bold" }}>
                  {toArabicNumeral(previewCount!)} {previewCount === 1 ? "مباراة" : "مباريات"}
                </Text>
              </Text>
              <Pressable
                style={[styles.applyBtn, { backgroundColor: "#2C54E8" }]}
                onPress={onClose}
              >
                <Text style={styles.applyBtnText}>تطبيق</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopStartRadius: 28,
    borderTopEndRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  resetBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  resetBtnText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: 20,
    gap: 4,
  },
  section: {
    gap: 12,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
  },
  optionEmoji: {
    fontSize: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  optionsColumn: {
    gap: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
  },
  optionRowLeft: {
    marginRight: "auto",
  },
  optionRowLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    flex: 1,
    textAlign: "right",
  },
  divider: {
    height: 1,
    marginHorizontal: -20,
  },
  previewBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  previewText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
  },
  applyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  applyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
  },
});
