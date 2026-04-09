import { useApp, sportLabel, type SportType } from "@/context/AppContext";
import { api } from "@/services/api";
import { useColors } from "@/hooks/useColors";


import { Ionicons } from "@expo/vector-icons";

import { router, useLocalSearchParams, type RelativePathString } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type InviteGroupInfo = {
  id: string;
  name: string;
  sport: string;
  description: string;
  memberCount: number;
  adminName: string;
  isPublic: boolean;
  isJoined: boolean;
};

type InviteMatchInfo = {
  id: string;
  title: string;
  sport: string;
  date: string;
  time: string;
  venue: string;
  maxPlayers: number;
  playerCount: number;
  organizerName: string;
  isPublic: boolean;
  isJoined: boolean;
};

type InviteData =
  | { targetType: "group"; info: InviteGroupInfo }
  | { targetType: "match"; info: InviteMatchInfo };

function isSportType(s: string): s is SportType {
  return ["football", "padel", "tennis"].includes(s);
}

function getSport(sport: string): SportType {
  return isSportType(sport) ? sport : "football";
}

export default function InviteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { acceptInvite, user } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("رابط الدعوة غير صالح");
      setLoading(false);
      return;
    }
    api.getInvite(token).then((res) => {
      if (res.success && res.invite.targetType === "group" && res.invite.group) {
        setInviteData({ targetType: "group", info: res.invite.group as InviteGroupInfo });
      } else if (res.success && res.invite.targetType === "match" && res.invite.match) {
        setInviteData({ targetType: "match", info: res.invite.match as InviteMatchInfo });
      } else {
        setError("رابط الدعوة غير صالح أو منتهي الصلاحية");
      }
    }).catch((err: Error) => {
      const msg = err?.message ?? "رابط الدعوة غير صالح أو منتهي الصلاحية";
      setError(msg);
    }).finally(() => setLoading(false));
  }, [token]);

  async function refetchInvite() {
    if (!token) return;
    try {
      const res = await api.getInvite(token);
      if (res.success && res.invite.targetType === "group" && res.invite.group) {
        setInviteData({ targetType: "group", info: res.invite.group as InviteGroupInfo });
      } else if (res.success && res.invite.targetType === "match" && res.invite.match) {
        setInviteData({ targetType: "match", info: res.invite.match as InviteMatchInfo });
      }
    } catch { }
  }

  async function handleAccept() {
    if (!token || !inviteData) return;
    setAccepting(true);
    try {
      const result = await acceptInvite(token);
      if (result.success) {
        setAccepted(true);
      } else {
        setError(result.error ?? "فشل قبول الدعوة، يرجى المحاولة مجدداً");
        await refetchInvite();
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "فشل قبول الدعوة";
      setError(errorMsg);
    } finally {
      setAccepting(false);
    }
  }

  async function goToGroups() {
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_INVITE_TOKEN);
    router.replace("/groups" as RelativePathString);
  }

  function goToGroupDetail(groupId: string) {
    router.push({
      pathname: "/group-detail" as RelativePathString,
      params: { id: groupId },
    });
  }

  function goToMatchDetail(matchId: string) {
    router.push({
      pathname: "/match-details" as RelativePathString,
      params: { id: matchId },
    });
  }

  const sport = inviteData ? getSport(inviteData.info.sport) : "football";

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: "transparent", alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>جاري تحميل الدعوة...</Text>
      </View>
    );
  }

  if (accepted && inviteData) {
    const isGroup = inviteData.targetType === "group";
    const name = isGroup
      ? (inviteData.info as InviteGroupInfo).name
      : (inviteData.info as InviteMatchInfo).title;

    return (
      <View style={[styles.container, { backgroundColor: "transparent", alignItems: "center", justifyContent: "center", gap: 20, paddingHorizontal: 24 }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.onSurface }]}>
          {isGroup ? "أهلاً بك في المجموعة!" : "تم تسجيلك في المباراة!"}
        </Text>
        <Text style={[styles.successDesc, { color: colors.mutedForeground }]}>
          {isGroup
            ? `انضممت بنجاح إلى مجموعة "${name}"`
            : `تم تسجيلك في مباراة "${name}"`
          }
        </Text>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (isGroup) {
              goToGroupDetail((inviteData.info as InviteGroupInfo).id);
            } else {
              goToMatchDetail((inviteData.info as InviteMatchInfo).id);
            }
          }}
        >
          <Text style={styles.primaryBtnText}>
            {isGroup ? "عرض المجموعة" : "عرض المباراة"}
          </Text>
        </Pressable>
        <Pressable onPress={goToGroups}>
          <Text style={[styles.secondaryBtn, { color: colors.mutedForeground }]}>العودة للرئيسية</Text>
        </Pressable>
      </View>
    );
  }

  if (!inviteData) {
    return (
      <View style={[styles.container, { backgroundColor: "transparent", alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24 }]}>
        <View style={[styles.errorIcon, { backgroundColor: colors.destructive + "18" }]}>
          <Ionicons name="link-outline" size={48} color={colors.destructive} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.onSurface }]}>رابط الدعوة غير صالح</Text>
        <Text style={[styles.errorDesc, { color: colors.mutedForeground }]}>
          {error ?? "هذا الرابط غير صالح أو منتهي الصلاحية"}
        </Text>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={goToGroups}
        >
          <Text style={styles.primaryBtnText}>تصفح المجموعات</Text>
        </Pressable>
      </View>
    );
  }

  const isGroup = inviteData.targetType === "group";
  const groupInfo = isGroup ? (inviteData.info as InviteGroupInfo) : null;
  const matchInfo = !isGroup ? (inviteData.info as InviteMatchInfo) : null;
  const isAlreadyMember = inviteData.info.isJoined;
  const isMatchFull = !isGroup && matchInfo != null && matchInfo.playerCount >= matchInfo.maxPlayers;

  return (
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      <View style={[styles.hero, { paddingTop: topPad + 16, backgroundColor: "#2C54E8" }]}>
        <Pressable
          style={styles.backBtn}
          onPress={async () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              await goToGroups();
            }
          }}
        >
          <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={24} color="#fff" />
        </Pressable>

        <View style={[styles.heroIcon, { backgroundColor: "#ffffff30" }]}>
          <Ionicons name={isGroup ? "people" : "football"} size={40} color="#fff" />
        </View>

        <Text style={styles.inviteLabel}>
          {isGroup ? "دُعيت للانضمام إلى مجموعة" : "دُعيت للمشاركة في مباراة"}
        </Text>
        <Text style={styles.heroName}>
          {isGroup ? groupInfo!.name : matchInfo!.title}
        </Text>

        <View style={styles.heroBadgesRow}>
          {isGroup && groupInfo ? (
            <>
              <View style={[styles.heroPill, { backgroundColor: "#ffffff25" }]}>
                <Ionicons name="people-outline" size={13} color="#fff" />
                <Text style={styles.heroPillText}>{groupInfo.memberCount} عضو</Text>
              </View>
              <View style={[styles.heroPill, { backgroundColor: "#ffffff25" }]}>
                <Text style={styles.heroPillText}>{sportLabel(sport)}</Text>
              </View>
              {!groupInfo.isPublic && (
                <View style={[styles.heroPill, { backgroundColor: "#ffffff25" }]}>
                  <Ionicons name="lock-closed" size={12} color="#fff" />
                  <Text style={styles.heroPillText}>خاصة</Text>
                </View>
              )}
            </>
          ) : matchInfo ? (
            <>
              <View style={[styles.heroPill, { backgroundColor: "#ffffff25" }]}>
                <Ionicons name="people-outline" size={13} color="#fff" />
                <Text style={styles.heroPillText}>{matchInfo.playerCount}/{matchInfo.maxPlayers}</Text>
              </View>
              <View style={[styles.heroPill, { backgroundColor: "#ffffff25" }]}>
                <Text style={styles.heroPillText}>{sportLabel(sport)}</Text>
              </View>
              <View style={[styles.heroPill, { backgroundColor: "#ffffff25" }]}>
                <Ionicons name="calendar-outline" size={12} color="#fff" />
                <Text style={styles.heroPillText}>{matchInfo.date}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <View style={[styles.body, { paddingBottom: botPad + 20 }]}>
        <View style={[styles.card, { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" }]}>
          {isGroup && groupInfo ? (
            <>
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>يُدار بواسطة</Text>
                <Text style={[styles.cardValue, { color: colors.onSurface }]}>{groupInfo.adminName}</Text>
              </View>
              {groupInfo.description ? (
                <View style={styles.cardRow}>
                  <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>نبذة</Text>
                  <Text style={[styles.cardValue, { color: colors.onSurface }]} numberOfLines={3}>{groupInfo.description}</Text>
                </View>
              ) : null}
            </>
          ) : matchInfo ? (
            <>
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>المنظّم</Text>
                <Text style={[styles.cardValue, { color: colors.onSurface }]}>{matchInfo.organizerName}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>الملعب</Text>
                <Text style={[styles.cardValue, { color: colors.onSurface }]}>{matchInfo.venue}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>الوقت</Text>
                <Text style={[styles.cardValue, { color: colors.onSurface }]}>{matchInfo.time}</Text>
              </View>
            </>
          ) : null}
        </View>

        {isAlreadyMember ? (
          <View style={[styles.alreadyMemberBanner, { backgroundColor: colors.success + "18" }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            <Text style={[styles.alreadyMemberText, { color: colors.success }]}>
              {isGroup ? "أنت عضو بالفعل في هذه المجموعة" : "أنت مسجل بالفعل في هذه المباراة"}
            </Text>
          </View>
        ) : null}

        {isMatchFull && !isAlreadyMember ? (
          <View style={[styles.alreadyMemberBanner, { backgroundColor: colors.destructive + "18" }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.destructive} />
            <Text style={[styles.alreadyMemberText, { color: colors.destructive }]}>
              المباراة مكتملة — لا توجد أماكن متاحة
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.alreadyMemberBanner, { backgroundColor: colors.destructive + "18" }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
            <Text style={[styles.alreadyMemberText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {!user ? (
          <>
            <View style={[styles.loginBanner, { backgroundColor: colors.warning + "18", borderRadius: 14 }]}>
              <Ionicons name="person-outline" size={16} color={colors.warning} />
              <Text style={[styles.loginBannerText, { color: colors.warning }]}>يرجى تسجيل الدخول لقبول الدعوة</Text>
            </View>
            <Pressable
              style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
              onPress={async () => {
                if (token) {
                  await AsyncStorage.setItem(STORAGE_KEYS.PENDING_INVITE_TOKEN, token);
                }
                router.push({ pathname: "/phone" as RelativePathString });
              }}
            >
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.acceptBtnText}>تسجيل الدخول</Text>
            </Pressable>
          </>
        ) : null}

        {!isAlreadyMember && user && !isMatchFull ? (
          <Pressable
            style={[styles.acceptBtn, { backgroundColor: accepting ? colors.primary + "80" : colors.primary }]}
            onPress={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.acceptBtnText}>
                  {isGroup ? "قبول الدعوة والانضمام" : "قبول الدعوة والمشاركة"}
                </Text>
              </>
            )}
          </Pressable>
        ) : isAlreadyMember ? (
          <Pressable
            style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (isGroup && groupInfo) goToGroupDetail(groupInfo.id);
              else if (matchInfo) goToMatchDetail(matchInfo.id);
            }}
          >
            <Ionicons name="arrow-forward-outline" size={18} color="#fff" />
            <Text style={styles.acceptBtnText}>
              {isGroup ? "عرض المجموعة" : "عرض المباراة"}
            </Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.cancelBtn} onPress={goToGroups}>
          <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>رفض الدعوة</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { fontSize: 14, fontFamily: "Cairo_400Regular", marginTop: 12 },

  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    alignSelf: "flex-start",
    padding: 4,
    marginBottom: 8,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  inviteLabel: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  heroName: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
    textAlign: "center",
    lineHeight: 32,
  },
  heroBadgesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 4,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 50,
  },
  heroPillText: { fontSize: 12, fontFamily: "Cairo_600SemiBold", color: "#fff" },

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardRow: {
    gap: 4,
    alignItems: "flex-end",
  },
  cardLabel: { fontSize: 11, fontFamily: "Cairo_400Regular" },
  cardValue: { fontSize: 15, fontFamily: "Cairo_600SemiBold", textAlign: "right" },

  alreadyMemberBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: "flex-end",
  },
  alreadyMemberText: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },

  loginBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "flex-end",
  },
  loginBannerText: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },

  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 8,
  },
  acceptBtnText: { fontSize: 16, fontFamily: "Cairo_700Bold", color: "#fff" },

  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: { fontSize: 14, fontFamily: "Cairo_400Regular" },

  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 22, fontFamily: "Cairo_700Bold", textAlign: "center" },
  successDesc: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "center", lineHeight: 22 },

  errorIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: { fontSize: 20, fontFamily: "Cairo_700Bold", textAlign: "center" },
  errorDesc: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "center", lineHeight: 22 },

  primaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
  },
  primaryBtnText: { fontSize: 15, fontFamily: "Cairo_700Bold", color: "#fff" },

  secondaryBtn: { fontSize: 14, fontFamily: "Cairo_400Regular" },
});
