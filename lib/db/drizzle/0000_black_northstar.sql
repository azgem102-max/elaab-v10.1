CREATE TABLE "otp_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "match_players" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"user_id" text NOT NULL,
	"attended" boolean DEFAULT false,
	"paid" boolean DEFAULT false,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"sport" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"venue" text NOT NULL,
	"location" text,
	"max_players" integer NOT NULL,
	"cost" real DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"organizer_id" text NOT NULL,
	"session_type" text DEFAULT 'match' NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sport" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"admin_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"rater_id" text NOT NULL,
	"rated_user_id" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"related_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
