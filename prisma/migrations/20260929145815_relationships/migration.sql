-- CreateTable
CREATE TABLE "relationships" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "from_contact_id" UUID NOT NULL,
    "to_contact_id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "label" VARCHAR(40),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_dismissals" (
    "owner_id" UUID NOT NULL,
    "a_id" UUID NOT NULL,
    "b_id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationship_dismissals_pkey" PRIMARY KEY ("owner_id","a_id","b_id","kind")
);

-- CreateIndex
CREATE INDEX "relationships_owner_id_to_contact_id_idx" ON "relationships"("owner_id", "to_contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "relationships_owner_id_from_contact_id_to_contact_id_kind_key" ON "relationships"("owner_id", "from_contact_id", "to_contact_id", "kind");

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_contact_id_owner_id_fkey" FOREIGN KEY ("from_contact_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_contact_id_owner_id_fkey" FOREIGN KEY ("to_contact_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_dismissals" ADD CONSTRAINT "relationship_dismissals_a_id_owner_id_fkey" FOREIGN KEY ("a_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_dismissals" ADD CONSTRAINT "relationship_dismissals_b_id_owner_id_fkey" FOREIGN KEY ("b_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ---------------------------------------------------------------------------
-- Guarantees Prisma cannot express (ADR 0012, ADR 0023).
-- ---------------------------------------------------------------------------
ALTER TABLE "relationships"
  ADD CONSTRAINT "relationships_kind_known" CHECK ("kind" IN (
    'parent', 'spouse', 'sibling', 'cousin', 'relative',
    'introduced', 'friend', 'colleague', 'neighbour', 'church', 'chama',
    'client', 'mentor', 'other')),
  ADD CONSTRAINT "relationships_not_self" CHECK ("from_contact_id" <> "to_contact_id"),
  -- Links that read the same both ways are stored once, smaller id first.
  ADD CONSTRAINT "relationships_symmetric_ordered" CHECK (
    "kind" IN ('parent', 'introduced', 'client', 'mentor')
    OR "from_contact_id" < "to_contact_id"),
  ADD CONSTRAINT "relationships_label_tidy" CHECK ("label" IS NULL OR ("label" = lower(btrim("label")) AND "label" <> ''));

ALTER TABLE "relationship_dismissals"
  ADD CONSTRAINT "relationship_dismissals_ordered" CHECK ("a_id" < "b_id"),
  ADD CONSTRAINT "relationship_dismissals_kind_known" CHECK ("kind" IN ('relative', 'introduced'));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "relationships", "relationship_dismissals" TO app_runtime;
