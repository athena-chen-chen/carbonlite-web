> Task 9 historical finding: BLOCKED. Remediated and superseded by [Task 9A final RC PASS](task9a-blocker-remediation.md); the original audit below is preserved.

# Task 9 — Pilot release candidate

Validation date: October 17, 2026 (America/Edmonton).

## Phase 0 — audit before implementation changes

- Web: branch `main`, HEAD `df83b4c128d8de990c2593d8cafc700438e01eed`, version `0.0.0`.
- API: branch `feature/pilot-readiness`, HEAD `63769c347a740a9b4611d8882d8bf52aa9c8c973`, version `0.0.0`.
- Both checkouts contain extensive pre-existing edits/untracked files. Those are preserved. HEAD alone does not identify the candidate; no clean-tree freeze can be claimed.
- Web production build passes. Initial full Vitest: 1,047 passed, 12 failed, 88 files (four failed). Standard application typecheck fails on missing Node/Nx typings. Vite does not typecheck.
- Backend unit/build checks are in progress. The shell's backend Node installation has a missing ICU library; use the existing working Node 20.19.5 binary. Building into the sibling repository requires sandbox write approval.
- Web `dev:neon` expects a missing web `.env.neon.local`. API has its own guarded `scripts/dev-database.mjs` and ignored `.env.neon.local`. Its endpoint matches the operator-supplied `NEON_DEVELOPMENT_HOST`; this is configuration confirmation, not independent Neon branch metadata verification. No main endpoint is used.
- Read-only Neon development audit: 46 migration directories, 46 applied, no pending/failed migrations. **P1 migration safety blocker:** checksum mismatch for `20261004043000_backfill_province_electricity_matches`; Prisma diff exits 2 with actual schema drift. No reset, migration repair, db push, deploy, or backfill has been performed.
- Development launcher selects the named env before dotenv, disables local demo auth, Task 7 fixtures, and demo reset. Startup performs no migrations or seeds. Configured JWT secret is present and differs from the fallback; secret values are never included here. JWT expiry is hardcoded to seven days. Logout removes client state; server tokens are stateless.
- Authentication uses database users/JWT. Source inspection finds registration does not enforce the documented `PUBLIC_SIGNUP_ENABLED` switch; registration creates `USER`, while boundary editing requires `ADMIN`. Pilot account provisioning must be reviewed.
- Source upload uses organization-scoped SHA-256 duplicate detection; uploaded bytes reside in API-local `uploads/`. Static public serving has already been removed in the working tree. Authenticated download checks organization ownership. Confirm stages/imports records and persists workflow events. Real API isolation needs fresh execution.
- Workflow history uses persisted `UserActivityEvent`, filtered and tenant-scoped before pagination; separate `AuditLog` also exists. No passive page-view event is required for history.
- Reports are assembled in the browser using canonical report utilities and jsPDF; export actions have persisted activity events. Existing report design and frozen factor baselines are not changed.
- Boundary frontend sends review/version fields absent from backend DTO/schema. This requires live reproduction; no successful save is assumed.
- Monitoring: optional frontend/backend Sentry, optional analytics, backend request timing and global exception filter. No configured alert delivery or operational monitoring guarantee has been established.
- Tests: Vitest, mocked browser suites, guarded destructive local PostgreSQL API/E2E suites, and existing opt-in RC browser tests. Prior `/private/tmp/task9-*` results are historical evidence only and will not be counted as this execution.
- Existing pilot/demo, environment, Task 7/8, and audit docs exist. Public Privacy/Terms pages exist and disclose OpenAI processing. No paired database/source-file restore drill has yet been established.
- Credential files `.env`, `.env.local`, `.env.neon.local`, `.env.docker.local` are ignored in both repos. Initial tracked-content scan found only placeholder URLs in example env files and a health test; no confirmed secret. Fixture privacy review remains open.

Immediate decision: **not approved for external pilot use** while migration integrity and normal boundary persistence remain unresolved. Continue validation without changing frozen calculations or repairing database history automatically.

## Release decision

**TASK 9 = PILOT RC BLOCKED**

An external user can upload/import records and download reports, but the current build cannot be approved for credible end-to-end use. Calculation Review/report calculations disagree with backend calculation results; editing a factor changes the historical summary without an explicit recalculation. Spreadsheet corrections do not reach the authoritative staged rows during re-confirmation. Passing renderer fixtures does not clear these live gates.

The phase-0 notes above record the initial state. Final checks below supersede provisional build/test and boundary-save findings. No production deployment, Neon main access, migration repair, reset, `db push`, baseline-factor replacement, or broad refactor was performed. Both repositories remain dirty; this is an audit of the working candidate, not a frozen commit release.

## Verified blockers and root causes

| Severity | Finding | Evidence and required resolution |
|---|---|---|
| P0 | Historical calculation changes in the reporting API without explicit recalculation | A synthetic 100 L Diesel calculation was persisted at **268** with snapshot factor **2.68**. After its tenant-owned factor was edited to **3.68**, a plain calculation-summary GET returned **368**. A fresh read confirms the persisted metric still says 268; do not interpret changed joined factor metadata as proof that the stored metric value was overwritten. `CalculationQualityService.evaluate()` rematches current factors on reads and does not consume that calculation snapshot. Resolve this discrepancy with explicit, audited recalculation behavior before pilot use. |
| P0 | Live calculation paths disagree | Fresh synthetic combined workspace: **9 records**, but backend calculation-summary returns **1,371.64**, **3 calculated**, 1 tracked, with Natural Gas, Gasoline, Accommodation and Air Travel missing factors. Browser report/CSV computes **3,285.90**, **8 included**, using the frontend factor path. Golden A's initial three records similarly give backend **519.40**, rather than 579.40. Reconcile eligibility/matching across existing paths without changing frozen values or admitting governed offset/TIER/component factors. |
| P1 | Corrected spreadsheet row does not import | Real UI on a fresh synthetic tenant: initial confirmation creates **3**; correcting Missing Province to Alberta and selecting the now-eligible row returns HTTP 201 with **count 0**, expected 1. `mergeImportActivities()` discards request edits whenever persisted review rows exist; the UI correction is not saved back to those rows. Keep record-level idempotency while persisting/consuming the actual correction. No document-level 409 occurred in this reproduction. |
| P1 | Manual snapshot persistence is incomplete | Real UI saves Electricity 980 kWh/Alberta/2026-10-14 with HTTP 201 and truthful MANUAL source, but creation response has null calculated-emissions snapshot. Activity creation accepts optional client-supplied calculation fields; there is no guaranteed server-side snapshot on this path. The report can reconstruct 519.40 from current factors, which is not proof of durable historical calculation lineage. Verify factor/result snapshots in persisted storage, not only a Complete badge. |
| P1 | Boundary review attestation contract is unsupported | Ordinary administrator material-field save/reload **passes** with the existing frontend contract fix. The separate review action still sends `boundaryStatus`, reviewer/version/fingerprint fields to the strict DTO that does not accept/store them; full review payload returns 400. Do not claim durable review completion until this is resolved. Newly registered USER accounts cannot save organization settings; deliberate administrator provisioning is documented. |
| P1 | Migration integrity/drift gate fails | **46/46 applied**, no pending/failed migration; Prisma validation/status pass. Applied checksum differs for `20261004043000_backfill_province_electricity_matches`; datasource-to-schema diff exits **2**. Drift includes sourceType representation, enum/index differences and defaults. The generated diff contains a sourceType drop/add: it was **not applied**. Recover the reviewed original migration and plan a data-preserving forward reconciliation; do not reset, rewrite stored checksums, or run the diff blindly. The Task 7 migration is also still untracked in the API checkout, so committed-migration readiness is not established. |
| P1 | Validation/error-handling gate is not green | API accepts negative quantity with 201, although the summary flags it INVALID_QUANTITY. Full web tests/typecheck and local API integration tests fail. Triage actual failures and stale contracts separately; do not weaken assertions. For example, the organization-isolation integration assertion fails on a legitimate zero-valued aggregate, not on exposed Org A data; an unsupported-format wording assertion predates JSON support. |

The documented `PUBLIC_SIGNUP_ENABLED=false` backend switch is not enforced in registration. This does not bypass JWT or expose another tenant, but the build must not be represented as invite-only. Provisioning is an operator action, not an ordinary user's SQL workaround. Invite activation also has an unresolved 401 in the local integration suite; do not assume that onboarding path passes merely because password login passes.

These are unresolved release findings, not requests to repair database history automatically. This validation made the narrowly scoped frontend fix below; the remaining findings require coordinated persistence/matching corrections and migration reconciliation, with their existing failing probes retained.

## Small fix validated in this pass

The reporting date inputs and Generate action were enabled before asynchronous default-range initialization finished. A real-browser probe selected August 1, but initialization replaced it with the earliest source date, August 31. `ReportingPage` now keeps these controls disabled while `isPreparingReportData` is true. A deferred-initialization regression verifies that the user cannot edit too early and that a subsequent selected period reaches the report request unchanged. This changes loading behavior only; formulas, factors, report sections, CSV schema and report semantics remain frozen.

RC browser probes now use the actual manual-form accessible controls, wait for generation, and inspect the prepared Combined workspace instead of incorrectly using tenant A. Soft assertions retain a failing manual-snapshot gate while allowing collection of exports and persistence evidence; they do not turn that failure into a pass.

## Validation matrix

PASS in a fixture/unit test is explicitly distinguished from PASS on the running development API.

| Area | Result | Evidence / limitations |
|---|---|---|
| Environment | PASS with branch-identity limitation | Local web → localhost:3333 → guarded Neon development env. Database identity checked against the synthetic API user in that database. Endpoint matches configured development-host assertion; independent Neon console branch metadata was not available. No main connection. |
| Clean tenant / empty states | PASS | Separate empty B workspace: records, documents, review rows, summaries, boundary, history, reports and facilities return 200. Fresh browser navigation, refresh and logout/login pass. |
| Authentication | PASS for password sessions | Valid login; wrong password, missing/invalid/expired tokens reject with 401 in live probes. Browser refresh and logout/login pass. Demo bypass disabled. Logout clears the client session; seven-day JWTs are stateless and not server-revoked. Invite onboarding remains unresolved as above. |
| Tenant isolation | PASS for exercised routes | Direct foreign activity/source/extraction access returns 403/404. Source bytes are inaccessible anonymously, downloadable by owner, denied to other tenant. Earlier same-candidate probes verify custom factor, facility, persisted report and calculation-selection isolation; lists/query overrides remain tenant-scoped. A failing zero-state integration expectation is not a demonstrated isolation leak. |
| Migrations | BLOCKED | 46 applied; checksum mismatch/schema drift. Clean `migrate deploy` on a newly created local PostgreSQL database succeeds. No clean Neon branch replay performed. |
| Secret hygiene | PASS for inspected tracked content | `git ls-files`, `git check-ignore`, assignment/URL/token-pattern inspection in both repos: no confirmed real tracked credential. All four actual env-file names are ignored/untracked. Example/CI values are synthetic placeholders. No real credentials included in this document or published evidence. |
| Golden A | Fixture PASS; live FAIL | Frozen 579.40 (0 / 519.40 / 60.00) remains passing in report/domain tests. Live initial three-row dataset backend gives 519.40 and HOTEL missing factor. |
| Golden B / ENMAX | Fixture PASS; live disagreement | Frozen 338.06 (148.32 / 189.74 / 0). Synthetic PDF extracts/imports 358 kWh, 3 GJ and 6 m3 Water; CSV includes 338.06, direct 49.44/GJ and tracked Water. Backend NG summary is missing factor. Fee-only waste behavior has unit coverage; no invented waste quantity added. |
| Golden C / Field Mapping | Fixture PASS; live disagreement | Five workbook records import; facilities and blank optional costs survive CSV. Frontend subtotal 2428.44; backend includes electricity 662.50 and excludes other activities for missing factors. |
| Combined regression | FAIL end-to-end | Frontend/export 3285.90, scopes 1377.06 / 1371.64 / 537.20, 9 / 8 / 1; backend 1371.64 with 3 included. 100%/8-of-8 frontend traceability does not establish immutable persisted snapshots. |
| Upload formats | PARTIAL | Real PDF and XLSX flows exercised; CSV/hash upload exercised. CSV/XLS/JSON and JPG/JPEG/PNG support inspected and covered in relevant unit paths, but every format was not independently re-extracted live. HEIC unsupported; extraction gives actionable 400. No HEIC support added. |
| Partial confirm / idempotency | FAIL corrected-row gate | First 3 import; newly eligible row imports 0. Repeat import is not evidence of successful record-level idempotency until the corrected-row case passes. |
| Duplicate handling | PASS in live probe | Same content/name and renamed bytes return 409; same name/different bytes and same bytes/different organization allowed. Organization-scoped SHA-256 semantics unchanged. |
| Manual Entry | PARTIAL / BLOCKED lineage | Stable ActivityData ID, MANUAL source, actor/time/original values exist; source file not invented. 519.40 can be reconstructed, but durable factor/calculation snapshot is incomplete. |
| Factor governance | Unit PASS; live FAIL | Task 7/8 and corporate baselines pass focused tests. Offset/TIER/reference-only/components remain excluded. Live Natural Gas/Gasoline/Diesel baselines do not all resolve in a new normal organization. The history tenant's 3.68 Diesel is explicitly synthetic/custom and is not a replacement system baseline. |
| Historical snapshot | FAIL P0 | Persisted 268 versus displayed 368 after a factor edit, without explicit recalculation. |
| Reporting boundary | Material save PASS; review FAIL | Administrator saves survive browser reload. Incomplete boundary remains needing attention; calculations do not complete it. Separate review attestations are unsupported by persisted contract. |
| Audit Trail | PARTIAL | Real upload/import/manual events have tenant, actor, time, target and persist. Browser report/export workflow reaches persisted event path. Full audited recalculation/review lineage gate cannot pass with the snapshot/review defects. No fake frontend history added. |
| Executive PDF | Generation / numeric content PASS; release gate BLOCKED | Download opens as 2 pages and contains combined frozen totals/counts/Pilot Draft limitations. Final browser check preserves the requested **2025-08-01 to 2026-10-14** period after the loading fix. Cross-path calculation inconsistency prevents approval. |
| Technical PDF | Generation / numeric content PASS; release gate BLOCKED | Download opens as 11 pages with retained structure, 5/5/0 source review, 3 inputs / 2 uploaded sources / 1 manual and 2 used Natural Gas records. All pages rendered for layout inspection; no redesign. |
| CSV | PASS on downloaded combined data | 9 records; total/scopes match frozen values. Water numeric emissions blank; all missing costs blank; facilities preserved; manual provenance says Manual Entry; internal IDs not used as Factor Version. Explicit-zero semantics covered by focused tests. |
| Reload/login persistence | PASS for exercised data; restart NOT VERIFIED | Browser logout/login preserves the nine activity IDs and no unexpected API 500/page exception is recorded in that completed run. Material boundary save/reload and empty fresh session pass. Successful full workflow/restart gate remains unapproved; the pre-existing backend was not restarted under a claim of success. |
| Error handling | PARTIAL | No unexpected 500/uncaught page exception in exercised real workflow; malformed credentials/unsupported extraction/required fields produce errors. Negative-quantity API acceptance fails the requested validation behavior. Expected provider-failure integration tests deliberately exercise 500s and are not unexplained pilot incidents. |
| Build/tests | FAIL overall | See final counts below. Builds pass; complete suites/typecheck do not. |
| Fixture isolation / privacy | PASS for reviewed evidence | Task 7 fixtures guarded local-only; runtime Neon development has **0** `dev-task7-` factor records. Seeds are not part of named development startup. Synthetic test-library disclosure inspected; text extracted from **54 tracked fixture PDFs**, all readable, no email candidates or confirmed real PII found. This is not an exhaustive PII certification. |
| Recovery readiness | Documented manual procedure; drill NOT VERIFIED | Paired database dump + API-local uploads archive, restore into separate development database, validation and deliberate endpoint switch documented in runbook. No automated backup, Neon history window, restore SLA or successful drill claimed. |
| Privacy/data handling | Documentation present | Privacy/Terms pages plus pilot runbook disclose OpenAI extraction, tenant isolation, separate source storage, retention/deletion limitations and support contact. No claims about provider residency/training/retention guarantees. Real customer documents should not be accepted on this blocked build. |
| Developer intervention | FAIL for intended ordinary workflow | Operator account provisioning is acceptable/documented. Corrected spreadsheet import and immutable, consistent calculations cannot be completed by the user through the current supported workflow. SQL/console workarounds are not acceptance. |
| Pilot runbook / acceptance script | COMPLETE | [Runbook](../pilot-release-runbook.md) and [product-facing acceptance script](../pilot-acceptance-script.md); both clearly identify blocked status. |

## Test evidence and reproducibility

- Final frontend full Vitest: **1,049 passed, 12 failed, 1,061 total**, **85 files passed / 4 failed**. One failed file is the Node `node:test` development-launcher suite incorrectly discovered by jsdom Vitest; it fails suite collection. Failed assertions include upload/re-confirmation expectations and older UI contracts. They have not been removed or relaxed.
- Focused golden/domain/PDF/CSV/matching/Task 7/8 governance suite after the loading fix: **187/187**, **11/11 files PASS**. Frozen values are Golden A 579.40; B 338.06; C 2428.44; combined 3285.90. No calculation value changed.
- Focused ReportingPage suite including deferred date-initialization regression: **34/34 PASS**.
- Frontend application typecheck **FAIL** on unresolved `node` and `@nx/react/typings` definitions. Normal Vite production build **PASS**; it does not typecheck. Bundle-size warning remains P2.
- Backend unit suite **240/240 PASS**, **22/22 suites**. Sandbox-only temporary-port failures were rerun with local networking permitted. Backend fresh Nest production build **PASS**, not a stale-dist assumption.
- Backend integration on a newly created local Docker PostgreSQL database: **100 passed / 9 failed**, **18 suites passed / 8 failed**, plus the failed `duplicate-protection` suite's TypeScript collection errors (`.expect` called on a Promise). Clean migration deploy before this run **PASS**. No destructive reset of an existing database.
- Fresh-browser empty session/navigation/logout/login **PASS**; owner-vs-other-tenant source download **PASS**; fresh-workspace partial-confirm **FAIL (0 vs 1)**; administrator boundary save/reload **PASS**. Final combined browser flow fails **only its manual-snapshot assertion** while successfully collecting report downloads and data persistence, including the frozen total assertion. Separate report probe **PASS (1/1)** verifies August 1 date selection and all three downloads after the loading fix. Read-only database verification confirms the UI manual record has **null factor/calculation snapshot and zero persisted metric results**.
- `scripts/rc/pilot-rc-recheck.mjs` is a read-only probe of prepared synthetic state. It requires `TASK9_RC_STATE_FILE` pointing to a private complete state file, verifies the runtime account exists in the guarded development database, and emits only sanitized results. Failed release assertions return nonzero. Never commit state files, credentials or browser traces from real user sessions.
- [Sanitized evidence](task9-pilot-rc-evidence.json) includes test counts, selected source hashes, downloaded CSV checks and live assertions. Raw test logs/downloads/traces remain local under `/private/tmp/task9-*` and Playwright's ignored results directories; they are not a permanent backup or a substitute for a candidate commit.
- Inspection mistake: a command printed private synthetic RC session state in tool output. Those test accounts contain synthetic data; the state is not included in committed audit/evidence artifacts. No database credential, API key or JWT signing secret was printed. External secrets were not automatically rotated.

## Pilot limitations and remaining P2 items

Pilot Draft only: no regulatory compliance determination, certification, assurance, third-party verification or carbon-credit eligibility determination. Corporate baselines remain Alberta electricity 0.53, Canada-generic natural gas 49.44/GJ, gasoline 2.31/L and diesel 2.68/L. Prior-year/generic/internal-review factors require qualified review; coverage is limited to supported, reviewed records.

P2: bundle-size warning; optional monitoring has no verified alert delivery; stateless logout cannot revoke a copied JWT; no automated retention/full physical erasure guarantee; no automated paired source/database backup or tested restore guarantee. Missing conveniences and visual polish were not expanded. Invite-only configuration wording must be reconciled with the actual ungated registration route before that operating claim is made.

## Changes and freeze record

This validation pass changes reporting-control loading behavior and adds regression evidence/tests/documentation. Files edited/created in this pass:

- `src/pages/ReportingPage.tsx`
- `src/pages/ReportingPage.test.tsx`
- `apps/web-e2e/tests/real-api/pilot-rc-end-to-end.spec.ts`
- `apps/web-e2e/tests/real-api/pilot-rc-combined-report.spec.ts`
- `scripts/rc/pilot-rc-recheck.mjs`
- `docs/audits/task9-pilot-release-candidate.md`
- `docs/audits/task9-pilot-rc-evidence.json`
- `docs/pilot-release-runbook.md`
- `docs/pilot-acceptance-script.md`

Existing uncommitted architecture/report/factor work and pre-existing PDF deletions are preserved. API application code was not changed in this pass. Migrations created: **NONE**. Neon development modified: **YES**, synthetic RC tenants/uploads/records and login/audit events only. Neon main modified: **NO**. Production deployed: **NO**. Golden calculations changed: **NO**. Report semantics changed: **NO**.

Release freeze is withheld. Fix and rerun the identified P0/P1 gates, reconcile migration history safely, and identify a reviewed reproducible candidate before external pilot use. No new feature roadmap is part of this decision.
