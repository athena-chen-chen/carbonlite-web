# CarbonLite Phase 3G-A Local Recovery Runbook

**Status:** Development-only synthetic procedure; not approved for provider or customer data
**Scope:** Local PostgreSQL plus filesystem-backed active and `.quarantine` storage

## Stop conditions

Stop before any database or filesystem mutation if the target host is not `localhost`, `127.0.0.1`, or `::1`; the admin database is not local `postgres`/`template1`; either generated database name lacks the `carbonlite_recovery_` prefix; any storage/backup path is outside `/tmp/carbonlite-phase-3g-a`; a target path already exists; credentials are provider credentials; or any data may be real.

Do not adapt this command to Neon, Render, staging, production, a persistent customer mount, or a shared developer database. Do not print the URL, archive it, or paste it into evidence.

## Prerequisites

1. Work from `carbonlite-api` at the application revision being rehearsed.
2. Confirm local PostgreSQL, `psql`, `pg_dump`, `pg_restore`, `tar`, Node, pnpm, and generated Prisma client are available.
3. Use a local PostgreSQL principal allowed to create uniquely named disposable databases.
4. Confirm `/tmp/carbonlite-phase-3g-a` is an appropriate disposable local parent.
5. Confirm no application or second writer will connect to the generated source database/storage root.
6. Keep outbound AI, email, analytics, and webhooks disabled. The harness does not start the API or invoke integrations.

## Execute

Use the required flags and supply the local URL only through the process environment:

```bash
LOCAL_RECOVERY_ADMIN_URL='postgresql://<local-user>:<local-password>@127.0.0.1:5432/postgres' \
  pnpm recovery:rehearsal -- --local-synthetic-only --acknowledge-disposable-targets
```

The harness performs these actions:

1. validates the explicit consent flags, loopback host, local admin database, generated name prefix, and disposable roots;
2. creates new source/destination databases and distinct source/destination/backup roots;
3. applies the repository migrations only to the empty source database;
4. creates the synthetic multi-tenant fixture through Prisma plus the actual factor-snapshot, Legal Hold, deletion-recovery, and filesystem-storage services;
5. pauses mutations under the local single-writer assumption and captures a custom-format `pg_dump`, active/quarantine storage archive, migration/revision evidence, source snapshot, and independent ledger under one pair ID;
6. verifies dump readability and artifact hashes before any restore;
7. records real post-backup synthetic hold, document-deletion, and organization-erasure events in the external authoritative ledger;
8. restores into the new destination database/root without running migrations against the restored database;
9. compares source/restore IDs, counts, relationships, calculations, factor provenance, holds, intents, file hashes, timestamps, and tenant boundaries;
10. compares the restore to the later authoritative ledger and keeps access blocked for every unresolved difference; and
11. runs all ten required failure injections and writes `rehearsal-evidence.json`.

The harness intentionally leaves all generated resources in place for review. It does not drop databases, remove directories, purge quarantine, replay deletion, reapply holds, or mark reconciliation complete.

## Evidence review

Under the emitted pair root, review:

- `paired-backup/database.dump`
- `paired-backup/document-storage.tar.gz`
- `paired-backup/pair-manifest.json`
- `paired-backup/ledger-at-backup.json`
- `paired-backup/authoritative-recovery-ledger.json`
- `paired-backup/source-snapshot.json`
- `paired-backup/rehearsal-evidence.json`

Recompute SHA-256 values independently and compare them to `pair-manifest.json`. Check that every archive entry is relative and contains no `..` component. Confirm the database and storage pair IDs match. Confirm `_prisma_migrations` matches the application migration manifest before considering application startup.

Do not treat a matching backup snapshot as sufficient. The authoritative external ledger is deliberately newer and more restrictive when it contains later hold/deletion/erasure events.

## Restore-access gate

> **A2-1 update:** The environment-only procedure below is superseded by `carbonlite-phase-3g-a2-1-recovery-state.md`. `RECOVERY_RECONCILIATION_STATUS=COMPLETE` no longer releases access. A protected external recovery control record is required, and every A2-1 recovery state remains locked.

Every restored API must start with:

```text
RECOVERY_RESTORE_MODE=true
RECOVERY_RECONCILIATION_STATUS=IN_PROGRESS
```

In this state the middleware returns HTTP `503` with code `RESTORE_RECONCILIATION_REQUIRED` for every customer and administrative data route; only health is allowed. Missing or unrecognized reconciliation status also blocks. The environment must remain private and must not be publicly routed.

The following remain reconciliation prerequisites for A2-2; setting `RECOVERY_RECONCILIATION_STATUS=COMPLETE` has no access effect:

1. database and filesystem pair IDs/hashes match;
2. migration history matches the application revision;
3. active and quarantine inventories reconcile with document/report/deletion-intent rows;
4. every restored document hash and storage mapping matches;
5. extraction/review/activity/metric/report relationships and totals match;
6. tenant-boundary checks pass;
7. authoritative later holds have been reapplied through the approved Legal Hold workflow;
8. resurrected deletions/erasures have been independently reviewed and replayed only when still authorized;
9. no unexplained missing or extra active/quarantine file remains; and
10. infrastructure and an independent reviewer approve release with durable evidence.

The current environment-variable transition is not an approved production release mechanism. A privileged operator can bypass it, so provider and real-data release remain P0-blocked.

## Failure handling

| Finding | Required response |
| --- | --- |
| Dump cannot list/restore | Preserve artifacts/logs, keep gate blocked, repair target or select another verified pair. |
| Archive missing/incomplete or hash mismatch | Preserve both sides, keep gate blocked, recover the exact matching storage artifact. |
| Missing quarantine for non-purged intent | Preserve the intent, stop purge/deletion replay, investigate paired recovery points. |
| Ledger hold missing from database | Reapply through authorized activation with independent evidence; do not directly patch SQL. |
| Deleted document or erased organization reappears | Keep access blocked; review authority and replay only through controlled workflows. Never auto-delete. |
| Migration mismatch | Stop application startup; identify the correct release/migration history. Never blindly migrate a same-release restore. |
| Pair-ID mismatch | Reject the combination. Do not reconcile unrelated DB/storage points by timestamp. |
| Reconciliation interrupted | Leave `IN_PROGRESS`, preserve evidence, and resume manually. Never auto-mark complete. |

## Capture and filesystem limitation

PostgreSQL dump and filesystem archive creation are not one atomic operation. This local rehearsal used unique targets and a single harness writer, with mutations paused across both captures. Provider operation requires an independently designed coordination/pause mechanism and evidence that the database/filesystem recovery points belong together. Filesystem `mtime` is corroborating evidence only; identity and SHA-256 are authoritative.

## Validation

Run after source changes:

```bash
npx prisma validate
pnpm build
pnpm test:unit -- --runInBand src/common/security/restore-access-gate.spec.ts
DATABASE_URL='postgresql://<local-user>:<redacted>@127.0.0.1:5432/<disposable-e2e-db>' \
  pnpm test:e2e -- --runInBand test/legal-holds.e2e-spec.ts test/recoverable-deletion.e2e-spec.ts
```

Never source the repository `.env` for this procedure: its current database target is remote and is outside authorization.

## Cleanup

No automatic cleanup is provided. Cleanup is a separate destructive action requiring exact target review and authorization. Verify each database name starts with `carbonlite_recovery_`, each directory is the exact emitted pair root under `/tmp/carbonlite-phase-3g-a`, and evidence has been retained as approved before deleting anything. Never use a recursive command against the disposable parent, workspace root, home directory, or an unresolved variable.
