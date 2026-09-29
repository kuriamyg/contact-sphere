-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_sub" VARCHAR(255),
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");


-- Every account keeps at least one way to sign in: a password or Google.
ALTER TABLE "users"
  ADD CONSTRAINT "users_can_sign_in" CHECK ("password_hash" IS NOT NULL OR "google_sub" IS NOT NULL),
  ADD CONSTRAINT "users_google_sub_format" CHECK ("google_sub" IS NULL OR "google_sub" ~ '^[0-9A-Za-z_-]{1,255}$');
