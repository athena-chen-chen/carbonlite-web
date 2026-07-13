-- CarbonLite backfill for activity jurisdiction fields and factor default scopes.
-- Run against the backend PostgreSQL database after deploying the columns used below.
--
-- Intent:
--   - Keep existing activity records usable after adding country, province,
--     facility, source reference, calculation status, and default factor scopes.
--   - Do not guess province or facility for old records.
--   - Mark electricity records without province for review, not as missing factor.
--   - Backfill defaultScope only for known activity types.
--
-- Assumptions:
--   Prisma table names: "ActivityData", "ConversionFactor", "FactorVersion".
--   If your backend uses different names or emission column names, adjust before running.

ALTER TABLE "ActivityData"
ADD COLUMN IF NOT EXISTS "jurisdictionCountry" TEXT;

ALTER TABLE "ActivityData"
ADD COLUMN IF NOT EXISTS "jurisdictionRegion" TEXT;

ALTER TABLE "ActivityData"
ADD COLUMN IF NOT EXISTS "facilityId" TEXT;

ALTER TABLE "ActivityData"
ADD COLUMN IF NOT EXISTS "sourceReference" TEXT;

ALTER TABLE "ActivityData"
ADD COLUMN IF NOT EXISTS "calculationStatus" TEXT;

ALTER TABLE "ActivityData"
ADD COLUMN IF NOT EXISTS "excludedFromTotals" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "ActivityData"
ADD COLUMN IF NOT EXISTS "calculatedEmissionsKgCO2e" NUMERIC;

ALTER TABLE "ActivityData"
ADD COLUMN IF NOT EXISTS "scopeClassification" TEXT;

ALTER TABLE "ActivityData"
ADD COLUMN IF NOT EXISTS "recordStatus" TEXT NOT NULL DEFAULT 'COMPLETE';

-- The product is currently Canada-focused. This is a safe country default, but
-- province and facility are intentionally left blank unless already present.
UPDATE "ActivityData"
SET "jurisdictionCountry" = 'Canada'
WHERE
  "jurisdictionCountry" IS NULL
  OR BTRIM("jurisdictionCountry") = ''
  OR LOWER(BTRIM("jurisdictionCountry")) IN ('null', 'undefined');

UPDATE "ActivityData"
SET "jurisdictionRegion" = NULL
WHERE
  "jurisdictionRegion" IS NOT NULL
  AND LOWER(BTRIM("jurisdictionRegion")) IN ('', 'null', 'undefined');

UPDATE "ActivityData"
SET "facilityId" = NULL
WHERE
  "facilityId" IS NOT NULL
  AND LOWER(BTRIM("facilityId")) IN ('', 'null', 'undefined');

-- Electricity needs a province-specific factor. Do not mark these rows as
-- MISSING_FACTOR until the province is known.
UPDATE "ActivityData"
SET
  "calculationStatus" = 'MISSING_JURISDICTION',
  "excludedFromTotals" = TRUE,
  "calculatedEmissionsKgCO2e" = NULL,
  "recordStatus" = 'REQUIRES_REVIEW',
  "notes" = CASE
    WHEN COALESCE("notes", '') ILIKE '%Electricity emissions require a province-specific factor%'
      THEN "notes"
    ELSE CONCAT_WS(
      ' ',
      NULLIF("notes", ''),
      'Electricity emissions require a province-specific factor. Please select the province where the electricity was used.'
    )
  END
WHERE
  UPPER(REPLACE(REPLACE(COALESCE("activityType", ''), ' ', '_'), '-', '_')) = 'ELECTRICITY'
  AND (
    "jurisdictionRegion" IS NULL
    OR BTRIM("jurisdictionRegion") = ''
    OR LOWER(BTRIM("jurisdictionRegion")) IN ('null', 'undefined')
  );

-- Water is tracked as an operational metric and excluded from emissions totals.
UPDATE "ActivityData"
SET
  "calculationStatus" = 'TRACKED_ONLY',
  "excludedFromTotals" = TRUE,
  "calculatedEmissionsKgCO2e" = NULL,
  "scopeClassification" = 'TRACKED_METRIC',
  "recordStatus" = 'TRACKED_METRIC'
WHERE
  UPPER(REPLACE(REPLACE(COALESCE("activityType", ''), ' ', '_'), '-', '_')) = 'WATER';

-- Combustion activity records can continue using Canada-level factor fallback.
UPDATE "ActivityData"
SET "scopeClassification" = 'SCOPE_1'
WHERE
  UPPER(REPLACE(REPLACE(COALESCE("activityType", ''), ' ', '_'), '-', '_'))
    IN ('DIESEL', 'GASOLINE', 'NATURAL_GAS')
  AND (
    "scopeClassification" IS NULL
    OR BTRIM("scopeClassification") = ''
    OR LOWER(BTRIM("scopeClassification")) IN ('null', 'undefined')
  );

ALTER TABLE "ConversionFactor"
ADD COLUMN IF NOT EXISTS "defaultScope" TEXT;

ALTER TABLE "FactorVersion"
ADD COLUMN IF NOT EXISTS "defaultScope" TEXT;

WITH factor_scope AS (
  SELECT
    "id",
    CASE
      WHEN UPPER(REPLACE(REPLACE(COALESCE("activityType", "name", ''), ' ', '_'), '-', '_'))
        IN ('DIESEL', 'GASOLINE', 'NATURAL_GAS', 'PROPANE')
        THEN 'SCOPE_1'
      WHEN UPPER(REPLACE(REPLACE(COALESCE("activityType", "name", ''), ' ', '_'), '-', '_'))
        IN ('ELECTRICITY', 'STEAM', 'PURCHASED_HEAT', 'PURCHASED_COOLING')
        THEN 'SCOPE_2'
      WHEN UPPER(REPLACE(REPLACE(COALESCE("activityType", "name", ''), ' ', '_'), '-', '_'))
        IN ('HOTEL', 'AIR_TRAVEL', 'SHIPPING', 'WASTE', 'BUSINESS_TRAVEL')
        THEN 'SCOPE_3'
      WHEN UPPER(REPLACE(REPLACE(COALESCE("activityType", "name", ''), ' ', '_'), '-', '_')) = 'WATER'
        THEN 'TRACKED_METRIC'
      ELSE NULL
    END AS "scope"
  FROM "ConversionFactor"
)
UPDATE "ConversionFactor" factor
SET "defaultScope" = factor_scope."scope"
FROM factor_scope
WHERE
  factor."id" = factor_scope."id"
  AND factor_scope."scope" IS NOT NULL
  AND (
    factor."defaultScope" IS NULL
    OR BTRIM(factor."defaultScope") = ''
    OR LOWER(BTRIM(factor."defaultScope")) IN ('null', 'undefined')
  );

WITH version_scope AS (
  SELECT
    version."id",
    CASE
      WHEN UPPER(REPLACE(REPLACE(COALESCE(factor."activityType", version."displayName", factor."name", ''), ' ', '_'), '-', '_'))
        IN ('DIESEL', 'GASOLINE', 'NATURAL_GAS', 'PROPANE')
        THEN 'SCOPE_1'
      WHEN UPPER(REPLACE(REPLACE(COALESCE(factor."activityType", version."displayName", factor."name", ''), ' ', '_'), '-', '_'))
        IN ('ELECTRICITY', 'STEAM', 'PURCHASED_HEAT', 'PURCHASED_COOLING')
        THEN 'SCOPE_2'
      WHEN UPPER(REPLACE(REPLACE(COALESCE(factor."activityType", version."displayName", factor."name", ''), ' ', '_'), '-', '_'))
        IN ('HOTEL', 'AIR_TRAVEL', 'SHIPPING', 'WASTE', 'BUSINESS_TRAVEL')
        THEN 'SCOPE_3'
      WHEN UPPER(REPLACE(REPLACE(COALESCE(factor."activityType", version."displayName", factor."name", ''), ' ', '_'), '-', '_')) = 'WATER'
        THEN 'TRACKED_METRIC'
      ELSE NULL
    END AS "scope"
  FROM "FactorVersion" version
  LEFT JOIN "ConversionFactor" factor ON factor."id" = version."factorId"
)
UPDATE "FactorVersion" version
SET "defaultScope" = version_scope."scope"
FROM version_scope
WHERE
  version."id" = version_scope."id"
  AND version_scope."scope" IS NOT NULL
  AND (
    version."defaultScope" IS NULL
    OR BTRIM(version."defaultScope") = ''
    OR LOWER(BTRIM(version."defaultScope")) IN ('null', 'undefined')
  );
