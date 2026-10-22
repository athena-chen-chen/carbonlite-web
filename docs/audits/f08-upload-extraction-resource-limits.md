F08 upload and extraction resource limits — 2026-10-21

Status: PASS. Scope: F08 only. The initial working tree already contained F08 implementation and tests alongside other findings. This pass reviewed that implementation, completed failure-state handling and provider configuration, corrected affected fixtures, and validated it. Existing unrelated changes were preserved.

Audit before completion

- Original controller: authenticated `POST /documents/upload`, single `FileInterceptor('file')`; Multer disk storage at `./uploads`, without explicit byte/count/field limits or filtering. The current workspace mutation guard remains active before multipart interception.
- Original supported extraction extensions: PDF, CSV, XLS, XLSX, PNG, JPG, JPEG, JSON. Validation occurred at extraction time and accepted a supported extension OR client MIME, rather than requiring compatible layers. No upload content validation existed.
- Original hash: SHA-256 of `readFile(file.path)`, hexadecimal output. Duplicate lookup remains organization-scoped, earliest existing document, with explicit `allowDuplicate` handling.
- Persistence: disk source plus a Document containing storage URL, MIME, size, hash and ownership. Duplicate rejection deleted the new copy. Hash/database failures could leave orphan files. Extraction failure intentionally retained sources for retry.
- Original XLS/XLSX: SheetJS parsed a workbook without sheet/row/cell bounds, then converted the first sheet into a grid. Header aliases and mapping are unchanged. Formulas are not executed; cached values remain usable.
- Original JSON: local JSON parse and structured extraction. CSV: provider extraction and local source-row counting. PDF/images: whole-source reads, base64 encoding, external OpenAI extraction. These paths had no application source-size precondition.
- Original timeouts: no narrow extraction timeout; the installed SDK defaults to 600,000 ms and two retries. The existing 60-second confirmation transaction timeout is unrelated and unchanged.
- Frontend already enforced 10 * 1024 * 1024 bytes and uploaded selected files individually. Accepted types matched the eight backend extensions, but panel copy incorrectly advertised HEIC.
- Existing tests covered retry/missing sources, duplicates, confirmation, lineage, and workbook mapping. The working tree also contained focused F08 boundary, workload and parser tests; these were inspected and run.

Smallest safe plan: keep disk persistence and existing workflows; apply the frontend byte contract during multipart intake, filter types early, validate bounded content, remove rejected sources, stream the unchanged digest, cap workbook processing and process-local extraction admission, and narrow provider timeouts. No queue, distributed lock, schema change, dependency upgrade or calculation change.

Implemented boundaries

| Control | Final behavior |
| --- | --- |
| Upload bytes | `MAX_DOCUMENT_UPLOAD_BYTES = 10,485,760` (10 MiB), matching existing UI. Exact limit accepted; next byte rejected with 413. Busboy threshold is limit + 1 because its limit event fires upon reaching the threshold. |
| Multipart count | One `file` per request, four text fields, five parts, 1 KiB per field. Frontend batches remain separate requests. |
| Type filtering | One backend extension-to-MIME policy shared by upload and extraction. Require supported extension and compatible meaningful MIME; allow absent/generic octet-stream MIME. |
| Content checks | Basic PDF/PNG/JPEG/OLE/ZIP signatures, workbook container parsing, strict UTF-8 CSV and JSON syntax. This is pragmatic validation, not full PDF/image decoding or antivirus scanning. |
| Cleanup | Streaming custom disk storage with pipeline teardown and request-scoped cleanup for multipart failures. Validation, hash, duplicate and metadata-create failures unlink the new source before metadata is persisted. |
| Successful persistence | A later audit/tracking failure retains the created Document and its source. |
| Hash | Streaming SHA-256, lowercase hex, same original bytes and duplicate lookup semantics. Digest identity proven against buffered hashing over multiple chunks. |
| Spreadsheet sheets | At most 20 workbook sheets; process only the established first sheet. |
| Spreadsheet grid | At most 10,000 physical rows including headers, 100 columns, 250,000 rectangular/processed cells. Parse with a row sentinel and check full dimensions before grid conversion. |
| Spreadsheet formulas | Disable formula/HTML/style extraction; preserve cached numeric values, no evaluation. |
| Review rows | At most 10,000 structured/provider activity records. |
| CSV | At most 10,000 records, 100 columns and 65,536 characters per logical record; reject unclosed quoting, NULs and invalid UTF-8. Preserve normal escaped quotes and embedded newlines. |
| JSON | Multipart and stored-source byte bounds precede parse; malformed JSON and excessive record arrays fail safely. |
| PDF/images | Same 10 MiB stat/buffer precondition before base64 and provider work, including pre-existing documents. |
| Extraction admission | At most two simultaneous extraction operations per process; overlapping same-document request returns 409, full capacity returns 429 without queuing. Capacity is released on completion/failure; rejected requests can retry. |
| Provider timeout | 60,000 ms application deadline, AbortSignal and SDK timeout; SDK automatic retries disabled. Source remains retryable. |
| Provider response | 16,384 output tokens; at most 2 MiB of output text before JSON parsing, then review-row bound. |
| Structured failure | Await local XLS/XLSX/JSON persistence inside the failure handler so asynchronous failure marks `EXTRACTION_FAILED` and retains the source. |
| Client errors | Existing Nest/Multer 400/409/413/429/504 conventions and safe messages; unexpected failures retain existing friendly 500 handling. |

The output-token cap matches the existing model's documented maximum: [OpenAI GPT-4o mini documentation](https://developers.openai.com/api/docs/models/gpt-4o-mini). No real provider calls were made during these tests.

Final report

| Requested result | Outcome |
| --- | --- |
| Root cause | Unbounded multipart intake, late type checks, buffered reads, incomplete rejection cleanup and unconstrained extraction work. |
| Previous server-side upload limit | None explicitly configured. |
| New upload byte limit / rationale | 10,485,760 bytes; existing frontend contract, not a newly invented product maximum. |
| Max files per request | 1. |
| Supported extensions | `.pdf`, `.csv`, `.xls`, `.xlsx`, `.png`, `.jpg`, `.jpeg`, `.json`. |
| MIME/content validation strategy | Extension + compatible meaningful MIME + bounded content/signature/parser checks. Generic MIME allowed. |
| Early rejection before expensive extraction | YES. Unsupported/misleading basic types never reach the provider. |
| Hashing implementation | STREAMING. |
| Digest semantics changed | NO. |
| Spreadsheet bounds added | 20 sheets; 10,000 rows; 100 columns; 250,000 cells; 10,000 review rows. |
| PDF/image bounds | 10 MiB before encoding/provider request. |
| Extraction concurrency protection | Two active operations; same-document overlap rejected. |
| Concurrency scope | PROCESS and DOCUMENT within that process. |
| Distributed/global rate limiting added | NO. |
| Extraction timeout | 60 seconds, abort + SDK timeout, no automatic retries. |
| Rejected upload cleanup | PASS, including malformed/truncated multipart, hash failure and database failure. |
| Valid extraction failure preserves retryable source | PASS, including provider/timeout and asynchronous JSON/XLSX persistence failures. |
| Oversized upload | BLOCKED. |
| Unsupported extension | BLOCKED. |
| Misleading/malformed content | CONTROLLED. |
| Pathological workbook | BOUNDED within the documented parser limitations below. |
| Normal workbook | PASS (XLS and XLSX parser tests; actual pilot XLSX APIs). |
| Field Mapping | 5/5 PASS through real upload/extract/review response/confirm/metrics APIs. |
| Gasoline | 350 L, 808.50 kgCO2e, Scope 1 PASS; canonical scope/snapshot assertions also covered by F12 API tests. |
| Golden A | 579.40 PASS. |
| Golden C | 2428.44 PASS. |
| Combined | 3007.84 PASS. |
| Manual Gasoline / Diesel | 115.50 / 268.00 PASS. |
| Tracked Water | 18 m3 PASS. |
| Partial confirm | Remaining rows 3 → 1 → 0 PASS; repeated confirmation adds zero. |
| Duplicate hashing | PASS, including organization scope and explicit duplicate copies. |
| Concurrent extraction protection | PASS using deterministic deferred promises, not sleep-only assertions. |
| Extraction timeout tests | PASS: fake-timer deadline/abort tests, source-retention API test, provider request options asserted. |
| F01 / F04 / F12 / F05 | PASS, existing API regression suites rerun. |
| Authorization regressions | PASS, including VIEWER/PILOT_REVIEWER mutation boundaries. |
| Schema changed / migration added | NO for F08. An unrelated pre-existing migration remains untouched. |
| Frontend changed | YES: supported-format copy corrected; no behavioral changes. |
| Factor values / calculation logic changed | NO for F08. |
| Pre-existing factor-ID failure | UNCHANGED; its code and expectation were not modified. |
| Relevant tests | PASS: 22 F08 API tests, 72 existing API regression tests, 76 document/extraction unit tests, 23 frontend tests; actual Golden workbook API harness also passes. |
| Backend typecheck | PASS. |
| Backend build | PASS. |

Validation used only the verified local PostgreSQL database `carbonlite_f01_test_20261021_1` at loopback port 5432. Test organizations were removed after runs. Uploads were routed to per-run `f08-test-*`, `f08-regression-*` or `f08-golden-*` directories and those directories were removed. A final directory check found none remaining. Production/shared remote database targets were not used for validation.

Evidence: focused API output at `/private/tmp/carbonlite-f08/focused.log`; existing regressions at `/private/tmp/carbonlite-f08-final/regressions.log`; actual workbook API output at `/private/tmp/carbonlite-f08/golden.log`; backend checks at `/private/tmp/carbonlite-f08/typecheck.log` and `build.log`. Relevant API tests are in `carbonlite-api/test/document-resource-limits.e2e-spec.ts`, with policy/parser/workload tests beside their implementation. Two outdated existing fixtures were corrected: duplicate CSV bytes no longer pretend to be XLSX, and the extraction rejection test explicitly simulates legacy unsupported metadata because new unsupported uploads now reject earlier.

Known remaining resource risks: SheetJS 0.18.5 exposes no decompressed ZIP byte cap. It can inflate ZIP entries/shared strings before row/cell checks; these controls do not guarantee protection from all ZIP bombs. Synchronous parser CPU work has no preemptive timeout. PDF/image checks are signatures, not complete decoders or page/pixel quotas. Bounded source reads/base64 still use memory, and concurrent uploads are not globally capped. Process-local admission does not coordinate multiple instances or prevent repeated sequential requests. The provider is expected to honor cancellation; the application deadline alone cannot terminate an implementation that ignores AbortSignal. Local disk storage is still subject to aggregate growth from valid retained documents.

Future infrastructure hardening, if needed at scale: endpoint/user quotas or rate limits; isolated parser workers with memory/deadline and archive-expansion enforcement; distributed extraction admission/queue; managed source retention and object storage. None implemented as part of F08.
