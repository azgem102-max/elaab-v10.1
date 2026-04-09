CREATE TABLE IF NOT EXISTS "group_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "group_id" text NOT NULL,
  "sender_id" text NOT NULL,
  "sender_name" text NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
