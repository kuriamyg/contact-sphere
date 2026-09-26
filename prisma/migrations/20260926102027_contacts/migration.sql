-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "given_name" VARCHAR(100),
    "family_name" VARCHAR(100),
    "display_name" VARCHAR(200) NOT NULL,
    "sort_name" VARCHAR(200) NOT NULL,
    "nickname" VARCHAR(100),
    "organization" VARCHAR(200),
    "job_title" VARCHAR(200),
    "notes" VARCHAR(10000),
    "birthday" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "last_used_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_numbers" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "label" VARCHAR(40),
    "raw" VARCHAR(64) NOT NULL,
    "e164" VARCHAR(16),
    "digits" VARCHAR(64) NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_addresses" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "label" VARCHAR(40),
    "address" VARCHAR(254) NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "email_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_owner_id_sort_name_idx" ON "contacts"("owner_id", "sort_name");

-- CreateIndex
CREATE INDEX "contacts_owner_id_created_at_idx" ON "contacts"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "contacts_owner_id_last_used_at_idx" ON "contacts"("owner_id", "last_used_at");

-- CreateIndex
CREATE INDEX "contacts_owner_id_deleted_at_idx" ON "contacts"("owner_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_id_owner_id_key" ON "contacts"("id", "owner_id");

-- CreateIndex
CREATE INDEX "phone_numbers_owner_id_e164_idx" ON "phone_numbers"("owner_id", "e164");

-- CreateIndex
CREATE UNIQUE INDEX "phone_numbers_contact_id_position_key" ON "phone_numbers"("contact_id", "position");

-- CreateIndex
CREATE INDEX "email_addresses_owner_id_address_idx" ON "email_addresses"("owner_id", "address");

-- CreateIndex
CREATE UNIQUE INDEX "email_addresses_contact_id_position_key" ON "email_addresses"("contact_id", "position");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_contact_id_owner_id_fkey" FOREIGN KEY ("contact_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_addresses" ADD CONSTRAINT "email_addresses_contact_id_owner_id_fkey" FOREIGN KEY ("contact_id", "owner_id") REFERENCES "contacts"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ===========================================================================
-- Guarantees Prisma's schema language cannot express (ADRs 0005, 0010, 0012).
-- ===========================================================================

ALTER TABLE "contacts"
  -- Lists always have something to show.
  ADD CONSTRAINT "contacts_display_name_present" CHECK (length(btrim("display_name")) > 0),
  -- Sorting relies on this being the folded form.
  ADD CONSTRAINT "contacts_sort_name_lower" CHECK ("sort_name" = lower("sort_name")),
  -- Timestamps cannot precede the row.
  ADD CONSTRAINT "contacts_archived_after_creation" CHECK ("archived_at" IS NULL OR "archived_at" >= "created_at"),
  ADD CONSTRAINT "contacts_deleted_after_creation" CHECK ("deleted_at" IS NULL OR "deleted_at" >= "created_at"),
  ADD CONSTRAINT "contacts_birthday_plausible" CHECK ("birthday" IS NULL OR "birthday" >= DATE '1900-01-01');

ALTER TABLE "phone_numbers"
  ADD CONSTRAINT "phone_numbers_raw_present" CHECK (length(btrim("raw")) > 0),
  -- E.164: "+", country code, up to 15 digits in total.
  ADD CONSTRAINT "phone_numbers_e164_format" CHECK ("e164" IS NULL OR "e164" ~ '^\+[1-9][0-9]{6,14}$'),
  ADD CONSTRAINT "phone_numbers_digits_format" CHECK ("digits" ~ '^[0-9]*$'),
  ADD CONSTRAINT "phone_numbers_position_range" CHECK ("position" BETWEEN 0 AND 49);

ALTER TABLE "email_addresses"
  ADD CONSTRAINT "email_addresses_lower" CHECK ("address" = lower("address")),
  ADD CONSTRAINT "email_addresses_shape" CHECK ("address" ~ '^[^@\s]+@[^@\s]+$'),
  ADD CONSTRAINT "email_addresses_position_range" CHECK ("position" BETWEEN 0 AND 49);

-- Row access for the app, stated explicitly (default privileges also cover
-- it). DELETE is needed: trash is hard-deleted after 30 days (ADR 0005).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "contacts" TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "phone_numbers" TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "email_addresses" TO app_runtime;
