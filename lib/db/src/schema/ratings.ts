import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core";

export const ratingsTable = pgTable("ratings", {
  id: text("id").primaryKey(),
  matchId: text("match_id").notNull(),
  raterId: text("rater_id").notNull(),
  ratedUserId: text("rated_user_id").notNull(),
  score: integer("score").notNull(),
  ratingType: text("rating_type"),
  levelAccuracyVote: text("level_accuracy_vote"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("ratings_match_rater_rated_unique").on(t.matchId, t.raterId, t.ratedUserId),
]);

export type InsertRating = typeof ratingsTable.$inferInsert;
export type Rating = typeof ratingsTable.$inferSelect;
