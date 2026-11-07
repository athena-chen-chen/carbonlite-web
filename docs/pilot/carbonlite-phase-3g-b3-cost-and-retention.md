# CarbonLite Phase 3G-B3 Cost and Retention Model

**Status:** Planning estimates and retention proposal only; no rate or period is approved

**Estimate date:** November 6, 2026 (America/Edmonton)

All amounts are USD before tax, currency conversion, paid support, legal review, engineering labour, incident response, and third-party identity/vault charges. No AWS account, bill, Pricing API, Neon account, or Render account was accessed. The owner must re-run both candidate Regions through the official AWS Pricing Calculator and verify Neon/Render egress terms immediately before approval.

## 1. Planning rate inputs—not verified current prices

| Input | Planning value | Treatment |
| --- | ---: | --- |
| S3 Standard `us-east-1` | $0.023/GiB-month | Common public planning input; verify current tier/Region. |
| S3 Standard `ca-central-1` | $0.025/GiB-month | Conservative assumed input; verify current tier/Region. |
| S3 PUT/COPY/POST/LIST | $0.005 per 1,000 | Approximation for sensitivity only; verify by Region/request class. |
| S3 GET/other | $0.0004 per 1,000 | Approximation for sensitivity only. |
| Symmetric KMS key | $1/key-month | Official public KMS page currently states $1/month; rotation can add key-version charges. |
| Asymmetric signing KMS key | $1/key-month | Signing requests are separately billed; pilot volume is negligible but not assumed free. |
| CloudTrail S3 data events | $0.10 per 100,000 | Official public planning rate; management-event copies/log storage can add cost. |
| Source-provider outbound egress | $0.10/GiB sensitivity | **Not a verified Neon or Render price.** Shows the cost if provider free allowances do not apply. |
| S3 rehearsal transfer out | $0.09/GiB sensitivity | **Not a verified effective AWS rate.** Destination, free allowance, and Region can change it. |
| Monitoring/logging allowance | $0.25 / $1 / $3 | Scenario allowance for logs, alarms, optional request metrics, and small control objects. |

Official price pages used only as public references: [S3 pricing](https://aws.amazon.com/s3/pricing/), [KMS pricing](https://aws.amazon.com/kms/pricing/), [CloudTrail pricing](https://aws.amazon.com/cloudtrail/pricing/), and [CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/).

## 2. Volume assumptions

The Render disk is 1 GB and active plus quarantine share that ceiling. The database is separate and can exceed it. Every scenario assumes one full pair daily, two pre-change pairs per month, and about 18 concurrently retained pair-equivalents around the proposed 16-day window.

| Assumption | Low | Base | High |
| --- | ---: | ---: | ---: |
| Active/managed files per pair | 0.25 GiB | 0.55 GiB | 0.80 GiB |
| `.quarantine` per pair | 0.05 GiB | 0.15 GiB | 0.20 GiB |
| Compressed PostgreSQL dump/manifests | 0.20 GiB | 0.30 GiB | 2.00 GiB |
| Full encrypted pair | **0.50 GiB** | **1.00 GiB** | **3.00 GiB** |
| Daily upload × 30 | 15 GiB | 30 GiB | 90 GiB |
| 18 retained pair-equivalents | 9 GiB | 18 GiB | 54 GiB |
| Version/failed-upload/log overhead factor | 1.15× | 1.25× | 1.50× |
| Pair storage after overhead | 10.4 GiB | 22.5 GiB | 81 GiB |
| Control/access-log allowance | 0.1 GiB | 0.5 GiB | 2 GiB |
| Synthetic restore transfer/month | 1 GiB | 2 GiB | 6 GiB |

The high case assumes the Render disk is full and the database dump is 2 GiB; it is a warning scenario, not a capacity target. CarbonLite should stop uploads well before the disk is full under the B2 60/70/80/85% thresholds.

## 3. Monthly scenario estimate

### 3.1 `us-east-1`

| Cost element | Low | Base | High |
| --- | ---: | ---: | ---: |
| S3 Standard storage/version/log allowance | $0.24 | $0.53 | $1.91 |
| S3 requests and CloudTrail data events | $0.01 | $0.03 | $0.10 |
| Two KMS keys before rotation increments | $2.00 | $2.00 | $2.00 |
| Monitoring/logging allowance | $0.25 | $1.00 | $3.00 |
| Source-provider egress sensitivity | $1.50 | $3.00 | $9.00 |
| Restore-transfer sensitivity | $0.09 | $0.18 | $0.54 |
| **Planning total** | **$4.09** | **$6.74** | **$16.55** |

### 3.2 `ca-central-1`

Only the storage line is changed here; actual requests/transfer can also differ and must be recalculated.

| Cost element | Low | Base | High |
| --- | ---: | ---: | ---: |
| S3 Standard storage/version/log allowance | $0.26 | $0.58 | $2.08 |
| Other elements from planning model | $3.85 | $6.21 | $14.64 |
| **Planning total** | **$4.11** | **$6.79** | **$16.72** |

These totals are intentionally conservative for a tiny pilot. If Neon/Render outbound transfer is included in existing plans, subtract $1.50/$3/$9. If client-side encryption uses an externally held `age` recipient and only the KMS signing key remains, subtract about $1/month before external vault costs. If paid S3 request metrics are not enabled, monitoring may be lower. KMS key rotation, extra trails, advanced Storage Lens, Config/Security Hub, a separate log account, or a second Region can increase cost.

## 4. Retention configuration proposal

### 4.1 Backup pairs

| Control | Proposed value | Approval state |
| --- | --- | --- |
| Capture | Daily plus before approved material change | Not approved/deployed |
| Successful recovery points | At least 14 verified daily pairs | Not approved |
| Object Lock default | 16 days | Not approved; legal/infrastructure decision |
| Mode | Governance for synthetic proving; Compliance for real data | Not approved |
| Current-version lifecycle | Expire at 17 days | Not approved |
| Noncurrent-version lifecycle | Permanently delete after 1 additional day | Not approved |
| Incomplete multipart uploads | Abort after 1 day | Not approved |
| Storage class | S3 Standard; no pilot transition | Proposed because 16-day lifetime is shorter than Standard-IA's 30-day minimum charge |
| Ordinary maximum deleted-data survival | 30 days across all backup/provider copies | Draft proposal, not proven or approved |

### 4.2 Why 16-day Object Lock and day-17 lifecycle differ

Object Lock is the earliest permitted deletion time for each protected version. Lifecycle is a requested expiration action. In a versioned bucket, current-version expiration normally creates a delete marker, making the protected version noncurrent; Object Lock still prevents permanent deletion before retain-until. Lifecycle processing is asynchronous and AWS rounds some expiration calculations to UTC day boundaries. Therefore:

- 16 days is an immutable minimum, not a promise of deletion on the sixteenth day;
- day 17 avoids asking lifecycle to expire a still-locked current version at the same instant;
- noncurrent deletion after one additional day means ordinary physical/version absence may be day 18–19 or later;
- a failed lifecycle run, later lock extension, Legal Hold, incident hold, or missed-pair continuity extension can make it later still; and
- a delete marker or empty normal `ListObjects` result is not proof that the retained version is gone.

The future expiry verifier must use `ListObjectVersions` plus each version's current retention/legal-hold state and append an independently reviewed `PAIR_EXPIRED` event only after absence is observed.

AWS explains versioned lifecycle/delete-marker behavior in [Lifecycle troubleshooting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshoot-lifecycle.html) and immutable modes in [S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html).

## 5. Control and log retention

| Data | B3 proposal | Decision needed |
| --- | --- | --- |
| Signed recovery requests/approvals/generation/evidence | 730 days in Object Lock compliance mode | Align with still-unapproved 24-month minimized deletion-evidence period; confirm fields, trigger, disputes, and legal holds. |
| Capture/verification events | Same control-evidence period unless minimized earlier | Confirm operational need and whether separate shorter class is appropriate. |
| S3 server access/CloudTrail delivered logs | 90 days, with incident records preserved separately under approval | Security/privacy must approve identifiers, readers, incident extension, and deletion evidence. |
| Cost/budget evidence | Finance-defined period | Finance/legal decision; keep customer content out. |

Do not place source bytes, plaintext manifests, extracted content, customer filenames/names/emails, legal narrative, credentials, or encryption keys in control/log object names or records.

## 6. Deletion and Legal Hold reconciliation

1. Active-system deletion, quarantine purge, S3 pair expiry, Neon history expiry, Render snapshot expiry, control-evidence expiry, and customer notification are distinct milestones.
2. Each deletion/erasure event records possibly containing Pair IDs and S3 version IDs without copying content.
3. `latest_expected_backup_expiry` uses the latest retain-until/lifecycle/provider date across every possibly containing copy. Customer wording must say it is an expected latest date until verified.
4. A Legal Hold suspends conflicting purge/expiry. If an older aggregate pair is planned to expire, prove the held opaque ID/hash exists in at least two newer verified pairs and the external ledger before allowing expiry; otherwise extend retention before the deadline.
5. Compliance retention cannot be shortened. An erroneous 160-day value cannot be corrected to 16 days. Console entry requires a second-person read-back before saving.
6. A hold release recalculates deletion deadlines; it does not authorize immediate deletion or a governance bypass.
7. No selective rewrite of an immutable aggregate pair is permitted. If the 30-day ordinary maximum cannot be met, record an exception and customer/legal impact rather than claim completion.

## 7. Monitoring and cost controls

- Monthly budget proposal: start at $15 with actual notifications at $7.50, $12, and $15 plus forecast at $15; owner/finance may select another value after calculator review.
- Alert on unexpected Region, bucket, KMS key count, version growth, noncurrent bytes, incomplete multipart bytes, CloudTrail event volume, restore download, and source-provider egress.
- Review Cost Explorer by service/Region monthly and after every rehearsal.
- Keep S3 Storage Lens on free metrics initially. Enable paid request metrics only for the `pairs/` and control prefixes if operational need justifies the allowance.
- Do not use cost pressure to bypass Legal Hold, shorten compliance retention, mass-delete quarantine, or disable logging. Escalate and stop new data instead.

## 8. Cost/retention acceptance gates

AWS setup remains **NO-GO** until the owner records:

- selected Region and verified current Calculator output;
- verified Neon/Render outbound and AWS restore-transfer pricing/allowances;
- expected pair size and monthly growth based on synthetic measurement;
- approved 16-day/17-day/1-day model or replacement;
- approved control/log evidence periods;
- maximum ordinary deleted-data survival and Legal Hold exceptions;
- KMS versus external-recipient choice and rotation cost;
- monthly budget/alert recipients; and
- customer contract/privacy/deletion wording aligned to actual behavior.

Real-data pilot remains **NO-GO** after cost approval alone; implementation, synthetic validation, expiry proof, provider rehearsal, and all other B2 P0 gates still apply.
