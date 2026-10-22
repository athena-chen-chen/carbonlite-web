-- Operator tooling only. No dotenv loading, target selection, DDL, or data writes.
\set ON_ERROR_STOP on
\set VERBOSITY terse
\pset pager off
\if :{?operator_confirmed_pilot}
\else
  \echo 'STOP: explicitly identify the pilot project/branch/endpoint before running.'
  \quit 2
\endif
\if :operator_confirmed_pilot
\else
  \echo 'STOP: operator_confirmed_pilot must be true after external identity verification.'
  \quit 2
\endif
\if :{?expected_database}
\else
  \echo 'STOP: expected_database is required.'
  \quit 2
\endif
\if :{?expected_schema}
\else
  \echo 'STOP: expected_schema is required.'
  \quit 2
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL search_path = pg_catalog;
SELECT current_database() = :'expected_database'
   AND :'expected_schema' = 'public'
   AND EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public')
   AND current_database() NOT IN ('carbonlite_e2e', 'carbonlite_test', 'carbonlite_ci_test', 'carbonlite_dev')
   AS target_matches \gset
\if :target_matches
\else
  \echo 'STOP: target mismatch, unsupported schema, or known local/test database.'
  \quit 2
\endif
SELECT current_database() AS verified_database, 'public' AS verified_schema,
       current_setting('transaction_read_only') AS read_only,
       transaction_timestamp() AS checked_at;
-- A database name cannot establish Neon project/branch identity. Verify externally.
