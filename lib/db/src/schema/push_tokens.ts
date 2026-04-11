import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const pushTokensTable = pgTable("push_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertPushToken = typeof pushTokensTable.$inferInsert;
export type PushToken = typeof pushTokensTable.$inferSelect;
