-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plus_until" TIMESTAMPTZ(3),
ADD COLUMN     "role" VARCHAR(10) NOT NULL DEFAULT 'member';

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "owner_id" UUID,
    "method" VARCHAR(10) NOT NULL,
    "months" SMALLINT NOT NULL,
    "amount_kes" INTEGER NOT NULL,
    "status" VARCHAR(10) NOT NULL,
    "checkout_id" VARCHAR(64),
    "receipt" VARCHAR(12),
    "result_desc" VARCHAR(200),
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_checkout_id_key" ON "payments"("checkout_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_key" ON "payments"("receipt");

-- CreateIndex
CREATE INDEX "payments_owner_id_created_at_idx" ON "payments"("owner_id", "created_at");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- The accounts that exist today were made by the one-time owner setup
-- (email, no phone): they run the service.
UPDATE "users" SET "role" = 'operator' WHERE "phone" IS NULL;

ALTER TABLE "users"
  ADD CONSTRAINT "users_role_known" CHECK ("role" IN ('operator', 'member'));

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_method_known" CHECK ("method" IN ('mpesa_stk', 'manual', 'grant')),
  ADD CONSTRAINT "payments_status_known" CHECK ("status" IN ('pending', 'paid', 'failed')),
  ADD CONSTRAINT "payments_months_range" CHECK ("months" BETWEEN 1 AND 24),
  ADD CONSTRAINT "payments_amount_range" CHECK ("amount_kes" BETWEEN 0 AND 100000),
  ADD CONSTRAINT "payments_grant_is_free" CHECK (("method" = 'grant') = ("amount_kes" = 0)),
  ADD CONSTRAINT "payments_stk_has_checkout" CHECK ("method" <> 'mpesa_stk' OR "checkout_id" IS NOT NULL),
  ADD CONSTRAINT "payments_manual_has_receipt" CHECK ("method" <> 'manual' OR "receipt" IS NOT NULL),
  ADD CONSTRAINT "payments_receipt_format" CHECK ("receipt" IS NULL OR "receipt" ~ '^[A-Z0-9]{10}$'),
  ADD CONSTRAINT "payments_paid_has_time" CHECK (("status" = 'paid') = ("paid_at" IS NOT NULL));

-- Payment records are kept (tax records): the app can add and update them,
-- never delete them.
-- Default privileges (init migration) grant everything on new tables, so
-- the narrower rights must be revoked explicitly.
GRANT SELECT, INSERT, UPDATE ON TABLE "payments" TO app_runtime;
REVOKE DELETE, TRUNCATE ON TABLE "payments" FROM app_runtime;
