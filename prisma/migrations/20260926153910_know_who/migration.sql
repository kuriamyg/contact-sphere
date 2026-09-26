-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "area" VARCHAR(100),
ADD COLUMN     "met_through" VARCHAR(200),
ADD COLUMN     "search_text" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tags" VARCHAR(40)[] DEFAULT ARRAY[]::VARCHAR(40)[];

-- CreateIndex
CREATE INDEX "contacts_tags_idx" ON "contacts" USING GIN ("tags");


-- ---------------------------------------------------------------------------
-- Guarantees Prisma cannot express (ADR 0012).
-- ---------------------------------------------------------------------------

-- Prisma declares list columns nullable; a contact always has a (possibly
-- empty) list of tags, at most 20, stored lower-case.
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_tags_present" CHECK ("tags" IS NOT NULL),
  ADD CONSTRAINT "contacts_tags_limit" CHECK (cardinality("tags") <= 20),
  ADD CONSTRAINT "contacts_tags_lower" CHECK (array_to_string("tags", ',') = lower(array_to_string("tags", ','))),
  ADD CONSTRAINT "contacts_area_trimmed" CHECK ("area" IS NULL OR ("area" = btrim("area") AND "area" <> '')),
  ADD CONSTRAINT "contacts_met_through_trimmed" CHECK ("met_through" IS NULL OR ("met_through" = btrim("met_through") AND "met_through" <> '')),
  ADD CONSTRAINT "contacts_search_text_lower" CHECK ("search_text" = lower("search_text"));

-- Word search for contacts saved before this migration: the same folding the
-- API applies (contact-names.ts `searchText`), from the fields they have.
UPDATE "contacts" SET "search_text" = left(lower(regexp_replace(normalize(
  regexp_replace(concat_ws(' ', "display_name", "given_name", "family_name",
    "nickname", "organization", "job_title", "notes"), '\s+', ' ', 'g'),
  NFD), '[̀-ͯ]', '', 'g')), 12000);
