import { useApp, Match, Group, sportColor } from "@/context/AppContext";
import { getSportIcon } from "@/components/icons/SportIcons";
import { useColors } from "@/hooks/useColors";
import { LiquidProgressBar } from "@/components/glass/LiquidProgressBar";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { PositionPickerModal } from "@/components/PositionPickerModal";
import { getSportTheme } from "@/constants/sportTheme";
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "مساء الخير";
  return "مساء النور";
}

const QUICK_ACTIONS = [
  { icon: "football-outline" as const, label: "مبارياتي", route: "/(tabs)/my-matches" as const },
  { icon: "people-outline" as const, label: "مجموعاتي", route: "/(tabs)/groups" as const },
  { icon: "compass-outline" as const, label: "استكشف", route: "/(tabs)/explore" as const },
  { icon: "add-circle-outline" as const, label: "أنشئ مباراة", route: "/create-match" as const },
];

function QuickActionsRow() {
  const colors = useColors();
  return (
    <View style={styles.quickActionsRow}>
      {QUICK_ACTIONS.map((action, index) => {
        const isCreate = index === 3;
        return (
          <Pressable
            key={action.label}
            style={({ pressed }) => [styles.quickActionItem, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => router.push(action.route as never)}
          >
            <View style={[
              styles.quickActionCircle,
              { backgroundColor: isCreate ? colors.accent : colors.primaryContainer },
            ]}>
              <Ionicons
                name={action.icon}
                size={24}
                color={isCreate ? colors.accentForeground : colors.primary}
              />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.onSurface }]}>{action.label}</Text>
          </Pressable>
        );
      })}
    </View>
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
  const sportTheme = getSportTheme(match.sport);
  const SportIcon = getSportIcon(match.sport);

  const filled = match.playerCount ?? match.players.length;
  const total = match.maxPlayers;
  const remaining = total - filled;
  const isFull = filled >= total;

  const dateStr = match.date
    ? new Date(match.date).toLocaleDateString("ar-SA", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "";

  const sportLabels: Record<string, string> = {
    football: "كرة القدم",
    padel: "بادل",
    tennis: "تنس",
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.upcomingCard, { backgroundColor: colors.surface, opacity: pressed ? 0.95 : 1 }]}
    >
      <LinearGradient
        colors={sportTheme.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.upcomingCardHeader}
      >
        <View style={styles.upcomingCardHeaderContent}>
          <View style={styles.upcomingCardSportRow}>
            <SportIcon color="rgba(255,255,255,0.9)" size={16} />
            <Text style={styles.upcomingCardSport}>{sportLabels[match.sport] ?? match.sport}</Text>
          </View>
          <View style={styles.upcomingCardDateRow}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.upcomingCardDate}>{dateStr}</Text>
          </View>
        </View>
        <View style={styles.upcomingCardTimeBadge}>
          <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.9)" />
          <Text style={styles.upcomingCardTime}>{match.time}</Text>
        </View>
      </LinearGradient>

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
            <Text style={[styles.upcomingCardMetaText, { color: isFull ? colors.destructive : colors.success }]}>
              {isFull ? "المباراة مكتملة" : `${remaining} مكان متبقي`}
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

        <View style={styles.upcomingCardActions}>
          {match.joinedByCurrentUser ? (
            <Pressable
              style={[styles.upcomingCardBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40", borderWidth: 1 }]}
              onPress={onLeave}
            >
              <Text style={[styles.upcomingCardBtnText, { color: colors.destructive }]}>إلغاء تسجيلي</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.upcomingCardBtn, { backgroundColor: colors.accent }]}
              onPress={onJoin}
              disabled={isFull}
            >
              <Text style={[styles.upcomingCardBtnText, { color: colors.accentForeground }]}>
                {isFull ? "مكتملة" : "انضم الآن"}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.upcomingCardSecBtn, { backgroundColor: sportTheme.primaryContainer, borderColor: `${sportTheme.primary}30`, borderWidth: 1 }]}
            onPress={onPress}
          >
            <Text style={[styles.upcomingCardBtnText, { color: sportTheme.primary }]}>التفاصيل</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function NoUpcomingMatch() {
  const colors = useColors();
  return (
    <Pressable
      style={[styles.noUpcomingCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border, borderWidth: 1 }]}
      onPress={() => router.push("/(tabs)/explore")}
    >
      <View style={[styles.noUpcomingIconWrap, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name="football-outline" size={36} color={colors.primary} />
      </View>
      <Text style={[styles.noUpcomingTitle, { color: colors.onSurface }]}>لا توجد مباراة قادمة</Text>
      <Text style={[styles.noUpcomingSubtitle, { color: colors.mutedForeground }]}>
        انضم إلى مباراة متاحة أو أنشئ مبارتك الخاصة مع أصدقائك
      </Text>
      <View style={styles.noUpcomingActionsRow}>
        <Pressable
          style={[styles.noUpcomingBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.push("/(tabs)/explore")}
        >
          <Ionicons name="compass-outline" size={16} color={colors.accentForeground} />
          <Text style={[styles.noUpcomingBtnText, { color: colors.accentForeground }]}>استكشف المباريات</Text>
        </Pressable>
        <Pressable
          style={[styles.noUpcomingSecBtn, { backgroundColor: colors.primaryContainer, borderColor: `${colors.primary}30`, borderWidth: 1 }]}
          onPress={() => router.push("/create-match")}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.noUpcomingBtnText, { color: colors.primary }]}>أنشئ مباراة</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function GroupActivityCard({ group }: { group: Group }) {
  const colors = useColors();
  const SportIcon = getSportIcon(group.sport);
  const sportTheme = getSportTheme(group.sport);

  const nextMatchText =
    typeof group.nextMatch === "object" && group.nextMatch
      ? `${group.nextMatch.date ? new Date(group.nextMatch.date).toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" }) : ""} ${group.nextMatch.time ?? ""}`.trim()
      : typeof group.nextMatch === "string"
      ? group.nextMatch
      : null;

  return (
    <Pressable
      style={[styles.groupActivityCard, { backgroundColor: colors.surface, borderColor: `${sportTheme.primary}20`, borderWidth: 1 }]}
      onPress={() => router.push({ pathname: "/group-detail", params: { id: group.id } } as never)}
    >
      <View style={[styles.groupActivityAvatar, { backgroundColor: sportTheme.primaryContainer }]}>
        <SportIcon color={sportTheme.primary} size={22} />
      </View>
      <View style={styles.groupActivityInfo}>
        <Text style={[styles.groupActivityName, { color: colors.onSurface }]} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={[styles.groupActivitySub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {nextMatchText ? `مباراة قادمة: ${nextMatchText}` : `${group.members?.length ?? 0} عضو`}
        </Text>
      </View>
      <Ionicons name="chevron-back-outline" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function EmptyGroups() {
  const colors = useColors();
  return (
    <Pressable
      style={[styles.emptyGroups, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border, borderWidth: 1 }]}
      onPress={() => router.push("/(tabs)/groups")}
    >
      <View style={[styles.emptyGroupsIconWrap, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name="people-outline" size={30} color={colors.primary} />
      </View>
      <Text style={[styles.emptyGroupsTitle, { color: colors.onSurface }]}>
        لم تنضم لأي مجموعة بعد
      </Text>
      <Text style={[styles.emptyGroupsText, { color: colors.mutedForeground }]}>
        انضم إلى مجموعة رياضية وتابع نشاطها هنا
      </Text>
      <View style={[styles.emptyGroupsBtn, { backgroundColor: colors.primaryContainer, borderColor: `${colors.primary}30`, borderWidth: 1 }]}>
        <Ionicons name="people-circle-outline" size={16} color={colors.primary} />
        <Text style={[styles.emptyGroupsBtnText, { color: colors.primary }]}>استعرض المجموعات</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { matches, user, joinMatch, leaveMatch, unreadCount, groups, matchesLoading, refreshMatches } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const [pickerMatch, setPickerMatch] = useState<Match | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" }>({
    visible: false,
    message: "",
    type: "success",
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, []);

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

  function showToast(message: string, type: "success" | "error" = "success") {
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
    if (item.isPublic) {
      setPickerMatch(item);
      return;
    }
    joinMatch(item.id).then((result) => {
      if (result.success) {
        showToast(`تم تسجيلك في ${item.title} ✓`);
      } else if (result.conflict) {
        showToast(`تعارض مع: "${result.conflict.title}"`, "error");
      } else if (result.error) {
        showToast(result.error, "error");
      }
    });
  }

  function handleLeaveAction(item: Match) {
    Alert.alert("إلغاء التسجيل", `هل تريد إلغاء تسجيلك في "${item.title}"؟`, [
      { text: "لا", style: "cancel" },
      {
        text: "نعم",
        style: "destructive",
        onPress: async () => {
          await leaveMatch(item.id);
          showToast("تم إلغاء التسجيل");
        },
      },
    ]);
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: colors.surfaceContainerLow }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.push("/notifications")}
            style={styles.headerIconBtn}
          >
            <Ionicons name="notifications-outline" size={22} color="rgba(255,255,255,1)" />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.reliabilityLow }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.nameText}>{user?.nickname ?? "العب"} 👋</Text>
          </View>

          <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.headerIconBtn}>
            <Ionicons name="person-circle-outline" size={26} color="rgba(255,255,255,1)" />
          </Pressable>
        </View>
      </LinearGradient>

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
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <QuickActionsRow />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Pressable onPress={() => router.push("/(tabs)/my-matches")}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>عرض الكل</Text>
            </Pressable>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>مبارتك القادمة</Text>
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
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Pressable onPress={() => router.push("/(tabs)/groups")}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>عرض الكل</Text>
            </Pressable>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>نشاط مجموعاتي</Text>
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
        </View>
      </ScrollView>

      <Animated.View style={[styles.fab, { bottom: botPad + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.fabPressable, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push("/create-match")}
        >
          <Ionicons name="add" size={28} color={colors.accentForeground} />
        </Pressable>
      </Animated.View>

      {toast.visible && (
        <View style={[styles.toast, { backgroundColor: toast.type === "success" ? colors.success : colors.destructive }]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

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
            } else if (result.conflict) {
              showToast(`تعارض مع: "${result.conflict.title}"`, "error");
            } else if (result.error) {
              showToast(result.error, "error");
            }
          }}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontFamily: "Cairo_400Regular",
  },
  nameText: {
    fontSize: 18,
    color: "rgba(255,255,255,1)",
    fontFamily: "Cairo_700Bold",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 8,
    color: "rgba(255,255,255,1)",
    fontFamily: "Cairo_700Bold",
  },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 12, gap: 12, paddingHorizontal: 16 },

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
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
  },

  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  quickActionItem: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  quickActionCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "center",
  },

  upcomingCard: {
    borderRadius: 18,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
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
    fontFamily: "Cairo_600SemiBold",
  },
  upcomingCardDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  upcomingCardDate: {
    fontSize: 14,
    color: "rgba(255,255,255,1)",
    fontFamily: "Cairo_700Bold",
  },
  upcomingCardTimeBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  upcomingCardTime: {
    fontSize: 16,
    color: "rgba(255,255,255,1)",
    fontFamily: "Cairo_700Bold",
  },
  upcomingCardBody: {
    padding: 16,
    gap: 12,
  },
  upcomingCardTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
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
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
  },
  upcomingCardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  upcomingCardBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  upcomingCardSecBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  upcomingCardBtnText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
  },

  noUpcomingCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 12,
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
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  noUpcomingSubtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  noUpcomingActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    width: "100%",
  },
  noUpcomingBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
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
  },
  noUpcomingBtnText: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
  },

  groupsList: { gap: 10 },
  groupActivityCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    backgroundColor: "#FFFFFF",
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
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },
  groupActivitySub: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
  },

  emptyGroups: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
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
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  emptyGroupsText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
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
  },
  emptyGroupsBtnText: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
  },

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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

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
  },
  toastText: {
    color: "rgba(255,255,255,1)",
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    textAlign: "center",
  },
});
