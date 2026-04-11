import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { StatBadge } from "@/components/StatBadge";
import { MatchCard } from "@/components/glass/MatchCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT_LIME = "#C1F422";

const SPORT_ACCENT: Record<string, string> = {
  football: "#2C54E8",
  padel:    "#0E9B6E",
  tennis:   "#C97B18",
};

export default function MyMatchesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { matches, user, refreshMatches, matchesLoading } = useApp();
  const currentUserId = user?.id ?? "";
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [initialLoaded, setInitialLoaded] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 60;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshMatches().finally(() => setInitialLoaded(true));
    }, [refreshMatches])
  );

  const myMatches = matches.filter((m) => m.joinedByCurrentUser);
  const upcoming = myMatches.filter((m) => m.status !== "completed" && m.status !== "cancelled");
  const past = myMatches.filter((m) => m.status === "completed" || m.status === "cancelled");
  const organized = myMatches.filter((m) => m.organizerId === currentUserId);
  const displayed = tab === "upcoming" ? upcoming : past;

  const pastWithKnownAttendance = past.filter((m) =>
    m.players.some((p) => p.id === currentUserId && p.attendance !== "pending")
  );
  const totalPresent = pastWithKnownAttendance.filter((m) =>
    m.players.some((p) => p.id === currentUserId && p.attendance === "present")
  ).length;
  const attendanceRate = pastWithKnownAttendance.length > 0
    ? Math.round((totalPresent / pastWithKnownAttendance.length) * 100)
    : 0;

  const tabAnim = useRef(new Animated.Value(tab === "upcoming" ? 0 : 1)).current;
  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: tab === "upcoming" ? 0 : 1,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [tab]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: "transparent", opacity: fadeAnim }]}>
      <GlassScreenHeader style={{ paddingTop: topPad + 12, paddingHorizontal: 20, gap: 14, paddingBottom: 8 }}>
        <Text style={[styles.title, { color: colors.onSurface }]}>مبارياتي</Text>

        <View style={[styles.summaryBar, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: "#E5E7EB" }]}>
          <StatBadge variant="card" size="lg" icon="calendar-outline" value={upcoming.length} label="قادمة" color={colors.primary} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.outline + "30" }]} />
          <StatBadge variant="card" size="lg" icon="shield-outline" value={organized.length} label="كمنظّم" color={colors.tertiary} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.outline + "30" }]} />
          <StatBadge variant="card" size="lg" icon="checkmark-circle-outline" value={`${attendanceRate}%`} label="الحضور" color={colors.success} />
        </View>

        <View style={[styles.tabContainer, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                backgroundColor: ACCENT_LIME,
                left: tabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["3%", "53%"],
                }),
              },
            ]}
          />
          {[
            { key: "upcoming" as const, label: "القادمة", count: upcoming.length },
            { key: "past" as const, label: "السابقة", count: past.length },
          ].map((t) => (
            <Pressable
              key={t.key}
              style={styles.tabBtn}
              onPress={() => setTab(t.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: tab === t.key ? "#111827" : colors.onSurfaceVariant },
                ]}
              >
                {t.label}
              </Text>
              <View
                style={[
                  styles.tabCountBadge,
                  {
                    backgroundColor:
                      tab === t.key ? "rgba(17,24,39,0.15)" : colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabCountText,
                    { color: tab === t.key ? "#111827" : colors.onSurfaceVariant },
                  ]}
                >
                  {t.count}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </GlassScreenHeader>

      <FlatList
        data={matchesLoading && !initialLoaded ? [] : displayed}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[styles.list, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
        windowSize={10}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
        removeClippedSubviews={Platform.OS === "android"}
        ListHeaderComponent={
          matchesLoading && !initialLoaded ? (
            <SkeletonLoader count={4} variant="card" />
          ) : null
        }
        ListEmptyComponent={matchesLoading && !initialLoaded ? null : <MyMatchesEmptyState tab={tab} />}
        renderItem={({ item }) => {
          const myPlayer = item.players.find((p) => p.id === currentUserId);
          const attended = myPlayer?.attendance === "present";
          const absent = myPlayer?.attendance === "absent";
          const hasAttendance = tab === "past" && (attended || absent);
          const isOrganizer = item.organizerId === currentUserId;
          const accentColor = SPORT_ACCENT[item.sport] ?? SPORT_ACCENT.football;
          const isPast = tab === "past";

          return (
            <View style={styles.cardSpacing}>
              {/* Upcoming: left accent stripe in sport color */}
              <View style={[
                styles.matchCardWrap,
                isPast
                  ? { backgroundColor: colors.surfaceContainerLow, borderColor: "#E5E7EB", borderWidth: 1, opacity: 0.92 }
                  : { backgroundColor: colors.surfaceContainerLow, borderColor: accentColor + "40", borderWidth: 1.5, borderLeftWidth: 4, borderLeftColor: accentColor },
              ]}>
                {/* Organizer badge */}
                {isOrganizer && (
                  <View style={[styles.organizerTag, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                    <Ionicons name="shield-checkmark-outline" size={11} color={colors.primary} />
                    <Text style={[styles.organizerTagText, { color: colors.primary }]}>منظّم</Text>
                  </View>
                )}

                <MatchCard
                  match={item}
                  variant="full"
                  onPress={() => router.push({ pathname: "/match-details", params: { id: item.id } })}
                />

                {/* Past match actions */}
                {isPast && (
                  <View style={styles.pastActionsRow}>
                    {hasAttendance && (
                      <View
                        style={[
                          styles.attendanceBadge,
                          {
                            backgroundColor: attended ? colors.success + "18" : colors.destructive + "15",
                            borderColor: attended ? colors.success + "40" : colors.destructive + "35",
                          },
                        ]}
                      >
                        <Ionicons
                          name={attended ? "checkmark-circle" : "close-circle"}
                          size={15}
                          color={attended ? colors.success : colors.destructive}
                        />
                        <Text
                          style={[
                            styles.attendanceBadgeText,
                            { color: attended ? colors.success : colors.destructive },
                          ]}
                        >
                          {attended ? "حضرت ✓" : "غبت"}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Attendance status indicator for upcoming matches */}
                {!isPast && myPlayer && (
                  <View style={styles.statusRow}>
                    <View style={[styles.statusPill, {
                      backgroundColor: myPlayer.attendance === "pending" ? "#F59E0B18" : colors.success + "18",
                      borderColor: myPlayer.attendance === "pending" ? "#F59E0B40" : colors.success + "40",
                    }]}>
                      <Ionicons
                        name={myPlayer.attendance === "pending" ? "time-outline" : "checkmark-circle-outline"}
                        size={13}
                        color={myPlayer.attendance === "pending" ? "#F59E0B" : colors.success}
                      />
                      <Text style={[styles.statusPillText, {
                        color: myPlayer.attendance === "pending" ? "#F59E0B" : colors.success,
                      }]}>
                        {myPlayer.attendance === "pending" ? "في انتظار التأكيد" : "مؤكّد الحضور"}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
    </Animated.View>
  );
}

function MyMatchesEmptyState({ tab }: { tab: "upcoming" | "past" }) {
  const colors = useColors();
  return (
    <View style={emptyStyles.wrap}>
      <View style={[emptyStyles.iconCircle, { backgroundColor: tab === "upcoming" ? ACCENT_LIME + "20" : colors.surfaceContainerHigh }]}>
        <Ionicons
          name={tab === "upcoming" ? "calendar-outline" : "time-outline"}
          size={48}
          color={tab === "upcoming" ? ACCENT_LIME : colors.mutedForeground}
        />
      </View>
      <Text style={[emptyStyles.title, { color: colors.onSurface }]}>
        {tab === "upcoming" ? "لا توجد مباريات قادمة" : "لا توجد مباريات سابقة"}
      </Text>
      <Text style={[emptyStyles.desc, { color: colors.mutedForeground }]}>
        {tab === "upcoming"
          ? "انضم لمباراة أو أنشئ واحدة وابدأ رحلتك الرياضية"
          : "مباراتك المنتهية ستظهر هنا لمراجعة أدائك"}
      </Text>
      {tab === "upcoming" && (
        <Pressable
          style={[emptyStyles.cta, { backgroundColor: ACCENT_LIME }]}
          onPress={() => router.push("/(tabs)/explore")}
        >
          <Ionicons name="search-outline" size={16} color="#111" />
          <Text style={emptyStyles.ctaText}>ابحث عن مباراة</Text>
        </Pressable>
      )}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 14 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontFamily: "Cairo_700Bold", textAlign: "center" },
  desc: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "center", lineHeight: 22 },
  cta: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  ctaText: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#111" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontFamily: "Cairo_700Bold", textAlign: "right", lineHeight: 36 },

  summaryBar: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 14,
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryDivider: { width: 1, height: 36, marginHorizontal: 4 },

  tabContainer: {
    flexDirection: "row",
    borderRadius: 30,
    padding: 4,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    width: "47%",
    bottom: 4,
    borderRadius: 26,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
    borderRadius: 26,
    zIndex: 1,
  },
  tabText: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  tabCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  tabCountText: { fontSize: 11, fontFamily: "Cairo_700Bold" },

  list: { paddingHorizontal: 16, paddingTop: 12 },
  cardSpacing: { marginBottom: 14 },

  matchCardWrap: {
    borderRadius: 20,
    overflow: "hidden",
  },
  organizerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  organizerTagText: { fontSize: 11, fontFamily: "Cairo_700Bold" },

  pastActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  attendanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  attendanceBadgeText: { fontSize: 12, fontFamily: "Cairo_700Bold" },

  statusRow: { paddingHorizontal: 12, paddingBottom: 10, paddingTop: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
});
