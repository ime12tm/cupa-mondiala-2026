ALTER TABLE "users" ADD COLUMN "group_stage_deadline_passed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_stages" DROP COLUMN "points_multiplier";