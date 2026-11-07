# CarbonLite Storage Reconciliation

**Status:** Local Phase 3F control; operational approval pending
**Prepared:** November 5, 2026

## Purpose and access

The read-only reconciliation service compares live PostgreSQL metadata, the persistent deletion register, active document storage, and the private quarantine. It is exposed only through `POST /api/admin/storage-reconciliation/report` behind JWT and the existing platform-admin guard. An optional `organizationId` narrows database results; filesystem enumeration remains global so cross-tenant orphan storage cannot be hidden by a bad DB row.

The response contains opaque IDs, organization/storage-key hashes, timestamps, status/reconciliation codes, and counts. It does not return file content, extracted data, customer filenames, case reasons, or Legal Hold authority evidence. `mutated: false` is asserted by the implementation and tests; the report does not repair, move, delete, or relink data.

## Findings

| Finding | Meaning | Required action |
| --- | --- | --- |
| `databaseReferencesMissingBytes` | A live `Document.fileUrl` has no active regular file. | Stop deletion/download claims; check for a `PREPARED` quarantine copy, restore pair, or incident. |
| `reportReferencesMissingBytes` | A managed report artifact reference has no active file. | Stop report deletion/erasure completion and reconcile the artifact. |
| `activeFilesWithoutDatabaseReferences` | Active managed bytes are not referenced by a live document or managed report. | Determine whether this is interrupted upload compensation, restored data, or an orphan; do not unlink broadly. |
| `quarantineEntriesWithoutIntent` | Private quarantine bytes lack a matching register row. | Preserve bytes, investigate DB restore/corruption, and create approved recovery evidence before any action. |
| `overduePendingDeletions` | `PENDING_PURGE` has exceeded the current seven-day review signal. | Review; this is not automatic purge eligibility and does not establish an approved retention period. |
| `holdProtectedPendingDeletions` | An effective organization or document hold protects a queued copy. | Remove it from every purge proposal; escalate any attempted purge. |
| `restoreMismatches` | Active bytes reappeared for a pending/purged intent, or bytes remain after a purged register state. | Keep restore isolated and reconcile the paired recovery points and external deletion register. |
| `reconciliationRequired` | The application already recorded an inconsistent transition. | Stop destructive operations for the target and follow incident/recovery review. |

Filesystem enumeration rejects symlinks rather than following them. Normal `save`, `read`, `exists`, `delete`, and download operations reject `.quarantine` keys. Active/quarantine paths must be relative, remain within the configured root, and resolve through non-symlink components. Quarantine files must be regular files.

## Review procedure

1. Confirm the environment and database are the intended isolated/local or authorized deployment. Never point local reconciliation at production/provider resources without separate authorization.
2. Confirm migrations and the configured durable storage root.
3. Record an opaque review reference, UTC time, operator, environment, and optional organization scope.
4. Run the report. Preserve the structured result in the approved restricted evidence location; do not copy customer content.
5. Compare live Legal Holds and the restricted external hold/deletion registers.
6. For every finding, establish whether DB or file state is older/newer using paired recovery-point evidence. Do not resolve solely from filesystem `mtime` because restored copies can carry different timestamps.
7. Resolve `RECONCILIATION_REQUIRED`, missing bytes, orphan quarantine, and restore mismatches before proposing purge.
8. Repeat the read-only report and require an independently reviewed zero/unexplained-finding result for the intended candidate set.
9. If purge is authorized, follow the exact-ID dry-run/token/execute procedure in `carbonlite-recoverable-deletion-runbook.md`.

## Recovery cases

- **`PREPARED`, active exists, quarantine absent:** safe retry candidate after ownership/hold recheck.
- **`PREPARED`, active absent, quarantine exists:** interrupted post-rename transaction; safe idempotent retry after hold recheck.
- **Live DB row, active absent, matching quarantine exists:** do not restore or delete manually; retry the registered operation or use an approved restoration procedure.
- **`PENDING_PURGE`, quarantine exists, active absent:** expected recoverable state; manual purge still requires approval and exact dry-run.
- **`PENDING_PURGE`, active exists:** likely restore mismatch; stop and reconcile.
- **`PENDING_PURGE`, quarantine absent:** possible interrupted purge or external deletion; incident/reconciliation required.
- **`PURGED`, any active/quarantine copy exists:** restored or externally copied data; isolate and reconcile before access.
- **Quarantine without intent:** preserve it. A DB restore may have removed the register row while the disk remained newer.

## Limitations and open risks

- PostgreSQL commit, filesystem rename, and filesystem unlink are not atomic together.
- The report is manual and can be expensive as storage grows; no scheduler was introduced.
- The current filesystem adapter assumes the configured active root and `.quarantine` share a mount. This must be verified in the deployment.
- No independent file backup, paired Neon/Render recovery point, isolated provider restore, or external append-only deletion ledger is proven.
- Manual/provider filesystem or SQL access can bypass application controls and must remain restricted/audited.
- Quarantine consumes persistent-disk capacity until reviewed purge.
- Seven days is an operational review signal only, not an approved retention deadline.

These are P0 for real-data restore/deletion assurance unless explicitly closed by owner, infrastructure, privacy, and legal evidence.
