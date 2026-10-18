# Task 9A — Pilot RC blocker remediation

Date: October 17, 2026 (America/Edmonton). Final verification complete. **TASK 9 = PILOT RC PASS.**

## Phase 1 — migration integrity, completed before calculation changes

The mismatched migration was `20261004043000_backfill_province_electricity_matches`. Applied SHA-256: `13006eb2872235da2575302c3c0182a1332fc31b153fc91365a9a2808e8775e1`. The committed Oct 8 variant had SHA-256 `861e4eb515b4925801d43f3f88fea14542899ce802aa719f3a0dadf4b4d5c08f`; application finished Oct 4. It had been edited after application (predicate/guard changes) and the altered bytes committed. The exact original SQL was recovered from an Oct 4 local task execution record and verified against the database checksum before restoring the file. No applied row/checksum was rewritten and the restored backfill was not re-executed on development.

Exact schema differences and causes:

- `ActivityData.sourceType` was TEXT with default MANUAL, whereas Prisma expected RecordSourceType. Committed migration `20260503233557_add_activity_source_fields` explicitly dropped/recreated it as TEXT; this is migration/datamodel divergence, not evidence of an unrecorded `db push`.
- ActivityType retained BUSINESS_TRAVEL and FREIGHT from the initial schema. Additive later migrations never removed them. Five BUSINESS_TRAVEL rows still exist. Prisma now represents those legacy stored values; no new pilot activity option was introduced and no old row was reclassified/deleted.
- Factor, FactorVersion and FactorSource updatedAt defaults exist in the original governed-library migration but were absent from the datamodel. Restored the matching Prisma defaults.
- The review-row unique index was created as `SpreadsheetImportReviewRow_idempotency_key`. Added the missing Prisma `map`, preserving both the existing index and client compound-key name.

All observed schema differences are explained by committed migration/datamodel divergence. No metadata establishes that `db push`, manual SQL or a recreated branch was the cause; none is required to explain the observed state. Clean local replay reproduced the historical schema.

Added forward migration `20261017230000_reconcile_activity_source_type`: validates existing labels, drops the TEXT default, and casts the existing column with `USING` to RecordSourceType in a transaction. It does not drop/recreate the column or alter quantities, calculation fields, lineage values, or legacy activities.

Validation: clean deploy on a new local PostgreSQL test database, Prisma validation and zero schema diff all pass. A private custom-format PostgreSQL dump and uploads archive were created outside Git, permissions restricted, archive readability and hashes checked. Only then was the forward migration deployed to guarded Neon development. Result: **47 applied, no checksum mismatch, status clean, schema diff exit 0; all 205 ActivityData rows have identical pre/post JSON fingerprints.** Neon main was not accessed. Backup archive inspection is not a full recovery drill.

This follows Prisma's recommendation to restore an edited applied file and use forward migrations; `migrate resolve` is not a tool for rewriting a successfully applied checksum. Sources: [migration histories](https://www.prisma.io/docs/orm/v6/prisma-migrate/understanding-prisma-migrate/migration-histories), [resolve limitations](https://docs.prisma.io/docs/cli/migrate/resolve).

## Phase 2 — source-of-truth split, understood before calculation changes

Both `/metrics/summary` and `/metrics/calculation-summary` call CalculationQualityService. Its read evaluator ignores persisted ActivityData calculation fields and rematches current libraries. Legacy factors are filtered to exact source year; governed statuses/default fallbacks differ from the frontend. Separately, `loadMetricsOverview` supplements missing backend results with current frontend factor matching. Manual saves can persist MISSING_FACTOR/null snapshots while a later report displays a reconstructed result.

| Record | Persisted result | Persisted factor | Backend inclusion/result | Report/export result |
|---|---:|---:|---|---:|
| Electricity 358 kWh | CALCULATED / 189.74 | 0.53 | included / 189.74 | 189.74 |
| Natural Gas 3 GJ | CALCULATED / 148.32 | 49.44 | missing factor / excluded | 148.32 |
| Electricity 1250 kWh | CALCULATED / 662.50 | 0.53 | included / 662.50 | 662.50 |
| Natural Gas 8.5 GJ | CALCULATED / 420.24 | 49.44 | missing factor / excluded | 420.24 |
| Gasoline 350 L | CALCULATED / 808.50 | 2.31 | missing factor / excluded | 808.50 |
| Hotel 3 nights | CALCULATED / 45.00 | 15 | missing factor / excluded | 45.00 |
| Air Travel 4280 km | CALCULATED / 492.20 | 0.115 | missing factor / excluded | 492.20 |
| Electricity 980 kWh | MISSING_FACTOR / null | null | live rematch / 519.40 | live supplementation / 519.40 |

Backend total 1371.64 versus report 3285.90. [Record-level evidence](task9a-calculation-split-before.json) includes stored factor identities, provenance fields, backend reasons and baseline metadata. No golden expected value was changed.

Required remediation: server-owned calculation snapshots at writes; historical reads consume durable snapshots, never current factor values; explicit recalculation creates a new version with audit history; frontend consumers use that same persisted truth. Historical fields/metric snapshots may be adopted without recomputing their original values. Uncalculated legacy records require an explicit calculation, not a page-view backfill.


## Canonical calculation remediation

New forward migration `20261017233000_canonical_calculation_snapshots` adds calculation snapshot/version/time fields and durable organization boundary attestation fields. It also persists the exact existing ECCC 49.44 kgCO2e/GJ reference previously available only in the frontend. It introduces no new factor value or family. The migration is transactional, replayed on an empty disposable local database, then deployed to confirmed Neon development after checking backup hashes. All prior values of the 205 existing activity rows were fingerprinted excluding only the newly added columns and remained identical. Final inventory: **48 applied, zero checksum mismatches, migration status up to date and schema diff zero**. No reset, `db push`, applied-history rewrite, or Neon main access occurred.

The API now selects factors at creation/import/edit or explicit recalculation and persists input, factor identity/value/unit/provenance, unit conversion, result, scope, authenticated actor, timestamp and version. Client-supplied calculation/factor fields cannot override that result. Historical metrics reads project this snapshot. Legacy stored calculation fields or MetricResult evidence are projected without library rematching; missing legacy calculations require an explicit audited action. Explicit recalculation increments version and stores old/new snapshots in audit history. Frontend overview/report consumers no longer supplement missing results from the current library.

Live historical regression: Diesel 100 L at 2.68 gives 268; editing the library to 3.68 leaves ActivityData, both summary endpoints, the report and CSV at 268, with unchanged snapshot. Explicit recalculation produces 368 and a new snapshot/audit. The library is restored to 2.68 afterward; this reference restoration does not rewrite the intentionally recalculated historical result.

Manual electricity 980 kWh, Alberta, 2026-10-14 persists 519.40, factor 0.53, Scope 2, actor/time and original manual lineage without a source file. The combined real browser flow verifies the saved server snapshot, report, all exports and logout/login record identity.

## Other blocker root causes and repairs

| Area | Before | After | Root cause / evidence |
|---|---|---|---|
| Partial confirmation | Corrected row imported 0 | Real UI 3 → 1 → 0; four unique records | Confirmation favored stale persisted review eligibility over corrected request values. Server revalidates and updates the same row identity before import, then dedupes by record. Explicit selection is respected; legacy staged confirmations remain supported. |
| Zero-import client handling | A successful 0 response triggered individual creation fallback | Successful 0 remains 0 | Client treated `alreadyImported` as a reason to create records itself. Removed that success-response fallback. |
| Optional staged context | Omitted fields erased province/facility | Omitted values retained; explicit changes applied | Server normalization conflated omitted optional fields with corrections. Integration assertions exposed the loss and remain intact. |
| Import transactions | Fresh real imports exceeded five-second transaction budget | Bounded 60-second transaction; completed workflow has no API 500 | Additional server validation plus remote development latency exceeded Prisma's default. The final real workflow exercises the configured bound. |
| Boundary review | Material values saved, attestation rejected/not stored | Durable REVIEWED, actor/time/version/fingerprint; material edit invalidates review | DTO/database/response lacked attestation contract. Server derives identity and time and checks version. No automatic approval on ordinary save. |
| Negative quantity | Accepted | Negative and zero return actionable 400; no row | Backend DTO allowed nonpositive values. Positive consumption enforced in DTO and snapshot/confirmation service, consistent with existing zero rule. |
| Invite activation | Failed fixture | Activation/auth integration passes | Fixed expiry was already in the past. Fixture now expires relative to test time. Login/JWT guards unchanged. |
| Required gates | Frontend/typecheck/integration failures | Final counts below | Node-native tests were collected under jsdom; now run with node:test before Vitest. Type definitions/configuration were stale. Production dependency closure is checked strictly from src/main.tsx, excluding unshipped orphan monorepo files. |

Obsolete test fixtures/assertions were corrected without changing golden numbers: current-library supplementation became persisted-result assertions with a deliberately changed library; custom-factor fixtures now explicitly satisfy existing verified/jurisdiction requirements while retaining their numeric expectations; electricity unit tests supply the required province; a server-selected factor ID replaces a client-invented ID; empty summaries assert the existing zero-count aggregate; duplicate confirmation asserts record-level 201/0 rather than obsolete document-level 409; tracked Water asserts no invented emissions factor/result while retaining quantity, cost and lineage checks. UI expectations were updated for current six-stage wording, expanded row metadata, sheet-aware identity, explicit cost fields and actual supported file types. Async UI assertions wait for completed loading. No test was skipped to achieve green results and no expected golden value changed.

## Frozen report/export verification

Backend A 579.40, B 338.06, C 2428.44 and combined 3285.90 are verified through both summary endpoints. Combined scope totals remain 1377.06 / 1371.64 / 537.20. The browser flow retains 9 records, 8 calculated, 1 tracked, 100% eligible coverage, 8/8 traceability, 5 unique factors and 8 usages. CSV schema is unchanged; tracked Water emissions and missing costs remain blank. Explicit zero behavior remains covered separately.

PDF skill verification used native PDFKit rendering because Poppler is unavailable on this host. All pages were rendered and inspected, including contact sheets: executive 2 pages and technical 11 pages, current structure retained, no clipping or overlapping content observed. The final browser run repeats all exports from the final runtime.

## Evidence safety and remaining limitations

Private accounts/passwords/tokens and database/source backup archives remain outside Git. The 17 old synthetic accounts whose credentials appeared during Task 9 were disabled, invitation setup hashes cleared and each prior captured JWT was verified rejected with 401. Existing source/calculation evidence was preserved. The old synthetic Diesel reference was restored only within its owning synthetic tenant. Its old missing manual record was calculated explicitly with audit history, bringing the existing combined evidence to 3285.90 without recalculating its seven stored historical results.

Final test-context accounts are disabled after validation as well. No actual Neon/OpenAI/JWT/admin secret is committed. Browser authenticated traces are ignored. Credential-pattern scans report candidate findings without printing values.

P2 limitations remain: large frontend bundle; optional monitoring alert delivery unverified; stateless logout alone does not revoke a copied JWT; no automated retention/full erasure guarantee; backup archives verified readable but a full restore drill and automated paired backups remain unverified. Public registration behavior must not be described operationally as invite-only. These were not expanded into new features.


## Final gates

- Frontend: 1051/1051 Vitest tests, 86/86 files; 2/2 native database-guard tests.
- Backend unit: 245/245, 23/23 suites.
- Backend integration: 112/112, 26/26 suites on a disposable local PostgreSQL database with public development reference factors. No Neon integration fixture reset. Final invocation uses uncached Jest and process exit after tests; known lingering test handles do not change test discovery or assertions. Compiled dist artifacts are excluded; no source test skipped.
- Strict production application typecheck and both production builds pass.
- Prisma validation, 48 checksums, migration status and schema alignment pass.
- Final real-API RC E2E: 7/7 pass, zero skips, final built API; includes combined workflow, selected-date exports, boundary actor persistence, historical report/CSV + explicit recalculation, source isolation, empty browser session and 3/1/0 partial confirmation.
- A complete final backend stop/start, followed by fresh login, preserves exact activity/snapshot and boundary fingerprints in three tenants. Every prior audit row remains byte-equivalent; login correctly appends new audit events. Combined remains 3285.90; intentionally recalculated historical Diesel remains 368 after restoring its reference to 2.68.
- Final credential scans: zero candidate findings across 749 web and 297 API candidate files. Private backup/state files and browser authenticated output are excluded from commit candidates.

[Sanitized machine-readable evidence](task9a-pilot-rc-evidence.json) includes counts, check results and hashes of private logs. Private logs/state contain test-context data and are not committed. Initial exploratory failures (default transaction timeout, an integer-format assertion, audit append comparison, overlapping test-run logs and a request issued before startup readiness) were diagnosed and corrected; the final full runs above are green, with no unexplained runtime API 500s.

Final session retirement: 14 new synthetic accounts disabled; all 8 captured current sessions return 401. Together with the 17 old accounts already disabled, no captured RC session remains reusable. Activity/source/audit evidence remains stored. External secrets were not rotated.

P0 blockers remaining: NONE. P1 blockers remaining: NONE. Migration status: CLEAN. Historical silent mutation: BLOCKED. Backend/report reconciliation: PASS. Golden expectations unchanged. Neon development modified: YES; Neon main modified: NO.

**TASK 9 = PILOT RC PASS.** This source state is the pilot release candidate; no Task 10 work was started.
