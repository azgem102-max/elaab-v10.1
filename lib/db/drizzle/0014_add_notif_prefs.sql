ALTER TABLE "users" ADD COLUMN "notif_match" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN "notif_group" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN "notif_rating" boolean DEFAULT false NOT NULL;
