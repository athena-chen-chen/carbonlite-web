# CarbonLite business model

**Status:** Proposed documentation of the current implementation; not an approved commercial policy or a new release certification. **Reviewed:** October 17, 2026.

Scope: the working copies of `carbonlite-web` (HEAD `df83b4c`) and sibling `carbonlite-api` (HEAD `63769c3`), including uncommitted Task 9A snapshot changes. This is a source-code review, not a production security or emissions-methodology certification. The government grant program reference was not supplied or found in the inspected locations; the requested twelve sections provide the structure. No grant eligibility, adjudication, or funding concepts are assumed to exist in CarbonLite.

**Implemented** means present in the inspected code, including stated exceptions. **Proposed** means a business decision or control still needed; it must not be represented to customers as existing functionality. BR identifiers are permanent: append new IDs and mark retired rules rather than renumbering.

## 1. Business goals

**Implemented product purpose:** help organizations and their reviewers turn documents, spreadsheet rows and manual entries into traceable activity records, estimated inventory emissions, and draft PDF/CSV review packages. The workflow exposes missing data, factor assumptions and exclusions instead of claiming a complete or certified inventory. Canadian provinces and Canada-level factors receive specific treatment. [S3, S7, S12]

**Implemented commercial presentation:** [PaidPilotScopePage](../src/pages/PaidPilotScopePage.tsx), `PAID_PILOT_SCOPE_SECTIONS`, targets SMEs and sustainability consultants, describes one organization/controlled sample workspace, a limited dataset, guided review, PDF/CSV and a feedback session. It displays a suggested CAD 500–1,500 fee and typical five-day sequence. These are published scope statements, not enforced pricing, quotas or service guarantees. No subscription billing, payment collection or plan-entitlement engine was identified in the inspected application paths.

**Proposed commercial goal:** sell a bounded paid pilot delivering agreed data preparation, inventory estimates and a review package. Final price, seats, supported sources, service effort, acceptance criteria and renewal terms remain decisions. A manually contracted/invoiced pilot is a proposal, not an implemented billing feature.

## 2. Actors and responsibilities

| Actor | Implemented responsibility / access | Boundary requiring agreement |
|---|---|---|
| Customer data contributor | Upload, enter, correct and confirm activities through contribution-controlled endpoints. | Own source completeness and corrections; permission enforcement is inconsistent across other mutations. |
| Workspace administrator | Maintain organization/boundary; record boundary review with authenticated identity and server time. | Boundary review is not independent verification of emissions. |
| Viewer / reviewer membership | Intended to inspect records and outputs; contribution helper rejects these roles. | Some mutation endpoints enforce tenant ownership but omit the equivalent role check. |
| `PILOT_REVIEWER` account | Preloaded sample review; common JWT guard blocks writes except feedback/logout. | Distinct from a customer whose membership role is REVIEWER; not a paid-customer approval workflow. |
| Factor curator / operator | Maintain references, provenance and governed factor versions using factor/admin facilities. | Who may verify custom factors, accept estimates or approve methodology needs one enforceable policy. |
| CarbonLite application | Stage data, validate eligibility, persist calculations, assemble draft outputs and record events. | Does not establish regulatory compliance, assurance or carbon-credit eligibility. |
| Extraction provider | OpenAI service produces proposed structured fields from supported source documents. | Extraction output and confidence labels require human/source review. |

Sources: [S2, S4, S5, S7, S11, S12].

## 3. Core activities

Configure organization and boundary → collect PDF/Excel/CSV or manual input → inspect extraction/mapping → correct draft rows → confirm eligible rows → calculate/persist server results → review factors, exceptions and totals → generate draft reports/export evidence. Recalculate intentionally when inputs or reference choices change; maintain source and audit history. Spreadsheet staging, importing, calculating and reviewing are separate activities, even when the UI combines them. [S3–S12]

## 4. Business decisions

| Decision | Implemented decision mechanism | Proposed business resolution |
|---|---|---|
| May this actor act on these data? | JWT identity, tenant-scoped lookup; role checks on selected operations. | One server-enforced action/role matrix, including deletes and recalculation. |
| Does this source create new records? | File hash, staged-row key and confirmation dedupe are separate checks. | Define one import identity across sheets, retries, copies and concurrent requests. |
| Is a row usable? | Draft classification, then server validation/calculation; tracked usage differs from emissions. | Make preview agree with authoritative eligibility and disclose unsupported scope. |
| Which factor/conversion applies? | Activity, normalized units, jurisdiction, year and governance filters; multiple implementations differ. | Publish one precedence/fallback and methodological coverage policy. |
| Is an output ready to deliver? | Draft reports can be generated despite review warnings; boundary review is separate. | Define customer acceptance and a preserved deliverable; do not equate coverage with approval. |

## 5. Business rules

### Implemented rules, with exceptions explicitly retained

| ID | Current rule | Source |
|---|---|---|
| BR-001 | Use the authenticated organization for tenant records and source downloads; do not accept a query parameter as tenant authority. Tenant isolation and role authorization are different controls. | S1, S2, S6, S10 |
| BR-002 | `PILOT_REVIEWER` writes are centrally restricted; contributor operations reject viewer/reviewer roles. Other mutations do not consistently apply that contributor check. | S2 |
| BR-003 | Document upload detects same-tenant identical bytes by SHA-256 and normally returns 409; explicit `allowDuplicate=true` permits a copy. Renaming identical bytes does not avoid this check. | S1 |
| BR-004 | Uploading a source does not itself confirm ActivityData. Extraction/staging and confirmation are separate. Type support is checked during extraction, not comprehensively at upload. | S1, S3, S4 |
| BR-005 | Browser spreadsheet import reads the first workbook sheet, maps fields and saves review rows. Staging creates a synthetic source document with no original file hash/bytes in this path. | S4 |
| BR-006 | READY and TRACKED_ONLY staged rows may be confirmed; NEEDS_REVIEW rows remain draft until corrected. Server confirmation re-evaluates corrections. Empty request activity lists retain legacy “confirm staged eligible set” behavior. | S5 |
| BR-007 | Confirm only new row identities; retries may return 201 with count 0. UI successful-zero responses no longer trigger individual creation fallback, although an older document-409 fallback remains. Backend row identity omits sheet name; browser identity includes it. | S5 |
| BR-008 | Generic consumption quantity must be finite and positive; negative and zero are rejected. No generic negative-activity/removal model is implemented. | S6, S7 |
| BR-009 | A successful calculation stores input, factor/provenance, conversion, result/scope, actor, timestamp and version. Client-supplied derived factor/result fields do not control creation. | S7 |
| BR-010 | Historical summary/report reads use persisted calculations, not current-factor rematching. Legacy stored result fields/MetricResult evidence may be projected without a complete modern snapshot. Missing historical calculations require an explicit calculation. | S7, S8, S10 |
| BR-011 | Explicit recalculation creates a new version and old/new audit evidence. Ordinary single-record updates also recalculate, including metadata-only updates; bulk-province updates mark pending but leave the modern snapshot intact. These are conflicting edit semantics. | S6, S7 |
| BR-012 | Match supported activity and compatible input unit; use record year/date and resolved jurisdiction. Electricity needs a province; supported other categories allow country-level fallback. Exact precedence and exceptions are in section 9. | S7, S8 |
| BR-013 | Explicit offset/TIER/reference-only applicability, component-gas bases and sector-restricted methodology are excluded from normal inventory matching. Missing governance metadata preserves legacy eligibility. | S9 |
| BR-014 | Unverified system/pilot defaults can still calculate with review warnings. Missing factors do not contribute emissions; “calculated,” “verified” and “reviewed” are not synonyms. | S8, S11 |
| BR-015 | Backend calculation supports normalized same-unit aliases and fixed MWh↔kWh scaling. It does not consume the frontend matcher’s optional provenance-checked conversion catalogue. | S8, S9 |
| BR-016 | Water is tracked-only in the active calculation path and excluded from GHG totals. Messaging about an optional reviewed water factor does not implement an automatic switch to water emissions. | S8 |
| BR-017 | Report totals come from backend persisted calculation summaries. Date scope and selected record/document scope determine inclusion; selected records take precedence over documents/date filtering in the summary evaluator. | S8, S10 |
| BR-018 | Browser canonical report data feeds executive PDF, technical PDF and CSV. Outputs default to Pilot Draft / Not reviewed. Boundary REVIEWED does not approve the report. | S10–S12 |
| BR-019 | Boundary review persists real actor/time/version; material boundary changes invalidate the attestation. The supplied boundary version is checked when present. API profile updates require ADMIN although UI review permissions also permit OWNER/REVIEWER. | S2, S12 |
| BR-020 | Actions have audit/event records, but not all mutations and audits share a transaction; browser export logging is best-effort and does not prevent a download when logging fails. | S7, S11, S13 |
| BR-021 | Source deletion currently deletes linked imported activities and metrics, despite the UI promising that imported records are kept. Database deletion is not proof of physical source-file erasure. | S1, S5 |

### Proposed rules — not current guarantees

| ID | Proposed policy |
|---|---|
| BR-022 | Enforce one role/action matrix at every mutation endpoint, with explicit tenant checks and separate authority to curate/verify factors. |
| BR-023 | Separate source removal from inventory deletion; disclose effects, retain required lineage, and apply an agreed retention/erasure policy. |
| BR-024 | Material input changes invalidate or intentionally replace a snapshot; notes/cost-only changes must not silently rematch factors. Apply the same rule to single and bulk edits. |
| BR-025 | Apply one approved factor precedence and conversion policy across preview, confirmation and calculation, including country/year bounds, result-unit scaling, methodological basis and missing provenance. |
| BR-026 | Use stable document/sheet/row identities and atomic deduplication; reconcile all expected source sheets/rows before declaring completeness. |
| BR-027 | Preserve an accepted report’s selected records and snapshot versions, boundary version, template version and delivered artifact; distinguish draft, customer acceptance and external assurance. |
| BR-028 | Agree paid-pilot scope, price, allowed estimates, data-processing arrangements, limits, support, recovery and acceptance criteria before onboarding. Automation is not required where an explicit operated process suffices. |

## 6. Evidence and data provenance

| Evidence | Implemented capture | Limit |
|---|---|---|
| Uploaded source | Name, MIME, size, tenant/uploader, hash and local storage locator. | Local disk availability/retention is an operational dependency. |
| Extraction / staging | Parsed fields, confidence, raw row/value fields, sheet/row/page/snippet where provided, issues and source links. | Confidence is not a correctness guarantee; current extraction upserts one result per document rather than a complete version history. |
| Manual entry | User/audit lineage and original calculation inputs; no source file required. | Original legacy evidence may be incomplete. |
| Calculation | Captured factor identity/value, provenance, conversion quantities, result, scope, actor/time/version; recalculation audit. | A calculation snapshot does not prove source completeness, full gas coverage or methodology approval. |
| Delivered report | Browser document-control metadata and export events. | No immutable delivered-artifact/version manifest was identified in this export path. Backend Report CRUD is a separate metadata facility. |

Do not substitute an internal factor ID for a published version; distinguish source year, factor vintage and calculation/report dates. [S1, S3, S4, S7, S11, S13]

## 7. Document processing workflow

**PDF/document route:** upload bytes → protected source → explicit extraction request → OpenAI Responses request (`gpt-4o-mini`) for supported non-JSON inputs → parse/normalize proposed activities → draft review → correction/selection → confirmation. Instructions and filters reject historical-comparison consumption and currency-only bill lines; they are not a guarantee of complete/correct extraction. JSON has a local parser; CSV can supply local text while still using the extraction provider. Backend validation also accepts XLS/XLSX and image formats; upload acceptance does not establish provider extraction capability. [S1, S3]

**Excel route:** browser SheetJS parsing of first sheet → mapped/normalized rows and preliminary factor eligibility → Save All persists review rows/source metadata → Input Review → Confirm Import. This path does not require AI extraction and does not preserve the original workbook binary. A workbook uploaded through the document route follows the separate provider-assisted path. [S4, S5]

Partial confirmation leaves unresolved rows reviewable. Fixing one row can add one record without reimporting earlier rows. File-copy permission is not permission to double-count underlying consumption. Backend confirmation dedupe does not establish cross-document semantic duplicate detection or concurrency safety. [S5]

## 8. Activity record lifecycle and state transitions

These are separate state dimensions, not one universal status column:

| Entity/dimension | Implemented transition | Important qualification |
|---|---|---|
| Document extraction | UPLOADED → PROCESSING → REVIEW_REQUIRED or NO_DATA_FOUND; errors → EXTRACTION_FAILED / FILE_MISSING. | Retry/reupload is available; processing is request-driven, not a demonstrated durable job/retry queue. |
| Spreadsheet source | Saved rows → PROCESSED or REVIEW_REQUIRED. | This does not mean all records are imported. |
| Draft review row | NEEDS_REVIEW ↔ READY; TRACKED_ONLY for operational usage. | Stored in SpreadsheetImportReviewRow; eligibility is rechecked at confirmation. |
| Confirmed activity | New ActivityData → CALCULATED, TRACKED_ONLY or an unresolved calculation status. | Direct manual creation can persist an unresolved record; confirmation generally filters staged rows by eligibility. |
| Report treatment | INCLUDED / TRACKED_ONLY / REQUIRES_REVIEW. | Unresolved rows are excluded from GHG total, not assigned zero emissions. |
| Calculation revision | Existing result → explicit recalculation/edit → next version + audit. | Single-update and bulk-update exceptions in BR-011 must be resolved. |
| Bulk province edit | Current fields → PENDING_RECALCULATION. | Historical projector currently still accepts the retained snapshot; this can disagree with the new province/status. |
| Boundary | DRAFT → REVIEWED; material change → DRAFT with new version. | No report approval is implied. |
| Deletion | Record/source removal deletes applicable persisted data. | No general soft-delete/restore or legal-hold workflow is established. |

Sources: [S1, S3–S8, S12].

## 9. Emission factor matching and calculation eligibility

**Authoritative path:** `CalculationSnapshotsService.fields` → `CalculationQualityService.evaluate(...recalculate:true)` / `matchFactor`. Reads use `persistedCalculationDetail`; frontend matching is provisional. [S7–S10]

1. Validate positive quantity, supported activity/unit and scope. Jurisdiction resolves from record → facility → inferred source metadata → organization → Canada default; inferred/default jurisdiction is distinguished in detail fields. Record year uses `recordYear` or the record date, not automatically the report year.
2. Filter by activity/unit compatibility and inventory governance. Prefer eligible verified organization-custom factors, then governed exact region/year, governed country/year where allowed, governed prior-year, governed nearest available year, then verified legacy system and eligible system/default fallbacks; a final demo fallback depends on organization settings. Governed nearest-year selection can admit a future year; legacy candidates exclude future source years. Some legacy fallback branches omit a country comparison. Equal-ranked legacy candidates lack a single documented business tie-break policy.
3. Governed eligibility normally requires OFFICIAL/VERIFIED or permitted demo status; pilot system-electricity DEMO versions have an explicit exception. Legacy system defaults may be unverified and still selected. The demo setting is therefore not a universal “no estimates” switch.
4. Compute normalized/scaled quantity × factor value, round using the backend helper, then capture a snapshot. Stored results are reported as kgCO2e; input conversions are limited to aliases and MWh/kWh. Do not infer gas m³↔GJ conversion without an approved quantity basis/heating-value reference.

**CO2 vs CO2e/methodology:** explicit CO2/CH4/N2O component bases are not normal DIRECT_CO2E factors. The code rejects explicit component result-unit labels and restricted applicability, but allows legacy null governance. It does not assemble component gases with GWP weighting or prove that a legacy CO2e label covers all required gases. Methodology/GWP/HHV references can be stored; a general methodology-selection engine using customer operational context is not implemented. No output-unit normalization to kg was found alongside the multiplication; non-kg result units need an explicit contract. [S8, S9]

**Duplicated/conflicting policy:** frontend `findBestConversionFactorMatch`, API `getApplicableFactor` and authoritative `matchFactor` have different year/default/conversion rules. The frontend utility supports provenance-checked conversions, but the inspected Excel call does not supply that optional catalogue and snapshot calculation does not load it. Its conversion-provenance check requires a nonempty verification status, not specifically VERIFIED. Frontend/API governance helpers are duplicated. The older `matchBestFactor` still serves non-carbon metric calculations; it must not be described as the carbon authority. [S6, S8–S10]

## 10. Outcomes and exception handling

Successful outcomes are imported activities, persisted estimated emissions, tracked operational usage, transparent review exceptions and draft review/export packages. Coverage measures eligible calculated records; it is not evidence that every source row, required gas, facility or inventory category is covered. Missing optional cost does not prevent emissions calculation. [S8, S10, S11]

Backend `dataQualityCoverage` divides calculated records by all in-scope records; frontend report coverage uses eligible emissions-bearing records and excludes tracked Water. These denominators differ. Report-generation readiness is advisory; selected record IDs override document IDs and date filtering. A selected-record report must not imply a complete date-period inventory.

| Exception | Current handling | Proposed operating decision |
|---|---|---|
| Missing province/factor; unsupported unit/activity | Review status/reason; no GHG contribution until eligible calculation. | Contributor fixes input; curator supplies approved reference or records exclusion. |
| Unverified/default/prior-year factor | May calculate, with assumptions/review warnings. | Customer/reviewer accepts estimate scope before delivery. |
| Duplicate bytes / confirmed row | 409 file conflict with copy option / zero new rows at repeat confirmation. | Distinguish a retained evidence copy from new consumption. |
| Missing source, no extracted rows, provider/parser failure | FILE_MISSING, NO_DATA_FOUND or extraction failure; actionable retry/reupload. | Assign owner, retry limit and manual fallback; no uptime/completeness guarantee inferred. |
| Export audit request fails | Download may succeed without export event. | Preserve delivered artifact and manifest outside that best-effort event path. |

## 11. External dependencies

PostgreSQL/Prisma store tenants, sources, review rows, activities, factors, snapshots and audits; Neon development is one configured environment, not a claim about paid-pilot hosting. Local API `uploads` disk holds uploaded bytes. OpenAI Responses is used for provider-assisted extraction; actual availability, file/model compatibility, data handling and cost limits require operational confirmation. SheetJS and browser FileReader handle spreadsheet parsing; jsPDF/browser downloads produce report files. JWT/password hashing support identity; optional Sentry/analytics support diagnostics/events. Published government/industry factor sources are provenance references, not a demonstrated automatic refresh feed. No billing provider was identified. [S1–S4, S7, S11, S14]

## 12. Assumptions and unresolved questions

Assume a scoped inventory-readiness pilot, not a certified filing or emissions-removal product. Confirm the customer, geography, supported activities, approved factor list, accepted estimates, quantity/result units, source completeness obligation, curator/reviewer authority, and who accepts the deliverable. Resolve retention of source binaries, AI processing disclosure, recovery responsibility, service limits, pricing and cancellation. A restricted supported-input contract and documented manual controls may resolve a pilot gap without building a new enterprise subsystem.

Task 9A's recorded RC tests are useful regression evidence ([audit](audits/task9a-blocker-remediation.md)), but do not settle these additional business-policy conflicts. It supersedes the earlier [Task 9 blocked assessment](audits/task9-pilot-release-candidate.md) for corrected confirmation, canonical snapshots, positive quantities, boundary persistence and migration reconciliation. Findings below are static source observations/risks; this documentation task did not exercise destructive routes, change the database, or rerun the application suites.

Resolve public-registration versus invite-only operating claims: `AuthService.register` does not enforce the documented PUBLIC_SIGNUP_ENABLED switch. Logout alone does not revoke a copied seven-day JWT; request-time account deactivation checks are separate. Also decide genuine zero/negative adjustments, cross-year consumption periods, coverage denominators and the missing grant-reference alignment.

### Source map

Paths refer to these sibling working copies; functions are stable lookup anchors when lines move.

- **S1:** [DocumentsController](../../carbonlite-api/src/documents/documents.controller.ts) `upload`, `download`, `remove`; [DocumentsService](../../carbonlite-api/src/documents/documents.service.ts) `upload`, `getDownloadFile`, `remove`; [DocumentsModule](../../carbonlite-api/src/documents/documents.module.ts) local Multer configuration.
- **S2:** [JWT guard](../../carbonlite-api/src/auth/jwt-auth.guard.ts) `enforcePilotReviewerReadOnly`; [AuthService](../../carbonlite-api/src/auth/auth.service.ts) `register`, `validateJwtPayload`, `logout`; [contribution permissions](../../carbonlite-api/src/common/permissions/activity-data-permissions.ts) `assertCanContributeActivityData`; [ActivityDataController](../../carbonlite-api/src/activity-data/activity-data.controller.ts) mutation handlers; [MetricsController](../../carbonlite-api/src/metrics/metrics.controller.ts) `calculate`; [factor controller](../../carbonlite-api/src/conversion-factors/conversion-factors.controller.ts) mutations.
- **S3:** [DocumentExtractionService](../../carbonlite-api/src/document-extraction/document-extraction.service.ts) `extract`, `validateSupportedFile`, `extractStructuredJsonDocument`, `filterOperationalActivityRows`, `saveExtractionResult`.
- **S4:** [ExcelInputTable](../src/components/ExcelInputTable.tsx) `importExcelFile`, `findMatchingFactor`, `buildSpreadsheetReviewRowPayload`; [SpreadsheetImportService](../../carbonlite-api/src/spreadsheet-import/spreadsheet-import.service.ts) `saveReviewRows`, `buildIdempotencyKey`.
- **S5:** [UploadPage](../src/pages/UploadPage.tsx) `classifyDraftRow`, `handleDeleteDocument`, `confirmDocumentImportWithRecordFallback`, `buildDocumentImportRecordKey`; [confirmation service](../../carbonlite-api/src/document-extraction/document-extraction.service.ts) `confirmImport`, `mergeImportActivities`, `buildImportActivityRecordKey`.
- **S6:** [ActivityDataService](../../carbonlite-api/src/activity-data/activity-data.service.ts) `create`, `update`, `bulkUpdateProvince`, `bulkUpdateFacility`, `bulkDelete`; [quantity DTO](../../carbonlite-api/src/activity-data/dto/create-activity-data.dto.ts).
- **S7:** [CalculationSnapshotsService](../../carbonlite-api/src/metrics/calculation-snapshots.service.ts) `prepareCreate`, `fields`, `recalculate`; [snapshot projector](../../carbonlite-api/src/metrics/calculation-snapshot.ts) `persistedCalculationDetail`, `scopeForActivity`.
- **S8:** [CalculationQualityService](../../carbonlite-api/src/metrics/calculation-quality.service.ts) `buildSummary`, `evaluate`, `matchFactor`, `resolveActivityJurisdiction`, `unitConversionMultiplier`, `round`; [MetricsService](../../carbonlite-api/src/metrics/metrics.service.ts) `calculate`, `getSummary`.
- **S9:** [API governance](../../carbonlite-api/src/conversion-factors/factor-governance.ts) `isInventoryFactorEligible`, `snapshotFactorProvenance`; [frontend governance](../src/utils/factorGovernance.ts); [frontend matcher](../src/utils/conversionFactorMatching.ts) `findBestConversionFactorMatch`, `findBestUnitConversionMatch`; [API factor service](../../carbonlite-api/src/conversion-factors/conversion-factors.service.ts) `getApplicableFactor`; [older metric matcher](../../carbonlite-api/src/metrics/metrics.utils.ts) `matchBestFactor`.
- **S10:** [metrics overview](../src/services/metricsOverview.ts) `loadMetricsOverview`; [report hook](../src/reports/hooks/useReportData.ts) `useReportData`; [canonical builder](../src/reports/domain/buildCanonicalReportData.ts) `buildCanonicalReportData`; [report totals](../src/reports/domain/buildReportTotals.ts).
- **S11:** [report exports](../src/reports/hooks/useReportExports.ts) `useReportExports`, `recordPdfExport`; [metadata](../src/reports/domain/buildReportMetadata.ts) `buildReportDocumentControlMetadata`; [factor validation](../src/reports/domain/buildFactorReviewSummary.ts); [backend reports](../../carbonlite-api/src/reports/reports.service.ts) CRUD.
- **S12:** [OrganizationsService](../../carbonlite-api/src/organizations/organizations.service.ts) `updateOrganizationProfile`, `boundaryFingerprint`; [OrganizationProfilePage](../src/pages/OrganizationProfilePage.tsx) `handleReviewBoundary`; [workflow stages](../src/constants/carbonliteWorkflow.ts).
- **S13:** [AuditLogService](../../carbonlite-api/src/audit-log/audit-log.service.ts) `log`; [schema](../../carbonlite-api/prisma/schema.prisma) `ActivityData`, `SpreadsheetImportReviewRow`, `DocumentExtraction`, `Report`, `AuditLog`.
- **S14:** [OpenAI client](../../carbonlite-api/src/openai/openai.client.ts); [API dependencies](../../carbonlite-api/package.json); [web dependencies](../package.json); [Sentry initialization](../../carbonlite-api/src/sentry.ts).

### Ten prioritized business-rule gaps

“Before paid pilot” is a proposed acceptance gate, not a statement that a technical fix is already implemented. Conditional gates require an explicit scope restriction or operated control before taking payment; broader automation can follow.

| Priority / gap | Conflict or missing decision | Before first paid pilot? | Minimum resolution and responsible actor |
|---|---|---|---|
| 1 — G-01 Authorization | Customer viewer/reviewer restrictions are not consistently enforced for activity edit/delete, source deletion, factor writes and recalculation. Special PILOT_REVIEWER protection does not cover all customer roles. BR-002/022; S2. | **MUST** | Architect/operator: approve and enforce one server action matrix; verify denial for every paid-pilot read-only role. |
| 2 — G-02 Destructive source removal | UI promises to preserve imported records; API deletes them and their metrics. Physical-file retention is a separate issue. BR-021/023; S1/S5. | **MUST** | Product owner: choose removal vs inventory deletion semantics; align behavior and confirmation before exposing source deletion to customers. |
| 3 — G-03 Edit/snapshot validity | Bulk province marks pending but retains a snapshot accepted by historical reads. Single updates always rematch, even notes-only edits. BR-010/011/024; S6/S7. | **MUST** | Architect: define material fields and one invalidation/recalculation rule; prevent stale jurisdiction totals and unrequested metadata-driven rematching. |
| 4 — G-04 Matching authority | Preview/applicable-factor/calculation disagree on years, defaults and conversions; nearest-year can use future factors and some fallback branches omit country checks. BR-012/014/025; S8/S9. | **MUST** | Curator/architect: approve one precedence, country and year policy; align preview with server decisions, or explicitly restrict the pilot to an approved factor/input set. |
| 5 — G-05 CO2e and methodology coverage | Null legacy governance remains eligible; a CO2e label does not prove gas/GWP coverage, HHV basis or methodological fit. BR-013/025; S9. | **MUST** | Qualified methodology reviewer: approve the pilot factor allowlist, gas coverage and limitations. Keep components/restricted methods excluded; no new component engine is assumed. |
| 6 — G-06 Import identity | Browser keys include sheets; backend confirmed-row keys do not. Read-before-create dedupe lacks an ActivityData source-row uniqueness guarantee; copies/reuploads can repeat consumption. BR-003/007/026; S5/S13. | **MUST** | Architect/data owner: settle document/sheet/row identity and atomic retry behavior; define cross-file duplicate review. Limit input/concurrency until guaranteed. |
| 7 — G-07 Source completeness and retention | Normal Excel path reads first sheet and saves rows without original bytes/hash; extraction reruns replace current extraction evidence. BR-005/026; S3/S4. | **MUST establish evidence policy** | Data owner/operator: disclose sheet support, reconcile expected rows/sheets and retain original source plus reviewed mapping; manual archiving can bound the first pilot. |
| 8 — G-08 Unit/conversion contract | Frontend conversion utility is not the backend conversion authority; gas volume/energy conversion is absent and output-unit scaling to kg is not established. BR-015/025; S8/S9. | **MUST bound supported units** | Curator: approve native factor/input/result units and MWh/kWh handling; block unsupported conversions. Catalogue expansion can follow the pilot. |
| 9 — G-09 Accepted report evidence | Boundary review is not report approval; browser export audits may fail, and report CRUD does not preserve the delivered calculation/artifact bundle. BR-018/020/027; S11–S13. | **MUST define delivery/acceptance** | Reviewer/operator: archive artifact, selected snapshot versions and boundary/template versions with acceptance record; automated approval/signature workflow may follow. |
| 10 — G-10 Commercial/processing obligations | No implemented billing/entitlement model establishes price, scope, upload/extraction limits, AI processing expectations, support or recovery duties. BR-028; S1/S3/S14. | **MUST agree before payment** | Business owner/operator: document pilot terms and operated limits, supported formats/provider failure fallback, local-file backup/restore and data-processing/retention arrangements. Automated billing can follow. |
