import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

// ─── Reminder Logs (سجل التذكيرات — لمنع التكرار) ────────────────────────
export const reminderLogsTable = pgTable("reminder_logs", {
  id: text("id").primaryKey(),
  matchId: text("match_id").notNull(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),            // pre_match | post_match | payment
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (t) => [
  unique("reminder_unique").on(t.matchId, t.userId, t.type),
]);

export type ReminderLog = typeof reminderLogsTable.$inferSelect;
export type InsertReminderLog = typeof reminderLogsTable.$inferInsert;
