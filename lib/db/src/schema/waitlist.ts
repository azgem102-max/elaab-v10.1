import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

// ─── Match Waitlist (قائمة انتظار المباريات الممتلئة) ────────────────────
export const matchWaitlistTable = pgTable("match_waitlist", {
  id: text("id").primaryKey(),
  matchId: text("match_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  position: text("position"),              // المركز المطلوب
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("waitlist_match_user_unique").on(t.matchId, t.userId),
]);

export type MatchWaitlistEntry = typeof matchWaitlistTable.$inferSelect;
export type InsertMatchWaitlistEntry = typeof matchWaitlistTable.$inferInsert;
