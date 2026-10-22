F09 — truthful mutation outcomes — 2026-10-21

Result: PASS. F09 only. No schema, migration, frontend application, factor-value, calculation-formula, authorization, JWT configuration, or confirmation-lock changes.

Root cause: several services committed their primary database writes, then awaited audit or activity-feed inserts using the global Prisma client. If those later inserts failed, the request returned an error despite the business state already being committed. Extraction could also mark a successfully saved result as failed because activity-feed persistence threw afterward.

Classification recorded before implementation

Required business audit means existing evidence used for accounting history, provenance, factor governance, report creation, boundary attestation, or an existing transactional workflow contract. Its failure must roll back the associated business writes. Optional telemetry means informational activity-feed records that decorate an already valid mutation. Its failure must remain observable without changing business success. The same activity table also contains pre-existing required workflow records; these remain transactional and are not routed through the optional helper.

| Mutation | Primary DB write | Existing post-write audit/event | Originally same transaction? | Could evidence failure report failure after commit? | Classification | Treatment |
| --- | --- | --- | --- | --- | --- | --- |
| Document upload | Document create after source storage/validation/hash | UPLOAD_DOCUMENT audit; DOCUMENT_UPLOADED feed | No | Yes | Audit required; feed optional | Audit with create in one transaction; feed after commit through helper |
| Document deletion | Delete Document; detach nullable ActivityData relation | DELETE_DOCUMENT audit and workflow history | Yes | No | Existing required deletion evidence | No change; preserve F01 behavior |
| Document download | No business mutation | DOCUMENT_VIEWED feed | N/A | No committed mutation | Optional feed | Use explicit optional helper |
| ActivityData create/manual create | ActivityData with canonical snapshot/provenance | CREATE_ACTIVITY_RECORD audit; feed | No | Yes | Accounting creation audit required; feed optional | Create/snapshot preparation and audit in transaction; feed after commit |
| ActivityData update | Update plus recalculation/projection invalidation | UPDATE_ACTIVITY_RECORD audit after transaction; feed | Snapshot evidence yes, general mutation audit no | Yes | Both accounting audit records required; post-commit feed optional | Extend same transaction through general audit |
| ActivityData delete and bulk delete | Delete rows, including cascade effects | Delete audit; feed | No | Yes | Destructive accounting audit required; feed optional | Atomic deletion/audit; optional feed afterward |
| ActivityData bulk province/facility changes | Update selected rows; existing calculation-state behavior | Bulk-edit audit after transaction; feed | No for general audit | Yes | Required accounting audit; optional feed | Extend same transaction through audit |
| ActivityData clear/reset | Existing multi-table transaction | Clear/reset audit; feed after commit | No for audit | Yes | Required destructive-operation audit; feed optional | Extend existing transaction through audit |
| ActivityData bulk import | Single createMany with prepared snapshots | Informational import feed | No | Yes | Optional feed; business data/provenance are in the insert | Preserve insert semantics; feed best-effort |
| PDF/image/CSV extraction results | Document status plus DocumentExtraction upsert | EXTRACT_DOCUMENT audit; feed | No | Yes | Required extraction evidence; optional feed | Status/result/audit atomic; provider stays outside transaction |
| XLS/XLSX/JSON extraction results | Same structured status/result persistence | EXTRACT_DOCUMENT audit; feed | No | Yes | Required extraction evidence; optional feed | Same atomic treatment; source retry behavior preserved |
| Confirmation/import | ActivityData, staging transitions, Document state | Existing transactional import workflow evidence | Yes | No | Existing required workflow evidence | No change; preserve SELECT FOR UPDATE and transaction isolation |
| Spreadsheet staging | Document, extraction and review-row upserts | Existing transactional DOCUMENT_UPLOADED workflow history | Yes | No | Existing required staging workflow evidence | No change |
| Conversion-factor create/update/delete | ConversionFactor mutation | Governance audit; informational feed | No | Yes | Required governance audit; feed optional | Factor and audit atomic; feed after commit |
| Factor source create/update/archive/delete | Global FactorSource mutation | Source-governance audit | No | Yes | Required | Atomic |
| Factor version create/draft edit | FactorVersion mutation | FactorChangeLog history | No | Yes | Required | Atomic |
| Factor verify/approve | Previous-version deprecation, reviewed status, FactorReviewLog | FactorChangeLog history | No | Yes, including partial governance state | Required | All affected versions, review and change history share one transaction/client |
| Factor deprecate/archive | FactorVersion status change | FactorChangeLog history | No | Yes | Required | Atomic |
| Persisted report create | Report insert | GENERATE_REPORT audit; REPORT_GENERATED feed | No | Yes | Creation audit required; feed optional | Atomic insert/audit; feed after commit |
| Report update/delete | Direct Report update/delete | None | N/A | No post-write event ambiguity | N/A | No change; no new report-history vocabulary |
| Workspace profile/boundary update/review | Organization profile and attestation | Boundary audit and boundary workflow history | No | Yes | Required boundary evidence | All three writes atomic |
| Facilities create/update | Direct Facility write | None | N/A | No | N/A | No change |
| Feedback submit | Feedback insert | FEEDBACK_SUBMITTED feed | No | Yes | Optional | Feed best-effort |
| Feedback/admin status | Direct Feedback update | None | N/A | No | N/A | No change |
| Registration | Organization/user transaction | USER_REGISTERED feed | No | Yes | Informational feed optional | Preserve registration transaction; feed best-effort |
| Login | lastLoginAt update | Existing optional login audit/feed | No, already guarded | Already guarded, except fallback logger could throw | Existing optional authentication telemetry | Preserve classification; bound and protect fallback logging |
| Logout | No separate business-state mutation | Authentication audit, then feed | N/A | No independent committed business mutation | Existing authentication audit retained; feed optional | Keep audit behavior; feed best-effort |
| Reviewer invite/deactivation/regeneration/password setup | Existing account/workspace writes | No post-write audit/feed | N/A | No audit/event ambiguity | N/A | No change; no auth redesign |
| Metric calculation | MetricResult writes and canonical snapshot transitions | Required summary audit after writes | Only per-record snapshot transition was atomic | Yes | Required calculation evidence | Calculation writes and summary audit in one transaction; formulas/matching unchanged |
| Canonical recalculation helper | ActivityData snapshot and MetricResult invalidation | Existing recalculation audit and workflow history | Yes | No | Required accounting evidence | Preserve existing same-client behavior |
| Factor library reads / sample seed helpers / legacy energy helpers | Read adapters or existing writes without post-write events | None relevant | N/A | No additional audited event ambiguity | N/A | No change |
| Activity tracking endpoint itself | The requested event is the primary write | No separate business mutation | N/A | No | Explicit event persistence | Keep errors meaningful; do not turn this endpoint into a no-op on failure |

Implementation

- `AuditLogService.log(input, client)` accepts a transaction client exposing `auditLog`. All affected mutation calls pass `tx`; the writer uses that client, not a hidden global delegate.
- Factor change/review logging and predecessor deprecation propagate the same transaction client. Required history is never downgraded to best-effort.
- `trackOptionalActivity(tracker, input)` awaits the event write and catches rejection. Its warning contains bounded operation/organization/entity identifiers, without metadata, exception contents, source text or credentials. A failure in the warning logger is contained as well. No background promises are introduced.
- Existing transaction-bound confirmation, staging, deletion and recalculation history still use their direct transaction clients. In particular, F05 locking remains before existing-record reads and through commit.
- Upload validation/hash/source handling still occurs before metadata creation. Document create and required audit now commit together. A rollback follows F08's existing rejected-source cleanup path. Optional feed failure after commit returns the Document and retains its source.
- Extraction calls the provider before opening the persistence transaction. Final status, extracted rows and required audit commit together. An evidence failure rolls back that result and retains the source under the existing retryable failure state. Optional feed failure does not change a successfully extracted result to failure.
- Metric persistence now includes the existing required summary audit in the same transaction as result/snapshot writes. Snapshot calculations, factor selection, output values and projection invalidation semantics remain unchanged. The transaction has a 60-second timeout and 10-second maximum acquisition wait; no provider/network operation occurs inside it.

Deterministic validation

`test/mutation-outcomes.e2e-spec.ts` runs against a verified disposable local PostgreSQL database. Its required-audit injector replaces only the selected audit foreign key inside the real transaction client. PostgreSQL executes the business writes, then rejects the actual required evidence INSERT. Follow-up reads prove the business writes rolled back. This is not a unit mock pretending that a transaction rolled back.

The 20 tests cover upload rollback/source cleanup, ActivityData create/update/delete rollback, snapshot/history rollback, report rollback, global factor-source rollback, factor verification/predecessor/history rollback, extraction rollback/source retention, calculation-result rollback, bulk delete/facility/province rollback, source-deletion rollback with imported records preserved, workspace-boundary rollback, and successful upload/ActivityData/report/extraction/import/feedback/registration despite optional feed failure. They also verify existing upload duplicate behavior, observable event failure, and logger failure containment.

The existing F08 fault injections were adapted to the new transaction persistence boundary; their cleanup/retry assertions remain intact. An older audit-log fixture contained plain text labelled PDF; it now has a PDF signature so it tests audit behavior under F08's existing upload validation. Unit mocks were adapted to run transaction callbacks; functional expected values were not changed.

| Final report item | Result |
| --- | --- |
| Committed mutation can return failure solely due to optional telemetry | NO in the audited paths |
| Required audit failure can leave its business mutation committed | NO in the affected transaction-backed paths |
| Required business-audit examples | Accounting creation/change/deletion, factor governance/change/review logs, extraction result history, report creation, boundary attestation, metric persistence |
| Optional telemetry examples | Informational post-commit upload/activity/report/extraction/registration/feedback feeds; existing optional login telemetry |
| Required-audit transaction support | Implemented and verified with real PostgreSQL foreign-key failures |
| Optional-event failure handling | Awaited best-effort helper with bounded warnings and logger-failure containment |
| Document upload fault-injection | PASS |
| ActivityData create/update/delete fault-injection | PASS / PASS / PASS |
| Bulk mutation rollback | PASS |
| Factor governance rollback | PASS, including restored predecessor status and absent review/change history |
| Report mutation | PASS |
| Transaction integration tests | PASS |
| Optional failure observable | YES |
| Unobserved promises introduced | NO |
| F01 | PASS |
| F04 | PASS |
| F12 | PASS |
| F05 | PASS |
| F02/F03/F06 | PASS |
| F07 | PASS; explicit-secret JWT startup/signature tests included |
| F08 | PASS; all 22 resource-boundary API tests and associated unit tests |
| Schema changed | NO |
| Migration added | NO |
| Frontend application changed | NO |
| Calculation logic changed | NO; persistence transaction placement changed |
| Factor values changed | NO |
| Pre-existing electricity factor-ID assertion | UNCHANGED; expectation not modified, unrelated API suite not rerun |
| Relevant unit tests | PASS: 332 tests in 27 suites |
| New API/integration tests | PASS: 20 F09 tests |
| Existing affected API regressions | PASS: 165 tests in 22 suites, across the initial run and targeted rerun of the two corrected suites |
| Backend typecheck | PASS |
| Backend build | PASS |
| Golden A / Golden C / Combined | 579.40 / 2428.44 / 3007.84 PASS through real APIs |
| Field Mapping | 5/5 PASS through real APIs |
| Gasoline | 350 L, 808.50 kgCO2e, Scope 1 PASS |
| Manual Gasoline / Diesel | 115.50 / 268.00 PASS |
| Tracked Water | 18 m3 PASS |
| Partial Confirm | Remaining subset rows 3 → 1 → 0 PASS; repeated confirmation creates zero |

Validation safety and evidence

Database: `carbonlite_f01_test_20261021_1`, verified at loopback port 5432 with `SELECT current_database()`. No remote staging/production database was used. Tests generated synthetic organizations and isolated upload directories. Required failure tests used controlled invalid audit FKs, not outages or schema changes. Governance fixtures were archived before deletion to respect the existing database deletion trigger. The initial harness selected a different module's Prisma instance and its cleanup encountered that trigger; this was corrected, its synthetic fixtures were explicitly cleaned, and the passing runs use the shared PrismaModule client.

Evidence logs: `/private/tmp/carbonlite-f09/focused.log`, `unit.log`, `regressions.log`, `recheck.log`, `golden.log`, `typecheck.log`, `build.log`. The initial regression log records four test-setup failures; `recheck.log` records the corrected suites passing all 27 tests. The other 20 regression suites passed in the initial run. Production source files and prior robustness changes were preserved; unrelated working-tree changes and the pre-existing migration were not edited.

Final read-only cleanup verification: zero remaining F09 synthetic organizations, factors or factor sources; no F08/F09 test, regression or Golden upload directories remain.

Known remaining atomicity risks

- Filesystem and provider work cannot be rolled back by PostgreSQL. Upload compensation removes rejected bytes on known database failure, but process termination or unlink failure can still leave an orphan. This is the existing F08 limitation, not a claim of cross-resource atomicity.
- A provider may incur work/cost before required extraction persistence fails. The source remains retryable. No queue, external delivery guarantee, or provider-side compensation was introduced.
- Lost connections or process termination at the database commit/HTTP-response boundary can still make an outcome uncertain to the client. Existing endpoint idempotency/duplicate semantics remain in force; F09 addresses audit/event-induced false failures rather than universal exactly-once execution.
- Optional feeds can lose individual records after a failed best-effort write. Their failures are observable but are not durably queued for redelivery.
- Concurrent mutation serialization outside the existing confirmation lock remains unchanged. Transactional audit consistency does not add a new global concurrency policy.

Future hardening: endpoint idempotency keys could help with client retries after lost responses if product usage warrants them. An outbox is only warranted if external notifications later require durable delivery. Neither was implemented. No work on F10/F11 or other findings.
