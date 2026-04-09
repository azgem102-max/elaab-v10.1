import { useApp, sportColor, sportLabel, reliabilityColor, formatDate, formatReliability } from "@/context/AppContext";
import { api } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { getSportIcon } from "@/components/icons/SportIcons";
import { SportGradientButton } from "@/components/SportGradientButton";
import { MatchCard } from "@/components/glass/MatchCard";
import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { getSportTheme } from "@/constants/sportTheme";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  I18nManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = { visible: boolean; message: string };
type TabKey = "members" | "matches" | "chat";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: Date;
}

export default function GroupDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, showInvite } = useLocalSearchParams<{ id: string; showInvite?: string }>();
  const {
    groups,
    joinGroup,
    leaveGroup,
    matches,
    user,
    inviteMemberToGroup,
    joinMatch,
    allPlayers,
    fetchGroupById,
    removeGroupMember,
    createGroupInviteLink,
  } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [inviteModalVisible, setInviteModalVisible] = useState(showInvite === "1");
  const [toast, setToast] = useState<ToastType>({ visible: false, message: "" });
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("members");
  const tabAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const TAB_KEYS: TabKey[] = ["members", "matches", "chat"];
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatRefreshing, setChatRefreshing] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, []);

  function switchTab(tab: TabKey) {
    const idx = TAB_KEYS.indexOf(tab);
    Animated.spring(tabAnim, {
      toValue: idx,
      useNativeDriver: false,
      friction: 8,
      tension: 120,
    }).start();
    setActiveTab(tab);
  }

  const group = groups.find((g) => g.id === id);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    const needsDetailFetch = !group || !group.members || group.members.length < group.memberCount;
    if (needsDetailFetch) {
      setLoadingGroup(true);
      setFetchFailed(false);
      fetchGroupById(id)
        .then((result) => {
          if (!result) setFetchFailed(true);
        })
        .finally(() => setLoadingGroup(false));
    }
  }, [id]);

  async function loadChatMessages(groupId: string, isInitial = false) {
    try {
      if (isInitial) {
        setChatLoading(true);
        lastMessageTimestampRef.current = null;
      }
      const after = !isInitial && lastMessageTimestampRef.current ? lastMessageTimestampRef.current : undefined;
      const res = await api.getGroupMessages(groupId, after);
      if (res.messages && res.messages.length > 0) {
        const newMsgs: ChatMessage[] = res.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          text: m.text,
          time: new Date(m.createdAt),
        }));
        if (isInitial) {
          setChatMessages(newMsgs);
        } else {
          setChatMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
            if (fresh.length === 0) return prev;
            setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
            return [...prev, ...fresh];
          });
        }
        const last = res.messages[res.messages.length - 1];
        if (last) lastMessageTimestampRef.current = last.createdAt;
      } else if (isInitial) {
        setChatMessages([]);
      }
    } catch {
    } finally {
      if (isInitial) setChatLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "chat" && id && group?.isJoined) {
      loadChatMessages(id, true).then(() => {
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: false }), 100);
      });
    }
  }, [activeTab, id, group?.isJoined]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab !== "chat" || !id || !group?.isJoined) return;
      const interval = setInterval(() => {
        loadChatMessages(id, false);
      }, 5000);
      return () => clearInterval(interval);
    }, [activeTab, id, group?.isJoined])
  );

  if (loadingGroup) {
    return (
      <View style={[styles.container, { backgroundColor: "transparent", alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!group || fetchFailed) {
    return (
      <View style={[styles.container, { backgroundColor: "transparent", alignItems: "center", justifyContent: "center", gap: 16 }]}>
        <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 16, color: colors.onSurface }}>المجموعة غير موجودة</Text>
        <Pressable
          onPress={() => router.back()}
          style={[{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={{ fontFamily: "Cairo_600SemiBold", fontSize: 14, color: colors.primary }}>العودة</Text>
        </Pressable>
      </View>
    );
  }

  const groupSafe = group;
  const sc = sportColor(groupSafe.sport, colors);
  const sportTheme = getSportTheme(groupSafe.sport);

  const currentUserId = user?.id ?? "";
  const currentUserMember = groupSafe.members?.find((m) => m.id === currentUserId);
  const isAdmin = groupSafe.adminId === currentUserId || currentUserMember?.role === "admin" || currentUserMember?.role === "owner";
  const isOwner = groupSafe.adminId === currentUserId || currentUserMember?.role === "owner";
  const isMember = groupSafe.isJoined;

  const groupMatchesAll = matches
    .filter((m) => m.invitedGroupId === id && m.status !== "completed" && m.status !== "cancelled")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const groupMatches = groupMatchesAll.slice(0, 5);

  const allActivities = groupMatchesAll.map((m) => ({ ...m, _type: "match" as const }));

  const nextActivity = allActivities[0] ?? null;

  const backendNextMatch = groupSafe.nextMatch && typeof groupSafe.nextMatch === "object" ? groupSafe.nextMatch : null;

  const NextActivitySportIcon = getSportIcon(nextActivity ? nextActivity.sport : groupSafe.sport);
  const BackendMatchSportIcon = getSportIcon(backendNextMatch ? backendNextMatch.sport as "football" | "padel" | "tennis" : groupSafe.sport);

  function getCountdown(date: Date, time: string): string {
    const [hourStr, minuteStr] = time.replace(/[^\d:]/g, "").split(":");
    const eventDate = new Date(date);
    const hours = parseInt(hourStr ?? "0", 10);
    const minutes = parseInt(minuteStr ?? "0", 10);
    eventDate.setHours(isNaN(hours) ? 0 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    if (diffMs <= 0) return "الآن";
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) {
      const remHours = diffHours % 24;
      if (remHours > 0) return `${diffDays}ي ${remHours}س`;
      return `${diffDays} يوم`;
    }
    if (diffHours > 0) {
      const remMins = diffMins % 60;
      if (remMins > 0) return `${diffHours}س ${remMins}د`;
      return `${diffHours} ساعة`;
    }
    return `${diffMins} دقيقة`;
  }

  const memberIds = new Set(group.members.map((m) => m.id));
  const invitablePlayers = allPlayers.filter((p) => !memberIds.has(p.id) && p.id !== currentUserId);

  function showToast(message: string) {
    setToast({ visible: true, message });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }

  async function handleShareGroup() {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const shareText = domain
      ? `انضم لمجموعة "${groupSafe.name}" على تطبيق العب!\nhttps://${domain}/api/group/${groupSafe.id}`
      : `انضم لمجموعة "${groupSafe.name}" على تطبيق العب! حمّل التطبيق الآن`;
    try {
      await Share.share({ message: shareText, title: `مجموعة ${groupSafe.name}` });
    } catch {}
  }

  async function handleShareInviteLink() {
    const token = await createGroupInviteLink(groupSafe.id);
    if (!token) {
      showToast("تعذّر إنشاء رابط الدعوة، حاول مجدداً");
      return;
    }
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const inviteLink = domain ? `https://${domain}/api/invite/${token}` : null;
    const shareText = inviteLink
      ? `أُدعيت للانضمام إلى مجموعة "${groupSafe.name}" على تطبيق العب!\n${inviteLink}`
      : `أُدعيت للانضمام إلى مجموعة "${groupSafe.name}" على تطبيق العب! حمّل التطبيق الآن`;
    try {
      await Share.share({ message: shareText, title: `دعوة لمجموعة ${groupSafe.name}` });
    } catch {}
  }

  function handleJoinGroup() {
    joinGroup(groupSafe.id);
    showToast(`انضممت لمجموعة "${groupSafe.name}" بنجاح ✓`);
  }

  async function handleJoinSession(matchId: string, title: string) {
    const result = await joinMatch(matchId);
    if (result.success) {
      showToast(`تم تسجيلك في "${title}" ✓`);
    } else if (result.alreadyJoined) {
      showToast("أنت مسجل بالفعل في هذه الجلسة");
    } else if (result.isFull) {
      showToast("الجلسة مكتملة، لا توجد أماكن متاحة");
    } else if (result.conflict) {
      showToast(`تعارض في المواعيد مع: ${result.conflict.title}`);
    }
  }

  function handleRemoveMember(memberId: string, memberName: string) {
    Alert.alert("إزالة عضو", `هل أنت متأكد من إزالة "${memberName}" من المجموعة؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "إزالة",
        style: "destructive",
        onPress: async () => {
          await removeGroupMember(groupSafe.id, memberId);
          showToast(`تمت إزالة "${memberName}" من المجموعة`);
        },
      },
    ]);
  }

  async function handleSendChat() {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatInput("");
    setChatSending(true);
    const tempId = "temp_" + Date.now();
    const tempMsg: ChatMessage = {
      id: tempId,
      senderId: currentUserId,
      senderName: user?.nickname ?? "أنت",
      text,
      time: new Date(),
    };
    setChatMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const res = await api.sendGroupMessage(id, text);
      const serverMsg: ChatMessage = {
        id: res.message.id,
        senderId: res.message.senderId,
        senderName: res.message.senderName,
        text: res.message.text,
        time: new Date(res.message.createdAt),
      };
      setChatMessages((prev) => prev.map((m) => m.id === tempId ? serverMsg : m));
      lastMessageTimestampRef.current = res.message.createdAt;
    } catch {
      setChatMessages((prev) => prev.filter((m) => m.id !== tempId));
      showToast("فشل إرسال الرسالة، تحقق من اتصالك");
    } finally {
      setChatSending(false);
    }
  }

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "members", label: "الأعضاء", count: groupSafe.memberCount },
    { key: "matches", label: "المباريات", count: groupMatchesAll.length },
    { key: "chat", label: "دردشة", count: chatMessages.length > 0 ? chatMessages.length : undefined },
  ];

  const tabWidth = 100 / TABS.length;

  return (
    <Animated.View style={[styles.container, { backgroundColor: "transparent", opacity: fadeAnim }]}>
      <GlassScreenHeader style={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 14, gap: 10 }}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.onSurface} />
          </Pressable>

          <View style={styles.headerGroupInfo}>
            <LinearGradient
              colors={[sportTheme.cardGradientStart, sportTheme.cardGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGroupIcon}
            >
              <Ionicons name="people" size={20} color="#fff" />
            </LinearGradient>
            <View style={styles.headerGroupText}>
              <Text style={[styles.headerGroupName, { color: colors.onSurface }]} numberOfLines={1}>
                {groupSafe.name}
              </Text>
              <View style={styles.headerBadgesRow}>
                <View style={[styles.headerPill, { backgroundColor: sc + "15" }]}>
                  <Ionicons name="people-outline" size={11} color={sc} />
                  <Text style={[styles.headerPillText, { color: sc }]}>{groupSafe.memberCount} عضو</Text>
                </View>
                <View style={[styles.headerPill, { backgroundColor: sc + "18" }]}>
                  <Text style={[styles.headerPillText, { color: sc }]}>{sportLabel(groupSafe.sport)}</Text>
                </View>
                {!groupSafe.isPublic && (
                  <View style={[styles.headerPill, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Ionicons name="lock-closed" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.headerPillText, { color: colors.mutedForeground }]}>خاصة</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={[styles.headerActionBtn, { backgroundColor: colors.surfaceContainerHigh }]}
              onPress={handleShareGroup}
            >
              <Ionicons name="share-outline" size={18} color={colors.onSurface} />
            </Pressable>
            {isAdmin && (
              <Pressable
                style={[styles.headerActionBtn, { backgroundColor: sc + "18" }]}
                onPress={() => setInviteModalVisible(true)}
              >
                <Ionicons name="person-add-outline" size={18} color={sc} />
              </Pressable>
            )}
            {isAdmin && (
              <Pressable
                style={[styles.headerActionBtn, { backgroundColor: sc + "18" }]}
                onPress={() => router.push({ pathname: "/group-management", params: { id: groupSafe.id } })}
              >
                <Ionicons name="settings-outline" size={18} color={sc} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.tabContainer, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                backgroundColor: colors.accent,
                left: tabAnim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [`3%`, `${tabWidth + 3}%`, `${tabWidth * 2 + 3}%`],
                }),
                width: `${tabWidth - 6}%`,
              },
            ]}
          />
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={styles.tabBtn}
                onPress={() => switchTab(tab.key)}
              >
                <Text style={[styles.tabText, { color: isActive ? colors.onSurface : colors.onSurfaceVariant }]}>
                  {tab.label}
                </Text>
                {tab.count !== undefined && tab.count > 0 && (
                  <View
                    style={[
                      styles.tabCountBadge,
                      {
                        backgroundColor: isActive ? "rgba(0,0,0,0.1)" : colors.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <Text style={[styles.tabCountText, { color: isActive ? colors.onSurface : colors.onSurfaceVariant }]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </GlassScreenHeader>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {nextActivity ? (
          <Pressable
            style={[styles.nextActivityCard, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/match-details", params: { id: nextActivity.id } })}
          >
            <View style={[styles.nextActivityAccent, { backgroundColor: sc }]} />
            <View style={styles.nextActivityContent}>
              <View style={styles.nextActivityTop}>
                <View style={[styles.nextActivityIconBox, { backgroundColor: sc + "18" }]}>
                  <NextActivitySportIcon size={22} color={sc} />
                </View>
                <View style={styles.nextActivityInfo}>
                  <Text style={[styles.nextActivityLabel, { color: colors.mutedForeground }]}>
                    المباراة القادمة
                  </Text>
                  <Text style={[styles.nextActivityTitle, { color: colors.onSurface }]}>{nextActivity.title}</Text>
                </View>
                <View style={[styles.nextActivityDateBadge, { backgroundColor: sc + "15" }]}>
                  <Text style={[styles.nextActivityDateText, { color: sc }]}>{formatDate(nextActivity.date)}</Text>
                </View>
              </View>
              <View style={[styles.nextActivityCountdownRow, { backgroundColor: sc + "10" }]}>
                <View style={styles.nextActivityMetaItem}>
                  <Ionicons name="timer-outline" size={14} color={sc} />
                  <Text style={[styles.nextActivityCountdownText, { color: sc }]}>
                    بعد {getCountdown(nextActivity.date, nextActivity.time)}
                  </Text>
                </View>
                <View style={styles.nextActivityMetaItem}>
                  <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.nextActivityMetaText, { color: colors.mutedForeground }]}>{nextActivity.time}</Text>
                </View>
              </View>

              <View style={styles.nextActivityMeta}>
                <View style={styles.nextActivityMetaItem}>
                  <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.nextActivityMetaText, { color: colors.mutedForeground }]}>{nextActivity.venue}</Text>
                </View>
                <View style={[styles.nextActivityPlayerPill, { backgroundColor: sc + "15" }]}>
                  <Ionicons name="people-outline" size={12} color={sc} />
                  <Text style={[styles.nextActivityPlayerText, { color: sc }]}>
                    {nextActivity.players.length}/{nextActivity.maxPlayers}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        ) : backendNextMatch ? (
          <Pressable
            style={[styles.nextActivityCard, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/match-details", params: { id: backendNextMatch.id } })}
          >
            <View style={[styles.nextActivityAccent, { backgroundColor: sc }]} />
            <View style={styles.nextActivityContent}>
              <View style={styles.nextActivityTop}>
                <View style={[styles.nextActivityIconBox, { backgroundColor: sc + "18" }]}>
                  <BackendMatchSportIcon size={22} color={sc} />
                </View>
                <View style={styles.nextActivityInfo}>
                  <Text style={[styles.nextActivityLabel, { color: colors.mutedForeground }]}>
                    المباراة القادمة
                  </Text>
                  <Text style={[styles.nextActivityTitle, { color: colors.onSurface }]}>{backendNextMatch.title}</Text>
                </View>
                <View style={[styles.nextActivityDateBadge, { backgroundColor: sc + "15" }]}>
                  <Text style={[styles.nextActivityDateText, { color: sc }]}>{formatDate(new Date(backendNextMatch.date))}</Text>
                </View>
              </View>
              <View style={[styles.nextActivityCountdownRow, { backgroundColor: sc + "10" }]}>
                <View style={styles.nextActivityMetaItem}>
                  <Ionicons name="timer-outline" size={14} color={sc} />
                  <Text style={[styles.nextActivityCountdownText, { color: sc }]}>
                    بعد {getCountdown(new Date(backendNextMatch.date), backendNextMatch.time)}
                  </Text>
                </View>
                <View style={styles.nextActivityMetaItem}>
                  <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.nextActivityMetaText, { color: colors.mutedForeground }]}>{backendNextMatch.time}</Text>
                </View>
              </View>
              <View style={styles.nextActivityMeta}>
                <View style={[styles.nextActivityPlayerPill, { backgroundColor: sc + "15" }]}>
                  <Ionicons name="people-outline" size={12} color={sc} />
                  <Text style={[styles.nextActivityPlayerText, { color: sc }]}>
                    {backendNextMatch.playerCount}/{backendNextMatch.maxPlayers}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={[styles.nextActivityCard, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
            <View style={[styles.nextActivityAccent, { backgroundColor: colors.mutedForeground + "50" }]} />
            <View style={[styles.nextActivityContent, { alignItems: "center", justifyContent: "center", paddingVertical: 8 }]}>
              <Ionicons name="calendar-outline" size={24} color={colors.mutedForeground} />
              <Text style={{ fontFamily: "Cairo_600SemiBold", fontSize: 14, color: colors.mutedForeground, marginTop: 6 }}>
                لا توجد مباريات قادمة
              </Text>
            </View>
          </View>
        )}

        {activeTab === "members" && (
          <View style={[styles.section, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                الأعضاء ({groupSafe.memberCount})
              </Text>
              {isAdmin && (
                <SportGradientButton
                  label="دعوة أعضاء"
                  gradientStart={colors.primary}
                  gradientEnd={colors.primary + "BB"}
                  onPress={() => setInviteModalVisible(true)}
                  style={{ borderRadius: 20 }}
                />
              )}
            </View>

            {group.members.map((member) => {
              const relColor = reliabilityColor(member.reliability, colors);
              const isCurrentUser = member.id === currentUserId;
              const memberRole = member.role ?? (member.id === group.adminId ? "owner" : "member");
              const isOwnerMember = memberRole === "owner";
              const isAdminMember = memberRole === "admin";
              return (
                <View
                  key={member.id}
                  style={[styles.memberCard, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 16 }]}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: sc + "20" }]}>
                    <Text style={[styles.memberInitial, { color: sc }]}>{member.nickname.charAt(0)}</Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberName, { color: colors.onSurface }]}>{member.nickname}</Text>
                      {isOwnerMember && (
                        <View style={[styles.adminBadge, { backgroundColor: colors.warning + "20" }]}>
                          <Ionicons name="star" size={11} color={colors.warning} />
                          <Text style={[styles.adminBadgeText, { color: colors.warning }]}>مالك</Text>
                        </View>
                      )}
                      {isAdminMember && (
                        <View style={[styles.adminBadge, { backgroundColor: colors.primary + "20" }]}>
                          <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
                          <Text style={[styles.adminBadgeText, { color: colors.primary }]}>مشرف</Text>
                        </View>
                      )}
                      {!isOwnerMember && !isAdminMember && (
                        <View style={[styles.adminBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
                          <Text style={[styles.adminBadgeText, { color: colors.mutedForeground }]}>عضو</Text>
                        </View>
                      )}
                      {isCurrentUser && (
                        <View style={[styles.youBadge, { backgroundColor: sc + "20" }]}>
                          <Text style={[styles.youBadgeText, { color: sc }]}>أنت</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.relPill, { backgroundColor: relColor + "18" }]}>
                      <View style={[styles.relDot, { backgroundColor: relColor }]} />
                      <Text style={[styles.relPillText, { color: relColor }]}>
                        {formatReliability(member.reliability, member.matchesPlayed)}
                      </Text>
                    </View>
                  </View>

                  {isAdmin && !isCurrentUser && !isOwnerMember && (
                    <Pressable
                      style={[styles.removeBtn, { backgroundColor: colors.destructive + "15" }]}
                      onPress={() => handleRemoveMember(member.id, member.nickname)}
                    >
                      <Ionicons name="person-remove-outline" size={16} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
              );
            })}

            {group.memberCount > group.members.length && (
              <Text style={[styles.moreMembers, { color: colors.mutedForeground }]}>
                و {group.memberCount - group.members.length} عضو آخر...
              </Text>
            )}
          </View>
        )}

        {activeTab === "matches" && (
          <View style={[styles.section, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>المباريات</Text>
              {isAdmin && (
                <Pressable
                  style={[styles.addBtn, { backgroundColor: sc + "18" }]}
                  onPress={() => router.push({ pathname: "/create-match", params: { type: "match", groupId: id } })}
                >
                  <Ionicons name="add-circle-outline" size={15} color={sc} />
                  <Text style={[styles.addBtnText, { color: sc }]}>إضافة مباراة</Text>
                </Pressable>
              )}
            </View>
            {groupMatches.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="football-outline" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyStateText, { color: colors.mutedForeground }]}>لا توجد مباريات قادمة</Text>
              </View>
            ) : (
              groupMatches.map((m) => {
                const isFull = m.players.length >= m.maxPlayers;
                return (
                  <View key={m.id} style={styles.groupMatchItem}>
                    <MatchCard
                      match={m}
                      onPress={() => router.push({ pathname: "/match-details", params: { id: m.id } })}
                    />
                    {!m.joinedByCurrentUser ? (
                      <SportGradientButton
                        label={isFull ? "مكتمل" : "انضم"}
                        gradientStart={isFull ? colors.surfaceContainerHigh : sc}
                        gradientEnd={isFull ? colors.surfaceContainer : sc + "BB"}
                        onPress={() => !isFull && handleJoinSession(m.id, m.title)}
                        disabled={isFull}
                        style={{ alignSelf: "flex-end" }}
                      />
                    ) : (
                      <View style={[styles.joinedPill, { backgroundColor: sc + "18", alignSelf: "flex-end" }]}>
                        <Ionicons name="checkmark-circle" size={14} color={sc} />
                        <Text style={[styles.joinedPillText, { color: sc }]}>مسجل</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab !== "chat" && (
          <View style={[styles.section, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>نبذة عن المجموعة</Text>
            <Text style={[styles.desc, { color: colors.onSurfaceVariant }]}>{groupSafe.description}</Text>
            <View style={styles.adminRow}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={[styles.adminText, { color: colors.mutedForeground }]}>يُدار بواسطة {groupSafe.adminName}</Text>
            </View>
          </View>
        )}

        {activeTab === "chat" && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={120}
          >
            <View style={[styles.section, { backgroundColor: colors.background, minHeight: 320, borderWidth: 1, borderColor: colors.border }]}>
              <View style={styles.sectionHeaderRow}>
                <Pressable
                  style={[styles.expandChatBtn, { backgroundColor: sc + "15" }]}
                  onPress={() =>
                    router.push({
                      pathname: "/group-chat",
                      params: { groupId: groupSafe.id, groupName: groupSafe.name, sport: groupSafe.sport },
                    })
                  }
                >
                  <Ionicons name="expand-outline" size={14} color={sc} />
                  <Text style={[styles.expandChatBtnText, { color: sc }]}>شاشة كاملة</Text>
                </Pressable>
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>دردشة المجموعة</Text>
              </View>

              {!isMember ? (
                <View style={styles.chatEmpty}>
                  <View style={[styles.chatLockIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Ionicons name="lock-closed-outline" size={28} color={colors.mutedForeground} />
                  </View>
                  <Text style={[styles.chatEmptyText, { color: colors.mutedForeground }]}>
                    انضم للمجموعة للوصول إلى الدردشة
                  </Text>
                </View>
              ) : chatLoading ? (
                <View style={[styles.chatEmpty, { minHeight: 180 }]}>
                  <ActivityIndicator size="small" color={sc} />
                  <Text style={[styles.chatEmptyText, { color: colors.mutedForeground }]}>جاري تحميل الرسائل...</Text>
                </View>
              ) : (
                <>
                  <ScrollView
                    ref={chatScrollRef}
                    style={{ maxHeight: 320 }}
                    contentContainerStyle={{ gap: 6, paddingBottom: 8, paddingHorizontal: 4 }}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
                    refreshControl={
                      <RefreshControl
                        refreshing={chatRefreshing}
                        onRefresh={async () => {
                          setChatRefreshing(true);
                          await loadChatMessages(id, true);
                          setChatRefreshing(false);
                          setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: false }), 100);
                        }}
                        tintColor={sc}
                      />
                    }
                  >
                    {chatMessages.length === 0 ? (
                      <View style={styles.chatEmpty}>
                        <View style={[styles.chatLockIcon, { backgroundColor: sc + "12" }]}>
                          <Ionicons name="chatbubbles-outline" size={28} color={sc} />
                        </View>
                        <Text style={[styles.chatEmptyText, { color: colors.mutedForeground }]}>
                          لا توجد رسائل بعد. كن أول من يبدأ المحادثة!
                        </Text>
                      </View>
                    ) : (
                      chatMessages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        return (
                          <View
                            key={msg.id}
                            style={[styles.chatBubbleRow, isMe && styles.chatBubbleRowMe]}
                          >
                            {!isMe && (
                              <View style={[styles.chatAvatar, { backgroundColor: sc + "20" }]}>
                                <Text style={[styles.chatAvatarText, { color: sc }]}>{msg.senderName.charAt(0)}</Text>
                              </View>
                            )}
                            <View style={[
                              styles.chatBubble,
                              isMe
                                ? { backgroundColor: sc, borderBottomEndRadius: 4 }
                                : { backgroundColor: colors.surfaceContainerLow, borderColor: "#E5E7EB", borderWidth: 1, borderBottomStartRadius: 4 }
                            ]}>
                              {!isMe && (
                                <Text style={[styles.chatSender, { color: sc }]}>{msg.senderName}</Text>
                              )}
                              <Text style={[styles.chatText, { color: isMe ? "#fff" : colors.onSurface }]}>{msg.text}</Text>
                              <Text style={[styles.chatTime, { color: isMe ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
                                {msg.time.getHours().toString().padStart(2, "0")}:{msg.time.getMinutes().toString().padStart(2, "0")}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                  <View style={[styles.chatInputRow, { backgroundColor: colors.surfaceContainerLow, borderTopColor: "#E5E7EB", borderTopWidth: 1 }]}>
                    <Pressable
                      style={[
                        styles.chatSendBtn,
                        { backgroundColor: (chatInput.trim() && !chatSending) ? sc : colors.surfaceContainerHigh }
                      ]}
                      onPress={handleSendChat}
                      disabled={!chatInput.trim() || chatSending}
                    >
                      {chatSending ? (
                        <ActivityIndicator size="small" color={sc} />
                      ) : (
                        <Ionicons
                          name="send"
                          size={16}
                          color={chatInput.trim() ? "#fff" : colors.mutedForeground}
                          style={{ transform: [{ scaleX: -1 }] }}
                        />
                      )}
                    </Pressable>
                    <TextInput
                      style={[styles.chatInput, { color: colors.onSurface, fontFamily: "Cairo_400Regular", backgroundColor: "#fff", borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 20 }]}
                      value={chatInput}
                      onChangeText={setChatInput}
                      placeholder="اكتب رسالة..."
                      placeholderTextColor={colors.mutedForeground}
                      textAlign="right"
                      returnKeyType="send"
                      onSubmitEditing={handleSendChat}
                      multiline={false}
                      editable={!chatSending}
                    />
                  </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 12, backgroundColor: colors.background }]}>
        {group.isJoined ? (
          isOwner ? (
            <SportGradientButton
              label="إدارة المجموعة"
              gradientStart={colors.primary}
              gradientEnd={colors.primary + "BB"}
              onPress={() => router.push({ pathname: "/group-management", params: { id: groupSafe.id } })}
              style={{ flex: 1 }}
            />
          ) : (
            <SportGradientButton
              label="مغادرة المجموعة"
              gradientStart={colors.destructive}
              gradientEnd={colors.destructive + "BB"}
              onPress={() => {
                Alert.alert("مغادرة المجموعة", `هل أنت متأكد من مغادرة مجموعة "${group.name}"؟`, [
                  { text: "إلغاء", style: "cancel" },
                  {
                    text: "مغادرة",
                    style: "destructive",
                    onPress: () => {
                      leaveGroup(group.id);
                      router.back();
                    },
                  },
                ]);
              }}
              style={{ flex: 1 }}
            />
          )
        ) : (
          <SportGradientButton
            label="انضم للمجموعة"
            gradientStart={colors.primary}
            gradientEnd={colors.primary + "BB"}
            onPress={handleJoinGroup}
            style={{ flex: 1 }}
          />
        )}
      </View>

      {toast.visible && (
        <View style={[styles.toast, { backgroundColor: colors.success }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setInviteModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.onSurface} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>دعوة عضو جديد</Text>
            </View>

            <Pressable
              style={[styles.shareLinkBtn, { backgroundColor: sc + "18", borderColor: sc + "40" }]}
              onPress={() => {
                setInviteModalVisible(false);
                handleShareInviteLink();
              }}
            >
              <Ionicons name="link-outline" size={18} color={sc} />
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={[styles.shareLinkBtnText, { color: sc }]}>مشاركة رابط دعوة</Text>
                <Text style={[styles.shareLinkBtnSub, { color: colors.mutedForeground }]}>صالح 30 يوماً</Text>
              </View>
              <Ionicons name="share-outline" size={16} color={sc} />
            </Pressable>

            <View style={[styles.modalDivider, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Text style={[styles.modalDividerText, { color: colors.mutedForeground }]}>أو دعوة مباشرة</Text>
            </View>

            {invitablePlayers.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="people-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.modalEmptyText, { color: colors.mutedForeground }]}>
                  لا يوجد لاعبون متاحون للدعوة
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalList}>
                {invitablePlayers.map((player) => {
                  const relColor = reliabilityColor(player.reliability, colors);
                  return (
                    <View
                      key={player.id}
                      style={[styles.invitePlayerRow, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginBottom: 10 }]}
                    >
                      <View style={[styles.inviteAvatar, { backgroundColor: sc + "20" }]}>
                        <Text style={[styles.memberInitial, { color: sc }]}>{player.nickname.charAt(0)}</Text>
                      </View>
                      <View style={styles.invitePlayerInfo}>
                        <Text style={[styles.invitePlayerName, { color: colors.onSurface }]}>{player.nickname}</Text>
                        <View style={[styles.relPill, { backgroundColor: relColor + "18" }]}>
                          <View style={[styles.relDot, { backgroundColor: relColor }]} />
                          <Text style={[styles.relPillText, { color: relColor }]}>
                            {formatReliability(player.reliability, player.matchesPlayed)}
                          </Text>
                        </View>
                      </View>
                      <SportGradientButton
                        label="دعوة"
                        gradientStart={sc}
                        gradientEnd={sc + "BB"}
                        onPress={() => {
                          inviteMemberToGroup(group.id, player);
                          setInviteModalVisible(false);
                          showToast(`تمت دعوة ${player.nickname} بنجاح ✓`);
                        }}
                        style={{ borderRadius: 20 }}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerGroupInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerGroupText: {
    flex: 1,
    gap: 3,
    alignItems: "flex-end",
  },
  headerGroupName: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },
  headerBadgesRow: {
    flexDirection: "row",
    gap: 5,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 50,
  },
  headerPillText: { fontSize: 10, fontFamily: "Cairo_600SemiBold" },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  tabContainer: {
    flexDirection: "row",
    borderRadius: 30,
    padding: 4,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
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

  scroll: { paddingHorizontal: 16, gap: 14, paddingTop: 16 },

  nextActivityCard: {
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
  },
  nextActivityAccent: {
    width: 5,
    borderTopStartRadius: 0,
    borderBottomStartRadius: 0,
  },
  nextActivityContent: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  nextActivityTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nextActivityIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  nextActivityInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  nextActivityLabel: { fontSize: 11, fontFamily: "Cairo_400Regular" },
  nextActivityTitle: { fontSize: 16, fontFamily: "Cairo_700Bold", textAlign: "right" },
  nextActivityDateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  nextActivityDateText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  nextActivityMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "flex-end",
  },
  nextActivityMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  nextActivityMetaText: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  nextActivityPlayerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 50,
  },
  nextActivityPlayerText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  nextActivityCountdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  nextActivityCountdownText: { fontSize: 13, fontFamily: "Cairo_700Bold" },

  section: { borderRadius: 22, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Cairo_700Bold", textAlign: "right" },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInitial: { fontSize: 18, fontFamily: "Cairo_700Bold" },
  memberInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberName: { fontSize: 15, fontFamily: "Cairo_600SemiBold" },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 50,
  },
  adminBadgeText: { fontSize: 10, fontFamily: "Cairo_700Bold" },
  youBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 50,
  },
  youBadgeText: { fontSize: 10, fontFamily: "Cairo_700Bold" },
  relPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 50,
  },
  relDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  relPillText: { fontSize: 11, fontFamily: "Cairo_700Bold" },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  moreMembers: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "center" },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 50,
  },
  addBtnText: { fontSize: 13, fontFamily: "Cairo_700Bold" },

  emptyState: { alignItems: "center", gap: 10, paddingVertical: 24 },
  emptyStateText: { fontSize: 13, fontFamily: "Cairo_400Regular" },

  groupMatchItem: {
    gap: 8,
    marginBottom: 4,
  },
  joinedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
  },
  joinedPillText: { fontSize: 11, fontFamily: "Cairo_700Bold" },

  desc: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
    lineHeight: 22,
  },
  adminRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  adminText: { fontSize: 13, fontFamily: "Cairo_400Regular" },

  footer: { paddingHorizontal: 16, paddingTop: 10 },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(33, 37, 41, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
    padding: 20,
    maxHeight: "70%",
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontFamily: "Cairo_700Bold" },
  modalEmpty: { alignItems: "center", gap: 12, paddingVertical: 40 },
  modalEmptyText: { fontSize: 14, fontFamily: "Cairo_400Regular" },
  modalList: { maxHeight: 400 },
  invitePlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  inviteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  invitePlayerInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
  invitePlayerName: { fontSize: 15, fontFamily: "Cairo_600SemiBold" },

  shareLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  shareLinkBtnText: { fontSize: 15, fontFamily: "Cairo_700Bold" },
  shareLinkBtnSub: { fontSize: 11, fontFamily: "Cairo_400Regular" },
  modalDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: "center",
  },
  modalDividerText: { fontSize: 12, fontFamily: "Cairo_400Regular" },

  chatLockIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  chatEmpty: { alignItems: "center", gap: 12, paddingVertical: 32 },
  chatEmptyText: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "center", lineHeight: 22, maxWidth: "80%" },
  chatBubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  chatBubbleRowMe: { flexDirection: "row-reverse" },
  chatAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  chatAvatarText: { fontSize: 14, fontFamily: "Cairo_700Bold" },
  chatBubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 3 },
  chatSender: { fontSize: 11, fontFamily: "Cairo_700Bold" },
  chatText: { fontSize: 14, fontFamily: "Cairo_400Regular", lineHeight: 20, textAlign: "right" },
  chatTime: { fontSize: 10, fontFamily: "Cairo_400Regular" },
  chatInputRow: { flexDirection: "row", alignItems: "center", borderRadius: 28, paddingHorizontal: 8, paddingVertical: 6, gap: 8, marginTop: 8 },
  chatInput: { flex: 1, fontSize: 14, paddingHorizontal: 12, paddingVertical: 8 },
  chatSendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },

  expandChatBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50 },
  expandChatBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
});
