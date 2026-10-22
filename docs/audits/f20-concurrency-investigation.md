# Concurrency regression investigation after F20

## Result

**Root cause: incomplete disposable-database factor fixtures, not F20, F05 locking, F12 eligibility, or import identity.** The reported **12 failed / 2 passed** reproduces exactly. The absent eligible record is the first fixture row: Alberta electricity, 980 kWh. The original local database contained only a generic `Province Required` electricity placeholder. Canonical eligibility correctly rejected it before insertion.

The existing deterministic E2E baseline seeder supplied Alberta electricity but omitted Diesel. On a clean database it improved the suite to **12 passed / 2 failed**, with the corrected Diesel row still blocked in the two partial-confirm cases. The test seed now also supplies the established Diesel, Gasoline, and Air Travel fixtures. No production file, test expectation, lock, evaluator, or safety guard was changed.

## Exact initial failures

All failures are in backend `test/document-confirm-concurrency.e2e-spec.ts`.

| Test | Expected | Actual | Layer | Individually reproduced? |
| --- | --- | --- | --- | --- |
| staged=false: same selection / lost-response retry | 3 created | 2 | Missing Alberta electricity fixture | YES (A) |
| staged=false: partially overlapping selections | 3 created | 2 | Same missing fixture | Not separately run; same group A |
| staged=false: F12 partial confirm | Initial 3 created | 2 | Same missing fixture | Not separately run; same group A |
| staged=false: equal row numbers on separate sheets | 2 created | 0 | Both electricity rows blocked | YES (B) |
| staged=true: same selection / lost-response retry | 3 created | 2 | Missing Alberta electricity fixture | Not separately run; group A |
| staged=true: partially overlapping selections | 3 created | 2 | Same missing fixture | Not separately run; group A |
| staged=true: F12 partial confirm | Initial 3 created | 2 | Same missing fixture | Not separately run; group A |
| staged=true: equal row numbers on separate sheets | 2 created | 0 | Both electricity rows blocked | Not separately run; group B |
| Different documents in same organization | [3, 3] | [2, 2] | Electricity blocked for both documents | YES (C) |
| Rollback and overlapping retry | Retry creates 3 | 2 | Missing electricity fixture | Not separately run; group A |
| Delete concurrently confirmed source | 3 created | 2 | Same missing fixture | Not separately run; group A |
| Legacy PDF/image rowless confirmation | 3 created | 2 | Same missing fixture | Not separately run; group A |

The first failure is staged=false same-selection at the total-created assertion. The two passing tests are staged=false and staged=true tracked-water-only confirmation.

Groups: nine scalar **3 → 2** failures; two sheet cases **2 → 0**; one independent-document **[3,3] → [2,2]**. There were no initial timeout/lock-wait, authentication, setup, wrong-document-state, or unexpected-existing-record failures. Every original failure reproduces in the full suite. Representatives A/B/C cover the three observed assertion groups; the other cases were not each run individually.

## Row-level evidence

All three candidates use 2026-03-07, country Canada, sheet Main, and distinct physical source rows.

| Candidate | Original canonical result | Import eligibility |
| --- | --- | --- |
| Row 2: ELECTRICITY, 980 kWh, Alberta | matchingStatus=MISSING_FACTOR; calculationStatus=MISSING_FACTOR; reportTreatment=REQUIRES_REVIEW; matchedFactorId=null | Blocked before insertion |
| Row 3: HOTEL, 4 nights, no province | MATCHED / CALCULATED / INCLUDED; factor value 15 | Eligible |
| Row 4: WATER, 18 m3 | TRACKED_ONLY / TRACKED_ONLY / TRACKED_ONLY; no factor | Eligible, zero GHG contribution |

Electricity's actual evaluator message was: `No electricity factor found for Alberta, 2026. Electricity factors must be jurisdiction-specific.`

The original legacy electricity factor had value **0.53**, unit kWh, source year 2025, jurisdiction **Province Required**, no region, low placeholder confidence, and `verified=false`. Its governed version likewise had jurisdictionRegion=Province Required, status DRAFT, and confidence DEMO. Neither provided the required Alberta match. The numeric value alone does not authorize use of a non-provincial placeholder.

The missing expected record is electricity, not hotel or water. No eligible electricity record was lost to concurrency or deduplication. F12 was correctly enforcing canonical eligibility.

## Deterministic lock and identity evidence

Test-only diagnostics wrapped the existing real transaction/barrier and real canonical preparation. Production logging was not changed.

1. Request A entered a real PostgreSQL transaction and acquired the tenant-scoped Document `SELECT ... FOR UPDATE` lock.
2. A read zero existing imported records; the existing barrier paused it after that read.
3. B entered a different PostgreSQL backend connection and attempted the same lock.
4. `pg_blocking_pids` confirmed that B was blocked by A.
5. A resumed. Canonical preparation rejected electricity and inserted Hotel and Water.
6. After A committed, B acquired the lock and read the two existing records.
7. B re-evaluated electricity as MISSING_FACTOR and created zero records; existing Hotel/Water identities were not duplicated.
8. Both responses were 201, created counts **[2, 0]**, with two unique final inserted IDs.

Thus A.created + B.created = **2 unique eligible records**, exactly matching the final count under the incomplete reference fixture. After completing the seed, the unchanged tests verify the expected three unique eligible records and frozen totals.

Physical identities were distinct: `<document>::sheet::Main::row::2`, `...::row::3`, `...::row::4`. The sheet test uses `<document>::sheet::SheetA::row::2` and `<document>::sheet::SheetB::row::2`; no collision exists. Legacy rowless content identities include distinct source references/activity types/quantities. F05 still acquires its document lock before staging/import reads and holds it through inserts, state updates, and commit. Connection sharing, barrier behavior, and transaction ownership were not changed.

## Clean-state, order and pre-F20 comparisons

Only **localhost:5432 / carbonlite_ci_test** was connected for the investigation. Every runner validates the target with the current F20 helper before loading the application or executing preparation; preparation also checks `current_database()`. All application, transaction, barrier and diagnostic clients use that same target. The default hosted `.env` was not used as a connection target, and credentials were never printed.

The other two approved names, carbonlite_e2e and carbonlite_test, were unavailable on this local server. Their names were not silently substituted inside the application.

| Experiment | Result |
| --- | --- |
| Original existing database state | 12 failed / 2 passed |
| Existing reset mechanism, restore unchanged original global factor fixture, no tenant records | 12 failed / 2 passed |
| Immediate full-suite rerun without reset | 12 failed / 2 passed |
| A alone, freshly reset original factor fixture | FAIL: 3 expected / 2 actual |
| B alone, freshly reset original factor fixture | FAIL: 2 expected / 0 actual |
| C alone, freshly reset original factor fixture | FAIL: [3,3] expected / [2,2] actual |
| A then B, clean original factor fixture | Both fail with the same assertions |
| B then A, clean original factor fixture | Both fail with the same assertions |
| Retained pre-F20 test source, same production code/target/original factor fixture | 12 failed / 2 passed |
| Clean DB plus old four-factor deterministic E2E baseline | 12 passed / 2 failed: corrected Diesel expected 1 / actual 0 |
| Clean DB plus completed seven-factor E2E baseline | 14 passed / 0 failed |
| Completed baseline, immediate full-suite rerun without reset | 14 passed / 0 failed |

The pre-F20 comparison uses the retained `/tmp/carbonlite-f16` snapshot, not a separately committed F20 parent: these robustness changes are uncommitted in the current checkout. All current production TypeScript files match that snapshot byte-for-byte. Its pre-F20 concurrency source was run under the current guarded bootstrap and an additional guard in the diagnostic runner, so the comparison never relaxed database safety.

No order dependence or leaked tenant/import state was found. Results depend on **reference factor seed state**, not pre-existing ActivityData or document state.

## F20 bootstrap audit

The shared `e2e-app.ts` diff adds an import and a target assertion before `Test.createTestingModule`. It does not load/rewrite DATABASE_URL, change Prisma construction, add migration/reset/seed calls, change compile/init ordering, or alter cleanup. Direct-bootstrap suites replace weaker inline URL assertions with the same helper and compare the live database name with the validated name. Their suite-specific initialization was preserved.

F20 did not change a database target or merge connections/databases in code. A manually chosen disposable target can of course have different data from a previous machine/run; the historical F05 database identity was not available. The same-target pre-F20 comparison proves the reported failure is not caused by the F20 infrastructure diff.

## Cleanup audit

Each run/test creates unique organization/user names and generated document IDs. Source row numbers repeat intentionally only inside their document identity namespace. The different-document case deliberately shares an organization, while keeping distinct document IDs.

`cleanupTestData` deletes run-prefixed organizations and matching users. Schema relations cascade tenant-owned users/memberships, documents, extractions, staged rows, ActivityData, metrics, audit and workflow records through the organization. Current snapshots are ActivityData fields, not a separate uncleaned snapshot table. Global factor sources/versions are reference fixtures and are intentionally not owned by each source test.

Final database counts after validation: **1 baseline organization, 1 baseline user, 7 conversion factors**; **zero** documents, extractions, staging rows, ActivityData, metrics, audit records, workflow events, or run-prefixed concurrency organizations. The completed deterministic baseline uses legacy conversion factors and creates zero governed factor sources/versions. No cleanup defect or identity reuse was found.

## Small test-infrastructure fix

Changed `scripts/e2e/seed-test-db.mjs` only, adding dedicated deterministic E2E factors:

- Diesel: 2.68 kgCO2e/L.
- Gasoline: 2.31 kgCO2e/L.
- Air Travel: 0.115 kgCO2e/km.

Existing fixtures remain: Alberta electricity 0.53/kWh, Hotel 15/night, Natural Gas 1.89/m3, and Natural Gas 49.44/GJ. These are the established frozen fixture values, not changes to production factor definitions. The seed already creates the baseline organization/user/membership/facility. It creates no factor-source/version registry rows.

The initial database contents came from an older/incomplete reference seed, with only a generic electricity placeholder. A successful generic seed command is not proof that the required provincial factor exists. The old deterministic E2E seeder's four factors also did not cover the corrected Diesel row or the Gasoline/Air golden fixtures. No historical F20 seed-command transcript was available; the actual seed implementations and their effects were independently verified above.

No initialization/seed mutation was added to the shared backend bootstrap. No expected count, calculation result, eligibility decision, import identity, or transaction lock was modified.

## Reproduction/preparation

Use an explicitly supplied F20-approved loopback test URL. Do not source the development URL or rely on the default hosted `.env`.

From the backend root, after the existing migrations have been applied to the disposable DB, seed using the current F20 guard before invoking the existing sibling E2E seeder:

```sh
ALLOW_TEST_DB_RESET=true node -r ts-node/register -e "require('./test/helpers/database-safety').assertSafeTestDatabaseTarget(); import('../carbonlite-web/scripts/e2e/seed-test-db.mjs')"
```

This command seeds; it does not reset or migrate. The investigation used the existing frontend `scripts/e2e/reset-test-db.mjs` for clean-state experiments, behind the stronger F20 guard and live DB identity check. No new reset mechanism or schema work was introduced. The backend's bin wrapper selected a broken Homebrew Node/ICU installation, so validation invoked the installed Node 20 executable directly.

## Final validation

| Required check | Result |
| --- | --- |
| Concurrency suite | 14/14 PASS, twice |
| F05/F12 focused unit and lineage tests | 28 PASS |
| F12 actual API eligibility tests | 20 PASS |
| Uploaded and staged mixed partial confirm | 3 → 1 → 0 PASS |
| Golden workbook remaining subset | 3 → 1 → 0 PASS |
| Field Mapping | 5/5 PASS; Gasoline 350 L → 808.50 |
| Golden A | 579.40 PASS |
| Golden C | 2428.44 PASS |
| Combined | 3007.84 PASS; 8 records, 7 GHG, 1 tracked Water |
| Manual Gasoline / Diesel | 115.50 / 268.00 PASS |
| F20 unsafe-target and bootstrap guards | 33 PASS |
| Backend typecheck | PASS |
| Backend Nest production build | PASS |

The golden replay used real local API uploads/extraction/confirmation and workbook fixtures, without an external extraction provider. Backend typecheck/build used the isolated current-source copy. Production source, F20 helper/bootstrap, and the original F05/F12 specs were hash-verified unchanged afterward. The unrelated pre-existing factor-ID assertion was not changed or rerun.

Diagnostic JSON, lock trace and command logs are under `/tmp/carbonlite-concurrency-diag/`. Raw credentials are absent from the audit output.

**F20 regression: NO. F05 lock: correct. F12 eligibility: correct. Import identity collision: NO. Test isolation defect: NO. Fixture/seed defect: YES. Production bug discovered: NO. Safe to proceed to F21: YES.** No F21 work was performed.

Files changed for this task: the deterministic test seeder and this audit report. No backend production/schema/migration or test-expectation changes.
