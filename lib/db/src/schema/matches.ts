import { pgTable, text, timestamp, integer, real, boolean, unique } from "drizzle-orm/pg-core";

export const matchesTable = pgTable("matches", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sport: text("sport").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  venue: text("venue").notNull(),
  location: text("location"),
  lat: real("lat"),
  lng: real("lng"),
  maxPlayers: integer("max_players").notNull(),
  cost: real("cost").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  organizerId: text("organizer_id").notNull(),
  invitedGroupId: text("invited_group_id"),
  sessionType: text("session_type").notNull().default("match"),
  description: text("description"),
  matchFormat: text("match_format"),
  skillLevel: text("skill_level"),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const matchPlayersTable = pgTable("match_players", {
  id: text("id").primaryKey(),
  matchId: text("match_id").notNull(),
  userId: text("user_id").notNull(),
  position: text("position"),
  attended: boolean("attended").default(false),
  attendanceStatus: text("attendance_status").default("pending"),
  paid: boolean("paid").default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  unique("match_players_match_user_unique").on(t.matchId, t.userId),
]);

export type InsertMatch = typeof matchesTable.$inferInsert;
export type Match = typeof matchesTable.$inferSelect;
export type InsertMatchPlayer = typeof matchPlayersTable.$inferInsert;
export type MatchPlayer = typeof matchPlayersTable.$inferSelect;
