import { pgTable, text, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const groupJoinRequestsTable = pgTable("group_join_requests", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
}, (t) => [
  check("group_join_requests_status_check", sql`${t.status} IN ('pending', 'approved', 'rejected')`),
]);

export type InsertGroupJoinRequest = typeof groupJoinRequestsTable.$inferInsert;
export type GroupJoinRequest = typeof groupJoinRequestsTable.$inferSelect;
