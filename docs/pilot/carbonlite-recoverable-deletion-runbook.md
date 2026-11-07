# CarbonLite Recoverable Deletion Runbook

**Status:** Local Phase 3F implementation; owner/legal and real-data use remain unapproved
**Prepared:** November 5, 2026
**Scope:** Filesystem-backed source documents and managed `/uploads/` report artifacts

## Implemented architecture

CarbonLite uses a persistent PostgreSQL deletion intent plus a private quarantine on the same durable filesystem as `DOCUMENT_STORAGE_PATH`. This is the minimum safe design for the current Render persistent-disk deployment. It does not require S3/R2 or pretend that PostgreSQL and the filesystem share an atomic transaction.

Option A (rename followed by immediate unlink) was rejected because a crash or DB rollback could still destroy the only copy. Option C (immutable/versioned object storage) is stronger at provider scale but would introduce an unapproved storage migration. The implemented Option B preserves an accountable, retryable record before moving bytes and never purges automatically.

## State transitions

| Register state | Storage/database meaning | Permitted next action |
| --- | --- | --- |
| No intent | Live `Document`/managed report may reference an active file. | Create `PREPARED` under the organization lock. |
| `PREPARED` | Durable intent exists. Active bytes may still exist, or an interrupted attempt may already have moved them to quarantine. The customer database row still exists. | Re-lock, recheck Legal Hold and ownership, then idempotently quarantine and commit DB deletion; or reconcile. |
| `PENDING_PURGE` | DB deletion committed and the recoverable file is expected only in quarantine. | Manual review, reconciliation, and explicitly authorized purge. |
| `PURGED` | A reviewed manual purge removed the quarantine file and committed the register update. | Retain minimized evidence under the unapproved evidence-retention decision. |
| `RECONCILIATION_REQUIRED` | Required bytes or metadata were missing/inconsistent. | Stop destructive work; investigate and repair through an approved recovery procedure. |

`ACTIVE` and `QUARANTINED` are physical conditions, not additional database states. This avoids transient states that cannot be committed atomically with a filesystem rename.

## Normal document deletion

1. Authenticate the tenant user and derive the organization from the trusted user context.
2. In a PostgreSQL transaction, take the Phase 3E organization advisory lock, recheck ownership and Legal Hold, and commit a `PREPARED` `DocumentDeletionIntent`.
3. Start a second locked transaction and recheck the hold.
4. Validate the active and quarantine paths, reject traversal/symlinks, and rename the regular file into `.quarantine/<intent-id>/<opaque-name>` on the same managed filesystem.
5. Delete the `Document` row. Existing cascades remove extraction and spreadsheet-review drafts; `ActivityData.documentId` becomes null and confirmed accounting records/copies of provenance remain.
6. Set the intent to `PENDING_PURGE` in the same DB transaction and write minimized audit/activity evidence. Do not include source content, extracted data, or filenames.
7. Treat a duplicate request as success when the same intent is already `PENDING_PURGE` or `PURGED`. A release of a Legal Hold does not execute or resume deletion.

Quota usage is append-only: source deletion does not delete or decrement `OrganizationQuotaUsage`; its nullable document link may be cleared.

## Failure and recovery matrix

| Failure point | Durable result | Required response |
| --- | --- | --- |
| Before intent commit | Active file and DB row remain. | Retry the authenticated request. |
| After intent commit, before rename | `PREPARED`; active file remains. | Retry; rename is idempotent. |
| Rename/storage-full/read-only failure | `PREPARED`; active file normally remains. | Stop, inspect capacity/mount health, then retry. Do not manually unlink. |
| Crash after rename, before DB commit | `PREPARED`; DB row remains; quarantine copy exists. | Retry. The adapter recognizes the existing quarantine copy. |
| DB statement/commit rollback after rename | Same as above; the DB cannot roll back the rename. | Retry or run reconciliation. The only copy has not been purged. |
| Crash after DB commit | `PENDING_PURGE`; quarantine copy exists. | No customer-visible source row; reconcile, then await separately authorized manual purge. |
| Both active and quarantine copies exist | Inconsistent restore/copy state. | Stop and reconcile; never select one by timestamp automatically. |
| Neither active nor quarantine copy exists | Intent becomes or is reported as `RECONCILIATION_REQUIRED`. | Incident/recovery review; no purge. |
| Manual unlink succeeds but purge DB transaction fails | Intent can remain `PENDING_PURGE` while quarantine is missing. | Reconciliation and incident evidence; do not claim atomic purge. |

## Workspace erasure

The platform-admin workflow keeps exact ID/slug confirmation, dry-run inventory, Legal Hold enforcement, and the block on unsupported external report artifacts. Its physical-file behavior changes as follows:

1. Under the organization lock, rebuild inventory and commit `PREPARED` intents for every document file and managed report artifact.
2. Re-lock, rebuild inventory to catch uploads that committed before the lock, create any additional intents, and recheck the hold.
3. Idempotently quarantine every managed file. A missing/inconsistent file fails closed and leaves organization data intact.
4. Delete the organization, transition surviving recovery records to `PENDING_PURGE`, and write the minimized hashed completion audit in one DB transaction.

Upload metadata acceptance now takes the same organization advisory lock. An upload that saved bytes but has not committed metadata cannot race a completed erasure: it either commits first and is inventoried, or its later DB insert fails and unaccepted-upload compensation removes the unreferenced active copy while the temporary staging copy still exists.

Recovery records have no organization/document/user foreign keys and therefore survive workspace cascades. Legal Hold rows also no longer cascade with organization deletion, so an authorized organization/document hold can continue protecting, or later be activated against, non-purged recovery bytes. Partial quarantine movement can be safely retried because each destination is deterministic.

## Manual purge authorization

There is no startup purge, scheduled purge, or age-triggered retention worker.

1. Run `POST /api/admin/storage-reconciliation/report` as a platform admin and resolve every inconsistency for the candidate organization.
2. Confirm owner/legal authority, hold status, backup implications, customer notice, and the exact candidate intent IDs outside the application. These decisions are not approved by this document.
3. Call `POST /api/admin/storage-reconciliation/purge/dry-run` with unique exact `candidateIds`. The service rechecks state, storage consistency, and Legal Hold, then returns a one-time token valid for 15 minutes and records minimized review evidence.
4. Independently compare the returned IDs/count with the approved list.
5. Call `POST /api/admin/storage-reconciliation/purge` with the identical sorted candidate IDs, token, and `confirmPurge: true`. Candidates must belong to one organization.
6. The service re-takes the organization lock, rechecks Legal Hold and recovery state, unlinks each exact quarantine file (never a recursive directory), commits `PURGED`, consumes the review token, and records a count/digest audit.

Do not purge `PREPARED`, `RECONCILIATION_REQUIRED`, already missing, restored-active, mixed-organization, unreviewed, expired-token, or held candidates.

## Capacity monitoring for the 1 GB disk

Quarantine retains full file bytes until manual purge, so deletions do not immediately free capacity. Before enabling real data, infrastructure must define alerts and an escalation threshold for the actual persistent disk. At each manual review:

- record total, used, free, active, and quarantine bytes without collecting filenames/content;
- stop uploads and deletion transitions before the filesystem reaches a level at which directory creation or rename metadata can fail;
- investigate unexpected active/orphan/quarantine growth through the reconciliation report; and
- never solve capacity pressure by broad `rm`, deleting the quarantine tree, or bypassing Legal Hold review.

No repository evidence verifies a production 1 GB alert, independent file backup, or capacity runbook automation.

## Restore handling

A restored database and restored disk may have different recovery times. Keep the environment isolated. Compare the deletion-intent register, Legal Holds, active files, and quarantine entries by identity—not solely by modification time. Reapply later holds from the restricted register, flag active files that reappear for `PENDING_PURGE`/`PURGED` intents, replay authorized deletions only after independent approval, and do not expose the environment until reconciliation passes.

## Deployment prerequisites and stop conditions

Apply migrations `20261105230000_add_recoverable_document_deletion`, `20261105233000_add_deletion_target_reference`, and `20261105234500_preserve_holds_after_erasure` before deploying code, after the Phase 3E migration. The last migration removes the organization FK cascade from `LegalHold`; application authorization and the organization advisory-lock key remain mandatory. Confirm `DOCUMENT_STORAGE_PATH` is the durable mounted path and `.quarantine` is on that same filesystem. Do not copy quarantine into a web-served/static directory.

Stop and keep the real-data pilot **NO-GO** for any missing migration, unavailable advisory lock, inaccessible/read-only/full mount, reconciliation finding, unverified hold, unsupported external artifact, unmatched restore pair, or absent owner/legal authorization.
