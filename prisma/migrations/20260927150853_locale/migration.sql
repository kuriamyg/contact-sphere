-- AlterTable
ALTER TABLE "users" ADD COLUMN     "locale" VARCHAR(5) NOT NULL DEFAULT 'en';



-- Guarantees Prisma cannot express (ADR 0012).
ALTER TABLE "users"
  ADD CONSTRAINT "users_locale_known" CHECK ("locale" IN ('en', 'sw'));
