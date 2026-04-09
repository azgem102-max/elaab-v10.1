import { useApp, SportType, sportColor, Match } from "@/context/AppContext";
import { PositionPickerModal } from "@/components/PositionPickerModal";
import { FilterBottomSheet, MatchFilters } from "@/components/FilterBottomSheet";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { useActiveSport } from "@/context/SportFilterContext";
import { api, ApiMatch } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { getSportTheme } from "@/constants/sportTheme";
import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { GlassInput } from "@/components/glass/GlassInput";
import { MatchCard } from "@/components/glass/MatchCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { MatchMapView } from "@/components/MapWrapper";
import { AllSportsIcon, FootballIcon, PadelIcon, TennisIcon } from "@/components/icons/SportIcons";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Sport = "all" | SportType;
type VisibilityFilter = "all" | "public" | "private";
type DateFilter = "all" | "today" | "tomorrow" | "thisWeek";
type ViewMode = "list" | "map";

const SPORT_FILTERS: { key: Sport; label: string; icon: React.FC<{ color?: string; size?: number }> }[] = [
  { key: "all", label: "الكل", icon: AllSportsIcon },
  { key: "football", label: "كرة القدم", icon: FootballIcon },
  { key: "padel", label: "بادل", icon: PadelIcon },
  { key: "tennis", label: "تنس", icon: TennisIcon },
];

const DATE_FILTERS: { key: DateFilter; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "all", label: "كل الأوقات", icon: "calendar-outline" },
  { key: "today", label: "اليوم", icon: "today-outline" },
  { key: "tomorrow", label: "غداً", icon: "sunny-outline" },
  { key: "thisWeek", label: "هذا الأسبوع", icon: "calendar-clear-outline" },
];

const VISIBILITY_FILTERS: { key: VisibilityFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "public", label: "عامة" },
  { key: "private", label: "خاصة" },
];


function toArabicNumeral(n: number): string {
  return n.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}


function apiMatchToMatch(item: ApiMatch): Match {
  return {
    id: item.id,
    title: item.title,
    sport: item.sport as SportType,
    date: new Date(item.date),
    time: item.time,
    venue: item.venue,
    location: item.location,
    maxPlayers: item.maxPlayers,
    cost: item.cost,
    isPublic: item.isPublic ?? true,
    organizerId: item.organizerId,
    organizerName: item.organizerName ?? "",
    organizerReliability: item.organizerReliability ?? null,
    players: [],
    playerCount: item.playerCount,
    status: (item.status as "upcoming" | "today" | "completed" | "cancelled") ?? "upcoming",
    sessionType: (item.sessionType as "match" | "training") ?? "match",
    matchFormat: (item.matchFormat as "single" | "double" | null) ?? null,
    description: item.description,
    joinedByCurrentUser: item.joinedByCurrentUser ?? false,
    invitedGroupId: item.invitedGroupId,
    skillLevel: item.skillLevel as "beginner" | "intermediate" | "advanced" | null ?? null,
  };
}

function AnimatedMatchCard({
  item,
  index,
  onPress,
  onJoin,
  onViewGroup,
  searchQuery,
}: {
  item: ApiMatch;
  index: number;
  colors: ReturnType<typeof useColors>;
  onPress: (item: ApiMatch) => void;
  onJoin: (item: { id: string; title: string; isPublic?: boolean; sport: SportType }) => void;
  onViewGroup?: (groupId: string) => void;
  searchQuery?: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 350,
      delay: Math.min(index * 60, 300),
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const match = apiMatchToMatch(item);
  const isGroupInvited = !!item.invitedGroupId;

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
      <MatchCard
        match={match}
        variant="full"
        searchQuery={searchQuery}
        showActions
        onPress={() => onPress(item)}
        onJoin={isGroupInvited ? undefined : () => onJoin(item)}
        onViewGroup={isGroupInvited && item.invitedGroupId ? () => onViewGroup?.(item.invitedGroupId!) : undefined}
        style={styles.cardSpacing}
      />
    </Animated.View>
  );
}


export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { matches: localMatches, joinMatch, refreshMatches, user } = useApp();
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState<Sport>("all");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, []);
  const { setActiveSport } = useActiveSport();

  useEffect(() => {
    setActiveSport(sportFilter === "all" ? null : sportFilter);
  }, [sportFilter, setActiveSport]);

  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<MatchFilters>({
    skillLevel: null,
    timeOfDay: null,
    hasSpots: false,
    distanceRadius: null,
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [focused, setFocused] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", ok: true });
  const [apiMatches, setApiMatches] = useState<ApiMatch[] | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [pickerMatch, setPickerMatch] = useState<Match | null>(null);
  const [joiningLoading, setJoiningLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMapMatch, setSelectedMapMatch] = useState<ApiMatch | null>(null);
  const listOpacity = useRef(new Animated.Value(1)).current;
  const mapOpacity = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  const hasActiveFilters =
    sportFilter !== "all" ||
    visibilityFilter !== "all" ||
    dateFilter !== "all" ||
    openOnly ||
    search.trim().length > 0 ||
    advancedFilters.skillLevel !== null ||
    advancedFilters.timeOfDay !== null ||
    advancedFilters.hasSpots ||
    advancedFilters.distanceRadius !== null;

  const advancedFilterCount = [
    advancedFilters.skillLevel !== null,
    advancedFilters.timeOfDay !== null,
    advancedFilters.hasSpots,
    advancedFilters.distanceRadius !== null,
  ].filter(Boolean).length;

  const requestUserLocation = useCallback(async (autoFallbackToList = false): Promise<{ lat: number; lng: number } | null> => {
    if (Platform.OS === "web") return null;
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        setUserLocation(null);
        if (autoFallbackToList) {
          setViewMode("list");
        }
        return null;
      }
      setLocationDenied(false);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      return loc;
    } catch {
      setLocationDenied(true);
      if (autoFallbackToList) {
        setViewMode("list");
      }
      return null;
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const fetchMatches = useCallback(async () => {
    try {
      setApiLoading(true);
      setApiError(false);
      const params: {
        sport?: string;
        type?: string;
        date?: string;
        openOnly?: boolean;
        skill_level?: string;
        time_of_day?: string;
        has_spots?: boolean;
        lat?: number;
        lng?: number;
        radius?: number;
      } = {};
      if (sportFilter !== "all") params.sport = sportFilter;
      if (dateFilter !== "all") params.date = dateFilter;
      if (openOnly) params.openOnly = true;
      if (advancedFilters.skillLevel) params.skill_level = advancedFilters.skillLevel;
      if (advancedFilters.timeOfDay) params.time_of_day = advancedFilters.timeOfDay;
      if (advancedFilters.hasSpots) params.has_spots = true;
      if (advancedFilters.distanceRadius !== null) {
        let loc = userLocation;
        if (!loc) {
          loc = await requestUserLocation();
        }
        if (loc) {
          params.lat = loc.lat;
          params.lng = loc.lng;
          params.radius = advancedFilters.distanceRadius;
        } else {
          setAdvancedFilters((f) => ({ ...f, distanceRadius: null }));
          showToast("تعذّر تحديد موقعك — تم إلغاء فلتر المسافة", false);
        }
      }
      const { matches } = await api.listMatches(params);
      setApiMatches(matches);
    } catch {
      setApiError(true);
      setApiMatches(null);
    } finally {
      setApiLoading(false);
    }
  }, [sportFilter, dateFilter, openOnly, advancedFilters, userLocation, requestUserLocation]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [fetchMatches])
  );

  function isPrivateMatch(m: ApiMatch): boolean {
    return !m.isPublic || !!m.invitedGroupId;
  }

  const allDisplayMatches: ApiMatch[] = useMemo(() => {
    const isUsingLocal = !apiMatches;
    const base: ApiMatch[] = apiMatches
      ? apiMatches
      : localMatches.map((m) => ({
          id: m.id,
          title: m.title,
          sport: m.sport,
          date: m.date.toISOString(),
          time: m.time,
          venue: m.venue,
          location: m.location,
          maxPlayers: m.maxPlayers,
          cost: m.cost,
          isPublic: m.isPublic,
          organizerId: m.organizerId,
          organizerName: m.organizerName,
          organizerReliability: m.organizerReliability,
          playerCount: m.playerCount ?? m.players.length,
          status: m.status,
          sessionType: m.sessionType,
          description: m.description,
          joinedByCurrentUser: m.joinedByCurrentUser,
          invitedGroupId: m.invitedGroupId,
        }));

    let filtered = base
      .filter((m) => m.status !== "completed" && m.status !== "cancelled")
      .filter((m) => {
        if (visibilityFilter === "public") return m.isPublic && !m.invitedGroupId;
        if (visibilityFilter === "private") return isPrivateMatch(m);
        return true;
      })
      .filter((m) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return m.title.toLowerCase().includes(q) || m.venue.toLowerCase().includes(q);
      });

    if (isUsingLocal) {
      if (sportFilter !== "all") {
        filtered = filtered.filter((m) => m.sport === sportFilter);
      }
      if (dateFilter !== "all") {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 86400000);
        const tomorrowEnd = new Date(todayStart.getTime() + 2 * 86400000);
        const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);
        filtered = filtered.filter((m) => {
          const md = new Date(m.date);
          if (dateFilter === "today") return md >= todayStart && md < todayEnd;
          if (dateFilter === "tomorrow") return md >= todayEnd && md < tomorrowEnd;
          if (dateFilter === "thisWeek") return md >= todayStart && md < weekEnd;
          return true;
        });
      }
      if (openOnly) {
        filtered = filtered.filter((m) => (m.playerCount ?? 0) < m.maxPlayers);
      }
    }

    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [apiMatches, localMatches, visibilityFilter, search, sportFilter, dateFilter, openOnly]);

  function clearAllFilters() {
    setSportFilter("all");
    setVisibilityFilter("all");
    setDateFilter("all");
    setOpenOnly(false);
    setSearch("");
    setAdvancedFilters({ skillLevel: null, timeOfDay: null, hasSpots: false, distanceRadius: null });
  }

  function showToast(message: string, ok = true) {
    setToast({ visible: true, message, ok });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }

  async function handleJoin(match: { id: string; title: string; isPublic?: boolean; sport: SportType }) {
    if (match.isPublic) {
      const full = localMatches.find((m) => m.id === match.id);
      if (full) {
        setPickerMatch(full);
      } else {
        const apiMatch = apiMatches?.find((m) => m.id === match.id);
        const synth: Match = {
          id: match.id,
          title: match.title,
          sport: match.sport,
          isPublic: true,
          date: apiMatch ? new Date(apiMatch.date) : new Date(),
          time: apiMatch?.time ?? "",
          venue: apiMatch?.venue ?? "",
          location: apiMatch?.location ?? "",
          maxPlayers: apiMatch?.maxPlayers ?? 0,
          cost: apiMatch?.cost ?? 0,
          organizerId: apiMatch?.organizerId ?? "",
          organizerName: apiMatch?.organizerName ?? "",
          organizerReliability: apiMatch?.organizerReliability ?? null,
          status: (apiMatch?.status as "upcoming" | "today" | "completed" | "cancelled") ?? "upcoming",
          sessionType: (apiMatch?.sessionType as "match" | "training") ?? "match",
          matchFormat: apiMatch?.matchFormat as "single" | "double" | null ?? null,
          description: apiMatch?.description,
          players: [],
          joinedByCurrentUser: false,
          invitedGroupId: apiMatch?.invitedGroupId,
        };
        setPickerMatch(synth);
      }
      return;
    }
    const result = await joinMatch(match.id);
    if (result.success) {
      showToast(`تم تسجيلك في ${match.title} ✓`);
      fetchMatches();
      refreshMatches();
    } else if (result.conflict) {
      showToast(`تعارض في المواعيد مع: "${result.conflict.title}" الساعة ${result.conflict.time}`, false);
    } else if (result.error) {
      showToast(result.error, false);
    }
  }

  function handleMatchPress(item: ApiMatch) {
    const isPrivate = isPrivateMatch(item);
    if (isPrivate && item.invitedGroupId) {
      router.push({ pathname: "/group-detail", params: { id: item.invitedGroupId } });
    } else {
      router.push({ pathname: "/match-details", params: { id: item.id } });
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  }

  function switchViewMode(nextMode: ViewMode) {
    if (nextMode === viewMode) return;
    const fadeOut = nextMode === "map" ? listOpacity : mapOpacity;
    const fadeIn = nextMode === "map" ? mapOpacity : listOpacity;
    Animated.parallel([
      Animated.timing(fadeOut, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
    setViewMode(nextMode);
    if (nextMode === "map" && !userLocation && Platform.OS !== "web") {
      requestUserLocation(true);
    }
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: "transparent", opacity: fadeAnim }]}>
      <GlassScreenHeader style={{ paddingTop: topPad + 12, paddingHorizontal: 20, gap: 10, paddingBottom: 8 }}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerActions}>
            <View style={[styles.viewToggleGroup, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Pressable
                style={[
                  styles.viewToggleBtn,
                  viewMode === "list" && { backgroundColor: colors.primary },
                ]}
                onPress={() => switchViewMode("list")}
              >
                <Ionicons name="list-outline" size={17} color={viewMode === "list" ? "#fff" : colors.onSurfaceVariant} />
              </Pressable>
              <Pressable
                style={[
                  styles.viewToggleBtn,
                  viewMode === "map" && { backgroundColor: colors.primary },
                ]}
                onPress={() => switchViewMode("map")}
              >
                <Ionicons name="map-outline" size={17} color={viewMode === "map" ? "#fff" : colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <Pressable
              style={[
                styles.filterBtn,
                {
                  backgroundColor: advancedFilterCount > 0 ? colors.primaryContainer : colors.surfaceContainerLow,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                },
              ]}
              onPress={() => setShowFilterSheet(true)}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={advancedFilterCount > 0 ? colors.primary : colors.onSurfaceVariant}
              />
              {advancedFilterCount > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.filterBadgeText}>{advancedFilterCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <Text style={[styles.title, { color: colors.onSurface }]}>استكشاف</Text>
          <Pressable
            style={[
              styles.viewToggle,
              { opacity: 0, pointerEvents: "none" },
            ]}
            onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
          >
            <Ionicons
              name={viewMode === "list" ? "map-outline" : "list-outline"}
              size={20}
              color={viewMode === "map" ? "#fff" : colors.primary}
            />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <GlassInput
            value={search}
            onChangeText={setSearch}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="ابحث عن مباراة أو ملعب..."
            sport={sportFilter === "all" ? "football" : sportFilter}
          />
          {search.length > 0 && (
            <TouchableOpacity
              style={styles.searchClearBtn}
              onPress={() => setSearch("")}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <ActiveFilterChips
          filters={advancedFilters}
          onRemoveSkillLevel={() => setAdvancedFilters((f) => ({ ...f, skillLevel: null }))}
          onRemoveTimeOfDay={() => setAdvancedFilters((f) => ({ ...f, timeOfDay: null }))}
          onRemoveHasSpots={() => setAdvancedFilters((f) => ({ ...f, hasSpots: false }))}
          onRemoveDistance={() => setAdvancedFilters((f) => ({ ...f, distanceRadius: null }))}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {SPORT_FILTERS.map((f) => {
            const isActive = sportFilter === f.key;
            const IconComponent = f.icon;
            const activeSportTheme = f.key !== "all" ? getSportTheme(f.key as SportType) : null;
            const activeBg = isActive
              ? f.key === "all"
                ? colors.accent
                : activeSportTheme!.primary
              : colors.surfaceContainerLow;
            const activeIconColor = isActive
              ? f.key === "all"
                ? "#111827"
                : "#fff"
              : colors.onSurfaceVariant;
            const activeTextColor = isActive
              ? f.key === "all"
                ? "#111827"
                : "#fff"
              : colors.onSurfaceVariant;
            return (
              <Pressable
                key={f.key}
                style={[
                  styles.filterChip,
                  isActive
                    ? { backgroundColor: activeBg }
                    : { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: "#E5E7EB" },
                ]}
                onPress={() => setSportFilter(f.key)}
              >
                <IconComponent color={activeIconColor} size={15} />
                <Text style={[styles.filterText, { color: activeTextColor }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {DATE_FILTERS.map((f) => (
            <Pressable
              key={`date-${f.key}`}
              style={[
                styles.filterChip,
                dateFilter === f.key
                  ? { backgroundColor: colors.accent }
                  : { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: "#E5E7EB" },
              ]}
              onPress={() => setDateFilter(f.key)}
            >
              <Ionicons
                name={f.icon}
                size={14}
                color={dateFilter === f.key ? "#111827" : colors.onSurfaceVariant}
              />
              <Text style={[styles.filterText, { color: dateFilter === f.key ? "#111827" : colors.onSurfaceVariant }]}>
                {f.label}
              </Text>
            </Pressable>
          ))}

          <View style={styles.filterDivider} />

          <Pressable
            style={[
              styles.filterChip,
              openOnly
                ? { backgroundColor: colors.success }
                : { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: "#E5E7EB" },
            ]}
            onPress={() => setOpenOnly((v) => !v)}
          >
            <Ionicons
              name={openOnly ? "checkmark-circle" : "ellipse-outline"}
              size={14}
              color={openOnly ? "#fff" : colors.onSurfaceVariant}
            />
            <Text style={[styles.filterText, { color: openOnly ? "#fff" : colors.onSurfaceVariant }]}>
              مفتوحة فقط
            </Text>
          </Pressable>

          <View style={styles.filterDivider} />

          {VISIBILITY_FILTERS.map((f) => (
            <Pressable
              key={`vis-${f.key}`}
              style={[
                styles.filterChip,
                visibilityFilter === f.key
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: "#E5E7EB" },
              ]}
              onPress={() => setVisibilityFilter(f.key)}
            >
              {f.key !== "all" && (
                <Ionicons
                  name={f.key === "public" ? "globe-outline" : "lock-closed-outline"}
                  size={13}
                  color={visibilityFilter === f.key ? "#fff" : colors.onSurfaceVariant}
                />
              )}
              <Text style={[styles.filterText, { color: visibilityFilter === f.key ? "#fff" : colors.onSurfaceVariant }]}>
                {f.label}
              </Text>
            </Pressable>
          ))}

          {hasActiveFilters && (
            <>
              <View style={styles.filterDivider} />
              <Pressable
                style={[styles.clearFilterBtn, { backgroundColor: colors.destructive + "18" }]}
                onPress={clearAllFilters}
              >
                <Ionicons name="close-circle-outline" size={14} color={colors.destructive} />
                <Text style={[styles.clearFilterBtnText, { color: colors.destructive }]}>مسح الكل</Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        {!apiLoading && (
          <View style={styles.resultCountRow}>
            <Text style={[styles.resultCount, { color: colors.onSurfaceVariant }]}>
              {toArabicNumeral(allDisplayMatches.length)}{" "}
              {allDisplayMatches.length === 1 ? "مباراة متاحة" : "مباريات متاحة"}
            </Text>
            {apiError && (
              <Pressable onPress={fetchMatches} style={styles.retryBtn}>
                <Ionicons name="refresh-outline" size={14} color={colors.warning} />
                <Text style={[styles.retryText, { color: colors.warning }]}>إعادة المحاولة</Text>
              </Pressable>
            )}
          </View>
        )}
      </GlassScreenHeader>

      <View style={styles.viewsContainer}>
      <Animated.View style={[styles.viewLayer, { opacity: listOpacity, zIndex: viewMode === "list" ? 1 : 0, pointerEvents: viewMode === "list" ? "auto" : "none" }]}>
        <FlatList
          data={apiLoading ? [] : allDisplayMatches}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad }]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === "android"}
          windowSize={10}
          maxToRenderPerBatch={8}
          initialNumToRender={8}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            apiLoading ? (
              <SkeletonLoader count={3} variant="card" />
            ) : apiError && allDisplayMatches.length > 0 ? (
              <Pressable
                style={[styles.offlineBanner, { backgroundColor: colors.warning + "20" }]}
                onPress={fetchMatches}
              >
                <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
                <Text style={[styles.offlineBannerText, { color: colors.warning }]}>
                  تعذّر التحديث — تعرض بيانات مخزّنة
                </Text>
                <View style={[styles.retryBannerBtn, { backgroundColor: colors.warning + "30" }]}>
                  <Ionicons name="refresh-outline" size={14} color={colors.warning} />
                  <Text style={[styles.retryBannerBtnText, { color: colors.warning }]}>إعادة المحاولة</Text>
                </View>
              </Pressable>
            ) : apiError ? (
              <View style={[styles.offlineBanner, { backgroundColor: colors.warning + "20" }]}>
                <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
                <Text style={[styles.offlineBannerText, { color: colors.warning }]}>
                  تعذّر الاتصال بالخادم — عرض البيانات المحلية.
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            apiLoading ? null : (
              <EmptyState
                icon={hasActiveFilters ? "filter-outline" : "football-outline"}
                title={hasActiveFilters ? "لا توجد نتائج لهذه الفلاتر" : "لا توجد مباريات قادمة"}
                description={
                  hasActiveFilters
                    ? "جرّب توسيع نطاق البحث أو مسح بعض الفلاتر"
                    : "كن أول من ينشئ مباراة اليوم!"
                }
                actions={
                  hasActiveFilters
                    ? [
                        { label: "إعادة ضبط الفلاتر", icon: "refresh-outline", onPress: clearAllFilters, variant: "secondary" },
                        { label: "تعديل الفلاتر", icon: "options-outline", onPress: () => setShowFilterSheet(true), variant: "secondary" },
                      ]
                    : [{ label: "أنشئ مباراة", icon: "add-circle-outline", onPress: () => router.push("/create-match") }]
                }
              />
            )
          }
          renderItem={({ item, index }) => (
            <AnimatedMatchCard
              item={item}
              index={index}
              colors={colors}
              onPress={handleMatchPress}
              onJoin={handleJoin}
              onViewGroup={(groupId) => router.push({ pathname: "/group-detail", params: { id: groupId } })}
              searchQuery={search}
            />
          )}
        />
      </Animated.View>

      <Animated.View style={[styles.viewLayer, { opacity: mapOpacity, zIndex: viewMode === "map" ? 1 : 0, pointerEvents: viewMode === "map" ? "auto" : "none" }]}>
        {locationDenied ? (
          <View style={[styles.locationDeniedContainer, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={[styles.locationDeniedCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="location-outline" size={48} color={colors.warning} />
              <Text style={[styles.locationDeniedTitle, { color: colors.onSurface }]}>
                لا يمكن عرض الخريطة
              </Text>
              <Text style={[styles.locationDeniedSubtitle, { color: colors.mutedForeground }]}>
                الوصول إلى الموقع مطلوب لعرض المباريات على الخريطة. يمكنك السماح بذلك من إعدادات الجهاز.
              </Text>
              <Pressable
                style={[styles.locationDeniedBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setLocationDenied(false);
                  switchViewMode("list");
                }}
              >
                <Ionicons name="list-outline" size={16} color="#fff" />
                <Text style={styles.locationDeniedBtnText}>عرض القائمة بدلاً من ذلك</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <MatchMapView
            matches={allDisplayMatches}
            onMatchPress={handleMatchPress}
            selectedMatch={selectedMapMatch}
            onPinPress={(item) => setSelectedMapMatch(item)}
            onCloseCard={() => setSelectedMapMatch(null)}
            onJoinFromCard={(item) => {
              setSelectedMapMatch(null);
              handleJoin(item);
            }}
            userLocation={userLocation ?? undefined}
          />
        )}
      </Animated.View>
      </View>

      {toast.visible && (
        <View
          style={[styles.toast, { backgroundColor: toast.ok ? colors.success : colors.destructive, pointerEvents: "none" }]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: botPad + 16 }]}
        onPress={() => router.push("/create-match")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {pickerMatch && (
        <PositionPickerModal
          visible={!!pickerMatch}
          sport={pickerMatch.sport}
          sportAccentColor={sportColor(pickerMatch.sport, colors)}
          initialPosition={(user?.sportProfiles?.[pickerMatch.sport]?.position ?? [])[0] ?? null}
          loading={joiningLoading}
          onClose={() => setPickerMatch(null)}
          onConfirm={async (position) => {
            const match = pickerMatch;
            setPickerMatch(null);
            setJoiningLoading(true);
            const result = await joinMatch(match.id, position);
            setJoiningLoading(false);
            if (result.success) {
              showToast(`تم تسجيلك في ${match.title} ✓`);
              fetchMatches();
              refreshMatches();
            } else if (result.alreadyJoined) {
              showToast("أنت مسجل بالفعل في هذه المباراة", false);
            } else if (result.isFull) {
              showToast("المباراة مكتملة، لا توجد أماكن متاحة", false);
            } else if (result.conflict) {
              showToast(`تعارض في المواعيد مع: "${result.conflict.title}" الساعة ${result.conflict.time}`, false);
            } else if (result.error) {
              showToast(result.error, false);
            }
          }}
        />
      )}

      <FilterBottomSheet
        visible={showFilterSheet}
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        onClose={() => setShowFilterSheet(false)}
        previewCount={apiLoading ? null : allDisplayMatches.length}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  viewsContainer: { flex: 1, position: "relative" },
  viewLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  searchContainer: { position: "relative" },
  searchClearBtn: {
    position: "absolute",
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  locationDeniedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  locationDeniedCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    maxWidth: 340,
    width: "100%",
  },
  locationDeniedTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  locationDeniedSubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  locationDeniedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 4,
  },
  locationDeniedBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
  },
  header: { paddingHorizontal: 20, gap: 10, paddingBottom: 8 },
  headerTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 26, fontFamily: "Cairo_700Bold", textAlign: "right", lineHeight: 36 },
  viewToggle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  viewToggleGroup: {
    flexDirection: "row",
    borderRadius: 22,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  searchIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  filterBar: { gap: 8, paddingRight: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
  },
  filterEmoji: { fontSize: 14 },
  filterText: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignSelf: "center",
    marginHorizontal: 2,
  },
  clearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
  },
  clearFilterBtnText: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  resultCountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultCount: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  retryText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  cardSpacing: { marginBottom: 14 },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  offlineBannerText: { fontSize: 13, fontFamily: "Cairo_400Regular", flex: 1, textAlign: "right", lineHeight: 20 },
  retryBannerBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  retryBannerBtnText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  toastText: { color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 14 },
  fab: {
    position: "absolute",
    end: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
