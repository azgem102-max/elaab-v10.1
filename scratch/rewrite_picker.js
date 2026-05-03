const fs = require('fs');

let file = fs.readFileSync('artifacts/mobile/components/LevelPickerSheet.tsx', 'utf8');

// 1. Remove CATEGORY_COLORS and GRADIENT_COLORS
file = file.replace(/const CATEGORY_COLORS.*?};\n\nconst GRADIENT_COLORS = \[.*?\];\n\n/s, '');

// 2. Refactor SportLevelSvg
file = file.replace(/function SportLevelSvg.*?return \(\n    <Svg.*?<\/Svg>\n  \);\n}/s, `function SportLevelSvg({ category, size = 60, mainColor, bgColor }: { category: string; size?: number; mainColor: string; bgColor: string }) {
  if (category === "beginner") {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="28" fill={bgColor} />
        <Path d="M20 38 Q30 20 40 38" stroke={mainColor} strokeWidth="3" fill="none" strokeLinecap="round" />
        <Circle cx="30" cy="32" r="6" fill={mainColor} fillOpacity="0.3" stroke={mainColor} strokeWidth="2" />
        <Line x1="30" y1="26" x2="30" y2="18" stroke={mainColor} strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="30" y1="18" x2="24" y2="22" stroke={mainColor} strokeWidth="2" strokeLinecap="round" />
      </Svg>
    );
  }
  if (category === "intermediate") {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="28" fill={bgColor} />
        <Rect x="22" y="20" width="4" height="22" rx="2" fill={mainColor} />
        <Rect x="28" y="25" width="4" height="17" rx="2" fill={mainColor} fillOpacity="0.7" />
        <Rect x="34" y="30" width="4" height="12" rx="2" fill={mainColor} fillOpacity="0.4" />
        <Circle cx="40" cy="20" r="5" fill={bgColor} stroke={mainColor} strokeWidth="2" />
        <Path d="M38 20 L40 22 L44 17" stroke={mainColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (category === "advanced") {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="28" fill={bgColor} />
        <Path d="M18 42 L24 30 L30 36 L36 20 L42 28" stroke={mainColor} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="42" cy="28" r="4" fill={mainColor} />
        <Circle cx="30" cy="36" r="3" fill={mainColor} fillOpacity="0.5" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="28" fill={bgColor} />
      <Path d="M30 14 L34 24 H44 L36 30 L39 41 L30 35 L21 41 L24 30 L16 24 H26 Z" fill={mainColor} fillOpacity="0.85" stroke={mainColor} strokeWidth="1" />
    </Svg>
  );
}`);

// 3. LevelGuideCard
file = file.replace(/function LevelGuideCard.*?<\/View>\n  \);\n}/s, `function LevelGuideCard({
  category,
  levels,
  onSelect,
}: {
  category: string;
  levels: LevelDefinition[];
  onSelect: (value: number) => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const mainColor = colors.primary;
  const bgColor = colors.surfaceContainer;
  const midLevel = levels[Math.floor(levels.length / 2)];
  const traits = (t(\`levels.traits.\${category}\` as any, { returnObjects: true } as any) as unknown) as string[];
  const range = \`\${levels[0].value.toFixed(1)} – \${levels[levels.length - 1].value.toFixed(1)}\`;

  return (
    <View style={[guideStyles.card, { backgroundColor: bgColor, borderColor: "transparent", borderWidth: 1 }]}>
      <SportLevelSvg category={category} size={64} mainColor={mainColor} bgColor={colors.surfaceContainerLow} />
      <Text style={[guideStyles.catName, { color: mainColor }]}>{t(CATEGORY_KEYS[category] as any)}</Text>
      <Text style={[guideStyles.range, { color: mainColor + "AA" }]}>{range}</Text>
      <View style={guideStyles.traits}>
        {(traits || []).map((tText, i) => (
          <View key={i} style={guideStyles.traitRow}>
            <Text style={[guideStyles.traitDot, { color: mainColor }]}>●</Text>
            <Text style={[guideStyles.traitText, { color: mainColor + "CC" }]}>{tText}</Text>
          </View>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [
          guideStyles.pickBtn,
          { backgroundColor: mainColor, transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}
        onPress={() => onSelect(midLevel.value)}
      >
        <Text style={guideStyles.pickBtnText}>{t("levels.thisIsMe")}</Text>
      </Pressable>
    </View>
  );
}`);

// 4. Removed getColorForValue / getCategoryForValue (it will be simplified)
file = file.replace(/function getCategoryForValue.*?return CATEGORY_COLORS.*? \?\? "#0288D1";\n}\n/s, `function getCategoryForValue(value: number, levels: LevelDefinition[]): string {
  const level = levels.find((l) => l.value === value) ?? levels.find((l) => l.value >= value) ?? levels[levels.length - 1];
  return level!.category;
}
`);

// 5. Refactor LevelDetailCard
file = file.replace(/function LevelDetailCard.*?<\/Animated\.View>\n  \);\n}/s, `function LevelDetailCard({
  level,
  visible,
}: {
  level: LevelDefinition;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const mainColor = colors.primary;
  const bgColor = colors.surfaceContainerLow;
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
        { backgroundColor: bgColor, borderColor: "transparent", borderWidth: 1 },
        animStyle,
      ]}
    >
      <View style={detailStyles.topRow}>
        <View style={[detailStyles.valueBadge, { backgroundColor: mainColor }]}>
          <Text style={detailStyles.valueText}>{level.value.toFixed(1)}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
          <Text style={[detailStyles.levelName, { color: mainColor }]}>{level.name}</Text>
          <View style={[detailStyles.catPill, { backgroundColor: mainColor + "15" }]}>
            <Text style={[detailStyles.catPillText, { color: mainColor }]}>
              {t(CATEGORY_KEYS[level.category] as any)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[detailStyles.desc, { color: colors.mutedForeground }]}>{level.description}</Text>
    </Animated.View>
  );
}`);

// 6. Refactor tracking logic in LevelPickerSheet main body
// We replace the scrollview content.
const startMarker = "<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={pickerStyles.body}>";
const endMarker = "</ScrollView>";
const oldScrollViewContent = file.substring(file.indexOf(startMarker), file.indexOf(endMarker) + endMarker.length);


const newScrollViewContent = `<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={pickerStyles.body}>
            <View style={pickerStyles.gradientBarWrap}>
              <View style={[pickerStyles.gradientBar, { width: BAR_WIDTH, backgroundColor: colors.surfaceContainerHighest || "rgba(0,0,0,0.06)" }]} />
              
              <Animated.View 
                style={[
                  pickerStyles.gradientBar, 
                  { 
                    position: "absolute", 
                    left: 24, 
                    top: 16, 
                    width: levels.length > 1 ? (Math.max(0, levels.findIndex(lv => lv.value === activeFocusLevel)) / (levels.length - 1)) * BAR_WIDTH : 0, 
                    backgroundColor: colors.primary 
                  }
                ]} 
              />

              <View style={[pickerStyles.dotsRow, { width: BAR_WIDTH }]}>
                {levels.map((lv, i) => {
                  const isSelected = multiSelect ? multiSelected.includes(lv.value) : lv.value === selected;
                  const isPastOrSelected = lv.value <= activeFocusLevel;
                  
                  const dotMainColor = colors.primary;
                  const dotBg = isPastOrSelected ? dotMainColor : colors.surface;
                  const dotBorderColor = isPastOrSelected ? "transparent" : (colors.surfaceContainerHighest || "rgba(0,0,0,0.06)");

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
                          borderRadius: 20,
                          backgroundColor: dotBg,
                          borderColor: dotBorderColor,
                          borderWidth: isSelected || isPastOrSelected ? 0 : 2,
                          shadowColor: isSelected ? dotMainColor : "transparent",
                          shadowOpacity: isSelected ? 0.3 : 0,
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
                <Text key={i} style={[pickerStyles.barLabel, { color: colors.mutedForeground }]}>
                  {t(CATEGORY_KEYS[cat] as any)}
                </Text>
              ))}
            </View>

            <LevelDetailCard level={selectedLevel} visible={visible} />

            <Pressable
              style={({ pressed }) => [
                pickerStyles.confirmBtn,
                { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
              onPress={() => {
                if (multiSelect && onConfirmMulti) {
                  onConfirmMulti(multiSelected);
                } else if (onConfirm) {
                  onConfirm(selected);
                }
                onClose();
              }}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={pickerStyles.confirmText}>
                {multiSelect ? (multiSelected.length > 0 ? t("levels.confirmMulti", { count: multiSelected.length }) : t("levels.confirmMultiEmpty")) : t("levels.confirmLevel", { level: selected.toFixed(1) })}
              </Text>
            </Pressable>
          </ScrollView>`;

file = file.replace(oldScrollViewContent, newScrollViewContent);

// Also remove `const color = getColorForValue(activeFocusLevel, levels);`
file = file.replace(/const color = getColorForValue\(activeFocusLevel, levels\);\n/g, "");

// getLevelColor exported bottom
file = file.replace(/export function getLevelColor.*?}\n/s, `export function getLevelColor(value: number | null | undefined, sport: SportType): string {
  // We unified the aesthetic to match Visual Silence app identity (Emerald green).
  return "#05B757"; 
}\n`);

fs.writeFileSync('artifacts/mobile/components/LevelPickerSheet.tsx', file);
