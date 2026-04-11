import {
  useApp, MatchPlayer, sportColor, sportLabel, formatDate,
  reliabilityColor, reliabilityLabel, formatReliability, AttendanceStatus, PaymentStatus,
} from "@/context/AppContext";
import { api } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { GlassButton } from "@/components/glass/GlassButton";
import { SportGradientButton } from "@/components/SportGradientButton";
import { PositionPickerModal } from "@/components/PositionPickerModal";
import { LiquidProgressBar } from "@/components/glass/LiquidProgressBar";
import { getSportIcon } from "@/components/icons/SportIcons";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, I18nManager, Linking, Modal,
  Platform, Pressable, ScrollView, Share, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Match } from "@/context/AppContext";

type ToastType = "success" | "error" | "warning";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

function Toast({ toast }: { toast: ToastState }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast.visible) {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [toast.visible]);

  const colors = useColors();
  const bgColor = toast.type === "success"
    ? colors.success
    : toast.type === "warning"
    ? colors.warning
    : colors.reliabilityLow;

  const iconName = toast.type === "success"
    ? "checkmark-circle"
    : toast.type === "warning"
    ? "warning"
    : "close-circle";

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  const opacity = anim;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bgColor, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Ionicons name={iconName} size={20} color="#fff" />
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );
}

export default function MatchDetailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matches, user, joinMatch, leaveMatch, cancelMatch, updateAttendance, updatePayment, createMatchInviteLink, removeMatchPlayer, refreshMatches } = useApp();
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "success" });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [apiMatch, setApiMatch] = useState<Match | null>(null);
  const [loadingApi, setLoadingApi] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [joiningLoading, setJoiningLoading] = useState(false);
  const [showAbsent, setShowAbsent] = useState(false);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const localMatch = matches.find((m) => m.id === id);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoadingApi(true);
    setLoadError(false);
    api.getMatch(id).then((res) => {
      const m = res.match;
      const players: MatchPlayer[] = (m.players ?? []).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        sports: [],
        sportProfiles: {},
        matchesPlayed: p.matchesPlayed ?? 0,
        reliability: p.reliability,
        badges: p.badges ?? [],
        rating: { artist: 0, rock: 0, bolt: 0 },
        attendance: p.attendance as AttendanceStatus,
        paymentStatus: p.paymentStatus as PaymentStatus,
        position: p.position,
      }));
      setApiMatch((prev) => ({
        id: m.id,
        title: m.title,
        sport: m.sport as Match["sport"],
        date: new Date(m.date),
        time: m.time,
        venue: m.venue,
        location: m.location,
        maxPlayers: m.maxPlayers,
        cost: m.cost,
        isPublic: m.isPublic,
        organizerId: m.organizerId,
        organizerName: m.organizerName,
        organizerReliability: m.organizerReliability,
        players,
        status: m.status as Match["status"],
        joinedByCurrentUser: m.joinedByCurrentUser ?? prev?.joinedByCurrentUser ?? localMatch?.joinedByCurrentUser ?? false,
        sessionType: m.sessionType,
        matchFormat: m.matchFormat,
        description: m.description,
        invitedGroupId: m.invitedGroupId,
        organizerPhone: m.organizerPhone ?? null,
        organizerPhoneFull: m.organizerPhoneFull ?? null,
      }));
    }).catch(() => {
      if (!localMatch) setLoadError(true);
    }).finally(() => setLoadingApi(false));
  }, [id]);

  const refetchMatch = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.getMatch(id);
      const m = res.match;
      const players: MatchPlayer[] = (m.players ?? []).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        sports: [],
        sportProfiles: {},
        matchesPlayed: p.matchesPlayed ?? 0,
        reliability: p.reliability,
        badges: p.badges ?? [],
        rating: { artist: 0, rock: 0, bolt: 0 },
        attendance: p.attendance as AttendanceStatus,
        paymentStatus: p.paymentStatus as PaymentStatus,
        position: p.position,
      }));
      setApiMatch((prev) => ({
        id: m.id,
        title: m.title,
        sport: m.sport as Match["sport"],
        date: new Date(m.date),
        time: m.time,
        venue: m.venue,
        location: m.location,
        maxPlayers: m.maxPlayers,
        cost: m.cost,
        isPublic: m.isPublic,
        organizerId: m.organizerId,
        organizerName: m.organizerName,
        organizerReliability: m.organizerReliability,
        players,
        status: m.status as Match["status"],
        joinedByCurrentUser: m.joinedByCurrentUser ?? prev?.joinedByCurrentUser ?? false,
        sessionType: m.sessionType,
        matchFormat: m.matchFormat,
        description: m.description,
        invitedGroupId: m.invitedGroupId,
        organizerPhone: m.organizerPhone ?? null,
        organizerPhoneFull: m.organizerPhoneFull ?? null,
      }));
    } catch {}
  }, [id]);

  const match = (apiMatch ?? localMatch) as Match | undefined;

  if (!match) {
    if (loadingApi) {
      return (
        <View style={[styles.loading, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (loadError) {
      return (
        <View style={[styles.loading, { backgroundColor: colors.background, gap: 16 }]}>
          <Ionicons name="wifi-outline" size={48} color={colors.mutedForeground} />
          <Text style={{ color: colors.onSurface, fontFamily: "Cairo_700Bold", fontSize: 16, textAlign: "center" }}>
            تعذّر تحميل بيانات المباراة
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Cairo_400Regular", fontSize: 13, textAlign: "center" }}>
            تحقق من اتصالك بالإنترنت وحاول مجدداً
          </Text>
          <Pressable
            style={{ borderRadius: 20, overflow: "hidden", backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: colors.primaryForeground, fontFamily: "Cairo_700Bold", fontSize: 14 }}>العودة</Text>
          </Pressable>
        </View>
      );
    }
    return null;
  }

  const currentUserId = user?.id ?? "";
  const sc = sportColor(match.sport, colors);
  const isOrganizer = match.organizerId === currentUserId;
  const isFull = match.players.length >= match.maxPlayers;
  const paidPlayers = match.players.filter((p) => p.paymentStatus === "paid").length;
  const costPerPlayer = match.cost;
  const totalMatchBudget = Math.round(match.maxPlayers * costPerPlayer * 100) / 100;
  const totalCollected = Math.round(paidPlayers * costPerPlayer * 100) / 100;
  const totalExpected = totalMatchBudget;

  const filledSlots = match.players.length;
  const availableSlots = match.maxPlayers - filledSlots;
  const progressPct = match.maxPlayers > 0 ? filledSlots / match.maxPlayers : 0;
  const collectedPct = totalExpected > 0 ? totalCollected / totalExpected : 0;

  const slotsColor = isFull
    ? colors.reliabilityLow
    : availableSlots <= 2
    ? colors.warning
    : colors.success;

  const progressBarColor = progressPct >= 1
    ? colors.success
    : progressPct >= 0.75
    ? colors.warning
    : sc;

  const SportIcon = getSportIcon(match.sport);
  const heroGradientColor = sc;

  const confirmedPlayers = match.players.filter((p) => p.attendance !== "absent");
  const pendingPlayers = match.players.filter((p) => p.attendance === "pending");
  const presentPlayers = match.players.filter((p) => p.attendance === "present");
  const absentPlayers = match.players.filter((p) => p.attendance === "absent");

  function showToast(message: string, type: ToastType = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message, type });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }

  async function handleShareMatch() {
    if (!match) return;
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const matchLink = domain ? `https://${domain}/api/match/${match.id}` : null;
    const shareText = matchLink
      ? `انضم معي في مباراة «${match.title}»\n📅 ${formatDate(match.date)} الساعة ${match.time}\n📍 ${match.venue}\n\n${matchLink}`
      : `انضم معي في مباراة «${match.title}»\n📅 ${formatDate(match.date)} الساعة ${match.time}\n📍 ${match.venue}\nحمّل تطبيق العب للانضمام`;
    try {
      await Share.share({ message: shareText, title: match.title });
    } catch {}
  }

  async function handleShareInviteLink() {
    if (!match) return;
    const token = await createMatchInviteLink(match.id);
    if (!token) {
      showToast("تعذّر إنشاء رابط الدعوة", "error");
      return;
    }
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const inviteLink = domain ? `https://${domain}/api/invite/${token}` : null;
    const shareText = inviteLink
      ? `دعوة للانضمام إلى مباراة «${match.title}»\n📅 ${formatDate(match.date)} الساعة ${match.time}\n📍 ${match.venue}\n\n${inviteLink}`
      : `دعوة للانضمام إلى مباراة «${match.title}»\n📅 ${formatDate(match.date)} الساعة ${match.time}\n📍 ${match.venue}\nحمّل تطبيق العب للانضمام`;
    try {
      await Share.share({ message: shareText, title: `دعوة: ${match.title}` });
    } catch {}
  }

  async function executeJoin(pos?: string) {
    if (!match) return;
    setJoiningLoading(true);
    const result = await joinMatch(match.id, pos);
    setJoiningLoading(false);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`تم تسجيلك في ${match.title} ✓`, "success");
      refetchMatch();
    } else if (result.alreadyJoined) {
      showToast("أنت مسجل بالفعل في هذه المباراة", "warning");
    } else if (result.isFull) {
      showToast("المباراة مكتملة، لا توجد أماكن متاحة", "error");
    } else if (result.conflict) {
      showToast(`تعارض في المواعيد مع: ${result.conflict.title}`, "warning");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  }

  function handleJoin() {
    if (!match) return;
    if (match.isPublic) {
      const posArr = user?.sportProfiles[match.sport]?.position ?? [];
      setSelectedPosition(posArr.length > 0 ? posArr[0] : null);
      setShowPositionPicker(true);
    } else {
      executeJoin();
    }
  }

  const organizerRelColor = reliabilityColor(match.organizerReliability, colors);

  const stickyFooterHeight = botPad + 76;

  return (
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      <View style={[styles.hero, { paddingTop: topPad + 8, backgroundColor: heroGradientColor }]}>
        <View style={styles.heroSpecular} pointerEvents="none" />

        <View style={styles.heroHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <View style={styles.backBtnInner}>
              <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={22} color="#fff" />
            </View>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {match.status === "completed" && (
              <GlassBadge label="منتهية" variant="success" size="sm" />
            )}
            {match.status === "cancelled" && (
              <GlassBadge label="ملغاة" variant="error" size="sm" />
            )}
            {(match.sport === "padel" || match.sport === "tennis") && match.matchFormat && (
              <GlassBadge
                label={match.matchFormat === "single" ? "فردي" : "مزدوج"}
                variant="default"
                size="sm"
              />
            )}
            <Pressable
              style={[styles.sportTag, { backgroundColor: "#ffffff25", flexDirection: "row", gap: 4 }]}
              onPress={handleShareMatch}
            >
              <Ionicons name="share-outline" size={14} color="#fff" />
              <Text style={styles.sportTagText}>شارك</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.heroTitleRow}>
          <View style={[styles.heroSportIconWrap, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
            <SportIcon color="#fff" size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.matchTitle} numberOfLines={2}>{match.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 2 }}>
              <Text style={[styles.sportTagText, { color: "rgba(255,255,255,0.85)", fontSize: 13 }]}>{sportLabel(match.sport)}</Text>
              {match.sessionType === "training" && (
                <View style={[styles.sessionBadge, { backgroundColor: "#ffffff22" }]}>
                  <Text style={styles.sessionBadgeText}>تدريب</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.heroMetaRow}>
          <HeroMetaBadge icon="time-outline" text={match.time} />
          <HeroMetaBadge icon="calendar-outline" text={formatDate(match.date)} />
          {match.location ? (
            <Pressable
              style={[styles.heroMetaBadge, styles.heroMetaBadgeMap]}
              onPress={() => Linking.openURL(match.location!)}
            >
              <Ionicons name="location" size={13} color="#fff" />
              <Text style={styles.heroMetaText} numberOfLines={1}>{match.venue}</Text>
              <Ionicons name="map-outline" size={12} color="#ffffff80" />
            </Pressable>
          ) : (
            <HeroMetaBadge icon="location-outline" text={match.venue} />
          )}
        </View>

        <View style={[styles.heroProgressWrap, { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 12, marginTop: 4 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[styles.heroSlotsIndicator, { backgroundColor: slotsColor }]} />
              <Text style={{ color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 13 }}>
                {isFull ? "مكتملة" : `${availableSlots} مكان متبقي`}
              </Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Cairo_600SemiBold", fontSize: 13 }}>
              {match.players.length}/{match.maxPlayers} لاعب
            </Text>
          </View>
          <LiquidProgressBar progress={progressPct} sport={match.sport} height={6} overrideColor={progressBarColor} />
        </View>

        <View style={styles.heroStatsBar}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNum}>{costPerPlayer > 0 ? `${costPerPlayer}` : "مجاني"}</Text>
            {costPerPlayer > 0 && <Text style={styles.heroStatLbl}>ر.س للفرد</Text>}
            {costPerPlayer === 0 && <Text style={styles.heroStatLbl}>الدخول</Text>}
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNum}>{paidPlayers}</Text>
            <Text style={styles.heroStatLbl}>دفعوا</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNum}>{match.players.filter((p) => p.attendance === "present").length}</Text>
            <Text style={styles.heroStatLbl}>حضروا</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scroll, { paddingBottom: stickyFooterHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {match.location ? (
          <GlassCard variant="medium" sport={match.sport}>
            <View style={[styles.sectionHeader, { marginBottom: 10 }]}>
              <Ionicons name="map-outline" size={18} color={sc} />
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>الموقع</Text>
            </View>
            <Pressable
              style={[styles.openLocationBtn, { backgroundColor: sc + "18", borderColor: sc + "30" }]}
              onPress={() => Linking.openURL(match.location!)}
            >
              <Ionicons name="location" size={20} color={sc} />
              <Text style={[styles.openLocationText, { color: sc }]}>📍 افتح الموقع</Text>
              <Ionicons name="open-outline" size={16} color={sc + "99"} />
            </Pressable>
          </GlassCard>
        ) : null}

        {match.description ? (
          <GlassCard variant="medium" sport={match.sport}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={18} color={sc} />
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>الوصف</Text>
            </View>
            <Text style={[styles.descriptionText, { color: colors.onSurfaceVariant }]}>{match.description}</Text>
          </GlassCard>
        ) : null}

        <GlassCard variant="medium" sport={match.sport}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={18} color={sc} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>المنظّم</Text>
          </View>
          <View style={[styles.organizerRow, { marginTop: 8 }]}>
            <View style={[styles.avatarMed, { backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[styles.avatarInitial, { color: sc }]}>
                {match.organizerName.charAt(0)}
              </Text>
            </View>
            <View style={{ gap: 5, flex: 1, alignItems: "flex-end" }}>
              <Text style={[styles.organizerName, { color: colors.onSurface }]}>{match.organizerName}</Text>
              <View style={[styles.relBadgeRow, { backgroundColor: organizerRelColor + "20" }]}>
                <Ionicons name="shield-checkmark-outline" size={12} color={organizerRelColor} />
                <Text style={[styles.relText, { color: organizerRelColor }]}>
                  {formatReliability(match.organizerReliability)} · {reliabilityLabel(match.organizerReliability)}
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.contactBtn, { backgroundColor: sc + "20" }]}
              onPress={() => setContactSheetVisible(true)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={sc} />
            </Pressable>
          </View>
        </GlassCard>

        {!isOrganizer && match.joinedByCurrentUser && costPerPlayer > 0 ? (
          <GlassCard variant="medium" sport={match.sport}>
            <View style={styles.sectionHeader}>
              <Ionicons name="wallet-outline" size={18} color={sc} />
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>الغطّة</Text>
            </View>
            {(() => {
              const myPayment = match.players.find((p) => p.id === currentUserId)?.paymentStatus;
              const isPaid = myPayment === "paid";
              return (
                <>
                  <View style={[styles.playerShareBox, { backgroundColor: isPaid ? "#22C55E12" : "#EEF2FF", marginTop: 8, borderWidth: 1, borderColor: isPaid ? "#22C55E30" : "#E5E7EB" }]}>
                    <Ionicons name={isPaid ? "checkmark-circle" : "cash-outline"} size={28} color={isPaid ? "#22C55E" : sc} />
                    <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                      <Text style={[styles.playerShareLabel, { color: colors.mutedForeground }]}>نصيبك من الغطّة</Text>
                      <Text style={[styles.playerShareAmount, { color: isPaid ? "#22C55E" : colors.onSurface }]}>{costPerPlayer} <Text style={{ fontSize: 14, color: colors.mutedForeground }}>ر.س</Text></Text>
                    </View>
                    <View style={[styles.gattaStatusPill, { backgroundColor: isPaid ? "#22C55E" : "#F59E0B" }]}>
                      <Text style={styles.gattaStatusPillText}>{isPaid ? "دفعت ✓" : "لم تدفع"}</Text>
                    </View>
                  </View>
                  {!isPaid && (
                    <View style={[styles.playerShareStatusRow, { backgroundColor: "#FEF9C3", borderWidth: 1, borderColor: "#FCD34D" }]}>
                      <Ionicons name="information-circle-outline" size={16} color="#D97706" />
                      <Text style={[styles.playerShareStatusText, { color: "#D97706" }]}>
                        تواصل مع المنظّم لتأكيد دفع حصتك
                      </Text>
                    </View>
                  )}
                </>
              );
            })()}
          </GlassCard>
        ) : null}

        <GlassCard variant="medium" sport={match.sport}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={18} color={colors.onSurface} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              اللاعبون ({match.players.length}/{match.maxPlayers})
            </Text>
          </View>

          <LiquidProgressBar progress={progressPct} sport={match.sport} height={8} overrideColor={progressBarColor} />

          {presentPlayers.length > 0 && (
            <View style={styles.playerGroup}>
              <View style={styles.playerGroupHeader}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.playerGroupLabel, { color: colors.success }]}>سيلعبون ({presentPlayers.length})</Text>
              </View>
              {presentPlayers.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isOrganizer={false}
                  isCurrentUser={player.id === currentUserId}
                  isOrganizerPlayer={player.id === match.organizerId}
                  sportColor={sc}
                  onToggleAttendance={() => {}}
                  onTogglePayment={() => {}}
                  onRemovePlayer={() => {}}
                />
              ))}
            </View>
          )}

          {pendingPlayers.length > 0 && (
            <View style={styles.playerGroup}>
              <View style={styles.playerGroupHeader}>
                <Ionicons name="time-outline" size={14} color={colors.warning} />
                <Text style={[styles.playerGroupLabel, { color: colors.warning }]}>بانتظار التأكيد ({pendingPlayers.length})</Text>
              </View>
              {pendingPlayers.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isOrganizer={false}
                  isCurrentUser={player.id === currentUserId}
                  isOrganizerPlayer={player.id === match.organizerId}
                  sportColor={sc}
                  onToggleAttendance={() => {}}
                  onTogglePayment={() => {}}
                  onRemovePlayer={() => {}}
                />
              ))}
            </View>
          )}

          {presentPlayers.length === 0 && pendingPlayers.length === 0 && match.players.filter((p) => p.attendance !== "absent").length > 0 && (
            <View style={styles.playerGroup}>
              {match.players.filter((p) => p.attendance !== "absent").map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isOrganizer={false}
                  isCurrentUser={player.id === currentUserId}
                  isOrganizerPlayer={player.id === match.organizerId}
                  sportColor={sc}
                  onToggleAttendance={() => {}}
                  onTogglePayment={() => {}}
                  onRemovePlayer={() => {}}
                />
              ))}
            </View>
          )}

          {absentPlayers.length > 0 && (
            <View style={styles.playerGroup}>
              <Pressable style={styles.playerGroupHeader} onPress={() => setShowAbsent((v) => !v)}>
                <Ionicons name="close-circle" size={14} color={colors.destructive} />
                <Text style={[styles.playerGroupLabel, { color: colors.destructive, flex: 1 }]}>غائبون ({absentPlayers.length})</Text>
                <Ionicons name={showAbsent ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
              </Pressable>
              {showAbsent && absentPlayers.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isOrganizer={false}
                  isCurrentUser={player.id === currentUserId}
                  isOrganizerPlayer={player.id === match.organizerId}
                  sportColor={sc}
                  onToggleAttendance={() => {}}
                  onTogglePayment={() => {}}
                  onRemovePlayer={() => {}}
                />
              ))}
            </View>
          )}

          {match.players.length === 0 && (
            <Text style={[styles.noPlayersText, { color: colors.mutedForeground }]}>
              لا يوجد لاعبون مسجلون بعد
            </Text>
          )}
          {availableSlots > 0 && match.players.length > 0 && (
            <View style={[styles.emptySlots, { backgroundColor: slotsColor + "12", borderRadius: 14, borderWidth: 1, borderColor: slotsColor + "25" }]}>
              <Ionicons name="person-add-outline" size={18} color={slotsColor} />
              <Text style={[styles.emptySlotsText, { color: slotsColor }]}>
                {availableSlots} مكان متبقي
              </Text>
            </View>
          )}
        </GlassCard>

        {isOrganizer && (
          <GlassCard variant="sport" sport={match.sport} style={styles.organizerToolsSection}>
            <View style={styles.organizerToolsHeader}>
              <Ionicons name="shield-checkmark" size={16} color={sc} />
              <Text style={[styles.organizerToolsTitle, { color: sc }]}>أدوات المنظّم</Text>
            </View>

            {match.status !== "completed" && match.status !== "cancelled" && (
              <GlassCard variant="light" sport={match.sport}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="wallet-outline" size={18} color={sc} />
                  <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>مراقبة المدفوعات</Text>
                </View>
                <View style={[styles.gattaBox, { backgroundColor: colors.surfaceContainer, marginTop: 8 }]}>
                  <View style={styles.gattaRow}>
                    <Text style={[styles.gattaVal, { color: colors.success }]}>{totalCollected}</Text>
                    <Text style={[styles.gattaUnit, { color: colors.success }]}>ر.س</Text>
                    <Text style={[styles.gattaLbl, { color: colors.mutedForeground }]}>تم جمعه</Text>
                  </View>
                  <View style={[styles.gattaDivider, { backgroundColor: colors.onSurface + "10" }]} />
                  <View style={styles.gattaRow}>
                    <Text style={[styles.gattaVal, { color: colors.onSurface }]}>{totalExpected}</Text>
                    <Text style={[styles.gattaUnit, { color: colors.mutedForeground }]}>ر.س</Text>
                    <Text style={[styles.gattaLbl, { color: colors.mutedForeground }]}>الإجمالي</Text>
                  </View>
                  <View style={[styles.gattaDivider, { backgroundColor: colors.onSurface + "10" }]} />
                  <View style={styles.gattaRow}>
                    <Text style={[styles.gattaVal, { color: colors.tertiary }]}>{Math.round((totalExpected - totalCollected) * 100) / 100}</Text>
                    <Text style={[styles.gattaUnit, { color: colors.tertiary }]}>ر.س</Text>
                    <Text style={[styles.gattaLbl, { color: colors.mutedForeground }]}>متبقي</Text>
                  </View>
                </View>
                <View style={styles.progressBarWrap}>
                  <LiquidProgressBar progress={collectedPct} sport={match.sport} height={8} />
                  <Text style={[styles.progressPct, { color: colors.mutedForeground }]}>
                    {Math.round(totalCollected)} من {Math.round(totalExpected)} ر.س
                  </Text>
                </View>
              </GlassCard>
            )}

            <GlassCard variant="light" sport={match.sport}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={18} color={sc} />
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                  إدارة اللاعبين
                </Text>
              </View>
              {match.players.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isOrganizer={isOrganizer}
                  isCurrentUser={player.id === currentUserId}
                  isOrganizerPlayer={player.id === match.organizerId}
                  sportColor={sc}
                  onToggleAttendance={(status) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const prevApiMatch = apiMatch;
                    setApiMatch((prev) =>
                      prev
                        ? { ...prev, players: prev.players.map((p) => p.id === player.id ? { ...p, attendance: status } : p) }
                        : prev
                    );
                    updateAttendance(match.id, player.id, status).then((ok) => {
                      if (ok) {
                        refetchMatch();
                      } else {
                        setApiMatch(prevApiMatch);
                      }
                    });
                  }}
                  onTogglePayment={(status) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const prevApiMatch = apiMatch;
                    setApiMatch((prev) =>
                      prev
                        ? { ...prev, players: prev.players.map((p) => p.id === player.id ? { ...p, paymentStatus: status } : p) }
                        : prev
                    );
                    updatePayment(match.id, player.id, status).then((ok) => {
                      if (ok) {
                        refetchMatch();
                      } else {
                        setApiMatch(prevApiMatch);
                      }
                    });
                  }}
                  onRemovePlayer={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(
                      "إزالة لاعب",
                      `هل أنت متأكد من إزالة "${player.nickname}" من المباراة؟`,
                      [
                        { text: "تراجع", style: "cancel" },
                        {
                          text: "إزالة", style: "destructive", onPress: async () => {
                            const prevApiMatch = apiMatch;
                            setApiMatch((prev) =>
                              prev ? { ...prev, players: prev.players.filter((p) => p.id !== player.id) } : prev
                            );
                            const ok = await removeMatchPlayer(match.id, player.id);
                            if (ok) {
                              showToast(`تم إزالة ${player.nickname}`, "success");
                              refetchMatch();
                            } else {
                              setApiMatch(prevApiMatch);
                              showToast("تعذّر إزالة اللاعب، حاول مجدداً", "error");
                            }
                          },
                        },
                      ]
                    );
                  }}
                />
              ))}
              {match.players.length === 0 && (
                <Text style={[styles.noPlayersText, { color: colors.mutedForeground }]}>
                  لا يوجد لاعبون مسجلون بعد
                </Text>
              )}
            </GlassCard>

            {match.status !== "completed" && match.status !== "cancelled" && (
              <>
                <GlassButton
                  label="مشاركة رابط دعوة"
                  sport={match.sport}
                  onPress={handleShareInviteLink}
                  size="sm"
                />
                <Pressable
                  style={[styles.organizerActionBtn, { backgroundColor: "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)", borderRadius: 100 }]}
                  onPress={() => {
                    Alert.alert(
                      `إلغاء المباراة`,
                      `هل أنت متأكد من إلغاء هذه المباراة؟ لن يتمكن اللاعبون من الانضمام بعد الإلغاء.`,
                      [
                        { text: "تراجع", style: "cancel" },
                        {
                          text: "إلغاء المباراة", style: "destructive", onPress: async () => {
                            const ok = await cancelMatch(match.id);
                            if (ok) {
                              router.back();
                            } else {
                              showToast("تعذّر إلغاء المباراة، حاول مجدداً", "error");
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <View style={styles.organizerActionBtnInner}>
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    <Text style={[styles.organizerActionBtnText, { color: colors.destructive }]}>إلغاء المباراة</Text>
                  </View>
                </Pressable>
              </>
            )}
          </GlassCard>
        )}
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: botPad + 10, backgroundColor: colors.background }]}>
        {match.status === "cancelled" ? (
          <Pressable style={[styles.footerBtn, { overflow: "hidden" }]} disabled>
            <View style={[styles.footerBtnGradient, { backgroundColor: colors.reliabilityLow + "15" }]}>
              <Ionicons name="close-circle-outline" size={20} color={colors.reliabilityLow} />
              <Text style={[styles.footerBtnText, { color: colors.reliabilityLow }]}>تم إلغاء المباراة</Text>
            </View>
          </Pressable>
        ) : match.status === "completed" ? (
          <SportGradientButton
            label="تقييم اللاعبين"
            gradientStart={colors.primary}
            gradientEnd={colors.primaryContainer}
            onPress={() => router.push({ pathname: "/post-match-rating", params: { id: match.id } })}
            style={styles.footerBtnFull}
          />
        ) : match.joinedByCurrentUser && !isOrganizer ? (
          <Pressable
            style={[styles.footerBtn, styles.footerBtnLeave, { backgroundColor: colors.surfaceContainerLow }]}
            onPress={() => {
              Alert.alert(
                `مغادرة المباراة`,
                `هل أنت متأكد من مغادرة المباراة؟`,
                [
                  { text: "إلغاء", style: "cancel" },
                  {
                    text: "مغادرة", style: "destructive", onPress: async () => {
                      await leaveMatch(match.id);
                      if (apiMatch) setApiMatch((prev) => prev ? { ...prev, joinedByCurrentUser: false } : prev);
                      router.back();
                    },
                  },
                ]
              );
            }}
          >
            <View style={styles.footerBtnGradient}>
              <Ionicons name="exit-outline" size={20} color={colors.destructive} />
              <Text style={[styles.footerBtnText, { color: colors.destructive }]}>مغادرة المباراة</Text>
            </View>
          </Pressable>
        ) : isOrganizer ? (
          <Pressable
            style={[styles.footerBtn, { overflow: "hidden", backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: "/manage-match", params: { id: match.id } })}
          >
            <View style={styles.footerBtnGradient}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primaryForeground} />
              <Text style={[styles.footerBtnText, { color: colors.primaryForeground }]}>إدارة المباراة</Text>
            </View>
          </Pressable>
        ) : isFull ? (
          <Pressable style={[styles.footerBtn, { overflow: "hidden" }]} disabled>
            <View style={[styles.footerBtnGradient, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} />
              <Text style={[styles.footerBtnText, { color: colors.mutedForeground }]}>المباراة مكتملة</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable style={[styles.footerBtn, { overflow: "hidden", backgroundColor: colors.accent }]} onPress={handleJoin}>
            <View style={[styles.footerBtnGradient, styles.footerBtnGradientJoin]}>
              <Ionicons name="add-circle" size={24} color={colors.accentForeground} />
              <Text style={[styles.footerBtnText, styles.footerBtnTextJoin, { color: colors.accentForeground }]}>
                {costPerPlayer > 0 ? `انضم الآن · ${costPerPlayer} ر.س` : `انضم للمباراة`}
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      <Toast toast={toast} />

      {match && (
        <PositionPickerModal
          visible={showPositionPicker}
          sport={match.sport}
          sportAccentColor={sc}
          matchFormat={match.matchFormat}
          initialPosition={selectedPosition}
          loading={joiningLoading}
          onClose={() => setShowPositionPicker(false)}
          onConfirm={(position) => {
            setShowPositionPicker(false);
            executeJoin(position);
          }}
        />
      )}

      <Modal
        visible={contactSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContactSheetVisible(false)}
      >
        <Pressable
          style={styles.contactOverlay}
          onPress={() => setContactSheetVisible(false)}
        >
          <Pressable
            style={[styles.contactSheet, { backgroundColor: colors.surfaceContainer }]}
            onPress={() => {}}
          >
            <View style={[styles.contactSheetHandle, { backgroundColor: colors.mutedForeground + "40" }]} />

            <View style={[styles.contactOrganizerRow]}>
              <View style={[styles.avatarMed, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.avatarInitial, { color: sc }]}>
                  {match.organizerName.charAt(0)}
                </Text>
              </View>
              <View style={{ gap: 5, flex: 1, alignItems: "flex-end" }}>
                <Text style={[styles.organizerName, { color: colors.onSurface }]}>{match.organizerName}</Text>
                <View style={[styles.relBadgeRow, { backgroundColor: organizerRelColor + "20" }]}>
                  <Ionicons name="shield-checkmark-outline" size={12} color={organizerRelColor} />
                  <Text style={[styles.relText, { color: organizerRelColor }]}>
                    {formatReliability(match.organizerReliability)} · {reliabilityLabel(match.organizerReliability)}
                  </Text>
                </View>
              </View>
            </View>

            {match.organizerPhone ? (
              <View style={{ gap: 10 }}>
                <Pressable
                  style={[styles.contactActionBtn, { backgroundColor: "#25D366" }]}
                  onPress={async () => {
                    const phone = (match.organizerPhoneFull ?? match.organizerPhone ?? "").replace(/[^0-9]/g, "");
                    await Linking.openURL(`https://wa.me/${phone}`);
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="rgba(255,255,255,1)" />
                  <Text style={styles.contactActionBtnText}>تواصل عبر واتساب</Text>
                </Pressable>

                <Pressable
                  style={[styles.contactActionBtn, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    const phone = match.organizerPhoneFull ?? match.organizerPhone ?? "";
                    await Clipboard.setStringAsync(phone);
                    setContactSheetVisible(false);
                    showToast("تم نسخ الرقم", "success");
                  }}
                >
                  <Ionicons name="copy-outline" size={20} color={colors.primaryForeground} />
                  <Text style={styles.contactActionBtnText}>نسخ الرقم ({match.organizerPhone})</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.contactNoPhone, { backgroundColor: colors.surfaceContainerLow }]}>
                <Ionicons name="phone-portrait-outline" size={22} color={colors.mutedForeground} />
                <Text style={[styles.contactNoPhoneText, { color: colors.mutedForeground }]}>
                  المنظّم لم يشارك رقمه
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function HeroMetaBadge({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.heroMetaBadge}>
      <Ionicons name={icon} size={13} color="#ffffffCC" />
      <Text style={styles.heroMetaText}>{text}</Text>
    </View>
  );
}

function PlayerRow({
  player, isOrganizer, isCurrentUser, isOrganizerPlayer, sportColor: sc, onToggleAttendance, onTogglePayment, onRemovePlayer,
}: {
  player: MatchPlayer;
  isOrganizer: boolean;
  isCurrentUser: boolean;
  isOrganizerPlayer: boolean;
  sportColor: string;
  onToggleAttendance: (s: "present" | "absent" | "pending") => void;
  onTogglePayment: (s: "paid" | "pending") => void;
  onRemovePlayer: () => void;
}) {
  const colors = useColors();
  const relColor = reliabilityColor(player.reliability, colors);

  const attendanceColor =
    player.attendance === "present"
      ? colors.success
      : player.attendance === "absent"
      ? colors.destructive
      : colors.warning;

  const attendanceBg =
    player.attendance === "present"
      ? colors.success + "18"
      : player.attendance === "absent"
      ? colors.destructive + "18"
      : colors.warning + "18";

  const attendanceLabel =
    player.attendance === "present" ? "حضر" : player.attendance === "absent" ? "غاب" : "معلق";

  const attendanceIcon: keyof typeof Ionicons.glyphMap =
    player.attendance === "present"
      ? "checkmark-circle"
      : player.attendance === "absent"
      ? "close-circle"
      : "time-outline";

  const nextAttendance: AttendanceStatus =
    player.attendance === "present"
      ? "absent"
      : player.attendance === "absent"
      ? "pending"
      : "present";

  const canRemove = isOrganizer && !isOrganizerPlayer;

  return (
    <View
      style={[
        styles.playerRow,
        { backgroundColor: colors.surfaceContainerLowest ?? colors.surfaceContainerLow, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <View style={[styles.playerAvatar, { backgroundColor: sc + "25" }]}>
        <Text style={[styles.playerInitial, { color: sc }]}>{player.nickname.charAt(0)}</Text>
        {formatReliability(player.reliability, player.matchesPlayed) !== "—" && (
          <View style={[styles.reliabilityBadge, { backgroundColor: relColor }]}>
            <Text style={styles.reliabilityBadgeText}>{formatReliability(player.reliability, player.matchesPlayed)}</Text>
          </View>
        )}
      </View>

      <View style={styles.playerInfo}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          <Text style={[styles.playerName, { color: colors.onSurface }]}>{player.nickname}</Text>
          {isOrganizerPlayer && (
            <View style={[styles.organizerTag, { backgroundColor: sc + "20" }]}>
              <Text style={[styles.organizerTagText, { color: sc }]}>منظّم</Text>
            </View>
          )}
          {isCurrentUser && (
            <View style={[styles.organizerTag, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.organizerTagText, { color: colors.primary }]}>أنت</Text>
            </View>
          )}
        </View>
        {player.position ? (
          <Text style={[styles.playerPos, { color: colors.mutedForeground }]}>{player.position}</Text>
        ) : null}
      </View>

      {isOrganizer ? (
        <View style={styles.organizerControls}>
          <Pressable
            style={[
              styles.glassPill,
              { backgroundColor: player.paymentStatus === "paid" ? colors.success + "18" : colors.surfaceContainerLow, borderColor: player.paymentStatus === "paid" ? colors.success + "40" : colors.border },
            ]}
            onPress={() => onTogglePayment(player.paymentStatus === "paid" ? "pending" : "paid")}
          >
            <Ionicons
              name={player.paymentStatus === "paid" ? "cash" : "ellipse-outline"}
              size={14}
              color={player.paymentStatus === "paid" ? colors.success : colors.mutedForeground}
            />
            <Text style={[styles.glassPillText, { color: player.paymentStatus === "paid" ? colors.success : colors.mutedForeground }]}>
              {player.paymentStatus === "paid" ? "دفع" : "لم يدفع"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.glassPill, { backgroundColor: attendanceBg, borderColor: attendanceColor + "30" }]}
            onPress={() => onToggleAttendance(nextAttendance)}
          >
            <Ionicons name={attendanceIcon} size={14} color={attendanceColor} />
            <Text style={[styles.glassPillText, { color: attendanceColor }]}>{attendanceLabel}</Text>
          </Pressable>
          {canRemove && (
            <Pressable
              style={[styles.glassPill, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}
              onPress={onRemovePlayer}
            >
              <Ionicons name="person-remove-outline" size={13} color={colors.destructive} />
              <Text style={[styles.glassPillText, { color: colors.destructive }]}>إزالة</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.organizerControls}>
          <View
            style={[
              styles.glassPill,
              { backgroundColor: player.paymentStatus === "paid" ? colors.success + "18" : colors.surfaceContainerLow, borderColor: player.paymentStatus === "paid" ? colors.success + "40" : colors.border },
            ]}
          >
            <Ionicons
              name={player.paymentStatus === "paid" ? "cash" : "ellipse-outline"}
              size={13}
              color={player.paymentStatus === "paid" ? colors.success : colors.mutedForeground}
            />
            <Text style={[styles.glassPillText, { color: player.paymentStatus === "paid" ? colors.success : colors.mutedForeground }]}>
              {player.paymentStatus === "paid" ? "دفع" : "لم يدفع"}
            </Text>
          </View>
          <View style={[styles.glassPill, { backgroundColor: attendanceBg, borderColor: attendanceColor + "30" }]}>
            <Ionicons name={attendanceIcon} size={13} color={attendanceColor} />
            <Text style={[styles.glassPillText, { color: attendanceColor }]}>{attendanceLabel}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  heroSpecular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  heroHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  backBtn: { padding: 4 },
  backBtnInner: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#ffffff25",
    alignItems: "center", justifyContent: "center",
  },
  heroTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, justifyContent: "flex-end" },
  heroSportIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  sessionBadgeText: { color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 11 },

  sportTag: { flexDirection: "row", gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 24, alignItems: "center" },
  sportTagText: { fontSize: 12, fontFamily: "Cairo_700Bold", color: "#fff" },
  matchTitle: { fontSize: 22, fontFamily: "Cairo_700Bold", color: "#fff", textAlign: "right", lineHeight: 34 },

  heroMetaRow: { flexDirection: "row", gap: 8, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" },
  heroMetaBadge: {
    flexDirection: "row", gap: 4, alignItems: "center",
    backgroundColor: "#ffffff18", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  heroMetaBadgeMap: { flex: 1, maxWidth: 160 },
  heroMetaText: { fontSize: 12, color: "#fff", fontFamily: "Cairo_400Regular" },

  heroProgressWrap: { gap: 0 },
  heroSlotsIndicator: { width: 8, height: 8, borderRadius: 4 },

  heroStatsBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    backgroundColor: "#ffffff15", borderRadius: 18, padding: 10, marginTop: 2,
  },
  heroStatItem: { alignItems: "center", gap: 2, flex: 1 },
  heroStatNum: { fontSize: 18, fontFamily: "Cairo_700Bold", color: "#fff" },
  heroStatLbl: { fontSize: 11, fontFamily: "Cairo_400Regular", color: "#ffffffCC" },
  heroStatDivider: { width: 1, height: 30, backgroundColor: "#ffffff30" },
  heroFillDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },

  heroSlotsBox: {
    flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 12, borderWidth: 1,
    marginHorizontal: 4,
  },
  heroSlotsNum: { fontSize: 20, fontFamily: "Cairo_700Bold" },
  heroSlotsLbl: { fontSize: 10, fontFamily: "Cairo_400Regular", color: "#ffffffCC" },

  scroll: { paddingHorizontal: 16, gap: 14, paddingTop: 14 },

  section: { borderRadius: 24, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "flex-end" },
  sectionTitle: { fontSize: 17, fontFamily: "Cairo_700Bold", lineHeight: 26 },

  openLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  openLocationText: { fontSize: 16, fontFamily: "Cairo_700Bold" },

  descriptionText: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "right", lineHeight: 22 },

  organizerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  organizerName: { fontSize: 16, fontFamily: "Cairo_700Bold", textAlign: "right", lineHeight: 26 },
  relBadgeRow: { flexDirection: "row", gap: 4, alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 24 },
  relText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  avatarMed: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 22, fontFamily: "Cairo_700Bold" },
  contactBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },

  gattaBox: { flexDirection: "row", borderRadius: 16, padding: 14, alignItems: "center" },
  gattaRow: { flex: 1, alignItems: "center", gap: 2 },
  gattaVal: { fontSize: 18, fontFamily: "Cairo_700Bold" },
  gattaUnit: { fontSize: 11, fontFamily: "Cairo_400Regular", marginTop: -2 },
  gattaLbl: { fontSize: 11, fontFamily: "Cairo_400Regular", marginTop: 2 },
  gattaDivider: { width: 1, height: 40, marginHorizontal: 4 },

  playerShareBox: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 16,
  },
  playerShareLabel: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  playerShareAmount: { fontSize: 24, fontFamily: "Cairo_700Bold" },
  gattaStatusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  gattaStatusPillText: { color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 12 },
  playerShareStatusRow: {
    flexDirection: "row", alignItems: "center",
    gap: 6, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    marginTop: 8,
  },
  playerShareStatusText: { fontSize: 13, fontFamily: "Cairo_700Bold", flex: 1, textAlign: "right" },

  progressBarWrap: { gap: 6 },
  progressBarBg: { height: 8, borderRadius: 8, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 8 },
  progressPct: { fontSize: 11, fontFamily: "Cairo_600SemiBold", textAlign: "right" },

  playersProgressBarBg: { height: 6, borderRadius: 6, overflow: "hidden", marginBottom: 4 },
  playersProgressBarFill: { height: "100%", borderRadius: 6 },

  playerGroup: { gap: 4 },
  playerGroupHeader: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-end", marginBottom: 4, paddingRight: 4 },
  playerGroupLabel: { fontSize: 13, fontFamily: "Cairo_700Bold" },

  playerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6, padding: 12 },
  playerAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", position: "relative" },
  playerInitial: { fontSize: 19, fontFamily: "Cairo_700Bold" },
  reliabilityBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#fff",
  },
  reliabilityBadgeText: { fontSize: 8, fontFamily: "Cairo_700Bold", color: "#fff" },
  playerInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  playerName: { fontSize: 14, fontFamily: "Cairo_700Bold" },
  playerPos: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  organizerTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  organizerTagText: { fontSize: 10, fontFamily: "Cairo_700Bold" },
  relPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 24 },
  relPillText: { fontSize: 11, fontFamily: "Cairo_700Bold" },

  organizerControls: { flexDirection: "column", gap: 5, alignItems: "flex-end" },
  glassPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100,
    borderWidth: 1,
  },
  glassPillText: { fontSize: 11, fontFamily: "Cairo_700Bold" },

  noPlayersText: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "center", paddingVertical: 10, lineHeight: 20 },
  emptySlots: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  emptySlotsText: { fontSize: 14, fontFamily: "Cairo_400Regular" },

  organizerToolsSection: {
    gap: 12,
  },
  organizerToolsHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "flex-end",
    paddingBottom: 4,
  },
  organizerToolsTitle: { fontSize: 15, fontFamily: "Cairo_700Bold" },

  organizerActionBtn: { borderRadius: 18 },
  organizerActionBtnInner: { paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  organizerActionBtnText: { fontSize: 15, fontFamily: "Cairo_700Bold" },

  stickyFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 8 },
      web: { boxShadow: "0px -2px 12px rgba(0,0,0,0.07)" },
    }),
  },
  footer: { paddingHorizontal: 16, paddingTop: 10 },
  footerBtn: { borderRadius: 24 },
  footerBtnFull: { alignSelf: "stretch" as const },
  footerBtnLeave: { overflow: "hidden" },
  footerBtnGradient: { paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  footerBtnGradientJoin: { paddingVertical: 18 },
  footerBtnText: { fontSize: 17, fontFamily: "Cairo_700Bold" },
  footerBtnTextJoin: { fontSize: 18 },

  toast: {
    position: "absolute", bottom: 110, left: 20, right: 20,
    borderRadius: 20, paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, zIndex: 999,
    ...Platform.select({
      ios: { shadowColor: "rgba(0,0,0,0.6)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: "0px 4px 16px rgba(0,0,0,0.15)" },
    }),
  },
  toastText: { color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 14, textAlign: "center", flex: 1 },

  contactOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  contactSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, gap: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 12 },
      web: { boxShadow: "0px -4px 20px rgba(0,0,0,0.12)" },
    }),
  },
  contactSheetHandle: { width: 44, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  contactOrganizerRow: { flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "flex-end" },
  contactActionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 15, borderRadius: 20,
  },
  contactActionBtnText: { color: "rgba(255,255,255,1)", fontFamily: "Cairo_700Bold", fontSize: 16 },
  contactNoPhone: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 20, borderRadius: 16,
  },
  contactNoPhoneText: { fontFamily: "Cairo_400Regular", fontSize: 14 },
});
