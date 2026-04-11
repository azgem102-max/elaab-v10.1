import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { matchesTable, matchPlayersTable, usersTable, groupMembersTable, inviteLinksTable, ratingsTable } from "@workspace/db/schema";
import { eq, and, sql, inArray, lt, or } from "drizzle-orm";
import { requireAuth, verifyToken } from "../lib/auth";
import { generateId } from "../lib/id";
import { sendNotification } from "../lib/push";
import type { JwtPayload } from "../lib/auth";
import { recomputeAndPersistReliability } from "./users";
import { logger } from "../lib/logger";
import crypto from "crypto";
import { z } from "zod";

const router: IRouter = Router();

type AuthRequest = Request & { user: JwtPayload };

function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0]! : param;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9+]/g, "");
  if (digits.length < 8) return phone;
  const prefix = digits.slice(0, 4);
  const suffix = digits.slice(-4);
  return `${prefix}****${suffix}`;
}

async function computeMatchStatus(date: string, time: string, storedStatus?: string | null): Promise<"upcoming" | "today" | "completed" | "cancelled"> {
  if (storedStatus === "completed") return "completed";
  if (storedStatus === "cancelled") return "cancelled";
  const matchDate = new Date(`${date}T${time}:00`);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  if (matchDate < todayStart) return "completed";
  if (matchDate >= todayStart && matchDate < todayEnd) return "today";
  return "upcoming";
}

async function buildMatchSummary(match: typeof matchesTable.$inferSelect, currentUserId?: string) {
  const playerRows = await db
    .select()
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.matchId, match.id));

  const organizer = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, match.organizerId),
  });

  const externalRows = await db
    .select({ matchId: matchPlayersTable.matchId, attended: matchPlayersTable.attended })
    .from(matchPlayersTable)
    .innerJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
    .where(and(
      eq(matchPlayersTable.userId, match.organizerId),
      sql`${matchesTable.organizerId} != ${match.organizerId}`,
    ));

  const joined = externalRows.length;
  const attended = externalRows.filter((r) => r.attended).length;
  const reliability = joined > 0 ? Math.round((attended / joined) * 100) : null;

  const status = await computeMatchStatus(match.date, match.time, match.status);

  const joinedByCurrentUser = currentUserId
    ? playerRows.some((p) => p.userId === currentUserId)
    : false;

  return {
    id: match.id,
    title: match.title,
    sport: match.sport,
    date: match.date,
    time: match.time,
    venue: match.venue,
    location: match.location ?? "",
    lat: match.lat ?? null,
    lng: match.lng ?? null,
    maxPlayers: match.maxPlayers,
    cost: match.cost,
    isPublic: match.isPublic,
    organizerId: match.organizerId,
    organizerName: organizer?.name ?? "مستخدم",
    organizerReliability: reliability,
    playerCount: playerRows.length,
    status,
    sessionType: match.sessionType as "match" | "training",
    matchFormat: match.matchFormat ?? null,
    skillLevel: match.skillLevel ?? null,
    description: match.description ?? undefined,
    joinedByCurrentUser,
    invitedGroupId: match.invitedGroupId ?? undefined,
  };
}

async function buildMatchDetails(match: typeof matchesTable.$inferSelect, req?: Request, currentUserId?: string) {
  const summary = await buildMatchSummary(match, currentUserId);

  const playerRows = await db
    .select()
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.matchId, match.id));

  const players = await Promise.all(
    playerRows.map(async (row) => {
      const u = await db.query.usersTable.findFirst({ where: eq(usersTable.id, row.userId) });

      const allPlayerRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(matchPlayersTable)
        .where(eq(matchPlayersTable.userId, row.userId));

      const externalPlayerRows = await db
        .select({ attended: matchPlayersTable.attended })
        .from(matchPlayersTable)
        .innerJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
        .where(and(
          eq(matchPlayersTable.userId, row.userId),
          sql`${matchesTable.organizerId} != ${row.userId}`,
        ));

      const totalMatches = Number(allPlayerRows[0]?.count ?? 0);
      const externalJ = externalPlayerRows.length;
      const externalA = externalPlayerRows.filter((r) => r.attended).length;

      const RELIABILITY_MIN_MATCHES = 3;
      let rel: number | null = null;
      if (externalJ >= RELIABILITY_MIN_MATCHES) {
        const attendanceScore = Math.round((externalA / externalJ) * 100);
        rel = Math.min(100, attendanceScore);
      }

      let skillLevelNumeric: number | null = null;
      let playerSkillLevel: string | null = null;
      try {
        const sportProfiles = u?.sportProfiles ? JSON.parse(u.sportProfiles) : {};
        const sportProfile = sportProfiles[match.sport];
        if (sportProfile) {
          if (typeof sportProfile.skillLevelNumeric === "number") {
            skillLevelNumeric = sportProfile.skillLevelNumeric;
          }
          if (typeof sportProfile.skillLevel === "string") {
            playerSkillLevel = sportProfile.skillLevel;
          }
        }
      } catch {}

      return {
        id: row.userId,
        nickname: u?.name ?? "مستخدم",
        reliability: rel,
        matchesPlayed: totalMatches,
        position: row.position ?? "لاعب",
        attendance: row.attendanceStatus ?? (row.attended ? "present" : "pending"),
        paymentStatus: row.paid ? "paid" : "pending",
        skillLevelNumeric,
        skillLevel: playerSkillLevel,
      };
    })
  );

  const costPerPlayer = match.cost;
  const paidCount = playerRows.filter((r) => r.paid).length;
  const totalCollected = Math.round(paidCount * costPerPlayer * 100) / 100;
  const totalMatchBudget = Math.round(match.maxPlayers * costPerPlayer * 100) / 100;
  const totalExpected = totalMatchBudget;

  const organizer = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, match.organizerId),
  });

  const organizerPhone = organizer?.phone ? maskPhone(organizer.phone) : null;
  const isJoined = summary.joinedByCurrentUser || match.organizerId === currentUserId;
  const organizerPhoneFull = currentUserId && isJoined ? (organizer?.phone ?? null) : null;

  return { ...summary, players, costPerPlayer, totalCollected, totalExpected, totalMatchBudget, paidCount, organizerPhone, organizerPhoneFull };
}

function extractUserId(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  try {
    const payload = verifyToken(authHeader.slice(7));
    return payload?.userId;
  } catch { return undefined; }
}

router.get("/matches", async (req: Request, res: Response) => {
  const currentUserId = extractUserId(req);
  const typeFilter = typeof req.query["type"] === "string" ? req.query["type"] : undefined;
  const sportFilter = typeof req.query["sport"] === "string" ? req.query["sport"] : undefined;
  const dateFilter = typeof req.query["date"] === "string" ? req.query["date"] : undefined;
  const openOnly = req.query["openOnly"] === "true";
  const skillLevelFilter = typeof req.query["skill_level"] === "string" ? req.query["skill_level"] : undefined;
  const timeOfDayFilter = typeof req.query["time_of_day"] === "string" ? req.query["time_of_day"] : undefined;
  const hasSpots = req.query["has_spots"] === "true";
  const userLat = typeof req.query["lat"] === "string" ? parseFloat(req.query["lat"]) : undefined;
  const userLng = typeof req.query["lng"] === "string" ? parseFloat(req.query["lng"]) : undefined;
  const radiusKm = typeof req.query["radius"] === "string" ? parseFloat(req.query["radius"]) : undefined;

  const publicMatches = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.isPublic, true));

  const visiblePublicMatches = publicMatches;

  let groupMatches: typeof publicMatches = [];
  if (currentUserId) {
    const memberRows = await db
      .select()
      .from(groupMembersTable)
      .where(eq(groupMembersTable.userId, currentUserId));

    if (memberRows.length > 0) {
      const allPrivateGroupMatches = await db
        .select()
        .from(matchesTable)
        .where(eq(matchesTable.isPublic, false));

      const memberGroupIds = new Set(memberRows.map((r) => r.groupId));
      groupMatches = allPrivateGroupMatches.filter(
        (m) => m.invitedGroupId && memberGroupIds.has(m.invitedGroupId)
      );
    }
  }

  const seenIds = new Set<string>();
  let allMatches: typeof publicMatches = [];
  for (const m of [...visiblePublicMatches, ...groupMatches]) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id);
      allMatches.push(m);
    }
  }

  if (typeFilter === "match" || typeFilter === "training") {
    allMatches = allMatches.filter((m) => m.sessionType === typeFilter);
  }

  if (sportFilter) {
    allMatches = allMatches.filter((m) => m.sport === sportFilter);
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowEnd = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  let upcomingMatches = allMatches.filter((m) => {
    const matchDate = new Date(`${m.date}T${m.time}:00`);
    return matchDate >= todayStart;
  });

  if (dateFilter === "today") {
    upcomingMatches = upcomingMatches.filter((m) => {
      const matchDate = new Date(`${m.date}T${m.time}:00`);
      return matchDate >= todayStart && matchDate < todayEnd;
    });
  } else if (dateFilter === "tomorrow") {
    upcomingMatches = upcomingMatches.filter((m) => {
      const matchDate = new Date(`${m.date}T${m.time}:00`);
      return matchDate >= todayEnd && matchDate < tomorrowEnd;
    });
  } else if (dateFilter === "thisWeek") {
    upcomingMatches = upcomingMatches.filter((m) => {
      const matchDate = new Date(`${m.date}T${m.time}:00`);
      return matchDate >= todayStart && matchDate < weekEnd;
    });
  }

  if (skillLevelFilter) {
    upcomingMatches = upcomingMatches.filter((m) => m.skillLevel === skillLevelFilter);
  }

  if (timeOfDayFilter) {
    upcomingMatches = upcomingMatches.filter((m) => {
      const [hourStr] = m.time.split(":");
      const hour = parseInt(hourStr ?? "0", 10);
      if (timeOfDayFilter === "morning") return hour >= 5 && hour < 12;
      if (timeOfDayFilter === "afternoon") return hour >= 12 && hour < 17;
      if (timeOfDayFilter === "evening") return hour >= 17 && hour < 24;
      return true;
    });
  }

  if (userLat !== undefined && userLng !== undefined && radiusKm !== undefined &&
      !isNaN(userLat) && !isNaN(userLng) && !isNaN(radiusKm) && radiusKm > 0) {
    upcomingMatches = upcomingMatches.filter((m) => {
      if (m.lat == null || m.lng == null) return false;
      const dLat = ((m.lat - userLat) * Math.PI) / 180;
      const dLng = ((m.lng - userLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLat * Math.PI) / 180) *
          Math.cos((m.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distKm = 6371 * c;
      return distKm <= radiusKm;
    });
  }

  const summaries = await Promise.all(upcomingMatches.map((m) => buildMatchSummary(m, currentUserId)));

  const finalSummaries = (openOnly || hasSpots)
    ? summaries.filter((s) => s.playerCount < s.maxPlayers)
    : summaries;

  res.json({ matches: finalSummaries });
});

router.get("/matches/:id", async (req: Request, res: Response) => {
  const matchId = getParam(req.params["id"] as string);
  const currentUserId = extractUserId(req);

  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!match) {
    res.status(404).json({ success: false, error: "المباراة غير موجودة" });
    return;
  }

  if (!match.isPublic) {
    if (!currentUserId) {
      res.status(403).json({ success: false, error: "هذه المباراة خاصة" });
      return;
    }
    const isOrganizer = match.organizerId === currentUserId;
    let isGroupMember = false;
    if (match.invitedGroupId) {
      const membership = await db.query.groupMembersTable.findFirst({
        where: and(
          eq(groupMembersTable.groupId, match.invitedGroupId),
          eq(groupMembersTable.userId, currentUserId),
        ),
      });
      isGroupMember = !!membership;
    }
    const isPlayer = !!(await db.query.matchPlayersTable.findFirst({
      where: and(
        eq(matchPlayersTable.matchId, matchId),
        eq(matchPlayersTable.userId, currentUserId),
      ),
    }));
    if (!isOrganizer && !isGroupMember && !isPlayer) {
      res.status(403).json({ success: false, error: "هذه المباراة خاصة" });
      return;
    }
  }

  const details = await buildMatchDetails(match, req, currentUserId);
  res.json({ match: details });
});

router.post("/matches", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = (req.body ?? {}) as {
      title?: string;
      sport?: string;
      date?: string;
      time?: string;
      venue?: string;
      location?: string;
      lat?: number;
      lng?: number;
      maxPlayers?: number;
      cost?: number;
      isPublic?: boolean;
      sessionType?: string;
      matchFormat?: string;
      skillLevel?: string;
      invitedGroupId?: string;
      description?: string;
    };

    const { title, sport, date, time, venue, location, lat, lng, maxPlayers, cost, isPublic, sessionType, matchFormat, skillLevel, invitedGroupId, description } = body;

    if (!title || !sport || !date || !time || !venue || maxPlayers === undefined || cost === undefined) {
      res.status(400).json({ success: false, error: "بيانات المباراة غير مكتملة" });
      return;
    }

    const matchDateTime = new Date(`${date}T${time}:00`);
    if (isNaN(matchDateTime.getTime())) {
      res.status(400).json({ success: false, error: "تاريخ أو وقت المباراة غير صحيح" });
      return;
    }
    const now = new Date();
    if (matchDateTime < now) {
      res.status(400).json({ success: false, error: "لا يمكن إنشاء مباراة بتاريخ في الماضي" });
      return;
    }

    if (isPublic === false && !invitedGroupId) {
      res.status(400).json({ success: false, error: "الجلسة الخاصة يجب أن تكون مرتبطة بمجموعة" });
      return;
    }

    let resolvedGroupId: string | null = null;
    if (invitedGroupId) {
      const creatorMembership = await db.query.groupMembersTable.findFirst({
        where: and(
          eq(groupMembersTable.groupId, invitedGroupId),
          eq(groupMembersTable.userId, req.user.userId),
        ),
      });
      if (!creatorMembership) {
        res.status(403).json({ success: false, error: "يجب أن تكون عضوًا في المجموعة لربط الجلسة بها" });
        return;
      }
      resolvedGroupId = invitedGroupId;
    }

    const VALID_SKILL_LEVELS_MATCH = ["beginner", "intermediate", "advanced"] as const;
    const resolvedSkillLevel = skillLevel && (VALID_SKILL_LEVELS_MATCH as readonly string[]).includes(skillLevel)
      ? skillLevel as typeof VALID_SKILL_LEVELS_MATCH[number]
      : null;

    const resolvedLat = (typeof lat === "number" && isFinite(lat)) ? lat : null;
    const resolvedLng = (typeof lng === "number" && isFinite(lng)) ? lng : null;

    const matchId = generateId("m_");
    await db.insert(matchesTable).values({
      id: matchId,
      title,
      sport,
      date,
      time,
      venue,
      location: location ?? "",
      lat: resolvedLat,
      lng: resolvedLng,
      maxPlayers: (sport === "padel" || sport === "tennis")
        ? (matchFormat === "single" ? 2 : 4)
        : Number(maxPlayers),
      cost: Number(cost),
      isPublic: isPublic !== false,
      organizerId: req.user.userId,
      sessionType: sessionType ?? "match",
      description: description ?? null,
      matchFormat: (sport === "padel" || sport === "tennis") && (matchFormat === "single" || matchFormat === "double") ? matchFormat : null,
      skillLevel: resolvedSkillLevel,
      status: "upcoming",
      invitedGroupId: resolvedGroupId,
    });

    await db.insert(matchPlayersTable).values({
      id: generateId("mp_"),
      matchId,
      userId: req.user.userId,
      attended: false,
      paid: false,
    });

    const match = await db.query.matchesTable.findFirst({
      where: eq(matchesTable.id, matchId),
    });

    if (!match) {
      res.status(500).json({ success: false, error: "خطأ في إنشاء المباراة" });
      return;
    }

    if (resolvedGroupId) {
      const groupMembers = await db
        .select()
        .from(groupMembersTable)
        .where(eq(groupMembersTable.groupId, resolvedGroupId));

      const isTraining = sessionType === "training";
      const notifTitle = isTraining ? "تمرين جديد للمجموعة 🏋️" : "مباراة جديدة للمجموعة ⚽";
      const notifBody = `"${title}" في ${venue} — ${date} الساعة ${time}`;

      for (const member of groupMembers) {
        if (member.userId === req.user.userId) continue;
        await sendNotification(member.userId, "match", notifTitle, notifBody, matchId);
      }
    }

    const summary = await buildMatchSummary(match, req.user.userId);
    res.status(201).json({ match: summary });
  } catch (err) {
    logger.error({ err }, "Error creating match");
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم عند إنشاء المباراة" });
  }
});

router.delete("/matches/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const matchId = getParam(req.params["id"] as string);
  const userId = req.user.userId;

  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!match) {
    res.status(404).json({ success: false, error: "المباراة غير موجودة" });
    return;
  }

  if (match.organizerId !== userId) {
    res.status(403).json({ success: false, error: "فقط المنظم يمكنه إلغاء المباراة" });
    return;
  }

  const players = await db.query.matchPlayersTable.findMany({
    where: eq(matchPlayersTable.matchId, matchId),
  });

  const playerUserIds = players.map((p) => p.userId).filter((uid) => uid !== userId);

  if (playerUserIds.length > 0) {
    const playerUsers = await db.query.usersTable.findMany({
      where: inArray(usersTable.id, playerUserIds),
    });
    await Promise.allSettled(
      playerUsers.map((player) =>
        sendNotification(
          player.id,
          "match",
          "تم إلغاء المباراة",
          `تم إلغاء مباراة "${match.title}" من قبل المنظّم`,
          matchId
        )
      )
    );
  }

  await db.delete(matchPlayersTable).where(eq(matchPlayersTable.matchId, matchId));
  await db.delete(matchesTable).where(eq(matchesTable.id, matchId));

  res.json({ success: true });
});

router.post("/matches/:id/join", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const matchId = getParam(req.params["id"] as string);
    const userId = req.user.userId;

    const match = await db.query.matchesTable.findFirst({
      where: eq(matchesTable.id, matchId),
    });

    if (!match) {
      res.status(404).json({ success: false, error: "المباراة غير موجودة" });
      return;
    }

    if (!match.isPublic) {
      const isOrganizer = match.organizerId === userId;
      let isGroupMember = false;
      if (match.invitedGroupId) {
        const membership = await db.query.groupMembersTable.findFirst({
          where: and(
            eq(groupMembersTable.groupId, match.invitedGroupId),
            eq(groupMembersTable.userId, userId),
          ),
        });
        isGroupMember = !!membership;
      }
      if (!isOrganizer && !isGroupMember) {
        res.status(403).json({ success: false, error: "هذه المباراة خاصة — لا يمكنك الانضمام" });
        return;
      }
    }

    const existing = await db.query.matchPlayersTable.findFirst({
      where: and(
        eq(matchPlayersTable.matchId, matchId),
        eq(matchPlayersTable.userId, userId),
      ),
    });

    if (existing) {
      res.status(409).json({ success: false, error: "أنت منضم بالفعل إلى هذه المباراة" });
      return;
    }

    const players = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, matchId));

    if (players.length >= match.maxPlayers) {
      res.status(400).json({ success: false, error: "المباراة ممتلئة" });
      return;
    }

    const userOtherPlayerRows = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.userId, userId));

    if (userOtherPlayerRows.length > 0) {
      const userMatchIds = userOtherPlayerRows.map((p) => p.matchId);
      const otherMatches = await db
        .select()
        .from(matchesTable)
        .where(inArray(matchesTable.id, userMatchIds));

      const targetStart = new Date(`${match.date}T${match.time}:00`).getTime();
      const DURATION_MS = 2 * 60 * 60 * 1000;
      const targetEnd = targetStart + DURATION_MS;

      for (const otherMatch of otherMatches) {
        if (otherMatch.id === matchId) continue;
        const otherStart = new Date(`${otherMatch.date}T${otherMatch.time}:00`).getTime();
        const otherEnd = otherStart + DURATION_MS;
        const overlaps = targetStart < otherEnd && otherStart < targetEnd;
        if (overlaps) {
          res.status(409).json({
            success: false,
            error: `يوجد تعارض مع مباراة أخرى: ${otherMatch.title} في ${otherMatch.time}`,
            conflictMatch: { id: otherMatch.id, title: otherMatch.title, time: otherMatch.time, date: otherMatch.date },
          });
          return;
        }
      }
    }

    const joinBody = (req.body ?? {}) as { position?: string | null };
    const joinPosition = typeof joinBody.position === "string" && joinBody.position.trim()
      ? joinBody.position.trim()
      : null;

    await db.insert(matchPlayersTable).values({
      id: generateId("mp_"),
      matchId,
      userId,
      position: joinPosition,
      attended: false,
      paid: false,
    });

    const joiningUser = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    });
    const joinerName = joiningUser?.name ?? "لاعب جديد";

    const updatedPlayers = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, matchId));
    const playerCount = updatedPlayers.length;
    const isFull = playerCount >= match.maxPlayers;

    if (isFull) {
      await sendNotification(
        match.organizerId,
        "match",
        "اكتملت المباراة! 🎉",
        `مباراة "${match.title}" اكتملت بالعدد المطلوب`,
        matchId,
      );
    } else {
      await sendNotification(
        match.organizerId,
        "match",
        "لاعب جديد انضم ⚽",
        `${joinerName} انضم إلى مباراة "${match.title}"`,
        matchId,
      );
    }

    res.json({ success: true, playerCount });
  } catch (err) {
    logger.error({ err }, "Error joining match");
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم عند الانضمام للمباراة" });
  }
});

router.post("/matches/:id/leave", requireAuth, async (req: AuthRequest, res: Response) => {
  const matchId = getParam(req.params["id"] as string);
  const userId = req.user.userId;

  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!match) {
    res.status(404).json({ success: false, error: "المباراة غير موجودة" });
    return;
  }

  if (match.organizerId === userId) {
    res.status(403).json({ success: false, error: "المنظم لا يمكنه مغادرة المباراة" });
    return;
  }

  const leavingUser = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  const leaverName = leavingUser?.name ?? "لاعب";

  await db
    .delete(matchPlayersTable)
    .where(and(
      eq(matchPlayersTable.matchId, matchId),
      eq(matchPlayersTable.userId, userId),
    ));

  if (match.organizerId !== userId) {
    await sendNotification(
      match.organizerId,
      "match",
      "لاعب غادر المباراة 🚪",
      `${leaverName} غادر مباراة "${match.title}"`,
      matchId,
    );
  }

  const updatedPlayers = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, matchId));
  res.json({ success: true, playerCount: updatedPlayers.length });
});

router.put("/matches/:id/attendance", requireAuth, async (req: AuthRequest, res: Response) => {
  const matchId = getParam(req.params["id"] as string);
  const body = (req.body ?? {}) as { userId?: string; attended?: boolean; status?: string };

  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!match) {
    res.status(404).json({ success: false, error: "المباراة غير موجودة" });
    return;
  }

  if (match.organizerId !== req.user.userId) {
    res.status(403).json({ success: false, error: "هذه الميزة للمنظم فقط" });
    return;
  }

  if (!body.userId) {
    res.status(400).json({ success: false, error: "بيانات غير مكتملة" });
    return;
  }

  const VALID_STATUSES = ["pending", "present", "absent"] as const;
  type AttendanceStatus = typeof VALID_STATUSES[number];

  let attendanceStatus: AttendanceStatus;
  if (body.status && VALID_STATUSES.includes(body.status as AttendanceStatus)) {
    attendanceStatus = body.status as AttendanceStatus;
  } else if (body.attended !== undefined) {
    attendanceStatus = body.attended ? "present" : "pending";
  } else {
    res.status(400).json({ success: false, error: "بيانات غير مكتملة" });
    return;
  }

  const playerRecord = await db.query.matchPlayersTable.findFirst({
    where: and(
      eq(matchPlayersTable.matchId, matchId),
      eq(matchPlayersTable.userId, body.userId),
    ),
  });

  if (!playerRecord) {
    res.status(404).json({ success: false, error: "اللاعب غير موجود في هذه المباراة" });
    return;
  }

  await db
    .update(matchPlayersTable)
    .set({
      attendanceStatus,
      attended: attendanceStatus === "present",
    })
    .where(and(
      eq(matchPlayersTable.matchId, matchId),
      eq(matchPlayersTable.userId, body.userId),
    ));

  recomputeAndPersistReliability(body.userId).catch((err) => {
    logger.error({ err, userId: body.userId }, "Failed to recompute reliability after attendance update");
  });

  if (body.userId !== req.user.userId) {
    if (attendanceStatus === "present") {
      await sendNotification(
        body.userId,
        "match",
        "تم تأكيد حضورك ✅",
        `المنظّم أكّد حضورك في مباراة "${match.title}"`,
        matchId,
      );
    } else if (attendanceStatus === "absent") {
      await sendNotification(
        body.userId,
        "match",
        "تم رفض حضورك ❌",
        `المنظّم لم يؤكّد حضورك في مباراة "${match.title}"`,
        matchId,
      );
    }
  }

  res.json({ success: true });
});

router.patch("/matches/:id/players/:userId/payment", requireAuth, async (req: AuthRequest, res: Response) => {
  const matchId = getParam(req.params["id"] as string);
  const targetUserId = getParam(req.params["userId"] as string);
  const body = (req.body ?? {}) as { paid?: boolean };

  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!match) {
    res.status(404).json({ success: false, error: "المباراة غير موجودة" });
    return;
  }

  if (match.organizerId !== req.user.userId) {
    res.status(403).json({ success: false, error: "هذه الميزة للمنظم فقط" });
    return;
  }

  if (body.paid === undefined) {
    res.status(400).json({ success: false, error: "بيانات غير مكتملة" });
    return;
  }

  const player = await db.query.matchPlayersTable.findFirst({
    where: and(
      eq(matchPlayersTable.matchId, matchId),
      eq(matchPlayersTable.userId, targetUserId),
    ),
  });

  if (!player) {
    res.status(404).json({ success: false, error: "اللاعب غير موجود في هذه المباراة" });
    return;
  }

  await db
    .update(matchPlayersTable)
    .set({ paid: body.paid })
    .where(and(
      eq(matchPlayersTable.matchId, matchId),
      eq(matchPlayersTable.userId, targetUserId),
    ));

  res.json({ success: true });
});

router.patch("/matches/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const matchId = getParam(req.params["id"] as string);
  const userId = req.user.userId;

  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!match) {
    res.status(404).json({ success: false, error: "المباراة غير موجودة" });
    return;
  }

  if (match.organizerId !== userId) {
    res.status(403).json({ success: false, error: "فقط المنظم يمكنه تعديل المباراة" });
    return;
  }

  const updateMatchSchema = z.object({
    title: z.string().trim().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل").max(100).optional(),
    venue: z.string().trim().min(3, "اسم الملعب يجب أن يكون 3 أحرف على الأقل").max(200).optional(),
    location: z.string().max(2000).nullable().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تنسيق التاريخ غير صحيح (YYYY-MM-DD)").optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/, "تنسيق الوقت غير صحيح (HH:MM)").optional(),
    cost: z.number().min(0, "التكلفة يجب أن تكون 0 أو أكثر").max(100000, "التكلفة تجاوزت الحد الأقصى").optional(),
    maxPlayers: z.number().int().min(2, "الحد الأدنى للاعبين هو 2").max(100, "الحد الأقصى للاعبين هو 100").optional(),
    description: z.string().max(500).nullable().optional(),
    skillLevel: z.enum(["beginner", "intermediate", "advanced"]).nullable().optional(),
    status: z.enum(["completed"]).optional(),
  }).strict();

  const parsed = updateMatchSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    res.status(400).json({ success: false, error: firstError?.message ?? "بيانات غير صحيحة" });
    return;
  }

  const body = parsed.data;

  const updateData: Partial<typeof matchesTable.$inferInsert> = {};
  if (body.title) updateData.title = body.title;
  if (body.venue) updateData.venue = body.venue;
  if (body.date) updateData.date = body.date;
  if (body.time) updateData.time = body.time;
  if (body.cost !== undefined) updateData.cost = body.cost;
  if (body.maxPlayers !== undefined) {
    const currentPlayerCount = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, matchId));
    if (body.maxPlayers < currentPlayerCount.length) {
      res.status(400).json({ success: false, error: "لا يمكن تقليل العدد الأقصى إلى أقل من عدد اللاعبين المسجلين حالياً" });
      return;
    }
    updateData.maxPlayers = body.maxPlayers;
  }
  if (body.location !== undefined) updateData.location = body.location || "";
  if (body.description !== undefined) updateData.description = body.description || null;
  if (body.skillLevel !== undefined) updateData.skillLevel = body.skillLevel;
  if (body.status === "completed") updateData.status = "completed";

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ success: false, error: "لا توجد بيانات للتحديث" });
    return;
  }

  if (body.date || body.time) {
    const newDate = body.date ?? match.date;
    const newTime = body.time ?? match.time;
    const matchDateTime = new Date(`${newDate}T${newTime}:00`);
    if (isNaN(matchDateTime.getTime())) {
      res.status(400).json({ success: false, error: "تاريخ أو وقت غير صحيح" });
      return;
    }
  }

  await db
    .update(matchesTable)
    .set(updateData)
    .where(eq(matchesTable.id, matchId));

  const updatedMatch = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!updatedMatch) {
    res.status(500).json({ success: false, error: "خطأ في تحديث المباراة" });
    return;
  }

  const players = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, matchId));
  for (const player of players) {
    if (player.userId === userId) continue;
    await sendNotification(
      player.userId,
      "match",
      "تم تعديل المباراة",
      `تم تعديل تفاصيل مباراة "${updatedMatch.title}"`,
      matchId,
    );
  }

  const summary = await buildMatchSummary(updatedMatch, userId);
  res.json({ success: true, match: summary });
});

router.delete("/matches/:id/players/:playerId", requireAuth, async (req: AuthRequest, res: Response) => {
  const matchId = getParam(req.params["id"] as string);
  const playerId = getParam(req.params["playerId"] as string);
  const organizerId = req.user.userId;

  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!match) {
    res.status(404).json({ success: false, error: "المباراة غير موجودة" });
    return;
  }

  if (match.organizerId !== organizerId) {
    res.status(403).json({ success: false, error: "فقط المنظم يمكنه إزالة اللاعبين" });
    return;
  }

  if (playerId === organizerId) {
    res.status(400).json({ success: false, error: "لا يمكن إزالة المنظم من المباراة" });
    return;
  }

  const playerRecord = await db.query.matchPlayersTable.findFirst({
    where: and(
      eq(matchPlayersTable.matchId, matchId),
      eq(matchPlayersTable.userId, playerId),
    ),
  });

  if (!playerRecord) {
    res.status(404).json({ success: false, error: "اللاعب غير موجود في هذه المباراة" });
    return;
  }

  await db
    .delete(matchPlayersTable)
    .where(and(
      eq(matchPlayersTable.matchId, matchId),
      eq(matchPlayersTable.userId, playerId),
    ));

  const removedUser = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, playerId),
  });

  await sendNotification(
    playerId,
    "match",
    "تم إزالتك من المباراة",
    `تم إزالتك من مباراة "${match.title}" بواسطة المنظّم`,
    matchId,
  );

  const updatedPlayers = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, matchId));

  res.json({ success: true, playerCount: updatedPlayers.length, removedName: removedUser?.name ?? "لاعب" });
});

router.post("/matches/:id/payment-reminder", requireAuth, async (req: AuthRequest, res: Response) => {
  const matchId = getParam(req.params["id"] as string);
  const organizerId = req.user.userId;

  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!match) {
    res.status(404).json({ success: false, error: "المباراة غير موجودة" });
    return;
  }

  if (match.organizerId !== organizerId) {
    res.status(403).json({ success: false, error: "هذه الميزة للمنظم فقط" });
    return;
  }

  if (match.cost === 0) {
    res.status(400).json({ success: false, error: "المباراة مجانية، لا توجد مدفوعات" });
    return;
  }

  const players = await db
    .select()
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.matchId, matchId));

  const unpaidPlayers = players.filter((p) => !p.paid && p.userId !== organizerId);

  if (unpaidPlayers.length === 0) {
    res.json({ success: true, notified: 0 });
    return;
  }

  const results = await Promise.allSettled(
    unpaidPlayers.map((p) =>
      sendNotification(
        p.userId,
        "match",
        "تذكير بالدفع 💰",
        `المنظّم يذكّرك بدفع حصتك (${match.cost} ر.س) في مباراة "${match.title}"`,
        matchId,
      )
    )
  );

  const delivered = results.filter((r) => r.status === "fulfilled").length;
  res.json({ success: true, notified: delivered, attempted: unpaidPlayers.length });
});

router.post("/matches/:id/mark-attendees-paid", requireAuth, async (req: AuthRequest, res: Response) => {
  const matchId = getParam(req.params["id"] as string);
  const organizerId = req.user.userId;

  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!match) {
    res.status(404).json({ success: false, error: "المباراة غير موجودة" });
    return;
  }

  if (match.organizerId !== organizerId) {
    res.status(403).json({ success: false, error: "هذه الميزة للمنظم فقط" });
    return;
  }

  if (match.cost === 0) {
    res.status(400).json({ success: false, error: "المباراة مجانية، لا توجد مدفوعات" });
    return;
  }

  const players = await db
    .select()
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.matchId, matchId));

  const attendeeIds = players
    .filter((p) => (p.attendanceStatus === "present" || p.attended === true) && !p.paid)
    .map((p) => p.userId);

  if (attendeeIds.length === 0) {
    res.json({ success: true, marked: 0 });
    return;
  }

  await db
    .update(matchPlayersTable)
    .set({ paid: true })
    .where(and(eq(matchPlayersTable.matchId, matchId), inArray(matchPlayersTable.userId, attendeeIds)));

  res.json({ success: true, marked: attendeeIds.length });
});

router.post("/matches/:id/invite-link", requireAuth, async (req: AuthRequest, res: Response) => {
  const matchId = getParam(req.params["id"] as string);
  const requesterId = req.user.userId;

  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, matchId),
  });

  if (!match) {
    res.status(404).json({ success: false, error: "المباراة غير موجودة" });
    return;
  }

  if (match.organizerId !== requesterId) {
    res.status(403).json({ success: false, error: "فقط منظّم المباراة يمكنه إنشاء رابط دعوة" });
    return;
  }

  await db
    .delete(inviteLinksTable)
    .where(
      and(
        eq(inviteLinksTable.targetId, matchId),
        eq(inviteLinksTable.targetType, "match"),
        or(
          eq(inviteLinksTable.isRevoked, true),
          lt(inviteLinksTable.expiresAt, new Date()),
        ),
      ),
    );

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(inviteLinksTable).values({
    id: generateId("inv_"),
    token,
    targetType: "match",
    targetId: matchId,
    createdBy: requesterId,
    expiresAt,
    isRevoked: false,
  });

  res.json({ success: true, token, expiresAt: expiresAt.toISOString() });
});

router.post("/matches/:id/level-votes", requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const matchId = getParam(req.params["id"] ?? "");
  const raterId = authReq.user.userId;

  const votesSchema = z.record(z.enum(["higher", "accurate", "lower"]));
  const bodySchema = z.object({ votes: votesSchema });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }
  const { votes } = parsed.data;

  const match = await db.query.matchesTable.findFirst({ where: eq(matchesTable.id, matchId) });
  if (!match) {
    res.status(404).json({ error: "المباراة غير موجودة" });
    return;
  }

  const matchStatus = await computeMatchStatus(match.date, match.time, match.status);
  if (matchStatus !== "completed") {
    res.status(400).json({ error: "يمكن التقييم فقط للمباريات المنتهية" });
    return;
  }

  const playerRows = await db
    .select({ userId: matchPlayersTable.userId })
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.matchId, matchId));

  const playerIds = playerRows.map((r) => r.userId);
  const allParticipantIds = new Set([...playerIds, match.organizerId]);

  const isParticipant = allParticipantIds.has(raterId);
  if (!isParticipant) {
    res.status(403).json({ error: "يجب أن تكون لاعباً في هذه المباراة" });
    return;
  }

  let inserted = 0;
  let skipped = 0;
  let alreadyVoted = 0;

  for (const [ratedUserId, vote] of Object.entries(votes)) {
    if (ratedUserId === raterId) {
      skipped++;
      continue;
    }
    if (!allParticipantIds.has(ratedUserId)) {
      skipped++;
      continue;
    }
    try {
      const result = await db.insert(ratingsTable).values({
        id: generateId("rtg_"),
        matchId,
        raterId,
        ratedUserId,
        score: 0,
        ratingType: null,
        levelAccuracyVote: vote,
      }).onConflictDoNothing();
      if (result.rowCount === 0) {
        alreadyVoted++;
      } else {
        inserted++;
      }
    } catch (err) {
      logger.error({ err, matchId, raterId, ratedUserId }, "Failed to insert level vote");
      skipped++;
    }
  }

  res.json({ success: true, inserted, skipped, alreadyVoted });
});

export default router;
