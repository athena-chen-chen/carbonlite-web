-- CarbonLite ActivityData cleanup helper.
-- Run against the backend PostgreSQL database after adding a persistent status field.
--
-- Purpose:
--   Identify existing incomplete activity records, especially records where unit IS NULL,
--   and mark them so calculations can skip them until users complete the missing fields.
--
-- Assumptions:
--   Prisma table name: "ActivityData"
--   Optional status column: "recordStatus"
--
-- If your backend uses a different column name such as "status", update the SQL below.

ALTER TABLE "ActivityData"
ADD COLUMN IF NOT EXISTS "recordStatus" TEXT NOT NULL DEFAULT 'COMPLETE';

UPDATE "ActivityData"
SET
  "recordStatus" = 'INCOMPLETE',
  "notes" = COALESCE(NULLIF("notes", ''), 'Incomplete record: missing required calculation fields.')
WHERE
  "activityType" IS NULL
  OR BTRIM("activityType") = ''
  OR LOWER(BTRIM("activityType")) IN ('null', 'undefined')
  OR "recordDate" IS NULL
  OR "quantity" IS NULL
  OR "quantity" <= 0
  OR "unit" IS NULL
  OR BTRIM("unit") = ''
  OR LOWER(BTRIM("unit")) IN ('null', 'undefined');

UPDATE "ActivityData"
SET "recordStatus" = 'COMPLETE'
WHERE
  "activityType" IS NOT NULL
  AND BTRIM("activityType") <> ''
  AND LOWER(BTRIM("activityType")) NOT IN ('null', 'undefined')
  AND "recordDate" IS NOT NULL
  AND "quantity" IS NOT NULL
  AND "quantity" > 0
  AND "unit" IS NOT NULL
  AND BTRIM("unit") <> ''
  AND LOWER(BTRIM("unit")) NOT IN ('null', 'undefined');
