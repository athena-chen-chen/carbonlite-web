# CarbonLite Phase 3G-B3 Owner Approval Checklist

**Status:** Blank decision record; every proposal remains unapproved until completed and signed

**Default:** AWS setup **NO-GO**; synthetic AWS validation **NO-GO**; real-data pilot **NO-GO**

Do not include credentials, private keys, connection strings, raw AWS recovery codes, customer data, legal narrative, unredacted account contacts, or production provider identifiers. Use restricted evidence references.

## 1. Package and decision identity

- Package review date/time/time zone: ______________________________________
- Package Git SHA or immutable evidence digest: _____________________________
- Business owner: _________________________________________________________
- Infrastructure/security owner: ___________________________________________
- Privacy/legal reviewer: __________________________________________________
- Finance/billing owner: ___________________________________________________
- Independent recovery reviewer: __________________________________________
- Recovery operator: ______________________________________________________
- Key custodian(s): ________________________________________________________
- Evidence register reference: _____________________________________________
- Approval expiry/review date: _____________________________________________

Files reviewed:

- [ ] S3 architecture
- [ ] AWS Console guide
- [ ] IAM policy templates and all six JSON files
- [ ] Cost and retention model
- [ ] B2 backup design/rehearsal/checklist
- [ ] Paid-pilot retention policy/checklist
- [ ] Phase 3G-A/A2 recovery runbooks and deletion/Legal Hold materials

## 2. Pending legal and policy decisions

- [ ] AWS is approved as a backup/control/logging subprocessor for the stated data classes.
- [ ] Selected Region, geographic processing, US source-provider transfer, data residency statement, DPA, subprocessor notice, and contract/privacy wording are approved.
- [ ] Backup frequency is approved: ________________________________________
- [ ] Recovery point definition/RPO is approved: ____________________________
- [ ] No RTO is approved, or approved measured scenario/value: ______________
- [ ] Backup Object Lock minimum is approved: _______________________________
- [ ] Lifecycle current/noncurrent expiry is approved: ______________________
- [ ] Ordinary maximum deleted-data survival is approved: ___________________
- [ ] Control/recovery evidence retention and field minimization are approved: ______________________________________________________________________
- [ ] Access/CloudTrail log retention and authorized readers are approved: ___
- [ ] Legal Hold authority, continuity test, expiry suspension, release, and next-review rules are approved.
- [ ] Customer deletion language distinguishes active deletion, quarantine purge, provider history/snapshots, S3 version expiry, evidence retention, and verified completion.
- [ ] Confirmed accounting records, reports, AI jobs, audit/quota/support data, and offboarding retention conflicts are resolved or documented as real-data blockers.

Legal/privacy decision references: __________________________________________

## 3. AWS account ownership and root protection

- [ ] Account form approved: [ ] AWS Organizations member  [ ] standalone exception
- Approved account name: __________________________________________________
- Company-controlled root group email alias: ________________________________
- [ ] Legal owner/payer is KACH CANADA LTD.; no personal ownership/payment dependency.
- [ ] Billing, security, and operations contacts and backups are assigned.
- [ ] Root design has no access keys, no routine use, root-use alerting, and either centralized root credential removal or unique password plus at least two separately held MFA devices.
- [ ] Password/MFA/email/phone recovery custody prevents one-person recovery control.
- [ ] IAM Identity Center/company IdP supplies individual temporary human sessions with phishing-resistant MFA.
- [ ] Break-glass activation requires incident ID, two-person approval, MFA, protected session tag, short duration, and post-use review.

Evidence references: _______________________________________________________

## 4. Region decision

Select exactly one:

- [ ] `ca-central-1` — Canadian backup geography and additional separation; US-to-Canada transfer/DPA/cost approved.
- [ ] `us-east-1` — operational alignment with Neon geography; US storage/disclosure/cost approved.
- [ ] Neither — return for revision.

Decision rationale: ________________________________________________________

- [ ] S3, KMS, CloudTrail, Object Lock, IAM/Identity Center dependencies, monitoring, and support availability are verified for the selected Region.
- [ ] Current official AWS Calculator estimate is attached and dated.
- [ ] Current Neon/Render egress terms and allowances are attached or explicitly recorded as unknown cost risk.

## 5. Resource and S3 configuration approval

Record approved aliases/physical names in the restricted evidence register, not here if classified.

- [ ] Three-bucket model approved: `CL-BACKUP`, `CL-CONTROL`, and non-Object-Lock `CL-LOGS`.
- [ ] Account- and bucket-level Block Public Access: all four controls enabled.
- [ ] Object Ownership: Bucket owner enforced; ACLs disabled.
- [ ] Versioning: enabled; suspension prohibited.
- [ ] Website hosting, public ACL/policy, replication, access points, and Requester Pays: disabled/not configured unless separately reviewed.
- [ ] Backup Object Lock test mode: Governance, synthetic period ______ days.
- [ ] Backup Object Lock real-data mode: Compliance, proposed/approved ______ days.
- [ ] Backup lifecycle: current ______ days; noncurrent additional ______ days; incomplete multipart ______ day(s); no pilot storage transition.
- [ ] Control Object Lock mode/period: __________________ / ________________.
- [ ] Log lifecycle period: __________ days; Object Lock disabled because it is the server-access-log destination.
- [ ] TLS-only and minimum TLS 1.2 bucket policies approved with AWS-service-principal caveat reviewed.
- [ ] S3 server access logging destination/prefixes approved.
- [ ] Object Lock/lifecycle behavior is reconciled with deletion policy; no exact-day deletion promise is made.

Evidence references: _______________________________________________________

## 6. Encryption and signing approval

Select one client-side encryption design:

- [ ] Symmetric KMS envelope key + per-pair AES-256-GCM data key.
- [ ] External `age` X25519 recipient + non-AWS private-key vault.
- [ ] Neither — return for revision.

- [ ] Default S3 SSE-S3 remains enabled as defense in depth.
- [ ] Encryption context binds purpose and exact Pair ID; mismatched context fails decrypt.
- [ ] Writer can encrypt/generate data key but cannot decrypt old pairs.
- [ ] Recovery Operator receives pair-specific temporary decrypt; no routine decrypt grant.
- [ ] Independent Reviewer cannot decrypt.
- [ ] Separate asymmetric KMS signing key/algorithm and verifier compatibility are approved.
- [ ] Only Independent Reviewer can `Sign`; read-only consumers can `Verify`/obtain public key.
- [ ] Public key digest/key ID is pinned outside restored systems.
- [ ] Key administration, cryptographic use, rotation, revocation, loss, compromise, old-backup readability, escrow, recovery test, and deletion scheduling are assigned and approved.

Evidence references: _______________________________________________________

## 7. IAM and trust approval

- [ ] Every JSON file parses strictly and its SHA-256 is recorded.
- [ ] Every placeholder is replaced in the private deployment copy; no placeholder remains.
- [ ] IAM Access Analyzer Console validation is complete; every error/security warning is resolved and other findings have written disposition.
- [ ] No role receives `AdministratorAccess`, `PowerUserAccess`, `AmazonS3FullAccess`, `AWSKeyManagementServicePowerUser`, `Action: "*"`, or generic allow for `s3:*`, `iam:*`, or `kms:*`.
- [ ] Backup Writer has no Get, Decrypt, Delete, retention/legal-hold change, governance bypass, bucket/IAM/configuration, or signing permission.
- [ ] Backup Writer S3 prefix and encryption context are bound to a broker-validated `RecoveryPairId` session tag that the workload cannot self-assert or alter.
- [ ] Backup Verifier has no write, decrypt, delete, signing, or configuration permission.
- [ ] Recovery Operator is restricted to one approved Pair ID and cannot sign/approve/delete/configure.
- [ ] Independent Reviewer can sign/append approval but cannot decrypt/restore/delete/configure.
- [ ] Break-glass is resource-scoped, MFA/tag gated, has no KMS decrypt/sign or governance bypass, and cannot modify its own role.
- [ ] KMS key policies independently enforce the same separation.
- [ ] Human role trusts name exact Identity Center/IdP principals and use short sessions/MFA.
- [ ] Backup workload trust uses approved temporary federation/broker; no long-lived Render access key.
- [ ] Permissions boundary/SCP prevents role self-escalation and disabling required controls, or absence remains a documented P1 with compensating review.

Evidence references: _______________________________________________________

## 8. Independent recovery authority approval

- [ ] `CL-CONTROL` is authoritative and independent of Neon, Render disk, restored DB, and application environment variables.
- [ ] Event schema is minimized, canonical, signed, hash-chained, and contains no customer content/legal narrative/secrets.
- [ ] Operator requests, reviewer approvals, and generation checkpoints use separate prefixes/permissions.
- [ ] Generation keys are zero-padded, unique, conditionally created, version-aware, and protected by Object Lock.
- [ ] Reader accepts only the highest valid generation at/above separately pinned minimum and rejects duplicates, gaps, rollback, stale nonce, expired lease, signature/evidence/target mismatch, or self-approval.
- [ ] Cross-object transition interruption remains locked and is reconciled; it never auto-releases.
- [ ] Backup writer/verifier cannot manufacture recovery approval.
- [ ] Control evidence period and eventual expiry are approved and monitored.

Evidence references: _______________________________________________________

## 9. Object layout and manifest approval

- [ ] Pair prefix is `pairs/<opaque-Recovery-Pair-ID>/`; it contains no customer-derived value.
- [ ] Pair contains PostgreSQL custom dump, active archive, quarantine archive, file SHA-256 manifest, application/migration manifest, ledger-at-capture, safe pair manifest, and detached signature.
- [ ] Object keys contain no organization/person name, email, filename, case narrative, secret, or raw document ID.
- [ ] Pair manifest binds exact object version IDs/ciphertext hashes, plaintext hashes inside encrypted manifest, app SHA, migration digest, ledger head, freeze times, source alias, encryption/signing key IDs, and retain-until.
- [ ] Conditional create/no-overwrite behavior and duplicate-version rejection are designed and tested locally before AWS validation.
- [ ] Storage manifest reconciles active, quarantine, managed reports, DB references, bytes, and hashes.

Evidence references: _______________________________________________________

## 10. Logging, monitoring, and cost approval

- [ ] Multi-Region `CarbonLiteBackupAudit` CloudTrail logs management events and scoped S3 read/write data events; log file validation enabled.
- [ ] S3 server access logs for backup/control deliver to distinct prefixes in `CL-LOGS`.
- [ ] Root/break-glass, CloudTrail, BPA/policy/versioning/Object Lock/lifecycle/encryption, KMS, unusual object access/delete/denial, pair age, and cost alerts are defined with primary/backup recipients.
- [ ] S3 Storage Lens free metrics and daily storage metrics are enabled/retained; paid request metrics are [ ] approved [ ] not approved.
- Monthly budget: USD $________; actual thresholds: _________________________; forecast threshold: ____________________.
- Selected scenario: [ ] Low [ ] Base [ ] High [ ] Custom: _________________
- Verified monthly estimate/date: __________________________________________
- [ ] Version/noncurrent/incomplete-multipart/control/log/KMS/source-egress/restore-transfer costs are included.
- [ ] Cost pressure never authorizes bypassing retention, Legal Hold, logging, quarantine, or encryption.

Evidence references: _______________________________________________________

## 11. Future synthetic-only validation authorization

Do not check these as passed in B3; they are future execution gates.

- [ ] Exact synthetic dataset/Pair ID, test window, disposable targets, operators/reviewer, cost cap, and cleanup plan approved.
- [ ] Writer upload/readback through verifier proves version, size, ciphertext SHA-256, retention, and encryption.
- [ ] Anonymous/HTTP/foreign-principal public access denied.
- [ ] Writer read/delete/version-delete/retention/legal-hold/bypass/configuration denied.
- [ ] Verifier read-only works; decrypt/write/delete/sign denied.
- [ ] Operator exact-pair read/decrypt/request works; cross-pair/sign/approval/delete denied.
- [ ] Reviewer verify/sign/approval works; decrypt/restore/delete denied.
- [ ] Governance Object Lock denies ordinary deletion; compliance early-deletion is not attempted.
- [ ] Valid increasing recovery state works; rollback, duplicate generation, stale nonce, self-approval, corrupt signature, wrong evidence/target, and interrupted transition remain locked.
- [ ] CloudTrail/access logs/KMS events/alerts/budget/cost evidence arrive as expected.
- [ ] Version-aware lifecycle test proves delete-marker and final expiry behavior before any expiry claim.

Synthetic validation report reference: _____________________________________

## 12. P0 closure

### Before AWS setup GO

- [ ] Sections 2–10 are complete with signed evidence.
- [ ] Account/Region/budget/root/contacts are approved.
- [ ] Retention, deletion, Legal Hold, control/log evidence, AWS/DPA, and customer wording are legally approved or setup is explicitly limited to empty/synthetic governance-mode resources.
- [ ] Workload/human trust and KMS key policies are independently reviewed.
- [ ] Final generated policies pass local parse, IAM Access Analyzer, least-privilege review, and hash comparison.
- [ ] Owner authorizes named individual to execute the exact Console guide.

### Before real-data pilot GO

- [ ] AWS resources exist and read-back evidence matches this package.
- [ ] All future synthetic tests in §11 pass and are independently reviewed.
- [ ] Full B2 write-freeze/capture automation, external ledger/authority integration, monitoring, and version-aware expiry verification are implemented.
- [ ] Synthetic provider restore/reconciliation/re-lock rehearsal passes with no production/staging target.
- [ ] At least three consecutive production-shaped verified pairs and one complete expiry cycle pass.
- [ ] Phase 3G-B1/B2 P0 gaps, production permissions/routes/workers/disk capacity, policy/customer terms, incident response, and access review are closed.
- [ ] No unmeasured RTO or recovery guarantee is promised.

## 13. P1 assignments

- Organization SCP/resource-control-policy guardrails owner/due: ______________
- Separate security-log account owner/due: __________________________________
- Config/Security Hub drift detection owner/due: _____________________________
- S3 Inventory/expiry automation owner/due: _________________________________
- Access recertification owner/next date: ___________________________________
- Key rotation/recovery rehearsal owner/date: _______________________________
- Cost anomaly and capacity forecast owner/date: ____________________________
- Second Region/account risk review owner/date: _____________________________

## 14. Final decisions and signatures

| Role | AWS setup | Synthetic validation | Real-data pilot | Name/signature reference | Date/time/time zone |
| --- | --- | --- | --- | --- | --- |
| Business owner | GO / NO-GO / DEFER | GO / NO-GO / DEFER | GO / NO-GO / DEFER |  |  |
| Infrastructure/security owner | GO / NO-GO / DEFER | GO / NO-GO / DEFER | GO / NO-GO / DEFER |  |  |
| Privacy/legal reviewer | GO / NO-GO / DEFER | GO / NO-GO / DEFER | GO / NO-GO / DEFER |  |  |
| Finance/billing owner | GO / NO-GO / DEFER | ACK / DEFER | ACK / DEFER |  |  |
| Independent recovery reviewer | GO / NO-GO / DEFER | GO / NO-GO / DEFER | GO / NO-GO / DEFER |  |  |
| Key custodian | ACK / DECLINE | ACK / DECLINE | ACK / DECLINE |  |  |

Final effective decision:

- AWS account/resource setup: [ ] GO  [ ] NO-GO  [ ] DEFER
- Synthetic-only AWS validation: [ ] GO  [ ] NO-GO  [ ] DEFER
- Real-data pilot: [ ] GO  [ ] NO-GO  [ ] DEFER
- Approved Region: ____________________
- Approved Object Lock mode/period: ____________________ / __________________
- Conditions/limitations: __________________________________________________
- Approval expires/requires review on: ______________________________________

Until completed and signed, the effective decision remains **NO-GO for AWS setup, NO-GO for synthetic AWS validation, and NO-GO for the real-data pilot**.
