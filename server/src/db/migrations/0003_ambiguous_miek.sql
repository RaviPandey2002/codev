CREATE TYPE "public"."room_role" AS ENUM('OWNER', 'EDITOR', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."room_source" AS ENUM('SCRATCHPAD', 'COMPILER', 'GITHUB', 'TEMPLATE');--> statement-breakpoint
CREATE TABLE "room_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar(21) NOT NULL,
	"path" varchar(500) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "room_members" DROP CONSTRAINT IF EXISTS "room_members_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "yjs_snapshots" DROP CONSTRAINT IF EXISTS "yjs_snapshots_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "room_members" DROP CONSTRAINT IF EXISTS "room_members_user_id_room_id_pk";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "room_id" SET DATA TYPE varchar(21);--> statement-breakpoint
ALTER TABLE "room_members" ALTER COLUMN "room_id" SET DATA TYPE varchar(21);--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "id" SET DATA TYPE varchar(21);--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "yjs_snapshots" ALTER COLUMN "room_id" SET DATA TYPE varchar(21);--> statement-breakpoint
ALTER TABLE "room_members" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "room_members" ADD COLUMN "role" "room_role" DEFAULT 'EDITOR' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "source_type" "room_source" DEFAULT 'SCRATCHPAD' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "github_repo" varchar(255);--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "github_branch" varchar(100);--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "room_files" ADD CONSTRAINT "room_files_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yjs_snapshots" ADD CONSTRAINT "yjs_snapshots_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "room_files_room_path_idx" ON "room_files" USING btree ("room_id","path");--> statement-breakpoint
CREATE INDEX "room_files_room_id_idx" ON "room_files" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_members_room_user_idx" ON "room_members" USING btree ("room_id","user_id");--> statement-breakpoint
CREATE INDEX "room_members_user_id_idx" ON "room_members" USING btree ("user_id");