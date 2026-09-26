-- AlterTable
ALTER TABLE "users" ADD COLUMN     "display_name" VARCHAR(100);


-- A name is either absent or real text: never blank or padded.
ALTER TABLE "users"
  ADD CONSTRAINT "users_display_name_trimmed" CHECK ("display_name" IS NULL OR ("display_name" = btrim("display_name") AND length("display_name") > 0));
