# CarbonLite Testing Strategy and Coverage Report

Date: 2026-07-14

## Test Setup

CarbonLite currently uses:

- Vitest with jsdom and Testing Library for unit and component tests.
- Playwright for browser/e2e smoke tests under `apps/web-e2e`.
- Vite build as both `build` and `lint`.
- TypeScript via `tsc`; there is no package `typecheck` script.

No backend/API source or backend test runner was found in this workspace, so API integration tests for database-backed tenant isolation and server endpoints could not be added here.

## Checks Run

| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `./node_modules/.bin/tsc -p tsconfig.json --noEmit` | Passed |
| Lint | `pnpm lint` | Passed |
| Unit/component tests | `pnpm test` | Passed, 40 files / 325 tests |
| Build | `pnpm build` | Passed |
| E2E smoke tests | `pnpm test:e2e` | Failed, 3 passed / 6 failed |

Notes:

- `pnpm test:e2e` needs permission to bind the local Vite preview server in this environment.
- Vite prints a Node version warning because this machine is running Node `22.8.0`; Vite requests `20.19+` or `22.12+`.
- Vitest passes but emits existing jsdom navigation warnings from unauthorized API handling.

## Existing Coverage

The current frontend test suite already covers meaningful pieces of the pilot workflow:

- Activity data service behavior and API error handling.
- Upload preview normalization, validation, and import behavior.
- Manual entry table validation and factor matching UI.
- Conversion factor matching helpers.
- Scope classification helpers.
- Metrics summary rendering, readiness, and hotspots.
- Report preview and report export paths at the component level.
- Data records interactions, including details modal behavior.
- Playwright smoke coverage for upload, reports, records, and conversion factor management, though several smoke assertions are now stale or failing.

## Coverage Added

This pass added a small stable pilot fixture and focused tests around the most important emissions rules:

- Pilot fixture data for expected Scope 1, Scope 2, Scope 3, and total emissions.
- Electricity factor matching for the supported pilot provinces: AB / BC / ON.
- Electricity missing-factor behavior for unsupported pilot provinces: QC / SK.
- Scope classification for Natural Gas, Gasoline, Diesel, Electricity, Flight, Hotel Stay, Ground Transport, and Water Usage.
- Manual entry happy path for valid Alberta electricity as Scope 2.
- JSON upload preview behavior for unsupported electricity province rows.
- Metrics reconciliation asserting Total Emissions equals Scope 1 + Scope 2 + Scope 3.
- Exclusion from totals for Water Usage, Missing Province, Missing Factor, Unit Mismatch, and invalid rows.

Recent local tests also cover the upload preview table layout issue:

- The preview table remains horizontally scrollable.
- Long validation text is shortened in the row and field UI.
- The horizontal scroll hint is rendered above the preview table.

## Current E2E Failures

The existing Playwright smoke suite is not green. The failing assertions are:

- Upload workflow expects the heading `Upload & Extract Carbon Data`, but it is not found.
- Retry extraction smoke expects `Review & Edit Data Before Import`, but it is not found.
- Reports empty-state smoke expects `No reporting data found.`, but it is not found.
- Reports selected-period smoke expects `Emissions Summary Report`, but it is not found.
- Reports generation smoke expects `Emissions Summary Report`, but it is not found after generating.
- Conversion factor smoke expects row `Electricity - Alberta - 2026`, but it is not found.

These look like stale UI/fixture expectations or mocked-data drift rather than failures introduced by the new unit coverage. They still represent pilot risk because the browser smoke suite no longer validates the complete Input Data -> Records -> Metrics -> Reports journey.

## Missing Coverage

High-value coverage still missing:

- Backend integration tests for the real API, database, auth, tenant scoping, and report/cache invalidation.
- End-to-end happy path with stable mocked API data for Input Data -> Activity Records -> Factor Matching -> Metrics -> Reports.
- E2E assertions that reports do not show stale totals after data changes.
- Browser-level layout regression for the upload preview table at narrow and desktop widths.
- Direct server tests for admin-only clear activity records, if that endpoint lives in a separate backend repo.
- Tests for consistent province abbreviation normalization, especially `SK` / `QC` vs full province names in upload preview and factor matching.

## High-Risk Areas

- Electricity province factor coverage is pilot-specific. AB / BC / ON should match, while QC / SK should remain Missing Factor until factors are added.
- Water Usage must remain tracked-only and excluded from all GHG totals.
- Rows in review or error states must never leak into metrics totals or report totals.
- Reports can become stale if they cache summaries without invalidating after records are imported, edited, or cleared.
- E2E smoke tests are currently red, so release confidence depends heavily on unit/component tests.
- There is no backend test surface in this repo, so tenant safety and destructive admin actions cannot be proven here.

## Recommended Next Tests

1. Update Playwright smoke fixtures and selectors to the current UI copy and current seeded factor names.
2. Add a stable mocked e2e pilot journey that imports records, opens Activity Records details, verifies metrics totals, and generates a report.
3. Add visual/layout e2e checks for the upload preview table at mobile and desktop widths.
4. In the backend repo, add integration tests for:
   - AB / BC / ON electricity factor matching.
   - QC / SK electricity Missing Factor.
   - Missing Province for electricity.
   - Natural Gas, Gasoline, and Diesel Scope 1 calculation.
   - Flight, Hotel Stay, and Ground Transport Scope 3 calculation.
   - Water Usage tracked-only exclusion.
   - Metrics summary reconciliation.
   - Admin-only current-company record clearing.
5. Add a regression test for report totals after data is cleared and re-imported.
