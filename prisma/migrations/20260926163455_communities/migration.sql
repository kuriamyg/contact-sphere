-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "name_key" VARCHAR(80) NOT NULL,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'other',
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "group_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "role" VARCHAR(40),
    "added_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_id","contact_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_id_owner_id_key" ON "groups"("id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "groups_owner_id_name_key_key" ON "groups"("owner_id", "name_key");

-- CreateIndex
CREATE INDEX "group_members_owner_id_contact_id_idx" ON "group_members"("owner_id", "contact_id");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_owner_id_fkey" FOREIGN KEY ("group_id", "owner_id") REFERENCES "groups"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_contact_id_owner_id_fkey" FOREIGN KEY ("contact_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Guarantees Prisma cannot express (ADR 0012).
-- ---------------------------------------------------------------------------
ALTER TABLE "groups"
  ADD CONSTRAINT "groups_name_trimmed" CHECK ("name" = btrim("name") AND "name" <> ''),
  ADD CONSTRAINT "groups_name_key_matches" CHECK ("name_key" = lower(regexp_replace("name", '\s+', ' ', 'g'))),
  ADD CONSTRAINT "groups_kind_known" CHECK ("kind" IN ('chama', 'church', 'family', 'work', 'estate', 'school', 'other')),
  ADD CONSTRAINT "groups_description_trimmed" CHECK ("description" IS NULL OR ("description" = btrim("description") AND "description" <> '')),
  ADD CONSTRAINT "groups_updated_after_creation" CHECK ("updated_at" >= "created_at");

ALTER TABLE "group_members"
  ADD CONSTRAINT "group_members_role_tidy" CHECK ("role" IS NULL OR ("role" = lower(btrim("role")) AND "role" <> ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "groups", "group_members" TO app_runtime;
