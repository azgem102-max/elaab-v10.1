import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const groupMessagesTable = pgTable("group_messages", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull(),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertGroupMessage = typeof groupMessagesTable.$inferInsert;
export type GroupMessage = typeof groupMessagesTable.$inferSelect;
