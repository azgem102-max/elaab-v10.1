import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const inviteLinksTable = pgTable("invite_links", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  createdBy: text("created_by").notNull(),
  expiresAt: timestamp("expires_at"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertInviteLink = typeof inviteLinksTable.$inferInsert;
export type InviteLink = typeof inviteLinksTable.$inferSelect;
