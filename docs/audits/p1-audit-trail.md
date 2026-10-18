# P1 Audit Trail: workflow persistence and workspace retrieval

Verified 2026-10-14 (America/Edmonton). The code fixes workflow history retrieval and the spreadsheet source/import write gaps. Changes are not deployed. Historical events were not recreated or modified.

## Architecture before implementation

1. **Workflow table:** Prisma `UserActivityEvent` contains `id`, nullable `organizationId`, nullable stable `userId`, `eventName`, `entityType`, `entityId`, `metadata`, and database `createdAt`. There is no separate `workspaceId` or `actorType` column. Workspace scope is the authenticated organization. A null actor is possible for system events; this task's authenticated events retain user IDs.
2. **Separate logs:** Prisma `AuditLog` is a generic action log with `/audit-logs`. It is used by the separate Audit Log page. `/business-audit-events` is a frontend helper without a corresponding backend module in this checkout. Neither is the source of the Reports page's Audit Trail.
3. **Write helper:** `ActivityTrackingService.track()` inserts a new `UserActivityEvent` and sanitizes JSON metadata. There is no workflow event update endpoint. `trackActivityEvent()` posts client events to the JWT-protected `/activity-events`; the backend derives organization/user identity from the authenticated session.
4. **Taxonomy:** Event names are strings, not a Prisma enum. Existing canonical events include `DOCUMENT_UPLOADED`, `DOCUMENT_EXTRACT_SUCCEEDED`, `ACTIVITY_RECORD_IMPORTED`, activity create/update/delete events, `REPORT_GENERATED`, and `REPORT_EXPORTED_PDF`/`REPORT_EXPORTED_CSV`. The client also emits legacy aliases including `FILE_UPLOADED`, `DATA_EXTRACTED`, `RECORDS_IMPORTED`, `PDF_EXPORTED`, and `CSV_EXPORTED`.
5. **Instrumentation:** Standard document upload and extraction already emit backend events. Confirm emits a batch `ACTIVITY_RECORD_IMPORTED` only when new records are created. Activity changes, real persisted report creation, and exports are instrumented. Local spreadsheet review persistence creates a source document without a backend upload event. Confirm previously emitted its event after the record transaction committed and included only count/sourceType/importBatchId.
6. **Read API:** `/activity-events` invokes `findOwn(user.id, query)`; it is personal usage history. `/admin/activity` has admin authorization and serves a separate administrative use case.
7. **Frontend query:** Audit Trail called `/activity-events?pageSize=20` and then applied a frontend allowlist containing the legacy aliases. It excluded backend import/upload names.
8. **Pagination/order:** Personal activity rows were paginated before that frontend filter. Rows were sorted only by `createdAt DESC`. No default date filter was supplied by Audit Trail.
9. **Reports:** Opening/preparing Reports does not persist a report artifact. Existing `REPORT_VIEWED` events are usage telemetry, not workflow history. `ReportsService.create()` persists a real Report and emits `REPORT_GENERATED`. PDF/CSV download actions emit `REPORT_EXPORTED_*`; no fake report-generation event is added for navigation.
10. **Database evidence:** A read-only query found 1,280 activity events in the current import workspace, including backend and client import events. Events were not generally missing or assigned to the wrong tenant.

The current workspace query observed, among other rows:

| Event ID | Event type | Organization ID | Actor ID | Entity type / ID | Timestamp (UTC) | Metadata keys |
|---|---|---|---|---|---|---|
| cmv89je7t0019gd97yn4oerux | ACTIVITY_RECORD_IMPORTED | cmp633k5v0000gdttdaq0kngs | cmp633kcw0002gdttmkak1msv | Document / cmv89j4wa000lgd974712ffy2 | 2026-10-14T15:26:53.370Z | count, sourceType, importBatchId |
| cmv89jfd5001bgd97e40u6hf6 | RECORDS_IMPORTED | cmp633k5v0000gdttdaq0kngs | cmp633kcw0002gdttmkak1msv | IMPORT_BATCH / null | 2026-10-14T15:26:54.857Z | sourceFileName, import counts, skipped counts, and client workflow metadata |
| cmv89jnry001fgd97dj8hsytw | REPORT_VIEWED | cmp633k5v0000gdttdaq0kngs | cmp633kcw0002gdttmkak1msv | Report / null | 2026-10-14T15:27:05.758Z | accountType, userRole, reportScope, selectedRecordCount, selectedDocumentCount |

No real names, emails, raw spreadsheet rows, invoice content, or addresses were printed during database inspection. There is no separate workspace ID: the organization IDs above are workspace identities.

## Actual first break and smallest fix

The primary break was the read pipeline: Audit Trail read personal telemetry, paginated it to 20 items, and then removed most of those items using an incomplete browser allowlist. Repeated page views could consume the entire page, hiding older real imports. This behavior was reproduced with more than 20 page views in both the authenticated API tests and PostgreSQL verification.

Additional write gaps were the local spreadsheet source upload and post-commit Confirm auditing. Query errors also appeared as a valid empty history.

## Implementation

- Added JWT-protected `GET /activity-events/workflow` using the existing workflow table and service.
- Tenant scope comes exclusively from `user.organizationId`. Empty scope is rejected. Client-supplied organization/user/date/event filters cannot override this route's workspace scope or meaningful-event filter.
- A backend canonical event allowlist is applied before pagination. It excludes navigation/usage noise and legacy success aliases for actions already represented by backend events. Historical records remain unchanged; they are not deduplicated or rewritten.
- Ordering is `createdAt DESC, id DESC`, with stable pagination and a deterministic timestamp tie-breaker.
- Existing personal and admin endpoints retain their separate purposes.
- `ActivityTrackingService.track()` accepts the current Prisma transaction client. Confirm appends its event within the same transaction as imported records.
- Local spreadsheet source creation appends `DOCUMENT_UPLOADED` in the source transaction, once. Re-saving the same source does not add another upload event.
- Standard upload metadata now includes safe filename/source identity.
- Audit Trail consumes the workflow endpoint directly, renders human-readable canonical event labels and counts, and replaces its rows on Refresh rather than appending copies.
- Network/API errors are displayed separately from the genuine empty state. Collapse/Expand and the panel's design are preserved.

No factor/calculation/facility/cost rules were changed for this task. No page-view event was added to workflow history and no report-generation event was fabricated.

## Import metadata

The existing `ACTIVITY_RECORD_IMPORTED` event represents Import confirmed. For the five-record fixture it now records:

```json
{
  "sourceDocumentId": "<persisted source ID>",
  "sourceFileName": "carbonlite_field_mapping_test.xlsx",
  "importBatchId": "<persisted import batch identity>",
  "sourceType": "DOCUMENT_AI",
  "reviewableRowCount": 5,
  "createdRecordCount": 5,
  "count": 5,
  "trackedMetricCount": 0,
  "unresolvedRowCount": 0,
  "skippedCount": 0
}
```

`count` remains for existing consumers. Counts are based on records created by that Confirm transaction. Staged spreadsheet review rows supply the complete reviewable/unresolved counts; when staging is absent, reviewableRowCount reflects the rows supplied to Confirm.

## Append-only and partial imports

A first Confirm creating three records appends one event with `createdRecordCount = 3`. A later Confirm creating one additional record appends a distinct event with `createdRecordCount = 1`. The original event's serialized value remains unchanged. Unchanged reconfirm creates zero records and no new import event. Refresh and browser navigation only read history.

There is no distinct persisted review-completion transition in this workflow, so no new `SOURCE_REVIEW_COMPLETED` taxonomy was invented.

## PostgreSQL verification after implementation

The compiled services were exercised with the actual sanitized XLSX fixture in newly created test organizations/users inside an always-rolled-back PostgreSQL transaction:

1. Fresh workspace workflow history returned zero events.
2. Persisted spreadsheet source creation recorded `DOCUMENT_UPLOADED`.
3. Confirm created five ActivityData rows and recorded one `ACTIVITY_RECORD_IMPORTED` with 5/5/0 count semantics.
4. Reconfirm created zero records and no duplicate import event.
5. Twenty-five page-view telemetry events were written to test the former pagination failure.
6. The existing export writer recorded `REPORT_EXPORTED_PDF` with safe output-profile/count metadata. This database check exercises the writer; the browser test exercises the real export action.
7. The workflow service returned export, import, and upload in newest-first order despite the telemetry noise.
8. The second organization returned no first-organization events, even when the query supplied the other organization ID.
9. The transaction was rolled back, leaving existing tenant records and history untouched.

Exact synthetic event IDs, actor/tenant IDs, entity IDs, timestamps, metadata keys, and import metadata are in [p1-audit-trail-runtime-evidence.json](p1-audit-trail-runtime-evidence.json). These are genuine PostgreSQL writes/readback from that transaction, not frontend-generated history. No verification user email is included.

## API/UI/Refresh results

- Real JWT-protected HTTP tests reject unauthenticated access, enforce tenant isolation in both directions, ignore forged tenant filters, return history from another actor in the same workspace, and filter before pagination.
- Fresh workspace UI preserves “No workflow audit events recorded yet.”
- After upload/Confirm, UI displays “Import confirmed” and “5 activity records imported from carbonlite_field_mapping_test.xlsx”.
- Refresh returns the import exactly once, preserves ordering, and does not write an event.
- Import history remains after technical PDF export and browser reload/navigation.
- Technical export appears as one canonical “PDF exported” workflow row.
- Network failure displays an error rather than an empty-history claim.

## Files changed for this task

Backend:

- `src/activity-tracking/activity-tracking.service.ts`
- `src/activity-tracking/activity-tracking.controller.ts`
- `src/activity-tracking/workflow-audit.spec.ts`
- `src/document-extraction/document-extraction.service.ts` (audit transaction/metadata only)
- `src/spreadsheet-import/spreadsheet-import.service.ts`
- `src/documents/documents.service.ts` (safe event identity metadata)

Frontend/tests:

- `src/services/activityEvents.ts`
- `src/pages/ReportingPage.tsx` (functional audit wiring/labels/error state only)
- `src/pages/ReportingPage.test.tsx`
- `apps/web-e2e/support/mock-api.ts`
- `apps/web-e2e/support/pilot-demo-api.ts` (new route compatibility)
- `apps/web-e2e/tests/field-mapping-report.spec.ts`
- This audit and the sanitized runtime evidence JSON.

Existing uncommitted work, including the previous facility/cost fix, was preserved.

## Validation

- Backend focused Jest: **41 tests passed** across audit/JWT API, Confirm lineage, and extraction normalization.
- Frontend focused Vitest: **54 tests passed** across Audit Trail/UI and canonical report/domain/output facts.
- Playwright Chromium: **3 tests passed** — field-mapping upload/Confirm/Audit Trail/report/export, input-review navigation continuity, and ENMAX export regression.
- Actual PostgreSQL persistence/readback: passed, then rolled back.
- Backend Nest build: passed.
- Frontend Vite build: passed.
- Frontend standard typecheck: blocked by existing missing `node` and `@nx/react/typings` definitions in the repository config. No typecheck pass is claimed.
- `git diff --check`: passed in both repositories.

Browser API/extraction responses are controlled fixtures. Backend tenant tests use real signed JWTs and a controlled database adapter; the separate PostgreSQL verification checks actual persisted rows and retrieval. Live AI extraction was not invoked. No production deployment or historical backfill was performed.
