# CarbonLite Phase 3G-B3 AWS Console Guide

**Status:** Owner-executable future checklist; no step was executed in B3

**Current gate:** Stop before every `MUTATING_ACTION` until the B3 owner checklist authorizes the exact account, Region, values, and operators.

## 1. Action labels

| Label | Meaning in this guide |
| --- | --- |
| `READ_ONLY` | View current state; do not choose Edit/Create/Save/Enable/Delete. |
| `PREPARE_ONLY` | Prepare an offline value, screenshot plan, or evidence reference. No AWS change. |
| `REQUIRES_OWNER_APPROVAL` | A signed decision is required before the next mutating step. |
| `MUTATING_ACTION` | Creates or changes AWS state. Forbidden during B3; future owner execution only. |

Console names can change. If the visible field, warning, or behavior differs from this guide, stop and update/reapprove the guide. Never paste secrets, customer data, production connection strings, or private keys into the Console or evidence package.

## 2. Stop conditions

Stop without creating/changing anything if:

- the signed owner checklist is absent, expired, or does not identify the account ID and Region;
- the signed Region differs from the Console Region;
- the account is personal, shared with production runtime, or not legally owned by KACH CANADA LTD.;
- the root user has an access key, lacks approved MFA/root custody, or is being used for routine work;
- the bucket name, account ID, KMS key, role trust, Object Lock mode/period, lifecycle, or log destination is ambiguous;
- a policy still contains `__PLACEHOLDER__` text or IAM validation reports an unresolved error/security warning;
- Object Lock shows `COMPLIANCE` before the exact period is legally/operationally approved;
- any target contains existing objects or appears related to Neon, Render, staging, production application runtime, or a customer;
- public access, ACLs, website hosting, replication, static access keys, or generic administrator access would be required; or
- an instruction would expose or process real data before the real-data GO decision.

## 3. Offline preparation record

- [ ] `PREPARE_ONLY` Record legal owner: `KACH CANADA LTD.`
- [ ] `PREPARE_ONLY` Record proposed account name: `CarbonLite-Backup-Prod`.
- [ ] `PREPARE_ONLY` Record company group root email, billing contact, security contact, operations contact, and recovery phone custodians without putting credentials in this document.
- [ ] `PREPARE_ONLY` Record selected Region: `________________` and approval reference: `________________`.
- [ ] `PREPARE_ONLY` Generate globally unique non-customer-derived suffix: `________________`.
- [ ] `PREPARE_ONLY` Resolve final names:
  - backup bucket: `carbonlite-backup-<account-id>-<region>-<suffix>`;
  - control bucket: `carbonlite-recovery-control-<account-id>-<region>-<suffix>`;
  - log bucket: `carbonlite-backup-logs-<account-id>-<region>-<suffix>`.
- [ ] `PREPARE_ONLY` Record proposed backup retention, lifecycle, control evidence retention, log retention, monthly budget, and alert recipients.
- [ ] `PREPARE_ONLY` Substitute templates in a private working copy; do not commit generated account IDs, bucket names, or principal ARNs if the owner classifies them as sensitive.
- [ ] `REQUIRES_OWNER_APPROVAL` Business, infrastructure/security, privacy/legal, independent reviewer, finance, and key custodian approve the preparation record.

## 4. Separate AWS account

### 4.1 Preferred AWS Organizations member account

- [ ] `READ_ONLY` In the AWS Organizations management account, open **AWS Organizations → AWS accounts** and confirm the organization is company-controlled. Do not expose other account data in evidence.
- [ ] `REQUIRES_OWNER_APPROVAL` Confirm the management-account owner is authorized to create the dedicated member account and consolidated billing is accepted.
- [ ] `MUTATING_ACTION` Choose **Add an AWS account → Create an AWS account**. Use account name `CarbonLite-Backup-Prod` and the approved company group email. Do not create IAM role access beyond the approved organization default.
- [ ] `MUTATING_ACTION` Under IAM centralized root access, remove member-account root credentials if the organization has adopted AWS centralized root access; otherwise secure root as in §4.2.
- [ ] `MUTATING_ACTION` Assign approved IAM Identity Center users/groups and permission sets for owner setup, operator, reviewer, and audit. Use individual identities and MFA.
- [ ] `READ_ONLY` Record account ID, organization membership, root credential status, and Identity Center assignments in restricted evidence.

### 4.2 Standalone-account fallback

- [ ] `REQUIRES_OWNER_APPROVAL` Document why Organizations is unavailable and who assumes management-account responsibilities.
- [ ] `MUTATING_ACTION` Create the AWS account using the approved company group email, legal entity, billing method, and contacts.
- [ ] `MUTATING_ACTION` Sign in once as root; set a unique generated password in split-custody storage; register at least two approved MFA devices held by separate custodians.
- [ ] `READ_ONLY` Open **IAM → Security recommendations/Credential report** and confirm root MFA is enabled and root access keys are absent.
- [ ] `MUTATING_ACTION` Create/enable IAM Identity Center administrative access for named daily administrators. Sign out root.
- [ ] `MUTATING_ACTION` Configure root-use alerting through the approved CloudTrail/EventBridge/SNS path.
- [ ] `READ_ONLY` Confirm current recovery email/phone and that no one person controls password, all MFA, email, and phone recovery.

## 5. Account-level security and billing baseline

- [ ] `READ_ONLY` Confirm Console account ID and selected Region on every page before changes.
- [ ] `MUTATING_ACTION` Open **Amazon S3 → Block Public Access settings for this account → Edit**; enable all four settings and save.
- [ ] `MUTATING_ACTION` In **Billing and Cost Management → Billing preferences**, enable the approved billing alerts and grant finance read-only billing visibility.
- [ ] `MUTATING_ACTION` In **Billing and Cost Management → Budgets → Create budget**, choose **Customize (advanced) → Cost budget → Monthly**. Use approved amount `$_______`; add actual alerts at 50%, 80%, 100% and forecast alert at 100% to owner, finance, and security.
- [ ] `MUTATING_ACTION` Add alternate billing, operations, and security contacts under **Account**.
- [ ] `READ_ONLY` Confirm no unexpected Region/resources, public buckets, access keys, users, or charges exist.

## 6. Create the log bucket first

S3 server access logging requires a same-account, same-Region destination without Object Lock/default retention.

- [ ] `REQUIRES_OWNER_APPROVAL` Approve selected Region, proposed log retention (`______ days`; 90 days is the B3 proposal), and log readers.
- [ ] `MUTATING_ACTION` Open **Amazon S3 → General purpose buckets → Create bucket**.
- [ ] `MUTATING_ACTION` Select approved Region and enter the approved `CL-LOGS` physical name.
- [ ] `MUTATING_ACTION` Under **Object Ownership**, keep **ACLs disabled (recommended) / Bucket owner enforced**.
- [ ] `MUTATING_ACTION` Under **Block Public Access**, keep all four settings enabled.
- [ ] `MUTATING_ACTION` Enable **Bucket Versioning**.
- [ ] `MUTATING_ACTION` Leave **Object Lock disabled**. Do not configure default retention.
- [ ] `MUTATING_ACTION` Under **Default encryption**, select **SSE-S3**. Do not use SSE-KMS for an S3 server-access-log destination.
- [ ] `MUTATING_ACTION` Create the bucket.
- [ ] `MUTATING_ACTION` On **Management → Lifecycle rules**, create an approved rule for log expiry and incomplete multipart upload cleanup. Do not use the 16-day backup rule for logs.
- [ ] `READ_ONLY` Verify Region, ownership, all BPA settings, versioning, Object Lock disabled, encryption, and lifecycle. Capture narrowly cropped evidence.

## 7. Create KMS keys

### 7.1 Client-side envelope encryption key

- [ ] `REQUIRES_OWNER_APPROVAL` Approve KMS envelope encryption instead of the external-`age` alternative, key admins/users, rotation, recovery, and cost.
- [ ] `MUTATING_ACTION` Open **AWS KMS → Customer managed keys → Create key** in the selected Region.
- [ ] `MUTATING_ACTION` Choose **Symmetric**, **Encrypt and decrypt**, KMS key material; alias `carbonlite-backup-envelope`.
- [ ] `MUTATING_ACTION` Assign only approved key administrators. Key administrators do not automatically receive cryptographic use.
- [ ] `MUTATING_ACTION` Assign Backup Writer `GenerateDataKey` and Recovery Operator `Decrypt` only through the final role/key policies. Do not grant reviewer decrypt or writer decrypt.
- [ ] `MUTATING_ACTION` Configure approved rotation. Record that AWS pricing may add monthly key-version charges after rotations; verify before enabling.
- [ ] `READ_ONLY` Record key ARN/ID, state, key policy digest, rotation state, and administrators without recording key material.

### 7.2 Recovery signing key

- [ ] `REQUIRES_OWNER_APPROVAL` Approve signing algorithm supported by the recovery verifier. B3 proposes asymmetric ECC `SIGN_VERIFY`.
- [ ] `MUTATING_ACTION` Choose **Create key → Asymmetric → Sign and verify**, select the approved ECC specification/algorithm, alias `carbonlite-recovery-signing`.
- [ ] `MUTATING_ACTION` Grant `Sign` only to Independent Reviewer and `Verify`/`GetPublicKey` to read-only consumers. Do not grant signing to Backup Writer, Recovery Operator, or application runtime.
- [ ] `READ_ONLY` Export/record the public key through the approved process and pin its digest/key ID in restricted recovery configuration. Never export private key material; KMS does not expose it.

## 8. Create the backup bucket

- [ ] `REQUIRES_OWNER_APPROVAL` Approve physical name, Region, governance/compliance mode, 16-day proposal, lifecycle, client-side encryption design, and deletion-policy reconciliation.
- [ ] `MUTATING_ACTION` Open **Amazon S3 → General purpose buckets → Create bucket**; select approved Region and physical `CL-BACKUP` name.
- [ ] `MUTATING_ACTION` Keep **Object Ownership: Bucket owner enforced / ACLs disabled**.
- [ ] `MUTATING_ACTION` Keep all four **Block Public Access** settings enabled.
- [ ] `MUTATING_ACTION` Enable **Bucket Versioning**.
- [ ] `MUTATING_ACTION` Enable **Object Lock** and acknowledge that Object Lock changes retention/deletion behavior. Do not proceed if the warning differs from the approved plan.
- [ ] `MUTATING_ACTION` Select **SSE-S3** default encryption. Client-side AES-256-GCM remains mandatory; SSE-S3 is defense in depth.
- [ ] `MUTATING_ACTION` Create the bucket.
- [ ] `MUTATING_ACTION` Under **Properties → Object Lock**, configure default retention:
  - synthetic-only proving: **Governance**, approved short test period `______`;
  - real-data readiness only after separate approval: **Compliance**, **16 days proposed**.
- [ ] `MUTATING_ACTION` Under **Permissions**, confirm BPA is all On, Object Ownership is bucket-owner-enforced, ACL editing is disabled, and website hosting is disabled.
- [ ] `MUTATING_ACTION` Under **Permissions → Bucket policy**, paste the substituted `s3-backup-bucket-policy.json`; verify exact account/role/bucket values; save.
- [ ] `MUTATING_ACTION` Under **Management → Lifecycle rules**, create `CarbonLiteBackupPairExpiry` scoped to `pairs/`:
  - expire current versions after **17 days proposed**;
  - permanently delete noncurrent versions after **1 additional day proposed**;
  - delete expired object delete markers;
  - abort incomplete multipart uploads after **1 day**;
  - do not transition storage class during the pilot.
- [ ] `MUTATING_ACTION` Under **Properties → Server access logging**, enable logging to `CL-LOGS` with prefix `s3-access/backup/` and event-time partitioning if offered.
- [ ] `READ_ONLY` Verify and evidence bucket name/Region, ownership, BPA, versioning, Object Lock/mode/duration, encryption, TLS policy, lifecycle, and logging destination. Do not upload data.

## 9. Create the recovery-control bucket

- [ ] `REQUIRES_OWNER_APPROVAL` Approve minimized evidence schema and retention. B3 proposes compliance mode and 730 days, but no value is approved.
- [ ] `MUTATING_ACTION` Create the `CL-CONTROL` general purpose bucket in the same approved Region with bucket-owner-enforced ownership, all BPA enabled, versioning enabled, Object Lock enabled, and SSE-S3.
- [ ] `MUTATING_ACTION` Configure the approved default Object Lock mode/period. Use governance for synthetic tests if compliance retention is not yet approved. Do not put real identifiers into a synthetic control bucket.
- [ ] `MUTATING_ACTION` Add the same TLS-only/TLS-1.2 minimum policy pattern, substituting the control bucket. Add principal-specific denies so operators cannot write approvals and reviewers cannot write requests.
- [ ] `MUTATING_ACTION` Enable server access logging to `CL-LOGS` prefix `s3-access/control/`.
- [ ] `MUTATING_ACTION` Configure only the legally approved lifecycle. Never apply the 17-day pair rule to control evidence.
- [ ] `READ_ONLY` Verify and evidence every property. Confirm no object exists.

## 10. Create IAM permission policies and roles

The repository JSON files are permission-policy templates only. A safe role also requires an approved trust policy and session controls.

- [ ] `PREPARE_ONLY` Replace every placeholder in a private copy. Recovery Operator must be generated for one approved Pair ID; never replace it with `pairs/*` for convenience.
- [ ] `READ_ONLY` Parse locally and compare policy digest with the reviewed copy.
- [ ] `REQUIRES_OWNER_APPROVAL` Approve the workload federation/broker and human Identity Center groups. Do not create a long-lived IAM user/access key for Render.
- [ ] `MUTATING_ACTION` Open **IAM → Policies → Create policy → JSON** for each template.
- [ ] `MUTATING_ACTION` Paste one substituted policy. Review IAM Access Analyzer **Security, Errors, Warnings, Suggestions**. Stop on every unresolved error/security warning and record disposition of lesser findings.
- [ ] `MUTATING_ACTION` Create named policies/roles:
  - `CarbonLiteBackupWriter` — workload trust only; short session; no Console login; broker-validated `RecoveryPairId` session tag that the workload cannot self-assert;
  - `CarbonLiteBackupVerifier` — named verifier group;
  - `CarbonLiteRecoveryOperator` — named operator; MFA; pair-specific session/policy;
  - `CarbonLiteIndependentReviewer` — different named reviewer; MFA;
  - `CarbonLiteBreakGlassAdministrator` — separately approved emergency principals; MFA and `BreakGlassApproved=true` session tag.
- [ ] `MUTATING_ACTION` Attach only the matching policy. Do not attach AWS managed `AdministratorAccess`, `PowerUserAccess`, `AmazonS3FullAccess`, `AWSKeyManagementServicePowerUser`, or inline convenience grants.
- [ ] `MUTATING_ACTION` Set maximum sessions: writer no longer than the capture window plus margin; verifier/operator/reviewer no longer than one hour; break-glass no longer than one hour, or stricter approved values.
- [ ] `READ_ONLY` Review **IAM → Access Analyzer** for public/cross-account findings and role last-access data. No unexpected principal may access buckets or keys.

## 11. CloudTrail, access logging, metrics, and alerts

- [ ] `REQUIRES_OWNER_APPROVAL` Approve log scope/retention, alert recipients, expected event volume, and cost.
- [ ] `MUTATING_ACTION` Open **CloudTrail → Trails → Create trail**; name `CarbonLiteBackupAudit`; enable for all Regions; deliver to `CL-LOGS` prefix `cloudtrail/`; enable log file integrity validation.
- [ ] `MUTATING_ACTION` Enable management events (read and write) and S3 object-level data events for only `CL-BACKUP` and `CL-CONTROL`, including read and write. Do not accidentally select all high-volume organization buckets.
- [ ] `MUTATING_ACTION` Configure the log bucket policy generated/recommended by CloudTrail only after comparing it to the selected account/trail/bucket.
- [ ] `MUTATING_ACTION` Configure EventBridge/SNS or approved monitoring for root and break-glass use; CloudTrail stop/delete/change; S3 BPA/policy/versioning/Object Lock/lifecycle/encryption changes; KMS disable/key-policy/grant/sign/decrypt anomalies; and unusual read/delete/denied activity.
- [ ] `READ_ONLY` Confirm **Amazon S3 → Storage Lens → default-account-dashboard** is active with free metrics. Do not enable advanced metrics without approval.
- [ ] `MUTATING_ACTION` Enable paid S3 request metrics only if the monitoring budget approves them. Daily bucket storage metrics are already available without additional S3 metric charge.
- [ ] `READ_ONLY` Confirm server-access-log delivery prefixes, CloudTrail logging status, integrity validation, data-event selectors, alert subscriptions, Storage Lens, budget, and recipients.

## 12. Read-back evidence and handoff

- [ ] `READ_ONLY` A different reviewer signs in separately and verifies account ID, Region, contacts, root status, MFA/Identity Center, BPA, all three buckets, both keys, five roles/trusts, CloudTrail, access logs, metrics, lifecycle, Object Lock, encryption, budget, and alerts.
- [ ] `READ_ONLY` Reviewer confirms Backup Writer has no read, decrypt, delete, retention, legal-hold, policy, lifecycle, or IAM permission.
- [ ] `READ_ONLY` Reviewer confirms Recovery Operator cannot sign/approve and Independent Reviewer cannot decrypt/restore.
- [ ] `READ_ONLY` Reviewer confirms break-glass lacks `s3:BypassGovernanceRetention`, `kms:Decrypt`, and `kms:Sign`, and has no wildcard allow.
- [ ] `PREPARE_ONLY` Store sanitized screenshots/exports and policy hashes in the restricted evidence register; do not commit provider IDs or account contacts unless approved.
- [ ] `REQUIRES_OWNER_APPROVAL` Owner reviews the configuration evidence and separately decides whether synthetic validation may begin.

Completing setup does not authorize a backup, restore, provider rehearsal, production access, customer data, application deployment, or real-data pilot.
