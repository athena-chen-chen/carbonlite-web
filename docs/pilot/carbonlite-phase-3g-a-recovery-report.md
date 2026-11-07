# CarbonLite Phase 3G-A Recovery Report

**Status:** Complete local synthetic rehearsal; provider and real-data recovery remain unapproved
**Rehearsal date:** November 5, 2026 (America/Edmonton)
**Recovery Pair ID:** `PAIR-3GA-20261106040953-E631997C`
**Application revision:** `bf60fd672215181f07469997ce58e68ee0b4bd4a` with a dirty working tree preserved

## Decision summary

- **Local synthetic paired recovery mechanism:** **GO** for continued local engineering use. The same-release PostgreSQL dump and active/private-quarantine filesystem archive restored to new targets with exact database snapshot, migration-history, storage-key, byte-count, and SHA-256 parity.
- **Access to this restored dataset:** **NO-GO**. The authoritative ledger contains one post-backup hold, one post-backup document deletion, and one post-backup organization erasure. Reconciliation detected all three and the new restore-access gate remains closed.
- **Provider-level rehearsal:** **NO-GO**. Neon/Render were not accessed or tested.
- **Real-data paid pilot:** **NO-GO**. The synthetic local ledger is not an approved restricted/append-only operating register; provider paired recovery, operator controls, owner/legal approval, production recovery access, and production RPO/RTO remain unverified.

This report does not approve the retention policy, authorize deployment, or establish production RPO/RTO.

## Isolation evidence

| Control | Evidence |
| --- | --- |
| Database host | `127.0.0.1`; loopback validation passed before any database creation. |
| Source database | `carbonlite_recovery_src_pair_3ga_20261106040953_e631997c` |
| Destination database | `carbonlite_recovery_dst_pair_3ga_20261106040953_e631997c` |
| Source storage | `/tmp/carbonlite-phase-3g-a/PAIR-3GA-20261106040953-E631997C/source-storage` |
| Destination storage | `/tmp/carbonlite-phase-3g-a/PAIR-3GA-20261106040953-E631997C/destination-storage` |
| Backup artifacts | `/tmp/carbonlite-phase-3g-a/PAIR-3GA-20261106040953-E631997C/paired-backup` |
| Path safety | All roots were new, distinct, mode-restricted, and beneath the fixed disposable parent. Existing roots are refused. |
| Provider/outbound use | None. No Neon, Render, AI, email, analytics, or webhook request occurred. |
| Destructive cleanup | None. Databases and artifacts were intentionally left for inspection. |

The harness requires both `--local-synthetic-only` and `--acknowledge-disposable-targets`, accepts only `localhost`, `127.0.0.1`, or `::1`, requires an admin URL to the local `postgres`/`template1` database, generates database names with the `carbonlite_recovery_` prefix, and refuses paths outside `/tmp/carbonlite-phase-3g-a`.

Two earlier fresh-pair attempts failed safely before backup: one exposed prompt/example enum names that differed from the schema, and one exposed a `.DS_Store` file in the migrations directory. Both defects were corrected. Their unique disposable targets were not reused or deleted.

## Synthetic fixture

The successful recovery point contains three fixture organizations plus the migration-seeded `demo-org`; all records and bytes are synthetic.

| Fixture | Included state |
| --- | --- |
| Organization A | Active source document, one `REVIEW_REQUIRED` extraction, one `READY` spreadsheet review row, confirmed `ActivityData`, calculated snapshot and `MetricResult`, current reviewed E2E factor provenance, and active organization hold `LH-PAIR-3GA-20261106040953-E631997C-ORG-A`. |
| Organization B | Active held source document, confirmed calculated activity, active document hold `LH-PAIR-3GA-20261106040953-E631997C-DOC-B`, a separate deleted source with `PENDING_PURGE` intent `ddi_b8cd5dbb08394a2a9b863a1ef1f769ec`, private quarantine bytes, finalized report metadata/artifact, and a two-document report relationship. |
| Organization C | Active document at the recovery point, then a post-backup organization-erasure tombstone in the authoritative ledger. |
| Users | Distinct synthetic tenant users and separate platform-admin requester/approver identities. |
| Factor governance | Existing `seedReviewedFactors` E2E fixture; verified, high-confidence, `CORPORATE_INVENTORY`, `DIRECT_CO2E`, and `methodologyProvenance.reviewStatus=APPROVED`. No production value or formula was changed. |

Database snapshot counts at the recovery point were: 4 organizations, 5 users, 4 live documents, 1 extraction, 1 review row, 2 activities, 2 metrics, 1 report, 2 holds, 1 document-hold mapping, 1 deletion intent, and 58 applied migrations. Four live documents is expected because the Organization B pending-purge document row had already been deleted.

## Paired capture and integrity

The dedicated source database and storage root had one harness writer. Mutations were paused from `2026-11-06T04:09:56.071Z` through `2026-11-06T04:09:56.203Z`; post-backup changes began only after `pg_dump`, storage archive creation, `pg_restore --list`, and hashes succeeded. This is a coordinated local capture, not atomic PostgreSQL/filesystem snapshotting.

| Artifact | SHA-256 |
| --- | --- |
| `database.dump` | `9b7c35f92a27eeaa15a2ab7c10e4dcbdaf1cd724ee541e076143cb382bb64b2d` |
| `document-storage.tar.gz` | `d1dc9f1beb14a67c361273ebd5c17692814b2508fa7de714f4ad3eb500e646ee` |
| `pair-manifest.json` | `6f63c855d3cecc1f38742a91ef44557a5778414045d88ba61e1927612370dae7` |
| Migration manifest | `ea6c026707484a33c5e55be1b82cc364663cb1961c9a51fffd8fde443e0cd04d` |
| Authoritative recovery ledger | `251b263e47c1993c6c02c1d250c4136bcc859b8e34f787a7cb3b68b89efa6cea` |

The archive contained 6 files and 211 bytes: 5 active files (including the managed report artifact) and 1 private `.quarantine` file. Every restored file key, size, and SHA-256 matched. The quarantined file hash was `5bab3484148dad1c72c223ea428ab3602c7049533c15494d15f9c6491b2f2b1b`. Restored mtimes were within the recorded capture boundary.

## Restore and reconciliation result

The dump was restored with `pg_restore --exit-on-error` into the new destination database. No migration command was run against the restored database. The 58-row `_prisma_migrations` history matched the source snapshot before application use.

The database snapshots matched exactly for IDs, tenant IDs, document/storage mappings, extraction/review relations, activities, calculation snapshots, metric factor provenance/totals, report/document relations, holds/mappings, deletion intents, and migration history. Tenant checks found no cross-organization document storage prefix or hold mapping.

The independent authoritative ledger was then compared with the earlier restore and found the expected later events:

| Reconciliation finding | Restored state | Authoritative later state | Result |
| --- | --- | --- | --- |
| Lost hold | Post-backup organization hold absent | `LH-PAIR-3GA-20261106040953-E631997C-POST-BACKUP` active for Organization B | Detected; access blocked; hold must be reapplied through approved administration. |
| Resurrected document | `doc-b-later-pair-3ga-20261106040953-e631997c` present | Deleted after backup under intent `ddi_fe91226ab24b4a9b99a3951cad401a80` | Detected; no automatic deletion; authority review/replay required. |
| Resurrected organization | `org-c-pair-3ga-20261106040953-e631997c` present | Erased after backup | Detected; no automatic erasure; authority review/replay required. |

At the time of the Phase 3G-A rehearsal, the environment-only gate blocked every application route except health unless `RECOVERY_RECONCILIATION_STATUS=COMPLETE`. Phase 3G-A2-1 supersedes that behavior: `COMPLETE` and restore-mode changes cannot release access, a protected external recovery record is required, and every A2-1 recovery state remains locked. The original rehearsal result remains `accessBlocked=true` and `customerAccessReleased=false`.

## Failure-injection evidence

Each scenario was detected, remained fail-closed, kept customer access blocked, performed no automatic cleanup, and produced a manual recovery action.

| Scenario | Injection/check | Result |
| --- | --- | --- |
| Database restore fails | Invalid synthetic dump passed to `pg_restore --list` | Detected non-zero failure. |
| File archive incomplete | One expected inventory entry omitted | Manifest comparison rejected it. |
| File hash mismatch | One restored SHA-256 replaced with a synthetic mismatch | Hash comparison rejected it. |
| Missing quarantine entry | Quarantine inventory removed while `PENDING_PURGE` remained | Intent/quarantine comparison rejected it. |
| Hold differs from ledger | Real post-backup hold absent from earlier restore | Detected missing active case reference. |
| Deleted document reappears | Real post-backup deletion in ledger | Detected restored document ID. |
| Erased organization reappears | Real post-backup erasure tombstone in ledger | Detected restored organization ID. |
| Migration manifest differs | Synthetic extra migration row | History comparison rejected it. |
| Pair IDs differ | Synthetic mismatched manifest pair ID | Pair comparison rejected it. |
| Reconciliation interrupted | State held at `IN_PROGRESS` | Gate remained blocked. |

## Measured local timings

| Measurement | Observed |
| --- | ---: |
| Paired backup | 129 ms |
| Database restore | 533 ms |
| File restore | 5 ms |
| Reconciliation | 31 ms |
| Total harness elapsed | 3,219 ms |
| Recovery point age at completed reconciliation | 649 ms |

These timings cover 211 bytes and a tiny local database on one workstation. They do not prove a production RTO. The test also does not establish a production RPO; its observed local recovery point age is only a fixture measurement.

## Validation commands and results

Sanitized command forms (the actual local password was never printed by the harness):

```bash
LOCAL_RECOVERY_ADMIN_URL='postgresql://<local-user>:<redacted>@127.0.0.1:5432/postgres' \
  pnpm recovery:rehearsal -- --local-synthetic-only --acknowledge-disposable-targets

npx prisma validate
pnpm build
pnpm test:unit -- --runInBand src/common/security/restore-access-gate.spec.ts
```

Results:

- rehearsal and all ten failure checks: pass;
- Prisma schema validation: pass;
- backend build: pass;
- restore-access unit tests: 1 suite, 4 tests passed;
- full unit suite: 60 suites, 722 tests passed;
- focused PostgreSQL Legal Hold and recoverable-deletion E2E: 2 suites, 12 tests passed;
- lint: 0 errors and 12 pre-existing warnings.
- safety refusals: missing consent flags and a non-loopback database host both failed before connection or filesystem/database creation.

## Remaining gaps

### P0 before provider or real-data use

1. Replace the local JSON ledger with an approved, restricted, independently protected/append-only hold/deletion/erasure register and documented owner/legal authority.
2. Rehearse an authorized, isolated Neon + Render persistent-disk pair without exposing restored customer routes; verify encryption, access logs, independent copy, and provider recovery-point semantics.
3. Make recovery-state transition to `COMPLETE` an authenticated, independently approved, durable, auditable operation. The current environment gate is fail-closed but a privileged operator can change it outside the application.
4. Define and approve production RPO/RTO, backup rotation/expiry, evidence retention, and post-restore replay authority. The retention workbook remains draft and unapproved.
5. Establish a production capture-coordination mechanism. The local single-writer pause does not prove atomic or coordinated provider database/filesystem recovery points.
6. Resolve the missing `docs/pilot/paid-pilot-recovery.md` source named by the phase brief, or formally supersede it with the approved runbook.

### P1 engineering/operations

1. Add a supported operator command to resume an interrupted reconciliation from signed evidence and emit an audit record.
2. Add scale/performance rehearsals with realistic record/file counts and capacity alerts.
3. Add a separately authorized cleanup procedure for stale disposable rehearsal databases/directories. This phase intentionally performed no automatic cleanup.
4. Decide whether migration-seeded demo data should exist in a recovery target used for paid-pilot operations; it was preserved exactly in this same-release rehearsal.
