-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone_verified_at" TIMESTAMPTZ(3),
ADD COLUMN     "recovery_key_hash" CHAR(64);


-- Until now every phone number came in through an SMS code (B6), so each
-- one was proven when its account was made. Password sign-ups (ADR 0021)
-- leave this null.
UPDATE "users" SET "phone_verified_at" = "created_at" WHERE "phone" IS NOT NULL;

ALTER TABLE "users"
  -- Only a number can be verified.
  ADD CONSTRAINT "users_phone_verified_needs_phone" CHECK ("phone_verified_at" IS NULL OR "phone" IS NOT NULL),
  -- A SHA-256 in lower-case hex, never a key itself.
  ADD CONSTRAINT "users_recovery_key_hash_format" CHECK ("recovery_key_hash" IS NULL OR "recovery_key_hash" ~ '^[0-9a-f]{64}$');
