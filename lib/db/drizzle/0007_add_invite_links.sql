CREATE TABLE IF NOT EXISTS "invite_links" (
  "id" text PRIMARY KEY,
  "token" text NOT NULL UNIQUE,
  "target_type" text NOT NULL,
  "target_id" text NOT NULL,
  "created_by" text NOT NULL,
  "expires_at" timestamp,
  "is_revoked" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);
