-- CreateTable
CREATE TABLE "app_handoffs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "challenge" CHAR(43) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),

    CONSTRAINT "app_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_handoffs_code_hash_key" ON "app_handoffs"("code_hash");

-- CreateIndex
CREATE INDEX "app_handoffs_user_id_idx" ON "app_handoffs"("user_id");

-- AddForeignKey
ALTER TABLE "app_handoffs" ADD CONSTRAINT "app_handoffs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Guarantees (ADR 0012, 0025): a SHA-256 of the code, a base64url SHA-256
-- challenge, and a short life.
ALTER TABLE "app_handoffs"
  ADD CONSTRAINT "app_handoffs_code_hash_hex" CHECK ("code_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "app_handoffs_challenge_b64url" CHECK ("challenge" ~ '^[A-Za-z0-9_-]{43}$'),
  ADD CONSTRAINT "app_handoffs_short_lived" CHECK ("expires_at" > "created_at" AND "expires_at" <= "created_at" + interval '10 minutes'),
  ADD CONSTRAINT "app_handoffs_used_in_time" CHECK ("used_at" IS NULL OR "used_at" >= "created_at");

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "app_handoffs" TO app_runtime;
