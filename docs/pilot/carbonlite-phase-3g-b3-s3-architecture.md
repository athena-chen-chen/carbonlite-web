# CarbonLite Phase 3G-B3 S3 Backup Architecture

**Status:** Implementation-preparation package; no AWS resource exists or is approved by this document

**Prepared:** November 6, 2026 (America/Edmonton)

**Scope:** Independent backup infrastructure for the first 1–3 controlled paid pilots

**Current decisions:** AWS setup **NO-GO pending owner approvals**; real-data pilot **NO-GO**

## 1. Outcome

Prepare a dedicated AWS backup security boundary containing:

- a private, versioned S3 Standard backup bucket with Object Lock;
- a separate immutable recovery-control bucket for signed state and append-only evidence;
- a separate non-Object-Lock log bucket for S3 server access logs and CloudTrail delivery;
- one symmetric KMS key for client-side envelope encryption and one asymmetric KMS signing key;
- five narrowly scoped roles: Backup Writer, Backup Verifier, Recovery Operator, Independent Reviewer, and Break-glass Administrator; and
- billing, access, object-integrity, retention, and security monitoring.

The account contains no application runtime, database, customer route, or shared production administrator. Neon history and Render snapshots remain supplemental recovery layers. S3 holds independent pairs; it does not replace the Phase 3G-B2 write freeze, pairing, ledger reconciliation, or recovery lock.

## 2. Phase A review and unresolved decisions

Reviewed sources:

- `carbonlite-phase-3g-b2-backup-design.md`;
- `carbonlite-phase-3g-b2-provider-rehearsal-plan.md`;
- `carbonlite-phase-3g-b2-owner-checklist.md`;
- paid-pilot retention policy and owner checklist;
- Phase 3G-A recovery runbook;
- Phase 3G-A2-1 locked recovery state;
- Phase 3G-A2-2 signed release/re-lock design; and
- recoverable-deletion runbook.

The following remain decisions, not settings:

| Decision | Current proposal | Required approvers | Why setup must not assume it |
| --- | --- | --- | --- |
| Backup Region | `ca-central-1` preferred if Canadian storage and cross-border terms are approved; otherwise `us-east-1` is operationally simpler | Owner, infrastructure/security, privacy/legal | Region fixes object, KMS, logging, cost, and residency boundaries. |
| Backup pair retention | 16-day Object Lock default, lifecycle current-version expiration at day 17 | Owner, infrastructure, privacy/legal | Draft retention material referred to 14 daily points and a proposed 30-day maximum deleted-data survival. Object Lock cannot be shortened in compliance mode. |
| Control/evidence retention | Minimized recovery evidence proposed at 730 days, aligned to the still-unapproved 24-month deletion-evidence proposal | Owner, security, privacy/legal | Evidence may contain opaque customer-linked references and may conflict with minimization/deletion requirements. |
| Object Lock mode | Governance for synthetic proving only; compliance before real data | Owner and security | Governance can be bypassed by specially permitted identities; compliance cannot be shortened even by account root. |
| Encryption custody | Client-side AES-256-GCM envelope encryption using a dedicated symmetric KMS key; separate asymmetric KMS signing key | Security owner and key custodian | Key loss prevents recovery; broad KMS access collapses role separation. An external `age` recipient remains an alternative. |
| Workload authentication | Temporary role credentials through an approved broker/federation method; no static key on Render | Security/infrastructure | Render-to-AWS trust mechanism has not been selected or tested. Permission policies do not establish safe trust. |
| RPO/RTO | Daily/pre-change pairs and proposed 24-hour RPO from latest verified pair; no RTO | Owner, legal, infrastructure | Neither the former four-hour nor two-business-day RTO proposal is approved or measured. |
| Legal Hold and expiry | Holds suspend conflicting purge/expiry; newer-pair continuity must be proven before an older held pair expires | Legal/privacy and backup custodian | An aggregate locked pair cannot be selectively edited. |
| AWS subprocessor wording | Add selected AWS Region/services, DPA, transfers, retention, and deletion behavior | Owner and legal/privacy | Creating an account does not approve customer disclosure or real-data transfer. |
| Logging retention and recipients | Proposed 90 days for technical access logs; longer incident evidence by exception | Security and privacy/legal | Access logs contain identifiers and require their own minimization/retention rule. |

## 3. AWS account boundary

### 3.1 Preferred account form

Use a dedicated member account named `CarbonLite-Backup-Prod` in a company-controlled AWS Organization. The legal account owner and payer is KACH CANADA LTD.; the root/account email is a monitored company group address used for no other purpose. Do not use a founder's personal AWS account, a developer sandbox, or an account controlled solely by the backup operator.

If an AWS Organization exists, use IAM Identity Center for human access, organization-level account/public-access guardrails, consolidated billing, and centralized root access. AWS recommends removing root credentials from member accounts where centralized root access is used. If a standalone account is unavoidable, root receives a unique stored password, at least two separately held phishing-resistant MFA devices, no access keys, current recovery email/phone, and a two-person access procedure.

### 3.2 Ownership and identity rules

- Company finance controls billing contact and payment method; security controls alternate security contact; operations controls alternate operations contact.
- Root is never a routine administrator and has no access keys. Root-use alerts are mandatory.
- Human access uses individual federated identities and short-lived sessions. Backup operator and reviewer are different people and different sessions.
- Workload access uses an assumable role with temporary credentials. The trust policy is a separate P0 decision because the external identity provider/broker has not been selected.
- The break-glass role is not a daily admin. Its assumption requires MFA, the `BreakGlassApproved=true` session/principal tag, an incident/approval record, short duration, and post-use review.
- No role has `AdministratorAccess`; no routine role can change its own policy or trust relationship.

Official account guidance: [AWS root-user best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html), [IAM MFA guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html), and [Organizations member-account guidance](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices_member-acct.html).

## 4. Region comparison

| Criterion | `ca-central-1` — Canada (Central) | `us-east-1` — US East (N. Virginia) |
| --- | --- | --- |
| Geography | AWS identifies three AZs in Canada. | AWS identifies six AZs in Virginia, USA. |
| Residency value | Keeps the independent S3/KMS copy in Canada, subject to confirmed service behavior and contract. This does not make CarbonLite Canada-only because Neon and Render sources are in the US. | Keeps backup processing/storage in the US, consistent with current source-system geography. |
| Independence | Adds geographic/country separation from Neon N. Virginia and Render Ohio. | Separate account/provider boundary, but same AWS Region geography as Neon. |
| Transfer path | Cross-border upload from both US source providers; provider egress, latency, and legal transfer terms must be checked. | Likely lowest latency for Neon; Render Ohio remains cross-region/provider. Provider egress terms still apply. |
| Price planning | Use a conservative assumed S3 Standard input of $0.025/GiB-month until AWS Calculator verification. | Use a conservative assumed input of $0.023/GiB-month until verification. |
| Operations | Slightly more transfer latency is immaterial for a daily 1–3 GB pair; service/feature availability must be confirmed. | Broadest familiarity and simplest match to Neon geography. |

**Provisional recommendation:** select `ca-central-1` if owner/legal approve Canadian backup storage, the necessary AWS services/features, DPA and US-to-Canada transfer, and the small cost/latency difference. Otherwise select `us-east-1`. Do not create buckets/keys in both Regions “just in case”; an ungoverned second copy complicates deletion and cost.

AWS documents both Regions as enabled by default and identifies their geographies in [AWS Regions](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html). Region choice is still a CarbonLite legal/operational decision.

## 5. Resource architecture

Use names that reveal no customer or environment secret. Globally unique suffixes are generated by the owner and are not committed.

| Resource alias | Proposed purpose | Object Lock | Default encryption |
| --- | --- | --- | --- |
| `CL-BACKUP` | Encrypted recovery pairs under `pairs/` | Synthetic: governance; real data: compliance; proposed 16 days | SSE-S3 plus client-side envelope encryption |
| `CL-CONTROL` | Signed requests, approvals, generation checkpoints, capture/verification/hold/deletion/erasure evidence | Proposed compliance; proposed 730 days, pending legal | SSE-S3; signed content; no raw customer data |
| `CL-LOGS` | S3 server access logs and CloudTrail logs | Disabled because S3 server-access-log destinations cannot use Object Lock | SSE-S3 |
| `alias/carbonlite-backup-envelope` | Symmetric KMS key wrapping per-pair AES-256-GCM data keys | Not applicable | Key policy separates `GenerateDataKey` from `Decrypt` |
| `alias/carbonlite-recovery-signing` | Asymmetric `SIGN_VERIFY` KMS key for canonical state/evidence digest signatures | Not applicable | Private key remains in KMS; reviewer signs, readers verify |
| `CarbonLiteBackupAudit` | CloudTrail management plus scoped S3 object data events | Logs delivered to `CL-LOGS` | Log file integrity validation enabled |

S3 server access logs require a destination in the same account/Region and AWS states that an Object-Lock-enabled bucket cannot be the destination. That is why `CL-LOGS` is separate. It is not an authoritative recovery state store.

## 6. S3 protection model

### 6.1 Backup bucket

- General purpose S3 Standard bucket; no website hosting, access point, replication, ACL, or public policy.
- All four account- and bucket-level Block Public Access settings enabled.
- Object Ownership `Bucket owner enforced`; ACLs disabled.
- Versioning enabled and never suspended.
- Object Lock enabled at creation. Use governance only for synthetic rehearsal. Use compliance default retention of 16 days only after approval for real-data writes.
- Lifecycle proposal: expire current versions at day 17, permanently delete noncurrent versions after one additional day, remove expired delete markers, and abort incomplete multipart uploads after one day.
- Lifecycle never overrides active Object Lock. In a versioned bucket it can create a delete marker while a protected version remains. Expiry verification must enumerate versions and retention metadata, not only current keys.
- Default SSE-S3 plus authenticated client-side encryption. Bucket policy requires HTTPS and TLS 1.2 or later.
- Backup Writer is explicitly denied deletion, retention change, legal hold, and governance bypass.

AWS documents that compliance retention cannot be shortened or bypassed even by root, while governance can be bypassed by principals with special permission: [S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html). AWS documents bucket-owner-enforced ownership and default-disabled ACLs in [S3 Object Ownership](https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html).

### 6.2 Retention/deletion reconciliation

The 16-day number is an immutable minimum, not an exact deletion date. With day-17 lifecycle processing, UTC rounding, delete markers, noncurrent-version expiration, failed jobs, manually extended retention, provider-native seven-day windows, and legal holds, actual final deletion can be later.

For every deletion/erasure case, the external ledger records possibly containing Pair IDs, version IDs, retain-until dates, and `latest_expected_backup_expiry`. A case is not “backup expired” until inventory confirms every containing version is absent. Object Lock Compliance cannot be used if CarbonLite promises deletion earlier than its retain-until date. Legal Hold release recalculates deadlines; it does not immediately delete anything.

### 6.3 Encryption

Recommended default:

1. Writer calls `GenerateDataKey` on the symmetric key with encryption context `carbonlite-purpose=backup-pair` and the Pair ID.
2. Writer encrypts each stream using AES-256-GCM with a unique nonce and authenticated metadata, stores only the KMS-wrapped data-key ciphertext, encryption context, nonces, and algorithm/key ID in the safe signed pair manifest, and zeroizes plaintext key material. The wrapped key is not secret plaintext and must remain outside the content it is needed to decrypt.
3. Verifier reads ciphertext/hashes without `kms:Decrypt`.
4. Recovery Operator receives pair-specific temporary permission to decrypt only when the encryption context includes the approved Pair ID.
5. Independent Reviewer cannot decrypt; it signs the evidence digest with the separate asymmetric signing key.

An external `age` X25519 recipient with the private key held in a non-AWS vault is a valid stronger-separation alternative and removes the symmetric KMS key charge. The owner must choose one design and rehearse key recovery. SSE-S3 remains defense in depth in either design.

## 7. Independent recovery authority

`CL-CONTROL` is outside Neon, Render, and the restored database. It contains minimized canonical JSON and detached signatures only—no source bytes, extracted data, customer names, legal narrative, credentials, or private keys.

### 7.1 Append-only key spaces

```text
events/capture/YYYY/MM/DD/<event-id>.json
events/verifier/YYYY/MM/DD/<event-id>.json
events/reviewer/YYYY/MM/DD/<event-id>.json
events/hold-deletion-erasure/YYYY/MM/DD/<event-id>.json
recovery/requests/<session-id>/<request-id>.json
recovery/approvals/<session-id>/<generation>-<approval-id>.json
checkpoints/generation/<environment>/<20-digit-generation>-<state-digest>.json
public-keys/<key-id>.json
```

Every event contains format version, environment alias, UTC time, actor principal ID, action, recovery session/Pair ID where applicable, prior-event digest, evidence/ledger/restored-state digests, nonce, generation, KMS key ID/algorithm, and signature. Sensitive facts are represented by opaque references or hashes.

### 7.2 Non-rollback checkpoint

- Generations are zero-padded, strictly increasing, and bound into the signed state.
- Reviewer writes a new unique generation key using conditional create semantics (`If-None-Match: *` in the future implementation). Existing generation keys are never updated.
- The reader lists all versions, rejects duplicate generation keys or multiple current versions, verifies the complete signature/hash chain, and accepts only the highest valid generation at or above its separately pinned minimum.
- Object Lock prevents removal during the evidence period. S3 versioning alone is not accepted as anti-rollback.
- Operator can submit requests but cannot sign approvals/checkpoints. Reviewer can sign/append but cannot decrypt/restore. The application is read-only.
- Any missing generation, chain discontinuity, stale nonce, expired approval/lease, signature failure, or target mismatch yields `RECOVERY_LOCKED`.

S3 operations across multiple objects are not atomic. The transition protocol writes a proposed event, signs canonical state, creates the checkpoint, reads it back, then appends completion evidence. A crash at any intermediate step remains locked and is reconciled; it never implies release.

### 7.3 Signing keys

Use an asymmetric KMS signing key, preferably an approved ECC signing specification supported by all verifiers. The private key never leaves KMS; pin the exported public key and key ID in the recovery launcher. `kms:Sign` belongs only to the reviewer role; `kms:Verify`/`GetPublicKey` may be read-only. The signed payload includes creation/expiry times because signatures do not supply freshness by themselves. See [AWS KMS signing keys](https://docs.aws.amazon.com/kms/latest/developerguide/symm-asymm-choose-key-spec.html).

## 8. Recovery-pair object layout

Synthetic example only:

```text
pairs/CLRP-20261106T060000Z-6f4f1c8a9b2d47e3/
  database/postgresql.dump.aes256gcm
  storage/active-documents.tar.aes256gcm
  storage/quarantine.tar.aes256gcm
  manifests/file-sha256-manifest.json.aes256gcm
  manifests/application-and-migrations.json.aes256gcm
  manifests/ledger-at-capture.json.aes256gcm
  manifests/recovery-pair.json
  manifests/recovery-pair.sig
```

Safe manifest excerpt:

```json
{
  "formatVersion": 1,
  "recoveryPairId": "CLRP-20261106T060000Z-6f4f1c8a9b2d47e3",
  "sourceAlias": "synthetic-provider-source-a",
  "applicationSha": "1111111111111111111111111111111111111111",
  "migrationManifestSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "ledgerHead": {
    "sequence": 42,
    "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  },
  "objectLockRetainUntil": "2026-11-22T06:00:00Z",
  "dataClassification": "SYNTHETIC"
}
```

Object keys contain no organization name, person, filename, email, case description, or document identifier. The encrypted file manifest maps normalized opaque storage keys to SHA-256, bytes, storage class (`ACTIVE`, `QUARANTINE`, or `MANAGED_REPORT`), and safe opaque record reference.

## 9. Monitoring and evidence

- CloudTrail: one multi-Region trail; management events plus scoped read/write S3 data events for backup/control buckets; log file validation enabled. Data events are not enabled by default and are billable.
- S3 server access logs: backup/control buckets to separate `CL-LOGS` prefixes. They supplement CloudTrail and are not immediate or complete authorization evidence.
- S3 Storage Lens free daily metrics and free S3 daily storage metrics for size/object trend.
- Optional paid one-minute request metrics only after cost approval. CloudWatch metrics are best effort, not an audit ledger.
- Budget: monthly actual and forecast alerts to owner, finance, and security; thresholds based on the approved scenario.
- Alerts: root/break-glass use, CloudTrail stop/change, bucket policy/BPA/Object Lock/versioning/lifecycle/encryption changes, KMS disable/policy/grant/sign/decrypt anomalies, access denied spikes, unexpected Get/Delete/Put, pair-age breach, and cost anomaly.
- Inventory: future S3 Inventory may include retain-until, mode, and legal-hold status, but AWS notes reports can lag up to 48 hours. Exact expiry decisions must read current object-version metadata.

Official references: [CloudTrail S3 data events](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-s3-data-events-governance.html), [S3 server access logging](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html), [S3 Storage Lens](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens_basics_metrics_recommendations.html), and [Object Lock inventory metadata](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html).

## 10. Future synthetic validation—not executed in B3

1. Upload one encrypted synthetic pair through Backup Writer and read back object versions, ciphertext SHA-256, retention, encryption, and size through Backup Verifier.
2. Prove anonymous HTTP/HTTPS and a foreign AWS principal receive access denied; inspect Block Public Access and Access Analyzer.
3. Prove Backup Writer cannot Get, Delete, DeleteVersion, change retention/legal hold, bypass governance, list unrelated prefixes, or alter bucket policy/lifecycle.
4. Prove Verifier can list/read ciphertext and metadata but cannot upload, delete, decrypt, sign, approve, or change configuration.
5. In governance-mode synthetic resources, verify ordinary identities cannot delete; use a separately approved disposable test to assess bypass behavior. Do not attempt compliance-mode early deletion.
6. Restore the synthetic pair only to new allowlisted provider targets and verify hashes/migrations/ledger reconciliation.
7. Submit an operator request, reviewer signature, increasing generation checkpoint, release, replay attempt, stale generation, self-approval, signature corruption, and re-lock. Every invalid case remains locked.
8. Verify CloudTrail data events, server access logs, KMS events, root/break-glass alerts, storage metrics, budget delivery, and expected cost.
9. Verify lifecycle/delete-marker/noncurrent-version behavior after the synthetic retention window; enumerate versions before claiming expiry.

## 11. P0 and P1 gaps

### P0 before any AWS mutation

- Signed owner selection of account form, Region, billing owner, root custody, identity source, spend limit, and contacts.
- Legal/privacy approval of AWS as subprocessor, Region/cross-border path, 16-day backup retention, control/log evidence periods, deletion wording, and Legal Hold exceptions.
- Approved workload federation/trust design; no long-lived Render access key.
- Final key design, custodians, rotation/recovery, and KMS key policies.
- Placeholder substitution and independent review of every IAM/bucket policy; IAM Access Analyzer validation in the Console before creation.

### P0 before synthetic AWS validation

- Owner-executed account/buckets/keys/roles/logging/alerts with read-back evidence.
- Exact synthetic test authorization, disposable resources, cost cap, operators, and cleanup plan.
- Backup tooling capable of encryption-context binding, conditional control-store writes, version-aware verification, and no-overwrite Pair IDs.

### P0 before real-data pilot

- All B2 P0 capture/write-freeze, monitoring, ledger, recovery-authority, provider-isolation, and rehearsal controls.
- Compliance-mode 16-day value and lifecycle reconciled to the approved retention/deletion policy and customer terms.
- Successful synthetic provider rehearsal, three consecutive verified production-shaped pairs, and a complete version-aware expiry test.
- Production access review, restore/key-release rehearsal, incident response, provider DPAs, and no unresolved Phase 3G-B1 gap.

### P1

- Organization SCP/resource-control-policy guardrails; separate security-log account; automatic policy/config drift detection; S3 Inventory export and expiry reconciliation; access recertification; key rotation rehearsal; cost anomaly automation; and assessed second Region/account copy if future contracts require it.

## 12. Decisions

| Decision | Result | Basis |
| --- | --- | --- |
| Offline documentation/templates | **GO—complete** | No cloud or production mutation. |
| Owner review and price/legal verification | **GO** | Read-only/preparation activity only. |
| Create AWS backup account/resources | **NO-GO** | Region, retention, legal, identity/trust, keys, and owner signatures remain pending. |
| Run synthetic AWS tests | **NO-GO** | Resources do not exist and the B3 task forbids execution. |
| Real-data pilot | **NO-GO** | Independent backups and external authority are not deployed or rehearsed. |
