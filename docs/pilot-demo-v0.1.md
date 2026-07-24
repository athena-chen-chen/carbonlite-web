# CarbonLite Pilot Demo v0.1

Freeze date: 2026-07-24

## Purpose

CarbonLite Pilot Demo v0.1 is a stable feedback version for structured review with sustainability consultants and SME reviewers.

This version is intended to demonstrate the pilot workflow:

Input Data -> Activity Records -> Factor Matching -> Calculation Review -> PDF / CSV Reports

This is not production-ready, not certification-ready, and not official reporting-ready.

## Freeze Status

Current freeze branch:

- `release/pilot-demo-v0.1`

Current freeze tag:

- `pilot-demo-v0.1`

Initial freeze base commit:

- `373f48b pilot feedback ready`

Final freeze point:

- HEAD of `release/pilot-demo-v0.1`
- Tag `pilot-demo-v0.1`

## Verification Summary

Verification run on 2026-07-24:

| Check | Command | Result |
| --- | --- | --- |
| Pilot-critical unit/component tests | `pnpm exec vitest run src/utils/reportCsvExport.test.ts src/components/FormalReportPreview.test.tsx src/utils/conversionFactorMatching.test.ts src/utils/activityAggregation.test.ts src/pages/UploadPage.test.ts src/pages/ActivityDataPage.test.tsx` | Passed, 6 files / 123 tests |
| Full unit/component suite | `pnpm test` | Passed, 45 files / 423 tests |
| TypeScript | `pnpm exec tsc --noEmit` | Passed |
| Build | `pnpm build` | Passed |
| Lint script | `pnpm lint` | Passed |
| Playwright e2e smoke | `pnpm test:e2e` | Failed, 3 passed / 6 failed |

Notes:

- `pnpm test` passes but prints existing jsdom navigation warnings from unauthorized redirect tests.
- `pnpm build`, `pnpm lint`, and Playwright web server output print the existing Node warning because this machine uses Node `22.8.0`; Vite requests `20.19+` or `22.12+`.
- The Playwright e2e failures appear to be stale smoke selectors or mock/role expectations after pilot-facing copy and role changes. They include old upload/review headings, old report title text, and a custom factor button expectation. Treat browser e2e maintenance as a known release risk before wider demo automation.

## Demo Readiness Confirmation

The following pilot-demo workflows are expected to be stable in this freeze:

- Manual Entry works for supported pilot activity types.
- Import works for the golden pilot dataset.
- Data Records loads and shows calculated, excluded, and tracked-only records.
- Calculation Review loads totals, scope cards, data quality, source traceability, and calculation details.
- PDF report export uses pilot-facing wording, factor traceability, source evidence, and tracked metrics.
- CSV export uses pilot-facing columns, row numbers, raw numeric fields, and no internal database ids.
- Reset Demo Data clears saved records and input-review staging data without deleting users, facilities, settings, or conversion factors.
- No temporary debug UI appears in pilot-facing screens.
- No internal backend wording appears in pilot-facing reports or exports.
- Pilot-facing report/export output does not expose database ids.

## Supported Pilot Activities

Supported calculated GHG activity types:

- Electricity, Scope 2, province-specific factors for AB, BC, and ON.
- Natural Gas, Scope 1.
- Gasoline, Scope 1.
- Diesel, Scope 1.
- Air Travel, Scope 3.
- Hotel, Scope 3.
- Ground Transport, Scope 3.
- Shipping, Scope 3 if present in configured factors.

Tracked-only activity types:

- Water, tracked operational metric, excluded from Scope 1 / Scope 2 / Scope 3 and total emissions.

## Golden Demo Dataset Expected Totals

For the current golden pilot dataset:

| Metric | Expected Value |
| --- | ---: |
| Total records | 10 |
| Calculated records | 9 |
| Tracked metrics | 1 |
| Scope 1 | 3,313 kgCO2e |
| Scope 2 | 33,247 kgCO2e |
| Scope 3 | 725 kgCO2e |
| Total emissions | 37,285 kgCO2e |

Water is tracked-only and excluded from the GHG total.

Golden dataset records:

| Activity | Input | Expected Treatment |
| --- | --- | --- |
| Electricity, Alberta | 12,500 kWh | 6,625 kgCO2e, Scope 2 |
| Electricity, British Columbia | 100 kWh | 2 kgCO2e, Scope 2 |
| Electricity, Ontario | 1,000 kWh | 120 kgCO2e, Scope 2 |
| Electricity, Alberta | 50 MWh | 26,500 kgCO2e, Scope 2 |
| Natural Gas | 1,000 m3 | 1,890 kgCO2e, Scope 1 |
| Gasoline | 500 liters | 1,155 kgCO2e, Scope 1 |
| Diesel | 100 liters | 268 kgCO2e, Scope 1 |
| Air Travel | 5,000 km | 575 kgCO2e, Scope 3 |
| Hotel | 10 nights | 150 kgCO2e, Scope 3 |
| Water | 100 m3 | Tracked only, excluded from GHG total |

## Smoke Test Checklist

Use this checklist before each consultant or SME pilot-feedback session.

- Reset demo data.
- Import the golden dataset.
- Verify total record count is 10.
- Verify calculated records count is 9.
- Verify tracked metrics count is 1.
- Verify Scope 1 total is 3,313 kgCO2e.
- Verify Scope 2 total is 33,247 kgCO2e.
- Verify Scope 3 total is 725 kgCO2e.
- Verify total emissions is 37,285 kgCO2e.
- Verify Water is shown as tracked-only and excluded from GHG total.
- Verify Manual Entry can save a supported record, such as Electricity + Alberta + kWh.
- Verify Data Records loads and record details open without navigating unexpectedly.
- Verify Calculation Review displays totals, data quality, included/excluded records, and calculation details.
- Verify PDF export downloads and opens.
- Verify CSV export downloads and opens in a spreadsheet.
- Verify Factor Source, Factor Version, Verification, and Confidence display in reports.
- Verify Scope 3 records show Consultant Review Recommended.
- Verify spreadsheet imports show `AI-assisted Spreadsheet Import`, not `PDF extraction`.
- Verify no temporary debug panels or raw API JSON appear.
- Verify no internal backend wording appears in pilot-facing UI, PDF, or CSV.
- Verify no database ids appear in the pilot-facing PDF or CSV.

## Known Limitations

- This release is pilot/demo software and should not be used as an official emissions report without professional review.
- Electricity factor coverage is limited to AB, BC, and ON for the current pilot.
- Unsupported electricity provinces such as QC and SK should remain Missing Factor until reviewed factors are added.
- Scope 3 factors are pilot estimates and require consultant review before formal reporting.
- Carbon credit readiness is an optional early screening note only; it is not a certification or eligibility determination.
- System factors and demo factors are included for pilot workflow validation and may need replacement with reviewed official sources.
- Backend/tenant isolation and destructive admin actions require backend integration testing outside this frontend workspace.
- Browser-level e2e smoke tests may need fixture/selector maintenance as UI copy evolves.

## Pilot Disclaimer

CarbonLite Pilot Demo v0.1 is provided for pilot feedback, workflow validation, and data-readiness review only. CarbonLite does not certify emissions, guarantee compliance, determine carbon credit eligibility, or replace professional sustainability review. Pilot reviewers should validate source documents, conversion factors, assumptions, boundaries, and reporting requirements before relying on any output.

## What Not To Change Before Pilot Feedback

Avoid changing the following before structured pilot feedback is complete:

- Golden dataset expected totals.
- Scope 1 / Scope 2 / Scope 3 calculation logic.
- Water tracked-only treatment.
- AB / BC / ON electricity pilot factor behavior.
- QC / SK unsupported electricity Missing Factor behavior.
- Pilot-facing PDF wording and disclaimer posture.
- Pilot-facing CSV columns and no-internal-id behavior.
- Reset Demo Data behavior.
- Factor source, version, verification, confidence, and consultant-review display.

Only fix blockers or pilot-facing consistency issues before feedback sessions.
