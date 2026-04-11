import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  relatedId: text("related_id"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertNotification = typeof notificationsTable.$inferInsert;
export type Notification = typeof notificationsTable.$inferSelect;
