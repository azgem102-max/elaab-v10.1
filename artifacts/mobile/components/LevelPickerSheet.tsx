import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect, Line } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/i18n";
import type { SportType } from "@/context/AppContext";
import { typography } from "@/constants/typography";


const { width: SCREEN_W } = Dimensions.get("window");

export interface LevelDefinition {
  value: number;
  name: string;
  description: string;
  category: "beginner" | "intermediate" | "advanced" | "tournament";
}

export function getLevelsForSport(sport: SportType, t: any = (key: string) => key): LevelDefinition[] {
  if (sport === "padel") {
    return [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0].map(v => {
      const key = `l${v.toFixed(1).replace(".", "_")}` as any;
      return {
        value: v,
        name: t(`levels.padel.${key}.name`),
        description: t(`levels.padel.${key}.desc`),
        category: v < 2.5 ? "beginner" : v < 4.0 ? "intermediate" : v < 5.0 ? "advanced" : "tournament"
      };
    });
  }
  if (sport === "tennis") {
    return [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0].map(v => {
      const key = `l${v.toFixed(1).replace(".", "_")}` as any;
      return {
        value: v,
        name: t(`levels.tennis.${key}.name`),
        description: t(`levels.tennis.${key}.desc`),
        category: v < 2.5 ? "beginner" : v < 4.0 ? "intermediate" : v < 5.5 ? "advanced" : "tournament"
      };
    });
  }
  return [];
}

const CATEGORY_KEYS: Record<string, string> = {
  beginner: "levels.beginner",
  intermediate: "levels.intermediate",
  advanced: "levels.advanced",
  tournament: "levels.tournament",
};

const CATEGORY_COLORS: Record<string, { main: string; bg: string }> = {
  beginner: { main: "#2E7D32", bg: "#E8F5E9" },
  intermediate: { main: "#0288D1", bg: "#E1F5FE" },
  advanced: { main: "#EF6C00", bg: "#FFF3E0" },
  tournament: { main: "#F9A825", bg: "#FFFDE7" },
};

const GRADIENT_COLORS = ["#2E7D32", "#0288D1", "#EF6C00", "#F9A825"];

function SportLevelSvg({ category, size = 60 }: { category: string; size?: number }) {
  const color = CATEGORY_COLORS[category]?.main ?? "#0288D1";

  if (category === "beginner") {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="28" fill={CATEGORY_COLORS.beginner.bg} />
        <Path d="M20 38 Q30 20 40 38" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
        <Circle cx="30" cy="32" r="6" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
        <Line x1="30" y1="26" x2="30" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="30" y1="18" x2="24" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </Svg>
    );
  }
  if (category === "intermediate") {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="28" fill={CATEGORY_COLORS.intermediate.bg} />
        <Rect x="22" y="20" width="4" height="22" rx="2" fill={color} />
        <Rect x="28" y="25" width="4" height="17" rx="2" fill={color} fillOpacity="0.7" />
        <Rect x="34" y="30" width="4" height="12" rx="2" fill={color} fillOpacity="0.4" />
        <Circle cx="40" cy="20" r="5" fill={CATEGORY_COLORS.intermediate.bg} stroke={color} strokeWidth="2" />
        <Path d="M38 20 L40 22 L44 17" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (category === "advanced") {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="28" fill={CATEGORY_COLORS.advanced.bg} />
        <Path d="M18 42 L24 30 L30 36 L36 20 L42 28" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="42" cy="28" r="4" fill={color} />
        <Circle cx="30" cy="36" r="3" fill={color} fillOpacity="0.5" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="28" fill={CATEGORY_COLORS.tournament.bg} />
      <Path d="M30 14 L34 24 H44 L36 30 L39 41 L30 35 L21 41 L24 30 L16 24 H26 Z" fill={CATEGORY_COLORS.tournament.main} fillOpacity="0.85" stroke={CATEGORY_COLORS.tournament.main} strokeWidth="1" />
    </Svg>
  );
}

function LevelGuideCard({
  category,
  levels,
  onSelect,
}: {
  category: string;
  levels: LevelDefinition[];
  onSelect: (value: number) => void;
}) {
  const { t } = useTranslation();
  const cat = CATEGORY_COLORS[category];
  const midLevel = levels[Math.floor(levels.length / 2)];
  const traits = (t(`levels.traits.${category}` as any, { returnObjects: true } as any) as unknown) as string[];
  const range = `${levels[0].value.toFixed(1)} – ${levels[levels.length - 1].value.toFixed(1)}`;

  return (
    <View style={[guideStyles.card, { backgroundColor: cat.bg, borderColor: cat.main + "30", borderWidth: 1 }]}>
      <SportLevelSvg category={category} size={64} />
      <Text style={[guideStyles.catName, { color: cat.main }]}>{t(CATEGORY_KEYS[category] as any)}</Text>
      <Text style={[guideStyles.range, { color: cat.main + "AA" }]}>{range}</Text>
      <View style={guideStyles.traits}>
        {(traits || []).map((tText, i) => (
          <View key={i} style={guideStyles.traitRow}>
            <Text style={[guideStyles.traitDot, { color: cat.main }]}>●</Text>
            <Text style={[guideStyles.traitText, { color: cat.main + "CC" }]}>{tText}</Text>
          </View>
        ))}
      </View>
      <Pressable
        style={[guideStyles.pickBtn, { backgroundColor: cat.main }]}
        onPress={() => onSelect(midLevel.value)}
      >
        <Text style={guideStyles.pickBtnText}>{t("levels.thisIsMe")}</Text>
      </Pressable>
    </View>
  );
}

const guideStyles = StyleSheet.create({
  card: {
    width: SCREEN_W * 0.68,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 8,
    alignItems: "center",
    gap: 10,
  },
  catName: { fontSize: 22, fontFamily: typography.headlineSm.fontFamily, textAlign: "center" },
  range: { fontSize: 14, fontFamily: typography.bodyLg.fontFamily },
  traits: { gap: 4, width: "100%", paddingHorizontal: 4 },
  traitRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-end" },
  traitDot: { fontSize: 8 },
  traitText: { fontSize: 13, fontFamily: typography.body.fontFamily, textAlign: "right", flex: 1 },
  pickBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 50, marginTop: 4 },
  pickBtnText: { fontSize: 15, fontFamily: typography.headlineSm.fontFamily, color: "#fff" },
});

interface LevelGuideSheetProps {
  visible: boolean;
  sport: SportType;
  onClose: () => void;
  onSelect: (value: number) => void;
}

function LevelGuideSheet({ visible, sport, onClose, onSelect }: LevelGuideSheetProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const translateY = useSharedValue(600);

  useEffect(() => {
    if (visible) {
      if (Platform.OS === "web") {
        translateY.value = 0;
      } else {
        translateY.value = withSpring(0, { damping: 16, stiffness: 120 });
      }
    } else {
      if (Platform.OS === "web") {
        translateY.value = 600;
      } else {
        translateY.value = withTiming(600, { duration: 220 });
      }
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const levels = getLevelsForSport(sport, t);
  const categories = [...new Set(levels.map((l) => l.category))];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={lgsStyles.overlay} onPress={onClose} />
      <Animated.View
        style={[lgsStyles.sheet, { backgroundColor: colors.surfaceContainerLow }, sheetStyle]}
      >
        <View style={lgsStyles.handleBar} />
        <View style={lgsStyles.headerRow}>
          <Pressable onPress={onClose} style={lgsStyles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={[lgsStyles.title, { color: colors.onSurface }]}>{t("levels.levelGuide")}</Text>
          <View style={{ width: 32 }} />
        </View>
        <Text style={[lgsStyles.subtitle, { color: colors.mutedForeground }]}>
          {t("levels.chooseCat")}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={lgsStyles.scrollContent}
          style={{ flexGrow: 0 }}
        >
          {categories.map((cat) => (
            <LevelGuideCard
              key={cat}
              category={cat}
              levels={levels.filter((l) => l.category === cat)}
              onSelect={(v) => { onClose(); setTimeout(() => onSelect(v), 100); }}
            />
          ))}
        </ScrollView>
        <View style={{ height: 20 }} />
      </Animated.View>
    </Modal>
  );
}

const lgsStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 30,
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
  title: { fontSize: 18, fontFamily: typography.headlineSm.fontFamily },
  subtitle: { fontSize: 13, fontFamily: typography.body.fontFamily, textAlign: "center", marginBottom: 16 },
  scrollContent: { paddingHorizontal: 12, paddingBottom: 8 },
});

function getCategoryForValue(value: number, levels: LevelDefinition[]): string {
  const level = levels.find((l) => l.value === value) ?? levels.find((l) => l.value >= value) ?? levels[levels.length - 1];
  return level!.category;
}

function getColorForValue(value: number, levels: LevelDefinition[]): string {
  const cat = getCategoryForValue(value, levels);
  return CATEGORY_COLORS[cat]?.main ?? "#0288D1";
}

function LevelDetailCard({
  level,
  visible,
}: {
  level: LevelDefinition;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const cat = CATEGORY_COLORS[level.category];
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    opacity.value = withTiming(0, { duration: 60 }, () => {
      opacity.value = withTiming(1, { duration: 220 });
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });
    });
    scale.value = withTiming(0.92, { duration: 60 });
  }, [level.value]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        detailStyles.card,
        { backgroundColor: cat.bg, borderColor: cat.main + "40", borderWidth: 1 },
        animStyle,
      ]}
    >
      <View style={detailStyles.topRow}>
        <View style={[detailStyles.valueBadge, { backgroundColor: cat.main }]}>
          <Text style={detailStyles.valueText}>{level.value.toFixed(1)}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
          <Text style={[detailStyles.levelName, { color: cat.main }]}>{level.name}</Text>
          <View style={[detailStyles.catPill, { backgroundColor: cat.main + "20" }]}>
            <Text style={[detailStyles.catPillText, { color: cat.main }]}>
              {t(CATEGORY_KEYS[level.category] as any)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[detailStyles.desc, { color: cat.main + "BB" }]}>{level.description}</Text>
    </Animated.View>
  );
}

const detailStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  valueBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: { fontSize: 18, fontFamily: typography.headlineSm.fontFamily, color: "#fff" },
  levelName: { fontSize: 16, fontFamily: typography.headlineSm.fontFamily, textAlign: "right" },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 50,
  },
  catPillText: { fontSize: 12, fontFamily: typography.bodyLg.fontFamily },
  desc: { fontSize: 13, fontFamily: typography.body.fontFamily, textAlign: "right", lineHeight: 20 },
});

interface LevelPickerSheetProps {
  visible: boolean;
  sport: SportType;
  currentValue: number | null;
  onClose: () => void;
  onConfirm: (value: number) => void;
}

export function LevelPickerSheet({ visible, sport, currentValue, onClose, onConfirm }: LevelPickerSheetProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const translateY = useSharedValue(Platform.OS === "web" ? 0 : 700);

  const levels = getLevelsForSport(sport, t);
  const defaultValue = currentValue ?? (levels.length > 2 ? levels[2].value : levels[0].value);
  const [selected, setSelected] = useState<number>(defaultValue);

  useEffect(() => {
    if (visible) {
      setSelected(currentValue ?? defaultValue);
      if (Platform.OS === "web") {
        translateY.value = 0;
      } else {
        translateY.value = withSpring(0, { damping: 16, stiffness: 120 });
      }
    } else {
      if (Platform.OS === "web") {
        translateY.value = 0;
      } else {
        translateY.value = withTiming(700, { duration: 220 });
      }
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const selectLevel = useCallback((value: number) => {
    setSelected(value);
  }, []);

  const selectedLevel = levels.find((l) => l.value === selected) ?? levels[0];
  const color = getColorForValue(selected, levels);

  const BAR_WIDTH = SCREEN_W - 48 - 32;
  const dotSize = Math.min(22, Math.max(14, BAR_WIDTH / levels.length - 2));

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <Pressable style={pickerStyles.overlay} onPress={onClose} />
        <Animated.View
          style={[pickerStyles.sheet, { backgroundColor: colors.surfaceContainerLow }, sheetStyle]}
        >
          <View style={pickerStyles.handleBar} />
          <View style={pickerStyles.headerRow}>
            <Pressable onPress={onClose} style={pickerStyles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.onSurface} />
            </Pressable>
            <Text style={[pickerStyles.title, { color: colors.onSurface }]}>
              {sport === "padel" ? t("levels.yourLevelPadel") : t("levels.yourLevelTennis")}
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={pickerStyles.body}>
            <View style={pickerStyles.gradientBarWrap}>
              <View style={[pickerStyles.gradientBar, { width: BAR_WIDTH, backgroundColor: "#2C54E8" }]} />
              <View style={[pickerStyles.dotsRow, { width: BAR_WIDTH }]}>
                {levels.map((lv, i) => {
                  const isSelected = lv.value === selected;
                  const colorIndex = Math.floor((i / (levels.length - 1)) * (GRADIENT_COLORS.length - 1));
                  const dotColor = GRADIENT_COLORS[colorIndex];
                  return (
                    <Pressable
                      key={lv.value}
                      onPress={() => selectLevel(lv.value)}
                      hitSlop={8}
                      style={[
                        pickerStyles.dot,
                        {
                          width: isSelected ? dotSize + 6 : dotSize,
                          height: isSelected ? dotSize + 6 : dotSize,
                          borderRadius: (isSelected ? dotSize + 6 : dotSize) / 2,
                          backgroundColor: isSelected ? dotColor : "#fff",
                          borderColor: dotColor,
                          borderWidth: isSelected ? 0 : 2,
                          shadowColor: isSelected ? dotColor : "transparent",
                          shadowOpacity: isSelected ? 0.5 : 0,
                          shadowRadius: isSelected ? 6 : 0,
                          elevation: isSelected ? 6 : 0,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            <View style={pickerStyles.labelsRow}>
              {["beginner", "intermediate", "advanced", "tournament"].map((cat, i) => (
                <Text key={i} style={[pickerStyles.barLabel, { color: GRADIENT_COLORS[i] }]}>
                  {t(CATEGORY_KEYS[cat] as any)}
                </Text>
              ))}
            </View>

            <LevelDetailCard level={selectedLevel} visible={visible} />

            <Pressable
              style={[pickerStyles.confirmBtn, { backgroundColor: color }]}
              onPress={() => { onConfirm(selected); onClose(); }}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={pickerStyles.confirmText}>
                {t("levels.confirmLevel", { level: selected.toFixed(1) })}
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </Modal>

    </>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
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
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: typography.headlineSm.fontFamily },
  body: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  gradientBarWrap: { alignItems: "center", paddingVertical: 16 },
  gradientBar: { height: 8, borderRadius: 4 },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "absolute",
    top: 12,
  },
  dot: { alignItems: "center", justifyContent: "center" },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: -6,
  },
  barLabel: { fontSize: 10, fontFamily: typography.bodyLg.fontFamily },
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
  guideBtnText: { fontSize: 14, fontFamily: typography.bodyLg.fontFamily },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 50,
    marginTop: 4,
  },
  confirmText: { fontSize: 16, fontFamily: typography.headlineSm.fontFamily, color: "#fff" },
});

export function getLevelLabel(value: number | null | undefined, sport: SportType, t: any): string {
  if (value == null) return "";
  const levels = getLevelsForSport(sport, t);
  if (levels.length === 0) return "";
  const level = levels.find((l) => l.value === value) ?? levels.reduce((prev, curr) =>
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
  );
  return `${value.toFixed(1)} ★ ${level.name}`;
}

export function getLevelColor(value: number | null | undefined, sport: SportType): string {
  if (value == null) return "#0288D1";
  const levels = getLevelsForSport(sport);
  if (levels.length === 0) return "#0288D1";
  return getColorForValue(value, levels);
}
