import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const TOKEN_KEY = "@elab_token";
const USER_ID_KEY = "@elab_user_id";

function getApiBaseUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl;
  }
  const publicDomain = process.env.EXPO_PUBLIC_DOMAIN;
  if (publicDomain) {
    return `https://${publicDomain}/api`;
  }
  if (Platform.OS === "web") {
    return "/api";
  }
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    return `http://${host}:3001/api`;
  }
  throw new Error(
    "API base URL is not configured. Set EXPO_PUBLIC_API_URL in your environment."
  );
}

const API_BASE = getApiBaseUrl();

let _cachedToken: string | null = null;

export async function saveToken(token: string, userId?: string): Promise<void> {
  _cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (userId) {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  }
}

export async function getToken(): Promise<string | null> {
  if (_cachedToken) return _cachedToken;
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  _cachedToken = token;
  return token;
}

export async function clearToken(): Promise<void> {
  _cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_ID_KEY);
}

export async function getSavedUserId(): Promise<string | null> {
  return AsyncStorage.getItem(USER_ID_KEY);
}

const API_TIMEOUT_MS = 15000;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = await getToken();
  const isGet = !options?.method || options.method === "GET";
  const merged: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (isGet) merged["Cache-Control"] = "no-cache";
  if (token) merged["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: merged,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort =
      controller.signal.aborted ||
      (err instanceof Error && err.name === "AbortError") ||
      (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError");
    if (isAbort) {
      throw new ApiError(0, "انتهت مهلة الاتصال. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.");
    }
    throw new ApiError(0, "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
  }
  clearTimeout(timeoutId);
  if (response.status === 401) {
    await clearToken();
    throw new ApiError(401, "انتهت جلستك، يرجى تسجيل الدخول مجدداً");
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let msg = text;
    let conflictMatch: { id: string; title: string; time: string; date: string } | undefined;
    try {
      const parsed = JSON.parse(text) as { error?: string; conflictMatch?: { id: string; title: string; time: string; date: string } };
      if (parsed.error) msg = parsed.error;
      if (parsed.conflictMatch) conflictMatch = parsed.conflictMatch;
    } catch { }
    throw new ApiError(response.status, msg || `API ${options?.method ?? "GET"} ${path} failed (${response.status})`, conflictMatch);
  }
  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  conflictMatch?: { id: string; title: string; time: string; date: string };
  constructor(public status: number, message: string, conflictMatch?: { id: string; title: string; time: string; date: string }) {
    super(message);
    this.name = "ApiError";
    this.conflictMatch = conflictMatch;
  }
}

export type ApiSport = "football" | "padel" | "tennis";
export type ApiMatchStatus = "upcoming" | "today" | "completed" | "cancelled";

export interface ApiMatchPlayer {
  id: string;
  nickname: string;
  reliability: number | null;
  matchesPlayed: number;
  badges: ("artist" | "rock" | "bolt")[];
  position: string;
  attendance: "present" | "absent" | "pending";
  paymentStatus: "paid" | "pending";
}

export interface ApiMatch {
  id: string;
  title: string;
  sport: ApiSport;
  date: string;
  time: string;
  venue: string;
  location?: string;
  lat?: number | null;
  lng?: number | null;
  maxPlayers: number;
  cost: number;
  isPublic: boolean;
  organizerId: string;
  organizerName: string;
  organizerReliability: number | null;
  playerCount: number;
  status: ApiMatchStatus;
  sessionType: "match" | "training";
  matchFormat?: "single" | "double" | null;
  skillLevel?: "beginner" | "intermediate" | "advanced" | null;
  description?: string;
  joinedByCurrentUser?: boolean;
  invitedGroupId?: string;
  players?: ApiMatchPlayer[];
  organizerPhone?: string | null;
  organizerPhoneFull?: string | null;
  hasRated?: boolean;
}

export interface ApiGroupMember {
  id: string;
  nickname: string;
  reliability: number | null;
  sports: string[];
  sportProfiles: Record<string, unknown>;
  matchesPlayed: number;
  badges: string[];
  rating: { artist: number; rock: number; bolt: number };
  role?: "owner" | "admin" | "member";
}

export interface ApiGroupNextMatch {
  id: string;
  title: string;
  date: string;
  time: string;
  sport: string;
  playerCount: number;
  maxPlayers: number;
}

export interface ApiGroup {
  id: string;
  name: string;
  sport: ApiSport;
  description: string;
  memberCount: number;
  adminId: string;
  adminName: string;
  isPublic: boolean;
  nextMatch: ApiGroupNextMatch | string | null;
  isJoined?: boolean;
  members?: ApiGroupMember[];
}

export interface ApiNotification {
  id: string;
  type: "match" | "group" | "rating" | "system";
  title: string;
  body: string;
  linkedId?: string;
  isRead: boolean;
  time: string;
}

export type ApiSkillLevel = "مبتدئ" | "متوسط" | "محترف";
export type ApiSportType = "football" | "padel" | "tennis";

export interface ApiSportProfile {
  sport: string;
  skillLevel: string;
  skillLevelNumeric?: number | null;
  position: string;
}

export interface ApiUserProfile {
  id: string;
  name: string;
  phone: string;
  avatarUrl: string | null;
  sports: ApiSportType[];
  skillLevel: ApiSkillLevel | null;
  sportProfiles: Record<string, ApiSportProfile>;
  reliability: number | null;
  matchesPlayed: number;
  badges: string[];
  rating: { artist: number; rock: number; bolt: number };
}

export const api = {
  healthz: () => apiFetch<{ status: string; version: string }>("/healthz"),

  requestOtp: (phone: string) =>
    apiFetch<{ success: boolean }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, otp: string) =>
    apiFetch<{ success: boolean; token?: string; userId?: string; isNewUser?: boolean }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    }),

  listMatches: (params?: { sport?: string; type?: string; date?: string; openOnly?: boolean; skill_level?: string; time_of_day?: string; has_spots?: boolean; lat?: number; lng?: number; radius?: number }) => {
    const query = new URLSearchParams();
    if (params?.sport) query.set("sport", params.sport);
    if (params?.type) query.set("type", params.type);
    if (params?.date) query.set("date", params.date);
    if (params?.openOnly) query.set("openOnly", "true");
    if (params?.skill_level) query.set("skill_level", params.skill_level);
    if (params?.time_of_day) query.set("time_of_day", params.time_of_day);
    if (params?.has_spots) query.set("has_spots", "true");
    if (params?.lat != null) query.set("lat", String(params.lat));
    if (params?.lng != null) query.set("lng", String(params.lng));
    if (params?.radius != null) query.set("radius", String(params.radius));
    const qs = query.toString();
    return apiFetch<{ matches: ApiMatch[] }>(`/matches${qs ? `?${qs}` : ""}`);
  },

  getMatch: (id: string) => apiFetch<{ match: ApiMatch }>(`/matches/${id}`),

  createMatch: (data: Omit<ApiMatch, "id" | "playerCount" | "joinedByCurrentUser" | "players"> & { lat?: number | null; lng?: number | null }) =>
    apiFetch<{ match: ApiMatch }>("/matches", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  joinMatch: (id: string, position?: string | null) =>
    apiFetch<{ success: boolean; playerCount: number }>(`/matches/${id}/join`, {
      method: "POST",
      body: JSON.stringify({ position: position ?? null }),
    }),

  leaveMatch: (id: string) =>
    apiFetch<{ success: boolean; playerCount: number }>(`/matches/${id}/leave`, {
      method: "POST",
    }),

  cancelMatch: (id: string) =>
    apiFetch<{ success: boolean }>(`/matches/${id}`, {
      method: "DELETE",
    }),

  updateMatch: (id: string, data: { title?: string; venue?: string; location?: string | null; date?: string; time?: string; cost?: number; maxPlayers?: number; description?: string; skillLevel?: "beginner" | "intermediate" | "advanced" | null }) =>
    apiFetch<{ success: boolean; match: ApiMatch }>(`/matches/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  completeMatch: (id: string) =>
    apiFetch<{ success: boolean; match: ApiMatch }>(`/matches/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    }),

  removeMatchPlayer: (matchId: string, playerId: string) =>
    apiFetch<{ success: boolean; playerCount: number }>(`/matches/${matchId}/players/${playerId}`, {
      method: "DELETE",
    }),

  rateMatch: (id: string, ratings: Record<string, string>, levelAccuracyVotes?: Record<string, string>) =>
    apiFetch<{ success: boolean }>(`/matches/${id}/rate`, {
      method: "POST",
      body: JSON.stringify({ ratings, ...(levelAccuracyVotes && Object.keys(levelAccuracyVotes).length > 0 ? { levelAccuracyVotes } : {}) }),
    }),

  listGroups: (params?: { q?: string; sport?: string }) => {
    const parts: string[] = [];
    if (params?.q) parts.push(`q=${encodeURIComponent(params.q)}`);
    if (params?.sport) parts.push(`sport=${encodeURIComponent(params.sport)}`);
    const qs = parts.length > 0 ? `?${parts.join("&")}` : "";
    return apiFetch<{ groups: ApiGroup[] }>(`/groups${qs}`);
  },

  getGroup: (id: string) => apiFetch<{ group: ApiGroup }>(`/groups/${id}`),

  createGroup: (data: Omit<ApiGroup, "id" | "memberCount" | "isJoined" | "members">) =>
    apiFetch<{ group: ApiGroup }>("/groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  joinGroup: (id: string) =>
    apiFetch<{ success: boolean; memberCount: number }>(`/groups/${id}/join`, {
      method: "POST",
    }),

  leaveGroup: (id: string) =>
    apiFetch<{ success: boolean; memberCount: number }>(`/groups/${id}/leave`, {
      method: "POST",
    }),

  inviteToGroup: (groupId: string, inviteeId: string) =>
    apiFetch<{ success: boolean }>(`/groups/${groupId}/invite`, {
      method: "POST",
      body: JSON.stringify({ inviteeId }),
    }),

  removeGroupMember: (groupId: string, userId: string) =>
    apiFetch<{ success: boolean; memberCount: number }>(`/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    }),

  createGroupInviteLink: async (groupId: string): Promise<{ inviteLink: string }> => {
    const res = await apiFetch<{ success: boolean; token: string; expiresAt: string }>(`/groups/${groupId}/invite-link`, {
      method: "POST",
    });
    return { inviteLink: res.token };
  },

  getInvite: (token: string) =>
    apiFetch<{
      success: boolean;
      invite: {
        targetType: string;
        group?: {
          id: string;
          name: string;
          sport: string;
          description: string;
          memberCount: number;
          adminId: string;
          adminName: string;
          isPublic: boolean;
          isJoined: boolean;
        };
        match?: {
          id: string;
          title: string;
          sport: string;
          date: string;
          time: string;
          venue: string;
          maxPlayers: number;
          playerCount: number;
          organizerId: string;
          organizerName: string;
          isPublic: boolean;
          isJoined: boolean;
        };
      };
    }>(`/invites/${token}`),

  acceptInvite: (token: string) =>
    apiFetch<{ success: boolean; alreadyMember?: boolean; groupId?: string; matchId?: string; memberCount?: number; playerCount?: number }>(`/invites/${token}/accept`, {
      method: "POST",
    }),

  createMatchInviteLink: async (matchId: string): Promise<{ inviteLink: string }> => {
    const res = await apiFetch<{ success: boolean; token: string; expiresAt: string }>(`/matches/${matchId}/invite-link`, {
      method: "POST",
    });
    return { inviteLink: res.token };
  },

  updateAttendance: (matchId: string, userId: string, status: string) =>
    apiFetch<{ success: boolean }>(`/matches/${matchId}/attendance`, {
      method: "PUT",
      body: JSON.stringify({ userId, status }),
    }),

  updatePayment: (matchId: string, userId: string, status: string) =>
    apiFetch<{ success: boolean }>(`/matches/${matchId}/players/${userId}/payment`, {
      method: "PATCH",
      body: JSON.stringify({ paid: status === "paid" }),
    }),

  sendPaymentReminder: (matchId: string) =>
    apiFetch<{ success: boolean; notified: number }>(`/matches/${matchId}/payment-reminder`, {
      method: "POST",
    }),

  markAttendeesPaid: (matchId: string) =>
    apiFetch<{ success: boolean; marked: number }>(`/matches/${matchId}/mark-attendees-paid`, {
      method: "POST",
    }),

  getProfile: () =>
    apiFetch<{ success: boolean; user: ApiUserProfile }>("/users/me"),

  updateProfile: (data: { name?: string; avatarUrl?: string | null; sports?: ApiSportType[]; skillLevel?: ApiSkillLevel; sportProfiles?: Record<string, ApiSportProfile> }) =>
    apiFetch<{ success: boolean; user: ApiUserProfile }>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  uploadAvatar: async (formData: FormData): Promise<{ success: boolean; avatarUrl: string }> => {
    const url = `${API_BASE}/users/me/avatar`;
    const token = await getToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort =
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError") ||
        (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError");
      if (isAbort) throw new ApiError(0, "انتهت مهلة الاتصال. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.");
      throw new ApiError(0, "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
    }
    clearTimeout(timeoutId);
    if (response.status === 401) {
      await clearToken();
      throw new ApiError(401, "انتهت جلستك، يرجى تسجيل الدخول مجدداً");
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let msg = text;
      try {
        const parsed = JSON.parse(text) as { error?: string };
        if (parsed.error) msg = parsed.error;
      } catch { }
      throw new ApiError(response.status, msg || `فشل رفع الصورة (${response.status})`);
    }
    return response.json() as Promise<{ success: boolean; avatarUrl: string }>;
  },

  registerPushToken: (token: string) =>
    apiFetch<{ success: boolean }>("/push/register", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  unregisterPushToken: (token: string) =>
    apiFetch<{ success: boolean }>("/push/unregister", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    }),

  getGroupMessages: (groupId: string, after?: string) => {
    const qs = after ? `?after=${encodeURIComponent(after)}` : "";
    return apiFetch<{
      success: boolean;
      messages: { id: string; senderId: string; senderName: string; text: string; createdAt: string }[];
    }>(`/groups/${groupId}/messages${qs}`);
  },

  updateGroup: (groupId: string, data: { name?: string; description?: string; isPublic?: boolean }) =>
    apiFetch<{ success: boolean; group: ApiGroup }>(`/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateGroupMemberRole: (groupId: string, userId: string, role: "admin" | "member") =>
    apiFetch<{ success: boolean; userId: string; role: string }>(`/groups/${groupId}/members/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  deleteGroup: (groupId: string) =>
    apiFetch<{ success: boolean }>(`/groups/${groupId}`, {
      method: "DELETE",
    }),

  sendGroupMessage: (groupId: string, text: string) =>
    apiFetch<{
      success: boolean;
      message: { id: string; senderId: string; senderName: string; text: string; createdAt: string };
    }>(`/groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  listNotifications: () =>
    apiFetch<{ notifications: ApiNotification[] }>("/notifications"),

  markNotificationRead: (id: string) =>
    apiFetch<{ success: boolean }>(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllNotificationsRead: () =>
    apiFetch<{ success: boolean }>("/notifications/read-all", {
      method: "PATCH",
    }),

  deleteNotification: (id: string) =>
    apiFetch<{ success: boolean }>(`/notifications/${id}`, { method: "DELETE" }),

  clearAllNotifications: () =>
    apiFetch<{ success: boolean }>("/notifications", {
      method: "DELETE",
    }),

  getNotificationSettings: () =>
    apiFetch<{ success: boolean; matchNotifs: boolean; groupNotifs: boolean; ratingNotifs: boolean }>("/users/me/notification-settings"),

  updateNotificationSettings: (data: { matchNotifs?: boolean; groupNotifs?: boolean; ratingNotifs?: boolean }) =>
    apiFetch<{ success: boolean; matchNotifs: boolean; groupNotifs: boolean; ratingNotifs: boolean }>("/users/me/notification-settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

};
