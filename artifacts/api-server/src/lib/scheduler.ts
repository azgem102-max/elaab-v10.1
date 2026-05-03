import { db } from "@workspace/db";
import { matchesTable, matchPlayersTable, usersTable, reminderLogsTable } from "@workspace/db/schema";
import { eq, or, lt, gte, and, sql } from "drizzle-orm";
import { sendNotification } from "./push";
import { recomputeAndPersistReliability } from "../routes/users";
import { generateId } from "./id";
import { logger } from "./logger";

// ── Helper: سجّل تذكير في DB لمنع الإعادة ──────────────────────────────
async function logReminder(matchId: string, userId: string, type: string): Promise<boolean> {
  try {
    await db.insert(reminderLogsTable).values({
      id: generateId("rl_"),
      matchId,
      userId,
      type,
    });
    return true; // أُدرج بنجاح = لم يُرسَل من قبل
  } catch {
    return false; // unique constraint violation = مرسل مسبقاً
  }
}

// ── 1) تذكير قبل المباراة بساعة ────────────────────────────────────────
async function checkPreMatchReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 65 * 60 * 1000);

  const matches = await db
    .select()
    .from(matchesTable)
    .where(or(eq(matchesTable.status, "upcoming"), eq(matchesTable.status, "today")));

  for (const match of matches) {
    const matchDate = new Date(`${match.date}T${match.time}:00`);
    if (matchDate < windowStart || matchDate > windowEnd) continue;

    const players = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, match.id));

    for (const player of players) {
      const inserted = await logReminder(match.id, player.userId, "pre_match");
      if (!inserted) continue;
      await sendNotification(
        player.userId,
        "match",
        "تذكير بالمباراة ⏰",
        `مباراة "${match.title}" ستبدأ خلال ساعة في ${match.venue}`,
        match.id,
      );
    }
  }
}

// ── 2) تذكير بعد المباراة بساعتين (تقييم الملاعب + اللاعبين) ──────────
async function checkPostMatchReminders(): Promise<void> {
  const now = new Date();
  // نبحث عن مباريات انتهت من ساعتين إلى 3 ساعات مضت
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const matches = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.status, "completed"));

  for (const match of matches) {
    const matchDate = new Date(`${match.date}T${match.time}:00`);
    if (matchDate < windowStart || matchDate > windowEnd) continue;

    const players = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, match.id));

    for (const player of players) {
      const inserted = await logReminder(match.id, player.userId, "post_match");
      if (!inserted) continue;
      await sendNotification(
        player.userId,
        "match",
        "كيف كانت المباراة؟ ⭐",
        `انتهت مباراة "${match.title}". قيّم زملاءك والملعب الآن!`,
        match.id,
      );
    }
  }
}

// ── 3) تذكير أسبوعي للمستخدمين غير النشطين (اختياري) ──────────────────
async function checkWeeklyReminders(): Promise<void> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 5 = Friday
  const hour = now.getHours();
  // أرسل كل جمعة بين 18:00 و 18:15
  if (dayOfWeek !== 5 || hour !== 18) return;

  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // جلب المستخدمين الذين فعّلوا التذكير الأسبوعي
  const users = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.notifWeekly, true));

  for (const user of users) {
    // تحقق إذا لعب خلال الأسبوع الماضي
    const recentPlay = await db
      .select({ id: matchPlayersTable.id })
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.userId, user.id))
      .limit(1);

    // استخدام reminderLogsTable بـ matchId = "weekly" لتتبع الأسبوع
    const weekKey = `weekly_${now.getFullYear()}_${getWeekNumber(now)}`;
    const inserted = await logReminder(weekKey, user.id, "weekly");
    if (!inserted) continue;

    if (recentPlay.length === 0) {
      await sendNotification(
        user.id,
        "system",
        "لا تفوّت الملعب هذا الأسبوع! ⚽",
        "لم تلعب منذ أسبوع. ابحث عن مباراة الآن وانضم إلى الفريق!",
      );
    }
  }
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ── 4) إكمال المباريات تلقائياً ────────────────────────────────────────
async function autoCompleteMatches(): Promise<void> {
  const now = new Date();

  const activeMatches = await db
    .select()
    .from(matchesTable)
    .where(
      or(
        eq(matchesTable.status, "upcoming"),
        eq(matchesTable.status, "today"),
      )
    );

  for (const match of activeMatches) {
    const matchDateTime = new Date(`${match.date}T${match.time}:00`);
    const completeAt = new Date(matchDateTime.getTime() + 30 * 60 * 1000);
    if (now < completeAt) continue;

    try {
      const players = await db
        .select()
        .from(matchPlayersTable)
        .where(eq(matchPlayersTable.matchId, match.id));

      const playerCount = players.length;
      const quorum = Math.max(2, Math.ceil(match.maxPlayers / 2));
      const underQuorum = playerCount < quorum;

      if (underQuorum) {
        await db
          .update(matchesTable)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(matchesTable.id, match.id));

        await sendNotification(
          match.organizerId,
          "match",
          "تم إلغاء المباراة تلقائياً",
          `مباراة "${match.title}" لم يكتمل نصابها (${playerCount}/${match.maxPlayers}) وتم إلغاؤها`,
          match.id,
        );

        logger.info(
          { matchId: match.id, title: match.title, playerCount, quorum, maxPlayers: match.maxPlayers },
          "Match auto-cancelled (under quorum)"
        );
      } else {
        await db
          .update(matchesTable)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(matchesTable.id, match.id));

        const absentPlayers = players.filter(
          (p) => p.attendanceStatus === "absent"
        );

        for (const player of absentPlayers) {
          await recomputeAndPersistReliability(player.userId).catch((err) => {
            logger.error({ err, userId: player.userId }, "Failed to recompute reliability for absent player");
          });
        }

        logger.info(
          { matchId: match.id, title: match.title, players: playerCount, absentCount: absentPlayers.length },
          "Match auto-completed"
        );
      }
    } catch (err) {
      logger.error({ err, matchId: match.id }, "Error processing match lifecycle");
    }
  }
}

// ── Scheduler Entry Point ───────────────────────────────────────────────
export function startScheduler(): void {
  const INTERVAL_MS = 5 * 60 * 1000; // كل 5 دقائق

  const tick = () => {
    checkPreMatchReminders().catch((err) => logger.error({ err }, "Error in checkPreMatchReminders"));
    checkPostMatchReminders().catch((err) => logger.error({ err }, "Error in checkPostMatchReminders"));
    checkWeeklyReminders().catch((err) => logger.error({ err }, "Error in checkWeeklyReminders"));
    autoCompleteMatches().catch((err) => logger.error({ err }, "Error in autoCompleteMatches"));
  };

  setInterval(tick, INTERVAL_MS);

  // تشغيل فوري عند البدء
  autoCompleteMatches().catch((err) => logger.error({ err }, "Error in initial autoCompleteMatches"));
}

