CREATE TYPE "public"."wishlist_visibility" AS ENUM('PRIVATE', 'ROOM', 'PUBLIC');--> statement-breakpoint
CREATE TABLE "saved_problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "arena_platform" NOT NULL,
	"canonical_key" varchar(255) NOT NULL,
	"title" varchar(300) NOT NULL,
	"url" text,
	"contest_id" integer,
	"problem_index" varchar(32),
	"difficulty" varchar(50),
	"time_limit" varchar(100),
	"memory_limit" varchar(100),
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"input_specification" text,
	"output_specification" text,
	"sample_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"code_snippets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wishlist_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"note" text,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"room_id" varchar(21),
	"name" varchar(100) NOT NULL,
	"description" text,
	"visibility" "wishlist_visibility" DEFAULT 'PRIVATE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_problem_id_saved_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."saved_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_problems_platform_key_idx" ON "saved_problems" USING btree ("platform","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_items_wishlist_problem_idx" ON "wishlist_items" USING btree ("wishlist_id","problem_id");--> statement-breakpoint
CREATE INDEX "wishlist_items_wishlist_id_idx" ON "wishlist_items" USING btree ("wishlist_id");--> statement-breakpoint
CREATE INDEX "wishlists_owner_id_idx" ON "wishlists" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "wishlists_room_id_idx" ON "wishlists" USING btree ("room_id");