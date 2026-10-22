# Event Log predefined date ranges

## Audit before implementation

The existing log search is `AuditLogPage` at `/audit-log`, titled “Audit Log.” No page named “Event Logs” or min/max timestamp labels exists in this checkout. The separate User Activity page was not changed.

1. Component: `src/pages/AuditLogPage.tsx`.
2. Controls: always-visible date-only “Date from” and “Date to” inputs, rather than date-time inputs.
3. State: local dateFrom/dateTo/action/entityType/search strings, combined into a memoized query. No Event Log URL/query state.
4. Search button: none; every query edit triggered the effect and API request.
5. Reset: none.
6. Initial behavior: automatic unbounded request with empty filters.
7. Existing endpoint: `GET /audit-logs`; parameters `dateFrom`, `dateTo`, `action`, `entityType`, and `search`.
8. Date stack: native Date/Intl; no installed date library. Previously date inputs sent date-only strings without explicit frontend UTC conversion. Displayed event timestamps used browser-local Intl formatting.
9. Backend: `AuditLogService.findAll` filters `createdAt` using Prisma `gte: new Date(dateFrom)` and `lte: new Date(dateTo)`. Both boundaries are inclusive. Existing tenant restriction, descending timestamp ordering, and pagination are sufficient and untouched.
10. Empty state: “No audit logs found.” It could also appear after API failure because error and empty states were independently rendered.
11. Tests: two page tests covering detail view and immediate filter application. No existing audit-log service tests.

America/Edmonton appeared as a timezone example in organization settings but no reusable log-range conversion existed. The supplied interaction model conflicts with the existing auto-filter test; this difference was reported before implementation. The explicit task model was applied and that test updated.

## Implementation

The dropdown contains Last hour, Today, Last 24 hours, Last 7 days, Last 30 days, and Custom. Today is the default and executes once on mount, including under React StrictMode effect replay. Reset clears the other criteria, hides Custom controls, recalculates Today, clears validation, and executes once.

Other edits are drafts until Search is pressed. A predefined period alone enables Search after loading. Search captures one fresh current-time reference for the entire predefined range. Custom initialization uses the currently selected effective period, preserving its exact start/end instants rather than unrelated historical custom edits.

The centralized typed helper uses native `Intl.DateTimeFormat` with `America/Edmonton`. Today resolves the Edmonton calendar date and local midnight into UTC, including when the offset changes later that day. Rolling periods use elapsed hours. No fixed UTC offset or new library was added.

Custom controls display Mountain wall time and send UTC ISO instants using the existing API parameters. Millisecond precision is retained for preset round-trips. Missing/invalid values and end <= start disable Search and show inline validation; the submit handler also rejects them without an API call. Spring-forward times that do not exist are rejected. An edited ambiguous fall-back time uses its first occurrence; an unchanged preset instant retains its exact occurrence. The UI explains this choice.

API request sequence handling prevents late older responses from replacing Reset/newer results. “No Events Found” appears prominently only after a successful empty response, never while loading or after failure. Existing event details and other filter parameters remain supported. Existing event timestamp display formatting remains unchanged.

## Scope

- Backend change required: NO.
- Database migration: NO.
- No event schema, event creation, audit semantics, authorization, tenant isolation, endpoint, pagination, ordering, or retention changes.
- No routes or new dependencies.
- The working tree's pre-existing changes were preserved.

## Files changed

- `src/pages/AuditLogPage.tsx`
- `src/pages/AuditLogPage.test.tsx`
- `src/utils/eventLogDateRange.ts`
- `src/utils/eventLogDateRange.test.ts`
- `src/services/auditLogs.test.ts`
- `apps/web-e2e/tests/event-log-date-ranges.spec.ts`
- `docs/audits/event-log-date-range-filter.md`

## Focused validation

- Initial Today search: PASS; one intended request in StrictMode, correct UTC bounds in winter and summer.
- Reset Today search: PASS; fresh bounds, cleared filters and validation, one additional request.
- Custom validation: PASS; empty values, end before/equal start, invalid dates, nonexistent spring-forward times; corrected values clear validation without searching automatically.
- No Events Found: PASS; loading, populated, failure, empty, and retry paths covered.
- Range inclusion/exclusion: PASS against an API contract fixture using the audited inclusive backend operators. Exact start/end events display; events one millisecond outside do not.
- Error paths: PASS; failed search, retry, and stale-response handling covered.
- Unit/component tests: 35 range-helper/page tests passed before adding the service serialization test. The service test also verifies exact UTC ISO query serialization.
- Browser walkthrough: winter and summer Chromium scenarios pass with browser timezone Asia/Tokyo, exercising actual request URLs, Custom, validation, Search, Reset, empty results, and API errors against a synthetic API.
- Visual review: Today and Custom screenshots inspected. Filter widths were constrained to their existing grid columns after observing overlap; final screenshots show separated controls and readable validation.
- Manual live-backend testing: not performed. Browser interactions were automated; screenshot review was manual. The in-app browser runtime could not initialize due to a restricted module import, so the repository's Playwright harness was used.

## Final checks

- Unit/frontend suite: PASS, all 1,131 tests across 89 files using `npm test -- --maxWorkers=2`; both database-script tests also passed. The initial unrestricted run was stopped after unrelated pages hit timeouts while browser tests/build ran concurrently; the limited-worker full run passed.
- Focused feature coverage: PASS, 36 tests across the range helper, page, and API serialization test, included in the full run.
- Browser tests: PASS, 2 Chromium scenarios after the final layout change.
- Typecheck: PASS (`npm run typecheck`).
- Build: PASS (`npm run build`); existing bundle-size/Browserslist notices remain.
- Diff whitespace check: PASS.
- Manual testing: visual inspection PASS; live-backend manual search not performed (scripted browser interactions with synthetic API).
- Known feature defects: NONE observed.
- Known regressions: NONE observed in the final full run.
