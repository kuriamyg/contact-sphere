-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(64),
    "entity_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- Guarantees Prisma's schema language cannot express (ADR 0012).
-- Everything below is written by hand. Keep it idempotent where it touches
-- cluster-level objects (roles), because a role outlives any one database.
-- ===========================================================================

-- Emails are stored lower-case, which makes the unique index above
-- case-insensitive: "Ann@x.com" and "ann@x.com" cannot both exist.
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email")),
  ADD CONSTRAINT "users_email_shape" CHECK ("email" ~ '^[^@\s]+@[^@\s]+$');

-- Action names are machine-readable identifiers, never free text — free text
-- is where personal data leaks into an audit log.
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_action_format" CHECK ("action" ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  ADD CONSTRAINT "audit_logs_metadata_is_object" CHECK (jsonb_typeof("metadata") = 'object');

-- ---------------------------------------------------------------------------
-- app_runtime: the privileges the running API gets. A NOLOGIN group role:
-- nobody connects AS it. Each environment creates its own LOGIN role with its
-- own password, outside version control, and makes it a member
-- (docs/operations/database-roles.md). The API therefore cannot run DDL
-- (CREATE/ALTER/DROP) or touch Prisma's migration history, whatever a bug or
-- an attacker makes it attempt.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "users" TO app_runtime;

-- The audit log is append-only for the application: it may add and read
-- entries, never change or remove them. Enforced here, not in code, so no
-- future endpoint, script or bug can quietly rewrite history.
GRANT SELECT, INSERT ON TABLE "audit_logs" TO app_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "audit_logs" FROM app_runtime;

-- Tables created by later migrations (run as this same owner role) get the
-- normal read/write grants automatically. A table that needs less — like the
-- audit log — must REVOKE explicitly in its own migration.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;

-- Prisma's own bookkeeping is never the application's business.
REVOKE ALL ON TABLE "_prisma_migrations" FROM app_runtime;
