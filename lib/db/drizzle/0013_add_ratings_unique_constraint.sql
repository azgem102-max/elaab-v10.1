-- Deduplicate existing ratings before adding unique constraint.
-- Keeps the earliest entry (lowest id) for each (match_id, rater_id, rated_user_id) group.
DELETE FROM "ratings"
WHERE "id" NOT IN (
  SELECT MIN("id")
  FROM "ratings"
  GROUP BY "match_id", "rater_id", "rated_user_id"
);

-- Add unique constraint to prevent duplicate ratings.
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_match_rater_rated_unique" UNIQUE("match_id","rater_id","rated_user_id");
