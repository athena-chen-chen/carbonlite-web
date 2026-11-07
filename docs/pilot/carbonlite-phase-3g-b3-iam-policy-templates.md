# CarbonLite Phase 3G-B3 IAM Policy Templates

**Status:** Offline permission-policy templates; JSON syntax validated locally, not validated or deployed by AWS

These templates are not credentials, role trust policies, KMS key policies, bucket names, or authorization to create IAM resources. AWS IAM Access Analyzer Console validation and an independent human review are P0 before use.

## 1. Files

| Role/control | Template | Intended boundary |
| --- | --- | --- |
| Backup Writer | `aws-templates/backup-writer-policy.json` | Create encrypted pair objects and capture events; generate envelope data key; no read/decrypt/delete/retention/configuration. |
| Backup Verifier | `aws-templates/backup-verifier-policy.json` | Read ciphertext, versions, retention, configuration, and signed evidence; verify signatures; no decrypt/write/delete. |
| Recovery Operator | `aws-templates/recovery-operator-policy.json` | Read/decrypt one explicitly approved Pair ID and submit recovery request; no approval/sign/delete/configuration. |
| Independent Reviewer | `aws-templates/independent-reviewer-policy.json` | Read evidence, sign canonical digest, append approval/generation; no decrypt/restore/delete/configuration. |
| Break-glass Administrator | `aws-templates/break-glass-administrator-policy.json` | Recover named resources/configuration under MFA and approval tag; no generic admin, KMS decrypt/sign, or governance bypass. |
| Backup bucket defense | `aws-templates/s3-backup-bucket-policy.json` | Deny insecure/TLS-before-1.2 access and explicitly deny writer deletion/retention changes. |

## 2. Required substitutions

Replace every token in a private generated copy:

| Token | Required value | Validation |
| --- | --- | --- |
| `__BACKUP_ACCOUNT_ID__` | 12-digit dedicated AWS backup account ID | Must not be a production runtime/developer account. |
| `__REGION__` | Approved `ca-central-1` or `us-east-1` | Must match all named bucket/KMS resources. |
| `__BACKUP_BUCKET__` | Exact globally unique backup bucket name | No `arn:aws:s3:::` prefix in replacement. |
| `__CONTROL_BUCKET__` | Exact control bucket name | Must be distinct from backup/log buckets. |
| `__LOG_BUCKET__` | Exact log bucket name | Same account/Region; Object Lock disabled. |
| `__ENCRYPTION_KEY_ID__` | Symmetric envelope KMS key UUID | Do not use signing key or alias without reviewing ARN behavior. |
| `__SIGNING_KEY_ID__` | Asymmetric signing KMS key UUID | `SIGN_VERIFY`; reviewer-only signing. |
| `__APPROVED_RECOVERY_PAIR_ID__` | One exact approved Pair ID | Never substitute `*`; issue a pair-specific session policy. |

After substitution, search for `__[A-Z0-9_]+__`; any match is a STOP. Record SHA-256 of each generated policy and compare it at Console entry.

## 3. Capability matrix

`A` = allowed by template; `—` = not granted. An explicit deny or Object Lock can still override an allow.

| Capability | Writer | Verifier | Operator | Reviewer | Break-glass |
| --- | :---: | :---: | :---: | :---: | :---: |
| Create pair objects | A | — | — | — | — |
| Abort own incomplete multipart upload | A | — | — | — | — |
| List pair prefix/versions | — | A | exact pair | A | A |
| Read pair ciphertext | — | A | exact pair | A | A |
| Generate envelope data key | A | — | — | — | — |
| Decrypt envelope data key | — | — | exact pair/context | — | — |
| Submit recovery request | — | — | A | — | — |
| Append approval/generation | — | — | — | A | — |
| KMS sign | — | — | — | A | — |
| KMS verify/public key | — | A | — | A | — |
| Delete pair/control object | — | — | — | — | A after retention, MFA/tag |
| Bypass governance retention | explicit deny | — | — | — | — |
| Change designated bucket config | — | — | — | — | A with MFA/tag |
| Change routine role policies/trust | — | — | — | — | A on four exact roles |
| KMS decrypt or sign via break-glass | — | — | — | — | — |

Break-glass remains highly privileged: it can change named routine-role policies and bucket configuration. It is an incident mechanism, not part of normal backup or recovery. Compliance-mode Object Lock remains the protection against premature deletion.

## 4. Trust policies are deliberately not guessed

Permission and trust are separate. Attaching these JSON documents to a role does not safely authorize anyone to assume it.

### 4.1 Humans

Use IAM Identity Center or the company IdP to issue temporary role sessions. Map distinct named groups to Verifier, Recovery Operator, Independent Reviewer, and a tightly controlled Break-glass path. Require phishing-resistant MFA, short sessions, and no shared identity. The operator and reviewer groups must not overlap for the same recovery event.

The trust policy should name the exact Identity Center/IdP principal and require approved session tags where supported. Do not trust the whole AWS account merely because it is company-owned.

### 4.2 Backup workload on Render

No safe workload issuer is verified in B3. Preferred order:

1. short-lived federated STS session from an approved workload identity broker with audience, subject, and environment claims pinned;
2. a separately controlled job runner that assumes Backup Writer and receives the streamed encrypted pair without exposing credentials to the web service; or
3. another reviewed temporary-credential mechanism.

Do not create an IAM user/access key and place it in Render environment variables as the default solution. If no temporary mechanism is feasible, stop and obtain a documented time-bounded exception with rotation, secret scanning, revocation, and incident controls; real-data remains NO-GO.

## 5. Policy-specific notes

### 5.1 Backup Writer

- `PutObject` also permits a new version at an existing key; IAM alone does not provide conditional-create semantics. The capture implementation must generate unpredictable Pair IDs, use conditional create/no-overwrite behavior, and fail if any prefix/version already exists.
- S3 object/prefix and KMS encryption-context scope derive from the `RecoveryPairId` principal/session tag. The role trust and session broker must validate the Pair ID format and prevent the workload from choosing or altering an unauthorized tag.
- Writer has no completed-object or bucket-list read. A separate verifier performs preflight/read-back; multipart upload state is limited to listing parts/aborting the exact tagged Pair-ID object prefix.
- Bucket default Object Lock must protect every completed upload because Writer has no `PutObjectRetention` permission.
- `AbortMultipartUpload` deletes only an incomplete upload, not a completed object. The pair manifest must record aborted/partial attempts.
- `GenerateDataKey` returns plaintext data-key material to the writer for client-side encryption. The writer must bind the approved encryption context, never log the key, and zeroize it after streaming.
- The backup bucket policy explicitly denies writer deletion, retention changes, legal-hold changes, and governance bypass even if a future identity policy accidentally grants one.

### 5.2 Backup Verifier

- It can read ciphertext and unencrypted safe pair metadata but has no `kms:Decrypt`.
- `GetPublicKey`/`Verify` permit signature validation, not signing.
- It cannot append `PAIR_VERIFIED` in this template. The future verification service needs a separate append-only evidence writer or a narrowly reviewed addition to `events/verifier/`; do not give the verifier broad control-bucket writes by convenience.

### 5.3 Recovery Operator

- Generate a temporary policy for one Pair ID and session. The encryption context must contain both `carbonlite-purpose=backup-pair` and the exact Pair ID.
- The encryption implementation must use the same purpose and Pair-ID context at `GenerateDataKey`; otherwise KMS decrypt will correctly fail. The Writer template binds it to the protected `RecoveryPairId` session tag.
- Operator submits requests only. It has no KMS signing, approval-prefix write, delete, lifecycle, Object Lock, bucket-policy, or IAM permission.

### 5.4 Independent Reviewer

- It reads ciphertext/metadata and control evidence but cannot decrypt the pair.
- `kms:Sign` is restricted to the exact signing key. The key policy must independently allow only the reviewer role and key custodians; an identity-policy allow is insufficient if the key policy does not authorize it.
- The implementation must sign a canonical digest with time, expiry, nonce, generation, session, Pair ID, object version IDs/hashes, target aliases, migration/app/ledger digests, and operator/reviewer IDs.
- A `PutObject` allow can create another version at the same generation key. Readers must reject duplicates, and the reviewer tool must use conditional creation.

### 5.5 Break-glass Administrator

- Requires both MFA context and `BreakGlassApproved=true`. The trust/session-tag design must prevent the role user from self-asserting that tag.
- It has exact bucket, role, key, and trail resources; it does not have `AdministratorAccess`, `s3:*` allow, `iam:*`, `kms:*`, `kms:Decrypt`, `kms:Sign`, `s3:BypassGovernanceRetention`, CloudTrail stop/delete, or KMS deletion scheduling.
- It can delete named-bucket object versions after retention allows it. Every use requires incident ID, two-person approval, CloudTrail review, and credential/session revocation.
- It can change four routine-role policies/trusts, which is an escalation path by design. Require a permissions boundary/SCP and post-use independent comparison to the reviewed policy hashes.

## 6. Bucket-policy notes

The TLS policy uses `Deny` with `Principal: "*"`; this is a universal guardrail, not administrator permission. AWS notes that network condition keys can be absent/redacted in service-to-service calls, so the template excludes AWS service principals from those denies with `aws:PrincipalIsAWSService=false`. The owner must review whether any enabled service integration requires a narrower exception.

Block Public Access must remain enabled at both account and bucket levels. Bucket policy does not replace BPA, bucket-owner-enforced ownership, versioning, Object Lock, or identity least privilege.

Use equivalent TLS/role-separation policies for the control bucket after substituting its ARN and exact writer roles. Do not blindly attach the backup policy to the log bucket; log delivery needs service-principal permissions generated from the approved source bucket/account and CloudTrail configuration.

Official references: [S3 encryption in transit](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryptionInTransit.html), [S3 policy condition caveat](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html), and [IAM Access Analyzer validation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-validation.html).

## 7. Offline validation performed in B3

The B3 validation is limited to:

- strict JSON parsing;
- policy version/statement structure;
- no unresolved invalid JSON;
- no `Effect: Allow` with `Action: "*"`, `s3:*`, `iam:*`, or `kms:*`;
- no Backup Writer delete, decrypt, sign, retention, legal-hold, governance-bypass, bucket-policy, lifecycle, or IAM allow;
- no Verifier write/delete/decrypt/sign allow;
- no Operator sign/approval/delete/configuration allow;
- no Reviewer decrypt/delete/configuration allow; and
- resource scoping to explicit placeholders/prefixes.

This does not prove AWS action/resource compatibility, key-policy compatibility, trust safety, or effective permissions. Before creation, paste each substituted policy into the IAM Console JSON editor, resolve IAM Access Analyzer findings, then use the future synthetic permission tests. No AWS validation call was made in B3.
