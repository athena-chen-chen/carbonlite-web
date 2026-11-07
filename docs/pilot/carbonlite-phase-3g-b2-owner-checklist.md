# CarbonLite Phase 3G-B2 Owner Approval Checklist

**Status:** Blank approval record; no item is approved by this document

**Prepared:** November 6, 2026 (America/Edmonton)

**Use:** Complete with dated evidence before changing any NO-GO decision

Do not enter passwords, tokens, connection strings, private keys, customer data, legal narrative, or unredacted provider IDs in this checklist. Use access-controlled evidence references and stable aliases.

## 1. Decision record

- Review package/version: ________________________________________________
- Application SHA reviewed: ______________________________________________
- Backup/rehearsal tool SHA reviewed: _____________________________________
- Review date/time/time zone: _____________________________________________
- Proposed effective date: ________________________________________________
- Business owner: ________________________________________________________
- Infrastructure/security owner: __________________________________________
- Privacy/Legal Hold authority: ___________________________________________
- Independent recovery reviewer: _________________________________________
- Backup/restore operator(s): _____________________________________________
- Key custodian: _________________________________________________________

Overall decisions—check exactly one for each:

- Provider rehearsal: [ ] GO  [ ] NO-GO  [ ] DEFER
- Independent backup implementation: [ ] GO  [ ] NO-GO  [ ] DEFER
- Real-data paid pilot: [ ] GO  [ ] NO-GO  [ ] DEFER
- Production migration deployment: [ ] GO under separate change  [ ] NO-GO  [ ] OUT OF SCOPE

Decision rationale and evidence references: ________________________________

## 2. Architecture and destination approval

- [ ] The owner reviewed the three-layer model: Neon/Render native safeguards, independent paired archive, and external ledger/authority.
- [ ] Selected destination: [ ] separate-account Amazon S3 Standard  [ ] Backblaze B2  [ ] other: ____________
- [ ] The selected account is independent of Neon, Render, production CI, and daily application administration.
- [ ] Private bucket, public-access block, versioning, Object Lock compliance mode, default retention, lifecycle, and audit/event logging are evidenced.
- [ ] Destination region, data residency/cross-border implications, DPA/subprocessor terms, support, and breach/availability responsibilities are approved.
- [ ] Cost assumption is re-priced for the selected region and accepted; monthly budget cap: USD $__________.
- [ ] Backup archives will never be written to the Render persistent disk, Git, a shared workstation, or an operator’s personal cloud account.
- [ ] Provider-native snapshots are explicitly classified as supplemental, not the independent paired backup.

Evidence references: ______________________________________________________

## 3. Pair contents and consistency

- [ ] Whole application database custom-format `pg_dump` is required; selective table dumps are prohibited.
- [ ] Active source documents and all managed report artifacts are included.
- [ ] Entire private `.quarantine` tree is included.
- [ ] Storage manifest records normalized relative path, class, bytes, and plaintext SHA-256; unsafe paths/symlinks/devices are rejected.
- [ ] Capture-time Legal Hold/deletion/erasure ledger snapshot and current external append-only ledger are both required.
- [ ] Pair manifest binds Recovery Pair ID, encrypted object versions/hashes, freeze times, source aliases, application SHA, migration list/digest, ledger head, key versions, and retain-until/expiry.
- [ ] Manifest canonicalization and independent signature format are specified and locally tested.
- [ ] Dump listing, stored-object read-back, hash, signature, Object Lock, migration, and ledger-continuity checks all precede `VERIFIED` status.
- [ ] Browser/customer exports and unsupported external report artifacts are either proven out of provider scope or treated as a STOP condition.

Evidence references: ______________________________________________________

## 4. Write freeze and capture procedure

- [ ] A fail-closed write gate covers every mutating customer and admin route.
- [ ] A global exclusive backup lock drains all in-flight application mutations before capture.
- [ ] Direct SQL, migration role, Render shell/SCP, CI, deploy hooks, workers, cron, one-off jobs, and other writer paths are inventoried and disabled/proven absent during capture.
- [ ] Read-only storage reconciliation must have no unexplained missing/orphan/quarantine/restore finding before capture.
- [ ] Capture streams off-host and consumes zero persistent-disk space for archives.
- [ ] Pair verification or a documented incident decision is required before unfreezing.
- [ ] Maximum proposed freeze is ______ minutes; abort/release behavior is tested.
- [ ] Failed and partial prefixes are marked unusable and alerted; they cannot become restore candidates.
- [ ] Daily schedule and pre-change trigger have named owners and coverage for absence/failure.

Evidence references: ______________________________________________________

## 5. Encryption and key custody

- [ ] TLS is required in transit and destination server-side encryption is enabled.
- [ ] Content-bearing artifacts are encrypted client-side before upload with authenticated, versioned encryption.
- [ ] Backup writer possesses encryption capability only; the decryption private key is absent from Render, Neon, CI, source, and backup destination.
- [ ] Decryption key vault/escrow, recovery, loss, compromise, rotation, revocation, and old-key retention procedures are approved and tested with synthetic data.
- [ ] Signing key is separate from encryption key; signer cannot rewrite stored objects.
- [ ] Two named independent identities approve decryption-key release for an exact Pair ID and target.
- [ ] Key and manifest metadata never enter object names, logs, screenshots, tickets, or repository files beyond non-secret key IDs.

Evidence references: ______________________________________________________

## 6. Identity and recovery authority

- [ ] All operators use individual accounts with MFA; shared/root credentials are prohibited for routine use.
- [ ] Backup writer, verifier, retention custodian, restore operator, independent reviewer, and key custodian permissions match the design and are tested.
- [ ] Restore operator and independent reviewer are distinct people and identities.
- [ ] No identity can select, decrypt, restore, approve, and route a recovery alone.
- [ ] External approval binds exact pair/object versions/hashes, targets, SHA, migration digest, ledger head, expiry, nonce, and monotonic generation.
- [ ] Self-approval, stale approval, wrong target, wrong pair, missing signature, and rollback all fail closed.
- [ ] Access review frequency: ____________; offboarding SLA: ____________; break-glass review owner: ____________.
- [ ] Alerts cover identity/policy/lifecycle/Object Lock/key/delete/bulk-download changes.

Evidence references: ______________________________________________________

## 7. Retention, expiry, deletion, and Legal Holds

Record the decision; do not infer approval from the recommended defaults.

- Daily capture frequency approved: [ ] Yes [ ] No; value: ________________
- Pre-change capture approved: [ ] Yes [ ] No; trigger: ____________________
- Minimum successful daily pairs: ____________
- Initial immutable period: ____________ calendar days
- Ordinary maximum retention: ____________ calendar days
- Maximum ordinary deleted-data survival: ____________ calendar days
- [ ] The 24-hour RPO is defined from the latest **verified consistent pair**, not the latest attempt.
- [ ] RTO remains uncommitted until a measured scenario is approved, or approved scenario/value: ____________________.
- [ ] Daily inventory verifies all object versions, pair completeness, retain-until, ledger continuity, and actual expiry.
- [ ] Old-pair retention is extended before expiry when newer-pair continuity is insufficient; alerts and approvers are named.
- [ ] Active deletion, quarantine purge, backup expiry, and customer notification are separate recorded milestones.
- [ ] Deletion/erasure ledger records possibly containing Pair IDs and latest expected backup expiry.
- [ ] Delete markers/lifecycle requests are not accepted as proof of version expiry; independent absence verification is required.
- [ ] Current Legal Hold authority overrides conflicting purge/expiry; hold continuity is proven in two newer verified pairs before an older pair expires.
- [ ] Any retention beyond the ordinary maximum has a legal/incident basis, approver, scope, and next review date.
- [ ] Customer-facing deletion/backup exception language has legal/privacy approval.

Evidence references: ______________________________________________________

## 8. Disk capacity, monitoring, and readiness

- [ ] Current Render disk used bytes/percent/inodes and 30-day growth are evidenced without customer filenames/content.
- [ ] 60% warning, 70% capacity action, 80% upload stop, and 85% critical incident thresholds are approved or replaced below.
- Approved thresholds/reasons: ____________________________________________
- [ ] Admission reserves at least the greater of 200 MB or twice maximum upload plus temporary/report safety margin.
- [ ] Active, quarantine, reports, transients, largest-object, inode, and reconciliation-delta metrics exist.
- [ ] Warning/page delivery was tested to primary and backup on-call identities.
- [ ] Latest verified pair warns at 26 hours, pages at 30 hours, and makes backup posture NO-GO at 48 hours, or approved replacements: ____________________.
- [ ] Liveness, readiness, recovery lock, write-freeze state, durable-path probe, migration digest, disk headroom, and backup posture have distinct semantics.
- [ ] Health probe cannot traverse/delete `.quarantine` and cleans up only its own generated object.
- [ ] A capacity breach never triggers broad or automatic deletion.

Evidence references: ______________________________________________________

## 9. Provider rehearsal isolation

- [ ] Signed alias map lists every disposable synthetic source/target and every production/staging denylisted resource.
- [ ] Rehearsal does not connect to, branch from, query, dump, snapshot, inspect, attach, or restore any production/staging resource.
- [ ] Source and target Neon resources are disposable and contain only the approved synthetic fixture.
- [ ] Source and target Render services/disks are disposable, distinct, private, and contain only synthetic bytes.
- [ ] Restore database is new/empty/prefixed; restore filesystem root is new/blank/prefixed.
- [ ] No public/custom domain, production environment import, integration, AI, email, analytics, webhook, worker, cron, or autonomous writer exists.
- [ ] Explicit consent flags, allowlist, production denylist, target-newness check, and recovery lock are tested at the exact tool SHA.
- [ ] First rehearsal restores independent archives to new targets; it does not invoke destructive production/provider-native snapshot restore.
- [ ] Synthetic fixture includes active files, managed report, quarantine, holds, deletion intent, post-backup hold/deletion/erasure, and visible synthetic markers.
- [ ] Provider spend cap, evidence retention, abort contacts, and exact cleanup inventory/authority are approved.

Evidence references: ______________________________________________________

## 10. Required local and provider test evidence

- [ ] Missing consent fails before connection/mutation.
- [ ] Production-like alias and unknown alias fail before connection/mutation.
- [ ] Same source/target, existing/non-empty target, and unsafe extraction path fail closed.
- [ ] Corrupt/unlistable dump, file hash mismatch, missing quarantine, pair mismatch, migration mismatch, invalid signature, stale ledger, and interrupted reconciliation fail closed.
- [ ] Self-approval, stale generation, wrong target, and lost/incorrect key fail closed.
- [ ] Destination outage produces a failed attempt, alert, safe unfreeze decision, and no falsely verified pair.
- [ ] Exact database IDs/counts/relationships/migration history match after restore without running migrations.
- [ ] Exact active/quarantine/report path-size-hash inventory matches.
- [ ] Post-backup hold/deletion/erasure are detected and keep access locked until independently resolved.
- [ ] Customer/admin route matrix is blocked while health remains available.
- [ ] Optional bounded synthetic release and higher-generation re-lock pass, if separately authorized.
- [ ] Cleanup refuses broad/shared/immutable targets and affects only approved disposable resources.

Evidence references: ______________________________________________________

## 11. P0 closure checklist

All must be checked before provider rehearsal GO:

- [ ] Backup/write-freeze tooling implemented, locally tested, and independently reviewed.
- [ ] Independent destination, Object Lock, encryption, ledger, signing, and alerts implemented.
- [ ] Distinct identities, MFA, least privilege, key escrow, and external signed authority implemented.
- [ ] Provider synthetic resource map and hard production/staging denial proven.
- [ ] Disk usage/headroom, readiness, backup freshness, and alert delivery proven.
- [ ] Retention/deletion/Legal Hold decisions and rehearsal cost/region/privacy are signed.
- [ ] No production migration or deployment is implied by rehearsal approval.

All must be checked before real-data pilot GO:

- [ ] Provider rehearsal completed through evidence acceptance and cleanup/retention accounting.
- [ ] Every integrity, isolation, ledger, authority, access-gate, and failure-injection result passed.
- [ ] At least three consecutive daily production-shaped synthetic pairs verified.
- [ ] One complete pair-expiry cycle independently verified across all versions.
- [ ] Phase 3G-B1 provider permissions, routing, worker, bypass, disk, snapshot, and recovery gaps closed.
- [ ] Production backup automation/monitoring and external authority deployed and verified under separate authorization.
- [ ] Retention policy, Legal Hold authority, deletion handling, customer terms/privacy/DPA/subprocessors, RPO definition, and recovery authority approved.
- [ ] No unapproved RTO or recovery guarantee is represented to customers.

## 12. P1 follow-up assignment

- [ ] Access recertification owner/due date: __________________________________
- [ ] Key rotation/recovery-test owner/due date: ______________________________
- [ ] Capacity forecast/resize owner/due date: ________________________________
- [ ] Quarterly restore rehearsal owner/next date: ____________________________
- [ ] RTO scenario/measurement owner/due date: _______________________________
- [ ] Audit export and expiry automation owner/due date: ______________________
- [ ] Second-destination risk review owner/due date: __________________________

## 13. Signatures

Signing means only that the exact checked decision and referenced evidence were reviewed. It does not approve unchecked policies, production migration, deployment, or customer-data processing.

| Role | Decision | Name | Signature/evidence reference | Date/time/time zone |
| --- | --- | --- | --- | --- |
| Business owner | GO / NO-GO / DEFER |  |  |  |
| Infrastructure/security owner | GO / NO-GO / DEFER |  |  |  |
| Privacy/Legal Hold authority | GO / NO-GO / DEFER |  |  |  |
| Independent recovery reviewer | GO / NO-GO / DEFER |  |  |  |
| Backup/restore operator acknowledgement | ACK / DECLINE |  |  |  |
| Key custodian acknowledgement | ACK / DECLINE |  |  |  |

### Final effective decision

- Provider rehearsal: [ ] GO  [ ] NO-GO  [ ] DEFER
- Real-data pilot: [ ] GO  [ ] NO-GO  [ ] DEFER
- Expiry/review date of this approval: _____________________________________
- Conditions/limitations: __________________________________________________
- Supersedes record (if any): ______________________________________________

Until every applicable P0 box is checked and the final signatures are complete, the default remains **NO-GO for provider rehearsal and NO-GO for real-data pilot**.
