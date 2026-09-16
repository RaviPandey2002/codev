ALTER TABLE "room_members" ADD CONSTRAINT "room_members_user_id_room_id_pk" PRIMARY KEY("user_id","room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");