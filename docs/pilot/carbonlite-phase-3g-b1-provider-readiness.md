# CarbonLite Phase 3G-B1 Provider Readiness

**Assessment date:** 2026-11-05
**Scope:** Read-only Neon PostgreSQL and Render persistent-storage readiness review
**Provider access used:** None
**Decision:** Isolated provider rehearsal **NO-GO**; real-data paid pilot **NO-GO**

## Executive conclusion

CarbonLite has a locally tested recovery design, but actual Neon and Render recovery configuration is not provider-verified. No authenticated provider dashboard, read-only API, provider export, production database connection, or production filesystem was available to this review. The reported Neon and Render settings therefore remain `OWNER_REPORTED`, not `VERIFIED`.

Public provider documentation confirms that relevant capabilities exist generally. It does not prove that CarbonLite has enabled, retained, permissioned, monitored, or tested them. There is no evidence of an independent PostgreSQL dump, independent document archive, coordinated database/filesystem recovery pair, production external recovery authority, isolated provider restore, or provider access review. A Render persistent disk and provider snapshots are not independent backups.

The current architecture could support a future isolated rehearsal only after the P0 controls and evidence in the checklist are satisfied. No provider operation should begin from this report.

## Evidence method and classification

| Evidence source | Available | Classification and limitation |
| --- | --- | --- |
| Authenticated Neon dashboard/API | No | CarbonLite-specific Neon facts are not provider-verified. |
| Authenticated Render dashboard/API | No | CarbonLite-specific Render facts are not provider-verified. |
| Production Neon SQL | Deliberately not used | No connection test, query, dump, or schema inspection was performed. |
| Production Render filesystem/shell | Deliberately not used | No files, usage data, or permissions were inspected. |
| Owner screenshots summarized in the brief | Narrative only | `OWNER_REPORTED`; original screenshots were not attached to this review. |
| Backend repository and pilot documents | Yes | `REPOSITORY_ONLY`; proves code/document state, not deployment. |
| Public official provider documentation | Yes | `DOCUMENTATION_ONLY`; proves a provider feature is documented, not enabled for CarbonLite. |

Status meanings used here:

- `VERIFIED`: direct current provider evidence specific to CarbonLite. No major provider fact reached this status.
- `OWNER_REPORTED`: stated from owner screenshots or observations but not independently revalidated.
- `REPOSITORY_ONLY`: supported by local source code or repository documentation only.
- `DOCUMENTATION_ONLY`: supported by public provider documentation only.
- `UNKNOWN`: no sufficient evidence.
- `NOT_IMPLEMENTED`: evidence shows the control is absent.
- `NOT_APPLICABLE`: the control does not apply.

## Major facts and classifications

| Claim | Status | Evidence and conclusion |
| --- | --- | --- |
| Neon project is `carbonlite` | `OWNER_REPORTED` | Owner screenshot summary only. |
| Neon plan is Launch | `OWNER_REPORTED` | Owner screenshot summary only; current entitlement not independently verified. |
| Neon region is AWS `us-east-1` | `OWNER_REPORTED` | Owner screenshot summary only. |
| Neon branches are `main` and `development` | `OWNER_REPORTED` | Purpose, primary mapping, endpoint mapping, and protection unknown. |
| Neon restore UI showed seven days | `OWNER_REPORTED` | Actual configured history window and oldest restorable point need a current timestamped screenshot/export. |
| Render service is `carbonlite-api` | `OWNER_REPORTED` | Service ID, deployment branch, and current release SHA unknown. |
| Render compute is 0.5 CPU / 512 MB and one replica | `OWNER_REPORTED` for size; `UNKNOWN` for replica count | No current service Settings evidence. |
| Render auto-deploy is disabled | `OWNER_REPORTED` | Current deploy policy and deploy-hook/CI bypasses unknown. |
| Render disk is 1 GB at `/opt/render/project/src/uploads` | `OWNER_REPORTED` | Attachment, current usage, snapshots, and filesystem ownership unknown. |
| `DOCUMENT_STORAGE_PATH` and durable flag align with the mount | `OWNER_REPORTED` for deployment; `REPOSITORY_ONLY` for code requirement | Code fails deployed startup if path/durable settings are absent, but deployed values were not inspected. |
| Active and `.quarantine` bytes share the disk | `REPOSITORY_ONLY` | Filesystem adapter stores `.quarantine` below the configured root. A whole-disk snapshot would ordinarily include both, but actual provider snapshot contents are untested. |
| Render disk survives deploy/restart | `DOCUMENTATION_ONLY` | Render documents persistence only under the mount path. CarbonLite persistence has not been provider-tested. |
| Render takes daily snapshots retained seven days | `DOCUMENTATION_ONLY` | [Render persistent-disk documentation](https://render.com/docs/disks) states this generally. CarbonLite snapshot inventory was not inspected. |
| Neon PITR and snapshot/branch restore options exist | `DOCUMENTATION_ONLY` | Neon documents PITR within configured history and snapshot restoration workflows; CarbonLite entitlements/configuration remain unknown. |
| Independent database and document backups exist | `UNKNOWN` | No inventory, object-store evidence, archive manifest, or expiry report. |
| Phase 3G-A2-2 is deployed | `UNKNOWN` | Local code and rehearsal only; no Render release SHA or environment binding evidence. |

## Neon readiness

### Documented capabilities, not enabled configuration

Neon publicly documents restoring a branch to a timestamp/LSN within the project history window and notes that an in-place restore can briefly interrupt clients. Neon also documents branch-from-time and snapshot workflows that can create a separate branch for inspection. These are `DOCUMENTATION_ONLY`; the current console behavior, plan entitlement, snapshot beta/status, and CarbonLite configuration must be checked directly before use.

Public sources:

- [Neon point-in-time restore description](https://neon.com/blog/announcing-point-in-time-restore)
- [Neon snapshot and separate-branch description](https://neon.com/blog/three-ways-to-use-your-snapshots)
- [Neon production branch protection description](https://neon.com/blog/restrict-access-to-the-production-branch)
- [Neon organization/API-key permission documentation](https://neon.com/docs/manage/orgs-api)

### Current readiness findings

| Control | Status | Finding |
| --- | --- | --- |
| Production branch and endpoint mapping | `UNKNOWN` | Branch names alone do not show which endpoint the Render service uses. No connection string should be submitted as evidence. |
| Plan, region, configured history window | `OWNER_REPORTED` | Needs current plan/project/Backup & Restore screenshots. |
| Oldest currently restorable timestamp | `UNKNOWN` | A displayed seven-day range is not proof of uninterrupted restorability or retention expiry behavior. |
| Branch protection | `UNKNOWN` | Public documentation indicates plan/feature constraints may apply. Current branch badge and restrictions need direct evidence. |
| Scheduled snapshots | `UNKNOWN` | Feature existence does not prove a schedule or retained snapshots. |
| Independent `pg_dump` archives | `UNKNOWN` | None found in repository or provided evidence. Provider PITR/snapshots are not independent copies. |
| Restore permissions and authorized operators | `UNKNOWN` | Organization/project members, API key scopes, and recovery role assignments were not available. |
| Isolated restore destination | `UNKNOWN` | Separate-branch capability is documented, but a CarbonLite-specific destination, network isolation, compute, and routing plan do not exist as evidence. |
| Production overwrite risk | `DOCUMENTATION_ONLY` | Neon documents restore operations capable of changing the target branch/compute. Exact UI safeguards and CarbonLite operator permissions must be verified. |

PITR or snapshot recovery can resurrect rows deleted after the chosen point, revert Legal Hold activation/release state, restore deletion intents to earlier statuses, and reintroduce erased organizations. Any restored branch must remain isolated and `RECOVERY_LOCKED` while the independent hold/deletion/erasure ledger is applied. No production independent ledger is proven.

## Render readiness

Render documents that only data beneath the disk mount survives deploy/restart, disk usage is visible on the Disk/Metrics pages, automatic snapshots occur daily and are available for seven days, and restoring a snapshot replaces the disk state and loses later changes. Its API documentation describes disk snapshot restore as irreversible and potentially deployment-triggering. This does not prove CarbonLite's disk is correctly attached, snapshotted, restorable, or isolated.

Public sources:

- [Render persistent disks and snapshots](https://render.com/docs/disks)
- [Render snapshot restore API warning](https://api-docs.render.com/reference/restore-snapshot)
- [Render service and disk metrics](https://render.com/docs/service-metrics)
- [Render disk-usage notifications](https://render.com/docs/notifications)
- [Render deploy rollback versus disk state](https://render.com/docs/rollbacks)

| Control | Status | Finding |
| --- | --- | --- |
| Service identity, deployment branch, release SHA | `OWNER_REPORTED` / `UNKNOWN` | Service name is reported; branch and live commit are unknown. |
| Instance type and replicas | `OWNER_REPORTED` / `UNKNOWN` | Compute size reported; replica count and disk-to-instance topology unverified. |
| Auto-deploy | `OWNER_REPORTED` | CI, deploy hooks, API keys, and manual deploy permissions may still bypass it. |
| Disk attachment, mount, size | `OWNER_REPORTED` | Needs current Disk page evidence. |
| Runtime path alignment | `OWNER_REPORTED` plus `REPOSITORY_ONLY` | Code configuration requirement exists; live environment names/values were not inspected. |
| Actual write/read persistence | `UNKNOWN` | Local tests do not prove Render persistence. No production files were read. |
| Snapshot inventory and expiry | `UNKNOWN` | General daily/seven-day behavior is documentation only. |
| Independent document archive | `UNKNOWN` | No external archive/storage inventory. |
| Snapshot includes `.quarantine` | `UNKNOWN` | Same-root layout suggests it should, but no restored inventory or snapshot manifest proves it. |
| Restore to separate destination | `UNKNOWN` | Render's documented disk restore targets an existing disk and overwrites it. A safe separate-service/disk procedure is not proven. |
| Disk usage and alerts | `UNKNOWN` | Provider supports metrics and an 80% notification, but current usage and notification configuration are unavailable. |
| Filesystem permissions and shell access | `UNKNOWN` | Any shell/SCP-capable operator could bypass application Legal Hold and deletion controls. |
| Deploy/restart behavior | `DOCUMENTATION_ONLY` | Mounted files should persist; attached-disk services may have restart/deploy downtime. No CarbonLite test evidence. |

## Paired backup feasibility

The deployed design cannot be considered recoverable from provider-native recovery points independently because Neon and Render create and retain recovery state separately. Their timestamps are not an atomic cross-provider transaction.

A feasible future paired-capture procedure requires:

1. trusted external recovery coordination and a unique Recovery Pair ID;
2. block public routing and all application/background/provider writers;
3. drain in-flight requests and verify no external SQL, shell, cron, CI, or operator mutation path remains;
4. record application release SHA and Prisma migration-manifest digest;
5. capture an exact Neon recovery point identifier/timestamp and an independently retained database archive where approved;
6. capture active and `.quarantine` storage with file hashes and an exact Render snapshot/archive timestamp;
7. record active Legal Holds, deletion intents, erased-organization tombstones, and independent ledger digest;
8. encrypt independent archives outside both Neon and the Render disk, with separate access and expiry controls;
9. sign the pair manifest and external recovery state; and
10. release the write pause only after both artifacts and their hashes are durable.

No deployed write-pause coordinator, paired schedule, independent archive destination, encryption/key design, external ledger, or expiry verifier is proven. Automatic Render snapshots cannot by themselves establish the same boundary as a Neon recovery point. Backups stored on the same Render disk would share its failure and access domain and are unacceptable as the independent copy.

## Recovery authority feasibility

Phase 3G-A2-2 provides a `REPOSITORY_ONLY` design and local synthetic proof for signed independent approval, evidence binding, compare-and-swap, release, and re-lock. Production feasibility remains conditional:

| Requirement | Status | Provider implication |
| --- | --- | --- |
| Authority outside Neon and Render disk | `NOT_IMPLEMENTED` | Use an independently administered control plane/store; not the application disk or restored DB. |
| Separate application/writer identities | `NOT_IMPLEMENTED` | Local rehearsal used one OS identity. Provider service identities and write ACLs are undefined. |
| Separate operator/reviewer identities | `REPOSITORY_ONLY` | Cryptographic local harness exists; production IdP roles and assignments do not. |
| Protected signing keys | `NOT_IMPLEMENTED` | Production KMS/HSM/secret custody and rotation are undefined. |
| Non-rollbackable generation | `NOT_IMPLEMENTED` | Environment binding and local file history are not a provider-grade monotonic checkpoint. |
| Tamper-evident audit | `REPOSITORY_ONLY` | Signed local history exists; independent durable audit destination is absent. |
| Trusted recovery initiation | `NOT_IMPLEMENTED` | Render routing, service mode, worker stop, and authority initialization workflow are not deployed/proven. |
| Provider routing isolation | `NOT_IMPLEMENTED` | No evidence of private recovery service or disabled public/custom domains. |
| Worker/job admission control | `UNKNOWN` | Repository has no autonomous scheduler, but Render jobs, CI, external scripts, and direct SQL remain unknown. |
| Continuous state verification | `NOT_IMPLEMENTED` | Local adapter explicitly does not claim real-time detection. |
| Release and re-lock | `REPOSITORY_ONLY` | Locally demonstrated, not deployed. |
| Key rotation and incident response | `NOT_IMPLEMENTED` | No provider procedure or evidence. |

## Capacity, RPO/RTO, and retention

The reported 1 GB disk is a material constraint. Active documents, reports, `.quarantine`, temporary same-disk upload files, health markers, and filesystem metadata share capacity. Quarantine intentionally retains bytes, so deletion does not immediately reclaim space. During an upload, a temporary file exists before rename, increasing peak space. Independent archives must not be written to this disk.

Render documents disk-usage graphs and a notification when usage exceeds 80%, but CarbonLite's metrics and notifications are `UNKNOWN`. Proposed internal thresholds for owner approval are: warning at 60%, capacity action at 70%, critical response before the provider's documented 80% event, and upload admission headroom based on maximum file size plus quarantine growth. These are recommendations, not verified controls.

| Target | Status | Assessment |
| --- | --- | --- |
| RPO ≤ 24 hours | `DOCUMENTATION_ONLY` proposal | Provider daily mechanisms may align nominally, but paired consistency, missed-run detection, and independent copies are unproven. |
| RTO 4 hours | `DOCUMENTATION_ONLY` proposal | Conflicts with two-business-day proposal; neither is approved or evidenced. |
| RTO 2 business days | `DOCUMENTATION_ONLY` proposal | Same conflict; provider rehearsal is required before selecting either. |
| Daily paired backups | `DOCUMENTATION_ONLY` proposal | No deployed scheduler or pair manifest evidence. |
| 14-day rolling retention | `DOCUMENTATION_ONLY` proposal | Reported/provider-documented seven-day windows would not independently prove 14 days. |
| Maximum 30-day deleted-data survival | `DOCUMENTATION_ONLY` proposal | Requires inventory and expiry verification across PITR, snapshots, independent archives, and failed/held rotations. |

The local rehearsal duration must not be used as a production RTO measurement.

## Access and bypass summary

Provider administrators, database roles, shell users, deploy credentials, CI, and backup operators can potentially bypass application Legal Holds and recovery locks. None of those identities or grants were available. The detailed inventory and required controls are in the gap matrix.

## Preconditions for a future isolated provider rehearsal

All must be evidenced before authorization:

1. current Neon/Render configuration checklist completed without secrets;
2. named environment, branch, endpoint, service, disk, and recovery destination approved;
3. no production target can be overwritten by the rehearsal path;
4. independent hold/deletion/erasure ledger and external authority deployed outside restored systems;
5. separate operator and reviewer identities plus protected signing keys;
6. public routing, workers, cron, deploy hooks, direct SQL, and shell mutation paths blocked for the recovery environment;
7. paired capture procedure, encryption, manifest, custody, retention, and expiry approved;
8. isolated Neon branch and isolated Render service/disk design proven feasible without taking action;
9. synthetic-only dataset and explicit destructive-operation approvals; and
10. rollback, cleanup, cost, incident, and evidence-retention plans approved.

## Decisions

- **GO for further read-only owner evidence collection:** Yes.
- **GO for isolated provider-level rehearsal:** **NO-GO**; P0 evidence and controls remain open.
- **GO for real-data paid pilot:** **NO-GO**.

No provider setting was changed, no backup or restore was executed, no Neon SQL was sent, no Render file was read, and no deployment occurred.
