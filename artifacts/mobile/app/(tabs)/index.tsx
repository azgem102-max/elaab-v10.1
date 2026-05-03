import { useApp, Match, Group, sportColor } from "@/context/AppContext";
import { getSportIcon } from "@/components/icons/SportIcons";
import { useColors } from "@/hooks/useColors";
import { LiquidProgressBar } from "@/components/glass/LiquidProgressBar";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { PositionPickerModal } from "@/components/PositionPickerModal";
import { getSportTheme } from "@/constants/sportTheme";
import { BrandLogo } from "@/components/BrandLogo";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "@/i18n";
import { getTypography, typography } from "@/constants/typography";

// ─── Stagger Animation Hook ─────────────────────────────────────
// Skill: "Split into logical groups and stagger with ~100ms delay"
function useStaggeredEntrance(count: number, delay = 100) {
  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;
  const translateAnims = useRef(
    Array.from({ length: count }, () => new Animated.Value(12))
  ).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: i * delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnims[i], {
          toValue: 0,
          duration: 400,
          delay: i * delay,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.parallel(animations).start();
  }, []);

  return anims.map((opacity, i) => ({
    opacity,
    transform: [{ translateY: translateAnims[i] }],
  }));
}

function getGreeting(locale: string): string {
  const hour = new Date().getHours();
  if (locale === 'en') {
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "مساء الخير";
  return "مساء النور";
}

function QuickActionsScroll() {
  const colors = useColors();
  const { t } = useTranslation();

  // Skill: Staggered enter for each quick action card
  const stagger = useStaggeredEntrance(4, 80);

  const QUICK_ACTIONS = [
    { 
      icon: "add-outline", 
      label: t('home.quickActions.createMatch'), 
      subItem: "استضافة",
      route: "/create-match",
      isPrimary: true 
    },
    { 
      icon: "search-outline", 
      label: t('home.quickActions.explore'), 
      subItem: "البحث",
      route: "/(tabs)/explore",
      isPrimary: false 
    },
    { 
      icon: "people-outline", 
      label: t('home.quickActions.myGroups'), 
      subItem: "مجموعاتي",
      route: "/(tabs)/groups",
      isPrimary: false 
    },
    { 
      icon: "calendar-outline", 
      label: t('home.quickActions.myMatches'), 
      subItem: "مبارياتي",
      route: "/(tabs)/my-matches",
      isPrimary: false 
    },
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.quickActionsScroll}
    >
      {QUICK_ACTIONS.map((action, index) => (
        <Animated.View key={index} style={stagger[index]}>
          <Pressable
            style={({ pressed }) => [
              styles.quickActionCard,
              { 
                backgroundColor: action.isPrimary ? colors.primary : colors.surface,
                // Skill: Scale on press — always 0.96, never opacity
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
              // Skill: Layered shadows for natural depth
              action.isPrimary ? styles.quickActionCardShadowPrimary : styles.quickActionCardShadow,
            ]}
            onPress={() => router.push(action.route as never)}
          >
            {/* Skill: Concentric border radius — outer 24px, padding ~12px → inner = 24-12 = 12px */}
            <View style={[
              styles.quickActionIconWrap, 
              { backgroundColor: action.isPrimary ? 'rgba(255,255,255,0.2)' : colors.primaryContainer }
            ]}>
              <Ionicons
                name={action.icon as any}
                size={20}
                color={action.isPrimary ? '#fff' : colors.primary}
              />
            </View>
            <View style={{ gap: 2 }}>
              <Text style={[styles.quickActionLabel, { color: action.isPrimary ? '#fff' : colors.onSurface }]}>
                 {action.label}
              </Text>
              <Text style={[{ fontSize: 11, fontFamily: typography.body.fontFamily }, { color: action.isPrimary ? 'rgba(255,255,255,0.8)' : colors.mutedForeground }]}>
                 {action.subItem}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

function UpcomingMatchCard({
  match,
  onPress,
  onJoin,
  onLeave,
}: {
  match: Match;
  onPress: () => void;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const colors = useColors();
  const { t, locale } = useTranslation();
  const sportTheme = getSportTheme(match.sport);
  const SportIcon = getSportIcon(match.sport);

  const filled = match.playerCount ?? match.players.length;
  const total = match.maxPlayers;
  const remaining = total - filled;
  const isFull = filled >= total;

  const dateStr = match.date
    ? new Date(match.date).toLocaleDateString(locale === 'ar' ? "ar-SA" : "en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "";

  const sportLabels: Record<string, string> = {
    football: t('sports.football'),
    padel: t('sports.padel'),
    tennis: t('sports.tennis'),
  };

  return (
    <Pressable
      onPress={onPress}
      // Skill: Scale on press (0.96) replaces opacity feedback
      style={({ pressed }) => [
        styles.upcomingCard, 
        { 
          backgroundColor: colors.card, 
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <View style={[styles.upcomingCardHeader]}>
        <View style={styles.upcomingCardHeaderContent}>
          <View style={styles.upcomingCardSportRow}>
            <SportIcon color={sportTheme.primary} size={16} />
            <Text style={[styles.upcomingCardSport, { color: colors.onSurface }]}>{sportLabels[match.sport] ?? match.sport}</Text>
          </View>
          <View style={styles.upcomingCardDateRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.upcomingCardDate, { color: colors.onSurface }]}>{dateStr}</Text>
          </View>
        </View>
        {/* Skill: Concentric radius — card 24px, padding 16px → inner badge = 24-16 = 8px */}
        <View style={[styles.upcomingCardTimeBadge, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="time-outline" size={13} color={colors.onSurface} />
          <Text style={[styles.upcomingCardTime, { color: colors.onSurface }]}>{match.time}</Text>
        </View>
      </View>

      <View style={styles.upcomingCardBody}>
        <Text style={[styles.upcomingCardTitle, { color: colors.onSurface }]} numberOfLines={2}>
          {match.title}
        </Text>

        <View style={styles.upcomingCardMeta}>
          <View style={styles.upcomingCardMetaRow}>
            <Text style={[styles.upcomingCardMetaText, { color: colors.mutedForeground }]}>
              {match.venue}
            </Text>
            <Ionicons name="location-outline" size={14} color={sportTheme.primary} />
          </View>
          <View style={styles.upcomingCardMetaRow}>
            {/* Skill: Tabular numbers on dynamic player counts */}
            <Text style={[styles.upcomingCardMetaText, { 
              color: isFull ? colors.destructive : colors.success,
              fontVariant: ['tabular-nums'],
            }]}>
              {isFull ? t('home.matchFull') : t('home.spotsRemaining', { count: remaining })}
            </Text>
            <Ionicons
              name="people-outline"
              size={14}
              color={isFull ? colors.destructive : colors.success}
            />
          </View>
        </View>

        <LiquidProgressBar
          progress={Math.min(total > 0 ? filled / total : 0, 1)}
          sport={match.sport}
          height={6}
        />

        {/* Skill: Concentric radius — card body padding 16, card radius 24 → button radius = 24-16 = 8 */}
        <View style={styles.upcomingCardActions}>
          {match.joinedByCurrentUser ? (
            <Pressable
              style={({ pressed }) => [
                styles.upcomingCardBtn, 
                { 
                  backgroundColor: colors.destructive + "15",
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              onPress={onLeave}
            >
              <Text style={[styles.upcomingCardBtnText, { color: colors.destructive }]}>{t('home.leave')}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.upcomingCardBtn, 
                { 
                  backgroundColor: colors.accent,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              onPress={onJoin}
              disabled={isFull}
            >
              <Text style={[styles.upcomingCardBtnText, { color: colors.accentForeground }]}>
                {isFull ? t('home.matchFull') : t('home.joined')}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.upcomingCardSecBtn, 
              { 
                backgroundColor: sportTheme.primaryContainer,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
            onPress={onPress}
          >
            <Text style={[styles.upcomingCardBtnText, { color: sportTheme.primary }]}>{locale === 'ar' ? 'التفاصيل' : 'Details'}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function NoUpcomingMatch() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.noUpcomingCard, 
        { 
          backgroundColor: colors.surfaceContainerLow,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
      onPress={() => router.push("/(tabs)/explore")}
    >
      <View style={[styles.noUpcomingIconWrap, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name="football-outline" size={36} color={colors.primary} />
      </View>
      <Text style={[styles.noUpcomingTitle, { color: colors.onSurface }]}>{t('home.noUpcoming')}</Text>
      <Text style={[styles.noUpcomingSubtitle, { color: colors.mutedForeground }]}>
        {t('home.noUpcomingDesc')}
      </Text>
      <View style={styles.noUpcomingActionsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.noUpcomingBtn, 
            { 
              backgroundColor: colors.accent,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
          onPress={() => router.push("/(tabs)/explore")}
        >
          <Ionicons name="compass-outline" size={16} color={colors.accentForeground} />
          <Text style={[styles.noUpcomingBtnText, { color: colors.accentForeground }]}>{t('home.findMatch')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.noUpcomingSecBtn, 
            { 
              backgroundColor: colors.primaryContainer,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
          onPress={() => router.push("/create-match")}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.noUpcomingBtnText, { color: colors.primary }]}>{t('home.quickActions.createMatch')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function GroupActivityCard({ group }: { group: Group }) {
  const colors = useColors();
  const { t, locale } = useTranslation();
  const SportIcon = getSportIcon(group.sport);
  const sportTheme = getSportTheme(group.sport);

  const nextMatchText =
    typeof group.nextMatch === "object" && group.nextMatch
      ? `${group.nextMatch.date ? new Date(group.nextMatch.date).toLocaleDateString(locale === 'ar' ? "ar-SA" : "en-US", { weekday: "short", month: "short", day: "numeric" }) : ""} ${group.nextMatch.time ?? ""}`.trim()
      : typeof group.nextMatch === "string"
      ? group.nextMatch
      : null;

  return (
    <Pressable
      // Skill: Scale on press replaces opacity
      style={({ pressed }) => [
        styles.groupActivityCard, 
        { 
          backgroundColor: colors.surface,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
      onPress={() => router.push({ pathname: "/group-detail", params: { id: group.id } } as never)}
    >
      {/* Skill: Concentric radius — card 20px, padding 16px → avatar is circle (independent) */}
      <View style={[styles.groupActivityAvatar, { backgroundColor: sportTheme.primaryContainer }]}>
        <SportIcon color={sportTheme.primary} size={22} />
      </View>
      <View style={styles.groupActivityInfo}>
        <Text style={[styles.groupActivityName, { color: colors.onSurface }]} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={[styles.groupActivitySub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {nextMatchText
            ? (locale === 'ar' ? `مباراة قادمة: ${nextMatchText}` : `Next match: ${nextMatchText}`)
            : `${group.members?.length ?? 0} ${t('common.member')}`
          }
        </Text>
      </View>
      <Ionicons name={locale === 'ar' ? "chevron-back-outline" : "chevron-forward-outline"} size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function EmptyGroups() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.emptyGroups, 
        { 
          backgroundColor: colors.surfaceContainerLow,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
      onPress={() => router.push("/(tabs)/groups")}
    >
      <View style={[styles.emptyGroupsIconWrap, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name="people-outline" size={30} color={colors.primary} />
      </View>
      <Text style={[styles.emptyGroupsTitle, { color: colors.onSurface }]}>
        {t('home.noGroups')}
      </Text>
      <Text style={[styles.emptyGroupsText, { color: colors.mutedForeground }]}>
        {t('home.noGroupsDesc')}
      </Text>
      <View style={[styles.emptyGroupsBtn, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name="people-circle-outline" size={16} color={colors.primary} />
        <Text style={[styles.emptyGroupsBtnText, { color: colors.primary }]}>{t('home.exploreGroups')}</Text>
      </View>
    </Pressable>
  );
}

// ─── Animated Toast with Enter/Exit ──────────────────────────────
// Skill: "Subtle exit — small fixed translateY, softer than enter"
function AnimatedToast({ 
  visible, 
  message, 
  type 
}: { 
  visible: boolean; 
  message: string; 
  type: "success" | "error" | "warning" 
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Enter: 300ms, easeOut
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else if (shouldRender) {
      // Exit: 150ms, easeIn — shorter and softer than enter
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -12, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        setShouldRender(false);
        translateY.setValue(20);
      });
    }
  }, [visible]);

  if (!shouldRender) return null;

  const bgColor = type === "success" ? colors.success : type === "warning" ? colors.warning : colors.destructive;

  return (
    <Animated.View 
      style={[
        styles.toast, 
        { 
          backgroundColor: bgColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { matches, user, joinMatch, leaveMatch, unreadCount, groups, matchesLoading, refreshMatches } = useApp();
  const { t, locale } = useTranslation();
  const typography = getTypography(locale as any);

  const [refreshing, setRefreshing] = useState(false);
  const [pickerMatch, setPickerMatch] = useState<Match | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "warning" }>({
    visible: false,
    message: "",
    type: "success",
  });

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  // Skill: Split content into 3 semantic chunks and stagger ~100ms
  const sectionStagger = useStaggeredEntrance(3, 100);

  useFocusEffect(
    useCallback(() => {
      refreshMatches();
    }, [refreshMatches])
  );

  async function onRefresh() {
    setRefreshing(true);
    await refreshMatches();
    setRefreshing(false);
  }

  function showToast(message: string, type: "success" | "error" | "warning" = "success") {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }

  const upcomingMatch = useMemo(() => {
    const now = new Date();
    return matches
      .filter((m) => m.joinedByCurrentUser && m.status !== "completed" && m.status !== "cancelled")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .find((m) => new Date(m.date) >= now) ?? matches
      .filter((m) => m.joinedByCurrentUser && m.status !== "completed" && m.status !== "cancelled")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
  }, [matches]);

  const myGroups = useMemo(() => groups.filter((g) => g.isJoined).slice(0, 4), [groups]);

  function handleJoinAction(item: Match) {
    setPickerMatch(item);
  }

  function handleLeaveAction(item: Match) {
    Alert.alert(t('home.leaveMatchTitle'), t('home.leaveMatchMsg'), [
      { text: t('common.no'), style: "cancel" },
      {
        text: t('common.yes'),
        style: "destructive",
        onPress: async () => {
          await leaveMatch(item.id);
          showToast(locale === 'ar' ? "تم إلغاء التسجيل" : "Registration cancelled");
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          {/* Skill: Min hit area 44×44px for interactive elements */}
          <Pressable 
            onPress={() => router.push("/notifications")} 
            style={({ pressed }) => [
              styles.headerIconBtn,
              { transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <Ionicons name="menu-outline" size={28} color={colors.onSurface} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                {/* Skill: Tabular numbers on dynamic badge count */}
                <Text style={[styles.badgeText, { fontVariant: ['tabular-nums'] }]}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>

          <View style={styles.headerCenter}>
            <BrandLogo variant="lockup" tone="dark" size="sm" />
          </View>
          
          {/* Empty view to balance the header (since profile icon was removed) */}
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Skill: Staggered section 1 — Quick Actions */}
        <Animated.View style={sectionStagger[0]}>
          <QuickActionsScroll />
        </Animated.View>

        {/* Skill: Staggered section 2 — Upcoming Matches */}
        <Animated.View style={[styles.section, { paddingTop: 8 }, sectionStagger[1]]}>
          <View style={styles.sectionHeaderRow}>
            {/* Skill: Hit area — make "see all" pressable area 44px tall */}
            <Pressable 
              onPress={() => router.push("/(tabs)/my-matches")}
              style={styles.seeAllPressable}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('home.viewAll')}</Text>
            </Pressable>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>{t('home.upcomingMatches')}</Text>
          </View>

          {matchesLoading && !upcomingMatch ? (
            <SkeletonLoader />
          ) : upcomingMatch ? (
            <UpcomingMatchCard
              match={upcomingMatch}
              onPress={() => router.push({ pathname: "/match-details", params: { id: upcomingMatch.id } } as never)}
              onJoin={() => handleJoinAction(upcomingMatch)}
              onLeave={() => handleLeaveAction(upcomingMatch)}
            />
          ) : (
            <NoUpcomingMatch />
          )}
        </Animated.View>

        {/* Skill: Staggered section 3 — Group Activity */}
        <Animated.View style={[styles.section, sectionStagger[2]]}>
          <View style={styles.sectionHeaderRow}>
            <Pressable 
              onPress={() => router.push("/(tabs)/groups")}
              style={styles.seeAllPressable}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('home.viewAll')}</Text>
            </Pressable>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>{t('home.groupActivity')}</Text>
          </View>

          {myGroups.length === 0 ? (
            <EmptyGroups />
          ) : (
            <View style={styles.groupsList}>
              {myGroups.map((group) => (
                <GroupActivityCard key={group.id} group={group} />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── FAB ── */}
      <View style={[styles.fab, { bottom: botPad + 16 }]}>
        <Pressable
          // Skill: Scale on press for FAB
          style={({ pressed }) => [
            styles.fabPressable, 
            { 
              backgroundColor: colors.accent,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
          onPress={() => router.push("/create-match")}
        >
          <Ionicons name="add" size={28} color={colors.accentForeground} />
        </Pressable>
      </View>

      {/* Skill: Animated toast with enter/exit transitions */}
      <AnimatedToast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type} 
      />

      {pickerMatch && (
        <PositionPickerModal
          visible={!!pickerMatch}
          sport={pickerMatch.sport}
          sportAccentColor={sportColor(pickerMatch.sport, colors)}
          matchFormat={pickerMatch.matchFormat}
          onClose={() => setPickerMatch(null)}
          onConfirm={async (position) => {
            const match = pickerMatch;
            setPickerMatch(null);
            const result = await joinMatch(match.id, position);
            if (result.success) {
              showToast(`تم تسجيلك في ${match.title} ✓`);
            } else if (result.alreadyJoined) {
              showToast("أنت مسجل بالفعل في هذه المباراة", "warning");
            } else if (result.isFull) {
              showToast("المباراة مكتملة، لا توجد أماكن متاحة", "error");
            } else if (result.conflict) {
              showToast(`تعارض في المواعيد مع: "${result.conflict.title}"`, "error");
            } else if (result.error) {
              showToast(result.error, "error");
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Skill: Min hit area 44×44px
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  greetingText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontFamily: typography.body.fontFamily,
  },
  nameText: {
    fontSize: 18,
    color: "rgba(255,255,255,1)",
    fontFamily: typography.headlineSm.fontFamily,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 9,
    color: "rgba(255,255,255,1)",
    fontFamily: typography.headlineSm.fontFamily,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 12, gap: 12, paddingHorizontal: 16 },

  // ── Sections ──
  section: {
    borderRadius: 20,
    overflow: "hidden",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "right",
  },
  // Skill: Hit area — wrap "see all" text in a 44px-tall pressable
  seeAllPressable: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: typography.bodyLg.fontFamily,
  },

  // ── Quick Actions ──
  quickActionsScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  quickActionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    // Skill: Concentric border radius — outer 22, inner icon wrap 12 (22-10≈12)
    borderRadius: 22,
    gap: 10,
    minWidth: 130,
  },
  // Skill: Layered shadows for depth instead of flat elevation
  quickActionCardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  quickActionCardShadowPrimary: {
    shadowColor: "#05B757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  // Skill: Concentric — outer card 22px, padding ~14px → inner = 22-14 = 8px... 
  // but icon wrap is circular so use half its size
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 14,
    fontFamily: typography.headlineSm.fontFamily,
  },

  // ── Upcoming Match Card ──
  upcomingCard: {
    borderRadius: 24,
    overflow: "hidden",
    // Skill: Layered shadows — ring + lift + ambient
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 8,
  },
  upcomingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  upcomingCardHeaderContent: { gap: 4 },
  upcomingCardSportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  upcomingCardSport: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontFamily: typography.bodyLg.fontFamily,
  },
  upcomingCardDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  upcomingCardDate: {
    fontSize: 14,
    color: "rgba(255,255,255,1)",
    fontFamily: typography.headlineSm.fontFamily,
  },
  // Skill: Concentric — card 24, padding 16 → badge = 24-16 = 8
  upcomingCardTimeBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  upcomingCardTime: {
    fontSize: 16,
    color: "rgba(255,255,255,1)",
    fontFamily: typography.headlineSm.fontFamily,
    // Skill: Tabular numbers for time display
    fontVariant: ['tabular-nums'],
  },
  upcomingCardBody: {
    padding: 16,
    gap: 12,
  },
  upcomingCardTitle: {
    fontSize: 16,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "right",
  },
  upcomingCardMeta: { gap: 6 },
  upcomingCardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
  },
  upcomingCardMetaText: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    textAlign: "right",
  },
  upcomingCardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  // Skill: Concentric — card 24, body padding 16 → button = 24-16 = 8
  upcomingCardBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    // Skill: Min hit area maintained — paddingVertical 12 + text = ~44px
    minHeight: 44,
  },
  upcomingCardSecBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  upcomingCardBtnText: {
    fontSize: 14,
    fontFamily: typography.headlineSm.fontFamily,
  },

  // ── No Upcoming ──
  noUpcomingCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 16,
    // Skill: Layered shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  noUpcomingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  noUpcomingTitle: {
    fontSize: 16,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "center",
  },
  noUpcomingSubtitle: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    textAlign: "center",
    lineHeight: 20,
  },
  noUpcomingActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    width: "100%",
  },
  // Skill: Concentric — card 24, padding 32 (>24) → treat independently
  noUpcomingBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    minHeight: 44,
  },
  noUpcomingSecBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    minHeight: 44,
  },
  noUpcomingBtnText: {
    fontSize: 13,
    fontFamily: typography.headlineSm.fontFamily,
  },

  // ── Groups ──
  groupsList: { gap: 10 },
  groupActivityCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    gap: 16,
    // Skill: Layered shadow instead of flat elevation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    minHeight: 44,
  },
  groupActivityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  groupActivityInfo: { flex: 1, gap: 2 },
  groupActivityName: {
    fontSize: 14,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "right",
  },
  groupActivitySub: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    textAlign: "right",
  },

  // ── Empty Groups ──
  emptyGroups: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyGroupsIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyGroupsTitle: {
    fontSize: 15,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "center",
  },
  emptyGroupsText: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyGroupsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
  },
  emptyGroupsBtnText: {
    fontSize: 13,
    fontFamily: typography.headlineSm.fontFamily,
  },

  // ── FAB ──
  fab: {
    position: "absolute",
    end: 20,
  },
  fabPressable: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    // Skill: Layered shadow with colored glow
    shadowColor: "#05B757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  // ── Toast ──
  toast: {
    position: "absolute",
    bottom: 110,
    left: 20,
    right: 20,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    zIndex: 999,
    // Skill: Layered shadow for toast elevation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    color: "rgba(255,255,255,1)",
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 14,
    textAlign: "center",
  },
  logoText: {
    fontFamily: "SpaceMono-Regular", // Or any distinctive font
    letterSpacing: 4,
    fontSize: 20,
    fontWeight: "800",
  },
});
