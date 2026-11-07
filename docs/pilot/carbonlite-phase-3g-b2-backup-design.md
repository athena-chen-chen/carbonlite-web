# CarbonLite Phase 3G-B2 Independent Paired Backup Design

**Document status:** Design proposal only; not implemented or approved

**Prepared:** November 6, 2026 (America/Edmonton)

**Scope:** First 1–3 controlled paid-pilot organizations

**Decision baseline:** Provider rehearsal **NO-GO**; real-data pilot **NO-GO**

This document does not authorize production access, a backup, a restore, a provider change, a deployment, a migration, or processing of customer data. Values described as “recommended” remain subject to owner, infrastructure, security, privacy, and legal approval.

## 1. Executive recommendation

Use three recovery layers:

1. Keep the verified Neon seven-day history and Render daily/seven-day snapshots as short-window provider-native safeguards. They are useful, but correlated with their provider accounts and not a consistent database/filesystem pair.
2. Add one daily and pre-change **independent full recovery pair** in a private, versioned, Object-Lock-enabled Amazon S3 Standard bucket in a separate AWS account. Stream the capture; never stage the pair on the 1 GB Render disk.
3. Maintain the authoritative, append-only Legal Hold/deletion/erasure event ledger and signed recovery approvals outside Neon, the Render disk, and the restored application. Every restore remains isolated and locked until it is reconciled against the ledger state newer than the selected pair.

Each pair uses one opaque Recovery Pair ID and contains a PostgreSQL custom-format dump, active managed files, `.quarantine`, SHA-256 inventories, capture-time reconciliation state, application revision, and migration manifest. A short coordinated write freeze is required because `pg_dump` is internally consistent but cannot atomically include Render filesystem writes.

Recommended operating proposal, pending approval:

- daily capture during a declared maintenance window, plus a capture immediately before an approved production migration or material release;
- internal recovery-point objective: no more than 24 hours from the most recent **verified consistent pair**, not merely the latest upload attempt;
- retain at least 14 successful daily pairs; set initial immutable retention to 16 calendar days to absorb processing skew, while keeping ordinary deleted-data survival below the proposed 30-day maximum;
- full synthetic isolated restore rehearsal before any real-data pilot, quarterly thereafter, and after a material change to storage, schema, encryption, or backup tooling;
- no recovery-time commitment until a provider rehearsal measures an approved end-to-end scenario.

## 2. Evidence reviewed and present limits

The design reconciles the Phase 3G-A local paired rehearsal, A2-1/A2-2 recovery lock and independent approval design, Phase 3G-B1 provider readiness/gap matrix, recoverable-deletion runbook, storage reconciliation, Legal Hold materials, and draft retention materials in this directory.

Current infrastructure facts supplied for this phase are treated as the verified design baseline: Neon Launch, protected `main`, seven-day restore history, no scheduled Neon snapshots, paid Render Node service, 1 GB persistent disk, daily Render snapshots retained seven days, durable document root at `/opt/render/project/src/uploads`, auto-deploy disabled, and backend deployed from `main`. Production migration deployment remains unapproved.

Repository evidence proves only local controls. It does not prove deployed backup automation, an external ledger, object storage, production identity separation, provider restore isolation, current disk usage, monitoring, or a production recovery authority. No provider or production access occurred in this phase.

## 3. Recovery set inventory

### 3.1 Files that must travel together

| Class | Include in every pair | Reconciliation rule |
| --- | --- | --- |
| Active source documents | Every regular managed file below the durable root, excluding `.quarantine` and explicitly classified transient/health paths | Every active storage key must map to a live `Document` or supported managed report artifact; every managed DB reference must have one file. |
| Managed report artifacts | Any backend-generated artifact stored below the durable root | Inventory by report ID/storage key, size, and SHA-256. Unsupported external artifact URLs are a STOP condition. |
| Private quarantine | Entire `.quarantine` tree, preserving relative opaque key and bytes | Every entry must map to a non-purged `DocumentDeletionIntent`/target reference; missing or orphan entries block pair acceptance. |
| File inventory | Canonical UTF-8 JSON Lines or canonical JSON containing normalized relative path, class, bytes, SHA-256, and optional safe opaque DB reference | Reject absolute paths, `..`, symlinks, devices, sockets, duplicate normalized paths, and unhashed entries. Filenames must not be copied into logs. |

Do not include build output, application source, logs, provider credentials, upload scratch files, health probes, sockets, or caches. A transient file present after the freeze/drain period is an exception to investigate, not an object to silently add. The backup process must stream archives to temporary ephemeral space or directly to the destination and must not write backup archives beneath the persistent mount.

### 3.2 Database records that must be captured together

`pg_dump` captures the whole application database, including sequences, constraints, and `_prisma_migrations`; selective table dumps are prohibited. The acceptance inventory must explicitly cover these data classes even if model names evolve:

- organizations, users/accounts, memberships, roles, invitations, and tenant ownership links;
- `Document` metadata and storage keys, extraction records, spreadsheet/draft review rows, and AI-job records;
- confirmed `ActivityData`, calculation snapshots, `MetricResult`, factor/provenance records, organization-specific factors, and report/report-document relationships;
- audit/security/operational events, quota periods/usage, feedback/support records, and other organization-scoped operational rows;
- `LegalHold`, `LegalHoldDocument`, `LegalHoldEvent`, authority/evidence references, and hold state;
- `DocumentDeletionIntent`, target references, purge-review evidence, workspace-erasure evidence/tombstones, and reconciliation status;
- migration history, application-controlled recovery state, and any future tables referenced by storage, hold, deletion, erasure, or report lifecycles.

Database roles, passwords, provider connection strings, and provider-global objects are not part of the application dump. Required roles/grants must be recreated from separately reviewed infrastructure-as-configuration; they must never be copied from production into a rehearsal.

### 3.3 External records required for safe recovery

A dump can roll back the very controls needed to decide whether restored data is still lawful to expose. Maintain two related records:

1. `ledger-at-capture.json.enc` inside the pair: a signed snapshot of active/released holds, document deletion/purge state, organization erasure tombstones, opaque request/case references, event sequence, and ledger chain digest at the freeze boundary.
2. A continuously appended authoritative ledger outside the pair: later hold, release, deletion, purge, erasure, exception, backup-expiry, and recovery-approval events. It must use monotonic sequence numbers, prior-event hashes, UTC timestamps, and signatures. The backup writer may append but cannot rewrite history.

The ledger contains opaque IDs, hashes, state, authority references, and timestamps—not legal narrative, document content, extracted data, customer filenames, secrets, or unnecessary personal information.

## 4. Recovery Pair ID and artifact contract

Use a random, non-customer-derived identifier such as `CLRP-20261106T060000Z-<128-bit-random>`. The timestamp is descriptive; uniqueness comes from the random component. The ID is embedded in every manifest and object key. A timestamp match without an exact Pair ID match is never sufficient.

Recommended object layout:

```text
pairs/<Recovery-Pair-ID>/
  database.dump.age
  active-files.tar.age
  quarantine-files.tar.age
  storage-manifest.json.age
  ledger-at-capture.json.age
  application-manifest.json.age
  pair-manifest.json
  pair-manifest.sig
```

`pair-manifest.json` is canonical JSON and contains no customer content. It records:

- format version, Recovery Pair ID, environment label, and capture purpose (`DAILY` or `PRE_CHANGE`);
- freeze requested/effective/released times, database snapshot start/end, filesystem capture start/end, and maximum observed skew;
- source identifiers represented as approved aliases—not connection strings, provider IDs, hostnames, or secrets;
- `pg_dump`/server major versions, archive-tool version, entry counts and byte totals;
- SHA-256 of every encrypted object and, inside the encrypted application/storage manifests, SHA-256 of every plaintext artifact/file;
- application Git commit SHA, dirty-build prohibition result, expected deployment branch, build/release identifier, and migration-manifest digest;
- ordered migration name/checksum list and `_prisma_migrations` digest/count from the capture;
- ledger sequence range, chain-head digest, capture snapshot digest, and signature key ID;
- destination bucket/account alias, object version IDs, encryption recipient/key version, immutability retain-until time, lifecycle expiry target, and upload verification time;
- capture result, verifier identity, failure/exception references, and predecessor successful Pair ID.

The manifest signature covers the canonical manifest plus an ordered list of object version IDs and hashes. It is produced by a signing identity separate from the upload credential. An upload is not a successful backup until the dump lists cleanly, every hash is recomputed from the stored object, Object Lock metadata is read back, ledger continuity passes, and the pair is marked `VERIFIED` in the external register.

## 5. Coordinated capture and write freeze

PostgreSQL documents that `pg_dump` creates a consistent database export without blocking writers. That property does not coordinate PostgreSQL with filesystem renames and writes. CarbonLite therefore needs an explicit freeze boundary.

### 5.1 Required future controls

- A recovery coordinator outside the application issues a unique backup lease and records the Pair ID.
- A fail-closed application write gate rejects uploads and every mutating customer/admin route with `503 BACKUP_WRITE_FREEZE`; reads may remain available only if operationally useful.
- All application mutations participate in the existing organization locks plus a global backup read/write lock. The backup takes the global exclusive side and waits for in-flight mutations to drain.
- Direct SQL, Render shell/SCP writes, CI, deploy hooks, one-off jobs, workers, cron, and migration roles are disabled or explicitly proven absent for the window.
- The coordinator records active request count, lock acquisition, drain completion, and the exact release event. An environment variable alone is not an acceptable gate because it requires a deploy/restart and can be changed by one privileged operator.

### 5.2 Capture sequence

1. Preflight destination availability, free disk/headroom, last successful pair, ledger continuity, clean deployed application SHA, migration digest, tool versions, time synchronization, and named operators. Abort before freeze on any failure.
2. Allocate the Pair ID and append `CAPTURE_REQUESTED` to the external ledger.
3. Activate the application write gate, acquire the global exclusive backup lock, drain in-flight mutations, and verify every non-application writer is disabled. Start the freeze timer.
4. Run read-only storage reconciliation. Any unexplained missing, orphaned, symlinked, transient, held-purge, or restore-mismatch entry is a STOP.
5. Record the ledger sequence/digest and database migration state at the frozen boundary.
6. Stream `pg_dump --format=custom` from the production database using a dedicated read-only backup identity with only the additional privileges strictly required for a complete dump. Do not use an owner/migration credential. Validate with `pg_restore --list`.
7. Walk the durable root once without following symlinks; hash and stream active and quarantine archives separately. Refuse filesystem changes observed during the walk.
8. Generate the encrypted manifests, client-side-encrypt artifacts, upload under create-only keys, and read back object size, version, SHA-256, encryption, and retain-until metadata.
9. Sign and upload the final pair manifest. A second identity verifies it and appends `PAIR_VERIFIED` or `PAIR_FAILED` to the external ledger.
10. Release the global lock and write gate only after verification, or under a documented incident decision if the destination is unavailable. Record freeze duration and release result.

The initial pilot target should be a maximum five-minute freeze. This is a planning threshold, not an approved service level. If the pair cannot be captured and verified within it, release safely, mark the attempt failed, alert, and redesign streaming/volume limits; do not leave the service indefinitely half-frozen.

## 6. Independent destination comparison and cost

### 6.1 Cost assumptions

Estimates are USD, excluding tax, support plans, log export, key-management subscriptions, and recovery egress. They assume US-region pricing checked November 6, 2026; the owner must re-price the selected region before approval.

- Render disk maximum is 1 GB; planning case uses 0.7 GB active/quarantine at the 70% capacity-action threshold.
- Compressed PostgreSQL dump planning allowance is 0.3 GB.
- One full pair is rounded up to 1.0 GB; 16 daily retained pairs plus two monthly pre-change pairs average about 18 GB, rounded to 20 GB including versions, ledgers, and manifests.
- About 10 objects per pair, 32 capture sets (about 320 object uploads) and routine verification reads/lists per month; request cost is negligible at this scale.
- Compression benefit is deliberately ignored. Provider free tiers and promotional credits are ignored.

| Option | Minimum design | Estimated storage/month | Strengths | Trade-offs |
| --- | --- | ---: | --- | --- |
| **Amazon S3 Standard — recommended** | Separate AWS account; private bucket; Block Public Access; versioning; Object Lock compliance mode; lifecycle; client-side encryption plus default SSE-S3; IAM and audit logging | 20 GB × about $0.023/GB = **$0.46**; requests typically under $0.01. Optional customer-managed KMS key is commonly about $1/month plus requests and must be re-priced. Budget **$1/month without optional KMS**, **$2/month with it**. | Mature IAM, versioning, immutable retention, account separation, audit ecosystem, and straightforward future cross-account custody. Cost difference is immaterial at pilot scale. | More configuration surface; misconfigured IAM/lifecycle/version cleanup can raise cost. Compliance-mode retention cannot be shortened. Region/privacy and AWS account custody need approval. |
| **Backblaze B2 — lower-cost alternative** | Separate Backblaze account/group; private bucket; Object Lock compliance mode/default retention; restricted application keys; client-side encryption plus SSE-B2 | Published starting price $6.95/TB-month; 20 GB is about **$0.14**. Budget **$1/month** before support/key-store costs. | S3-compatible, simple single storage tier, no Object Lock surcharge, and much lower unit storage price. | Less granular identity/audit/key-management ecosystem than AWS for this trust boundary; account-region selection, application-key capabilities, event export, and recovery support must be validated. SSE-C key loss makes data unrecoverable; client-side encryption is still recommended. |

Recommendation: choose S3 Standard because the approximately $0.32/month planning difference buys a better-understood identity, audit, and independent-account boundary. Choose B2 only if the owner documents equivalent MFA, identity separation, audit export, Object Lock read-back, region/privacy, and recovery support. Do not use the Render disk, Render snapshot, Neon branch, Git repository, operator laptop, or the same credential vault as the independent destination.

Official references:

- [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/)
- [Amazon S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
- [Amazon S3 default encryption](https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html)
- [Backblaze B2 pricing](https://www.backblaze.com/cloud-storage/pricing)
- [Backblaze B2 Object Lock](https://www.backblaze.com/docs/cloud-storage-object-lock)
- [Backblaze B2 server-side encryption](https://www.backblaze.com/docs/cloud-storage-server-side-encryption)

## 7. Encryption and access control

### 7.1 Encryption

- Use TLS 1.2 or later in transit.
- Encrypt every content-bearing artifact before upload with authenticated client-side encryption. The backup process holds only an encryption public key; the decryption private key is not present on Render, Neon, CI, or the backup writer.
- Use a reviewed streaming format such as `age` with a versioned recovery recipient, or envelope AES-256-GCM with a random per-pair data key wrapped by an independently controlled key. Record algorithm and key version, never key material, in the manifest.
- Also enable destination default server-side encryption. Client-side encryption provides provider/account separation; server-side encryption is defense in depth.
- Store the recovery private key in a separate identity-controlled vault with tested escrow and recovery. Two named people must approve release of key material. Losing the only private key makes every backup useless; exposing it defeats storage separation.
- Sign manifests/ledger events with a different signing key from the encryption key. Define rotation, revocation, old-key retention through backup expiry, and an annual key-recovery test using synthetic data.

### 7.2 Least-privilege identities

| Identity | Allowed | Explicitly denied |
| --- | --- | --- |
| Backup capture writer | Create objects only in a new Pair-ID prefix; append capture event | Read/decrypt, overwrite, delete, shorten retention, change bucket policy/lifecycle, administer identities |
| Backup verifier | List/read encrypted objects and retention metadata; append verification | Upload replacement content, delete, change retention, access decryption key |
| Retention custodian | Configure approved lifecycle and extend retention with recorded approval | Read/decrypt customer artifacts, create recovery approval alone |
| Recovery operator | Create isolated targets and submit exact pair/evidence request | Approve own request, change immutable source objects, target production aliases |
| Independent recovery reviewer | Verify evidence and sign approval | Operate restore or hold production/provider admin credential |
| Key custodian | Release decryption capability after two-person approval | Operate restore destination or unilaterally approve recovery |
| Auditor/read-only owner | Review inventory, logs, hashes, access, cost | Read plaintext backup content unless separately authorized |

Require individual accounts, phishing-resistant MFA where supported, no shared root/admin credentials, short-lived sessions, separate recovery and daily-admin groups, quarterly access review, immediate offboarding, and alerts for policy, lifecycle, Object Lock, key, failed-login, delete, and bulk-download events. Root/break-glass credentials are sealed, tested, and never used for routine capture.

## 8. Retention, expiry, deletion requests, and Legal Holds

### 8.1 Proposed rotation

- Capture daily and before approved material changes.
- Keep at least 14 **successful** daily pairs. Default each object version to immutable compliance retention until capture time + 16 calendar days; lifecycle may delete only after that time and successful expiry eligibility.
- A daily external inventory verifies current/noncurrent versions, retain-until dates, pair completeness, hashes, ledger continuity, and expiry. It must alert before an object reaches expiry without enough newer verified pairs.
- Extend immutable retention before expiry if fewer than 14 later verified daily pairs exist, a recovery/incident evidence hold applies, or a legal/privacy authority explicitly requires preservation. Never silently shorten retention.
- Ordinary pairs should not survive beyond 30 days. Any extension beyond 30 days requires an identified legal/incident basis, scope, approver, next review date, and customer-impact assessment. This is a control proposal, not an approved policy.

### 8.2 Deletion reconciliation

1. Active-system document deletion uses the recoverable workflow; quarantined bytes remain part of every pair until authorized purge.
2. The deletion/erasure event records the last known containing Pair IDs and computes `latest_expected_backup_expiry` as the latest immutable retain-until/lifecycle date for a pair that may contain the target.
3. Do not edit or selectively rewrite an immutable pair. Active-system completion, quarantine purge, and backup expiry are distinct milestones and customer communications must distinguish them.
4. New pairs after active deletion must not contain an active file/row. Before purge they may contain the expected quarantine entry and intent; after purge they must contain neither bytes nor a live target, while retaining minimized deletion evidence as approved.
5. The daily inventory appends `PAIR_EXPIRED` only after absence is independently observed across all versions and destinations. A lifecycle request or delete marker alone is not proof of physical/version expiry.
6. A restore from an earlier pair is assumed to resurrect later-deleted data. Compare the pair ledger head with the current authoritative ledger, keep recovery access locked, and replay holds/deletions/erasures only through approved workflows with independent review. Never auto-delete solely from an ID match.

### 8.3 Legal Hold reconciliation

- A Legal Hold suspends conflicting purge, erasure, and backup-expiry actions in its approved scope. The restricted authority record, not the restored database alone, determines current hold state.
- Because aggregate backup pairs contain multiple organizations, avoid indefinite pair-level retention where a newer verified pair contains all still-held required bytes and state. Before an old pair expires, prove held-item continuity by opaque ID and SHA-256 in at least two newer verified pairs plus the authoritative ledger.
- If continuity cannot be proven, extend the old pair before expiry and raise an exception. Do not extract a selective “legal archive” without separate legal, privacy, encryption, chain-of-custody, and deletion design approval.
- A hold release does not immediately authorize deletion. Recalculate active, quarantine, and backup expiry deadlines and obtain the normal independent deletion approval.

## 9. Restore and recovery trust boundary

No person or credential may both select a backup, decrypt it, operate the restore, approve reconciliation, and route customer traffic.

Minimum production authority chain:

1. Incident commander declares the scoped recovery event but cannot approve their own restore.
2. Recovery operator identifies the exact Pair ID, destination aliases, application SHA, migration digest, and expected ledger head.
3. Independent reviewer verifies signatures, object versions, retention, target isolation, and that no production Neon branch, endpoint, Render service, disk, domain, or credential is referenced; then signs the bounded approval.
4. Key custodian releases decryption capability only for that approval/destination and records it.
5. Operator restores to new isolated targets. Recovery lock permits health only.
6. Privacy/Legal Hold reviewer reconciles later ledger events and signs the result.
7. Infrastructure owner and independent reviewer separately approve any release/routing change. Production replacement is a distinct change requiring a new approval; a successful rehearsal never authorizes it.

The external approval record binds Pair ID, encrypted object versions/hashes, target IDs, environment, application SHA, migration digest, ledger digest/sequence, operator, reviewer, expiry, nonce, and monotonic generation. It lives outside restored systems and is append-only/tamper-evident. Any mismatch, stale generation, missing signature, or self-approval leaves the target `RECOVERY_LOCKED`.

## 10. Capacity, monitoring, health, and readiness

### 10.1 Render 1 GB disk thresholds

| Threshold | Approximate usage | Required action |
| --- | ---: | --- |
| Warning | 60% / 600 MB | Alert operations; review active, quarantine, reports, transients, and growth trend within one business day. |
| Capacity action | 70% / 700 MB | Freeze pilot growth/onboarding; approve purge only through normal controls or plan a non-destructive resize. Verify at least 30 days of projected headroom. |
| Upload admission stop | 80% / 800 MB | Reject new uploads/reports; preserve reads/deletions; page owner. Provider notification is a backstop, not the first alert. |
| Critical incident | 85% / 850 MB or insufficient peak-write headroom | Stop all filesystem-writing operations, keep Legal Hold/quarantine intact, and initiate incident handling. Never mass-delete. |

Admission must reserve the greater of 200 MB or `2 × maximum_upload_size + expected extraction/report temporary bytes + safety margin`, because temporary and final copies can coexist. Monitor bytes and inodes, active/quarantine/report/transient class totals, daily growth, largest objects, and unexplained reconciliation deltas. Independent backup artifacts must consume zero persistent-disk capacity.

### 10.2 External backup health

- latest successful capture age, latest verified pair age, capture/freeze duration, bytes/counts by class, hash/read-back result, ledger sequence lag, failed/partial prefixes, and expiry exceptions;
- warn if no verified pair by 26 hours, page at 30 hours, and automatically mark real-data-pilot backup posture `NO-GO` at 48 hours until a new pair and root-cause review pass;
- alert immediately on pair mismatch, missing quarantine, dump-list failure, signature/hash failure, lifecycle/Object Lock change, decryption-key access, unusual download, or clock skew;
- monthly synthetic decrypt/list check and quarterly isolated restore rehearsal; a metadata-only check is not a restore test.

### 10.3 Service health/readiness contract

- **Liveness:** process/event loop is alive. It must not claim storage or database recovery readiness.
- **Readiness:** fail closed during backup freeze or recovery lock; require database connectivity, expected migration digest, durable path identity, writable/read-back-safe storage probe in a dedicated non-customer health namespace, sufficient admission headroom, and no critical storage reconciliation fault. The probe must clean up exactly its own generated file and never traverse `.quarantine`.
- **Backup posture:** expose only safe status such as last verified pair age/status to authenticated operations monitoring. Do not expose bucket, hashes tied to customers, provider IDs, ledger content, or secrets publicly. Backup staleness should stop new pilot onboarding and, at the approved threshold, new writes; it should not make the process liveness endpoint flap.

Render documents disk metrics and daily snapshots retained seven days; its snapshot restore overwrites current disk data. These facts support monitoring and short-window recovery but do not replace the independent pair. See [Render persistent disks](https://render.com/docs/disks), [Render service metrics](https://render.com/docs/service-metrics), and [Render snapshot restore warning](https://api-docs.render.com/reference/restore-snapshot). PostgreSQL dump semantics are documented in [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).

## 11. Remaining gaps and decisions

### P0 before a provider rehearsal

- Implement and locally test the global write gate/lock, drain evidence, streaming capture, canonical manifests, signatures, client-side encryption, destination upload/read-back, and missed-run alerts.
- Establish a separate object-storage account/bucket, immutable retention, independent key custody, append-only ledger, signed authority, and named distinct identities.
- Complete current provider/resource/permission evidence without secrets and prove the rehearsal target allowlist cannot reference Neon `main` or the Render production service/disk.
- Define the synthetic provider source/target, no-routing/no-worker controls, cost cap, cleanup authority, evidence retention, and incident contacts.
- Approve the backup/deletion/hold reconciliation proposal or replace it with signed decisions; resolve region, DPA/subprocessor, and customer-language requirements.
- Prove disk usage/headroom and alert delivery; establish backup freshness monitoring and health/readiness behavior.

### P0 before a real-data pilot

- Complete the synthetic provider rehearsal with exact database/file/hash/migration/ledger parity and all failure tests; independently review the report.
- Deploy and verify backup automation and external recovery authority without deploying unapproved production migrations.
- Record at least three consecutive daily verified production-shaped synthetic pairs and one successful expiry cycle.
- Approve retention, deletion survival, RPO definition, restore authority, access review, key recovery, incident response, and customer disclosures. Do not promise an RTO until measured.
- Close all Phase 3G-B1 P0 provider access, routing, worker, disk, snapshot, and bypass gaps.

### P1 after foundational P0 closure

- Automate access recertification, expiry evidence, capacity forecasting, restore-evidence packaging, signing/encryption key rotation, and audit export.
- Measure larger data volumes and select an approved recovery-time objective per scenario.
- Consider a second independent destination only if risk, contract, or growth justifies the operational complexity.

## 12. Decisions at this phase

| Decision | Result | Reason |
| --- | --- | --- |
| Documentation/design completion | **GO** | This phase makes no operational change. |
| Read-only owner evidence gathering | **GO**, under the existing evidence checklist | It can close facts without mutation when secrets/customer data are excluded. |
| Independent backup implementation | **NO-GO pending owner approval** | Destination, identities, retention, encryption/key custody, and implementation change are not approved. |
| Isolated synthetic provider rehearsal | **NO-GO** | The P0 controls and isolation evidence above are not yet implemented and approved. |
| Real-data paid pilot | **NO-GO** | No independent verified pair, provider rehearsal, production authority, expiry proof, or approved retention/recovery policy exists. |
