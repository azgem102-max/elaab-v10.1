CREATE TABLE IF NOT EXISTS "group_join_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "group_id" text NOT NULL,
  "user_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "requested_at" timestamp DEFAULT now() NOT NULL,
  "reviewed_at" timestamp,
  "reviewed_by" text,
  CONSTRAINT "group_join_requests_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'))
);
