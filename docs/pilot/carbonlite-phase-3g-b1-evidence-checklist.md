# CarbonLite Phase 3G-B1 Provider Evidence Checklist

Use current timestamped screenshots or read-only exports. Crop narrowly and redact connection strings, passwords, tokens, private keys, webhook secrets, customer data, and unrelated environment values. Do not click restore, create, resize, deploy, change, save, or confirm controls while gathering this evidence.

## Neon

| Priority | Read-only page/API | Evidence required | Redaction | Read-only? |
| --- | --- | --- | --- | --- |
| P0 | Project dashboard / General settings | Project display name, plan, cloud/region, project status, timestamp | Redact project ID if desired; no connection strings | Yes, viewing only |
| P0 | Branches | Branch names, primary/default indicator, parent relationships, protected badge, endpoint names/status | Redact endpoint hostnames and connection controls | Yes |
| P0 | Render environment variable-name list plus Neon Branches page | Prove which branch/endpoint production uses without showing `DATABASE_URL` | Show only variable name/presence and a separately assigned endpoint label; redact all values | Yes |
| P0 | Backup & Restore / Restore history | Configured history-retention value, oldest/newest selectable timestamps, any gap/error indicator | No SQL preview or customer data | Yes; do not start restore |
| P0 | Backup & Restore / Snapshots | Snapshot feature status, schedules, retained snapshot timestamps, expiry/retention, source branch | Redact IDs if needed | Yes; do not create/delete/restore |
| P0 | Snapshot/restore details or pre-confirmation dialog | Whether restore can target a new branch versus existing branch; exact target shown | Redact branch/endpoint IDs; stop before confirmation | Yes if no operation is submitted |
| P0 | Organization members and project permissions | Role inventory showing org/project Admin, Editor, Viewer, Collaborator assignments | Names/emails may be pseudonymized consistently; preserve role and distinct-person evidence | Yes |
| P0 | API Keys metadata/list | Key type, scope, creator/custodian, created/last-used date, status | Never show token; redact key ID if desired | Yes |
| P0 | Project network/security settings | IP allow or network restriction status for production | Redact exact private ranges if necessary while preserving enabled/disabled evidence | Yes |
| P1 | Roles page | Database role inventory and which role the application/migration process uses | Redact role names consistently; never show passwords/connection strings | Yes |
| P1 | Usage/billing storage/history view | Storage consumption attributable to history/snapshots and plan limits | Redact billing identifiers | Yes |
| P1 | Operations/audit view, if available | Recent restore, branch, snapshot, role, and key-management operation metadata | Redact actor identity consistently; preserve action/time/result | Yes |
| P0 | Independent-backup inventory outside Neon | Object-store/archive list with pair IDs, creation time, digest, encryption, retention/expiry, last verification | Redact bucket/account names and encryption-key identifiers | Yes |

Questions the owner must answer in writing:

- Which branch is production, and which Neon endpoint does Render use?
- Who can restore/reset/delete branches, manage snapshots, reveal connection strings, or create API keys?
- Is branch protection available on the reported plan and enabled on production?
- Are snapshots scheduled, and what objectively enforces expiry?
- Where are independent `pg_dump` archives stored, and who can restore/delete them?
- Can an isolated restore be created without changing the current production endpoint?

## Render

| Priority | Read-only page/API | Evidence required | Redaction | Read-only? |
| --- | --- | --- | --- | --- |
| P0 | Service Overview/Settings | Service name, runtime, region, plan, deployment branch, repository, replica count | Redact repository owner if needed; no deploy credentials | Yes |
| P0 | Deploy settings | Auto-deploy state, deploy hook existence, build/start command, current release commit SHA | Redact hook URL/token; preserve enabled/disabled status | Yes |
| P0 | Events/Deploys | Current live deploy SHA and recent deploy actor/method/result | Redact personal identity consistently | Yes |
| P0 | Disk page | Disk name, attached service/instance, mount path, size, current usage, usage graph | Redact disk/service IDs if desired | Yes |
| P0 | Disk snapshot list | Available snapshot timestamps and oldest/newest retained snapshot | Redact snapshot keys; do not restore | Yes |
| P0 | Snapshot restore pre-confirmation UI | Exact target disk/service and whether a separate destination can be selected | Stop before final confirmation; redact IDs | Yes if no operation submitted |
| P0 | Environment page, narrowly cropped | Presence and exact non-secret values for `DOCUMENT_STORAGE_PATH`, `DOCUMENT_STORAGE_DURABLE`, `APP_ENV`; presence only for recovery bindings | Crop out all secret variables; never show `DATABASE_URL`, JWT/API keys, signing keys | Yes |
| P0 | Team/workspace members and roles | Who can administer service, disk, deploys, environment, shell, and billing | Pseudonymize identities consistently; preserve role and independence | Yes |
| P0 | Shell/SSH access settings and SSH-key metadata | Which roles can open shell/SCP and the inventory/status of authorized keys | Never show private/public key material; key labels/fingerprints may be redacted | Yes; do not open shell |
| P0 | Notifications and service override | Whether persistent-disk 80% notifications can be delivered and current destination/level | Redact email/Slack destination | Yes |
| P0 | Metrics / Disk usage | Current bytes/percentage, peak trend, observation period | No production filenames | Yes |
| P0 | Cron jobs, background workers, workflows, one-off jobs | Complete resource list and commands/branches that can mutate DB/storage | Redact tokens and secret arguments | Yes |
| P0 | API key/service-account/deploy credential metadata | Scope, custodian, created/last-used/status for provider automation | Never show tokens | Yes |
| P1 | Logs, narrowly filtered to storage startup | Evidence the live release selected the intended root and passed storage health | Do not show environment dumps, paths containing customer identifiers, or request data | Yes, but repository health check is still not a persistence rehearsal |
| P0 | Independent document-backup inventory outside Render | Pair IDs, archive hashes, timestamps, encryption, retention, expiry verification, restore-test status | Redact storage account/key IDs | Yes |

Questions the owner must answer in writing:

- Can a new isolated service/disk receive a copy or restored snapshot without overwriting the attached production disk?
- Does the snapshot include `.quarantine`, and how has that been proven without customer data?
- Who can use Render shell/SCP to alter or remove held/quarantined files?
- Are CI, deploy hooks, API keys, workflows, or one-off jobs able to bypass disabled auto-deploy?
- What occurs when disk usage reaches 80% and when uploads exhaust remaining space?
- Are any backup archives stored on the same disk?

## Cross-provider recovery evidence

| Priority | Evidence required | Acceptable proof |
| --- | --- | --- |
| P0 | Approved write-pause and drain procedure | Runbook identifying routing, API, workers, cron, SQL, shell, and completion checks |
| P0 | Recovery Pair ID assignment | Signed manifest format and independent sequence/registry design |
| P0 | Database/filesystem boundary alignment | Synthetic capture record with UTC timestamps, Neon point identifier, Render snapshot/archive point, and maximum skew |
| P0 | File integrity | Active and quarantine inventory count/bytes/SHA-256 with no filenames or contents in ordinary evidence |
| P0 | Independent ledger | External hold/deletion/erasure ledger location, signing, append-only/anti-rollback evidence, access roles |
| P0 | External recovery authority | Store/KMS/audit architecture outside Neon and Render disk; application must have no write grant |
| P0 | Independent operator/reviewer | IdP role assignments and two distinct people; recovery-specific permissions |
| P0 | Backup encryption and custody | Encryption method, key custodian, restore access, rotation, incident procedure |
| P0 | Retention/expiry | Automated inventory proving creation, missed-run detection, 14-day proposal handling, hold exceptions, and maximum deleted-data survival |
| P0 | Isolated rehearsal architecture | Approved diagram/narrative showing no production routing, endpoint, database, disk, credentials, or customer data |
| P1 | RPO/RTO decision | Owner/legal-approved RPO and one non-conflicting RTO after measured provider rehearsal |

## Evidence package rules

- Record provider, page, capture time, reviewer, and evidence classification for every artifact.
- Prefer screenshots showing status and timestamps over narrative descriptions.
- Hash exports/screenshots in the restricted evidence register; do not commit secret-bearing evidence to the repository.
- Do not include database rows, document names, customer identifiers, connection strings, tokens, or key material.
- Two reviewers should confirm every P0 screenshot is current and internally consistent before any provider rehearsal is authorized.
