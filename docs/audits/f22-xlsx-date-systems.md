# F22 — XLSX workbook date-system parity

## Result and root cause

The browser now decodes numeric Excel dates using the workbook's date1904 metadata. The backend already did this correctly and needs no production change. Both paths retain cellDates:false and use SheetJS SSF.parse_date_code; no manual 1462-day correction is added.

Previously, a 1904 workbook containing serial 44575 (2026-01-15) previewed as 2022-01-14 in the browser, while backend extraction produced 2026-01-15. A 1900 workbook containing serial 46037 already decoded correctly in both paths.

## Audit performed before implementation

| Item | Browser | Backend |
| --- | --- | --- |
| Installed XLSX library | SheetJS xlsx 0.18.5 | SheetJS xlsx 0.18.5 |
| Entry point | ExcelInputTable.importExcelFile / normalizeSpreadsheetDate | parseSpreadsheetActivityRows, called by local document extraction |
| Read options | type:array, cellDates:false | type:buffer, cellDates:false, existing bounded sheetRows/first-sheet options |
| Worksheet conversion | sheet_to_json header:1, raw:true, defval:'' | sheet_to_json header:1, defval:null; raw defaults true |
| Date-system metadata | available on Workbook.WBProps.date1904, not passed to date helper | passed to SSF.parse_date_code as date1904 |
| Previously honored 1904 numeric dates | NO | YES |
| 1900 serial conversion | SSF.parse_date_code(value) | SSF.parse_date_code(value,{date1904:false}) |
| 1904 serial conversion | incorrectly used 1900 default | SSF.parse_date_code(value,{date1904:true}) |
| Text-date handling | ISO date/date-time prefix becomes YYYY-MM-DD; other text remains missing/review input | trimmed text retained for subsequent normalization/review |
| Date-object handling | UTC calendar fields, without local-midnight conversion | ordinary production workbook reads yield serials, not Date objects |
| Numeric datetime | calendar fields from decoded serial, time omitted | same |

The installed SSF source accepts the date1904 options object, internally accounts for the epoch, and explicitly returns the fictitious 1900-02-29 for serial 60. Application code must not layer another leap-year adjustment on it. Current documentation also describes workbook epochs and numeric date cells: [SheetJS dates](https://docs.sheetjs.com/docs/csf/features/dates/) and [cell objects](https://docs.sheetjs.com/docs/csf/cell/). Installed source and fixture probes, rather than newer-library assumptions, establish this version's behavior.

A probe of the same 1904 bytes with cellDates:true produced a Date object in 2022 while its formatted display showed 2026. That conversion path is not used by either current parser and remains disabled. Numeric decoding with explicit metadata avoids this installed-version problem. Existing Date objects passed directly to the browser helper already represent a date and receive no workbook-epoch adjustment.

Import identity was audited: physical identity is document + sheet + source row. The legacy rowless fallback includes source reference, activity type, recordDate, quantity and unit. No identity code is changed. Both fixture systems now produce identical fallback input tuples as well as identical physical provenance.

The smallest safe fix, reported before editing, was to add an optional date1904 argument to the existing browser date helper and pass the flag from importExcelFile. CSV/paste calls retain the default 1900 behavior. Backend production parsing, global dates, DTOs, factor matching, calculations, reporting and locking remain untouched.

## Change

normalizeSpreadsheetDate(value, date1904 = false) forwards the flag only when value is a numeric serial. Text and Date branches retain their existing behavior. The Excel file path passes !!workbook.Workbook?.WBProps?.date1904. Raw cells, not locale-formatted display strings, remain authoritative. No local-midnight-to-ISO conversion was introduced.

## Deterministic fixtures and parity coverage

The frontend test-fixtures/xlsx-date-systems directory contains two small XLSX files, expected.json and generate.mjs. The backend test/fixtures/xlsx-date-systems directory intentionally contains identical XLSX and JSON bytes. The generator uses independent modern Gregorian epoch arithmetic to encode known business dates, rather than calling the decoder being tested. Both files have explicit date1904 metadata.

Each workbook contains the same nine logical rows, with dates covering:

- 2026-01-15, 2024-02-29, 2025-12-31, 2026-01-01, 2026-10-22;
- a numeric noon datetime, interpreted as its calendar date;
- literal text 2026-01-15, unchanged under either epoch;
- a cached DATE formula result, read without formula evaluation;
- an unformatted numeric serial in the date column.

The 2026-01-15 serials are 46037 and 44575, differing by 1462 as expected. This difference is an assertion about fixture inputs, not application correction logic.

The cross-repository runner calls the actual backend parser on fixture bytes, then launches the real browser component tests with those backend results. Browser tests upload those same files and inspect the Save All staging payload. They compare activityType, recordDate, quantity, unit, country, region, source reference, sheet and physical row against both the independent calendar oracle and backend output.

The same runner additionally reads the existing carbonlite_field_mapping_original.xlsx fixture (uploaded under the established carbonlite_field_mapping_test.xlsx name). Browser/backend dates remain Jan 15, Jan 31, Feb 5, Feb 10 and Feb 18, 2026. The browser retains Gasoline 350 L = 808.50, Scope 1. Existing fixture expectations were not rewritten.

For year selection, both parsers retain the expected calendar years. The browser test supplies synthetic 2022 and 2026 Alberta factors with the unchanged 0.53 value and verifies the modern row selects the 2026 factor. Backend parser tests assert matching date-year inputs; factor matching is downstream and unchanged. The actual backend upload/confirm test persists recordYear 2026 and calculates 519.40 using the existing deterministic factor fixture.

## Verification

| Check | Result |
| --- | --- |
| Pure browser date helper | 15/15 PASS |
| Browser component/date-only suites | 85/85 PASS |
| Backend epoch fixture tests | 4/4 PASS |
| Same-byte browser/backend parity, including original Field Mapping | 3/3 PASS |
| Cross-repository parity at UTC+14 / UTC-7 | 2/2 epoch cases PASS in each zone |
| Helper Date-object and serial tests at UTC+14 / UTC-7 | 15/15 PASS in each zone |
| 1900 / 1904 serial tests | PASS / PASS |
| Same logical date across systems | PASS |
| Leap day / year boundaries | PASS / PASS |
| Text date in a 1904 workbook | PASS; no shift |
| Date object double-adjustment | PASS; existing UTC date remains unchanged |
| Fractional noon serial | PASS |
| Timezone drift | NONE in tested zones |
| Factor-year consistency | PASS |
| Existing spreadsheet parser/resource tests + F21 DTO | 72/72 PASS |
| Actual upload/extraction/confirmation + F21 malformed API | 18/18 PASS |
| F12 eligibility | 20/20 PASS |
| F05 concurrency | 14/14 PASS |
| Field Mapping | 5/5 PASS; Gasoline 808.50 Scope 1 |
| Golden A / C / combined | 579.40 / 2428.44 / 3007.84 PASS |
| Partial Confirm | 3 -> 1 -> 0 PASS |
| Frontend typecheck / build | PASS / PASS |
| Backend typecheck / build | PASS / PASS |

Database-backed tests use createE2eApp's F20 guard and a runner that validates the target before app imports/startup. Only loopback localhost:5432/carbonlite_ci_test was used. Existing deterministic factors were preserved; no production, hosted or development database was used. The concurrency rollback case intentionally emits its synthetic failure while its assertions pass.

Commands (use a working Node executable):

- node node_modules/vitest/vitest.mjs run src/components/ExcelInputTable.test.tsx src/components/ExcelInputTable.dates.test.ts src/utils/dateOnly.test.ts
- node scripts/regression/xlsx-date-parity.mjs
- TZ=Pacific/Kiritimati node scripts/regression/xlsx-date-parity.mjs
- TZ=America/Los_Angeles node scripts/regression/xlsx-date-parity.mjs
- Backend: focused spreadsheet-date-systems unit and E2E tests, existing parser/resource/F21 tests, then guarded golden/F12/concurrency regressions.

The parity script defaults to the sibling carbonlite-api checkout; CARBONLITE_API_DIR may override it. It imports only the pure parser, never bootstraps the app or Prisma, and uses temporary results that it removes on completion. Full application tests still require the F20 disposable database guard. Explicit Node v20.19.5 was used because the host default executable has an unrelated ICU linkage issue.

## Files and scope

Frontend files changed for F22:

- src/components/ExcelInputTable.tsx — optional epoch flag and forwarding at XLSX intake only;
- src/components/ExcelInputTable.test.tsx — epoch and real-workbook regression cases;
- src/components/ExcelInputTable.dates.test.ts — focused helper cases;
- scripts/regression/xlsx-date-parity.mjs — real same-byte cross-repository comparison;
- test-fixtures/xlsx-date-systems/{generate.mjs,dates-1900.xlsx,dates-1904.xlsx,expected.json};
- docs/audits/f22-xlsx-date-systems.md.

Backend files added for F22:

- src/document-extraction/spreadsheet-date-systems.spec.ts;
- test/spreadsheet-date-systems.e2e-spec.ts;
- test/fixtures/xlsx-date-systems/{dates-1900.xlsx,dates-1904.xlsx,expected.json,README.md}.

Backend production files changed: NONE. Schema changed: NO. Migration added: NO. Calculation logic changed: NO. Factor matching/values changed: NO. Import identity/locking changed: NO. F01-F21 implementations changed: NO; existing protections are preserved, including F08 limits, F11 stale import protection, F12 eligibility and F21 nested validation. The unrelated factor-ID assertion was not encountered or modified.

## Remaining limitations

No date-picker, API-wide date, timezone or reporting-period behavior was broadened. Text-date parsing outside the existing ISO-style browser contract retains its prior behavior; locale-ambiguous text is not newly supported. Excel's fictitious serial-60 date and SSF precision/rounding behavior remain library-owned. Near-midnight subsecond rounding was not redesigned. Cached formula dates require a cached numeric value; formulas are not evaluated. The unused cellDates:true library conversion path remains unsuitable for 1904 numeric cells in the installed version. No library upgrade or new generic date framework is part of F22. F23 was not started.
