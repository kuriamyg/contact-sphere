-- AlterTable
ALTER TABLE "users" ADD COLUMN     "card_contact_id" UUID,
ADD COLUMN     "digest_sent_on" DATE;

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "endpoint" VARCHAR(1000) NOT NULL,
    "p256dh" VARCHAR(200) NOT NULL,
    "auth" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failures" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_sends" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "recipients" INTEGER NOT NULL,
    "segments" SMALLINT NOT NULL,
    "accepted" INTEGER NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_owner_id_idx" ON "push_subscriptions"("owner_id");

-- CreateIndex
CREATE INDEX "sms_sends_owner_id_created_at_idx" ON "sms_sends"("owner_id", "created_at");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_sends" ADD CONSTRAINT "sms_sends_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ---------------------------------------------------------------------------
-- Guarantees Prisma cannot express (ADR 0012).
-- ---------------------------------------------------------------------------
ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_endpoint_https" CHECK ("endpoint" LIKE 'https://%'),
  ADD CONSTRAINT "push_subscriptions_keys_present" CHECK ("p256dh" <> '' AND "auth" <> ''),
  ADD CONSTRAINT "push_subscriptions_failures_range" CHECK ("failures" BETWEEN 0 AND 100);

ALTER TABLE "sms_sends"
  ADD CONSTRAINT "sms_sends_counts_valid" CHECK ("recipients" > 0 AND "segments" BETWEEN 1 AND 10 AND "accepted" BETWEEN 0 AND "recipients"),
  ADD CONSTRAINT "sms_sends_provider_lower" CHECK ("provider" = lower("provider") AND "provider" <> '');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "push_subscriptions" TO app_runtime;
-- Sends are a usage record: the app adds them, never edits them.
GRANT SELECT, INSERT ON TABLE "sms_sends" TO app_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "sms_sends" FROM app_runtime;
