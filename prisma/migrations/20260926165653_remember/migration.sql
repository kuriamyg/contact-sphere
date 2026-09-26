-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "keep_in_touch_days" SMALLINT,
ADD COLUMN     "last_contacted_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "due_on" DATE NOT NULL,
    "note" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "done_at" TIMESTAMPTZ(3),

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follow_ups_owner_id_done_at_due_on_idx" ON "follow_ups"("owner_id", "done_at", "due_on");

-- CreateIndex
CREATE INDEX "follow_ups_contact_id_idx" ON "follow_ups"("contact_id");

-- CreateIndex
CREATE INDEX "contacts_owner_id_keep_in_touch_days_idx" ON "contacts"("owner_id", "keep_in_touch_days");

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contact_id_owner_id_fkey" FOREIGN KEY ("contact_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Guarantees Prisma cannot express (ADR 0012).
-- ---------------------------------------------------------------------------
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_keep_in_touch_days_known" CHECK ("keep_in_touch_days" IS NULL OR "keep_in_touch_days" IN (7, 14, 30, 60, 90, 180, 365)),
  ADD CONSTRAINT "contacts_last_contacted_after_creation" CHECK ("last_contacted_at" IS NULL OR "last_contacted_at" >= "created_at" - interval '1 day');

ALTER TABLE "follow_ups"
  ADD CONSTRAINT "follow_ups_note_trimmed" CHECK ("note" = btrim("note") AND "note" <> ''),
  ADD CONSTRAINT "follow_ups_due_plausible" CHECK ("due_on" BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
  ADD CONSTRAINT "follow_ups_done_after_creation" CHECK ("done_at" IS NULL OR "done_at" >= "created_at");

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "follow_ups" TO app_runtime;
