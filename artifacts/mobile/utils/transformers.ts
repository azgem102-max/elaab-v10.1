import { ApiMatch } from "../services/api";
import { Match, SportType } from "../context/AppContext";

export function toArabicNumeral(n: number): string {
  return n.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d, 10)]);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9+]/g, "");
  if (digits.length < 8) return phone;
  const prefix = digits.slice(0, 4);
  const suffix = digits.slice(-4);
  return `${prefix}****${suffix}`;
}

export function apiMatchToMatch(item: ApiMatch): Match {
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
    skillLevel: (item.skillLevel as "beginner" | "intermediate" | "advanced" | null) ?? null,
  };
}
