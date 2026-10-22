# Manual Input save confirmation and record visibility

## Flow audit before implementation

1. Input Data (`UploadPage`) renders `ExcelInputTable mode="manual"`; each row uses `ManualEntryForm` and the shared activity record fields.
2. `saveRow` or the manual branch of `saveAll` builds the existing activity payload. `createActivityData` posts to `/activity-data`; editing a previously saved row uses `PATCH /activity-data/:id`.
3. The backend controller delegates to `ActivityDataService.create`, which validates tenant relations, prepares the calculation snapshot, creates ActivityData, runs existing audit/tracking behavior, and returns the created record.
4. The response includes the ActivityData ID, persisted activity type, quantity, unit, jurisdiction/facility fields, calculation status, matching/report treatment metadata, and available calculated emissions. The frontend service returns that record unchanged.
5. Previously, local state retained only the saved ID and marked the row saved. The form remained visible with a generic Saved label and actions. UploadPage displayed its existing generic success message.
6. Single-row save had no toast. Manual Save All used a misleading spreadsheet success toast.
7. Data Records is `/activity-records`.
8. Existing `?recordId=…` support filters the canonical list, scrolls to the selected row, and briefly highlights it. No new routing/filter implementation is needed.
9. The smallest safe implementation retains the returned record in local row state and renders a persistent confirmation in the existing saved-actions area, linking through the existing record ID filter.

## Result

After saving, the confirmation shows “Manual entry saved,” persisted activity type, quantity/unit, available location, the shared canonical status label, and any returned emissions result. It does not calculate a new emissions value. The result stays visible until the user changes or replaces the row or leaves the page.

“View in Data Records” links to the returned record ID, with a plain Data Records fallback when no ID is available. The existing filter banner now says “Showing selected record,” so it also fits calculated records.

“Add another entry” replaces that saved form with a clean draft and preserves other drafts. It makes no persistence request.

Synchronous guards block repeated row/batch submissions and overlapping row/batch saves. Save All stores each successful response immediately, preserving successful IDs and confirmations if a later request fails. Retry skips successful rows. Summary-refresh failure cannot turn a saved record into a retryable create. Partial batch success still triggers the existing metrics invalidation callback.

The existing error handling preserves failed input. No confirmation appears for a failed row. No recent-entry list or full records table was added.

## Invariants

- Manual Input persistence changed: NO.
- ActivityData schema changed: NO.
- Database migration: NO.
- Data Records ownership changed: NO.
- Duplicate record risk introduced: NO. Repeated submissions and partial-batch retry risks are reduced; no new create path was added.
- No backend, factor matching, calculation, snapshot, document/source model, reporting logic, audit-event, or tenant-isolation changes.

## Files changed for this task

- `src/components/manual-entry/ManualEntryConfirmation.tsx`: new confirmation using the API response and shared status formatting.
- `src/components/ExcelInputTable.tsx`: retain saved response, render confirmation, reset a saved form, guard saves, preserve partial successes, correct manual toast wording.
- `src/components/ExcelInputTable.test.tsx`: focused save/confirmation/status/link/reset/retry/concurrency/refresh tests.
- `src/pages/ActivityDataPage.tsx`: neutral wording for the existing record filter banner.
- `src/pages/ActivityDataPage.test.tsx`: update the banner assertion while retaining existing filter/clear coverage.
- `docs/audits/manual-input-save-confirmation.md`: this audit and validation report.

The working tree already contained other changes. Those were preserved.

## Validation

- Focused component tests: PASS, 118 tests across ExcelInputTable and ActivityDataPage.
- Added coverage: persisted gasoline confirmation and record link; clean reset preserving another draft; canonical Needs Attention, Tracked Metric, and Ready for Calculation labels without invented emissions; failed save/retry; repeated row submit and overlapping Save All; repeated batch submit and overlapping row save; summary-refresh failure after persistence; partial batch failure/retry without recreating a successful row.
- Manual Gasoline 50 L: PASS. The existing outgoing calculation payload remains 50 × 2.31 = 115.50 kgCO2e, `SCOPE_1`; the confirmation displays the returned 115.50 kgCO2e. This is a mocked component regression, not a new live-database verification.
- Browser regressions: PASS, 2 tests. Field mapping retains facilities and costs through reports/exports; partial confirmation preserves reportability of the imported subset while keeping the file in Needs Review.
- Typecheck: PASS.
- Build: PASS, with the existing chunk-size warning.
- Frontend tests: PASS on the final full run, 1,097 tests across 87 files. The two database-script tests also pass. An earlier full run had two transient failures in unchanged MetricsSummaryPage/ReportingPage tests; both passed on the final full run without changes to those modules.
- `git diff --check`: PASS.
