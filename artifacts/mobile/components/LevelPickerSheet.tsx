import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/i18n";
import type { SportType } from "@/context/AppContext";
import { typography } from "@/constants/typography";

const { width: SCREEN_W } = Dimensions.get("window");
const BAR_WIDTH = Math.min(SCREEN_W - 48, 320);

type LevelCategory = "beginner" | "intermediate" | "advanced" | "tournament";
type LevelTranslator = (
  key: string,
  options?: Record<string, string | number>,
) => string;

export interface LevelDefinition {
  value: number;
  name: string;
  description: string;
  category: LevelCategory;
}

export interface LevelPickerSheetProps {
  visible: boolean;
  sport: SportType;
  currentValue?: number | null;
  selectedValues?: number[];
  multiSelect?: boolean;
  onClose: () => void;
  onConfirm?: (value: number) => void;
  onConfirmMulti?: (values: number[]) => void;
}

const CATEGORY_KEYS: Record<LevelCategory, string> = {
  beginner: "levels.beginner",
  intermediate: "levels.intermediate",
  advanced: "levels.advanced",
  tournament: "levels.tournament",
};

function toText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

export function getLevelsForSport(
  sport: SportType,
  t: LevelTranslator = (key) => key,
): LevelDefinition[] {
  if (sport === "padel") {
    return [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0].map(
      (value) => {
        const key = `l${value.toFixed(1).replace(".", "_")}`;
        return {
          value,
          name: toText(t(`levels.padel.${key}.name`), value.toFixed(1)),
          description: toText(t(`levels.padel.${key}.desc`)),
          category:
            value < 2.5
              ? "beginner"
              : value < 4.0
                ? "intermediate"
                : value < 5.0
                  ? "advanced"
                  : "tournament",
        };
      },
    );
  }

  if (sport === "tennis") {
    return [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0].map(
      (value) => {
        const key = `l${value.toFixed(1).replace(".", "_")}`;
        return {
          value,
          name: toText(t(`levels.tennis.${key}.name`), value.toFixed(1)),
          description: toText(t(`levels.tennis.${key}.desc`)),
          category:
            value < 2.5
              ? "beginner"
              : value < 4.0
                ? "intermediate"
                : value < 5.5
                  ? "advanced"
                  : "tournament",
        };
      },
    );
  }

  return [];
}

function findClosestLevel(
  levels: LevelDefinition[],
  value: number | null | undefined,
): LevelDefinition | null {
  if (levels.length === 0) return null;
  if (value == null) return levels[0] ?? null;

  return (
    levels.find((level) => level.value === value) ??
    levels.reduce((closest, current) =>
      Math.abs(current.value - value) < Math.abs(closest.value - value)
        ? current
        : closest,
    )
  );
}

function SportLevelSvg({
  category,
  size = 60,
  mainColor,
  bgColor,
}: {
  category: LevelCategory;
  size?: number;
  mainColor: string;
  bgColor: string;
}) {
  if (category === "beginner") {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="28" fill={bgColor} />
        <Path
          d="M20 38 Q30 20 40 38"
          stroke={mainColor}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <Circle
          cx="30"
          cy="32"
          r="6"
          fill={mainColor}
          fillOpacity="0.3"
          stroke={mainColor}
          strokeWidth="2"
        />
        <Line
          x1="30"
          y1="26"
          x2="30"
          y2="18"
          stroke={mainColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <Line
          x1="30"
          y1="18"
          x2="24"
          y2="22"
          stroke={mainColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (category === "intermediate") {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="28" fill={bgColor} />
        <Rect x="22" y="20" width="4" height="22" rx="2" fill={mainColor} />
        <Rect
          x="28"
          y="25"
          width="4"
          height="17"
          rx="2"
          fill={mainColor}
          fillOpacity="0.7"
        />
        <Rect
          x="34"
          y="30"
          width="4"
          height="12"
          rx="2"
          fill={mainColor}
          fillOpacity="0.4"
        />
        <Circle cx="40" cy="20" r="5" fill={bgColor} stroke={mainColor} strokeWidth="2" />
        <Path
          d="M38 20 L40 22 L44 17"
          stroke={mainColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (category === "advanced") {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="28" fill={bgColor} />
        <Path
          d="M18 42 L24 30 L30 36 L36 20 L42 28"
          stroke={mainColor}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="42" cy="28" r="4" fill={mainColor} />
        <Circle cx="30" cy="36" r="3" fill={mainColor} fillOpacity="0.5" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="28" fill={bgColor} />
      <Path
        d="M30 14 L34 24 H44 L36 30 L39 41 L30 35 L21 41 L24 30 L16 24 H26 Z"
        fill={mainColor}
        fillOpacity="0.85"
        stroke={mainColor}
        strokeWidth="1"
      />
    </Svg>
  );
}

function LevelGuideCard({
  category,
  levels,
  onSelect,
}: {
  category: LevelCategory;
  levels: LevelDefinition[];
  onSelect: (value: number) => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const traits = [0, 1, 2]
    .map((index) => t(`levels.traits.${category}.${index}`))
    .filter((item) => !item.startsWith("levels.traits."));
  const midLevel = levels[Math.floor(levels.length / 2)] ?? levels[0];
  const range = `${levels[0]?.value.toFixed(1) ?? "0.0"} - ${
    levels[levels.length - 1]?.value.toFixed(1) ?? "0.0"
  }`;

  if (!midLevel) return null;

  return (
    <View
      style={[
        guideStyles.card,
        { backgroundColor: colors.surfaceContainer, borderColor: "transparent" },
      ]}
    >
      <SportLevelSvg
        category={category}
        size={64}
        mainColor={colors.primary}
        bgColor={colors.surfaceContainerLow}
      />
      <Text style={[guideStyles.catName, { color: colors.primary }]}>
        {toText(t(CATEGORY_KEYS[category]))}
      </Text>
      <Text style={[guideStyles.range, { color: `${colors.primary}AA` }]}>{range}</Text>
      <View style={guideStyles.traits}>
        {traits.map((trait) => (
          <View key={trait} style={guideStyles.traitRow}>
            <Text style={[guideStyles.traitDot, { color: colors.primary }]}>●</Text>
            <Text style={[guideStyles.traitText, { color: `${colors.primary}CC` }]}>
              {trait}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [
          guideStyles.pickBtn,
          { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}
        onPress={() => onSelect(midLevel.value)}
      >
        <Text style={guideStyles.pickBtnText}>{toText(t("levels.thisIsMe"))}</Text>
      </Pressable>
    </View>
  );
}

function LevelDetailCard({
  level,
}: {
  level: LevelDefinition | null;
}) {
  const { t } = useTranslation();
  const colors = useColors();

  if (!level) return null;

  return (
    <View
      style={[
        pickerStyles.detailCard,
        { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh },
      ]}
    >
      <View style={pickerStyles.detailHeader}>
        <View
          style={[
            pickerStyles.detailBadge,
            { backgroundColor: `${colors.primary}18` },
          ]}
        >
          <Text style={[pickerStyles.detailBadgeText, { color: colors.primary }]}>
            {level.value.toFixed(1)} ★
          </Text>
        </View>
        <Text style={[pickerStyles.detailTitle, { color: colors.onSurface }]}>
          {level.name}
        </Text>
      </View>
      <Text style={[pickerStyles.detailSubtitle, { color: colors.mutedForeground }]}>
        {toText(t(CATEGORY_KEYS[level.category]))}
      </Text>
      <Text style={[pickerStyles.detailDescription, { color: colors.onSurfaceVariant }]}>
        {level.description}
      </Text>
    </View>
  );
}

function LevelGuideSheet({
  visible,
  sport,
  onClose,
  onSelect,
}: {
  visible: boolean;
  sport: SportType;
  onClose: () => void;
  onSelect: (value: number) => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const translateY = useSharedValue(600);
  const levels = useMemo(() => getLevelsForSport(sport, t), [sport, t]);
  const categories = Array.from(new Set(levels.map((level) => level.category)));

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 600, { duration: 220 });
  }, [translateY, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={guideSheetStyles.overlay} onPress={onClose} />
      <Animated.View
        style={[
          guideSheetStyles.sheet,
          { backgroundColor: colors.surfaceContainerLow },
          sheetStyle,
        ]}
      >
        <View style={guideSheetStyles.handleBar} />
        <View style={guideSheetStyles.headerRow}>
          <Pressable onPress={onClose} style={guideSheetStyles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={[guideSheetStyles.title, { color: colors.onSurface }]}>
            {toText(t("levels.levelGuide"))}
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <Text style={[guideSheetStyles.subtitle, { color: colors.mutedForeground }]}>
          {toText(t("levels.chooseCat"))}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={guideSheetStyles.scrollContent}
          style={{ flexGrow: 0 }}
        >
          {categories.map((category) => (
            <LevelGuideCard
              key={category}
              category={category}
              levels={levels.filter((level) => level.category === category)}
              onSelect={(value) => {
                onClose();
                setTimeout(() => onSelect(value), 100);
              }}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

export function LevelPickerSheet({
  visible,
  sport,
  currentValue = null,
  selectedValues = [],
  multiSelect = false,
  onClose,
  onConfirm,
  onConfirmMulti,
}: LevelPickerSheetProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const translateY = useSharedValue(600);
  const levels = useMemo(() => getLevelsForSport(sport, t), [sport, t]);
  const defaultLevel = levels[0]?.value ?? 0;
  const [selected, setSelected] = useState<number>(currentValue ?? defaultLevel);
  const [multiSelected, setMultiSelected] = useState<number[]>(selectedValues);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 600, { duration: 220 });
  }, [translateY, visible]);

  useEffect(() => {
    if (!visible) return;

    setSelected(currentValue ?? selectedValues[0] ?? defaultLevel);
    setMultiSelected(
      selectedValues
        .filter((value) => levels.some((level) => level.value === value))
        .sort((left, right) => left - right),
    );
  }, [currentValue, defaultLevel, levels, selectedValues, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const selectedLevel = findClosestLevel(levels, selected);
  const activeFocusLevel =
    (multiSelect ? multiSelected[multiSelected.length - 1] : selected) ?? defaultLevel;
  const filledWidth =
    levels.length > 1
      ? (Math.max(
          0,
          levels.findIndex((level) => level.value === activeFocusLevel),
        ) /
          (levels.length - 1)) *
        BAR_WIDTH
      : 0;

  const selectLevel = useCallback(
    (value: number) => {
      setSelected(value);

      if (!multiSelect) return;

      setMultiSelected((previous) => {
        if (previous.includes(value)) {
          return previous.filter((item) => item !== value);
        }

        return [...previous, value].sort((left, right) => left - right);
      });
    },
    [multiSelect],
  );

  const handleConfirm = useCallback(() => {
    if (multiSelect) {
      onConfirmMulti?.(multiSelected);
    } else {
      onConfirm?.(selected);
    }
    onClose();
  }, [multiSelect, multiSelected, onClose, onConfirm, onConfirmMulti, selected]);

  if (levels.length === 0) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <Pressable style={pickerStyles.overlay} onPress={onClose} />
        <Animated.View
          style={[
            pickerStyles.sheet,
            { backgroundColor: colors.surfaceContainerLow },
            sheetStyle,
          ]}
        >
          <View style={pickerStyles.handleBar} />
          <View style={pickerStyles.headerRow}>
            <Pressable onPress={onClose} style={pickerStyles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.onSurface} />
            </Pressable>
            <Text style={[pickerStyles.title, { color: colors.onSurface }]}>
              {toText(
                t(
                  sport === "padel"
                    ? "levels.yourLevelPadel"
                    : "levels.yourLevelTennis",
                ),
              )}
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={pickerStyles.body}
          >
            <View style={pickerStyles.gradientBarWrap}>
              <View
                style={[
                  pickerStyles.gradientBar,
                  {
                    width: BAR_WIDTH,
                    backgroundColor:
                      colors.surfaceContainerHighest ?? "rgba(0,0,0,0.06)",
                  },
                ]}
              />

              <Animated.View
                style={[
                  pickerStyles.gradientBar,
                  {
                    position: "absolute",
                    left: 0,
                    top: 16,
                    width: filledWidth,
                    backgroundColor: colors.primary,
                  },
                ]}
              />

              <View style={[pickerStyles.dotsRow, { width: BAR_WIDTH }]}>
                {levels.map((level) => {
                  const isSelected = multiSelect
                    ? multiSelected.includes(level.value)
                    : level.value === selected;
                  const isPastOrSelected = level.value <= activeFocusLevel;
                  const dotSize = isSelected ? 20 : 14;

                  return (
                    <Pressable
                      key={level.value}
                      onPress={() => selectLevel(level.value)}
                      hitSlop={8}
                      style={[
                        pickerStyles.dot,
                        {
                          width: dotSize,
                          height: dotSize,
                          borderRadius: dotSize / 2,
                          backgroundColor: isPastOrSelected
                            ? colors.primary
                            : colors.surface,
                          borderColor: isPastOrSelected
                            ? "transparent"
                            : colors.surfaceContainerHighest ?? "rgba(0,0,0,0.06)",
                          borderWidth: isSelected || isPastOrSelected ? 0 : 2,
                          shadowColor: isSelected ? colors.primary : "transparent",
                          shadowOpacity: isSelected ? 0.3 : 0,
                          shadowRadius: isSelected ? 6 : 0,
                          elevation: isSelected ? 4 : 0,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            <View style={pickerStyles.labelsRow}>
              {(Object.keys(CATEGORY_KEYS) as LevelCategory[]).map((category) => (
                <Text
                  key={category}
                  style={[pickerStyles.barLabel, { color: colors.mutedForeground }]}
                >
                  {toText(t(CATEGORY_KEYS[category]))}
                </Text>
              ))}
            </View>

            <Pressable
              style={[
                pickerStyles.guideBtn,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.surfaceContainerHigh,
                },
              ]}
              onPress={() => setShowGuide(true)}
            >
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
              <Text style={[pickerStyles.guideBtnText, { color: colors.primary }]}>
                {toText(t("levels.levelGuide"))}
              </Text>
            </Pressable>

            <LevelDetailCard level={selectedLevel} />

            <Pressable
              style={({ pressed }) => [
                pickerStyles.confirmBtn,
                { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
              onPress={handleConfirm}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={pickerStyles.confirmText}>
                {multiSelect
                  ? toText(
                      multiSelected.length > 0
                        ? t("levels.confirmMulti", { count: multiSelected.length })
                        : t("levels.confirmMultiEmpty"),
                    )
                  : toText(t("levels.confirmLevel", { level: selected.toFixed(1) }))}
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </Modal>

      <LevelGuideSheet
        visible={showGuide}
        sport={sport}
        onClose={() => setShowGuide(false)}
        onSelect={selectLevel}
      />
    </>
  );
}

export function getLevelLabel(
  value: number | null | undefined,
  sport: SportType,
  t: LevelTranslator,
): string {
  if (value == null) return "";

  const levels = getLevelsForSport(sport, t);
  const level = findClosestLevel(levels, value);

  if (!level) return "";

  return `${value.toFixed(1)} ★ ${level.name}`;
}

export function getLevelColor(
  value: number | null | undefined,
  sport: SportType,
): string {
  const level = findClosestLevel(getLevelsForSport(sport), value);

  if (!level) return "#05B757";
  if (level.category === "beginner") return "#28B463";
  if (level.category === "intermediate") return "#1F8A70";
  if (level.category === "advanced") return "#F39C12";
  return "#E67E22";
}

const guideStyles = StyleSheet.create({
  card: {
    width: SCREEN_W * 0.68,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 8,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  catName: {
    fontSize: 22,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "center",
  },
  range: {
    fontSize: 14,
    fontFamily: typography.bodyLg.fontFamily,
  },
  traits: {
    gap: 4,
    width: "100%",
    paddingHorizontal: 4,
  },
  traitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
  },
  traitDot: { fontSize: 8 },
  traitText: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    textAlign: "right",
    flex: 1,
  },
  pickBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 50,
    marginTop: 4,
  },
  pickBtnText: {
    fontSize: 15,
    fontFamily: typography.headlineSm.fontFamily,
    color: "#fff",
  },
});

const guideSheetStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "75%",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: typography.headlineSm.fontFamily,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: typography.bodyLg.fontFamily,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: "85%",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: typography.headlineSm.fontFamily,
  },
  body: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  gradientBarWrap: {
    alignItems: "center",
    paddingVertical: 16,
  },
  gradientBar: {
    height: 8,
    borderRadius: 4,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "absolute",
    top: 12,
  },
  dot: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: -6,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: typography.bodyLg.fontFamily,
  },
  guideBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 50,
    borderWidth: 1.5,
    marginTop: 4,
  },
  guideBtnText: {
    fontSize: 14,
    fontFamily: typography.bodyLg.fontFamily,
  },
  detailCard: {
    borderRadius: 22,
    padding: 16,
    gap: 8,
    borderWidth: 1,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  detailBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
  },
  detailBadgeText: {
    fontSize: 12,
    fontFamily: typography.headlineSm.fontFamily,
  },
  detailTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "right",
  },
  detailSubtitle: {
    fontSize: 12,
    fontFamily: typography.bodyLg.fontFamily,
    textAlign: "right",
  },
  detailDescription: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    textAlign: "right",
    lineHeight: 22,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 50,
    marginTop: 4,
  },
  confirmText: {
    fontSize: 16,
    fontFamily: typography.headlineSm.fontFamily,
    color: "#fff",
  },
});
