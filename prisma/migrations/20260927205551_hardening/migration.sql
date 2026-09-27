-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "device" VARCHAR(60);

-- CreateTable
CREATE TABLE "login_failures" (
    "key_hash" CHAR(64) NOT NULL,
    "failures" SMALLINT NOT NULL,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "login_failures_pkey" PRIMARY KEY ("key_hash")
);

-- CreateIndex
CREATE INDEX "login_failures_window_started_at_idx" ON "login_failures"("window_started_at");



-- ---------------------------------------------------------------------------
-- Guarantees Prisma cannot express (ADR 0012).
-- ---------------------------------------------------------------------------
ALTER TABLE "login_failures"
  ADD CONSTRAINT "login_failures_key_hex" CHECK ("key_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "login_failures_count_range" CHECK ("failures" BETWEEN 1 AND 10000);

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_device_tidy" CHECK ("device" IS NULL OR ("device" = btrim("device") AND "device" <> ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "login_failures" TO app_runtime;
