-- Phase 3 (ADR 0006). Adding a NOT NULL column without a default is safe
-- only because no environment has any users yet (verified 2026-09-25: 0 rows
-- in staging and production).

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" VARCHAR(255) NOT NULL;

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- Guarantees Prisma's schema language cannot express (ADR 0012).
-- ===========================================================================

-- Only argon2id hashes may be stored — never a plain or weakly hashed
-- password, whatever a future code path tries to write.
ALTER TABLE "users"
  ADD CONSTRAINT "users_password_hash_argon2id" CHECK ("password_hash" LIKE '$argon2id$%');

-- The stored value is a SHA-256 hex digest of the token, never the token.
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_token_hash_format" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "sessions_expiry_after_creation" CHECK ("expires_at" > "created_at");

-- The app reads, creates, refreshes and deletes sessions; it gets exactly
-- those rights through the default privileges set in the first migration.
-- Stated explicitly here so this migration is correct on its own.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "sessions" TO app_runtime;
