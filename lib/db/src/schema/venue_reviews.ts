import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core";

// ─── Venue Reviews (تقييمات الملاعب) ────────────────────────────────────
export const venueReviewsTable = pgTable("venue_reviews", {
  id: text("id").primaryKey(),
  venueId: text("venue_id"),               // FK → venues.id (nullable for unverified venues)
  venueName: text("venue_name").notNull(), // اسم الملعب وقت التقييم
  matchId: text("match_id").notNull(),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(),     // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("venue_review_match_user_unique").on(t.matchId, t.userId),
]);

export type VenueReview = typeof venueReviewsTable.$inferSelect;
export type InsertVenueReview = typeof venueReviewsTable.$inferInsert;
