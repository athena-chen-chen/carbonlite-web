# CarbonLite P0 factor-selection remediation — 2026-10-25

> Historical implementation-phase evidence: the red-suite results below describe the initial P0 change before test reconciliation. Final green regression results, release-file classification, and freeze validation are recorded in [the reconciliation note](factor-selection-regression-reconciliation-2026-10-25.md). This note does not establish paid-pilot reporting readiness.

Application-policy changes only. No database connection, seed, migration, factor-value update, provenance update, status promotion, commit, push, tag or deployment was performed. This is **not paid-pilot reporting approval**. Full test suites are not green; the failures below are retained as evidence rather than changing numerical expectations.

## Root cause

The canonical backend admitted active system electricity DEMO versions through `isPilotElectricitySystemFactor`, irrespective of the organization's demo flag. Legacy system/default and verified tenant branches did not consistently exclude test-only provenance. JSON preview discarded the governance/source metadata needed to distinguish demo factors. Frontend direct, conversion-assisted and compatible-unit matching did not apply workspace demo policy. A saved READY draft could also bypass current factor evaluation and retain an old emissions value after becoming MISSING_FACTOR.

## Runtime paths traced before editing

| Entry point | Exact files / functions | Enforcement after this change |
| --- | --- | --- |
| Raw document extraction | API `src/document-extraction/document-extraction.service.ts`: `extract`, extraction normalization; web `src/pages/input-data/hooks/useDraftReview.ts`: `extractDocuments`, `previewDocument` | Extraction remains raw input; review goes through policy-filtered matching. Extraction/AI prompts unchanged. |
| Draft review and same-file re-import | Web `useDraftReview.ts`: `enrichDraftRowsWithCalculationStatus`, `loadSavedSpreadsheetReview`, `buildSpreadsheetDraftRowsFromSavedReviewRows`, row reevaluation; `src/pages/input-data/domain/documentImportPayload.ts`: `buildDocumentImportActivityPayload`, `applyConfirmReviewPayload` | Current and nested metadata checked; rejected saved matches are reevaluated and their stale draft emissions cleared. Local sample review requires explicit demo opt-in. |
| Excel/manual review | Web `src/components/ExcelInputTable.tsx`: factor lookup and canonical evaluation; `src/utils/canonicalRecordEvaluation.ts`: `evaluateActivityRecord` | Shared matcher applies policy to direct matches and unit conversions. No numerical factor constants changed. |
| Record display/local evaluation | Web `src/pages/ActivityDataPage.tsx`: matching/recalculation helpers | Existing callers use the policy-filtered shared matcher. Stored historical projection semantics unchanged. |
| Frontend factor catalog | Web `src/services/conversionFactors.ts`: `getConversionFactors`, `getAllConversionFactors`, local pilot/reference augmentation | Catalog still exposes factors for inspection; runtime selection rejects known test-only entries. Listing a factor does not authorize calculation. |
| Confirm, staged and unstaged | API `DocumentExtractionService.confirmImport` → `CalculationSnapshotsService.fields` / `prepareCreate` | Existing complete server-prepared eligibility tuple unchanged. Spoofed READY/client factor IDs/emissions cannot resurrect excluded candidates. No edit to document-extraction implementation in this task. |
| Direct create, bulk import, updates | API `src/activity-data/activity-data.service.ts`: `create`, `bulkImport`, `update` → snapshots | Server preparation strips client-derived calculations and applies the policy before matching. Manual records may still save as MISSING_FACTOR, per existing policy. |
| Explicit recalculation and carbon metrics | API `src/metrics/metrics.service.ts`: `calculate` → snapshots `recalculate` → `CalculationQualityService.evaluate` / `matchFactor` | Current result becomes non-calculable when only excluded candidates remain. Existing audit retains the prior calculation. |
| Alternate lookup | API `src/conversion-factors/conversion-factors.service.ts`: `getApplicableFactor` | Loads persisted organization policy. Caller flags may narrow authorized demo use but cannot enable demo mode for a normal organization. Both registries filtered. |
| JSON import preview | API `ActivityDataService.previewJsonImport`; `src/activity-data/json-activity-records.ts`: `toJsonPreviewFactorCandidates`, `buildJsonActivityPreview`, `findBestJsonPreviewFactorMatch` | Keeps full factor/source metadata and supplies stored organization policy before filtering candidates. |
| Other metric selector | API `src/metrics/metrics.utils.ts`: `matchBestFactor`; `MetricsService.calculate` non-carbon branch | Workspace/tenant policy applied before ranking; persisted organization demo flag passed for authorized demo behavior. Carbon path still uses snapshots. |
| Report reads | API `CalculationQualityService.buildSummary` with `persistedOnly`; web `src/services/metricsOverview.ts` and report builders | No historical rematching or snapshot rewriting added. Optional legacy matching helpers inherit the same frontend matcher filter. |
| Factor/FactorVersion, legacy overrides | API `CalculationQualityService.matchFactor`, alternate lookup, JSON adapter; web `src/utils/conversionFactorMatching.ts` | Policy precedes organization overrides, status/confidence/year ranking, system defaults and fallbacks. Cross-tenant ownership cannot be overridden by a system flag. |

## Canonical exclusion policy

`isFactorAllowedForWorkspace(factor, policy)` is a pure policy in:

- API: `src/conversion-factors/factor-calculation-policy.ts`
- Web: `src/utils/factorCalculationPolicy.ts`

These separately deployed repositories have byte-identical policy modules, verified during validation, plus equivalent contract vectors. No shared-package/monorepo redesign was introduced. Existing `isInventoryFactorEligible` remains responsible for corporate applicability, gas-component and sector restrictions; the new workspace predicate is an additional gate, not a replacement.

1. Tenant ownership is checked first, including nested factor/source metadata. A foreign owner is rejected even if `isSystemDefault=true` or demo use is enabled.
2. Missing/null/false demo authorization is normal customer mode. Known non-customer factors are rejected before all ranking/fallback branches.
3. Explicit true preserves intended demo selection, subject to tenant isolation and the existing applicability/province/unit/year/status rules. It does not authorize component or offset factors for corporate inventory.
4. Verified/official labels do not override contradictory synthetic/demo markers.
5. Legitimate organization-owned and official factors remain eligible. Ownership, DRAFT, verified=false, a generic reviewed engineering estimate, or the isolated word “test” is not itself a test-only classification.

Structured exclusions cover `isDemo`, `isSynthetic`, `isTestOnly`, `isPilotEstimate`, `isPlaceholder`, and label tokens in status, factorStatus, factorSet, factorType, confidence/confidenceLevel and verificationStatus. Labels include DEMO, SYNTHETIC, TEST_ONLY, FIXTURE, MANUAL_TEST, RC_TEST, PILOT_ESTIMATE, GENERIC_ESTIMATE, PILOT_DEFAULT and PLACEHOLDER, including compound/punctuated forms. Applicable methodology-provenance markers and linked source/factor metadata are checked too. Frontend nested `currentActiveVersion` / `version` metadata is checked independently.

### Isolated legacy compatibility

`hasLegacyTestFactorMarkers` handles the incomplete legacy data without changing it. It recognizes known CarbonLite System Defaults authority/source names and the exact old/current v1.0 default-library titles. Narrow textual markers identify synthetic/demo/fixture, manual-test/test-only/test-factor, RC fixture/history/test and explicit pilot testing/validation/estimate or demonstration-only descriptions. Generic “estimate” and “test” are not broad rejection keywords. The exact existing seed owner `demo-org-id` is also recognized; arbitrary organization IDs containing “demo” are not.

The ECCC-attributed 49.44/GJ approximate reference is not silently reclassified as a demo fixture. Its methodology/HHV/GWP limitations remain unresolved and require the later governance/value review.

### Trusted policy context

The backend evaluates snapshots using the organization's persisted flag. Alternate lookup and JSON preview explicitly read that flag. `/auth` safe-user responses now expose the boolean for frontend preview; a missing client flag fails closed. Frontend matcher inputs may explicitly supply policy for pure evaluation/tests, otherwise they use the authenticated organization's flag. Client policy is informational, never server authorization. Frontend/backend changes should be reviewed and released together to preserve authorized demo previews.

## Validation

All test persistence is mocked. No database-backed e2e, RC registration/upload/import scripts, migrations or seeds were run because those would write data. Builds write generated artifacts only.

| Check | Result |
| --- | --- |
| Focused backend policy/service integration + Confirm eligibility + current state + JSON + governance | **90 passed across 5 suites**, including 27 new P0 tests. Real service methods use in-memory Prisma mocks. |
| Focused frontend policy + review lookup/re-import + province + review/race | **98 passed across 5 files**. Includes demo=false/true deletion and same-file re-import, own-tenant synthetic rejection, stale saved READY draft, nested-version/unit suggestions and local sample gating. |
| Full backend unit/mocked HTTP suite | **527 passed, 27 failed; 38 suites passed, 3 failed; 554 tests total.** Final run used `--runInBand --testTimeout=15000`; HTTP test port binding required sandbox permission. |
| Full frontend suite | **1,414 passed, 53 failed; 104 files passed, 4 failed; 1,467 Vitest tests total**, plus **2 Node tests passed**. `pnpm test --maxWorkers=2`. |
| Backend TypeScript and Nest build | PASS. |
| Frontend TypeScript and Vite production build | PASS. Build retains Browserslist-age/chunk-size warnings. |
| Diff whitespace / policy-module parity | PASS. |
| Database/factor files, existing backend refactor, audit/stray document preservation | PASS; existing hashes/diffs checked. |

### Failure classification retained without changing golden assertions

Backend failures:

- `src/metrics/calculation-quality.service.spec.ts`: **17**. Existing helper factors carry DEMO/placeholder provenance or known default-library labels while demo is disabled; old assertions expect selection.
- `src/metrics/calculation-snapshots.service.spec.ts`: **7**. Setup explicitly calls its factor “Synthetic corporate factor” / “Synthetic authority” with demo=false. Old expected snapshots/results cannot be newly calculated under the required policy.
- `src/conversion-factors/conversion-factors.service.spec.ts`: **3**. Legacy and supposedly official fixtures retain CarbonLite demo-library source metadata. Only organization-read mocks were added; no numeric assertion or factor fixture was relabelled.

Frontend failures:

- `src/components/ExcelInputTable.test.tsx`: **40**. Shared fixtures use “Demo / Placeholder” and default/pilot factors without an explicit workspace opt-in; dependent UI/save assertions no longer reach their old calculated state.
- `src/utils/conversionFactorMatching.test.ts`: **7**. Diagnostic placeholder/default and pilot-estimate cases expect eligibility with no demo opt-in.
- `src/pages/UploadPage.test.ts`: **5**. Golden document electricity expectations use the old demo-factor dependency.
- `src/utils/canonicalRecordEvaluation.test.ts`: **1**. The golden imported-record eligibility case depends on demo factors.

The full suite is therefore **FAIL**, not a clean release gate. No numerical expectations were weakened, no fixture source was disguised as official and no demo gate was reopened merely to make tests pass. Earlier test attempts also hit sandbox local-port restrictions, a load-sensitive 5-second HTTP boundary timeout and the previously observed report-scope timing flake; final counts above exclude those environmental/mock issues after correction/rerun. The 10,000/10,001-row HTTP boundary passes in the final run.

### Golden baseline boundaries

Existing historical report fixtures retain **Golden A 579.40**, **Golden C 2428.44**, **combined arithmetic 3007.84 kgCO2e**; a new regression asserts those unchanged reference values using the existing report fixtures. Existing report/PDF regressions remain green. This is historical fixture/report validation, not a newly run live database import or a claim that those factors are safe for normal current calculations. Live Golden A/C/Combined HTTP/database workflows were **NOT RUN** because they write data. Fresh normal-workspace matching that relied on demo data now blocks; its old calculation-eligibility golden assertions are among the failures above.

### Captured catalog replay (no database connection)

The complete read-only catalog captured by the preceding audit at `2026-10-25T07:36:37.260Z` was evaluated in memory with the new backend code. Of its 13 legacy system defaults, only `eccc-natural-gas-canada-generic-gj-2025` remains workspace-eligible for an unrelated normal organization. All 34 DRAFT/DEMO versions are rejected. All 10 known demo/synthetic organization-scoped rows are rejected in their own tenants when demo=false. Tenant visibility remains independently enforced.

For the six-row 2026-09-30 pilot example:

| Organization policy | Electricity | Natural gas | Gasoline | Water | Hotel | Diesel240kg | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| false | MISSING_FACTOR |420.24|MISSING_FACTOR|TRACKED_ONLY|MISSING_FACTOR|Blocked|420.24; partial/unreviewed, not report approval |
| true |519.4|420.24|808.5|TRACKED_ONLY|60|Blocked|1808.14 demo baseline retained |

The policy does not change the diesel quantity/unit behavior or infer a density. Province requirements, factor-year/effective-date selection logic, the MATCHED+CALCULATED+INCLUDED Confirm rule, tracked-only accounting, source deletion preservation, persisted snapshot/read behavior, report request identity and F17/F18/F19 were not redesigned.

## Files changed by this task

Frontend repository:

- `src/utils/factorCalculationPolicy.ts` (new pure policy)
- `src/utils/factorCalculationPolicy.test.ts` (new contract/baseline tests)
- `src/utils/conversionFactorMatching.ts`
- `src/utils/canonicalRecordEvaluation.ts`
- `src/services/auth.ts`
- `src/pages/input-data/hooks/useDraftReview.ts`
- `src/pages/input-data/hooks/useDraftReview.lookup.test.ts` (new tests only; existing assertions unchanged)
- `src/pages/input-data/domain/documentImportPayload.ts`
- `docs/audits/factor-selection-p0-remediation-2026-10-25.md` (this note)

Backend repository (`/Users/shuangchen/carbonlite-api`):

- `src/conversion-factors/factor-calculation-policy.ts` (new identical policy)
- `src/conversion-factors/factor-selection-p0.spec.ts` (new contract/in-memory integration tests)
- `src/conversion-factors/conversion-factors.service.ts`
- `src/conversion-factors/conversion-factors.service.spec.ts` (two organization-read mock additions only)
- `src/metrics/calculation-quality.service.ts`
- `src/metrics/metrics.utils.ts`
- `src/metrics/metrics.service.ts`
- `src/activity-data/activity-data.service.ts`
- `src/activity-data/json-activity-records.ts`
- `src/auth/auth.service.ts`

Pre-existing changes are **not part of this remediation**: backend `src/document-extraction/document-extraction.service.ts` and `src/domain/activity-records/documentImportEligibility{,.spec}.ts`; frontend untracked `docs/audits/carbonlite-factor-library-audit-2026-10-25.md` and `docs/structural-refactor-assessment-2026-10-24.md`. Their contents/diffs were verified unchanged.

## Remaining risks and next boundary

No selection bypass was found in the covered paths for the known structured/legacy markers, including verified own-tenant synthetic rows. Classification cannot detect deliberately unlabelled/mislabelled test data; unknown source truth is still a factor-governance problem. Missing metadata is not a scientific approval. Existing persisted demo calculations are intentionally preserved, so current/historical reports still need separate review before customer reliance; no F18/history rewrite was undertaken.

P0 methodology/value/provenance issues in the factor-library audit remain unresolved. P1 natural-gas quantity/GWP/sector limitations and activity-context gaps remain unresolved. The full regression gate remains red due to the recorded demo dependencies. Later test cleanup must explicitly distinguish authorized demo scenarios from normal-workspace expectations, without changing golden numerical references to conceal the dependency.

**Safe to proceed to methodology/factor-value remediation: YES as a separate authorized work item. Safe to release as a fully validated reporting product: NO.** No factor correction, paid-reporting readiness claim or deployment is included here.
