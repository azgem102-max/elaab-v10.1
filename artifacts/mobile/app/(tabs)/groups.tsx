import { AllSportsIcon, FootballIcon, PadelIcon, TennisIcon, getSportIcon } from "@/components/icons/SportIcons";
import { useApp, Group, SportType, sportColor, sportLabel } from "@/context/AppContext";
import { useActiveSport } from "@/context/SportFilterContext";
import { useColors } from "@/hooks/useColors";
import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { GlassInput } from "@/components/glass/GlassInput";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { GlassButton } from "@/components/glass/GlassButton";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { getSportTheme } from "@/constants/sportTheme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MY_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.54);

const SPORT_FILTERS: { key: "all" | SportType; label: string; icon: React.FC<{ color?: string; size?: number }> }[] = [
  { key: "all", label: "الكل", icon: AllSportsIcon },
  { key: "football", label: "كرة القدم", icon: FootballIcon },
  { key: "padel", label: "بادل", icon: PadelIcon },
  { key: "tennis", label: "تنس", icon: TennisIcon },
];

type ToastType = { visible: boolean; message: string };


export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { groups, joinGroup, leaveGroup, user, groupsLoading, groupsError, refreshGroups } = useApp();
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [sportFilter, setSportFilter] = useState<"all" | SportType>("all");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, []);
  const { setActiveSport } = useActiveSport();

  useEffect(() => {
    setActiveSport(sportFilter === "all" ? null : sportFilter);
  }, [sportFilter, setActiveSport]);

  const [toast, setToast] = useState<ToastType>({ visible: false, message: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [myGroupsActiveIndex, setMyGroupsActiveIndex] = useState(0);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 60;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserId = user?.id ?? "";

  function showToast(message: string) {
    setToast({ visible: true, message });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const params: { q?: string; sport?: string } = {};
      if (search.trim()) params.q = search.trim();
      if (sportFilter !== "all") params.sport = sportFilter;
      refreshGroups(params);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search, sportFilter]);

  const filterFn = (g: Group) => {
    const matchesSearch = (g.name ?? "").includes(search) || search === "";
    const matchesSport = sportFilter === "all" || g.sport === sportFilter;
    return matchesSearch && matchesSport;
  };

  const allMyGroups = groups.filter((g) => g.isJoined);
  const myOwnedGroups = allMyGroups.filter((g) => g.adminId === currentUserId);
  const myMemberGroups = allMyGroups.filter((g) => g.adminId !== currentUserId);
  const myOwnedFiltered = myOwnedGroups.filter(filterFn);
  const myMemberFiltered = myMemberGroups.filter(filterFn);
  const myGroups = allMyGroups.filter(filterFn);

  useEffect(() => {
    if (myMemberFiltered.length > 0) {
      setMyGroupsActiveIndex((prev) => Math.min(prev, myMemberFiltered.length - 1));
    } else {
      setMyGroupsActiveIndex(0);
    }
  }, [myMemberFiltered.length]);
  const discoverGroups = groups.filter((g) => g.isPublic && !g.isJoined && filterFn(g));
  const isFiltering = search.trim() !== "" || sportFilter !== "all";
  const hasNeverJoinedGroup = allMyGroups.length === 0 && !groupsLoading;
  const totalResults = myGroups.length + discoverGroups.length;

  async function onRefresh() {
    setRefreshing(true);
    const params: { q?: string; sport?: string } = {};
    if (search.trim()) params.q = search.trim();
    if (sportFilter !== "all") params.sport = sportFilter;
    await refreshGroups(params);
    setRefreshing(false);
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: "transparent", opacity: fadeAnim }]}>
      <GlassScreenHeader style={{ paddingTop: topPad + 12, paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.onSurface }]}>المجموعات</Text>
        </View>

        <GlassInput
          value={search}
          onChangeText={setSearch}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="ابحث عن مجموعة..."
          sport={sportFilter === "all" ? "football" : sportFilter}
        />

        <FlatList
          data={SPORT_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => f.key}
          contentContainerStyle={styles.filterList}
          windowSize={5}
          maxToRenderPerBatch={8}
          initialNumToRender={4}
          removeClippedSubviews={Platform.OS === "android"}
          renderItem={({ item }) => {
            const isActive = sportFilter === item.key;
            const iconColor = isActive ? "rgba(255,255,255,1)" : colors.mutedForeground;
            const IconComponent = item.icon;
            return (
              <Pressable
                style={[
                  styles.filterChip,
                  isActive
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border },
                ]}
                onPress={() => setSportFilter(item.key)}
              >
                <IconComponent color={iconColor} size={15} />
                <Text style={[styles.filterText, { color: iconColor }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
        {isFiltering && !groupsLoading && (
          <View style={styles.resultsRow}>
            <Text style={[styles.resultsText, { color: colors.mutedForeground }]}>
              {totalResults} نتيجة
            </Text>
          </View>
        )}
      </GlassScreenHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {groupsError && (
          <Pressable
            style={[styles.offlineBanner, { backgroundColor: colors.warning + "20" }]}
            onPress={() => refreshGroups()}
          >
            <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
            <Text style={[styles.offlineBannerText, { color: colors.warning }]}>
              تعذّر الاتصال بالخادم. اضغط للمحاولة مجدداً.
            </Text>
          </Pressable>
        )}

        {groupsLoading && groups.length === 0 ? (
          <View style={styles.loadingRow}>
            <SkeletonLoader count={3} variant="list" />
            <View style={{ marginTop: 16 }}>
              <SkeletonLoader count={4} variant="card" />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>مجموعاتي</Text>
              {allMyGroups.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.countText, { color: colors.primary }]}>{allMyGroups.length}</Text>
                </View>
              )}
            </View>

            {hasNeverJoinedGroup ? (
              <MyGroupsEmpty colors={colors} />
            ) : myGroups.length === 0 && isFiltering ? (
              <View style={[styles.noResults, { backgroundColor: colors.surfaceContainerLow, borderRadius: 20 }]}>
                <Ionicons name="search-outline" size={24} color={colors.mutedForeground} />
                <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>
                  لا توجد مجموعات تطابق البحث
                </Text>
              </View>
            ) : (
              <>
                {myOwnedFiltered.length > 0 && (
                  <>
                    <View style={[styles.subSectionHeader]}>
                      <Ionicons name="star" size={14} color={colors.warning} />
                      <Text style={[styles.subSectionTitle, { color: colors.mutedForeground }]}>أديرها</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.myGroupsScroll}
                      decelerationRate="fast"
                      snapToInterval={MY_CARD_WIDTH + 14}
                      snapToAlignment="start"
                      scrollEventThrottle={16}
                    >
                      {myOwnedFiltered.map((group) => (
                        <MyGroupCard
                          key={group.id}
                          group={group}
                          currentUserId={currentUserId}
                        />
                      ))}
                    </ScrollView>
                  </>
                )}

                {myMemberFiltered.length > 0 && (
                  <>
                    <View style={[styles.subSectionHeader, myOwnedFiltered.length > 0 && { marginTop: 16 }]}>
                      <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.subSectionTitle, { color: colors.mutedForeground }]}>عضو فيها</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.myGroupsScroll}
                      decelerationRate="fast"
                      snapToInterval={MY_CARD_WIDTH + 14}
                      snapToAlignment="start"
                      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                        const x = e.nativeEvent.contentOffset.x;
                        const idx = Math.round(x / (MY_CARD_WIDTH + 14));
                        setMyGroupsActiveIndex(Math.max(0, Math.min(idx, myMemberFiltered.length - 1)));
                      }}
                      scrollEventThrottle={16}
                    >
                      {myMemberFiltered.map((group) => (
                        <MyGroupCard
                          key={group.id}
                          group={group}
                          currentUserId={currentUserId}
                          onLeave={() => {
                            Alert.alert(
                              "مغادرة المجموعة",
                              `هل أنت متأكد من مغادرة مجموعة "${group.name}"؟`,
                              [
                                { text: "إلغاء", style: "cancel" },
                                { text: "مغادرة", style: "destructive", onPress: () => leaveGroup(group.id) },
                              ]
                            );
                          }}
                        />
                      ))}
                    </ScrollView>
                    {myMemberFiltered.length > 1 && (
                      <View style={styles.dotsRow}>
                        {myMemberFiltered.map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.dot,
                              i === myGroupsActiveIndex
                                ? { backgroundColor: colors.primary, width: 18 }
                                : { backgroundColor: colors.mutedForeground + "40", width: 6 },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </>
                )}
              </>
            )}

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>اكتشف مجموعات</Text>
              {discoverGroups.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Text style={[styles.countText, { color: colors.onSurfaceVariant }]}>{discoverGroups.length}</Text>
                </View>
              )}
            </View>

            {groupsLoading && discoverGroups.length === 0 ? (
              <SkeletonLoader count={3} variant="list" />
            ) : discoverGroups.length === 0 && !groupsLoading ? (
              <View style={[styles.discoverEmpty, { backgroundColor: colors.surfaceContainerLow, borderRadius: 20 }]}>
                <View style={[styles.discoverEmptyIcon, { backgroundColor: colors.primary + "12" }]}>
                  <Ionicons name="compass-outline" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.discoverEmptyTitle, { color: colors.onSurface }]}>
                  {isFiltering ? "لا توجد نتائج" : "لا توجد مجموعات للاكتشاف"}
                </Text>
                <Text style={[styles.discoverEmptyText, { color: colors.mutedForeground }]}>
                  {isFiltering ? "جرب تغيير الفلاتر أو مصطلح البحث" : "كن الأول وأنشئ مجموعتك الرياضية"}
                </Text>
                {!isFiltering && (
                  <Pressable
                    style={styles.discoverEmptyCTA}
                    onPress={() => router.push("/create-group")}
                  >
                    <LinearGradient
                      colors={[colors.accent, colors.accent + "CC"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.discoverEmptyCTAInner}
                    >
                      <Ionicons name="add" size={16} color={colors.accentForeground} />
                      <Text style={[styles.discoverEmptyCTAText, { color: colors.accentForeground }]}>أنشئ مجموعة</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            ) : (
              discoverGroups.map((group) => (
                <DiscoverGroupCard
                  key={group.id}
                  group={group}
                  onJoin={async () => {
                    await joinGroup(group.id);
                    showToast(`تم إرسال طلب الانضمام، في انتظار موافقة الأدمن`);
                  }}
                />
              ))
            )}
            {discoverGroups.length > 0 && <View style={{ height: 8 }} />}
          </>
        )}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => router.push("/create-group")}
      >
        <LinearGradient
          colors={[colors.accent, colors.accent + "CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color={colors.accentForeground} />
        </LinearGradient>
      </Pressable>

      {toast.visible && (
        <View style={[styles.toast, { backgroundColor: colors.success }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </Animated.View>
  );
}

function MyGroupsEmpty({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.emptyMyGroups, { backgroundColor: colors.surfaceContainerLow, borderRadius: 24 }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
        <Ionicons name="people-outline" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>ابدأ مجموعتك الأولى</Text>
      <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
        أنشئ مجموعتك الرياضية أو انضم لمجموعة موجودة واستمتع بالتنظيم مع أصدقائك
      </Text>
      <Pressable
        style={styles.emptyCreateBtn}
        onPress={() => router.push("/create-group")}
      >
        <LinearGradient
          colors={[colors.accent, colors.accent + "CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyCreateBtnInner}
        >
          <Ionicons name="add" size={16} color={colors.accentForeground} />
          <Text style={[styles.emptyCreateBtnText, { color: colors.accentForeground }]}>أنشئ مجموعة</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const MyGroupCard = React.memo(function MyGroupCard({
  group,
  currentUserId,
  onLeave,
}: {
  group: Group;
  currentUserId: string;
  onLeave?: () => void;
}) {
  const colors = useColors();
  const SportIcon = getSportIcon(group.sport);
  const sportTheme = getSportTheme(group.sport);
  const glassBg = sportTheme.glass.backgroundGradient;
  const borderColor = sportTheme.glass.borderGlow;
  const primaryColor = sportTheme.primary;

  return (
    <Pressable
      style={[
        styles.myCard,
        {
          borderWidth: 1.5,
          borderColor: borderColor,
          ...Platform.select({
            web: { boxShadow: `0px 4px 20px ${sportTheme.glass.glassColor}, 0px 1px 6px rgba(0,0,0,0.06)` },
            default: {
              shadowColor: sportTheme.glass.glassColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.6,
              shadowRadius: 16,
              elevation: 5,
            },
          }),
        },
      ]}
      onPress={() => router.push({ pathname: "/group-detail", params: { id: group.id } })}
    >
      <LinearGradient
        colors={glassBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.myCardContent}>
        <View style={styles.myCardTop}>
          <View
            style={[
              styles.sportPill,
              { backgroundColor: sportTheme.badgeBackground, borderWidth: 1, borderColor: borderColor },
            ]}
          >
            <SportIcon color={primaryColor} size={14} />
            <Text style={[styles.sportPillText, { color: sportTheme.badgeForeground }]}>{sportLabel(group.sport)}</Text>
          </View>
          <View style={styles.myCardTopBadges}>
            {group.adminId === currentUserId && (
              <View style={[styles.crownBadge, { backgroundColor: colors.warning + "20" }]}>
                <Ionicons name="star" size={13} color={colors.warning} />
              </View>
            )}
            {!group.isPublic && (
              <View style={[styles.lockBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Ionicons name="lock-closed" size={11} color={colors.mutedForeground} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.myCardMiddle}>
          <Text style={[styles.myCardName, { color: colors.onSurface }]} numberOfLines={2}>
            {group.name}
          </Text>
          <View style={styles.memberRow}>
            <Text style={[styles.memberCountText, { color: colors.mutedForeground }]}>{group.memberCount} عضو</Text>
            <Ionicons name="people" size={15} color={colors.mutedForeground} />
          </View>
        </View>

        {group.nextMatch && (
          <View style={[styles.nextMatchPill, { backgroundColor: sportTheme.primaryContainer }]}>
            <Text style={[styles.nextMatchPillText, { color: primaryColor }]} numberOfLines={1}>
              {typeof group.nextMatch === "object" ? group.nextMatch.title : group.nextMatch}
            </Text>
            <Ionicons name="calendar-outline" size={13} color={primaryColor} />
          </View>
        )}

        <View style={styles.myCardActions}>
          {group.adminId === currentUserId ? (
            <>
              <Pressable
                style={[styles.cardActionBtn, { backgroundColor: sportTheme.primaryContainer }]}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push({ pathname: "/group-detail", params: { id: group.id, showInvite: "1" } });
                }}
              >
                <Ionicons name="person-add-outline" size={13} color={primaryColor} />
                <Text style={[styles.cardActionBtnText, { color: primaryColor }]}>دعوة</Text>
              </Pressable>
              <Pressable
                style={[styles.cardActionBtn, { backgroundColor: sportTheme.primaryContainer }]}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push({ pathname: "/group-management", params: { id: group.id } });
                }}
              >
                <Ionicons name="settings-outline" size={13} color={primaryColor} />
                <Text style={[styles.cardActionBtnText, { color: primaryColor }]}>إدارة</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.cardActionBtn, { backgroundColor: colors.destructive + "15", borderWidth: 1, borderColor: colors.destructive + "30" }]}
              onPress={(e) => {
                e.stopPropagation();
                onLeave?.();
              }}
            >
              <Ionicons name="exit-outline" size={13} color={colors.destructive} />
              <Text style={[styles.cardActionBtnText, { color: colors.destructive }]}>غادر</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}, (prev, next) => prev.group === next.group && prev.currentUserId === next.currentUserId);

const DiscoverGroupCard = React.memo(function DiscoverGroupCard({
  group,
  onJoin,
}: {
  group: Group;
  onJoin: () => void;
}) {
  const colors = useColors();
  const SportIcon = getSportIcon(group.sport);
  const sc = sportColor(group.sport, colors);

  return (
    <Pressable
      style={styles.discoverCardWrapper}
      onPress={() => router.push({ pathname: "/group-detail", params: { id: group.id } })}
    >
      <GlassCard variant="light" padding="none" style={styles.discoverCard}>
        <LinearGradient
          colors={[sc, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.discoverBanner}
        >
          <View style={styles.discoverBannerCircle}>
            <SportIcon color="#fff" size={22} />
          </View>
          {!group.isPublic && (
            <View style={styles.discoverLockBadge}>
              <Ionicons name="lock-closed" size={10} color="#fff" />
            </View>
          )}
        </LinearGradient>

        <View style={styles.discoverBody}>
          <Text style={[styles.discoverName, { color: colors.onSurface }]} numberOfLines={1}>
            {group.name}
          </Text>

          <View style={styles.discoverBadgeRow}>
            <GlassBadge
              label={`${group.memberCount} عضو`}
              variant="default"
              size="sm"
            />
            <GlassBadge
              label={sportLabel(group.sport)}
              variant="sport"
              sport={group.sport}
              size="sm"
            />
          </View>

          {group.description ? (
            <Text style={[styles.discoverDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
              {group.description}
            </Text>
          ) : null}

          {group.nextMatch && (
            <View style={[styles.nextMatchChip, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
              <Text style={[styles.nextMatchChipText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {typeof group.nextMatch === "object" ? group.nextMatch.title : group.nextMatch}
              </Text>
            </View>
          )}

          <View style={styles.discoverFooter}>
            {group.hasPendingRequest ? (
              <GlassButton
                label="في الانتظار..."
                sport={group.sport}
                variant="primary"
                size="sm"
                onPress={() => {}}
                style={[styles.discoverBtn, { opacity: 0.5 }]}
              />
            ) : (
              <GlassButton
                label="طلب"
                sport={group.sport}
                variant="accent"
                size="sm"
                onPress={onJoin}
                style={styles.discoverBtn}
              />
            )}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}, (prev, next) => prev.group === next.group);

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  title: { fontSize: 26, fontFamily: "Cairo_700Bold", lineHeight: 36 },
  filterList: { gap: 8, paddingRight: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
  },
  filterText: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  resultsRow: { paddingHorizontal: 20, paddingTop: 2 },
  resultsText: { fontSize: 12, fontFamily: "Cairo_400Regular", textAlign: "right" },

  scrollContent: { paddingTop: 8, gap: 0 },
  offlineBanner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  offlineBannerText: { flex: 1, fontSize: 13, fontFamily: "Cairo_600SemiBold", textAlign: "right", lineHeight: 20 },
  loadingRow: { paddingVertical: 16, paddingHorizontal: 16, gap: 16 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Cairo_700Bold" },
  countBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  countText: { fontSize: 13, fontFamily: "Cairo_700Bold" },

  myGroupsScroll: { paddingHorizontal: 16, gap: 14, paddingBottom: 4 },

  subSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 10,
    justifyContent: "flex-end",
  },
  subSectionTitle: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingBottom: 4,
  },
  dot: { height: 6, borderRadius: 3 },

  myCard: {
    width: MY_CARD_WIDTH,
    minHeight: 190,
    borderRadius: 24,
    overflow: "hidden",
  },
  myCardContent: { flex: 1, padding: 18, gap: 10, justifyContent: "space-between" },
  myCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sportPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  sportPillText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  myCardTopBadges: { flexDirection: "row", alignItems: "center", gap: 6 },
  crownBadge: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  lockBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  myCardMiddle: { gap: 6, flex: 1, justifyContent: "flex-end" },
  myCardName: {
    fontSize: 20,
    fontFamily: "Cairo_900Black",
    lineHeight: 28,
    textAlign: "right",
  },
  memberRow: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "flex-end" },
  memberCountText: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  nextMatchPill: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  nextMatchPillText: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    flex: 1,
    textAlign: "right",
  },
  myCardActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  cardActionBtnText: { fontSize: 12, fontFamily: "Cairo_700Bold" },

  emptyMyGroups: { marginHorizontal: 16, padding: 24, alignItems: "center", gap: 14 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontFamily: "Cairo_700Bold", textAlign: "center" },
  emptyDesc: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "center", lineHeight: 22 },
  emptyCreateBtn: { borderRadius: 24, overflow: "hidden", marginTop: 4 },
  emptyCreateBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyCreateBtnText: { fontSize: 14, fontFamily: "Cairo_700Bold" },

  noResults: { marginHorizontal: 16, padding: 20, alignItems: "center", gap: 8, marginBottom: 12 },
  noResultsText: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "center" },

  discoverCardWrapper: { marginHorizontal: 16, marginBottom: 12 },
  discoverCard: { borderRadius: 20, overflow: "hidden" },

  discoverBanner: {
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  discoverBannerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
  },
  discoverLockBadge: {
    position: "absolute",
    top: 8,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.28)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  discoverBody: { padding: 16, gap: 8 },
  discoverName: { fontSize: 16, fontFamily: "Cairo_700Bold", textAlign: "right", lineHeight: 24 },

  discoverBadgeRow: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" },
  discoverDesc: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "right", lineHeight: 20 },

  nextMatchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: "flex-end",
  },
  nextMatchChipText: { fontSize: 12, fontFamily: "Cairo_400Regular" },

  discoverFooter: { flexDirection: "row", justifyContent: "flex-start", marginTop: 4 },
  discoverBtn: { minWidth: 100 },

  discoverEmpty: { marginHorizontal: 16, padding: 24, alignItems: "center", gap: 10 },
  discoverEmptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  discoverEmptyTitle: { fontSize: 15, fontFamily: "Cairo_700Bold", textAlign: "center" },
  discoverEmptyText: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "center" },
  discoverEmptyCTA: { borderRadius: 24, overflow: "hidden", marginTop: 4 },
  discoverEmptyCTAInner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10 },
  discoverEmptyCTAText: { fontSize: 14, fontFamily: "Cairo_700Bold" },

  fab: {
    position: "absolute",
    bottom: 100,
    end: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0px 10px 30px rgba(44, 84, 232, 0.35), 0px 4px 10px rgba(44, 84, 232, 0.18)" },
      default: {
        shadowColor: "#2C54E8",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 14,
      },
    }),
  },
  fabGradient: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },

  toast: {
    position: "absolute",
    bottom: 110,
    left: 20,
    right: 20,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  toastText: { color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 14, textAlign: "center" },
});
