-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "query" VARCHAR(100) NOT NULL DEFAULT '',
    "tag" VARCHAR(40),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_searches_owner_id_name_key" ON "saved_searches"("owner_id", "name");

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Guarantees Prisma cannot express (ADR 0012).
-- ---------------------------------------------------------------------------
ALTER TABLE "saved_searches"
  ADD CONSTRAINT "saved_searches_name_trimmed" CHECK ("name" = btrim("name") AND "name" <> ''),
  ADD CONSTRAINT "saved_searches_query_trimmed" CHECK ("query" = btrim("query")),
  ADD CONSTRAINT "saved_searches_tag_lower" CHECK ("tag" IS NULL OR ("tag" = lower(btrim("tag")) AND "tag" <> '')),
  ADD CONSTRAINT "saved_searches_not_empty" CHECK ("query" <> '' OR "tag" IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "saved_searches" TO app_runtime;
