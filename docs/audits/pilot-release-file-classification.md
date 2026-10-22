# Pilot release file classification

Date: 2026-10-22 (America/Edmonton). Inventory captured before this task added release preparation files. Both source trees matched the saved manifests byte for byte, with no added tracked/untracked files. No discard, reset, clean, stage, commit, or tag was performed.

Categories: A required reviewed product change; B test/audit documentation (including test scripts and synthetic fixtures); C generated/build/temp artifact; D local environment/configuration (only reviewed example/ignore files proposed); E secret/sensitive file; F unrelated work.

Every pre-existing dirty file below is proposed for the matching repository release commit. C/E/F: none found among this captured dirty-file inventory. This does not classify ignored runtime files as safe to commit. Real .env files, uploads, dependencies, build output, private session state, /tmp evidence, and backup archives stay excluded. Example environment files contain placeholders and require actual secret-manager configuration externally.

## web

178 files: A=76, B=101, C=0, D=1, E=0, F=0.

| Git state | File | Category | Commit | Reason |
|---|---|---|---|---|
| ` M` | `.gitignore` | D | INCLUDE | Reviewed example configuration or ignore rules; no runtime credentials. |
| ` M` | `README.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/README.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/tests/carbonlite-workflow.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/tests/field-mapping-report.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/tests/partial-document-scope.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/tests/pilot-demo-smoke.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/tests/production-pilot-reviewer-smoke.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/tests/real-api/app-smoke.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/tests/real-api/field-mapping-import-regression.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/tests/real-api/pilot-rc-combined-report.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/tests/real-api/pilot-rc-end-to-end.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `apps/web-e2e/tests/regression-smoke.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/audits/alberta-emission-factor-audit.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/audits/p1-facility-optional-cost-lineage.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/audits/p1-p2-report-semantic-cleanup.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/audits/report-correctness-traceability-cleanup.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/audits/task6-pdf-renderer-extraction.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/audits/task7-methodology-applicability-provenance.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/business-model.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/factor-governance-hardening-audit.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/metrics-data-quality-qa.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/pilot-acceptance-script.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/pilot-demo-v0.1.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/pilot-release-runbook.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/pilot-reviewer-invite-backend-contract.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `docs/production-safety-checklist.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `scripts/e2e/seed-test-db.mjs` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/auth/PilotReviewerPermissions.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/components/AppNav.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/components/AppNav.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/components/DocumentScopeContext.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/components/ExcelInputTable.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/components/ExcelInputTable.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/components/FormalReportPreview.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/components/FormalReportPreview.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/components/MetricsSummarySection.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/components/PageHeader.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/components/reports/sections/CalculationQualitySection.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/components/reports/sections/CalculationTraceabilitySection.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/components/reports/sections/ExecutiveSummarySection.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/components/reports/sections/RecordsRequiringReviewSection.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/components/reports/sections/ScopeBreakdownSection.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/components/reports/sections/SourceEvidenceSection.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/constants/userWorkflow.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/AboutPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/ActivityDataPage.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/pages/ActivityDataPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/AuditLogPage.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/pages/AuditLogPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/ConversionFactorsPage.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/pages/ConversionFactorsPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/Dashboard.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/DataCollectionGuidePage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/FactorDetailsPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/LandingPage.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/pages/LandingPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/LoginPage.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/pages/MetricsSummaryPage.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/pages/MetricsSummaryPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/OrganizationProfilePage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/PaidPilotScopePage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/PilotReviewInstructionsPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/PilotReviewersPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/ReportingPage.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/pages/ReportingPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/UploadPage.sample.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/pages/UploadPage.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/pages/UploadPage.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/pages/index.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/components/ReportPresentationSections.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/reports/components/ReportPresentationSections.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/domain/buildSourceReviewSummary.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/domain/reportBuilders.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/reports/domain/reportSemantics.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/reports/hooks/useReportData.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/hooks/useReportExports.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/reports/hooks/useReportExports.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/pdf/__tests__/pdfRenderers.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/reports/pdf/executiveSummaryPdf.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/pdf/pdfFormatters.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/pdf/pdfSections.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/pdf/pdfShared.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/pdf/technicalReviewPdf.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/services/activityData.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/services/conversionFactors.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/services/conversionFactors.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/services/documents.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/services/documents.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/services/metricsOverview.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/services/metricsOverview.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/utils/conversionFactorMatching.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/utils/dataRecordsCsvExport.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/utils/factorCredibility.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/utils/factorGovernance.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/utils/factorProvenanceDisplay.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/utils/reportCredibility.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/utils/reportCsvExport.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/utils/reportCsvExport.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/utils/reportReviewPackageCsvExport.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/utils/reportReviewPackageCsvExport.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/utils/reportingReadiness.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/utils/reportingReadiness.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/utils/terminology.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/utils/terminology.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/utils/unitNormalization.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/utils/userFriendlyErrors.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `apps/web-e2e/tests/event-log-date-ranges.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `apps/web-e2e/tests/manual-calculation-preview.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/calculation-results-label.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/document-scoped-five-step-flow.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/event-log-date-range-filter.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/f08-upload-extraction-resource-limits.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/f09-truthful-mutation-outcomes.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/f14-document-pagination.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/f15-csv-formula-injection.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/f20-concurrency-investigation.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/f22-xlsx-date-systems.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/field-mapping-gasoline-recheck-evidence.json` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/field-mapping-gasoline-regression-recheck.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/internal-factor-library-rename.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/manual-input-save-confirmation.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/report-terminology-clarity.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/uploadpage-domain-helper-extraction.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `scripts/regression/xlsx-date-parity.mjs` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/components/ExcelInputTable.dates.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/components/manual-entry/ManualEntryConfirmation.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/UploadPage.pagination.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/UploadPage.styles.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/BulkProvinceHelper.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/DeleteDocumentDialog.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/DetectedSourceItemsPanel.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/DocumentActionMenu.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/DocumentDetailsDialog.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/DocumentOverlays.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/components/DocumentTable.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/components/DocumentTable.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/DocumentUploadPanel.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/DraftRecordsReview.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/DraftRecordsTable.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/components/DraftRecordsTable.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/DraftReviewControls.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/components/DraftReviewHeader.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/ImportValidationSummary.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/InputMethodPanels.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/components/InputMethodTabs.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/ManualEntryPanel.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/ReviewDataSection.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/components/ReviewDataSection.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/components/SpreadsheetImportPanel.tsx` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/domain/documentActions.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/domain/documentImportPayload.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/domain/draftRowClassification.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/domain/extractionNormalization.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/domain/importAudit.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/domain/importAudit.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/domain/importIdentity.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/hooks/useDocumentUpload.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/hooks/useDocumentUpload.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/hooks/useDocuments.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/hooks/useDocuments.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/hooks/useDraftReview.lookup.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/hooks/useDraftReview.race.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/hooks/useDraftReview.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/pages/input-data/hooks/useDraftReview.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/pages/input-data/inputData.types.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/reports/hooks/useReportData.test.tsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/services/auditLogs.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/services/documents.pagination.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/utils/csv.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/utils/csv.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/utils/csvFormulaInjection.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/utils/eventLogDateRange.test.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/utils/eventLogDateRange.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `test-fixtures/xlsx-date-systems/dates-1900.xlsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test-fixtures/xlsx-date-systems/dates-1904.xlsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test-fixtures/xlsx-date-systems/expected.json` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test-fixtures/xlsx-date-systems/generate.mjs` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
## api

109 files: A=53, B=54, C=0, D=2, E=0, F=0.

| Git state | File | Category | Commit | Reason |
|---|---|---|---|---|
| ` M` | `.env.example` | D | INCLUDE | Reviewed example configuration or ignore rules; no runtime credentials. |
| ` M` | `.env.local.example` | D | INCLUDE | Reviewed example configuration or ignore rules; no runtime credentials. |
| ` M` | `README.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `prisma/seed.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/activity-data/activity-data.controller.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/activity-data/activity-data.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/activity-data/activity-data.service.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/activity-data/activity-data.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/activity-data/admin-activity-records.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/activity-tracking/activity-tracking.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/activity-tracking/activity-tracking.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/activity-tracking/workflow-audit.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/audit-log/audit-log.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/auth/auth.module.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/auth/auth.service.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/auth/auth.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/auth/guards/roles.guard.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/auth/jwt.strategy.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/common/filters/global-exception.filter.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/common/monitoring/capture-app-error.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/conversion-factors/conversion-factors.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/conversion-factors/conversion-factors.service.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/conversion-factors/conversion-factors.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/conversion-factors/factor-sources.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/conversion-factors/factor-sources.service.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/conversion-factors/factor-sources.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/conversion-factors/factor-versions.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/conversion-factors/factors.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/document-extraction/document-extraction.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/document-extraction/document-extraction.lineage.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/document-extraction/document-extraction.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/document-extraction/dto/confirm-extraction.dto.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/document-extraction/spreadsheet-activity-rows.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/document-extraction/spreadsheet-activity-rows.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/documents/documents.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/documents/documents.module.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/documents/documents.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/facilities/facilities.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/feedback/feedback.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/feedback/feedback.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/health.controller.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/health.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/main.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/metrics/calculation-quality.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/metrics/calculation-snapshot.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/metrics/calculation-snapshots.service.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/metrics/calculation-snapshots.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/metrics/manual-source-provenance.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/metrics/metrics.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/metrics/metrics.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/organizations/organizations.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/organizations/organizations.service.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `src/organizations/organizations.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/reports.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/reports/reports.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/sample-data/golden-sample-data.service.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/sentry.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `src/spreadsheet-import/spreadsheet-import.controller.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| ` M` | `test/audit-log.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `test/document-extraction-retry.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `test/documents-delete.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `test/duplicate-protection.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `test/helpers/e2e-app.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| ` M` | `test/targeted-sentry.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/f16-error-logging-redaction.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `docs/audits/f21-document-confirmation-dto.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `prisma/migrations/20261018010000_rename_internal_factor_library/migration.sql` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `scripts/test-default-factor-library-rename.mjs` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/activity-tracking/optional-activity.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/auth/guards/platform-admin.guard.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/auth/guards/workspace-mutation.guard.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/auth/jwt-config.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/auth/jwt-config.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/common/filters/global-exception.filter.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/common/logging/safe-log.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/common/logging/safe-log.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/common/logging/sentry-event.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/common/logging/sentry-event.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/common/permissions/workspace-permissions.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/common/permissions/workspace-permissions.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/document-extraction/document-confirm-boundary.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/document-extraction/document-confirm-eligibility.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/document-extraction/document-extraction.logging.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/document-extraction/dto/confirm-extraction.dto.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/document-extraction/extraction-workload.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/document-extraction/extraction-workload.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/document-extraction/spreadsheet-date-systems.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/document-extraction/spreadsheet-resource-limits.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/documents/document-resource-policy.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `src/documents/document-resource-policy.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/documents/document-upload-storage.ts` | A | INCLUDE | Reviewed runtime source, reference seed, or required forward migration. |
| `??` | `src/metrics/calculation-current-state.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/authorization-boundaries.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/calculation-current-state.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/document-confirm-concurrency.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/document-confirm-eligibility.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/document-confirm-validation.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/document-resource-limits.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/fixtures/xlsx-date-systems/README.md` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/fixtures/xlsx-date-systems/dates-1900.xlsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/fixtures/xlsx-date-systems/dates-1904.xlsx` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/fixtures/xlsx-date-systems/expected.json` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/helpers/database-safety.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/helpers/database-safety.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/helpers/e2e-app.spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/jest-safety.json` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/logging-redaction.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/mutation-outcomes.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |
| `??` | `test/spreadsheet-date-systems.e2e-spec.ts` | B | INCLUDE | Reviewed regression fixture, test tooling, or audit/operator documentation. |

## Files introduced by this closure task

All are frontend-repository operational documentation/tooling, category B. No backend repository files are added. These additions intentionally change the whole-tree fingerprint; they do not alter the frozen product source.

| File | Category | Commit |
|---|---|---|
| `docs/audits/pilot-release-file-classification.md` | B | INCLUDE |
| `docs/releases/v0.1-pilot-release-manifest.md` | B | INCLUDE |
| `docs/releases/v0.1-pilot-deployment-checklist.md` | B | INCLUDE |
| `docs/releases/v0.1-pilot-backup-recovery-runbook.md` | B | INCLUDE |
| `docs/releases/v0.1-pilot-commit-plan.md` | B | INCLUDE |
| `docs/releases/v0.1-pilot-smoke-test.md` | B | INCLUDE |
| `docs/releases/v0.1-pilot-validation.json` | B | INCLUDE |
| `scripts/releases/_verified-pilot-readonly.sql` | B | INCLUDE |
| `scripts/releases/verify-pilot-factors.sql` | B | INCLUDE |
| `scripts/releases/verify-platform-admins.sql` | B | INCLUDE |
