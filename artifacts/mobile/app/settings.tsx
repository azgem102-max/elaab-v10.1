import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/i18n";
import { typography } from "@/constants/typography";
import themeColors from "@/constants/colors";
import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { FootballIcon, PadelIcon, TennisIcon } from "@/components/icons/SportIcons";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  I18nManager,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, SkillLevel, SportType } from "@/context/AppContext";
import { api } from "@/services/api";
import { SportGradientButton } from "@/components/SportGradientButton";
import { LevelPickerSheet, getLevelLabel } from "@/components/LevelPickerSheet";
import { NOTIF_PERMISSION_KEY } from "@/hooks/usePushNotifications";

const NOTIF_KEY = "@elab_notif_settings";

import { getSportTheme } from "@/constants/sportTheme";

function getSportList(t: any) {
  return [
    { key: "football" as SportType, label: t("sports.football"), color: getSportTheme("football").primary, bg: getSportTheme("football").pillBackground, icon: FootballIcon },
    { key: "padel" as SportType, label: t("sports.padel"), color: getSportTheme("padel").primary, bg: getSportTheme("padel").pillBackground, icon: PadelIcon },
    { key: "tennis" as SportType, label: t("sports.tennis"), color: getSportTheme("tennis").primary, bg: getSportTheme("tennis").pillBackground, icon: TennisIcon },
  ];
}

function getLevelsForSegments(t: any): SkillLevel[] {
  return [t("levels.beginner"), t("levels.intermediate"), t("levels.advanced")];
}

function getSportPositions(sport: SportType, t: any): { key: string; label: string }[] {
  const pos: Record<SportType, { key: string; label: string }[]> = {
    football: [
      { key: "حارس", label: t("positions.football.gk") },
      { key: "مدافع", label: t("positions.football.def") },
      { key: "وسط", label: t("positions.football.mid") },
      { key: "مهاجم", label: t("positions.football.fwd") },
    ],
    padel: [
      { key: "يمين", label: t("positions.padel.right") },
      { key: "يسار", label: t("positions.padel.left") },
    ],
    tennis: [
      { key: "خط الخلفية", label: t("positions.tennis.baseline") },
      { key: "الشبكة", label: t("positions.tennis.net") },
    ],
  };
  return pos[sport] || [];
}

function PillToggle({ value, onToggle, activeColor }: { value: boolean; onToggle: () => void; activeColor: string }) {
  const colors = useColors();
  const translateX = useRef(new Animated.Value(value ? 22 : 2)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 22 : 2,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  }, [value]);

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.pillTrack,
        { backgroundColor: value ? activeColor : colors.muted },
      ]}
      hitSlop={8}
    >
      <Animated.View style={[styles.pillThumb, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t, locale } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser, logout } = useApp();
  const params = useLocalSearchParams<{ scrollToAbout?: string; openEdit?: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, []);

  const [matchNotifs, setMatchNotifs] = useState(true);
  const [groupNotifs, setGroupNotifs] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(60);
  const [loaded, setLoaded] = useState(false);
  const [notifPermissionStatus, setNotifPermissionStatus] = useState<string | null>(null);
  const notifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNotifPatchRef = useRef<Partial<{ matchNotifs: boolean; groupNotifs: boolean }>>({});
  const [legalVisible, setLegalVisible] = useState(false);
  const [legalType, setLegalType] = useState<"terms" | "privacy">("terms");

  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editNickname, setEditNickname] = useState(user?.nickname ?? "");
  const [nicknameFocused, setNicknameFocused] = useState(false);
  const [editLevels, setEditLevels] = useState<Partial<Record<SportType, SkillLevel>>>({});
  const [editNumericLevels, setEditNumericLevels] = useState<Partial<Record<SportType, number>>>({});
  const [editPositions, setEditPositions] = useState<Partial<Record<SportType, string[]>>>({});
  const [editSports, setEditSports] = useState<SportType[]>(user?.sports ?? []);
  const [levelPickerSport, setLevelPickerSport] = useState<SportType | null>(null);
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(user?.avatarUri ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const [scrollToAbout, setScrollToAbout] = useState(params.scrollToAbout === "1");

  useEffect(() => {
    return () => {
      if (notifDebounceRef.current) clearTimeout(notifDebounceRef.current);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === "web") return;
      async function checkNotifPermission() {
        try {
          const Notifications = await import("expo-notifications");
          const { status } = await Notifications.getPermissionsAsync();
          setNotifPermissionStatus(status);
          if (status === "granted") {
            await AsyncStorage.removeItem(NOTIF_PERMISSION_KEY);
          }
        } catch {
        }
      }
      checkNotifPermission();
    }, [])
  );

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then(async (raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (typeof saved.matchNotifs === "boolean") setMatchNotifs(saved.matchNotifs);
          if (typeof saved.groupNotifs === "boolean") setGroupNotifs(saved.groupNotifs);
          if (typeof saved.soundEnabled === "boolean") setSoundEnabled(saved.soundEnabled);
          if (typeof saved.reminderMinutes === "number") setReminderMinutes(saved.reminderMinutes);
        } catch { }
      }
      setLoaded(true);
      try {
        const serverPrefs = await api.getNotificationSettings();
        setMatchNotifs(serverPrefs.matchNotifs);
        setGroupNotifs(serverPrefs.groupNotifs);
        const prevRaw = await AsyncStorage.getItem(NOTIF_KEY);
        let prev: Record<string, unknown> = {};
        try { if (prevRaw) prev = JSON.parse(prevRaw); } catch { }
        AsyncStorage.setItem(NOTIF_KEY, JSON.stringify({
          ...prev,
          matchNotifs: serverPrefs.matchNotifs,
          groupNotifs: serverPrefs.groupNotifs,
        }));
      } catch { }
    });
  }, []);

  function saveNotifSettings(patch: Partial<{ matchNotifs: boolean; groupNotifs: boolean; soundEnabled: boolean; reminderMinutes: number }>) {
    const next = { matchNotifs, groupNotifs, soundEnabled, reminderMinutes, ...patch };
    AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  }

  function syncNotifSettingsToServer(patch: Partial<{ matchNotifs: boolean; groupNotifs: boolean }>) {
    pendingNotifPatchRef.current = { ...pendingNotifPatchRef.current, ...patch };
    if (notifDebounceRef.current) clearTimeout(notifDebounceRef.current);
    notifDebounceRef.current = setTimeout(() => {
      const toSend = { ...pendingNotifPatchRef.current };
      pendingNotifPatchRef.current = {};
      api.updateNotificationSettings(toSend).catch(() => {});
    }, 800);
  }

  function handleToggle(key: "matchNotifs" | "groupNotifs" | "soundEnabled") {
    const map = {
      matchNotifs: { state: matchNotifs, setter: setMatchNotifs },
      groupNotifs: { state: groupNotifs, setter: setGroupNotifs },
      soundEnabled: { state: soundEnabled, setter: setSoundEnabled },
    };
    const { state, setter } = map[key];
    const next = !state;
    setter(next);
    saveNotifSettings({ [key]: next });
    if (key === "matchNotifs" || key === "groupNotifs") {
      syncNotifSettingsToServer({ [key]: next });
    }
  }

  function openEditProfile() {
    setEditNickname(user?.nickname ?? "");
    const sports = user?.sports ?? [];
    setEditSports(sports);
    const levels: Partial<Record<SportType, SkillLevel>> = {};
    const numericLevels: Partial<Record<SportType, number>> = {};
    const positions: Partial<Record<SportType, string[]>> = {};
    for (const s of sports) {
      levels[s] = (user?.sportProfiles[s]?.skillLevel ?? t("levels.intermediate")) as SkillLevel;
      const numeric = user?.sportProfiles[s]?.skillLevelNumeric;
      if (typeof numeric === "number") numericLevels[s] = numeric;
      positions[s] = user?.sportProfiles[s]?.position ?? [];
    }
    setEditLevels(levels);
    setEditNumericLevels(numericLevels);
    setEditPositions(positions);
    setEditAvatarUri(user?.avatarUri ?? null);
    setEditProfileVisible(true);
  }

  const didOpenEdit = useRef(false);
  useEffect(() => {
    if (params.openEdit === "1" && user && !didOpenEdit.current) {
      didOpenEdit.current = true;
      openEditProfile();
    }
  }, [params.openEdit, user]);

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("profile.edit.permsRequiredTitle"), t("profile.edit.permsRequiredDesc"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const localUri = result.assets[0].uri;
      const previousAvatarUri = editAvatarUri;
      setEditAvatarUri(localUri);
      setAvatarUploading(true);
      try {
        const formData = new FormData();
        formData.append("avatar", { uri: localUri, name: "avatar.jpg", type: "image/jpeg" } as never);
        const res = await api.uploadAvatar(formData);
        setEditAvatarUri(res.avatarUrl);
      } catch {
        setEditAvatarUri(previousAvatarUri);
        Alert.alert(t("profile.edit.errorTitle"), t("profile.edit.uploadError"));
      } finally {
        setAvatarUploading(false);
      }
    }
  }

  function toggleEditSport(sport: SportType) {
    setEditSports((prev) => {
      if (prev.includes(sport)) {
        if (prev.length <= 1) return prev;
        const next = prev.filter((s) => s !== sport);
        setEditLevels((lv) => { const c = { ...lv }; delete c[sport]; return c; });
        setEditNumericLevels((lv) => { const c = { ...lv }; delete c[sport]; return c; });
        setEditPositions((pos) => { const c = { ...pos }; delete c[sport]; return c; });
        return next;
      } else {
        setEditLevels((lv) => ({ ...lv, [sport]: (user?.sportProfiles[sport]?.skillLevel ?? t("levels.intermediate")) as SkillLevel }));
        const existingNumeric = user?.sportProfiles[sport]?.skillLevelNumeric;
        if (typeof existingNumeric === "number") {
          setEditNumericLevels((lv) => ({ ...lv, [sport]: existingNumeric }));
        } else if (sport === "padel" || sport === "tennis") {
          setTimeout(() => setLevelPickerSport(sport), 300);
        }
        setEditPositions((pos) => ({ ...pos, [sport]: user?.sportProfiles[sport]?.position ?? [] }));
        return [...prev, sport];
      }
    });
  }

  function numericToSkillLevel(value: number): SkillLevel {
    if (value <= 2.5) return t("levels.beginner") as SkillLevel;
    if (value <= 4.0) return t("levels.intermediate") as SkillLevel;
    return t("levels.advanced") as SkillLevel;
  }

  async function handleSaveProfile() {
    if (!user || !editNickname.trim()) return;
    setSaving(true);
    const updatedProfiles: Partial<Record<SportType, import("@/context/AppContext").SportProfile>> = {};
    for (const sport of editSports) {
      const numeric = editNumericLevels[sport] ?? user.sportProfiles[sport]?.skillLevelNumeric ?? null;
      const skillLevel = (editLevels[sport] ??
        (numeric ? numericToSkillLevel(numeric) : user.sportProfiles[sport]?.skillLevel ?? t("levels.intermediate"))) as SkillLevel;
      const position = editPositions[sport] ?? user.sportProfiles[sport]?.position ?? [];
      updatedProfiles[sport] = { sport, skillLevel, skillLevelNumeric: numeric, position };
    }
    const apiSportProfiles: Record<string, { sport: string; skillLevel: string; skillLevelNumeric?: number | null; position: string }> = {};
    for (const sport of editSports) {
      apiSportProfiles[sport] = {
        sport,
        skillLevel: updatedProfiles[sport]!.skillLevel,
        skillLevelNumeric: updatedProfiles[sport]!.skillLevelNumeric ?? null,
        position: (updatedProfiles[sport]!.position as string[]).join(","),
      };
    }
    const primaryLevel = editSports.length > 0
      ? ((editLevels[editSports[0]] ?? t("levels.intermediate")) as SkillLevel)
      : t("levels.intermediate") as SkillLevel;
    try {
      const res = await api.updateProfile({
        name: editNickname.trim(),
        sports: editSports,
        skillLevel: primaryLevel,
        sportProfiles: apiSportProfiles,
        avatarUrl: editAvatarUri ?? null,
      });
      if (res.user) {
        const VALID_SPORTS_SET = new Set(["football", "padel", "tennis"]);
        const serverSports = (res.user.sports ?? []).filter((s) => VALID_SPORTS_SET.has(s)) as SportType[];
        const mergedProfiles: Partial<Record<SportType, import("@/context/AppContext").SportProfile>> = { ...updatedProfiles };
        if (serverSports.length > 0) {
          for (const sport of serverSports) {
            const serverSp = (res.user.sportProfiles ?? {})[sport];
            const validLevels = [t("levels.beginner"), t("levels.intermediate"), t("levels.advanced")];
            const skillLevel = serverSp?.skillLevel && validLevels.includes(serverSp.skillLevel)
              ? (serverSp.skillLevel as SkillLevel)
              : mergedProfiles[sport]?.skillLevel ?? primaryLevel;
            const rawPos = serverSp?.position ?? "";
            const position: string[] = rawPos
              ? rawPos.split(",").map((p: string) => p.trim()).filter(Boolean)
              : mergedProfiles[sport]?.position ?? [];
            const skillLevelNumeric = typeof serverSp?.skillLevelNumeric === "number"
              ? serverSp.skillLevelNumeric
              : mergedProfiles[sport]?.skillLevelNumeric ?? null;
            mergedProfiles[sport] = { sport, skillLevel, skillLevelNumeric, position };
          }
          for (const sport of (Object.keys(mergedProfiles) as SportType[])) {
            if (!serverSports.includes(sport)) delete mergedProfiles[sport];
          }
        }
        setUser({
          ...user,
          nickname: res.user.name ?? editNickname.trim(),
          sports: serverSports.length > 0 ? serverSports : editSports,
          sportProfiles: mergedProfiles,
          avatarUri: editAvatarUri,
          reliability: res.user.reliability,
          matchesPlayed: res.user.matchesPlayed,
        });
      } else {
        setUser({ ...user, nickname: editNickname.trim(), sports: editSports, sportProfiles: updatedProfiles, avatarUri: editAvatarUri });
      }
      setEditProfileVisible(false);
    } catch {
      Alert.alert(t("profile.edit.errorTitle"), t("profile.edit.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleShareProfile() {
    const nickname = user?.nickname ?? "مستخدم";
    const userId = user?.id;
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const profileUrl = userId && domain ? `https://${domain}/api/profile/${userId}` : null;
    const message = profileUrl
      ? t("profile.share.msgWithUrl", { nickname, profileUrl })
      : t("profile.share.msgBrief", { nickname });
    try {
      await Share.share({
        message,
        title: t("profile.share.title", { nickname }),
        url: profileUrl ?? undefined,
      });
    } catch { }
  }

  function handleContactUs() {
    Linking.openURL(`mailto:support@elab.app?subject=${t("settings.about.contactSubject")}`).catch(() => {
      Alert.alert(t("profile.edit.errorTitle"), t("settings.about.contactError"));
    });
  }

  async function handleLogout() {
    if (Platform.OS === "web") {
      if (window.confirm(t("settings.logout.confirm"))) {
        await logout();
      }
      return;
    }
    Alert.alert(t("settings.logout.label"), t("settings.logout.confirm"), [
      { text: t("settings.logout.cancel"), style: "cancel" },
      {
        text: t("settings.logout.label"),
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  const notifItems = [
    { key: "matchNotifs" as const, label: t("settings.items.matches.label"), sub: t("settings.items.matches.sub"), value: matchNotifs, color: colors.primary },
    { key: "groupNotifs" as const, label: t("settings.items.groups.label"), sub: t("settings.items.groups.sub"), value: groupNotifs, color: colors.secondary },
    { key: "soundEnabled" as const, label: t("settings.items.sound.label"), sub: t("settings.items.sound.sub"), value: soundEnabled, color: colors.tertiary },
  ];

  return (
    <Animated.View style={[styles.container, { backgroundColor: "transparent", opacity: fadeAnim }]}>
      <GlassScreenHeader style={{ paddingTop: topPad + 8, paddingBottom: 8 }}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={[styles.title, { color: colors.onSurface }]}>{t("settings.title")}</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Ionicons name={locale === "ar" ? "chevron-forward" : "chevron-back"} size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </GlassScreenHeader>

      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]}
          showsVerticalScrollIndicator={false}
          onLayout={() => {
            if (scrollToAbout) {
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
              setScrollToAbout(false);
            }
          }}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionHeaderLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("settings.notifications")}</Text>
            <View style={[styles.sectionHeaderLine, { backgroundColor: colors.border }]} />
          </View>
          <View style={[styles.card, { backgroundColor: "#FFFFFF", borderWidth: 0 }]}>
            {Platform.OS !== "web" && notifPermissionStatus !== null && (
              <View style={styles.settingRow}>
                {notifPermissionStatus !== "granted" ? (
                  <Pressable
                    onPress={() => Linking.openSettings()}
                    style={[styles.openSettingsBtn, { backgroundColor: colors.warning + "20" }]}
                  >
                    <Ionicons name="settings-outline" size={14} color={colors.warning} />
                    <Text style={[styles.openSettingsBtnText, { color: colors.warning }]}>{t("common.manage")}</Text>
                  </Pressable>
                ) : (
                  <View style={[styles.permissionBadge, { backgroundColor: colors.success ? colors.success + "20" : "#22C55E20" }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  </View>
                )}
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: colors.onSurface }]}>{t("settings.notifPermission")}</Text>
                  <Text style={[styles.settingSub, { color: notifPermissionStatus === "granted" ? "#22C55E" : colors.warning }]}>
                    {notifPermissionStatus === "granted" ? t("settings.enabled") : t("settings.disabled")}
                  </Text>
                </View>
              </View>
            )}
            {loaded && notifItems.map((item, i) => {
              const notifIcons: Record<string, "football-outline" | "people-outline" | "volume-high-outline"> = {
                matchNotifs: "football-outline",
                groupNotifs: "people-outline",
                soundEnabled: "volume-high-outline",
              };
              return (
                <View key={item.key} style={styles.settingRow}>
                  <PillToggle
                    value={item.value}
                    onToggle={() => handleToggle(item.key)}
                    activeColor={item.color}
                  />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingLabel, { color: colors.onSurface }]}>{item.label}</Text>
                    <Text style={[styles.settingSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
                  </View>
                  <View style={[styles.notifIconCircle, { backgroundColor: item.color + "18" }]}>
                    <Ionicons name={notifIcons[item.key]} size={17} color={item.color} />
                  </View>
                </View>
              );
            })}
            {loaded && (
              <View style={[styles.settingRow]}>
                <View style={styles.reminderChips}>
                  {([15, 60, 1440, 2880] as const).map((mins) => {
                    // map mins to the available keys in ar.ts / en.ts
                    let key = "m15";
                    if (mins === 60) key = "h1";
                    if (mins === 1440) key = "d1";
                    if (mins === 2880) key = "d2";
                    const label = t(`settings.reminderTime.${key}`);
                    const active = reminderMinutes === mins;
                    return (
                      <Pressable
                        key={mins}
                        onPress={() => { setReminderMinutes(mins); saveNotifSettings({ reminderMinutes: mins }); }}
                        style={[styles.reminderChip, active && { backgroundColor: colors.primary }]}
                      >
                        <Text style={[styles.reminderChipText, { color: active ? "#fff" : colors.mutedForeground }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: colors.onSurface }]}>{t("settings.matchReminders")}</Text>
                  <Text style={[styles.settingSub, { color: colors.mutedForeground }]}>{t("settings.matchRemindersDesc")}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionHeaderLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("settings.account")}</Text>
            <View style={[styles.sectionHeaderLine, { backgroundColor: colors.border }]} />
          </View>
          <View style={[styles.card, { backgroundColor: "#FFFFFF", borderWidth: 0 }]}>
            <Pressable style={({ pressed }) => [styles.menuRow, { borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingBottom: 16 }, pressed && { transform: [{ scale: 0.98 }] }]} onPress={openEditProfile}>
              <Ionicons name={locale === "ar" ? "chevron-back" : "chevron-forward"} size={16} color={colors.mutedForeground} />
              <Text style={[styles.menuLabel, { color: colors.onSurface }]}>{t("settings.editProfile")}</Text>
              <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }]}>
                <Ionicons name="person-outline" size={17} color={colors.primary} />
              </View>
            </Pressable>
            
            <Pressable style={({ pressed }) => [styles.menuRow, { paddingTop: 16 }, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => router.push("/language")}>
              <Ionicons name={locale === "ar" ? "chevron-back" : "chevron-forward"} size={16} color={colors.mutedForeground} />
              <View style={{ flex: 1, alignItems: locale === "ar" ? "flex-end" : "flex-start" }}>
                <Text style={[styles.menuLabel, { color: colors.onSurface }]}>{t("settings.changeLanguage")}</Text>
                <Text style={[styles.settingSub, { color: colors.mutedForeground, marginTop: 2, textAlign: locale === "ar" ? "right" : "left" }]}>
                  {locale === "ar" ? "العربية" : "English"}
                </Text>
              </View>
              <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }]}>
                <Ionicons name="language-outline" size={17} color={colors.primary} />
              </View>
            </Pressable>
          </View>

          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionHeaderLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("settings.aboutTitle")}</Text>
            <View style={[styles.sectionHeaderLine, { backgroundColor: colors.border }]} />
          </View>
          <View style={[styles.card, { backgroundColor: "#FFFFFF", borderWidth: 0 }]}>
            <View style={[styles.versionRow]}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }]}>
                <Ionicons name="information-circle-outline" size={17} color={colors.secondary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.onSurface }]}>{t("settings.version")}</Text>
              <Text style={[styles.versionBadge, { color: colors.mutedForeground }]}>1.0.0</Text>
            </View>
            <View style={styles.tertiaryBtnRow}>
              <Pressable
                style={({ pressed }) => [styles.tertiaryBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }, pressed && { transform: [{ scale: 0.96 }] }]}
                onPress={() => { setLegalType("terms"); setLegalVisible(true); }}
              >
                <Ionicons name="document-text-outline" size={16} color={colors.secondary} />
                <Text style={[styles.tertiaryBtnText, { color: colors.secondary }]}>{t("settings.termsOfService")}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.tertiaryBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }, pressed && { transform: [{ scale: 0.96 }] }]}
                onPress={() => { setLegalType("privacy"); setLegalVisible(true); }}
              >
                <Ionicons name="shield-outline" size={16} color={colors.secondary} />
                <Text style={[styles.tertiaryBtnText, { color: colors.secondary }]}>{t("settings.privacyPolicy")}</Text>
              </Pressable>
            </View>
            <View style={[styles.tertiaryBtnRow, { paddingTop: 0 }]}>
              <Pressable
                style={({ pressed }) => [styles.tertiaryBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }, pressed && { transform: [{ scale: 0.96 }] }]}
                onPress={handleContactUs}
              >
                <Ionicons name="mail-outline" size={16} color={colors.tertiary} />
                <Text style={[styles.tertiaryBtnText, { color: colors.tertiary }]}>{t("common.support")}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.tertiaryBtn, { backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }, pressed && { transform: [{ scale: 0.96 }] }]}
                onPress={handleShareProfile}
              >
                <Ionicons name="share-social-outline" size={16} color={colors.tertiary} />
                <Text style={[styles.tertiaryBtnText, { color: colors.tertiary }]}>{t("common.share")}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.logoutBtn, { backgroundColor: "#FFFFFF", borderWidth: 0 }, pressed && { transform: [{ scale: 0.96 }] }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
            <Text style={[styles.logoutBtnText, { color: colors.destructive }]}>{t("settings.logout.label")}</Text>
          </Pressable>
        </ScrollView>
      </View>

      <Modal
        visible={editProfileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalSheet, { backgroundColor: "#FFFFFF" }]}>
            <View style={[styles.modalGlassHeader, { backgroundColor: "#EEF2FF" }]}>
              <View style={styles.modalHandleBar} />
              <View style={styles.modalHeaderRow}>
                <Pressable
                  onPress={() => setEditProfileVisible(false)}
                  style={({ pressed }) => [styles.closeBtn, { backgroundColor: "#FFFFFF", borderWidth: 0 }, pressed && { transform: [{ scale: 0.96 }] }]}
                >
                  <Ionicons name="close" size={20} color={colors.onSurface} />
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>{t("profile.edit.title")}</Text>
                <View style={{ width: 36 }} />
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable onPress={avatarUploading ? undefined : pickAvatar} style={styles.avatarPickerWrap}>
                <View style={[styles.avatarPickerCircle, { backgroundColor: colors.surfaceContainerHigh, borderWidth: 0 }]}>
                  {editAvatarUri ? (
                    <Image
                      source={{ uri: editAvatarUri }}
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                    />
                  ) : (
                    <Text style={[styles.avatarPickerInitial, { color: colors.primary }]}>
                      {(editNickname || user?.nickname || "").charAt(0) || "؟"}
                    </Text>
                  )}
                  {avatarUploading && (
                    <View style={styles.avatarUploadingOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </View>
                <View style={[styles.avatarPickerBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name={avatarUploading ? "cloud-upload-outline" : "camera"} size={14} color="#fff" />
                </View>
                <Text style={[styles.avatarPickerLabel, { color: colors.primary }]}>
                  {avatarUploading ? t("profile.edit.avatarUploading") : t("profile.edit.avatar")}
                </Text>
              </Pressable>

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{t("profile.edit.nickname")}</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: nicknameFocused ? colors.surfaceContainerHigh : colors.surfaceContainerLow,
                    borderRadius: 18,
                    borderWidth: nicknameFocused ? 1.5 : 0,
                    borderColor: nicknameFocused ? colors.primary + "60" : "transparent",
                  },
                ]}
              >
                <TextInput
                  style={[styles.inputField, { color: colors.onSurface, fontFamily: typography.bodyLg.fontFamily }]}
                  value={editNickname}
                  onChangeText={setEditNickname}
                  onFocus={() => setNicknameFocused(true)}
                  onBlur={() => setNicknameFocused(false)}
                  textAlign={locale === "ar" ? "right" : "left"}
                  placeholder={t("profile.edit.nickname")}
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={20}
                />
              </View>

              <Text style={[styles.inputLabel, { color: colors.mutedForeground, marginTop: 16 }]}>{t("profile.edit.sports")}</Text>
              <View style={styles.chipsRow}>
                {getSportList(t).map((sport) => {
                  const selected = editSports.includes(sport.key);
                  return (
                    <Pressable
                      key={sport.key}
                      onPress={() => toggleEditSport(sport.key)}
                      style={[
                        styles.chipPill,
                        selected
                          ? [{ backgroundColor: sport.bg, borderColor: sport.color + "40", borderWidth: 1 }]
                          : [{ backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }],
                      ]}
                    >
                      <sport.icon
                        size={15}
                        color={selected ? sport.color : colors.mutedForeground}
                      />
                      <Text style={[styles.chipPillText, { color: selected ? sport.color : colors.mutedForeground }]}>
                        {sport.label}
                      </Text>
                      {selected && (
                        <Ionicons name="checkmark-circle" size={14} color={sport.color} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {editSports.map((sport) => {
                const sportDef = getSportList(t).find((s) => s.key === sport);
                if (!sportDef) return null;
                const currentLevel = editLevels[sport] ?? t("levels.intermediate");
                const currentNumericLevel = editNumericLevels[sport] ?? null;
                const currentPositions = editPositions[sport] ?? [];
                const sportPositions = getSportPositions(sport, t);
                const isRacket = sport === "padel" || sport === "tennis";
                const numericLevelColor = sportDef.color;
                const numericLevelLabel = currentNumericLevel ? getLevelLabel(currentNumericLevel, sport, t) : null;
                return (
                  <View key={sport} style={{ marginTop: 16, gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      <Text style={[styles.inputLabel, { color: sportDef.color, marginBottom: 0 }]}>{sportDef.label}</Text>
                      <sportDef.icon size={16} color={sportDef.color} />
                    </View>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground, marginBottom: 4 }]}>{t("profile.edit.skillLevel")}</Text>
                    {isRacket ? (
                      <Pressable
                        style={[
                          styles.levelPickerBtn,
                          currentNumericLevel
                            ? [{ backgroundColor: numericLevelColor + "15", borderColor: numericLevelColor + "40", borderWidth: 1 }]
                            : [{ backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }],
                        ]}
                        onPress={() => setLevelPickerSport(sport)}
                      >
                        {currentNumericLevel ? (
                          <>
                            <Ionicons name="star" size={15} color={numericLevelColor} />
                            <Text style={[styles.levelPickerBtnText, { color: numericLevelColor }]}>{numericLevelLabel}</Text>
                            <Ionicons name="chevron-back" size={13} color={numericLevelColor + "80"} />
                          </>
                        ) : (
                          <>
                            <Ionicons name="trophy-outline" size={15} color={sportDef.color + "80"} />
                            <Text style={[styles.levelPickerBtnText, { color: sportDef.color + "80" }]}>{t("levels.clickToChoose")}</Text>
                            <Ionicons name={locale === "ar" ? "chevron-back" : "chevron-forward"} size={13} color={sportDef.color + "60"} />
                          </>
                        )}
                      </Pressable>
                    ) : (
                      <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceContainerHigh, borderWidth: 0 }]}>
                        {getLevelsForSegments(t).map((lv) => (
                          <Pressable
                            key={lv}
                            onPress={() => setEditLevels((prev) => ({ ...prev, [sport]: lv }))}
                            style={[
                              styles.segmentBtn,
                              currentLevel === lv && [{ backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }],
                            ]}
                          >
                            <Text style={[styles.segmentBtnText, { color: currentLevel === lv ? sportDef.color : colors.mutedForeground }]}>
                              {lv}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {sportPositions.length > 0 && (
                      <>
                        <Text style={[styles.inputLabel, { color: colors.mutedForeground, marginTop: 8, marginBottom: 4 }]}>{t("profile.edit.position")}</Text>
                        <View style={[styles.chipsRow]}>
                          {sportPositions.map((pos) => {
                            const selected = currentPositions.includes(pos.key);
                            return (
                              <Pressable
                                key={pos.key}
                                onPress={() => setEditPositions((prev) => {
                                  const arr = prev[sport] ?? [];
                                  const next = arr.includes(pos.key)
                                    ? arr.filter((p) => p !== pos.key)
                                    : [...arr, pos.key];
                                  return { ...prev, [sport]: next };
                                })}
                                style={[
                                  styles.chipPill,
                                  selected
                                    ? [{ backgroundColor: sportDef.bg, borderColor: sportDef.color + "40", borderWidth: 1.5 }]
                                    : [{ backgroundColor: colors.surfaceContainerLow, borderWidth: 0 }],
                                ]}
                              >
                                <Text style={[styles.chipPillText, { color: selected ? sportDef.color : colors.mutedForeground }]}>
                                  {pos.label}
                                </Text>
                                {selected && <Ionicons name="checkmark-circle" size={14} color={sportDef.color} />}
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </View>
                );
              })}

              <SportGradientButton
                label={saving ? t("profile.edit.saving") : avatarUploading ? t("profile.edit.avatarUploading") : t("profile.edit.save")}
                gradientStart={colors.primary}
                gradientEnd={colors.primaryLight}
                onPress={handleSaveProfile}
                disabled={saving || avatarUploading || !editNickname.trim()}
                loading={saving}
                style={{ marginTop: 20 }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {levelPickerSport && (levelPickerSport === "padel" || levelPickerSport === "tennis") && (
        <LevelPickerSheet
          visible={!!levelPickerSport}
          sport={levelPickerSport}
          currentValue={editNumericLevels[levelPickerSport] ?? null}
          onClose={() => setLevelPickerSport(null)}
          onConfirm={(value) => {
            setEditNumericLevels((prev) => ({ ...prev, [levelPickerSport]: value }));
            setEditLevels((prev) => ({ ...prev, [levelPickerSport]: numericToSkillLevel(value) }));
          }}
        />
      )}

      <Modal
        visible={legalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLegalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: "#FFFFFF", maxHeight: "90%" }]}>
            <View style={[styles.modalGlassHeader, { backgroundColor: "#EEF2FF" }]}>
              <View style={styles.modalHandleBar} />
              <View style={styles.modalHeaderRow}>
                <Pressable
                  onPress={() => setLegalVisible(false)}
                  style={[styles.closeBtn, { backgroundColor: "#FFFFFF", borderWidth: 0 }]}
                >
                  <Ionicons name="close" size={20} color={colors.onSurface} />
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                  {legalType === "terms" ? t("settings.about.terms") : t("settings.about.privacy")}
                </Text>
                <View style={{ width: 36 }} />
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.modalBody, { gap: 16 }]}>
              {legalType === "terms" ? (
                <>
                  <Text style={[styles.legalTitle, { color: colors.onSurface }]}>{t("settings.about.terms")}</Text>
                  <Text style={[styles.legalText, { color: colors.onSurfaceVariant }]}>
                    {t("legal.terms.intro")}
                  </Text>
                  <Text style={[styles.legalSection, { color: colors.onSurface }]}>{t("legal.terms.s1_title")}</Text>
                  <Text style={[styles.legalText, { color: colors.onSurfaceVariant }]}>
                    {t("legal.terms.s1_body")}
                  </Text>
                  <Text style={[styles.legalSection, { color: colors.onSurface }]}>{t("legal.terms.s2_title")}</Text>
                  <Text style={[styles.legalText, { color: colors.onSurfaceVariant }]}>
                    {t("legal.terms.s2_body")}
                  </Text>
                  <Text style={[styles.legalSection, { color: colors.onSurface }]}>{t("legal.terms.s3_title")}</Text>
                  <Text style={[styles.legalText, { color: colors.onSurfaceVariant }]}>
                    {t("legal.terms.s3_body")}
                  </Text>
                  <Text style={[styles.legalSection, { color: colors.onSurface }]}>{t("legal.terms.s4_title")}</Text>
                  <Text style={[styles.legalText, { color: colors.onSurfaceVariant }]}>
                    {t("legal.terms.s4_body")}
                  </Text>
                  <Text style={[styles.legalText, { color: colors.mutedForeground, marginTop: 8 }]}>
                    {t("legal.lastUpdate")}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.legalTitle, { color: colors.onSurface }]}>{t("settings.about.privacy")}</Text>
                  <Text style={[styles.legalText, { color: colors.onSurfaceVariant }]}>
                    {t("legal.privacy.intro")}
                  </Text>
                  <Text style={[styles.legalSection, { color: colors.onSurface }]}>{t("legal.privacy.s1_title")}</Text>
                  <Text style={[styles.legalText, { color: colors.onSurfaceVariant }]}>
                    {t("legal.privacy.s1_body")}
                  </Text>
                  <Text style={[styles.legalSection, { color: colors.onSurface }]}>{t("legal.privacy.s2_title")}</Text>
                  <Text style={[styles.legalText, { color: colors.onSurfaceVariant }]}>
                    {t("legal.privacy.s2_body")}
                  </Text>
                  <Text style={[styles.legalSection, { color: colors.onSurface }]}>{t("legal.privacy.s3_title")}</Text>
                  <Text style={[styles.legalText, { color: colors.onSurfaceVariant }]}>
                    {t("legal.privacy.s3_body")}
                  </Text>
                  <Text style={[styles.legalText, { color: colors.mutedForeground, marginTop: 8 }]}>
                    {t("legal.lastUpdate")}
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontFamily: typography.headlineSm.fontFamily, lineHeight: 30 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 16, gap: 8 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    marginBottom: 6,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    opacity: 0.6,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  card: { borderRadius: 24, overflow: "hidden", padding: 4 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  settingText: { flex: 1, alignItems: "flex-end", gap: 2 },
  settingLabel: { fontSize: 15, fontFamily: typography.bodyLg.fontFamily, lineHeight: 24 },
  settingSub: { fontSize: 12, fontFamily: typography.body.fontFamily, lineHeight: 18 },
  pillTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  pillThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.bodyLg.fontFamily,
    textAlign: "right",
    lineHeight: 24,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  versionBadge: {
    fontSize: 13,
    fontFamily: typography.bodyLg.fontFamily,
    letterSpacing: 0.5,
  },
  tertiaryBtnRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  tertiaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  tertiaryBtnText: {
    fontSize: 12,
    fontFamily: typography.bodyLg.fontFamily,
    lineHeight: 20,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 24,
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 16,
    fontFamily: typography.headlineSm.fontFamily,
    lineHeight: 24,
  },
  openSettingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  openSettingsBtnText: {
    fontSize: 12,
    fontFamily: typography.bodyLg.fontFamily,
  },
  permissionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  notifIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopStartRadius: 28,
    borderTopEndRadius: 28,
    overflow: "hidden",
    maxHeight: "90%",
  },
  modalGlassHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(33,37,41,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 6,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: typography.headlineSm.fontFamily,
    lineHeight: 28,
  },
  modalBody: {
    padding: 20,
    paddingTop: 16,
    gap: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: typography.bodyLg.fontFamily,
    textAlign: "right",
    marginBottom: 8,
  },
  inputWrap: { overflow: "hidden" },
  inputField: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
  },
  chipPillText: {
    fontSize: 13,
    fontFamily: typography.headlineSm.fontFamily,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 50,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnText: {
    fontSize: 13,
    fontFamily: typography.headlineSm.fontFamily,
  },
  levelPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "transparent",
  },
  levelPickerBtnText: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.bodyLg.fontFamily,
    textAlign: "right",
  },
  reminderChips: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  reminderChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 50,
    backgroundColor: "rgba(214,211,196,0.4)",
  },
  reminderChipText: {
    fontSize: 12,
    fontFamily: typography.headlineSm.fontFamily,
  },
  legalTitle: {
    fontSize: 18,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "right",
    lineHeight: 28,
  },
  legalSection: {
    fontSize: 15,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "right",
    lineHeight: 24,
  },
  legalText: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    textAlign: "right",
    lineHeight: 24,
  },
  avatarPickerWrap: {
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  avatarPickerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarPickerInitial: {
    fontSize: 32,
    fontFamily: typography.headlineSm.fontFamily,
  },
  avatarPickerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 56,
    right: "50%",
    marginRight: -44,
  },
  avatarPickerLabel: {
    fontSize: 13,
    fontFamily: typography.bodyLg.fontFamily,
  },
  avatarUploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
