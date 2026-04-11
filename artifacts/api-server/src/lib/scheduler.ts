import { db } from "@workspace/db";
import { matchesTable, matchPlayersTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { sendNotification } from "./push";
import { recomputeAndPersistReliability } from "../routes/users";
import { logger } from "./logger";

const sentReminders = new Set<string>();
const processedLifecycle = new Set<string>();

async function checkMatchReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);

  const matches = await db.select().from(matchesTable);

  for (const match of matches) {
    const matchDate = new Date(`${match.date}T${match.time}:00`);

    if (matchDate < windowStart || matchDate > windowEnd) continue;

    const reminderKey = `reminder_${match.id}`;
    if (sentReminders.has(reminderKey)) continue;

    sentReminders.add(reminderKey);

    const players = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, match.id));

    for (const player of players) {
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
    if (processedLifecycle.has(match.id)) continue;

    const matchDateTime = new Date(`${match.date}T${match.time}:00`);
    const completeAt = new Date(matchDateTime.getTime() + 30 * 60 * 1000);

    if (now < completeAt) continue;

    processedLifecycle.add(match.id);

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
      processedLifecycle.delete(match.id);
    }
  }
}

export function startScheduler(): void {
  const INTERVAL_MS = 5 * 60 * 1000;

  setInterval(() => {
    checkMatchReminders().catch((err) => {
      logger.error({ err }, "Error in checkMatchReminders");
    });
    autoCompleteMatches().catch((err) => {
      logger.error({ err }, "Error in autoCompleteMatches");
    });
  }, INTERVAL_MS);

  autoCompleteMatches().catch((err) => {
    logger.error({ err }, "Error in initial autoCompleteMatches");
  });
}
