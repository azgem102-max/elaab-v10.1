import { useApp, sportLabel, reliabilityColor, reliabilityLabel, formatReliability, SportType } from "@/context/AppContext";
import { getLevelLabel } from "@/components/LevelPickerSheet";
import { useColors } from "@/hooks/useColors";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Image, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT_LIME = "#C1F422";

const SPORT_THEMES: Record<string, { main: string; light: string; container: string; emoji: string }> = {
  football: { main: "#2C54E8", light: "#5B7FFF", container: "#EEF2FF", emoji: "⚽" },
  padel:    { main: "#0E9B6E", light: "#2EC795", container: "#DCFCE7", emoji: "🎾" },
  tennis:   { main: "#C97B18", light: "#F5A623", container: "#FEF3C7", emoji: "🎾" },
};

const BADGE_CONFIG: Record<string, { label: string; icon: "color-palette-outline" | "tennisball-outline" | "flash-outline"; color: string; bg: string }> = {
  artist: { label: "فنان", icon: "color-palette-outline", color: "#8B5CF6", bg: "#F3E8FF" },
  rock:   { label: "صخرة", icon: "tennisball-outline",    color: "#EF4444", bg: "#FEE2E2" },
  bolt:   { label: "برق",  icon: "flash-outline",         color: "#F59E0B", bg: "#FEF3C7" },
};

function CircularProgress({ size, strokeWidth, progress, color, bg }: {
  size: number; strokeWidth: number; progress: number; color: string; bg: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      <Defs>
        <SvgLinearGradient id="progGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={bg} strokeWidth={strokeWidth} />
      <Circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="url(#progGrad)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </Svg>
  );
}

function ReliabilityGaugeCard({ relValue, relColor, relLabel, formatted }: {
  relValue: number; relColor: string; relLabel: string; formatted: string;
}) {
  const GAUGE_SIZE = 120;
  const STROKE = 8;
  return (
    <View style={gaugeStyles.wrap}>
      <View style={{ width: GAUGE_SIZE, height: GAUGE_SIZE, alignItems: "center", justifyContent: "center" }}>
        <CircularProgress
          size={GAUGE_SIZE}
          strokeWidth={STROKE}
          progress={relValue}
          color={ACCENT_LIME}
          bg="rgba(193,244,34,0.15)"
        />
        <View style={gaugeStyles.inner}>
          <Text style={[gaugeStyles.score, { color: ACCENT_LIME }]}>{formatted}</Text>
          <Text style={[gaugeStyles.scoreLabel, { color: "#fff" }]}>موثوقية</Text>
        </View>
      </View>
      <View style={gaugeStyles.labelRow}>
        <View style={[gaugeStyles.pill, { backgroundColor: relColor + "28", borderColor: relColor + "50", borderWidth: 1 }]}>
          <View style={[gaugeStyles.dot, { backgroundColor: relColor }]} />
          <Text style={[gaugeStyles.pillText, { color: relColor }]}>{relLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10 },
  inner: { alignItems: "center", gap: 2 },
  score: { fontSize: 26, fontFamily: "Cairo_700Bold", lineHeight: 32 },
  scoreLabel: { fontSize: 11, fontFamily: "Cairo_400Regular", opacity: 0.8 },
  labelRow: { alignItems: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 24 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  pillText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
});

function ReliabilityTutorialCard() {
  const colors = useColors();
  const STEPS = [
    { icon: "search-outline" as const, label: "انضم لمباراة", desc: "ابحث وسجّل نفسك في أي مباراة متاحة" },
    { icon: "football-outline" as const, label: "العب وأكمل المباراة", desc: "احضر في الموعد وأكمل المباراة حتى النهاية" },
    { icon: "star-outline" as const, label: "احصل على تقييم", desc: "يقيّمك زملاؤك بعد كل مباراة تكتمل" },
  ];
  return (
    <View style={[styles.tutorialCard, { backgroundColor: "#1A1F35", overflow: "hidden", borderWidth: 1, borderColor: ACCENT_LIME + "30" }]}>
      <View style={styles.tutorialHeader}>
        <View style={[styles.tutorialIconWrap, { backgroundColor: ACCENT_LIME + "20" }]}>
          <Ionicons name="shield-outline" size={22} color={ACCENT_LIME} />
        </View>
        <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
          <Text style={[styles.tutorialTitle, { color: "#fff" }]}>مؤشر الموثوقية™</Text>
          <Text style={[styles.tutorialSubtitle, { color: "rgba(255,255,255,0.5)" }]}>
            يظهر مؤشرك بعد أول مباراة مكتملة
          </Text>
        </View>
      </View>
      <Text style={[styles.tutorialBody, { color: "rgba(255,255,255,0.7)" }]}>
        مؤشر الموثوقية يعكس كيف يراك زملاؤك — هل تحضر مبارياتك؟ وهل تلتزم بمواعيدك؟ كلما التزمت أكثر، ارتفع مؤشرك وأصبحت مرجعاً موثوقاً في المجتمع.
      </Text>
      <View style={styles.tutorialSteps}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.tutorialStep}>
            <View style={[styles.tutorialStepNumWrap, { backgroundColor: ACCENT_LIME + "25" }]}>
              <Text style={[styles.tutorialStepNum, { color: ACCENT_LIME }]}>{i + 1}</Text>
            </View>
            <View style={[styles.tutorialStepIcon, { backgroundColor: ACCENT_LIME + "15" }]}>
              <Ionicons name={step.icon} size={15} color={ACCENT_LIME} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end", gap: 1 }}>
              <Text style={[styles.tutorialStepLabel, { color: "#fff" }]}>{step.label}</Text>
              <Text style={[styles.tutorialStepDesc, { color: "rgba(255,255,255,0.5)" }]}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable
        style={[styles.tutorialCta, { backgroundColor: ACCENT_LIME }]}
        onPress={() => router.push("/(tabs)/explore")}
      >
        <Ionicons name="compass-outline" size={16} color="#111" />
        <Text style={[styles.tutorialCtaText, { color: "#111" }]}>اكتشف المباريات</Text>
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, matches, refreshProfile, refreshMatches } = useApp();
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 340, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoadError(false);
      setIsLoading(true);
      Promise.all([
        refreshProfile().catch(() => { setLoadError(true); }),
        refreshMatches().catch(() => {}),
      ]).finally(() => setIsLoading(false));
    }, [refreshProfile, refreshMatches])
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  if (!user && isLoading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: botPad, paddingHorizontal: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[{ borderRadius: 24, padding: 20, gap: 16, backgroundColor: "#1A1F35" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{ width: 108, height: 108, borderRadius: 54, backgroundColor: "rgba(255,255,255,0.08)" }} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ height: 20, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.08)" }} />
              <View style={{ height: 14, borderRadius: 7, width: "60%", backgroundColor: "rgba(255,255,255,0.08)" }} />
              <View style={{ height: 14, borderRadius: 7, width: "40%", backgroundColor: "rgba(255,255,255,0.08)" }} />
            </View>
          </View>
        </View>
        <SkeletonLoader count={3} variant="card" />
      </ScrollView>
    );
  }

  if (!user && loadError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 }}>
        <Ionicons name="cloud-offline-outline" size={52} color={colors.mutedForeground} />
        <Text style={{ fontSize: 18, fontFamily: "Cairo_700Bold", color: colors.onSurface, textAlign: "center" }}>
          تعذّر تحميل الملف الشخصي
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Cairo_400Regular", color: colors.mutedForeground, textAlign: "center" }}>
          تحقق من اتصالك بالإنترنت وحاول مجدداً
        </Text>
        <Pressable
          style={[{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }]}
          onPress={() => {
            setLoadError(false);
            setIsLoading(true);
            refreshProfile().catch(() => setLoadError(true)).finally(() => setIsLoading(false));
          }}
        >
          <Text style={{ fontSize: 15, fontFamily: "Cairo_700Bold", color: "#fff" }}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 }}>
        <Ionicons name="person-circle-outline" size={64} color={colors.mutedForeground} />
        <Text style={{ fontSize: 18, fontFamily: "Cairo_700Bold", color: colors.onSurface, textAlign: "center" }}>
          تعذّر تحميل الملف الشخصي
        </Text>
        <Pressable
          style={[{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }]}
          onPress={() => {
            setLoadError(false);
            setIsLoading(true);
            Promise.all([
              refreshProfile().catch(() => setLoadError(true)),
              refreshMatches().catch(() => {}),
            ]).finally(() => setIsLoading(false));
          }}
        >
          <Text style={{ fontSize: 15, fontFamily: "Cairo_700Bold", color: "#fff" }}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  const organizedMatches = matches.filter((m) => m.organizerId === user.id);
  const totalOrganized = organizedMatches.length;
  const avgAttendance = totalOrganized > 0
    ? Math.round(organizedMatches.reduce((sum, m) => {
        const present = m.players.filter((p) => p.attendance === "present").length;
        return sum + (m.players.length > 0 ? (present / m.players.length) * 100 : 0);
      }, 0) / totalOrganized)
    : 0;

  const relColor = reliabilityColor(user.reliability, colors);
  const relLabel = reliabilityLabel(user.reliability);
  const relValue = user.reliability ?? 0;
  const relFormatted = formatReliability(user.reliability, user.matchesPlayed);

  const totalRatings = user.rating.artist + user.rating.rock + user.rating.bolt;
  const organizerRating = totalRatings > 0
    ? (Math.min(5, totalRatings / Math.max(1, user.matchesPlayed) * 2 + 2.5)).toFixed(1)
    : null;
  const avgRating = totalRatings > 0 ? (totalRatings / 3).toFixed(1) : "—";

  const AVATAR_SIZE = 88;

  async function handleShareProfile() {
    try {
      await Share.share({
        message: `🏅 ${user!.nickname} على تطبيق العب!\nموثوقية: ${formatReliability(user!.reliability, user!.matchesPlayed)} • مباريات: ${user!.matchesPlayed}`,
        title: `ملف ${user!.nickname} الرياضي`,
      });
    } catch { }
  }

  const primarySport = user.sports[0];
  const sportTheme = primarySport ? (SPORT_THEMES[primarySport] ?? SPORT_THEMES.football) : SPORT_THEMES.football;

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
    <ScrollView
      style={[styles.container, { backgroundColor: "transparent" }]}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: botPad }]}
      showsVerticalScrollIndicator={false}
    >
      {/* === HERO CARD (dark branded) === */}
      <View style={styles.heroCard}>
        {/* Top row: avatar + name + reliability gauge */}
        <View style={styles.heroTop}>
          {/* Reliability Gauge */}
          <ReliabilityGaugeCard
            relValue={relValue}
            relColor={relColor}
            relLabel={relLabel}
            formatted={relFormatted}
          />

          {/* Name & Info */}
          <View style={styles.heroInfo}>
            <Text style={styles.heroBadgeLabel}>ملفي الرياضي</Text>
            <Text style={styles.heroNickname} numberOfLines={1}>{user.nickname}</Text>
            {user.phone ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Text style={styles.heroPhone}>{user.phone}</Text>
                <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.4)" />
              </View>
            ) : null}
          </View>

          {/* Avatar */}
          <View style={[styles.avatarWrap, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
            {user.avatarUri ? (
              <Image source={{ uri: user.avatarUri }} style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }} />
            ) : (
              <Text style={styles.avatarInitial}>{user.nickname.charAt(0)}</Text>
            )}
          </View>
        </View>

        {/* Sport pills */}
        {user.sports.length > 0 && (
          <View style={styles.sportsRow}>
            {user.sports.map((sport) => {
              const st = SPORT_THEMES[sport] ?? SPORT_THEMES.football;
              const profile = user.sportProfiles[sport];
              const numericLevel = profile?.skillLevelNumeric ?? null;
              const levelText = numericLevel
                ? getLevelLabel(numericLevel, sport as SportType)
                : profile?.skillLevel ?? null;
              const isRacket = sport === "padel" || sport === "tennis";
              return (
                <View key={sport} style={[styles.sportPill, { backgroundColor: "rgba(255,255,255,0.1)", borderColor: st.main + "40", borderWidth: 1 }]}>
                  <Text style={styles.sportPillEmoji}>{st.emoji}</Text>
                  <View style={styles.sportPillContent}>
                    <Text style={[styles.sportPillName, { color: st.light }]}>{sportLabel(sport)}</Text>
                    {isRacket && levelText ? (
                      <Text style={[styles.sportPillPos, { color: "rgba(255,255,255,0.5)" }]}>{levelText}</Text>
                    ) : !isRacket && profile?.skillLevel ? (
                      <Text style={[styles.sportPillPos, { color: "rgba(255,255,255,0.5)" }]}>{profile.skillLevel}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <Pressable
            style={styles.quickActionLime}
            onPress={() => router.push({ pathname: "/settings", params: { openEdit: "1" } })}
          >
            <Ionicons name="create-outline" size={15} color="#111" />
            <Text style={styles.quickActionLimeText}>عدّل الملف</Text>
          </Pressable>
          <Pressable
            style={styles.quickActionGhost}
            onPress={handleShareProfile}
          >
            <Ionicons name="share-social-outline" size={15} color="rgba(255,255,255,0.8)" />
            <Text style={styles.quickActionGhostText}>شارك ملفي</Text>
          </Pressable>
        </View>
      </View>

      {/* === RELIABILITY TUTORIAL (new users) === */}
      {user.reliability === null && <ReliabilityTutorialCard />}

      {/* === BADGES CARD === */}
      <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: "#E5E7EB" }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>شاراتي</Text>
          <View style={[styles.cardHeaderIconWrap, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="ribbon-outline" size={18} color={colors.primary} />
          </View>
        </View>
        <View style={styles.badgesRow}>
          {(["artist", "rock", "bolt"] as const).map((key) => {
            const cfg = BADGE_CONFIG[key];
            const count = user.rating[key] ?? 0;
            return (
              <View key={key} style={[styles.badgeItem, { backgroundColor: count > 0 ? cfg.bg : colors.surfaceContainerHigh, borderWidth: 1, borderColor: count > 0 ? cfg.color + "30" : colors.outline + "20" }]}>
                <View style={[styles.badgeIconWrap, { backgroundColor: count > 0 ? cfg.color + "20" : colors.outline + "15" }]}>
                  <Ionicons name={cfg.icon} size={22} color={count > 0 ? cfg.color : colors.mutedForeground} />
                </View>
                <Text style={[styles.badgeCount, { color: count > 0 ? cfg.color : colors.mutedForeground }]}>{count}</Text>
                <Text style={[styles.badgeLabel, { color: count > 0 ? cfg.color : colors.mutedForeground }]}>{cfg.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* === STATS CARD === */}
      <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: "#E5E7EB" }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>إحصائياتي</Text>
          <View style={[styles.cardHeaderIconWrap, { backgroundColor: sportTheme.main + "12" }]}>
            <Ionicons name="stats-chart-outline" size={18} color={sportTheme.main} />
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: sportTheme.main + "10", borderColor: sportTheme.main + "20", borderWidth: 1 }]}>
            <View style={[styles.statIconWrap, { backgroundColor: sportTheme.main + "20" }]}>
              <Ionicons name="football-outline" size={20} color={sportTheme.main} />
            </View>
            <Text style={[styles.statNum, { color: colors.onSurface }]}>{user.matchesPlayed}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>مباراة</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: relColor + "10", borderColor: relColor + "20", borderWidth: 1 }]}>
            <View style={[styles.statIconWrap, { backgroundColor: relColor + "20" }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={relColor} />
            </View>
            <Text style={[styles.statNum, { color: colors.onSurface }]}>{relFormatted}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>الحضور</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: "#F59E0B" + "10", borderColor: "#F59E0B" + "20", borderWidth: 1 }]}>
            <View style={[styles.statIconWrap, { backgroundColor: "#F59E0B" + "20" }]}>
              <Ionicons name="star-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statNum, { color: colors.onSurface }]}>{avgRating}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>التقييم</Text>
          </View>
        </View>
      </View>

      {/* === ORGANIZER STATS === */}
      {totalOrganized > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: "#E5E7EB" }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>كمنظّم</Text>
            <View style={[styles.organizerBadge, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              <Text style={[styles.organizerBadgeText, { color: colors.primary }]}>منظّم</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              <Text style={[styles.statNum, { color: colors.onSurface }]}>{totalOrganized}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>نظّمها</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="people-outline" size={22} color={colors.secondary} />
              <Text style={[styles.statNum, { color: colors.onSurface }]}>{avgAttendance > 0 ? `${avgAttendance}%` : "—"}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>الحضور</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="star-outline" size={22} color="#F59E0B" />
              <Text style={[styles.statNum, { color: colors.onSurface }]}>{organizerRating ?? "—"}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>التقييم</Text>
            </View>
          </View>
          {organizedMatches.length > 0 && (
            <Pressable
              style={[styles.viewOrgMatchesBtn, { backgroundColor: colors.primary + "12" }]}
              onPress={() => {
                const latest = organizedMatches.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
                if (latest) router.push({ pathname: "/manage-match", params: { id: latest.id } });
              }}
            >
              <Text style={[styles.viewOrgMatchesBtnText, { color: colors.primary }]}>إدارة آخر مباراة</Text>
              <Ionicons name="chevron-back" size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>
      )}

      {/* === MENU === */}
      <View style={[styles.menuSection, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: "#E5E7EB" }]}>
        {[
          { icon: "notifications-outline" as const, label: "الإشعارات", route: "/notifications", color: colors.secondary, params: undefined },
          { icon: "settings-outline" as const, label: "الإعدادات", route: "/settings", color: colors.tertiary, params: undefined },
          { icon: "shield-outline" as const, label: "الشروط والخصوصية", route: "/settings", color: colors.mutedForeground, params: { scrollToAbout: "1" } },
        ].map((item, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: colors.surfaceContainerHigh },
            ]}
            onPress={() => {
              if (item.params) {
                router.push({ pathname: item.route as "/settings", params: item.params });
              } else {
                router.push(item.route as "/settings" | "/notifications");
              }
            }}
          >
            <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
            <Text style={[styles.menuText, { color: colors.onSurface }]}>{item.label}</Text>
            <View style={[styles.menuIconWrap, { backgroundColor: item.color + "12", borderWidth: 1, borderColor: item.color + "20" }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
          </Pressable>
        ))}
      </View>

    </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },

  heroCard: {
    borderRadius: 28,
    padding: 20,
    gap: 18,
    backgroundColor: "#111827",
    overflow: "hidden",
  },
  heroTop: { flexDirection: "row", gap: 12, alignItems: "center", justifyContent: "space-between" },
  heroInfo: { flex: 1, gap: 4, alignItems: "flex-end" },
  heroBadgeLabel: { fontSize: 11, fontFamily: "Cairo_400Regular", color: "rgba(255,255,255,0.4)", textAlign: "right" },
  heroNickname: { fontSize: 22, fontFamily: "Cairo_700Bold", color: "#fff", textAlign: "right", lineHeight: 32 },
  heroPhone: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "rgba(255,255,255,0.4)" },
  avatarWrap: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 2, borderColor: ACCENT_LIME + "50" },
  avatarInitial: { fontSize: 32, fontFamily: "Cairo_700Bold", color: ACCENT_LIME },

  sportsRow: { flexDirection: "row", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" },
  sportPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  sportPillEmoji: { fontSize: 16 },
  sportPillContent: { alignItems: "flex-end" },
  sportPillName: { fontSize: 13, fontFamily: "Cairo_700Bold", lineHeight: 20 },
  sportPillPos: { fontSize: 11, fontFamily: "Cairo_400Regular", lineHeight: 16 },

  quickActionsRow: { flexDirection: "row", gap: 10 },
  quickActionLime: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: ACCENT_LIME,
  },
  quickActionLimeText: { fontSize: 13, fontFamily: "Cairo_700Bold", color: "#111" },
  quickActionGhost: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  quickActionGhostText: { fontSize: 13, fontFamily: "Cairo_700Bold", color: "rgba(255,255,255,0.85)" },

  card: { borderRadius: 24, padding: 20, gap: 16 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardHeaderIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  sectionTitle: { fontSize: 17, fontFamily: "Cairo_700Bold", textAlign: "right", lineHeight: 26 },

  badgesRow: { flexDirection: "row", gap: 10 },
  badgeItem: { flex: 1, alignItems: "center", gap: 8, paddingVertical: 16, borderRadius: 20 },
  badgeIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  badgeCount: { fontSize: 20, fontFamily: "Cairo_700Bold", lineHeight: 26 },
  badgeLabel: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },

  statsGrid: { flexDirection: "row", gap: 10 },
  statItem: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 16, borderRadius: 18 },
  statIconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  statNum: { fontSize: 22, fontFamily: "Cairo_700Bold", lineHeight: 30 },
  statLabel: { fontSize: 11, fontFamily: "Cairo_600SemiBold", textAlign: "center" },

  organizerBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  organizerBadgeText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  viewOrgMatchesBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 16, marginTop: 4 },
  viewOrgMatchesBtnText: { fontSize: 14, fontFamily: "Cairo_700Bold" },

  menuSection: { borderRadius: 24, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 16 },
  menuText: { flex: 1, fontSize: 15, fontFamily: "Cairo_600SemiBold", textAlign: "right", marginHorizontal: 12, lineHeight: 24 },
  menuIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  tutorialCard: { borderRadius: 24, padding: 18, gap: 14 },
  tutorialHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  tutorialIconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  tutorialTitle: { fontSize: 17, fontFamily: "Cairo_700Bold", textAlign: "right" },
  tutorialSubtitle: { fontSize: 12, fontFamily: "Cairo_400Regular", textAlign: "right" },
  tutorialBody: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "right", lineHeight: 22 },
  tutorialSteps: { gap: 10 },
  tutorialStep: { flexDirection: "row", alignItems: "center", gap: 10 },
  tutorialStepNumWrap: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tutorialStepNum: { fontSize: 12, fontFamily: "Cairo_700Bold", lineHeight: 16 },
  tutorialStepIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tutorialStepLabel: { fontSize: 13, fontFamily: "Cairo_700Bold", textAlign: "right" },
  tutorialStepDesc: { fontSize: 11, fontFamily: "Cairo_400Regular", textAlign: "right", lineHeight: 17 },
  tutorialCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 20, marginTop: 2 },
  tutorialCtaText: { fontSize: 14, fontFamily: "Cairo_700Bold" },
});
