import { pgTable, text, timestamp, integer, boolean, real, unique } from "drizzle-orm/pg-core";

// ─── Venues (الملاعب المعتمدة) ─────────────────────────────────────────────
export const venuesTable = pgTable("venues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  sport: text("sport").notNull(),          // football | padel | tennis | multi
  city: text("city").notNull(),
  district: text("district"),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  googleMapsUrl: text("google_maps_url"),
  phone: text("phone"),
  priceRange: text("price_range"),         // e.g. "100-200 ريال"
  imageUrl: text("image_url"),
  rating: real("rating").default(0),
  ratingCount: integer("rating_count").default(0),
  status: text("status").notNull().default("active"),    // active | inactive
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Venue Suggestions (اقتراحات ملاعب من المستخدمين) ────────────────────
export const venueSuggestionsTable = pgTable("venue_suggestions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sport: text("sport").notNull(),
  city: text("city"),
  district: text("district"),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  googleMapsUrl: text("google_maps_url"),
  phone: text("phone"),
  notes: text("notes"),                    // ملاحظات المستخدم
  suggestedBy: text("suggested_by").notNull(),  // FK → users.id (implicit)
  suggestedByName: text("suggested_by_name"),
  status: text("status").notNull().default("pending"),  // pending | approved | rejected
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
});

export type Venue = typeof venuesTable.$inferSelect;
export type InsertVenue = typeof venuesTable.$inferInsert;
export type VenueSuggestion = typeof venueSuggestionsTable.$inferSelect;
export type InsertVenueSuggestion = typeof venueSuggestionsTable.$inferInsert;
