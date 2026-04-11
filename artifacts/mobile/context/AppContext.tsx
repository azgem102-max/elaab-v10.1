import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { api, ApiMatch, ApiGroup, ApiError, ApiUserProfile, clearToken } from "@/services/api";
import { router } from "expo-router";

export type SportType = "football" | "padel" | "tennis";
export type SkillLevel = "مبتدئ" | "متوسط" | "محترف";
export type NumericSkillLevel = number;
export type AttendanceStatus = "pending" | "present" | "absent";
export type PaymentStatus = "pending" | "paid";
export type MatchStatus = "upcoming" | "today" | "completed" | "cancelled";
export type SessionType = "match" | "training";

export interface SportProfile {
  sport: SportType;
  skillLevel: SkillLevel;
  skillLevelNumeric?: number | null;
  position: string[];
}

export interface Player {
  id: string;
  nickname: string;
  phone?: string;
  avatarUri?: string | null;
  sports: SportType[];
  sportProfiles: Partial<Record<SportType, SportProfile>>;
  matchesPlayed: number;
  reliability: number | null;
  role?: "owner" | "admin" | "member";
}

export interface MatchPlayer extends Player {
  attendance: AttendanceStatus;
  paymentStatus: PaymentStatus;
  position: string;
}

export interface Match {
  id: string;
  title: string;
  sport: SportType;
  date: Date;
  time: string;
  venue: string;
  location?: string;
  maxPlayers: number;
  cost: number;
  isPublic: boolean;
  organizerId: string;
  organizerName: string;
  organizerReliability: number | null;
  players: MatchPlayer[];
  playerCount?: number;
  status: MatchStatus;
  joinedByCurrentUser: boolean;
  sessionType: SessionType;
  matchFormat?: "single" | "double" | null;
  skillLevel?: "beginner" | "intermediate" | "advanced" | null;
  description?: string;
  invitedGroupId?: string;
  organizerPhone?: string | null;
  organizerPhoneFull?: string | null;
}

export interface GroupNextMatch {
  id: string;
  title: string;
  date: string;
  time: string;
  sport: string;
  playerCount: number;
  maxPlayers: number;
}

export interface Group {
  id: string;
  name: string;
  sport: SportType;
  description: string;
  memberCount: number;
  adminId: string;
  adminName: string;
  isJoined: boolean;
  isPublic: boolean;
  nextMatch: GroupNextMatch | string | null;
  members: Player[];
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  time: Date;
  isRead: boolean;
  type: "match" | "group" | "system";
  linkedId?: string;
}


function makeMatchPlayer(player: Player, pos: string, att: AttendanceStatus, pay: PaymentStatus): MatchPlayer {
  return { ...player, position: pos, attendance: att, paymentStatus: pay };
}

function apiMatchToLocal(m: ApiMatch, existingMatch?: Match): Match {
  const existing = existingMatch;

  let players: MatchPlayer[] = existing?.players ?? [];
  if (m.players && m.players.length > 0) {
    players = m.players.map((p) => {
      const sportProfiles: Partial<Record<SportType, SportProfile>> = {};
      if (p.skillLevel && m.sport) {
        const sport = m.sport as SportType;
        sportProfiles[sport] = {
          sport,
          skillLevel: p.skillLevel as SkillLevel,
          skillLevelNumeric: p.skillLevelNumeric ?? null,
          position: [],
        };
      }
      return {
        id: p.id,
        nickname: p.nickname,
        sports: [],
        sportProfiles,
        matchesPlayed: p.matchesPlayed ?? 0,
        reliability: p.reliability,
        attendance: p.attendance as AttendanceStatus,
        paymentStatus: p.paymentStatus as PaymentStatus,
        position: p.position,
      };
    });
  }

  return {
    id: m.id,
    title: m.title,
    sport: m.sport as SportType,
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
    playerCount: m.playerCount,
    status: m.status as MatchStatus,
    joinedByCurrentUser: m.joinedByCurrentUser ?? existing?.joinedByCurrentUser ?? false,
    sessionType: m.sessionType,
    matchFormat: m.matchFormat ?? existing?.matchFormat,
    skillLevel: m.skillLevel ?? existing?.skillLevel,
    description: m.description ?? existing?.description,
    invitedGroupId: m.invitedGroupId ?? existing?.invitedGroupId,
    organizerPhone: m.organizerPhone ?? existing?.organizerPhone,
    organizerPhoneFull: m.organizerPhoneFull ?? existing?.organizerPhoneFull,
  };
}

function apiGroupToLocal(g: ApiGroup, existingGroup?: Group): Group {
  const members: Player[] = g.members
    ? g.members.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        sports: m.sports as SportType[],
        sportProfiles: {},
        matchesPlayed: m.matchesPlayed,
        reliability: m.reliability,
        role: m.role ?? "member",
      }))
    : existingGroup?.members ?? [];

  return {
    id: g.id,
    name: g.name ?? "مجموعة",
    sport: g.sport as SportType,
    description: g.description ?? "",
    memberCount: g.memberCount,
    adminId: g.adminId,
    adminName: g.adminName ?? "",
    isJoined: g.isJoined ?? existingGroup?.isJoined ?? false,
    isPublic: g.isPublic,
    nextMatch: g.nextMatch,
    members,
  };
}


interface AppContextType {
  user: Player | null;
  isOnboarded: boolean;
  matches: Match[];
  groups: Group[];
  notifications: Notification[];
  unreadCount: number;
  allPlayers: Player[];
  matchesLoading: boolean;
  matchesError: boolean;
  groupsLoading: boolean;
  groupsError: boolean;
  setUser: (user: Player) => void;
  completeOnboarding: (user: Player) => Promise<void>;
  logout: () => Promise<void>;
  refreshMatches: () => Promise<void>;
  refreshGroups: (params?: { q?: string; sport?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  fetchGroupById: (groupId: string) => Promise<Group | null>;
  joinMatch: (matchId: string, position?: string) => Promise<{ success: boolean; conflict?: Match; alreadyJoined?: boolean; isFull?: boolean; error?: string }>;
  leaveMatch: (matchId: string) => Promise<void>;
  cancelMatch: (matchId: string) => Promise<boolean>;
  createMatch: (match: Omit<Match, "id" | "players" | "joinedByCurrentUser">, coords?: { lat: number; lng: number } | null) => Promise<string>;
  updateMatch: (matchId: string, data: { title?: string; venue?: string; location?: string | null; date?: string; time?: string; cost?: number; maxPlayers?: number; description?: string; skillLevel?: "beginner" | "intermediate" | "advanced" | null }) => Promise<boolean>;
  removeMatchPlayer: (matchId: string, playerId: string) => Promise<boolean>;
  updateAttendance: (matchId: string, userId: string, status: AttendanceStatus) => Promise<boolean>;
  updatePayment: (matchId: string, userId: string, status: PaymentStatus) => Promise<boolean>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  createGroup: (group: Omit<Group, "id" | "members" | "isJoined">) => Promise<string>;
  inviteMemberToGroup: (groupId: string, player: Player) => void;
  removeGroupMember: (groupId: string, memberId: string) => Promise<boolean>;
  updateGroup: (groupId: string, data: { name?: string; description?: string; isPublic?: boolean }) => Promise<boolean>;
  updateGroupMemberRole: (groupId: string, memberId: string, role: "admin" | "member") => Promise<boolean>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  createGroupInviteLink: (groupId: string) => Promise<string>;
  createMatchInviteLink: (matchId: string) => Promise<string>;
  acceptInvite: (inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;
  addNotification: (notif: Omit<Notification, "id" | "time" | "isRead">) => void;
}

const AppContext = createContext<AppContextType | null>(null);

let _queryClient: QueryClient | null = null;
export function setQueryClientRef(qc: QueryClient) {
  _queryClient = qc;
}

const PUSH_TOKEN_KEY = "@elab_push_token";

let _cachedPushToken: string | null = null;
export function setCachedPushTokenRef(token: string | null) {
  _cachedPushToken = token;
  if (token) {
    AsyncStorage.setItem(PUSH_TOKEN_KEY, token).catch(() => {});
  } else {
    AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {});
  }
}

const VALID_SKILL_LEVELS: SkillLevel[] = ["مبتدئ", "متوسط", "محترف"];

function isValidSkillLevel(value: string | null | undefined): value is SkillLevel {
  return typeof value === "string" && VALID_SKILL_LEVELS.includes(value as SkillLevel);
}

function migrateUserPositions(user: Player): Player {
  const sportProfiles = { ...user.sportProfiles };
  for (const sport of Object.keys(sportProfiles) as SportType[]) {
    const sp = sportProfiles[sport];
    if (sp && !Array.isArray(sp.position)) {
      const raw = sp.position as unknown as string;
      sportProfiles[sport] = {
        ...sp,
        position: raw ? raw.split(",").map((p) => p.trim()).filter(Boolean) : [],
      };
    }
  }
  return { ...user, sportProfiles };
}

function hydrateUserFromProfile(prev: Player, profile: ApiUserProfile): Player {
  const serverSports = (profile.sports ?? []).filter(
    (s): s is SportType => ["football", "padel", "tennis"].includes(s)
  );
  const sports = serverSports.length > 0 ? serverSports : prev.sports;

  const sportProfiles = { ...prev.sportProfiles };
  const serverSportProfiles = profile.sportProfiles ?? {};
  if (serverSports.length > 0) {
    for (const sport of serverSports) {
      const serverSp = serverSportProfiles[sport];
      const skillLevel = serverSp?.skillLevel && isValidSkillLevel(serverSp.skillLevel as SkillLevel)
        ? (serverSp.skillLevel as SkillLevel)
        : isValidSkillLevel(profile.skillLevel)
          ? profile.skillLevel
          : sportProfiles[sport]?.skillLevel ?? "متوسط";
      const rawSkillLevelNumeric = serverSp?.skillLevelNumeric;
      const skillLevelNumeric = typeof rawSkillLevelNumeric === "number" ? rawSkillLevelNumeric : sportProfiles[sport]?.skillLevelNumeric ?? null;
      const rawPosition = serverSp?.position || "";
      const position: string[] = rawPosition
        ? rawPosition.split(",").map((p: string) => p.trim()).filter(Boolean)
        : sportProfiles[sport]?.position ?? [];
      sportProfiles[sport] = { sport, skillLevel, skillLevelNumeric, position };
    }
    for (const sport of (Object.keys(sportProfiles) as SportType[])) {
      if (!serverSports.includes(sport)) {
        delete sportProfiles[sport];
      }
    }
  }

  return {
    ...prev,
    nickname: profile.name ?? prev.nickname,
    phone: profile.phone ?? prev.phone,
    avatarUri: profile.avatarUrl !== undefined ? profile.avatarUrl : prev.avatarUri,
    sports,
    sportProfiles,
    reliability: profile.reliability,
    matchesPlayed: profile.matchesPlayed,
  };
}

const STORAGE_KEY = "@elab_state";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<Player | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async (raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as {
            user?: Player;
            isOnboarded?: boolean;
            matches?: Match[];
            groups?: Group[];
            notifications?: Notification[];
          };
          if (saved.user) setUserState(migrateUserPositions(saved.user));
          if (saved.isOnboarded) setIsOnboarded(saved.isOnboarded);
          if (saved.matches) {
            setMatches(saved.matches.map((m) => ({ ...m, date: new Date(m.date), sessionType: m.sessionType ?? "match" })));
          }
          if (saved.groups) setGroups(saved.groups.map((g) => ({ ...g, isPublic: g.isPublic ?? true })));
          if (saved.notifications) {
            setNotifications(saved.notifications.map((n) => ({ ...n, time: new Date(n.time) })));
          }
        } catch { }
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(
    (patch: { user?: Player | null; isOnboarded?: boolean; matches?: Match[]; groups?: Group[]; notifications?: Notification[] }) => {
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        const current = raw ? JSON.parse(raw) : {};
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
      });
    },
    []
  );

  const unregisterPushToken = useCallback(async () => {
    const token = _cachedPushToken ?? await AsyncStorage.getItem(PUSH_TOKEN_KEY).catch(() => null);
    if (!token) return;
    await api.unregisterPushToken(token).catch(() => {});
    _cachedPushToken = null;
    AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {});
  }, []);

  const handleUnauthorized = useCallback(async () => {
    await unregisterPushToken();
    await clearToken();
    setUserState(null);
    setIsOnboarded(false);
    await AsyncStorage.removeItem(STORAGE_KEY);
    router.replace("/" as Parameters<typeof router.replace>[0]);
  }, [unregisterPushToken]);

  const refreshMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesError(false);
    try {
      const { matches: apiMatches } = await api.listMatches();
      setMatches((prev) => {
        const updated = apiMatches.map((m) => {
          const existing = prev.find((p) => p.id === m.id);
          return apiMatchToLocal(m, existing);
        });
        persist({ matches: updated });
        return updated;
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await handleUnauthorized();
        return;
      }
      setMatchesError(true);
    } finally {
      setMatchesLoading(false);
    }
  }, [persist, handleUnauthorized]);

  const refreshGroups = useCallback(async (params?: { q?: string; sport?: string }) => {
    setGroupsLoading(true);
    setGroupsError(false);
    try {
      const { groups: apiGroups } = await api.listGroups(params);
      setGroups((prev) => {
        const apiGroupIds = new Set(apiGroups.map((g) => g.id));
        const fetchedGroups = apiGroups.map((g) => {
          const existing = prev.find((p) => p.id === g.id);
          return apiGroupToLocal(g, existing);
        });
        const isFiltering = !!(params?.q || params?.sport);
        if (isFiltering) {
          const keptPrivateGroups = prev.filter(
            (g) => !apiGroupIds.has(g.id) && g.isJoined && !g.isPublic
          );
          const updated = [...fetchedGroups, ...keptPrivateGroups];
          persist({ groups: updated });
          return updated;
        }
        persist({ groups: fetchedGroups });
        return fetchedGroups;
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await handleUnauthorized();
        return;
      }
      setGroupsError(true);
    } finally {
      setGroupsLoading(false);
    }
  }, [persist, handleUnauthorized]);

  const fetchGroupById = useCallback(async (groupId: string): Promise<Group | null> => {
    try {
      const { group: apiGroup } = await api.getGroup(groupId);
      const localGroup = apiGroupToLocal(apiGroup);
      setGroups((prev) => {
        const exists = prev.find((g) => g.id === groupId);
        if (exists) {
          const updated = prev.map((g) => g.id === groupId ? { ...localGroup, isJoined: g.isJoined } : g);
          persist({ groups: updated });
          return updated;
        }
        const updated = [...prev, localGroup];
        persist({ groups: updated });
        return updated;
      });
      return localGroup;
    } catch {
      return null;
    }
  }, [persist]);

  useEffect(() => {
    if (loaded) {
      refreshMatches();
      refreshGroups();
      if (isOnboarded) {
        api.getProfile().then((res) => {
          setUserState((prev) => {
            if (!prev) return prev;
            return hydrateUserFromProfile(prev, res.user);
          });
        }).catch(() => {});
        refreshNotifications();
      }
    }
  }, [loaded]);

  const notifIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (isOnboarded) {
      if (notifIntervalRef.current) clearInterval(notifIntervalRef.current);
      notifIntervalRef.current = setInterval(() => {
        refreshNotifications();
      }, 30000);
    } else {
      if (notifIntervalRef.current) {
        clearInterval(notifIntervalRef.current);
        notifIntervalRef.current = null;
      }
    }
    return () => {
      if (notifIntervalRef.current) {
        clearInterval(notifIntervalRef.current);
        notifIntervalRef.current = null;
      }
    };
  }, [isOnboarded]);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.getProfile();
      setUserState((prev) => {
        if (!prev) return prev;
        const updated = hydrateUserFromProfile(prev, res.user);
        persist({ user: updated });
        return updated;
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await handleUnauthorized();
        return;
      }
      throw err;
    }
  }, [persist, handleUnauthorized]);

  const setUser = useCallback((u: Player) => {
    setUserState(u);
    persist({ user: u });
  }, [persist]);

  const completeOnboarding = useCallback(async (u: Player) => {
    setUserState(u);
    setIsOnboarded(true);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, isOnboarded: true, matches, groups, notifications }));
  }, [matches, groups, notifications]);

  const logout = useCallback(async () => {
    await unregisterPushToken();
    await clearToken();
    await AsyncStorage.removeItem(STORAGE_KEY);
    if (_queryClient) {
      _queryClient.clear();
    }
    setUserState(null);
    setIsOnboarded(false);
    setMatches([]);
    setGroups([]);
    setNotifications([]);
  }, [unregisterPushToken]);

  const addNotification = useCallback((notif: Omit<Notification, "id" | "time" | "isRead">) => {
    setNotifications((prev) => {
      const newNotif: Notification = { ...notif, id: "n_" + Date.now(), time: new Date(), isRead: false };
      const updated = [newNotif, ...prev];
      persist({ notifications: updated });
      return updated;
    });
  }, [persist]);

  const refreshNotifications = useCallback(async () => {
    try {
      const { notifications: apiNotifs } = await api.listNotifications();
      const VALID_NOTIF_TYPES = ["match", "group", "system"] as const;
      const mapped: Notification[] = apiNotifs.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: VALID_NOTIF_TYPES.includes(n.type as typeof VALID_NOTIF_TYPES[number]) ? n.type as Notification["type"] : "system",
        linkedId: n.linkedId,
        isRead: n.isRead,
        time: new Date(n.time),
      }));
      setNotifications(mapped);
      persist({ notifications: mapped });
    } catch {
    }
  }, [persist]);

  const joinMatch = useCallback(async (matchId: string, position?: string): Promise<{ success: boolean; conflict?: Match; alreadyJoined?: boolean; isFull?: boolean; error?: string }> => {
    if (!user) return { success: false, error: "يرجى تسجيل الدخول أولاً" };

    const targetMatch = matches.find((m) => m.id === matchId);

    if (targetMatch) {
      if (targetMatch.joinedByCurrentUser) return { success: false, alreadyJoined: true };
      if (targetMatch.players.length >= targetMatch.maxPlayers) return { success: false, isFull: true };

      const DURATION_MS = 2 * 60 * 60 * 1000;
      const targetStart = new Date(`${new Date(targetMatch.date).toISOString().slice(0, 10)}T${targetMatch.time}:00`).getTime();
      const targetEnd = targetStart + DURATION_MS;
      const conflict = matches.find((m) => {
        if (m.id === matchId || !m.joinedByCurrentUser) return false;
        const mStart = new Date(`${new Date(m.date).toISOString().slice(0, 10)}T${m.time}:00`).getTime();
        const mEnd = mStart + DURATION_MS;
        return targetStart < mEnd && mStart < targetEnd;
      });
      if (conflict) return { success: false, conflict };

      const profilePositions = user.sportProfiles[targetMatch.sport]?.position ?? [];
      const pos = position ?? (profilePositions.length > 0 ? profilePositions[0] : null);
      const newPlayer = makeMatchPlayer(user, pos ?? "لاعب", "pending", "pending");
      setMatches((prev) => {
        const updated = prev.map((m) =>
          m.id === matchId ? { ...m, players: [...m.players, newPlayer], joinedByCurrentUser: true } : m
        );
        persist({ matches: updated });
        return updated;
      });

      try {
        await api.joinMatch(matchId, pos ?? null);
      } catch (err) {
        setMatches((prev) => {
          const rolled = prev.map((m) =>
            m.id === matchId
              ? { ...m, players: m.players.filter((p) => p.id !== user.id), joinedByCurrentUser: false }
              : m
          );
          persist({ matches: rolled });
          return rolled;
        });
        if (err instanceof ApiError) {
          if (err.status === 409 && err.conflictMatch) {
            const conflictMatch = matches.find((m) => m.id === err.conflictMatch?.id);
            if (conflictMatch) return { success: false, conflict: conflictMatch };
          }
          return { success: false, error: err.message };
        }
        return { success: false, error: "فشل الانضمام للمباراة، تحقق من اتصالك بالإنترنت" };
      }

      addNotification({ title: "انضمام لمباراة", body: `انضممت لمباراة ${targetMatch.title}`, type: "match", linkedId: matchId });
      refreshMatches();
      return { success: true };
    }

    const pos = position ?? null;
    try {
      await api.joinMatch(matchId, pos);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          if (err.conflictMatch) {
            const conflictMatch = matches.find((m) => m.id === err.conflictMatch?.id);
            if (conflictMatch) return { success: false, conflict: conflictMatch };
            return { success: false, error: err.message };
          }
          if (err.message?.includes("منضم بالفعل")) return { success: false, alreadyJoined: true };
          if (err.message?.includes("ممتلئة")) return { success: false, isFull: true };
          return { success: false, error: err.message };
        }
        return { success: false, error: err.message };
      }
      return { success: false, error: "فشل الانضمام للمباراة، تحقق من اتصالك بالإنترنت" };
    }

    refreshMatches();
    return { success: true };
  }, [user, matches, persist, addNotification, refreshMatches]);

  const leaveMatch = useCallback(async (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    setMatches((prev) => {
      const updated = prev.map((m) =>
        m.id === matchId
          ? { ...m, players: m.players.filter((p) => user && p.id !== user.id), joinedByCurrentUser: false }
          : m
      );
      persist({ matches: updated });
      return updated;
    });

    try {
      await api.leaveMatch(matchId);
    } catch {
      if (match) {
        setMatches((prev) => {
          const rolled = prev.map((m) => {
            if (m.id !== matchId || !user) return m;
            const posArr = user.sportProfiles[match.sport]?.position ?? [];
            const pos = posArr.length > 0 ? posArr[0] : "لاعب";
            return { ...m, players: [...m.players, makeMatchPlayer(user, pos, "pending", "pending")], joinedByCurrentUser: true };
          });
          persist({ matches: rolled });
          return rolled;
        });
      }
    }

    if (match) {
      addNotification({ title: "انسحاب من مباراة", body: `انسحبت من مباراة ${match.title}`, type: "match", linkedId: matchId });
    }
    refreshMatches();
  }, [user, matches, persist, addNotification, refreshMatches]);

  const cancelMatch = useCallback(async (matchId: string): Promise<boolean> => {
    let rollback: Match[] | null = null;
    setMatches((prev) => {
      rollback = prev;
      const updated = prev.filter((m) => m.id !== matchId);
      persist({ matches: updated });
      return updated;
    });
    try {
      await api.cancelMatch(matchId);
      refreshMatches();
      return true;
    } catch {
      if (rollback !== null) {
        setMatches(rollback);
        persist({ matches: rollback });
      }
      return false;
    }
  }, [persist, refreshMatches]);

  const createMatch = useCallback(async (match: Omit<Match, "id" | "players" | "joinedByCurrentUser">, coords?: { lat: number; lng: number } | null): Promise<string> => {
    if (!user) return "";
    const tempId = "m_temp_" + Date.now();
    const newMatch: Match = {
      ...match,
      id: tempId,
      players: [makeMatchPlayer(user, (user.sportProfiles[match.sport]?.position ?? [])[0] ?? "لاعب", "pending", "pending")],
      joinedByCurrentUser: true,
    };
    setMatches((prev) => {
      const updated = [newMatch, ...prev];
      persist({ matches: updated });
      return updated;
    });

    try {
      const dateObj = new Date(match.date);
      const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
      const { match: created } = await api.createMatch({
        title: match.title,
        sport: match.sport,
        date: dateStr,
        time: match.time,
        venue: match.venue,
        location: match.location,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        maxPlayers: match.maxPlayers,
        cost: match.cost,
        isPublic: match.isPublic,
        organizerId: match.organizerId,
        organizerName: match.organizerName,
        organizerReliability: match.organizerReliability,
        status: match.status,
        sessionType: match.sessionType,
        matchFormat: match.matchFormat,
        skillLevel: match.skillLevel,
        description: match.description,
        invitedGroupId: match.invitedGroupId,
      });
      const realId = created.id;
      setMatches((prev) => {
        const updated = prev.map((m) => m.id === tempId ? { ...m, id: realId } : m);
        persist({ matches: updated });
        return updated;
      });
      refreshMatches();
      return realId;
    } catch (err) {
      setMatches((prev) => {
        const rolled = prev.filter((m) => m.id !== tempId);
        persist({ matches: rolled });
        return rolled;
      });
      const errorMsg = err instanceof ApiError ? err.message : "فشل إنشاء المباراة، يرجى المحاولة مجدداً";
      throw new Error(errorMsg);
    }
  }, [user, persist, refreshMatches]);

  const updateAttendance = useCallback(async (matchId: string, userId: string, status: AttendanceStatus): Promise<boolean> => {
    let prevStatus: AttendanceStatus = "pending";
    setMatches((prev) => {
      const match = prev.find((m) => m.id === matchId);
      const player = match?.players.find((p) => p.id === userId);
      if (player) prevStatus = player.attendance;
      const updated = prev.map((m) =>
        m.id === matchId
          ? { ...m, players: m.players.map((p) => p.id === userId ? { ...p, attendance: status } : p) }
          : m
      );
      persist({ matches: updated });
      return updated;
    });
    try {
      await api.updateAttendance(matchId, userId, status);
      return true;
    } catch {
      setMatches((prev) => {
        const rolled = prev.map((m) =>
          m.id === matchId
            ? { ...m, players: m.players.map((p) => p.id === userId ? { ...p, attendance: prevStatus } : p) }
            : m
        );
        persist({ matches: rolled });
        return rolled;
      });
      return false;
    }
  }, [persist]);

  const updatePayment = useCallback(async (matchId: string, userId: string, status: PaymentStatus): Promise<boolean> => {
    let prevStatus: PaymentStatus = "pending";
    setMatches((prev) => {
      const match = prev.find((m) => m.id === matchId);
      const player = match?.players.find((p) => p.id === userId);
      if (player) prevStatus = player.paymentStatus;
      const updated = prev.map((m) =>
        m.id === matchId
          ? { ...m, players: m.players.map((p) => p.id === userId ? { ...p, paymentStatus: status } : p) }
          : m
      );
      persist({ matches: updated });
      return updated;
    });
    try {
      await api.updatePayment(matchId, userId, status);
      return true;
    } catch {
      setMatches((prev) => {
        const rolled = prev.map((m) =>
          m.id === matchId
            ? { ...m, players: m.players.map((p) => p.id === userId ? { ...p, paymentStatus: prevStatus } : p) }
            : m
        );
        persist({ matches: rolled });
        return rolled;
      });
      return false;
    }
  }, [persist]);

  const updateMatch = useCallback(async (matchId: string, data: { title?: string; venue?: string; location?: string | null; date?: string; time?: string; cost?: number; maxPlayers?: number; description?: string; skillLevel?: "beginner" | "intermediate" | "advanced" | null }): Promise<boolean> => {
    try {
      const { match: updated } = await api.updateMatch(matchId, data);
      setMatches((prev) => {
        const updatedList = prev.map((m) => {
          if (m.id !== matchId) return m;
          return {
            ...m,
            title: updated.title ?? m.title,
            venue: updated.venue ?? m.venue,
            location: updated.location,
            date: updated.date ? new Date(updated.date) : m.date,
            time: updated.time ?? m.time,
            cost: updated.cost ?? m.cost,
            maxPlayers: updated.maxPlayers ?? m.maxPlayers,
            description: updated.description ?? m.description,
            skillLevel: updated.skillLevel !== undefined ? updated.skillLevel : m.skillLevel,
          };
        });
        persist({ matches: updatedList });
        return updatedList;
      });
      refreshMatches();
      return true;
    } catch {
      return false;
    }
  }, [persist, refreshMatches]);

  const removeMatchPlayer = useCallback(async (matchId: string, playerId: string): Promise<boolean> => {
    let snapshot: Match[] | null = null;
    setMatches((prev) => {
      snapshot = prev;
      const updated = prev.map((m) =>
        m.id === matchId
          ? { ...m, players: m.players.filter((p) => p.id !== playerId) }
          : m
      );
      persist({ matches: updated });
      return updated;
    });
    try {
      await api.removeMatchPlayer(matchId, playerId);
      refreshMatches();
      return true;
    } catch {
      if (snapshot !== null) {
        setMatches(snapshot);
        persist({ matches: snapshot });
      }
      return false;
    }
  }, [persist, refreshMatches]);

  const joinGroup = useCallback(async (groupId: string) => {
    setGroups((prev) => {
      const updated = prev.map((g) =>
        g.id === groupId ? { ...g, isJoined: true, memberCount: g.memberCount + 1 } : g
      );
      persist({ groups: updated });
      return updated;
    });
    try {
      await api.joinGroup(groupId);
    } catch {
      setGroups((prev) => {
        const rolled = prev.map((g) =>
          g.id === groupId ? { ...g, isJoined: false, memberCount: Math.max(0, g.memberCount - 1) } : g
        );
        persist({ groups: rolled });
        return rolled;
      });
    }
  }, [persist]);

  const leaveGroup = useCallback(async (groupId: string) => {
    setGroups((prev) => {
      const updated = prev.map((g) =>
        g.id === groupId ? { ...g, isJoined: false, memberCount: Math.max(0, g.memberCount - 1) } : g
      );
      persist({ groups: updated });
      return updated;
    });
    try {
      await api.leaveGroup(groupId);
      refreshGroups();
    } catch (err) {
      setGroups((prev) => {
        const rolled = prev.map((g) =>
          g.id === groupId ? { ...g, isJoined: true, memberCount: g.memberCount + 1 } : g
        );
        persist({ groups: rolled });
        return rolled;
      });
      const msg = err instanceof ApiError ? err.message : "فشل مغادرة المجموعة، تحقق من اتصالك وحاول مجدداً";
      Alert.alert("خطأ", msg);
    }
  }, [persist, refreshGroups]);

  const createGroup = useCallback(async (group: Omit<Group, "id" | "members" | "isJoined">): Promise<string> => {
    if (!user) return "";
    const tempId = "g_temp_" + Date.now();
    const newGroup: Group = { ...group, id: tempId, members: [user], isJoined: true };
    setGroups((prev) => {
      const updated = [newGroup, ...prev];
      persist({ groups: updated });
      return updated;
    });

    let finalId = tempId;
    try {
      const { group: created } = await api.createGroup({
        name: group.name,
        sport: group.sport,
        description: group.description,
        adminId: group.adminId,
        adminName: group.adminName,
        isPublic: group.isPublic,
        nextMatch: group.nextMatch,
      });
      finalId = created.id;
      setGroups((prev) => {
        const updated = prev.map((g) => g.id === tempId ? { ...g, id: created.id } : g);
        persist({ groups: updated });
        return updated;
      });
    } catch {
      /* keep temp group locally */
    }

    addNotification({ title: "مجموعة جديدة", body: `أنشأت مجموعة ${group.name}`, type: "group", linkedId: finalId });
    return finalId;
  }, [user, persist, addNotification]);

  const inviteMemberToGroup = useCallback((groupId: string, player: Player) => {
    setGroups((prev) => {
      const updated = prev.map((g) => {
        if (g.id !== groupId) return g;
        const alreadyMember = g.members.some((m) => m.id === player.id);
        if (alreadyMember) return g;
        return {
          ...g,
          members: [...g.members, player],
          memberCount: g.memberCount + 1,
        };
      });
      persist({ groups: updated });
      return updated;
    });
    addNotification({ title: "دعوة عضو", body: `تمت دعوة ${player.nickname} للمجموعة`, type: "group", linkedId: groupId });
    api.inviteToGroup(groupId, player.id).catch(() => {
      setGroups((prev) => {
        const rolled = prev.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            members: g.members.filter((m) => m.id !== player.id),
            memberCount: Math.max(0, g.memberCount - 1),
          };
        });
        persist({ groups: rolled });
        return rolled;
      });
    });
  }, [addNotification, persist]);

  const removeGroupMember = useCallback(async (groupId: string, memberId: string): Promise<boolean> => {
    try {
      await api.removeGroupMember(groupId, memberId);
      setGroups((prev) => {
        const updated = prev.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            members: g.members.filter((m) => m.id !== memberId),
            memberCount: Math.max(0, g.memberCount - 1),
          };
        });
        persist({ groups: updated });
        return updated;
      });
      await fetchGroupById(groupId);
      return true;
    } catch {
      await fetchGroupById(groupId);
      return false;
    }
  }, [persist, fetchGroupById]);

  const updateGroup = useCallback(async (groupId: string, data: { name?: string; description?: string; isPublic?: boolean }): Promise<boolean> => {
    try {
      const { group: updatedGroup } = await api.updateGroup(groupId, data);
      const localGroup = apiGroupToLocal(updatedGroup);
      setGroups((prev) => {
        const updated = prev.map((g) => g.id === groupId ? { ...localGroup, isJoined: g.isJoined, members: g.members } : g);
        persist({ groups: updated });
        return updated;
      });
      await fetchGroupById(groupId);
      return true;
    } catch {
      return false;
    }
  }, [persist, fetchGroupById]);

  const updateGroupMemberRole = useCallback(async (groupId: string, memberId: string, role: "admin" | "member"): Promise<boolean> => {
    try {
      await api.updateGroupMemberRole(groupId, memberId, role);
      setGroups((prev) => {
        const updated = prev.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            members: g.members.map((m) => m.id === memberId ? { ...m, role } : m),
          };
        });
        persist({ groups: updated });
        return updated;
      });
      await fetchGroupById(groupId);
      return true;
    } catch {
      return false;
    }
  }, [persist, fetchGroupById]);

  const deleteGroup = useCallback(async (groupId: string): Promise<boolean> => {
    try {
      await api.deleteGroup(groupId);
      setGroups((prev) => {
        const updated = prev.filter((g) => g.id !== groupId);
        persist({ groups: updated });
        return updated;
      });
      refreshGroups();
      return true;
    } catch {
      return false;
    }
  }, [persist, refreshGroups]);

  const createGroupInviteLink = useCallback(async (groupId: string): Promise<string> => {
    try {
      const res = await api.createGroupInviteLink(groupId);
      return res.inviteLink;
    } catch (err) {
      const errorMsg = err instanceof ApiError ? err.message : "فشل إنشاء رابط الدعوة، يرجى المحاولة مجدداً";
      console.error("[createGroupInviteLink]", errorMsg);
      return "";
    }
  }, []);

  const createMatchInviteLink = useCallback(async (matchId: string): Promise<string> => {
    try {
      const res = await api.createMatchInviteLink(matchId);
      return res.inviteLink;
    } catch (err) {
      const errorMsg = err instanceof ApiError ? err.message : "فشل إنشاء رابط الدعوة، يرجى المحاولة مجدداً";
      console.error("[createMatchInviteLink]", errorMsg);
      return "";
    }
  }, []);

  const acceptInvite = useCallback(async (inviteCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await api.acceptInvite(inviteCode);
      if (result.success) {
        await refreshMatches();
        await refreshGroups();
      }
      return { success: result.success ?? true };
    } catch (err) {
      const errorMsg = err instanceof ApiError ? err.message : "فشل قبول الدعوة، يرجى المحاولة مجدداً";
      return { success: false, error: errorMsg };
    }
  }, [refreshGroups, refreshMatches]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, isRead: true } : n);
      persist({ notifications: updated });
      return updated;
    });
    api.markNotificationRead(id).catch(() => {});
  }, [persist]);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      persist({ notifications: updated });
      return updated;
    });
    api.markAllNotificationsRead().catch(() => {});
  }, [persist]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    persist({ notifications: [] });
    api.clearAllNotifications().catch(() => {});
  }, [persist]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const allPlayers: Player[] = React.useMemo(() => {
    const seenIds = new Set<string>();
    const result: Player[] = [];
    const addPlayer = (p: Player) => {
      if (!seenIds.has(p.id)) { seenIds.add(p.id); result.push(p); }
    };
    if (user) addPlayer(user);
    for (const m of matches) {
      for (const mp of m.players) {
        const { attendance: _a, paymentStatus: _ps, position: _pos, ...base } = mp;
        addPlayer(base as Player);
      }
    }
    for (const g of groups) {
      for (const member of g.members) { addPlayer(member); }
    }
    return result;
  }, [user, matches, groups]);

  if (!loaded) return null;

  return (
    <AppContext.Provider
      value={{
        user, isOnboarded, matches, groups, notifications, unreadCount, allPlayers,
        matchesLoading, matchesError, groupsLoading, groupsError,
        setUser, completeOnboarding, logout,
        refreshMatches, refreshGroups, refreshProfile, fetchGroupById,
        joinMatch, leaveMatch, cancelMatch, createMatch,
        updateMatch, removeMatchPlayer,
        updateAttendance, updatePayment,
        joinGroup, leaveGroup, createGroup, inviteMemberToGroup, removeGroupMember,
        updateGroup, updateGroupMemberRole, deleteGroup,
        createGroupInviteLink, createMatchInviteLink, acceptInvite,
        refreshNotifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications,
        addNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function sportColor(sport: SportType, colors: Record<string, unknown>): string {
  if (sport === "football") return String(colors.football);
  if (sport === "padel") return String(colors.padel);
  return String(colors.tennis);
}

export function sportLabel(sport: SportType): string {
  if (sport === "football") return "كرة القدم";
  if (sport === "padel") return "بادل";
  return "تنس";
}


export function reliabilityColor(score: number | null, colors: Record<string, unknown>): string {
  if (score === null) return String(colors.reliabilityNew);
  if (score >= 90) return String(colors.reliabilityElite);
  if (score >= 70) return String(colors.reliabilityHigh);
  if (score >= 50) return String(colors.reliabilityMedium);
  return String(colors.reliabilityLow);
}

export function reliabilityLabel(score: number | null): string {
  if (score === null) return "جديد";
  if (score >= 90) return "ممتاز";
  if (score >= 70) return "جيد";
  if (score >= 50) return "متوسط";
  return "ضعيف";
}

export function formatReliability(score: number | null, matchesPlayed?: number): string {
  if (score === null || (typeof matchesPlayed === "number" && matchesPlayed < 3)) return "—";
  return `${score}%`;
}

export function formatDate(date: Date): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "اليوم";
  if (diff === 1) return "غداً";
  if (diff === -1) return "أمس";
  if (diff > 1 && diff <= 7) return `بعد ${diff} أيام`;
  if (diff < -1 && diff >= -7) return `منذ ${Math.abs(diff)} أيام`;
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

export function initials(name: string): string {
  return name.charAt(0).toUpperCase();
}
