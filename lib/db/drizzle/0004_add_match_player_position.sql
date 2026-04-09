ALTER TABLE "match_players" ADD COLUMN IF NOT EXISTS "position" text;
ALTER TABLE "match_players" ALTER COLUMN "position" DROP DEFAULT;
