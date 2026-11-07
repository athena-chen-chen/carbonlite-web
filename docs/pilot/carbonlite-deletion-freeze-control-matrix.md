# CarbonLite Deletion Freeze Control Matrix

**Evidence date:** November 6, 2026

**Scope:** local `carbonlite-web` documentation and sibling `carbonlite-api` Phase 3E implementation
**Classification:** `PROTECTED` means the application path uses the shared PostgreSQL-backed legal-hold guard. `LIMITED` means application protection exists but a related lifecycle gap remains. `MANUAL/UNKNOWN` is outside verified application enforcement.

## Implemented deletion-path coverage

| Classification | Path | Guard target resolution | Concurrency/storage behavior | Synthetic evidence | Remaining limitation |
| --- | --- | --- | --- | --- | --- |
| PROTECTED | `DELETE /api/documents/:id` | Organization hold or mapped document ID | Guarded `PREPARED` intent; same-volume private quarantine; metadata delete; `PENDING_PURGE` commit | Organization/document hold denial; bytes remain; race test; recoverable-deletion E2E | Filesystem movement is not transactionally atomic with PostgreSQL; reconciliation remains required after failure |
| PROTECTED | `DELETE /api/activity-data/:id` | Activity `documentId` and `sourceDocumentId` | One guarded transaction | Held provenance denied | None identified in application path |
| PROTECTED | `POST` and `DELETE /api/activity-data/bulk-delete` | Every requested activity dependency | Whole request executes once under lock | Both verbs; mixed held/free batch deletes nothing | None identified in application path |
| PROTECTED | `DELETE /api/admin/activity-records/clear` | Organization hold or any held-document activity | All activity/metric deletion under lock | Admin clear denied | None identified in application path |
| PROTECTED | `POST /api/admin/demo-data/reset` | Organization hold or any held activity/document/report dependency | All DB effects under lock | Unit regression plus shared guard | Existing path deletes Document rows without physical-file cleanup; keep disabled for paid pilot |
| PROTECTED | `DELETE /api/reports/:id` | Organization hold or report linked to held document | Managed `/uploads/` artifact uses guarded recoverable quarantine; unsupported external artifact fails closed | Held report denied; managed artifact quarantine and external denial E2E | A supported adapter/inventory for external report artifacts remains P1 |
| PROTECTED | `DELETE /api/conversion-factors/:id` | Metric result → activity → held document | Factor ownership and delete under lock | Dependent custom factor denied | Global factor sources are separately governed |
| PROTECTED | `POST /api/admin/customer-provisioning/golden-sample-cleanup` | Fixed candidate activity/report IDs | Candidate set is reused in guarded transaction | Provisioning cleanup denied | No physical documents are deleted by this path |
| PROTECTED | Golden-sample login/invitation repair and operator seed/force script | All sample activity/report dependencies | Existing transaction is locked, or shared guard opens one | Auth/sample unit regression | Exported low-level helper is not an approved destructive interface; architecture review must prevent new direct callers |
| PROTECTED | `POST /api/admin/workspace-erasure/erase` and retry | Any organization or document hold | Inventory, managed storage, DB cascade, and audit execute during one advisory-lock transaction | Document hold denies erasure; failure/retry units | External storage rollback is impossible; manual reconciliation required after DB failure |
| PROTECTED | Manual quarantine purge | Organization hold or later document hold against surviving recovery bytes | Exact reviewed candidate IDs, approval token, hold recheck, and purge under advisory lock | Unauthorized purge denied; later hold blocks purge; exact unheld set purged; unrelated organization unaffected | Direct filesystem access remains outside the application guard and is P0 for real data |
| OUT OF SCOPE | Failed-upload compensation, multipart temporary files, storage health probes | No accepted `Document` exists | Hygiene cleanup only | Existing storage lifecycle tests | Incident-specific transient preservation would need a separate override |

## Administration coverage

| Operation | Endpoint/control | Authority/evidence rule | Test evidence |
| --- | --- | --- | --- |
| Activate organization/document hold | `POST /api/admin/legal-holds/activate` | Authenticated platform-admin approver; different active requester; authority reference; tenant-owned document mappings | Unauthorized and forged-approval activation denied |
| List hold state | `GET /api/admin/legal-holds/organization/:organizationId` | Platform admin only | Guarded controller pattern/build verification |
| Request release | `POST /api/admin/legal-holds/:id/release-request` | Platform admin; moves to blocking `RELEASE_PENDING` | Unauthorized request denied |
| Review release | `POST /api/admin/legal-holds/:id/release-review` | Authenticated platform-admin approver different from release requester | Premature release denied; independent review tested |
| Release | `POST /api/admin/legal-holds/:id/release` | Release operator different from requester and authenticated approver | Unauthorized release denied; authorized release tested |
| Post-release deletion | No automatic action | `RELEASED` only removes the technical freeze | Hold release leaves rows and bytes intact |

## Concurrency decision

All covered hold transitions and destructive paths call the same organization-keyed `pg_advisory_xact_lock(hashtextextended(organizationId, 0))`. The hold read and destructive DB callback share the transaction. The E2E race holds the organization lock, queues activation, queues document deletion, then releases the lock; activation commits first and deletion returns `409 LEGAL_HOLD_ACTIVE` with bytes and metadata intact.

This is serialization, not atomic DB/filesystem deletion. If a deletion already owns the lock, a new hold becomes effective only after that operation completes. If physical deletion succeeds but DB commit fails, the application cannot restore bytes automatically.

## Manual/unknown paths and readiness gaps

| Classification | Path | Required control | Priority |
| --- | --- | --- | --- |
| MANUAL/UNKNOWN | Provider jobs, direct SQL, storage shell, provider lifecycle rules | Inventory and restrict credentials/jobs; two-person change control; synthetic evidence | P0 for real data |
| MANUAL/UNKNOWN | Backup expiration and restore | Isolated restore; reapply later holds; replay later deletions; reconcile paired DB/storage; independent approval | P0 for real data |
| MANUAL/UNKNOWN | External authoritative hold/deletion ledger | Maintain restricted register/evidence until append-only reconciliation mechanism exists | P0 for real data |
| LIMITED | Global `FactorSource` deletion | Legal/privacy scoping and platform-admin governance | P1 unless a matter includes global sources |
| LIMITED | Metric projection replacement/recalculation | Suspend if approved scope requires immutable projections; snapshots/audit retain prior evidence | P1 |
| LIMITED | Individual report artifact lifecycle | Define managed artifact delete/orphan reconciliation | P1 |
| LIMITED | New destructive paths | Add static/architecture enforcement so direct Prisma/storage deletors cannot ship without review | P1 |

## Evidence conclusion

The inspected application paths listed as `PROTECTED` share a fail-closed backend decision point and real PostgreSQL serialization. On November 6, 2026, 44 focused unit tests and 12 focused PostgreSQL E2E tests passed against a loopback disposable database and isolated synthetic storage. This is sufficient for local technical review and continued synthetic rehearsal. It is not sufficient for operational or real-data use because policy/authority approval, human role assignment, provider/operator bypass inventory, production deployment, paired recovery evidence, restored-hold reconciliation, and external ledger controls remain incomplete.
