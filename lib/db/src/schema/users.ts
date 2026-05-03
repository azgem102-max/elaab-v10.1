import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  sports: text("sports"),
  skillLevel: text("skill_level"),
  sportProfiles: text("sport_profiles"),
  reliability: integer("reliability"),
  notifMatch: boolean("notif_match").default(true).notNull(),
  notifGroup: boolean("notif_group").default(true).notNull(),
  notifRating: boolean("notif_rating").default(false).notNull(),
  notifWeekly: boolean("notif_weekly").default(true).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const otpCodesTable = pgTable("otp_codes", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: integer("used").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
export type InsertOtpCode = typeof otpCodesTable.$inferInsert;
export type OtpCode = typeof otpCodesTable.$inferSelect;
