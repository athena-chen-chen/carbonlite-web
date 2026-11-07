# CarbonLite Legal Hold Enforcement Design

**Status:** Locally implemented and synthetically tested; policy and real-data use remain unapproved
**Prepared:** November 5, 2026
**Implementation:** CarbonLite Phase 3E minimum enforcement

## Decision and implemented boundary

Option B is implemented in the local `carbonlite-api` repository: persistent PostgreSQL hold state plus one service-layer deletion guard. The implementation is not a legal case-management system and does not approve the draft policy. It uses the existing platform-administrator authorization pattern, explicit authority/evidence references, and independent activation/release approval fields.

The active database is authoritative for request-time enforcement. Provider consoles, manual SQL/storage access, backup expiry, and restored environments remain outside the application transaction boundary and require the manual controls below.

## Persistent model

Migration `20261105190000_add_legal_holds` adds:

- `LegalHold` for organization/document scope, `PROVISIONAL`, `ACTIVE`, `RELEASE_PENDING`, and `RELEASED` states, effective/review/release timestamps, an opaque unique case reference, authority/evidence references, requester, approver, release requester, release approver, and release operator IDs.
- `LegalHoldDocument` for tenant-tagged document mappings.
- `LegalHoldEvent` for minimized activation, release-request, release-approval, release, and blocked-deletion evidence. It stores an organization hash, opaque case reference, actor ID, authority/evidence reference, operation, target count, and UTC timestamp. It does not store customer payloads, document names, legal narrative, or reasons.

The migration seeds no holds and does not import workbook/register flags. It was applied only to disposable/local development PostgreSQL during verification. Production and staging migration application is not authorized by this work.

Phase 3F migrations `20261105230000_add_recoverable_document_deletion`, `20261105233000_add_deletion_target_reference`, and `20261105234500_preserve_holds_after_erasure` add cascade-independent `DocumentDeletionIntent` recovery records and one-time `DocumentDeletionPurgeReview` evidence. They remove the document foreign key from `LegalHoldDocument` and the organization cascade from `LegalHold`, so hold state/mappings survive logical document and workspace deletion and can still block quarantine purge. Hold activation accepts an organization-owned live document or non-purged recovery intent; an organization hold may also be activated after workspace rows are gone when non-purged recovery bytes remain. These migrations were applied only to the disposable local E2E database.

## Shared enforcement contract

`LegalHoldsService.withDeletionGuard()` is the common destructive-operation boundary. It:

1. opens an interactive PostgreSQL transaction;
2. takes `pg_advisory_xact_lock(hashtextextended(organizationId, 0))`;
3. reads effective blocking holds inside that transaction;
4. resolves document dependencies through `ActivityData.documentId`, `ActivityData.sourceDocumentId`, report-document links, and `MetricResult` activity/factor links;
5. performs the destructive callback before the transaction releases the organization lock; and
6. denies with HTTP `409` and `{ "code": "LEGAL_HOLD_ACTIVE", "message": "Deletion is temporarily restricted." }` without returning case or authority details.

`PROVISIONAL`, `ACTIVE`, and `RELEASE_PENDING` block. `RELEASED` does not block. An organization hold blocks every covered operation. A document hold blocks direct document deletion, dependent activity/report/custom-factor deletion, mixed bulk requests, and organization/workspace erasure. Hold-query or dependency-query errors prevent the destructive callback from running.

## Covered paths

| Path | Implemented enforcement |
| --- | --- |
| Document deletion and source bytes | A locked `PREPARED` deletion intent is committed first. A second locked/hold-checked transaction idempotently renames bytes to private same-volume quarantine, deletes DB metadata, and commits `PENDING_PURGE`. |
| Activity deletion | Target IDs and document/source-document provenance resolved under lock. |
| Both bulk activity endpoints | Both call the same atomic guarded method; one held row rejects the entire batch. |
| Admin clear | Guarded as all-activity deletion; organization holds and relevant document holds block. |
| Demo reset | Guarded across all activity, document, extraction, and report-reset effects. |
| Report deletion | Guarded; document-specific scope resolves linked documents. Managed `/uploads/` artifacts use recoverable quarantine; unsupported external artifacts block deletion. |
| Custom conversion-factor deletion | Guard resolves metric results to held activity/document provenance. System/global factor governance is unchanged. |
| Provisioning cleanup | Candidate sample activity/report IDs are fixed before guarded deletion and re-used in the transaction. |
| Golden-sample repair/force paths | Login/invitation service paths and the operator seed script call the guard; direct helper callers are not an approved destructive interface. |
| Workspace erasure/retry | Locked inventory creates durable intents; a second locked pass catches concurrent uploads, quarantines every managed file, deletes the organization, preserves recovery metadata, and commits `PENDING_PURGE`. |

Temporary upload compensation and storage-health probe cleanup are intentionally outside legal-hold scope because no accepted `Document` exists. Global factor-source deletion and metric projection replacement remain governed separately and require legal/privacy scoping if a matter includes them.

## Administration and authority

The minimal API is under `admin/legal-holds` and uses `JwtAuthGuard` plus `PlatformAdminGuard`:

- `POST /api/admin/legal-holds/activate`
- `GET /api/admin/legal-holds/organization/:organizationId`
- `POST /api/admin/legal-holds/:id/release-request`
- `POST /api/admin/legal-holds/:id/release-review`
- `POST /api/admin/legal-holds/:id/release`

Activation is performed by the authenticated active platform-admin approver and requires a different active requester, authority reference, scope, and (for document scope) organization-owned document IDs. Release requires `RELEASE_PENDING`, an independently authenticated platform-admin review by someone other than the release requester, and then a release operator different from both requester and approver. Release changes only hold state; it does not delete data or authorize retention purge.

The code proves platform authorization and separation of IDs. It cannot prove that a person is the owner-designated legal/privacy authority. The owner approval record and restricted authority evidence therefore remain mandatory.

## Concurrency and physical-storage limitations

Activation, release, and covered deletions use the same transaction-scoped advisory lock. If activation acquires the lock first, later deletion observes the hold. If an already-authorized deletion acquires it first, activation becomes effective only after that operation commits or rolls back. Bulk deletion executes once under the lock and cannot split held/unheld targets.

Filesystem operations remain non-transactional with PostgreSQL. Phase 3F reduces the rollback risk by persisting the intent before movement and retaining the only copy in same-volume private quarantine after DB commit. A DB rollback after rename leaves a `PREPARED` intent, live metadata, and a retryable quarantine copy. Permanent unlink is a separate platform-admin operation requiring an exact dry-run token, lock/hold recheck, and consistent `PENDING_PURGE` state. A purge unlink followed by DB rollback is still non-atomic and requires reconciliation; the implementation does not claim otherwise.

Upload metadata acceptance uses the same organization advisory lock, preventing a new committed file from appearing between final workspace inventory and organization deletion. Reconciliation is manual/read-only; no automatic retention scheduler was added.

## Recovery and restored-hold reconciliation

A database restore can revert hold state and blocked-deletion evidence. Every restored environment must remain isolated and inaccessible while operators:

1. compare restored `LegalHold`/`LegalHoldEvent` state with the restricted external case register and operational evidence;
2. re-enter any later provisional/active/release-pending hold through the authorized activation workflow;
3. compare restored deletion intents with active and quarantine storage and flag any active copy that reappears for `PENDING_PURGE`/`PURGED` state;
4. replay authorized deletions completed after the recovery point only after hold/authority review;
5. reconcile document keys and report artifacts against the paired storage recovery point;
6. verify organization isolation, held-object counts, and blocked API behavior with synthetic checks; and
7. obtain infrastructure and independent-reviewer approval before access.

No external append-only hold/deletion ledger or provider restore automation was implemented. Repository evidence does not verify actual Neon/Render backup configuration or a paired isolated restore. These remain P0 for a real-data pilot.

## Verification

Focused unit tests cover organization/document decisions, dependency resolution, unrelated targets, stable confidential error output, fail-closed DB errors, private/idempotent quarantine, traversal/symlink denial, document orchestration, workspace erasure partial failure/retry, activity/admin reset behavior, and protected sample-data callers.

Focused PostgreSQL E2E tests cover unauthorized activation/release, organization and document holds, bytes remaining after denial, activity and both bulk verbs, admin clear, recoverable document/report deletion, rollback after quarantine, duplicate requests, confirmed-record/draft/quota semantics, read-only reconciliation, later holds protecting queued bytes, exact manual purge, custom factor deletion, provisioning cleanup, workspace erasure, unrelated organizations, release-without-deletion, and serialized activation/deletion.

## Readiness

- **Code readiness for the implemented application paths:** `GO` for local review and synthetic rehearsal.
- **Real-data pilot:** `NO-GO` until owner/legal/privacy approval, named authority assignments, provider/operator access inventory, paired backup evidence, external restored-hold/deletion reconciliation evidence, and an isolated restore exercise close the remaining P0s.
