# CarbonLite Phase 3G-B1 Recovery Gap Matrix

## Provider and recovery controls

| Area | Current status | Evidence | Risk / destructive capability | Required control or evidence | Owner | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| Neon project/plan/region | `OWNER_REPORTED` | Brief summary of owner screenshots | Wrong project, plan limitation, or region assumption could invalidate recovery design | Current Project/Plan screenshot and timestamp | Infrastructure owner | P0 |
| Production branch/endpoint mapping | `UNKNOWN` | None | Restore or rehearsal could target the live endpoint | Branch/endpoint map without connection strings; independent review | Infrastructure owner | P0 |
| Neon history window | `OWNER_REPORTED` | Seven-day UI observation | Expired/unavailable recovery point; proposed 14-day retention unsupported | Current configured value plus oldest restorable timestamp and gap status | Infrastructure owner | P0 |
| Neon snapshots/schedule | `UNKNOWN` | Provider feature documentation only | No retained point outside PITR; unreviewed restore target | Snapshot inventory, schedule, expiry, and target behavior | Infrastructure owner | P0 |
| Neon branch protection | `UNKNOWN` | Feature documentation only | Admin/editor can reset/delete/change production after changing protection | Current protected badge, plan entitlement, IP/network setting, permission inventory | Security + infrastructure | P0 |
| Independent database archive | `UNKNOWN` | No archive inventory | Provider/account incident or PITR expiry loses recovery option | Encrypted independent archive, hashes, retention, restore-test evidence | Backup operator | P0 |
| Render service/release mapping | `OWNER_REPORTED` / `UNKNOWN` | Service name only | Wrong code or environment could lack recovery gate | Live commit SHA, branch, service/replica evidence | Infrastructure owner | P0 |
| Render disk attachment | `OWNER_REPORTED` | Size/mount summary | Files may be ephemeral or mounted elsewhere | Current Disk page and narrowly cropped runtime configuration | Infrastructure owner | P0 |
| Render snapshot inventory | `UNKNOWN` | Daily/seven-day provider documentation only | No usable point, or in-place restore overwrites later state | Current snapshot list, expiry, target behavior | Backup operator | P0 |
| Isolated Render restore | `UNKNOWN` | Public restore API describes overwrite of existing disk | Rehearsal could destroy production files or trigger deploy | Proven separate service/disk copy or restore design before execution | Infrastructure owner | P0 |
| Independent document archive | `UNKNOWN` | None | Render account/disk/snapshot failure is correlated | Encrypted external archive covering active + quarantine with manifest | Backup operator | P0 |
| `.quarantine` snapshot coverage | `REPOSITORY_ONLY` layout | Same-root implementation | Deleted evidence omitted or restored inconsistently | Synthetic provider snapshot/restore inventory in isolated destination | Security + backup operator | P0 |
| Disk capacity | `OWNER_REPORTED` 1 GB | No usage/alerts | Upload/quarantine/temp growth exhausts disk; writes fail mid-workflow | Usage trend, 60/70% internal thresholds, provider notification evidence, capacity plan | Operations | P0 |
| Paired backup coordinator | `NOT_IMPLEMENTED` | Local harness only | Cross-provider points represent different write boundaries | Trusted write pause, drain, pair manifest, skew limit, missed-run alert | Infrastructure + application owner | P0 |
| Independent hold/deletion ledger | `NOT_IMPLEMENTED` in production | Local synthetic ledger only | PITR resurrects deleted data or removes later hold | External append-only signed ledger and reconciliation procedure | Legal/privacy + security | P0 |
| External recovery authority | `NOT_IMPLEMENTED` in production | Local file authority only | Restored app/operator can forge or roll back release | External store, KMS, non-rollback counter, immutable audit | Security owner | P0 |
| Routing isolation | `UNKNOWN` | No provider evidence | Restored environment could receive customer traffic before release | No public/custom domain, private access, explicit routing approval | Infrastructure owner | P0 |
| Worker/job freeze | `UNKNOWN` | No repository scheduler; provider resources uninspected | Cron, CI, one-off job, or direct script mutates locked restore | Full provider automation inventory and recovery admission control | Operations | P0 |
| Continuous revalidation | `NOT_IMPLEMENTED` | A2-2 local limitation | Change after release remains undetected until verifier runs/lease expires | Trusted event-driven or continuous verifier with measured detection bound | Security + application owner | P0 |
| Backup expiry verification | `NOT_IMPLEMENTED` | Proposed values only | Deleted data survives beyond representation; held data expires too soon | Daily inventory, failed-expiry alert, hold exception process | Privacy + backup operator | P0 |
| Provider rehearsal | `NOT_IMPLEMENTED` | Local rehearsal only | Operational assumptions remain untested | Separately authorized synthetic isolated rehearsal after all P0 preconditions | Owner + security | P0 |
| Recovery RTO | `UNKNOWN` / conflicting proposal | Four hours vs two business days | Misleading contract/support expectation | Select and approve one scoped target after provider measurement | Owner + legal + infrastructure | P1 |
| Key rotation/incident response | `NOT_IMPLEMENTED` | No production authority | Compromised provider/recovery keys retain destructive access | Rotation, revocation, break-glass, alert, evidence-preservation runbook | Security owner | P1 |

## Access and bypass inventory

| Access path | Potential capability | Known protection | Evidence status | Required action |
| --- | --- | --- | --- | --- |
| Neon organization Admin | Manage members/keys, projects, branches, restores, billing | Provider roles exist generally | `UNKNOWN` assignments | Export role inventory; require least privilege and two-person recovery approval |
| Neon organization Editor/project Editor | Change branches/settings/endpoints and potentially recovery resources | Current provider model must be verified | `UNKNOWN` | Inventory effective org + project permissions and remove unnecessary edit access |
| Neon Viewer | Read metadata/settings; public documentation says no connection strings | Provider role documentation | `DOCUMENTATION_ONLY` | Prefer for evidence gathering; verify current behavior in owner account |
| Neon branch/restore operator | Create/restore/reset branch or move compute target | Branch protection may restrict deletion/reset | `UNKNOWN` | Define named recovery role, protected production branch, independent reviewer |
| Neon API key | Automate project/branch/snapshot/role operations according to scope | Project-scoped keys are documented | `UNKNOWN` | Inventory metadata/scopes/custody/last use; rotate and restrict |
| PostgreSQL application role | Read/write customer tables within grants | Application tenant controls | `UNKNOWN` deployed grants | Separate runtime from migration/owner role; document direct SQL prohibition |
| PostgreSQL migration/owner role | DDL and broad destructive SQL | No provider evidence | `UNKNOWN` | Separate credential, just-in-time use, approval and audit |
| Direct SQL user/tool | Bypass application Legal Holds and recovery gate | Operational prohibition in docs | `UNKNOWN` | Inventory clients/roles/network access and log/review use |
| Render workspace/service Admin | Change service, env, deploy, disk, snapshots | Provider workspace roles not inspected | `UNKNOWN` | Export member/role inventory and enforce least privilege |
| Render shell/SSH/SCP user | Read/overwrite/delete active and quarantine bytes directly | Filesystem adapter cannot constrain provider shell | `UNKNOWN` | Restrict shell, inventory SSH keys, require approved audited break-glass |
| Render disk/snapshot operator | Restore disk destructively; resize/change attachment | Restore warning documented | `DOCUMENTATION_ONLY` capability; assignment `UNKNOWN` | Two-person approval and isolated-target validation |
| Render deploy hook/API key | Deploy code or change service independent of auto-deploy | Auto-deploy reportedly disabled | `UNKNOWN` | Inventory/revoke unused hooks and keys; protect recovery environment |
| CI/CD credential | Deploy, migrate, or access provider APIs | No CI inventory provided | `UNKNOWN` | Map workflows, environments, secrets, reviewers, and protected branches |
| Render cron/worker/workflow | Mutate DB/files outside web admission gate | No repository scheduler found | `UNKNOWN` provider state | Dashboard resource inventory and recovery-mode admission control |
| Backup storage administrator | Read/delete/restore independent archives | Independent store absent/unproven | `UNKNOWN` | Separate backup custodian, object lock/immutability, encryption and audit |
| Recovery authority writer | Approve/sign/release restored environment | Local Ed25519 harness only | `REPOSITORY_ONLY` | External production identity, KMS, append-only audit, non-rollback state |
| Recovery Operator/Reviewer | Submit and approve exact evidence | Local distinct-principal test | `REPOSITORY_ONLY` | Assign two real independent identities through production IdP |

## Priority summary

### P0 before isolated provider rehearsal

- Verify current Neon/Render configuration, permissions, snapshot inventory, disk usage, and destination behavior.
- Establish independent paired backups, external ledger, and external recovery authority.
- Prove no production endpoint/disk can be overwritten by the rehearsal.
- Implement provider routing isolation, worker freeze, and access review.
- Define capacity headroom, monitoring, missed-backup alerts, and expiry verification.

### P1 before a contractual recovery target

- Resolve RTO conflict and measure the approved scenario.
- Implement key rotation, incident response, evidence custody, and periodic access recertification.
- Reconcile provider retention with proposed 14-day rotation and 30-day maximum deleted-data survival.

## Decisions

| Decision | Result | Basis |
| --- | --- | --- |
| Further read-only evidence gathering | **GO** | Checklist is non-mutating when followed. |
| Isolated provider recovery rehearsal | **NO-GO** | Multiple P0 controls and provider facts are unknown or not implemented. |
| Real-data paid pilot | **NO-GO** | Independent backup, recovery isolation, authority, access, retention, and provider recovery evidence are incomplete. |
