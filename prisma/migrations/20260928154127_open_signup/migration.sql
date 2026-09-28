-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" VARCHAR(16),
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "phone_codes" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "purpose" VARCHAR(10) NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "phone_codes_phone_created_at_idx" ON "phone_codes"("phone", "created_at");

-- CreateIndex
CREATE INDEX "phone_codes_expires_at_idx" ON "phone_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");



-- ---------------------------------------------------------------------------
-- Guarantees Prisma cannot express (ADR 0012, ADR 0018).
-- ---------------------------------------------------------------------------
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_or_phone" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL),
  ADD CONSTRAINT "users_phone_kenyan_mobile" CHECK ("phone" IS NULL OR "phone" ~ '^\+254[17][0-9]{8}$');

ALTER TABLE "phone_codes"
  ADD CONSTRAINT "phone_codes_phone_kenyan_mobile" CHECK ("phone" ~ '^\+254[17][0-9]{8}$'),
  ADD CONSTRAINT "phone_codes_purpose_known" CHECK ("purpose" IN ('signup', 'reset')),
  ADD CONSTRAINT "phone_codes_hash_hex" CHECK ("code_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "phone_codes_attempts_range" CHECK ("attempts" BETWEEN 0 AND 100),
  ADD CONSTRAINT "phone_codes_expiry_after_creation" CHECK ("expires_at" > "created_at");

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "phone_codes" TO app_runtime;
