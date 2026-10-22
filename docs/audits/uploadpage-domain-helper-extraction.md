# UploadPage Phase 2 — domain helper extraction

2026-10-20 (America/Edmonton).

Before UploadPage line count: **6,427**. After: **5,172** (1,255 fewer lines).

## Scope and audit

Moved 61 pure helpers into six focused modules under `src/pages/input-data/domain/`. Shared type module created: **YES**, `src/pages/input-data/inputData.types.ts` (11 shared types). The two module-specific types, `ExtractedSourceItemClassification` and `DocumentActionModel`, stay with their owning helpers. Moved three required constants intact: `SPREADSHEET_UPLOAD_EXTENSIONS`, `UNSUPPORTED_ACTIVITY_TYPE_MESSAGE`, and `FILE_MISSING_TOOLTIP`.

- **draftRowClassification (14)**: `isMissingImportValue`, `normalizeClassificationSignal`, `hasTrackedMetricSignal`, `getExplicitReviewStatus`, `hasReviewBlockingCalculationSignal`, `isCanonicalReadyReviewRow`, `getCanonicalReviewStatusFromPayload`, `classifyDraftRow`, `isImportableDraftRowClassification`, `hasBlockingImportStatus`, `hasTrackedMetricImportStatus`, `hasBlockingImportValueIssue`, `isDocumentImportPayloadImportable`, `getImportValidationIssues`.
- **importIdentity (3)**: `getParsedActivityRowKey`, `buildDocumentImportRecordKey`, `getEditableParsedActivityRecordKeyForAudit`.
- **importAudit (3)**: `buildDraftRowAuditSummary`, `buildConfirmImportAuditSummary`, `getAuditSourceType`.
- **extractionNormalization (34)**: `isRecord`, `extractFieldConfidence`, `formatOptionalExtractionField`, `normalizeOptionalImportString`, `normalizeOptionalImportCost`, `formatSourceReference`, `getSourceFileExtension`, `hasSupportedFileExtension`, `isSpreadsheetFileName`, `isPdfExtractionLabel`, `formatDocumentSourceTypeLabel`, `buildDetectedSourceItems`, `classifyExtractedDocumentSourceItems`, `classifyDetectedDocumentSourceItem`, `buildDetectedDocumentSourceItem`, `getSourceItemLabel`, `getFieldNumber`, `getRawExtractionFieldValue`, `isWastewaterEvidence`, `isWasteServiceEvidence`, `isUtilityFeeEvidence`, `isPhysicalWasteUnit`, `normalizeSourceReferenceForDocument`, `isLikelyMisclassifiedSiteFacilityReference`, `formatDateValue`, `resolveActivityRecordDate`, `getExtractedDocumentDate`, `getAliasedExtractionField`, `normalizePreviewCountry`, `normalizePreviewProvince`, `isKnownCanadianProvince`, `extractProvinceFromAddress`, `normalizePreviewSiteFacility`, `normalizePreviewActivityType`.
- **documentImportPayload (1)**: `buildDocumentImportActivityPayload`.
- **documentActions (6)**: `normalizeDocumentStatus`, `isMissingFileStatus`, `getDocumentStatusLabel`, `hasImportedRecords`, `isImportedDocument`, `getDocumentActionModel`.

Shared types: `DocumentItem`, `EditableConfidenceField`, `EditableParsedActivity`, `EditableDetectedSourceItem`, `DraftRowClassification`, `ImportValidationField`, `ImportValidationIssue`, `RawExtractionField`, `DraftActivityInput`, `DocumentActionKind`, `DocumentActionConfig`.

Telemetry (`trackWorkflowEvent`), permission-message helpers, browser/API/routing helpers, state, effects, handlers, service calls, components, inline styles, and JSX remain in UploadPage. No component or hook extraction was started. Phase 1's style module was not modified.

## Compatibility and dependency checks

Temporary UploadPage re-exports retained: `DraftRowClassification`, `getParsedActivityRowKey`, `buildDocumentImportRecordKey`, `FILE_MISSING_TOOLTIP`, `classifyDraftRow`, `isDocumentImportPayloadImportable`, `buildDraftRowAuditSummary`, `getImportValidationIssues`, `formatSourceReference`, `formatDocumentSourceTypeLabel`, `buildDetectedSourceItems`, `classifyExtractedDocumentSourceItems`, `resolveActivityRecordDate`, `extractProvinceFromAddress`, `buildDocumentImportActivityPayload`, `getDocumentStatusLabel`, `hasImportedRecords`, `getDocumentActionModel`. These include the existing type and tooltip exports. Existing test imports and expectations are unchanged.

Circular dependencies: **NONE**. All 77 moved declarations (61 helpers, 13 types, three constants) were compared against a saved pre-extraction source using the TypeScript AST: text matches exactly except added export modifiers. Every retained non-import statement, including JSX and business logic, matches exactly. New modules import canonical utilities and service types; service imports are type-only. No new module imports UploadPage, React components, routing, queryClient, styles, DOM APIs, or window.

Business behavior changed: **NO**. UI changed: **NO**. Routing changed: **NO**. Backend code changed: **NO**. Database schema/migrations changed: **NO**. Factor values changed: **NO**. Factor matching changed: **NO**. Record identity changed: **NO**. Payload construction still calls the existing `evaluateActivityRecord`.

## Validation results

| Check | Result |
| --- | --- |
| Golden A | **579.40 PASS**, real uploaded needs-review XLSX |
| Golden C | **2428.44 PASS**, real uploaded original Field Mapping binary |
| Two-workbook scope | **3007.84 PASS** |
| Field Mapping same-path | **5/5 PASS**, original and renamed upload filenames |
| Uploaded Gasoline | **350 L × 2.31 = 808.50, Scope 1 PASS**; source row 4 / Operations_2026, CSV source reference, facility, saved snapshot and dedupe checked |
| Partial confirm | **3 → 1 → 0 PASS**, real browser/API with four persisted records |
| Manual Gasoline | **115.50 / Scope 1 PASS**, same UI assertions with role selectors, before and after extraction; separate existing real-API 350 L / 808.50 test also passed |
| Manual Diesel | **268.00 / Scope 1 PASS**, same UI assertions with role selectors, before and after extraction |
| Focused helper/canonical unit tests | **PASS**, 134 tests across four files |
| New direct audit tests | **PASS**, two tests covering reconciliation categories and correction-stable source identity |
| UploadPage/Input Data/service tests | **PASS**, 215 tests across four files |
| Real browser/import regression | **PASS**, all four existing real-API tests passed |
| Document-scope browser regression | **PASS** |
| Frontend typecheck | **PASS**, `pnpm typecheck` |
| Frontend build | **PASS**, `pnpm build`; Browserslist age and bundle-size advisories |

Existing unit coverage includes tracked-only Water, validation blockers, unsupported activity, source metadata, Canada-generic fallback and Natural Gas GJ evaluation. Existing UploadPage tests ran unchanged through the compatibility re-exports. New audit tests import the domain module directly.

The real-API run used the already running localhost API, whose process DATABASE_URL was verified against the guarded Neon development configuration without printing credentials. Four fresh synthetic workspaces were used. All four synthetic accounts were disabled afterward and all captured sessions returned 401; existing accounts were untouched. Synthetic import/evidence records remain. No factors or existing/customer records were edited, and no schema/reset/migration operation ran.

## Existing browser-test limitation

The combined Playwright command returned nonzero: **five passed, one failed**. The failure is the existing `manual-calculation-preview.spec.ts` exact `getByLabel('Activity Type', { exact: true })` selector, which cannot find the nested select label. A temporary diagnostic reproduced the absent exact-label selector and visible role selector on **both** the saved pre-refactor page and the refactored page (two passing diagnostics). A temporary copy using role selectors for Activity Type and Province retained all calculation/save assertions and passed before and after extraction (two passing tests). Repository browser tests and expectations were not changed. This original browser test remains failing; it is not reported as green.

Browser command (credentials are in a private temporary state file, not the command):

`E2E_REAL_API=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 E2E_API_BASE_URL=http://127.0.0.1:3333/api TASK9B_STATE_FILE=/private/tmp/input-data-domain-regression-state.json TASK9_RC_STATE_FILE=/private/tmp/input-data-domain-regression-state.json TASK9_NEEDS_REVIEW_FILE=apps/web-e2e/fixtures/carbonlite_needs_review_test.xlsx pnpm test:e2e apps/web-e2e/tests/real-api/field-mapping-import-regression.spec.ts apps/web-e2e/tests/real-api/pilot-rc-upload-review.spec.ts apps/web-e2e/tests/manual-calculation-preview.spec.ts apps/web-e2e/tests/partial-document-scope.spec.ts`

Existing import-stage traces and screenshots are in `apps/web-e2e/test-results/`. Supplemental baseline evidence and account-retirement results are under `/private/tmp/input-data-domain-browser/`.

## Files changed in Phase 2

- `src/pages/UploadPage.tsx`
- `src/pages/input-data/inputData.types.ts`
- `src/pages/input-data/domain/draftRowClassification.ts`
- `src/pages/input-data/domain/importIdentity.ts`
- `src/pages/input-data/domain/importAudit.ts`
- `src/pages/input-data/domain/extractionNormalization.ts`
- `src/pages/input-data/domain/documentImportPayload.ts`
- `src/pages/input-data/domain/documentActions.ts`
- `src/pages/input-data/domain/importAudit.test.ts`
- `docs/audits/uploadpage-domain-helper-extraction.md`

Known regressions introduced: **NONE identified**. Validation limitation: the pre-existing manual test selector failure above means the combined existing browser command is not fully green.

Future cleanup opportunities (not implemented): repair the existing manual browser test's select locators; retire temporary UploadPage re-exports once callers migrate. No algorithm, component, hook, or UX cleanup was performed.
