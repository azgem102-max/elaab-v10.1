ALTER TABLE "group_members" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'member';

UPDATE "group_members" gm
SET "role" = 'owner'
FROM "groups" g
WHERE gm."group_id" = g."id" AND gm."user_id" = g."admin_id";
