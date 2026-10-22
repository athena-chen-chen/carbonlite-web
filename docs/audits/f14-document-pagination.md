# F14 — Complete source-document accessibility

## Current-branch audit

- Endpoint: authenticated `GET /documents`, scoped by the backend to `user.organizationId`.
- Supported query: `page` (integer >= 1) and `pageSize` (integer 1–100). Defaults: page 1, page size 20. No cursor, public skip/take, sort, or filter parameters. Internally the service uses offset skip/take.
- Response: `{ items, total, page, pageSize, totalPages }`; `totalPages = ceil(total / pageSize)`, including zero for an empty collection. No next cursor. Items include imported record counts and latest extraction row counts.
- Order: `createdAt desc`. The frontend preserves this order without independently sorting pages or the final array. Equal timestamps have no explicit server tie breaker.
- Root cause in committed frontend: `getDocuments()` fetched only `/documents` (page 1). When organization metadata was present, it replaced the server total with `min(server total, filtered page length)` and derived totalPages from that page.
- `useDocuments` and its consumers expect the complete collection, not server-page state. Review Data shows the first three items, with an expand/collapse toggle. `showAllDocuments` means display the entire loaded array. There are no server-page navigation controls.
- Selection is evaluated against the complete loaded array and survives collapsing the list. Eligibility remains `importedRecordCount > 0`, including Needs Review sources.
- Route restoration by documentId finds the source in that array, then fetches extraction details by ID. It does not independently fetch source-document metadata.
- View Details uses the loaded source object; download, extraction/retry, and deletion use its ID. Selected-document Calculation Results derives the selected source IDs from the loaded array and passes the existing selectedDocuments route scope.
- Upload, spreadsheet save, replacement upload, and extraction/confirmation refreshes use the same collection service. Status updates map existing items. Successful deletion removes only the target locally and decrements the total without discarding later sources.
- Existing tests covered single-page organization filtering, hook load/refresh/delete, three-versus-expanded display, actions, and selected scope. They did not cover the complete collection across real service pages.
- The working tree already contained draft service/hook changes when this task was inspected. Those were retained and validated; the unrelated UploadPage extraction/refactor was not part of F14.

## Implementation

Chosen strategy: **PAGED FETCH-ALL**, matching the existing recent-three/expand-all workflow.

The service iterates normal API pages, carrying forward the server's page size, validating metadata on every response, and using each response's current totals rather than freezing the initial page count. A Map deduplicates stable document IDs in first-seen server order. A collection is published only after its unique authorized item count matches the final authoritative server total. Incomplete, malformed, failed, or over-limit pagination rejects instead of returning partial success. The loop is bounded at 1,000 pages.

The hook holds loading through the whole request, retains the last complete collection on failure, exposes loaded/error/total state, and supports retry without remount. Request generations, unmount guards, and workspace checks prevent old requests from publishing into a new context. Refresh reloads every page; sample-only replacement remains an explicitly local collection.

Review Data now distinguishes loading, failed load with retry, successful empty load, and a completed collection. Its expand count uses the collection total. It never presents a failed first or later page as proof that no sources exist.

No new dependency, backend change, schema change, migration, calculation change, import identity change, or F10 report identity change.

## Validation

All **421 tests across 20 files passed**, covering documents service, Input Data hooks/components/domain, UploadPage, Calculation Results, ReportingPage, and report data/export hooks. Frontend typecheck and production build passed. The build emits the existing large-chunk advisory.

F14-specific coverage uses 25-source API fixtures through the real collection service and page, with 20 items per server page. The service also covers 50 and 100 sources. No live database was seeded or changed, and backend tests were not run because the backend was unchanged.

| Regression | Result |
| --- | --- |
| All 25 sources reachable, authoritative total retained | PASS |
| Source 25 details | PASS |
| Source 25 deletion, other sources retained, count decremented | PASS |
| Later-page retry extraction and full refresh | PASS |
| Later-page calculation eligibility | PASS |
| Needs Review plus imported records selectable | PASS |
| Cross-page calculation scope includes both IDs once | PASS |
| Upload increases total and retains older pages | PASS |
| Mutation/status/full refresh retains later sources | PASS |
| Page 2 failure remains unavailable, never empty/success | PASS |
| Retry without remount | PASS |
| Loading remains active through pending page 2 | PASS |
| Stale workspace service responses and hook publication | PASS |
| Duplicate ID defense and missing-record rejection | PASS |
| Successful zero-document collection and empty state | PASS |
| F10 selected-ID normalization/request identity regression | PASS |

F01 deletion preservation was not modified: the UI still calls the source-delete endpoint and its existing imported-Activity-Records preservation message remains covered by the Input Data suite. The new later-page test checks the source-only API contract; it is not a database-level preservation test.

Pre-existing electricity factor-ID assertion: **NOT ENCOUNTERED** in this validation scope; unchanged.

## Performance and remaining limits

At the current default size of 20, 100 documents take 5 requests, 1,000 take 50, and 10,000 take 500. Requests run sequentially; memory is linear in the number of documents. Larger collections increase network latency, and expanding thousands of rows increases rendering cost. The 1,000-page bound fails explicitly rather than truncating (20,000 records at the current default).

Offset pagination is not a snapshot. Concurrent inserts/deletes or equal creation timestamps can move records across page boundaries. Duplicate/missing-count inconsistencies surface as retryable failure, but equal-count substitutions cannot be fully detected. No snapshot isolation, backend sort change, search, virtualization, or large-workspace redesign was added in F14.

## F14 files

- `src/services/documents.ts`
- `src/services/documents.test.ts`
- `src/services/documents.pagination.test.ts`
- `src/pages/input-data/hooks/useDocuments.ts`
- `src/pages/input-data/hooks/useDocuments.test.ts`
- `src/pages/input-data/components/ReviewDataSection.tsx`
- `src/pages/input-data/components/ReviewDataSection.test.tsx`
- `src/pages/UploadPage.tsx` — collection state/retry props only within the existing working-tree refactor
- `src/pages/UploadPage.sample.test.tsx`

F14 is complete. No F15 work performed.
