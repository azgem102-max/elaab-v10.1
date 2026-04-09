ALTER TABLE "match_players" ADD COLUMN IF NOT EXISTS "attendance_status" text DEFAULT 'pending';
UPDATE "match_players" SET "attendance_status" = 'present' WHERE "attended" = true;
UPDATE "match_players" SET "attendance_status" = 'pending' WHERE "attended" = false OR "attended" IS NULL;
