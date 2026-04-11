import {
  useApp, MatchPlayer, sportColor, sportLabel, formatDate,
  reliabilityColor, formatReliability, AttendanceStatus, PaymentStatus,
} from "@/context/AppContext";
import { api } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { SurfaceCard } from "@/components/SurfaceCard";
import { LiquidProgressBar } from "@/components/glass/LiquidProgressBar";
import { getSportIcon } from "@/components/icons/SportIcons";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback, useEffect, useRef, useState,
} from "react";
import {
  ActivityIndicator, Alert, Animated, FlatList, I18nManager, PanResponder,
  Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Match } from "@/context/AppContext";

type Tab = "players" | "gatta" | "settings";

type ToastType = "success" | "error" | "warning";
interface ToastState { visible: boolean; message: string; type: ToastType }

function Toast({ toast }: { toast: ToastState }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (toast.visible) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [toast.visible]);
  const colors = useColors();
  const bgColor = toast.type === "success" ? colors.success : toast.type === "warning" ? colors.warning : colors.reliabilityLow;
  const iconName = toast.type === "success" ? "checkmark-circle" : toast.type === "warning" ? "warning" : "close-circle";
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  return (
    <Animated.View
      style={[styles.toast, { backgroundColor: bgColor, opacity: anim, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Ionicons name={iconName} size={20} color="#fff" />
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );
}

function SwipeablePlayerRow({
  player, sc, isOrganizerPlayer,
  onToggleAttendance, onTogglePayment, onRemovePlayer,
}: {
  player: MatchPlayer;
  sc: string;
  isOrganizerPlayer: boolean;
  onToggleAttendance: (s: AttendanceStatus) => void;
  onTogglePayment: (s: PaymentStatus) => void;
  onRemovePlayer: () => void;
}) {
  const colors = useColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeDirRef = useRef<"left" | "right" | null>(null);

  const REVEAL_THRESHOLD = 60;
  const SNAP_RIGHT = 90;
  const SNAP_LEFT = -130;

  const closeSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    swipeDirRef.current = null;
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 30,
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderGrant: () => { translateX.stopAnimation(); },
      onPanResponderMove: (_, gs) => {
        const base = swipeDirRef.current === "right" ? SNAP_RIGHT : swipeDirRef.current === "left" ? SNAP_LEFT : 0;
        const newVal = Math.min(100, Math.max(-160, gs.dx + base));
        translateX.setValue(newVal);
      },
      onPanResponderRelease: (_, gs) => {
        const base = swipeDirRef.current === "right" ? SNAP_RIGHT : swipeDirRef.current === "left" ? SNAP_LEFT : 0;
        const current = gs.dx + base;
        if (current > REVEAL_THRESHOLD) {
          Animated.spring(translateX, { toValue: SNAP_RIGHT, useNativeDriver: true }).start();
          swipeDirRef.current = "right";
        } else if (current < -REVEAL_THRESHOLD) {
          Animated.spring(translateX, { toValue: SNAP_LEFT, useNativeDriver: true }).start();
          swipeDirRef.current = "left";
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          swipeDirRef.current = null;
        }
      },
    })
  ).current;

  const relColor = reliabilityColor(player.reliability, colors);

  const attendanceColor = player.attendance === "present" ? colors.success
    : player.attendance === "absent" ? colors.destructive
    : colors.mutedForeground;
  const attendanceBg = player.attendance === "present" ? colors.success + "18"
    : player.attendance === "absent" ? colors.destructive + "18"
    : colors.surfaceContainerLow;
  const attendanceLabel = player.attendance === "present" ? "حضر"
    : player.attendance === "absent" ? "غاب" : "معلق";
  const attendanceIcon: keyof typeof Ionicons.glyphMap = player.attendance === "present"
    ? "checkmark-circle" : player.attendance === "absent" ? "close-circle" : "time-outline";

  return (
    <View style={styles.swipeContainer}>
      <View style={[styles.swipeActionsRight, { backgroundColor: colors.success + "22" }]}>
        <Pressable
          style={[styles.swipeActionBtn, { backgroundColor: colors.success + "22" }]}
          onPress={() => { onToggleAttendance("present"); closeSwipe(); }}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
          <Text style={[styles.swipeActionText, { color: colors.success }]}>حضر</Text>
        </Pressable>
      </View>
      <View style={[styles.swipeActions, { backgroundColor: colors.surfaceContainerHigh }]}>
        <Pressable
          style={[styles.swipeActionBtn, { backgroundColor: colors.destructive + "22" }]}
          onPress={() => { onToggleAttendance("absent"); closeSwipe(); }}
        >
          <Ionicons name="close-circle-outline" size={18} color={colors.destructive} />
          <Text style={[styles.swipeActionText, { color: colors.destructive }]}>غاب</Text>
        </Pressable>
        <Pressable
          style={[styles.swipeActionBtn, { backgroundColor: player.paymentStatus === "paid" ? colors.success + "22" : colors.reliabilityLow + "22" }]}
          onPress={() => { onTogglePayment(player.paymentStatus === "paid" ? "pending" : "paid"); closeSwipe(); }}
        >
          <Ionicons
            name={player.paymentStatus === "paid" ? "cash" : "cash-outline"}
            size={18}
            color={player.paymentStatus === "paid" ? colors.success : colors.reliabilityLow}
          />
          <Text style={[styles.swipeActionText, { color: player.paymentStatus === "paid" ? colors.success : colors.reliabilityLow }]}>
            {player.paymentStatus === "paid" ? "دفع" : "لم يدفع"}
          </Text>
        </Pressable>
        {!isOrganizerPlayer && (
          <Pressable
            style={[styles.swipeActionBtn, { backgroundColor: colors.destructive + "22" }]}
            onPress={() => { onRemovePlayer(); closeSwipe(); }}
          >
            <Ionicons name="person-remove-outline" size={18} color={colors.destructive} />
            <Text style={[styles.swipeActionText, { color: colors.destructive }]}>إزالة</Text>
          </Pressable>
        )}
      </View>
      <Animated.View
        style={[
          styles.playerRowInner,
          { borderWidth: 1, borderColor: colors.border },
          { backgroundColor: colors.surfaceContainerLowest ?? colors.surfaceContainerLow, transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.playerAvatar, { backgroundColor: colors.surfaceContainerLow }]}>
          <Text style={[styles.playerInitial, { color: sc }]}>{player.nickname.charAt(0)}</Text>
        </View>
        <View style={styles.playerInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <Text style={[styles.playerName, { color: colors.onSurface }]}>{player.nickname}</Text>
            {isOrganizerPlayer && (
              <View style={[styles.organizerTag, { backgroundColor: sc + "20" }]}>
                <Text style={[styles.organizerTagText, { color: sc }]}>منظّم</Text>
              </View>
            )}
          </View>
          {player.position ? <Text style={[styles.playerPos, { color: colors.mutedForeground }]}>{player.position}</Text> : null}
        </View>
        <View style={{ gap: 5, alignItems: "flex-end" }}>
          {formatReliability(player.reliability, player.matchesPlayed) !== "—" && (
            <View style={[styles.relPill, { backgroundColor: relColor + "18" }]}>
              <Text style={[styles.relPillText, { color: relColor }]}>
                {formatReliability(player.reliability, player.matchesPlayed)}
              </Text>
            </View>
          )}
          <View style={[styles.attendancePill, { backgroundColor: attendanceBg, borderWidth: 1, borderColor: attendanceColor + "30" }]}>
            <Ionicons name={attendanceIcon} size={13} color={attendanceColor} />
            <Text style={[styles.pillText, { color: attendanceColor }]}>{attendanceLabel}</Text>
          </View>
          <View style={[styles.attendancePill, {
            backgroundColor: player.paymentStatus === "paid" ? "#22C55E18" : "#F59E0B12",
            borderWidth: 1,
            borderColor: player.paymentStatus === "paid" ? "#22C55E30" : "#F59E0B30",
          }]}>
            <Ionicons
              name={player.paymentStatus === "paid" ? "checkmark-circle" : "time-outline"}
              size={13}
              color={player.paymentStatus === "paid" ? "#22C55E" : "#F59E0B"}
            />
            <Text style={[styles.pillText, { color: player.paymentStatus === "paid" ? "#22C55E" : "#F59E0B" }]}>
              {player.paymentStatus === "paid" ? "دفع" : "لم يدفع"}
            </Text>
          </View>
        </View>
        <Ionicons name="reorder-two-outline" size={16} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
      </Animated.View>
    </View>
  );
}

const VENUES = ["ملعب الأمير محمد", "أكاديمية بادل الرياض", "نادي التنس الملكي", "ملعب الهلال الصغير", "مركز الشباب الرياضي"];
const TIMES = ["07:00", "08:00", "09:00", "10:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const DAY_LABELS = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
const MONTH_LABELS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function getNext14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function ManageMatchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matches, user, updateAttendance, updatePayment, updateMatch, cancelMatch, removeMatchPlayer, refreshMatches } = useApp();
  const [sendingReminder, setSendingReminder] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("players");
  const [apiMatch, setApiMatch] = useState<Match | null>(null);
  const [loadingApi, setLoadingApi] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "success" });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [cost, setCost] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTime, setSelectedTime] = useState("20:00");
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);

  const days = getNext14Days();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const localMatch = matches.find((m) => m.id === id);

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoadingApi(true);
    setLoadError(false);
    api.getMatch(id).then((res) => {
      const m = res.match;
      const players: MatchPlayer[] = (m.players ?? []).map((p) => ({
        id: p.id, nickname: p.nickname, sports: [], sportProfiles: {},
        matchesPlayed: p.matchesPlayed ?? 0, reliability: p.reliability,
        attendance: p.attendance as AttendanceStatus,
        paymentStatus: p.paymentStatus as PaymentStatus,
        position: p.position,
      }));
      const match: Match = {
        id: m.id, title: m.title, sport: m.sport as Match["sport"],
        date: new Date(m.date), time: m.time, venue: m.venue,
        location: m.location, maxPlayers: m.maxPlayers, cost: m.cost,
        isPublic: m.isPublic, organizerId: m.organizerId,
        organizerName: m.organizerName, organizerReliability: m.organizerReliability,
        players, status: m.status as Match["status"],
        joinedByCurrentUser: m.joinedByCurrentUser ?? true,
        sessionType: m.sessionType, matchFormat: m.matchFormat,
        description: m.description, invitedGroupId: m.invitedGroupId,
      };
      setApiMatch(match);
      setTitle(match.title);
      setVenue(match.venue);
      setCost(String(match.cost));
      setDescription(match.description ?? "");
      setSelectedTime(match.time);
      setMaxPlayers(match.maxPlayers);
      const matchDate = new Date(match.date.getTime());
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const diff = Math.round((matchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < 14) setSelectedDate(diff);
    }).catch(() => { if (!localMatch) setLoadError(true); }).finally(() => setLoadingApi(false));
  }, [id]);

  const refetchMatch = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.getMatch(id);
      const m = res.match;
      const players: MatchPlayer[] = (m.players ?? []).map((p) => ({
        id: p.id, nickname: p.nickname, sports: [], sportProfiles: {},
        matchesPlayed: p.matchesPlayed ?? 0, reliability: p.reliability,
        attendance: p.attendance as AttendanceStatus,
        paymentStatus: p.paymentStatus as PaymentStatus,
        position: p.position,
      }));
      setApiMatch((prev) => ({
        id: m.id, title: m.title, sport: m.sport as Match["sport"],
        date: new Date(m.date), time: m.time, venue: m.venue,
        location: m.location, maxPlayers: m.maxPlayers, cost: m.cost,
        isPublic: m.isPublic, organizerId: m.organizerId,
        organizerName: m.organizerName, organizerReliability: m.organizerReliability,
        players, status: m.status as Match["status"],
        joinedByCurrentUser: m.joinedByCurrentUser ?? prev?.joinedByCurrentUser ?? true,
        sessionType: m.sessionType, matchFormat: m.matchFormat,
        description: m.description, invitedGroupId: m.invitedGroupId,
      }));
    } catch { }
  }, [id]);

  const match = (apiMatch ?? localMatch) as Match | undefined;
  const sc = match ? sportColor(match.sport, colors) : colors.primary;
  

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
          <Text style={{ color: colors.onSurface, fontFamily: "Cairo_700Bold", fontSize: 16, textAlign: "center" }}>تعذّر تحميل البيانات</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: sc, fontFamily: "Cairo_700Bold", fontSize: 14 }}>العودة</Text>
          </Pressable>
        </View>
      );
    }
    return null;
  }

  const currentUserId = user?.id ?? "";
  if (match.organizerId !== currentUserId) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.onSurface, fontFamily: "Cairo_700Bold", fontSize: 16, marginTop: 12 }}>غير مخوّل</Text>
      </View>
    );
  }

  const paidPlayers = match.players.filter((p) => p.paymentStatus === "paid").length;
  const presentPlayers = match.players.filter((p) => p.attendance === "present").length;
  const totalMatchBudget = Math.round(match.maxPlayers * match.cost * 100) / 100;
  const totalCollected = Math.round(paidPlayers * match.cost * 100) / 100;
  const totalExpected = totalMatchBudget;
  const totalRemaining = Math.round((totalExpected - totalCollected) * 100) / 100;
  const collectionPct = totalExpected > 0 ? totalCollected / totalExpected : 0;
  const attendancePct = match.players.length > 0 ? presentPlayers / match.players.length : 0;

  function showToast(message: string, type: ToastType = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message, type });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }

  async function handleSendPaymentReminder() {
    if (sendingReminder || !match) return;
    const unpaidCount = match.players.filter((p) => p.paymentStatus !== "paid" && p.id !== match.organizerId).length;
    if (unpaidCount === 0) {
      showToast("جميع اللاعبين دفعوا بالفعل", "warning");
      return;
    }
    Alert.alert(
      "إرسال تذكير بالدفع",
      `سيتلقى ${unpaidCount} لاعب/لاعبين إشعاراً بتذكيرهم بدفع حصتهم (${match.cost} ر.س). هل تريد المتابعة؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إرسال", onPress: async () => {
            setSendingReminder(true);
            try {
              const res = await api.sendPaymentReminder(match.id);
              if (res.success) {
                showToast(res.notified > 0 ? `تم إرسال التذكير لـ ${res.notified} لاعب` : "لا يوجد لاعبون غير دافعين", "success");
              }
            } catch {
              showToast("تعذّر إرسال التذكير", "error");
            } finally {
              setSendingReminder(false);
            }
          },
        },
      ]
    );
  }

  async function handleMarkAttendeesPaid() {
    if (markingPaid || !match) return;
    const eligibleCount = match.players.filter(
      (p) => p.attendance === "present" && p.paymentStatus !== "paid"
    ).length;
    if (eligibleCount === 0) {
      showToast("لا يوجد حاضرون غير دافعين", "warning");
      return;
    }
    Alert.alert(
      "تسديد الحاضرين",
      `هل تريد تسجيل دفع جميع الحاضرين (${eligibleCount} لاعب)؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد", onPress: async () => {
            setMarkingPaid(true);
            try {
              const res = await api.markAttendeesPaid(match.id);
              if (res.success) {
                showToast(`تم تسجيل دفع ${res.marked} لاعب`, "success");
                refetchMatch();
              }
            } catch {
              showToast("تعذّر تحديث المدفوعات", "error");
            } finally {
              setMarkingPaid(false);
            }
          },
        },
      ]
    );
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = "العنوان يجب أن يكون 3 أحرف على الأقل";
    if (venue.trim().length < 3) e.venue = "اسم الملعب يجب أن يكون 3 أحرف على الأقل";
    if (isNaN(Number(cost)) || Number(cost) < 0) e.cost = "أدخل مبلغ صحيح";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || saving) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    let dateStr: string | undefined;
    if (selectedDate !== null) {
      const d = days[selectedDate];
      dateStr = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : undefined;
    }
    const ok = await updateMatch(match!.id, {
      title: title.trim(),
      venue: venue.trim(),
      date: dateStr,
      time: selectedTime,
      cost: Number(cost),
      maxPlayers: match!.sport === "football" ? maxPlayers : match!.maxPlayers,
      description: description.trim() || undefined,
    });
    setSaving(false);
    if (ok) {
      showToast("تم حفظ التعديلات بنجاح", "success");
      refetchMatch();
    } else {
      Alert.alert("خطأ", "تعذّر تحديث التفاصيل");
    }
  }

  async function handleCancel() {
    Alert.alert(
      `إلغاء المباراة`,
      `هل أنت متأكد من إلغاء هذه المباراة؟ سيتلقى جميع اللاعبين إشعاراً بالإلغاء.`,
      [
        { text: "تراجع", style: "cancel" },
        {
          text: "إلغاء المباراة", style: "destructive", onPress: async () => {
            const ok = await cancelMatch(match!.id);
            if (ok) { router.back(); router.back(); }
            else showToast("تعذّر إلغاء المباراة", "error");
          },
        },
      ]
    );
  }

  async function handleCompleteMatch() {
    Alert.alert(
      `إنهاء المباراة`,
      `هل أنت متأكد من إنهاء هذه المباراة؟ سيتم تغيير حالته إلى "مكتمل".`,
      [
        { text: "تراجع", style: "cancel" },
        {
          text: "إنهاء", style: "destructive", onPress: async () => {
            if (completing) return;
            setCompleting(true);
            try {
              await api.completeMatch(match!.id);
              await refreshMatches();
              router.back();
            } catch {
              showToast("تعذّر إنهاء المباراة", "error");
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  }

  const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "players", label: "اللاعبون", icon: "people-outline" },
    { key: "gatta", label: "الغطّة", icon: "wallet-outline" },
    { key: "settings", label: "الإعدادات", icon: "settings-outline" },
  ];

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: "transparent" }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {(() => {
        const ManageSportIcon = getSportIcon(match.sport);
        const fillPct = match.maxPlayers > 0 ? match.players.length / match.maxPlayers : 0;
        const progressColor = fillPct >= 1 ? "#22C55E" : fillPct >= 0.75 ? "#F59E0B" : "#fff";
        return (
          <View style={[styles.hero, { paddingTop: topPad + 8, backgroundColor: sc }]}>
            <View style={styles.heroHeader}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <View style={styles.backBtnInner}>
                  <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={22} color="#fff" />
                </View>
              </Pressable>
              <Text style={styles.heroTitle}>إدارة المباراة</Text>
              <View style={{ width: 44 }} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, justifyContent: "flex-end" }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.matchTitle} numberOfLines={2}>{match.title}</Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Cairo_600SemiBold", fontSize: 12, textAlign: "right", marginTop: 2 }}>{sportLabel(match.sport)}</Text>
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ManageSportIcon color="#fff" size={26} />
              </View>
            </View>
            <View style={styles.heroMeta}>
              <View style={styles.heroBadge}>
                <Ionicons name="time-outline" size={13} color="#ffffffCC" />
                <Text style={styles.heroBadgeText}>{match.time}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="calendar-outline" size={13} color="#ffffffCC" />
                <Text style={styles.heroBadgeText}>{formatDate(match.date)}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="location-outline" size={13} color="#ffffffCC" />
                <Text style={styles.heroBadgeText} numberOfLines={1}>{match.venue}</Text>
              </View>
            </View>
            <View style={[styles.heroProgressWrap, { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 10 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 12 }}>{match.players.length}/{match.maxPlayers} لاعب</Text>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Cairo_600SemiBold", fontSize: 12 }}>
                  {match.maxPlayers - match.players.length > 0 ? `${match.maxPlayers - match.players.length} مكان متبقي` : "مكتمل"}
                </Text>
              </View>
              <LiquidProgressBar progress={fillPct} sport={match.sport} height={5} overrideColor={progressColor} />
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>{presentPlayers}</Text>
                <Text style={styles.heroStatLbl}>حضروا</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>{paidPlayers}</Text>
                <Text style={styles.heroStatLbl}>دفعوا</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatNum, { color: totalCollected > 0 ? "#A7F3D0" : "#fff" }]}>{totalCollected}</Text>
                <Text style={styles.heroStatLbl}>ر.س جُمع</Text>
              </View>
            </View>
          </View>
        );
      })()}

      <View style={[styles.tabBar, { backgroundColor: colors.surfaceContainerLow }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabItem, active && { borderBottomColor: sc, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={18} color={active ? sc : colors.mutedForeground} />
              <Text style={[styles.tabLabel, { color: active ? sc : colors.mutedForeground }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "players" && (
          <View style={{ gap: 14 }}>
            <SurfaceCard elevated style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, gap: 12 }}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={18} color={colors.onSurface} />
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                  اللاعبون ({match.players.length}/{match.maxPlayers})
                </Text>
                <Text style={[styles.swipeHint, { color: colors.mutedForeground }]}>اسحب لليسار للخيارات</Text>
              </View>
              <LiquidProgressBar
                progress={match.maxPlayers > 0 ? match.players.length / match.maxPlayers : 0}
                sport={match.sport}
                height={6}
              />
              <FlatList
                data={match.players}
                keyExtractor={(player) => player.id}
                scrollEnabled={false}
                windowSize={5}
                maxToRenderPerBatch={8}
                initialNumToRender={8}
                removeClippedSubviews={Platform.OS === "android"}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد لاعبون مسجلون بعد</Text>
                }
                renderItem={({ item: player }) => (
                  <SwipeablePlayerRow
                    player={player}
                    sc={sc}
                    isOrganizerPlayer={player.id === match.organizerId}
                    onToggleAttendance={(status) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const prev = apiMatch;
                      setApiMatch((p) => p ? { ...p, players: p.players.map((pl) => pl.id === player.id ? { ...pl, attendance: status } : pl) } : p);
                      updateAttendance(match.id, player.id, status).then((ok) => {
                        if (ok) refetchMatch(); else setApiMatch(prev);
                      });
                    }}
                    onTogglePayment={(status) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const prev = apiMatch;
                      setApiMatch((p) => p ? { ...p, players: p.players.map((pl) => pl.id === player.id ? { ...pl, paymentStatus: status } : pl) } : p);
                      updatePayment(match.id, player.id, status).then((ok) => {
                        if (ok) refetchMatch(); else setApiMatch(prev);
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
                              const prev = apiMatch;
                              setApiMatch((p) => p ? { ...p, players: p.players.filter((pl) => pl.id !== player.id) } : p);
                              const ok = await removeMatchPlayer(match.id, player.id);
                              if (ok) { showToast(`تم إزالة ${player.nickname}`, "success"); refetchMatch(); }
                              else { setApiMatch(prev); showToast("تعذّر إزالة اللاعب", "error"); }
                            },
                          },
                        ]
                      );
                    }}
                  />
                )}
              />
              {match.players.length < match.maxPlayers && (
                <View style={[styles.emptySlots, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Ionicons name="person-add-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.emptySlotsText, { color: colors.mutedForeground }]}>
                    {match.maxPlayers - match.players.length} مكان متبقٍ
                  </Text>
                </View>
              )}
            </SurfaceCard>

            {match.status !== "completed" && match.status !== "cancelled" && (
              <Pressable
                style={[
                  styles.completeMatchBtn,
                  { backgroundColor: colors.success, opacity: completing ? 0.7 : 1 },
                ]}
                onPress={handleCompleteMatch}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator size="small" color="rgba(255,255,255,1)" />
                ) : (
                  <Ionicons name="flag-outline" size={20} color="rgba(255,255,255,1)" />
                )}
                <Text style={styles.completeMatchBtnText}>إنهاء المباراة</Text>
              </Pressable>
            )}
          </View>
        )}

        {activeTab === "gatta" && (
          <View style={{ gap: 14 }}>
            <SurfaceCard elevated style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, gap: 14 }}>
              <View style={styles.sectionHeader}>
                <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>دفتر الغطّة</Text>
              </View>

              <View style={[styles.gattaSummary, { backgroundColor: colors.surfaceContainer }]}>
                <View style={styles.gattaStatItem}>
                  <Text style={[styles.gattaStatVal, { color: colors.success }]}>{totalCollected}</Text>
                  <Text style={[styles.gattaStatUnit, { color: colors.success }]}>ر.س</Text>
                  <Text style={[styles.gattaStatLbl, { color: colors.mutedForeground }]}>تم جمعه</Text>
                </View>
                <View style={[styles.gattaDivider, { backgroundColor: colors.onSurface + "15" }]} />
                <View style={styles.gattaStatItem}>
                  <Text style={[styles.gattaStatVal, { color: colors.onSurface }]}>{totalExpected}</Text>
                  <Text style={[styles.gattaStatUnit, { color: colors.mutedForeground }]}>ر.س</Text>
                  <Text style={[styles.gattaStatLbl, { color: colors.mutedForeground }]}>الإجمالي</Text>
                </View>
                <View style={[styles.gattaDivider, { backgroundColor: colors.onSurface + "15" }]} />
                <View style={styles.gattaStatItem}>
                  <Text style={[styles.gattaStatVal, { color: colors.tertiary }]}>{totalRemaining}</Text>
                  <Text style={[styles.gattaStatUnit, { color: colors.tertiary }]}>ر.س</Text>
                  <Text style={[styles.gattaStatLbl, { color: colors.mutedForeground }]}>متبقي</Text>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <View style={styles.progressLabelRow}>
                  <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                    نسبة التحصيل {Math.round(collectionPct * 100)}%
                  </Text>
                  <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                    {paidPlayers}/{match.players.length} دفعوا
                  </Text>
                </View>
                <LiquidProgressBar progress={collectionPct} sport={match.sport} height={10} />
              </View>

              {match.cost > 0 && (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[styles.subSectionTitle, { color: colors.onSurface }]}>حالة الدفع</Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Cairo_400Regular", fontSize: 12 }}>
                      اضغط لتغيير الحالة
                    </Text>
                  </View>
                  {match.players.map((player) => {
                    const isPaid = player.paymentStatus === "paid";
                    return (
                      <Pressable
                        key={player.id}
                        style={[
                          styles.paymentRow,
                          {
                            backgroundColor: isPaid ? "#22C55E10" : colors.surfaceContainerHigh,
                            borderWidth: 1,
                            borderColor: isPaid ? "#22C55E30" : "#E5E7EB",
                          },
                        ]}
                        onPress={() => {
                          const newStatus: PaymentStatus = isPaid ? "pending" : "paid";
                          const actionLabel = newStatus === "paid" ? "تأكيد الدفع" : "إلغاء الدفع";
                          const actionMsg = newStatus === "paid"
                            ? `هل تريد تسجيل دفع "${player.nickname}"؟`
                            : `هل تريد إلغاء دفع "${player.nickname}"؟`;
                          Alert.alert(actionLabel, actionMsg, [
                            { text: "تراجع", style: "cancel" },
                            {
                              text: "تأكيد",
                              style: newStatus === "pending" ? "destructive" : "default",
                              onPress: () => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                const prev = apiMatch;
                                setApiMatch((p) => p ? { ...p, players: p.players.map((pl) => pl.id === player.id ? { ...pl, paymentStatus: newStatus } : pl) } : p);
                                updatePayment(match.id, player.id, newStatus).then((ok) => { if (ok) refetchMatch(); else setApiMatch(prev); });
                              },
                            },
                          ]);
                        }}
                      >
                        <Ionicons
                          name={isPaid ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={isPaid ? "#22C55E" : colors.mutedForeground}
                        />
                        <Text style={[styles.paymentRowName, { color: colors.onSurface }]}>{player.nickname}</Text>
                        <View style={[
                          styles.paymentStatusPill,
                          { backgroundColor: isPaid ? "#22C55E" : "#F59E0B" },
                        ]}>
                          <Text style={styles.paymentStatusPillText}>
                            {isPaid ? `${match.cost} ر.س ✓` : "لم يدفع"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {match.cost === 0 && (
                <View style={[styles.freeBadge, { backgroundColor: colors.success + "15" }]}>
                  <Ionicons name="gift-outline" size={18} color={colors.success} />
                  <Text style={{ color: colors.success, fontFamily: "Cairo_700Bold", fontSize: 14 }}>هذه الجلسة مجانية</Text>
                </View>
              )}

              {match.cost > 0 && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Pressable
                    style={[styles.gattaActionBtn, { backgroundColor: colors.success, opacity: markingPaid ? 0.7 : 1 }]}
                    onPress={handleMarkAttendeesPaid}
                    disabled={markingPaid}
                  >
                    {markingPaid
                      ? <ActivityIndicator size="small" color="rgba(255,255,255,1)" />
                      : <Ionicons name="checkmark-done-outline" size={18} color="rgba(255,255,255,1)" />}
                    <Text style={styles.gattaActionBtnText}>تسديد الحاضرين دفعة واحدة</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.gattaActionBtn, { backgroundColor: sc, opacity: sendingReminder ? 0.7 : 1 }]}
                    onPress={handleSendPaymentReminder}
                    disabled={sendingReminder}
                  >
                    {sendingReminder
                      ? <ActivityIndicator size="small" color="rgba(255,255,255,1)" />
                      : <Ionicons name="notifications-outline" size={18} color="rgba(255,255,255,1)" />}
                    <Text style={styles.gattaActionBtnText}>إرسال تذكير بالدفع</Text>
                  </Pressable>
                </View>
              )}
            </SurfaceCard>

            <SurfaceCard elevated style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, gap: 14 }}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart-outline" size={18} color={colors.secondary} />
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>إحصائيات الحضور</Text>
              </View>
              <View style={styles.attendanceStats}>
                <View style={[styles.attendanceStatItem, { backgroundColor: colors.success + "15" }]}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  <Text style={[styles.attendanceStatNum, { color: colors.success }]}>
                    {match.players.filter((p) => p.attendance === "present").length}
                  </Text>
                  <Text style={[styles.attendanceStatLbl, { color: colors.mutedForeground }]}>حضر</Text>
                </View>
                <View style={[styles.attendanceStatItem, { backgroundColor: colors.destructive + "15" }]}>
                  <Ionicons name="close-circle" size={22} color={colors.destructive} />
                  <Text style={[styles.attendanceStatNum, { color: colors.destructive }]}>
                    {match.players.filter((p) => p.attendance === "absent").length}
                  </Text>
                  <Text style={[styles.attendanceStatLbl, { color: colors.mutedForeground }]}>غاب</Text>
                </View>
                <View style={[styles.attendanceStatItem, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Ionicons name="time-outline" size={22} color={colors.mutedForeground} />
                  <Text style={[styles.attendanceStatNum, { color: colors.onSurface }]}>
                    {match.players.filter((p) => p.attendance === "pending").length}
                  </Text>
                  <Text style={[styles.attendanceStatLbl, { color: colors.mutedForeground }]}>معلق</Text>
                </View>
              </View>
              {match.players.length > 0 && (
                <View style={{ gap: 6 }}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>نسبة الحضور</Text>
                    <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>{Math.round(attendancePct * 100)}%</Text>
                  </View>
                  <LiquidProgressBar progress={attendancePct} sport={match.sport} height={8} />
                </View>
              )}
            </SurfaceCard>
          </View>
        )}

        {activeTab === "settings" && (
          <View style={{ gap: 14 }}>
            <SurfaceCard elevated style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, gap: 16 }}>
              <View style={styles.sectionHeader}>
                <Ionicons name="create-outline" size={18} color={sc} />
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>تعديل التفاصيل</Text>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: colors.onSurface }]}>العنوان</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surfaceContainerHigh, borderBottomColor: errors.title ? colors.destructive : sc }]}>
                  <TextInput
                    style={[styles.input, { color: colors.onSurface }]}
                    value={title}
                    onChangeText={(v) => { setTitle(v); if (v.trim()) setErrors((e) => ({ ...e, title: "" })); }}
                    placeholder="عنوان المباراة"
                    placeholderTextColor={colors.mutedForeground}
                    textAlign="right"
                  />
                </View>
                {errors.title ? <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.title}</Text> : null}
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: colors.onSurface }]}>الوصف (اختياري)</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surfaceContainerHigh, borderBottomColor: sc }]}>
                  <TextInput
                    style={[styles.input, { color: colors.onSurface, minHeight: 70 }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="أضف وصفاً..."
                    placeholderTextColor={colors.mutedForeground}
                    textAlign="right"
                    multiline
                  />
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: colors.onSurface }]}>التاريخ</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                  {days.map((d, i) => {
                    const isSelected = selectedDate === i;
                    return (
                      <Pressable
                        key={i}
                        style={[
                          styles.dateCard,
                          isSelected ? { backgroundColor: sc } : [{ backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.border }],
                        ]}
                        onPress={() => setSelectedDate(i)}
                      >
                        <Text style={[styles.dateDayName, { color: isSelected ? "rgba(255,255,255,1)" : colors.mutedForeground }]}>{DAY_LABELS[d.getDay()]}</Text>
                        <Text style={[styles.dateNum, { color: isSelected ? "rgba(255,255,255,1)" : colors.onSurface }]}>{d.getDate()}</Text>
                        <Text style={[styles.dateMonth, { color: isSelected ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>{MONTH_LABELS[d.getMonth()]?.slice(0, 3)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: colors.onSurface }]}>الوقت</Text>
                <View style={styles.timesGrid}>
                  {TIMES.map((t) => (
                    <Pressable
                      key={t}
                      style={[
                        styles.timeChip,
                        selectedTime === t ? { backgroundColor: sc } : [{ backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.border }],
                      ]}
                      onPress={() => setSelectedTime(t)}
                    >
                      <Text style={[styles.timeText, { color: selectedTime === t ? "rgba(255,255,255,1)" : colors.onSurfaceVariant }]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: colors.onSurface }]}>الملعب</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surfaceContainerHigh, borderBottomColor: errors.venue ? colors.destructive : sc }]}>
                  <TextInput
                    style={[styles.input, { color: colors.onSurface }]}
                    value={venue}
                    onChangeText={(v) => { setVenue(v); setShowVenueSuggestions(v.length > 0); if (v.trim()) setErrors((e) => ({ ...e, venue: "" })); }}
                    onBlur={() => { if (!venue.trim()) setErrors((e) => ({ ...e, venue: "أدخل اسم الملعب" })); }}
                    placeholder="اسم الملعب"
                    placeholderTextColor={colors.mutedForeground}
                    textAlign="right"
                  />
                </View>
                {showVenueSuggestions && (
                  <View style={[styles.suggestions, { backgroundColor: colors.surfaceContainerLow }]}>
                    {VENUES.filter((v) => v.includes(venue)).map((v) => (
                      <Pressable key={v} style={styles.suggestion} onPress={() => { setVenue(v); setShowVenueSuggestions(false); }}>
                        <Ionicons name="location-outline" size={14} color={sc} />
                        <Text style={[styles.suggestionText, { color: colors.onSurface }]}>{v}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {errors.venue ? <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.venue}</Text> : null}
              </View>

              {match.sport === "football" && (
                <View style={{ gap: 6 }}>
                  <Text style={[styles.label, { color: colors.onSurface }]}>عدد اللاعبين</Text>
                  <View style={[styles.counterRow, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Pressable style={[styles.counterBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }]} onPress={() => setMaxPlayers((p) => Math.max(2, p - 2))}>
                      <Ionicons name="remove" size={20} color={colors.onSurface} />
                    </Pressable>
                    <Text style={[styles.counterVal, { color: sc }]}>{maxPlayers}</Text>
                    <Pressable style={[styles.counterBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.border }]} onPress={() => setMaxPlayers((p) => Math.min(22, p + 2))}>
                      <Ionicons name="add" size={20} color={colors.onSurface} />
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: colors.onSurface }]}>التكلفة للفرد (ر.س)</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surfaceContainerHigh, borderBottomColor: errors.cost ? colors.destructive : sc }]}>
                  <TextInput
                    style={[styles.input, { color: colors.onSurface }]}
                    value={cost}
                    onChangeText={(v) => { setCost(v); if (!isNaN(Number(v)) && Number(v) >= 0) setErrors((e) => ({ ...e, cost: "" })); }}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    textAlign="right"
                    keyboardType="numeric"
                  />
                </View>
                {errors.cost ? <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.cost}</Text> : null}
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: sc }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Ionicons name={saving ? "time-outline" : "checkmark-circle-outline"} size={20} color="rgba(255,255,255,1)" />
                <Text style={styles.saveBtnText}>{saving ? "جاري الحفظ..." : "حفظ التعديلات"}</Text>
              </Pressable>
            </SurfaceCard>

            {match.status !== "completed" && match.status !== "cancelled" && (
              <SurfaceCard elevated style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, gap: 12 }}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="warning-outline" size={18} color={colors.destructive} />
                  <Text style={[styles.sectionTitle, { color: colors.destructive }]}>منطقة الخطر</Text>
                </View>
                <Pressable style={[styles.cancelBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]} onPress={handleCancel}>
                  <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.cancelBtnTitle, { color: colors.destructive }]}>إلغاء المباراة</Text>
                    <Text style={[styles.cancelBtnSub, { color: colors.mutedForeground }]}>سيتلقى اللاعبون إشعاراً بالإلغاء</Text>
                  </View>
                </Pressable>
              </SurfaceCard>
            )}
          </View>
        )}
      </ScrollView>

      <Toast toast={toast} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  heroHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  backBtn: { padding: 4 },
  backBtnInner: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffffff25", alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 15, fontFamily: "Cairo_600SemiBold", color: "#fff", opacity: 0.9 },
  matchTitle: { fontSize: 22, fontFamily: "Cairo_700Bold", color: "#fff", textAlign: "right", lineHeight: 34 },
  heroMeta: { flexDirection: "row", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" },
  heroBadge: { flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: "#ffffff18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  heroBadgeText: { fontSize: 12, color: "#fff", fontFamily: "Cairo_400Regular" },
  heroProgressWrap: { gap: 0 },
  heroStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "#ffffff15", borderRadius: 16, padding: 12, marginTop: 4 },
  heroStatItem: { alignItems: "center", gap: 2, flex: 1 },
  heroStatNum: { fontSize: 18, fontFamily: "Cairo_700Bold", color: "#fff" },
  heroStatLbl: { fontSize: 11, fontFamily: "Cairo_400Regular", color: "#ffffffCC" },
  heroStatDivider: { width: 1, height: 30, backgroundColor: "#ffffff30" },

  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#00000010" },
  tabItem: { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontSize: 12, fontFamily: "Cairo_700Bold" },

  scroll: { paddingHorizontal: 16, gap: 0, paddingTop: 14 },

  sectionHeader: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "flex-end" },
  sectionTitle: { fontSize: 17, fontFamily: "Cairo_700Bold", lineHeight: 26, flex: 1, textAlign: "right" },
  swipeHint: { fontSize: 11, fontFamily: "Cairo_400Regular" },

  swipeContainer: { position: "relative", overflow: "hidden", borderRadius: 18, marginBottom: 8 },
  swipeActions: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    paddingRight: 8, gap: 6,
  },
  swipeActionsRight: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "flex-start",
    paddingLeft: 8, gap: 6,
  },
  swipeActionBtn: { alignItems: "center", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, gap: 3 },
  swipeActionText: { fontSize: 11, fontFamily: "Cairo_700Bold" },

  playerRowInner: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 10,
    borderRadius: 18, backgroundColor: "#fff",
  },
  playerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  playerInitial: { fontSize: 16, fontFamily: "Cairo_700Bold" },
  playerInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  playerName: { fontSize: 14, fontFamily: "Cairo_700Bold" },
  playerPos: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  organizerTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  organizerTagText: { fontSize: 10, fontFamily: "Cairo_700Bold" },
  relPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 24 },
  relPillText: { fontSize: 11, fontFamily: "Cairo_700Bold" },
  attendancePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontFamily: "Cairo_700Bold" },

  emptyText: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "center", paddingVertical: 10 },
  emptySlots: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 14 },
  emptySlotsText: { fontSize: 14, fontFamily: "Cairo_400Regular" },

  gattaSummary: { flexDirection: "row", borderRadius: 16, padding: 14, alignItems: "center" },
  gattaStatItem: { flex: 1, alignItems: "center", gap: 2 },
  gattaStatVal: { fontSize: 20, fontFamily: "Cairo_700Bold" },
  gattaStatUnit: { fontSize: 11, fontFamily: "Cairo_400Regular", marginTop: -2 },
  gattaStatLbl: { fontSize: 11, fontFamily: "Cairo_400Regular", marginTop: 2 },
  gattaDivider: { width: 1, height: 44, marginHorizontal: 4 },

  progressLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },

  subSectionTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", textAlign: "right" },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14 },
  paymentRowName: { flex: 1, fontSize: 14, fontFamily: "Cairo_600SemiBold", textAlign: "right" },
  paymentRowAmount: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  paymentStatusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  paymentStatusPillText: { color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 12 },

  freeBadge: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14 },
  gattaActionBtn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 14 },
  gattaActionBtnText: { fontFamily: "Cairo_700Bold", fontSize: 14, color: "#fff" },

  attendanceStats: { flexDirection: "row", gap: 10 },
  attendanceStatItem: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: 16 },
  attendanceStatNum: { fontSize: 24, fontFamily: "Cairo_700Bold" },
  attendanceStatLbl: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },

  label: { fontSize: 14, fontFamily: "Cairo_700Bold", textAlign: "right" },
  inputWrap: { borderRadius: 14, borderBottomWidth: 2, overflow: "hidden" },
  input: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: "Cairo_600SemiBold" },
  errorText: { fontSize: 12, fontFamily: "Cairo_400Regular", textAlign: "right" },

  dateCard: { width: 60, paddingVertical: 12, borderRadius: 16, alignItems: "center", gap: 4 },
  dateDayName: { fontSize: 11, fontFamily: "Cairo_600SemiBold" },
  dateNum: { fontSize: 20, fontFamily: "Cairo_700Bold" },
  dateMonth: { fontSize: 10, fontFamily: "Cairo_400Regular" },

  timesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  timeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24 },
  timeText: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },

  suggestions: { marginTop: 4, borderRadius: 14, overflow: "hidden" },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "flex-end" },
  suggestionText: { fontSize: 14, fontFamily: "Cairo_400Regular" },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 16, justifyContent: "center", borderRadius: 16, padding: 10 },
  counterBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  counterVal: { fontSize: 22, fontFamily: "Cairo_700Bold", minWidth: 40, textAlign: "center" },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 24 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Cairo_700Bold" },

  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1 },
  cancelBtnTitle: { fontSize: 15, fontFamily: "Cairo_700Bold" },
  cancelBtnSub: { fontSize: 12, fontFamily: "Cairo_400Regular" },

  completeMatchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 24, marginTop: 4 },
  completeMatchBtnText: { color: "#fff", fontSize: 16, fontFamily: "Cairo_700Bold" },

  toast: {
    position: "absolute", bottom: 30, left: 20, right: 20,
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
});
