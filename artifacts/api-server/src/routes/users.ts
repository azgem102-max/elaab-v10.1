import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { usersTable, matchPlayersTable, matchesTable, ratingsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import { uploadAvatar } from "../lib/storage";

const router: IRouter = Router();

type AuthRequest = Request & { user: JwtPayload };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم، يُسمح فقط بالصور"));
    }
  },
});

function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0]! : param;
}

export async function recomputeAndPersistReliability(userId: string): Promise<number | null> {
  const externalPlayerRows = await db
    .select({ attended: matchPlayersTable.attended })
    .from(matchPlayersTable)
    .innerJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
    .where(and(
      eq(matchPlayersTable.userId, userId),
      sql`${matchesTable.organizerId} != ${userId}`,
    ));

  const RELIABILITY_MIN_MATCHES = 3;
  const externalJ = externalPlayerRows.length;
  const externalA = externalPlayerRows.filter((r) => r.attended).length;

  let reliability: number | null = null;
  if (externalJ >= RELIABILITY_MIN_MATCHES) {
    const attendanceScore = Math.round((externalA / externalJ) * 100);

    const levelVotes = await db
      .select({ levelAccuracyVote: ratingsTable.levelAccuracyVote })
      .from(ratingsTable)
      .where(eq(ratingsTable.ratedUserId, userId));

    const validLevelVotes = levelVotes.filter((v) => v.levelAccuracyVote != null);
    const LEVEL_VOTE_MIN = 3;
    let levelBonus = 0;
    if (validLevelVotes.length >= LEVEL_VOTE_MIN) {
      const accurateCount = validLevelVotes.filter((v) => v.levelAccuracyVote === "accurate").length;
      const accuracyPct = accurateCount / validLevelVotes.length;
      levelBonus = Math.round(accuracyPct * 10);
    }

    reliability = Math.min(100, attendanceScore + levelBonus);
  }

  await db
    .update(usersTable)
    .set({ reliability, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  return reliability;
}

async function computeUserProfile(userId: string) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });

  const allPlayerRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.userId, userId));

  const matchesPlayed = Number(allPlayerRows[0]?.count ?? 0);

  const reliability = user?.reliability ?? null;

  let sports: string[] = [];
  try {
    if (user?.sports) sports = JSON.parse(user.sports);
  } catch {}

  let sportProfiles: Record<string, { sport: string; skillLevel: string; position: string }> = {};
  try {
    if (user?.sportProfiles) sportProfiles = JSON.parse(user.sportProfiles);
  } catch {}

  return {
    id: user?.id ?? userId,
    name: user?.name ?? "مستخدم",
    phone: user?.phone ?? "",
    avatarUrl: user?.avatarUrl ?? null,
    sports,
    skillLevel: user?.skillLevel ?? null,
    sportProfiles,
    reliability,
    matchesPlayed,
  };
}

router.get("/users/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await computeUserProfile(req.user.userId);
  res.json({ success: true, user: profile });
});

const VALID_SPORTS = ["football", "padel", "tennis"];
const VALID_SKILL_LEVELS = ["مبتدئ", "متوسط", "محترف"];

router.patch("/users/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user.userId;
  const body = req.body as {
    name?: string;
    avatarUrl?: string | null;
    sports?: string[];
    skillLevel?: string;
    sportProfiles?: Record<string, { sport: string; skillLevel: string; skillLevelNumeric?: number | null; position: string }>;
  };

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      res.status(400).json({ success: false, error: "الاسم مطلوب" });
      return;
    }
    updates.name = body.name.trim();
  }

  if (body.avatarUrl !== undefined) {
    if (body.avatarUrl !== null) {
      if (typeof body.avatarUrl !== "string") {
        res.status(400).json({ success: false, error: "رابط الصورة غير صالح" });
        return;
      }
      if (!body.avatarUrl.startsWith("https://") && !body.avatarUrl.startsWith("http://")) {
        res.status(400).json({ success: false, error: "رابط الصورة يجب أن يكون رابطاً صالحاً (http/https)" });
        return;
      }
    }
    updates.avatarUrl = body.avatarUrl;
  }

  if (body.sports !== undefined) {
    if (!Array.isArray(body.sports) || !body.sports.every((s) => typeof s === "string" && VALID_SPORTS.includes(s))) {
      res.status(400).json({ success: false, error: "الرياضات المختارة غير صالحة" });
      return;
    }
    updates.sports = JSON.stringify(body.sports);
  }

  if (body.skillLevel !== undefined) {
    if (typeof body.skillLevel !== "string" || !VALID_SKILL_LEVELS.includes(body.skillLevel)) {
      res.status(400).json({ success: false, error: "مستوى المهارة غير صالح" });
      return;
    }
    updates.skillLevel = body.skillLevel;
  }

  if (body.sportProfiles !== undefined) {
    if (typeof body.sportProfiles !== "object" || body.sportProfiles === null || Array.isArray(body.sportProfiles)) {
      res.status(400).json({ success: false, error: "ملفات الرياضات غير صالحة" });
      return;
    }
    const invalidEntry = Object.entries(body.sportProfiles).find(([key, val]) => {
      if (!VALID_SPORTS.includes(key)) return true;
      if (typeof val !== "object" || val === null) return true;
      if (val.skillLevel !== undefined && !VALID_SKILL_LEVELS.includes(val.skillLevel)) return true;
      if (val.skillLevelNumeric !== undefined && val.skillLevelNumeric !== null) {
        const maxNumeric = key === "padel" ? 6.0 : 7.0;
        if (typeof val.skillLevelNumeric !== "number" || val.skillLevelNumeric < 1.0 || val.skillLevelNumeric > maxNumeric) return true;
      }
      if (val.position !== undefined && (typeof val.position !== "string" || val.position.length > 200)) return true;
      return false;
    });
    if (invalidEntry) {
      res.status(400).json({ success: false, error: "بيانات الملف الرياضي غير صالحة" });
      return;
    }
    updates.sportProfiles = JSON.stringify(body.sportProfiles);
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, error: "لا توجد بيانات للتحديث" });
    return;
  }

  updates.updatedAt = new Date();

  await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId));

  const profile = await computeUserProfile(userId);
  res.json({ success: true, user: profile });
});

router.get("/users/me/notification-settings", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user.userId;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!user) {
    res.status(404).json({ success: false, error: "المستخدم غير موجود" });
    return;
  }
  res.json({
    success: true,
    matchNotifs: user.notifMatch,
    groupNotifs: user.notifGroup,
  });
});

router.patch("/users/me/notification-settings", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user.userId;
  const body = req.body as { matchNotifs?: boolean; groupNotifs?: boolean };

  const updates: Record<string, unknown> = {};

  if (body.matchNotifs !== undefined) {
    if (typeof body.matchNotifs !== "boolean") {
      res.status(400).json({ success: false, error: "قيمة matchNotifs يجب أن تكون boolean" });
      return;
    }
    updates.notifMatch = body.matchNotifs;
  }

  if (body.groupNotifs !== undefined) {
    if (typeof body.groupNotifs !== "boolean") {
      res.status(400).json({ success: false, error: "قيمة groupNotifs يجب أن تكون boolean" });
      return;
    }
    updates.notifGroup = body.groupNotifs;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, error: "لا توجد بيانات للتحديث" });
    return;
  }

  updates.updatedAt = new Date();

  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  res.json({
    success: true,
    matchNotifs: user?.notifMatch ?? true,
    groupNotifs: user?.notifGroup ?? true,
  });
});

router.post(
  "/users/me/avatar",
  requireAuth,
  upload.single("avatar"),
  async (req: AuthRequest, res: Response) => {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      res.status(400).json({ success: false, error: "لم يتم إرفاق صورة" });
      return;
    }

    try {
      // Derive the API base URL from the incoming request so the returned
      // proxy URL is valid in every environment (dev, preview, production).
      const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
      const host = req.headers["x-forwarded-host"] as string | undefined ?? req.headers.host ?? "localhost";
      const apiBase = `${proto}://${host}${req.baseUrl || "/api"}`;
      const avatarUrl = await uploadAvatar(req.user.userId, file.buffer, file.mimetype, apiBase);

      await db
        .update(usersTable)
        .set({ avatarUrl, updatedAt: new Date() })
        .where(eq(usersTable.id, req.user.userId));

      res.json({ success: true, avatarUrl });
    } catch (err) {
      console.error("Avatar upload error:", err);
      res.status(500).json({ success: false, error: "فشل رفع الصورة، حاول مجدداً" });
    }
  }
);

router.get("/users/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = getParam(req.params["id"] as string);

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });

  if (!user) {
    res.status(404).json({ success: false, error: "المستخدم غير موجود" });
    return;
  }

  const profile = await computeUserProfile(userId);

  const externalRows = await db
    .select({ attended: matchPlayersTable.attended })
    .from(matchPlayersTable)
    .innerJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
    .where(and(
      eq(matchPlayersTable.userId, userId),
      sql`${matchesTable.organizerId} != ${userId}`,
    ));

  const matchCount = externalRows.length;
  const attendedCount = externalRows.filter((r) => r.attended).length;

  res.json({
    success: true,
    user: {
      id: profile.id,
      phone: profile.phone,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      reliability: profile.reliability,
      matchCount,
      attendedCount,
      matchesPlayed: profile.matchesPlayed,
    },
  });
});

export default router;
