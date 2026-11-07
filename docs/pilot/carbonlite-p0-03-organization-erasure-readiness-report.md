# CarbonLite P0-03 Organization Erasure Readiness Report

**Prepared:** November 6, 2026

**Scope:** Disposable local synthetic organization-erasure rehearsal, evidence review, and owner-readiness assessment

**Master TODO:** `DAT-002` (partial evidence only)

**Evidence level:** `DOCUMENTED` and `LOCAL_TESTED` as bounded below

**Real customer data:** **NO-GO**

This report does not record a human approval, legal/privacy approval, operational sign-off, provider verification, production deployment, or permission to process real customer data. Synthetic platform identities exercised technical authorization paths only. They did not act as real approvers.

## 1. Rehearsal outcome

The existing Phase 3E Legal Hold, Phase 3F recoverable-deletion, workspace-erasure, and storage-reconciliation controls passed the focused local suites used for this rehearsal:

- **24 of 24 focused unit tests passed** across document storage/deletion, workspace erasure, and Legal Hold enforcement.
- **12 of 12 focused PostgreSQL E2E tests passed** across Legal Holds and recoverable deletion.
- The E2E suites used the explicit disposable loopback database `carbonlite_e2e` and isolated storage root `/tmp/carbonlite-p0-03-e2e.R4ae62`.
- No Neon, Render, AWS, staging, production, deployment, migration, provider API, or real customer data was used.

This is a composite technical rehearsal. The actual PostgreSQL E2E workspace-erasure endpoint returned `ERASED` for a synthetic organization after its source document had already entered recoverable quarantine and verified that the recovery intent survived. The workspace service unit suite separately asserted direct active-file inventory, quarantine, organization-row deletion, audit creation, tenant isolation, failure, and retry. There is no dedicated full-stack test that directly asserts the organization row and still-active source file are removed/moved by workspace erasure itself. That missing focused E2E case is recorded below and prevents an unqualified end-to-end claim.

## 2. Safety boundary

| Boundary | Rehearsal setting | Result |
| --- | --- | --- |
| Database | Explicit `postgresql://...@127.0.0.1:5432/carbonlite_e2e`; repository guard permits only loopback and recognized disposable database names | **PASS** |
| Filesystem | Fresh isolated `/tmp/carbonlite-p0-03-e2e.R4ae62` | **PASS** |
| Data | Generated synthetic users, organizations, documents, reports, holds, deletion intents, and evidence references | **PASS** |
| Providers | No Neon, Render, AWS, staging, production, or other provider access | **PASS** |
| Human authority | No person was represented as having approved erasure | **PASS** |
| Repository changes | Documentation and tracker changes only; no application code, migration, deployment, or push | **PASS** |

## 3. Verification matrix

| Requested control | Evidence performed | Result | Boundary / missing control |
| --- | --- | --- | --- |
| 1. Organization authority and approval gates | Unit tests denied ordinary and tenant-admin actors, denied erasure of the operator's active workspace, and required exact organization ID, slug, and `confirmErase: true`. Controller also uses authenticated platform-admin guards. | **TECHNICAL PASS** | Customer-request identity and authority verification are manual and unapproved. Platform-admin possession is not human erasure approval. |
| 2. Dry-run deletion inventory | Unit test built the shared inventory without storage mutation, transaction, or audit write. Inventory covers users, memberships, facilities/assets, documents/files, extraction/review rows, activities/snapshots/imports, metrics, reports/artifacts, AI jobs, custom factors, audit, feedback, and activity events. | **PASS at service level** | No dedicated API-level dry-run assertion was run for workspace erasure. Provider and backup inventories are outside the local service inventory. |
| 3. Active Legal Hold blocks erasure | E2E test activated a synthetic hold, called workspace erasure, received confidential `409 LEGAL_HOLD_ACTIVE`, and retained the protected organization/file path. Another-organization deletion remained available. | **E2E PASS** | Direct provider, SQL, shell, backup, and filesystem operator bypasses remain unverified. |
| 4. Independent approval requirements | Legal Hold activation E2E required platform authority and a requester/approver separation. P0-01/P0-02 runbooks require an independent reviewer before erasure. | **FAIL for erasure enforcement** | The workspace-erasure API itself has no signed approval packet, second-person reviewer identity, approval expiry, or exact-operation token. A platform admin with confirmations can erase. No human sign-off was simulated or claimed. |
| 5. Database and filesystem deletion | Service tests asserted target files are routed through recoverable quarantine, the target organization row is deleted transactionally, and global factors remain. The E2E endpoint returned `ERASED` and verified recovery records survive. | **COMPOSITE PASS / E2E GAP** | The current E2E case does not directly assert organization-row absence or erase an organization containing a still-active file; it starts with already-quarantined recovery bytes. Quarantine is intentionally retained, so this is not immediate physical purge. |
| 6. Quarantine and deletion intents | Unit tests verified workspace intents are prepared, physical files are quarantined, and `PREPARED` intents become `PENDING_PURGE`. E2E verified a `PENDING_PURGE` intent survives organization erasure and a later hold blocks purge. | **COMPOSITE PASS** | Workspace-level intent transition for an active file is not asserted in a dedicated E2E test. Permanent purge remains a separate reviewed operation. |
| 7. Cross-tenant isolation | Unit tests verified no tenant-B storage key or organization delete is touched. Legal Hold and purge E2E tests verified unrelated organizations remain unaffected. | **PASS** | Production/provider access boundaries remain unverified. |
| 8. Partial failure and retry | Unit tests injected storage exhaustion, missing active/quarantine copies, and database failure after quarantine movement. Database deletion was retained or rolled back; retry completed idempotently. E2E verified rollback after document movement leaves a traceable `PREPARED` intent and succeeds on retry. | **PASS** | No process-crash or provider-outage rehearsal occurred. |
| 9. Recovery reconciliation requirements | E2E reconciliation reported missing bytes, orphan quarantine, and restore mismatch without mutation; post-erasure recovery bytes could be protected by a later hold. Runbooks require isolated restore, external ledger comparison, deletion replay, and independent release. | **PARTIAL** | External non-rollback authority, paired provider backups, expiry proof, isolated provider restore, and replay are not implemented/verified. |
| 10. Evidence and audit trail | Unit tests asserted minimized out-of-tenant completion/failure audits using organization-ID hash, actor, status, timestamps, counts, and quarantined-file count. Persistent intents provide retry evidence. | **PARTIAL** | No approved deletion-request case system, append-only external evidence store, custody policy, retention period, or human approval record exists. The focused E2E erasure does not independently assert the completion-audit payload. |

## 4. Exact validation performed

### Focused unit suites

```bash
pnpm test:unit -- src/documents/documents.service.storage.spec.ts src/workspace-erasure/workspace-erasure.service.spec.ts src/legal-holds/legal-holds.service.spec.ts
```

Result: **3 suites passed; 24 tests passed; 0 failed**.

The workspace-erasure suite's 11 tests covered:

1. non-mutating comprehensive dry run;
2. ordinary/tenant-admin denial before target lookup;
3. active-workspace self-erasure denial;
4. exact ID, slug, and destructive confirmation;
5. target quarantine and organization deletion while preserving global factors;
6. tenant-B database/filesystem isolation;
7. storage-exhaustion fail-closed behavior;
8. active-and-quarantine-missing fail-closed behavior;
9. database failure after recoverable movement and idempotent retry;
10. explicit already-erased response; and
11. unknown-workspace fail-closed behavior.

Expected error logs for synthetic `ENOSPC`, missing-copy reconciliation, and database-unavailable injections appeared during the passing tests. They are evidence of the failure branches, not failed tests.

### Focused PostgreSQL and filesystem E2E suites

```bash
DATABASE_URL='postgresql://carbonlite:carbonlite@127.0.0.1:5432/carbonlite_e2e' \
DOCUMENT_STORAGE_PATH='/tmp/carbonlite-p0-03-e2e.R4ae62' \
NODE_ENV='test' \
pnpm test:e2e -- test/legal-holds.e2e-spec.ts test/recoverable-deletion.e2e-spec.ts
```

Result: **2 suites passed; 12 tests passed; 0 failed**.

The E2E evidence covered platform authority and independent Legal Hold approval, organization/document holds, workspace-erasure denial under hold, dependent deletion paths, unrelated-tenant behavior, concurrent hold/delete serialization, recoverable file quarantine, rollback/retry, managed versus external report artifacts, read-only reconciliation, purge authority/hold checks, exact purge isolation, actual synthetic organization erasure, persistent recovery intent, and a post-erasure hold on surviving recovery bytes.

Application build was not run because no application code changed.

## 5. Required operational packet before any erasure

The operator must stop unless a restricted, independently reviewed packet contains all of the following:

- opaque deletion-request/case ID and verified requester identity;
- verified authority over the exact organization and exact requested scope;
- exact organization ID and slug, with a second-source tenant match;
- approved Legal Hold query result and any legal/contract exception disposition;
- dry-run inventory, expected retained classes, provider stores, recovery pairs, and hashes;
- named technical operator and a different named independent reviewer;
- dated, unexpired approval binding the exact target, inventory, method, release SHA, and recovery state;
- customer communication and timing authorization where applicable;
- pre-erasure backup/restore and recovery-reconciliation disposition;
- failure/rollback owner, escalation channel, and STOP conditions;
- post-erasure database, active storage, quarantine, audit, tenant-isolation, provider, backup-expiry, and restore-replay evidence; and
- closure authority that distinguishes active-system completion from quarantine and backup expiry.

No current local API response or synthetic test supplies this human packet.

## 6. Missing controls and gaps

### P0

- `OWN-001`: a founder-related Independent Business Reviewer candidate has been identified, but formal appointment, identity verification, conflict disposition, training, protected individual access, operational approval, backup coverage, and independent recovery roles are not assigned.
- `RET-002`, `LGL-002`, and `DEL-002`: retention, hold, deletion, erasure, backup-expiry, evidence, and communication rules remain unapproved. P0-01 and P0-02 remain `READY_FOR_REVIEW`.
- Workspace erasure does not technically enforce a second-person signed approval, approval expiry, or approval-to-operation binding.
- `INF-001` and `IAM-001`: direct provider, database, shell, disk, CI/CD, backup, and recovery bypasses are unverified/unrestricted by evidence.
- `REC-005` through `REC-007` and `BAK-002` through `BAK-004`: no external non-rollback authority, verified paired backup, expiry proof, isolated provider restore, or post-restore deletion replay exists.
- `REL-001` through `REL-004`: release SHA/migration evidence, approval, deployment, and production-safe verification are incomplete.
- The approved evidence-retention period, restricted case store, and append-only audit/evidence custody process do not exist.

### P1 / conditional P0

- Add a dedicated full-stack E2E case that dry-runs and erases a synthetic organization containing a still-active source file and managed report artifact, then asserts database cascades, active-path absence, quarantine/intents, minimized audit, and unrelated-tenant preservation.
- Add process-crash/restart coverage between intent creation, filesystem rename, database delete, and completion audit.
- Add explicit unsupported external-artifact inventory evidence and adapter coverage before any such store enters pilot scope.
- Decide shared-user/account/contact erasure and accepted-report/export preservation semantics.
- Add a static/architecture control against new direct destructive Prisma or filesystem paths that bypass holds and recovery intents.

## 7. Remaining owner and legal/privacy approvals

The authorized owner and independently qualified legal/privacy reviewer must explicitly approve, reject, or revise:

- deletion-request identity and organization-authority verification methods;
- two-person separation, exact approval payload, expiry, revocation, and break-glass rules;
- Legal Hold authority, emergency freeze, release, and provider-bypass controls;
- active-system deletion, confirmed-record survival, accepted-report/export preservation, quarantine, purge, backup survival, restore replay, and final expiry semantics;
- evidence fields, restricted storage, access, custody, retention, and deletion;
- customer acknowledgement, completion, exception, failure, and closure communications;
- role assignments, training, escalation, incident response, and human synthetic rehearsal; and
- exact production release/provider prerequisites and final `GOV-001` authorization.

Local test success is not approval of any item above.

## 8. Readiness decisions

- **GO — completed P0-03 local synthetic technical rehearsal:** The bounded composite test package passed and is suitable for owner review and continued local synthetic work.
- **NO-GO — local operational erasure process:** No approved human authority packet, independent erasure approval enforcement, named roles, or approved evidence custody exists.
- **NO-GO — production organization erasure:** No deployment, provider/access verification, production-safe rehearsal, paired recovery evidence, or operational approval exists.
- **NO-GO — real-data paid pilot:** Open P0 gates remain. `DAT-002` is only `IN_PROGRESS`; its provider, backup, export, report-preservation, offboarding, and approved-semantics acceptance criteria are not complete.

## 9. STOP conditions

Stop erasure, purge, restore, closure, or customer-access work if requester authority or scope is ambiguous; organization ID/slug do not match; a Legal Hold or exception is unresolved; operator and reviewer are not independent; approval is missing, expired, or not bound to the exact operation; dry-run inventory is incomplete; an unsupported artifact store exists; provider/direct access is unverified; quarantine or database state disagrees; retry/reconciliation evidence is incomplete; recovery points or deletion replay are unresolved; audit evidence cannot be preserved safely; or any step would use real customer data before final authorization.
