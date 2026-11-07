# CarbonLite Phase 3G-B2 Safe Provider Rehearsal Plan

**Document status:** Proposed plan only; not authorized or executed

**Prepared:** November 6, 2026 (America/Edmonton)

**Data classification:** Synthetic only

**Current decision:** Provider rehearsal **NO-GO**; real-data pilot **NO-GO**

This plan is deliberately incapable of authorizing a production restore. No action in this document may target Neon `main`, the production Render service or disk, a production/staging database, a public/custom domain, or real customer data.

## 1. Purpose and success definition

The rehearsal proves that an independently stored CarbonLite recovery pair can be verified, decrypted, restored into brand-new isolated provider resources, reconciled against a newer independent Legal Hold/deletion ledger, and kept inaccessible until two independent identities approve the exact evidence.

Success requires all of the following:

- exact Recovery Pair ID, manifest signature, encrypted object version, and SHA-256 verification;
- successful `pg_restore` to a new empty synthetic database with no migration run;
- exact active and `.quarantine` path/size/hash parity in a new blank filesystem root;
- application SHA and migration history/digest match;
- expected tenant, relation, report, factor-provenance, Legal Hold, deletion-intent, and storage reconciliation results;
- detection of post-backup hold, document deletion, organization erasure, pair mismatch, missing quarantine, hash corruption, and interrupted reconciliation;
- recovery lock blocks every customer/admin data route; health remains available;
- no production/staging resource, route, credential, integration, or data is used;
- independently reviewed evidence and explicit cleanup decision.

Measured times are rehearsal measurements only. They do not establish a production RPO or RTO.

## 2. Hard isolation model

### 2.1 Dedicated source and target

Use a new, separately named synthetic rehearsal project/account boundary where practical:

- one disposable Neon project/branch/database containing only the approved synthetic fixture;
- one private/disposable Render service and source disk containing only synthetic active and quarantine files;
- one independently stored synthetic backup pair;
- a second new Neon project or explicitly approved isolated project/database as the restore target;
- a second new private Render service with a new blank disk as the file restore target.

Do not branch from, query, dump, connect to, snapshot, clone, or inspect Neon production. Do not attach, restore, copy, shell into, or inspect the production Render disk. Provider-native snapshot restore is out of scope for the first rehearsal because Render documents that it overwrites the target disk and may trigger a deploy. A later rehearsal may restore a snapshot only onto an explicitly disposable synthetic source disk under a separate authorization.

### 2.2 Target-deny and target-allow controls

The rehearsal tool must fail before connection or filesystem creation unless every condition passes:

- explicit `--synthetic-provider-rehearsal` and `--acknowledge-disposable-targets` consent flags;
- approved source and target aliases from a signed allowlist; raw user-supplied hosts/IDs are not accepted;
- source and target project, branch/database, service, disk, hostname, and account aliases are distinct;
- no alias equals or contains the registered production/staging aliases;
- destination database is new, empty, and prefixed `carbonlite_recovery_`; destination storage root is new, blank, mounted on the approved disposable disk, and prefixed for the rehearsal;
- production credentials, connection strings, provider IDs, and environment bundles are absent;
- no public/custom domain, deploy hook, cron, worker, one-off job, outbound webhook, email, analytics, AI, or customer identity integration is attached;
- recovery lock is initialized before application start and cannot be released by an environment variable.

The operator records aliases and salted fingerprints, not secrets, in evidence. Any ambiguity is a STOP.

## 3. Roles and separation

| Role | Named identity | May do | May not do |
| --- | --- | --- | --- |
| Rehearsal owner/incident controller | Assigned before GO | Own schedule, scope, stop decision | Restore, review own evidence, release access alone |
| Backup operator | Assigned before GO | Capture/upload synthetic pair | Approve own pair or hold deletion authority |
| Restore operator | Different individual account | Create allowed disposable targets and restore | Select/approve own target or release lock |
| Independent reviewer | Different individual account | Verify target map, manifest, hashes, results; sign decision | Execute restore or possess operator credential |
| Privacy/Legal Hold reviewer | Assigned authority | Verify ledger replay decisions | Operate provider restore |
| Key custodian | Separate vault identity | Release scoped synthetic decryption capability after approval | Restore or approve reconciliation alone |

One person may hold multiple routine business titles, but the operator and independent reviewer must be distinct individual identities. Self-approval, shared credentials, and one browser session reused for both identities are prohibited.

## 4. Required synthetic fixture

Create the fixture only in the disposable source. It must include:

- at least three synthetic organizations and distinct tenant users;
- active source documents with deterministic harmless bytes and recorded hashes;
- one extraction/draft row, confirmed activity, calculation snapshot, metric/factor provenance, and report with a managed artifact;
- active organization- and document-scoped holds;
- one document in `PENDING_PURGE` with its expected `.quarantine` file;
- minimized Legal Hold/deletion events and applied migration history;
- after capture: a new hold, a document deletion, and an organization erasure in the authoritative synthetic ledger.

Names, emails, file contents, case references, and IDs must be visibly synthetic and unique to the rehearsal. No copied production schema data, customer samples, logs, exports, filenames, credentials, or provider metadata are allowed.

## 5. Pre-authorization evidence package

The owner checklist must link to a package containing:

1. signed resource map with synthetic source/target aliases and explicit production/staging denylist;
2. current role/account/MFA inventory and distinct operator/reviewer/key-custodian evidence;
3. no-route/no-worker/no-integration screenshots or read-only exports;
4. approved object bucket/account, encryption recipient, signing key, Object Lock/lifecycle settings, and cost cap;
5. tested local capture/restore/failure-injection evidence for the exact tool revision;
6. fixture manifest and proof it is synthetic;
7. cleanup plan identifying each disposable resource, earliest safe cleanup time, evidence retention, owner, and approval requirement;
8. rollback/incident contacts, time window, expected outage limited to synthetic resources, and abort procedure;
9. exact application SHA and migration manifest to use; and
10. signed GO decision from business owner, infrastructure/security owner, independent reviewer, and privacy/Legal Hold reviewer.

Screenshots/exports must omit secrets and customer data. Read-only evidence gathering does not itself authorize the rehearsal.

## 6. Phased execution with STOP/GO gates

### Phase 0 — Documentation and owner decisions

Required:

- approve or revise the independent backup architecture, destination, region, cost assumption, retention, deletion survival, encryption/key custody, and authority model;
- assign every role and incident contact;
- confirm the production/staging aliases that the tooling must deny;
- approve synthetic-only provider spend and cleanup handling.

**Gate 0:** GO only with a dated signed checklist and evidence references. Otherwise STOP. Current status: **NO-GO**.

### Phase 1 — Local implementation and safety proof

Future implementation scope, under a separate code/change authorization:

- global write gate/lock and in-flight drain;
- streaming `pg_dump`, active archive, quarantine archive, canonical SHA-256 manifests, ledger snapshot, application/migration manifest, client-side encryption, signature, upload/read-back, and external status;
- hard target allowlist/denylist, new-empty-target checks, no-overwrite semantics, and recovery lock;
- capacity/freshness monitoring and failure alerts.

Required tests: missing consent, production-like alias, reused target, non-empty target, pair mismatch, corrupt dump, corrupt file, missing quarantine, ledger rollback, self-approval, stale approval, interrupted capture, interrupted restore, destination unavailable, lost decryption key simulation, and cleanup refusal.

**Gate 1:** GO only after independent code/security review and passing local synthetic evidence at the exact SHA. Any bypass is STOP.

### Phase 2 — Provision isolated synthetic provider resources

Under approved provider access, create only the allowlisted disposable source/target resources, blank target storage, private routing, least-privilege identities, independent bucket, and monitoring. Do not import environment values from production. Record cost tags and automatic spend alert.

Confirm:

- neither Neon resource belongs to or descends from the production project/branch;
- neither Render disk/service is the production service/disk;
- no public/custom route exists and recovery health is reachable only through the approved operator path;
- target database and filesystem are empty and unique;
- outbound integrations and all autonomous writers are disabled.

**Gate 2:** Operator and independent reviewer compare the provider state to the signed map in separate sessions. Any mismatch or unknown resource is STOP and preserve evidence.

### Phase 3 — Capture the synthetic pair

1. Load the approved fixture into disposable source targets.
2. Verify free space, migration/app SHA, ledger continuity, and zero unexplained storage reconciliation findings.
3. Allocate Pair ID; enable write freeze; drain writers.
4. Stream and validate the full database dump and both file archives.
5. Upload encrypted objects, read back object versions/hashes/retention, sign manifest, and obtain independent verification.
6. Release the synthetic source freeze. Create the planned post-backup hold/deletion/erasure ledger events.

**Gate 3:** GO only if the pair is externally `VERIFIED`, source remains synthetic, capture skew/freeze duration are recorded, and no partial object or unexplained file exists. Failed/partial pairs are never restore candidates.

### Phase 4 — Restore to new isolated targets

1. Restore operator submits exact Pair ID, object versions, target aliases, application SHA, migration digest, and current ledger head.
2. Independent reviewer signs bounded approval; key custodian releases the scoped synthetic key.
3. Re-check target newness/emptiness and denylist immediately before mutation.
4. Restore database with `pg_restore --exit-on-error` into the new database. Do not run migrations.
5. Extract archives into the new blank storage root using traversal/symlink/device protections. Never extract as filesystem root or over an existing directory.
6. Start only the approved application SHA in recovery mode with private routing and integrations disabled.

**Gate 4:** Any target drift, dump warning/error, migration mismatch, archive unsafe path, missing/extra byte, or lock failure is STOP. Preserve targets; do not retry destructively or clean up automatically.

### Phase 5 — Verify and reconcile while locked

Verify:

- source snapshot versus restored DB IDs/counts/relationships and `_prisma_migrations` digest;
- every active/quarantine/report path, byte count, and SHA-256;
- no cross-tenant storage key/mapping and zero unexplained storage reconciliation findings;
- hold/deletion/erasure state at capture;
- later authoritative ledger events are detected as a lost hold and resurrected document/organization;
- approved reapplication/replay through controlled workflows, never direct SQL or blind automatic deletion;
- customer/admin routes remain blocked before, during, and after reconciliation unless a separate synthetic release test is explicitly authorized.

Run failure injections using copies or a fresh disposable target, not the accepted restored target. Pair mismatch, manifest signature failure, altered archive, missing quarantine, stale ledger, interrupted reconciliation, and self-approval must all fail closed.

**Gate 5:** Technical pass requires exact parity and every failure test blocked. Privacy/Legal Hold reviewer must separately accept reconciliation evidence. Otherwise STOP with target locked.

### Phase 6 — Optional synthetic release/re-lock test

This tests the A2-2 authority path, not production routing. If separately authorized, issue a signed, short-expiry release bound to the exact synthetic target and verify only approved synthetic routes. Then issue a higher-generation re-lock and prove access is blocked again.

No public/custom domain may be added. A successful synthetic release cannot be copied to another environment or treated as production authorization.

**Gate 6:** GO only for the bounded synthetic test. Any stale generation, wrong target, missing signature, or delayed re-lock is a failed rehearsal.

### Phase 7 — Report, retain evidence, and clean up

- Write a report with pair/target aliases, hashes, signatures, timings, findings, failure tests, access logs, cost, and all decisions; exclude secrets and customer data.
- Independent reviewer signs the report before cleanup.
- Preserve the encrypted rehearsal pair and minimized evidence for the approved evidence period.
- Cleanup requires a new exact resource list, read-only re-identification, owner approval, and verification. Delete only disposable synthetic resources. Never use recursive wildcards, shared roots, or production credentials.
- Record residual objects, final cost, and whether cleanup is recoverable. Immutable objects remain until their approved retain-until date.

**Gate 7:** Rehearsal is complete only after evidence acceptance and cleanup/retention status are recorded. “Restore succeeded” alone is incomplete.

## 7. Abort and incident rules

Stop immediately if any identifier could be production/staging; any data is not demonstrably synthetic; a target is non-empty; routing becomes public; an unapproved writer/integration starts; credentials appear in output; the write freeze cannot drain; free disk falls below the approved margin; a signature/hash/migration/ledger check fails; identity separation collapses; or provider behavior differs from the reviewed plan.

On STOP:

1. keep recovery access locked and disable any synthetic route;
2. cease mutations without deleting evidence or retrying over the same target;
3. revoke scoped temporary credentials/key release where safe;
4. record time, operator, Pair ID, target aliases, last successful step, and sanitized error;
5. notify the rehearsal owner and independent reviewer;
6. classify potential production/customer exposure as a security/privacy incident; and
7. require a new signed GO decision before resuming with new targets.

## 8. Evidence and acceptance matrix

| Control | Required evidence | Pass rule |
| --- | --- | --- |
| Isolation | Signed map, provider aliases, denylist check, no-route/no-worker evidence | New synthetic resources only; zero production/staging references |
| Pair integrity | Signed pair manifest, object versions, encrypted/plain hashes | Exact match and valid signature |
| Database | Restore log, dump list, inventory/migration digest | Exit success; exact expected state; no migration run |
| Files | Active/quarantine manifests and restored hashes | No missing, extra, unsafe, or mismatched entry |
| Ledger | Capture head, current head, reconciliation result | All later events detected; unresolved event keeps lock closed |
| Authority | Request, independent signature, key release, generations | No self-approval; exact target/evidence binding |
| Access gate | Route matrix before/during/after reconciliation | Health only until bounded synthetic release |
| Failure tests | Sanitized results for every listed injection | Every fault fails closed without production contact |
| Capacity/health | Disk/headroom, readiness, backup freshness, alert delivery | Thresholds and alerts work as designed |
| Cleanup | Exact inventory, approval, deletion/retention verification | Only disposable resources affected; immutable evidence accounted for |

## 9. GO/NO-GO decisions

| Milestone | Current decision | Conditions to change |
| --- | --- | --- |
| Implement design locally | **NO-GO pending separate change approval** | Owner approves architecture/scope; code work and review are authorized. |
| Provision disposable provider resources | **NO-GO** | Gates 0–1 pass with signed evidence and cost/privacy approval. |
| Execute synthetic provider rehearsal | **NO-GO** | Gates 0–2 pass; identities, isolation, tools, keys, and targets are verified. |
| Treat rehearsal as passed | **NO-GO** | Gates 3–7 all pass and independent report review is complete. |
| Use real customer data | **NO-GO** | All B2 design P0 items, B1 provider gaps, retention/legal decisions, production monitoring, three verified pairs, expiry proof, and owner approvals close. |
| Promise production RPO/RTO | **NO-GO** | Approved scenario and measured repeated evidence support the exact commitment. |

## 10. Source constraints

- [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html) is internally consistent but does not block writers; CarbonLite still needs the cross-system freeze.
- [Render persistent disk snapshots](https://render.com/docs/disks) are daily, available for seven days, and overwrite later disk state on restore.
- [Render restore API warning](https://api-docs.render.com/reference/restore-snapshot) states restore is irreversible, overwrites current disk data, and may trigger a deploy; this is why the first rehearsal restores the independent archive to a new blank disk instead.
