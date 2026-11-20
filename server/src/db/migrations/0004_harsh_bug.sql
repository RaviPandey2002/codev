CREATE TYPE "public"."arena_platform" AS ENUM('CODEFORCES', 'LEETCODE', 'STANDARD_IO');--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "arena_platform" "arena_platform";