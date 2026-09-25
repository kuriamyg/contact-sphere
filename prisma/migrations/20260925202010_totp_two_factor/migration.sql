-- AlterTable
ALTER TABLE "users" ADD COLUMN     "totp_enabled_at" TIMESTAMPTZ(3),
ADD COLUMN     "totp_last_step" BIGINT,
ADD COLUMN     "totp_secret" VARCHAR(255);

-- CreateTable
CREATE TABLE "recovery_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMPTZ(3),

    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recovery_codes_code_hash_key" ON "recovery_codes"("code_hash");

-- CreateIndex
CREATE INDEX "recovery_codes_user_id_idx" ON "recovery_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_challenges_token_hash_key" ON "mfa_challenges"("token_hash");

-- CreateIndex
CREATE INDEX "mfa_challenges_user_id_idx" ON "mfa_challenges"("user_id");

-- AddForeignKey
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_challenges" ADD CONSTRAINT "mfa_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- Guarantees Prisma's schema language cannot express (ADR 0012, 0013).
-- ===========================================================================

-- The TOTP secret may only ever be stored encrypted (versioned envelope),
-- never as the raw base32 secret an authenticator app would accept.
ALTER TABLE "users"
  ADD CONSTRAINT "users_totp_secret_encrypted" CHECK ("totp_secret" IS NULL OR "totp_secret" LIKE 'v1:%'),
  ADD CONSTRAINT "users_totp_enabled_needs_secret" CHECK ("totp_enabled_at" IS NULL OR "totp_secret" IS NOT NULL),
  ADD CONSTRAINT "users_totp_last_step_positive" CHECK ("totp_last_step" IS NULL OR "totp_last_step" > 0);

ALTER TABLE "recovery_codes"
  ADD CONSTRAINT "recovery_codes_hash_format" CHECK ("code_hash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "mfa_challenges"
  ADD CONSTRAINT "mfa_challenges_token_hash_format" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "mfa_challenges_expiry_after_creation" CHECK ("expires_at" > "created_at"),
  ADD CONSTRAINT "mfa_challenges_attempts_bounded" CHECK ("attempts" BETWEEN 0 AND 100);

-- Row access for the app, stated explicitly (default privileges also cover it).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "recovery_codes" TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "mfa_challenges" TO app_runtime;
