-- CreateTable
CREATE TABLE "duplicate_dismissals" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "contact_a_id" UUID NOT NULL,
    "contact_b_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_merges" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "survivor_id" UUID NOT NULL,
    "merged_id" UUID NOT NULL,
    "survivor_before" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undone_at" TIMESTAMPTZ(3),

    CONSTRAINT "contact_merges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "duplicate_dismissals_owner_id_contact_a_id_contact_b_id_key" ON "duplicate_dismissals"("owner_id", "contact_a_id", "contact_b_id");

-- CreateIndex
CREATE INDEX "contact_merges_owner_id_survivor_id_idx" ON "contact_merges"("owner_id", "survivor_id");

-- CreateIndex
CREATE INDEX "contact_merges_owner_id_merged_id_idx" ON "contact_merges"("owner_id", "merged_id");

-- AddForeignKey
ALTER TABLE "duplicate_dismissals" ADD CONSTRAINT "duplicate_dismissals_contact_a_id_owner_id_fkey" FOREIGN KEY ("contact_a_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_dismissals" ADD CONSTRAINT "duplicate_dismissals_contact_b_id_owner_id_fkey" FOREIGN KEY ("contact_b_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_merges" ADD CONSTRAINT "contact_merges_survivor_id_owner_id_fkey" FOREIGN KEY ("survivor_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_merges" ADD CONSTRAINT "contact_merges_merged_id_owner_id_fkey" FOREIGN KEY ("merged_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ===========================================================================
-- Guarantees (ADRs 0005, 0012).
-- ===========================================================================

-- Each pair once, smaller id first; never a contact paired with itself.
ALTER TABLE "duplicate_dismissals"
  ADD CONSTRAINT "duplicate_dismissals_ordered_pair" CHECK ("contact_a_id" < "contact_b_id");

ALTER TABLE "contact_merges"
  ADD CONSTRAINT "contact_merges_two_contacts" CHECK ("survivor_id" <> "merged_id"),
  ADD CONSTRAINT "contact_merges_snapshot_is_object" CHECK (jsonb_typeof("survivor_before") = 'object'),
  ADD CONSTRAINT "contact_merges_undone_after_creation" CHECK ("undone_at" IS NULL OR "undone_at" >= "created_at");

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "duplicate_dismissals" TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "contact_merges" TO app_runtime;
