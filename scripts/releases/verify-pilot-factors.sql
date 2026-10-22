-- Run only with an operator-identified pilot PGSERVICE and explicit confirmation.
-- Metadata inventory, not a second canonical emissions/factor-selection implementation.
\ir _verified-pilot-readonly.sql
\if :{?pilot_organization_id}
\else
  \echo 'STOP: pilot_organization_id is required.'
  \quit 2
\endif
\if :{?pilot_activity_date}
\else
  \echo 'STOP: pilot_activity_date is required (ISO YYYY-MM-DD).'
  \quit 2
\endif
SELECT EXISTS (SELECT 1 FROM public."Organization" WHERE id = :'pilot_organization_id') AS workspace_exists \gset
\if :workspace_exists
\else
  \echo 'STOP: identified workspace does not exist in this database.'
  \quit 2
\endif
SELECT o.id AS organization_id, o."allowDemoFactorsForCalculations" AS allows_demo_factors,
       (SELECT count(*) FROM public."ActivityData" a WHERE a."organizationId" = o.id) AS existing_activity_count,
       :'pilot_activity_date'::date AS activity_date
FROM public."Organization" o WHERE o.id = :'pilot_organization_id';
WITH expected(label, activity_type, input_unit, expected_value) AS (
  VALUES ('Alberta Electricity', 'ELECTRICITY', 'kWh', 0.53::numeric),
         ('Natural Gas', 'NATURAL_GAS', 'GJ', 49.44::numeric),
         ('Gasoline', 'GASOLINE', 'L', 2.31::numeric),
         ('Diesel', 'DIESEL', 'L', 2.68::numeric)
), candidates AS (
  SELECT e.label, cf.id AS factor_id, 'ConversionFactor'::text AS registry,
         cf."sourceAuthority" AS source, cf."sourceDocument" AS source_document,
         cf."methodologyProvenance"->>'sourceVersion' AS source_version,
         cf."sourceYear" AS factor_year, cf."sourceYear" AS source_year,
         cf.unit AS input_unit, cf."resultUnit" AS result_unit, cf."factorValue" AS value,
         cf."applicability"::text AS applicability, cf."emissionBasis"::text AS emission_basis,
         'LEGACY: no active/status column'::text AS status,
         cf.verified,
         cf."effectiveFrom" AS effective_from, cf."effectiveTo" AS effective_to,
         (cf."effectiveFrom" IS NULL OR cf."effectiveFrom"::date <= :'pilot_activity_date'::date)
           AND (cf."effectiveTo" IS NULL OR cf."effectiveTo"::date >= :'pilot_activity_date'::date)
           AS active_for_date,
         cf."organizationId" AS organization_id
  FROM expected e JOIN public."ConversionFactor" cf
    ON cf."activityType"::text = e.activity_type AND cf.unit = e.input_unit
    AND cf."factorValue" = e.expected_value AND cf."type"::text = 'EMISSION'
    AND lower(cf."resultUnit") = 'kgco2e'
    AND (cf."isSystemDefault" OR cf."organizationId" = :'pilot_organization_id')
    AND lower(coalesce(cf.country, 'Canada')) IN ('canada', 'ca')
    AND (e.activity_type <> 'ELECTRICITY' OR
      lower(coalesce(nullif(cf.region, ''), cf.jurisdiction, '')) IN ('alberta', 'ab', 'alberta, canada'))
  UNION ALL
  SELECT e.label, fv.id, 'FactorVersion', fs."sourceAuthority", fs."sourceDocument",
         fs."sourceVersion", fv."factorYear", fs."sourceYear", fv."inputUnit", fv."resultUnit",
         fv."factorValue", fv.applicability::text, fv."emissionBasis"::text,
         fv.status::text, fv.verified, fv."effectiveFrom", fv."effectiveTo",
         f."isActive" AND fs."isActive" AND fv.status::text IN ('OFFICIAL', 'VERIFIED')
           AND (fv."effectiveFrom" IS NULL OR fv."effectiveFrom"::date <= :'pilot_activity_date'::date)
           AND (fv."effectiveTo" IS NULL OR fv."effectiveTo"::date >= :'pilot_activity_date'::date),
         NULL::text
  FROM expected e JOIN public."Factor" f ON f."activityType"::text = e.activity_type
    JOIN public."FactorVersion" fv ON fv."factorId" = f.id
    JOIN public."FactorSource" fs ON fs.id = fv."sourceId"
  WHERE fv."inputUnit" = e.input_unit AND fv."factorValue" = e.expected_value
    AND lower(fv."resultUnit") = 'kgco2e'
    AND lower(coalesce(fv."jurisdictionCountry", 'Canada')) IN ('canada', 'ca')
    AND (e.activity_type <> 'ELECTRICITY' OR lower(coalesce(fv."jurisdictionRegion", '')) IN ('alberta', 'ab', 'alberta, canada'))
), inventory AS (
  SELECT e.label, e.expected_value, e.input_unit,
         count(c.factor_id) > 0 AS reference_value_present,
         coalesce(bool_or(c.active_for_date
           AND coalesce(c.applicability, 'CORPORATE_INVENTORY') = 'CORPORATE_INVENTORY'
           AND coalesce(c.emission_basis, 'DIRECT_CO2E') = 'DIRECT_CO2E'), false) AS active_corporate_candidate_present,
         coalesce(jsonb_agg(to_jsonb(c) - 'label' ORDER BY c.registry, c.factor_id)
           FILTER (WHERE c.factor_id IS NOT NULL), '[]'::jsonb) AS candidates
  FROM expected e LEFT JOIN candidates c ON c.label = e.label
  GROUP BY e.label, e.expected_value, e.input_unit
)
SELECT bool_and(reference_value_present AND active_corporate_candidate_present) AS all_references_present,
       jsonb_agg(to_jsonb(inventory) ORDER BY label) AS factor_inventory
FROM inventory \gset
\echo :factor_inventory
COMMIT;
\if :all_references_present
  \echo 'PASS: expected numerical references and active corporate candidates found. Review sources/vintage/demo policy; canonical selection still requires smoke verification.'
\else
  \echo 'FAIL: missing expected reference or active corporate candidate. Do not seed/update automatically.'
  \quit 3
\endif
