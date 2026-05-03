import { pgTable, text, timestamp, boolean, unique, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const groupsTable = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sport: text("sport").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(true),
  adminId: text("admin_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("groups_sport_idx").on(t.sport),
]);

export const groupMembersTable = pgTable("group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  unique("group_members_group_user_unique").on(t.groupId, t.userId),
  check("group_members_role_check", sql`${t.role} IN ('owner', 'admin', 'member')`),
  index("group_members_group_id_idx").on(t.groupId),
  index("group_members_user_id_idx").on(t.userId),
]);

export type InsertGroup = typeof groupsTable.$inferInsert;
export type Group = typeof groupsTable.$inferSelect;
export type InsertGroupMember = typeof groupMembersTable.$inferInsert;
export type GroupMember = typeof groupMembersTable.$inferSelect;
