# CarbonLite Phase 3G-A2-1 Durable Recovery State

**Status:** Implemented for local synthetic validation; every recovery state remains locked
**Scope:** Durable recovery-session identity and fail-closed access only
**Not included:** Approval, release, production recovery authority, provider deployment, or real data

> **A2-2 update:** This document remains the historical A2-1 locked-state design. Local signed approval and controlled release are implemented in `carbonlite-phase-3g-a2-2-approval-release.md`; A2-1 records remain locked and cannot be interpreted as A2-2 release authority.

## Security outcome

Phase 3G-A2-1 removes environment variables as an access-release mechanism. `RECOVERY_RECONCILIATION_STATUS=COMPLETE`, `RECOVERY_RESTORE_MODE=false`, `FORCE_RELEASE`, and `SKIP_RECONCILIATION` cannot release a discovered or requested recovery session. `RELEASED` is not an accepted A2-1 state and parsing such a control record fails closed.

The application consumes a protected control record outside the restored PostgreSQL database and document volume. The application never writes or advances that record. For local synthetic work, a separately invoked initializer creates a new mode-`0600`, owner-matched file under `/tmp/carbonlite-recovery-control`; it refuses an existing target and paths outside that root. This local file is development evidence, not production-grade authority.

## State machine

| Mode/state | Meaning | Customer access in A2-1 | Allowed transition |
| --- | --- | --- | --- |
| `NORMAL` | No recovery indicator and no external recovery record at the trusted path. | Normal behavior. | Trusted external recovery initiation creates `RECOVERY_LOCKED`. |
| `RECOVERY_LOCKED` | Recovery session exists; no reconciliation phase has been accepted. | Blocked. | `RECONCILIATION_PENDING` only. |
| `RECONCILIATION_PENDING` | Reconciliation is incomplete or being reviewed. | Blocked. | `RECOVERY_LOCKED` or `APPROVAL_PENDING`. |
| `APPROVAL_PENDING` | Reconciliation may be complete, but A2-2 approval/release does not exist. | Blocked. | `RECOVERY_LOCKED` or `RECONCILIATION_PENDING`. |
| `RELEASED` | Reserved for A2-2. | Unreachable; record is rejected as corrupt. | None in A2-1. |

Every request re-reads and validates external state. Missing, unreadable, permissively accessible, corrupt, oversized, symlinked, identity-mismatched, or unsupported state returns the locked decision. A later external-state change therefore takes effect without trusting restored database contents or a process-local cached release.

## External record and identity binding

Schema version 1 contains only minimized control metadata:

- recovery session ID;
- recovery pair ID;
- one locked A2-1 state;
- canonical recovery-evidence SHA-256 supplied by the trusted process;
- opaque restored database and storage identities;
- monotonic generation;
- creation and update UTC timestamps.

The application may be bound through `RECOVERY_SESSION_ID`, `RECOVERY_PAIR_ID`, and `RECOVERY_EVIDENCE_DIGEST`. A supplied mismatch locks access. The restored database is never queried for recovery release authority, so restoring an older database cannot restore an earlier release decision.

For a synthetic local session:

```bash
pnpm recovery:control:init-local -- \
  --local-synthetic-only \
  --acknowledge-external-control-store \
  --control-path=/tmp/carbonlite-recovery-control/<session>/active-session.json \
  --session-id=recovery_<opaque-id> \
  --pair-id=<recovery-pair-id> \
  --evidence-digest=<64-lowercase-hex> \
  --database-identity=db:<opaque-id> \
  --storage-identity=storage:<opaque-id>
```

The trusted launcher then pins the path and bindings when starting the isolated API. It must not place the control store inside the restored database volume, restored document storage, repository, or backup being restored.

## Startup and restart behavior

Recovery state is evaluated before `NestFactory.create()`. A missing/corrupt recovery authority does not stop the health process from starting; it produces a locked policy, after which only the explicit allowlist is routable. A new process instance reading the same external record remains locked, even when `RECOVERY_RESTORE_MODE=false` or the restored database contains stale state.

Normal startup remains compatible only when no recovery is requested and no record exists at the trusted default/configured path. A trusted production recovery launcher must create/mount the external state first, pin its path and identity bindings, prevent operators or the restored workload from altering/removing it, and keep public routing disabled independently. Repository code does not prove that provider control plane.

## Gate coverage

While locked, the middleware runs before authentication and route handlers and blocks:

- login and authenticated customer sessions;
- document listings/downloads and uploads;
- reports and report artifacts;
- activity, metrics, factor, organization, and workspace routes;
- all customer/admin mutations, including purge and Legal Hold mutation routes.

The only allowlisted HTTP paths are:

- `GET`/`HEAD /api/health` and descendants; and
- `POST /api/admin/storage-reconciliation/report`.

The reconciliation report retains its existing JWT plus platform-admin guards. Because login is blocked, an operator requires a separately controlled, already-issued credential during A2-1. No recovery approval or release endpoint exists.

The repository contains no autonomous scheduled customer-data worker. Current extraction work is request-triggered and therefore blocked at HTTP admission. `RecoveryAccessPolicy.assertBackgroundMutationAllowed()` is available for future workers. Any provider job, external script, direct SQL/storage access, or future worker not using that assertion remains a P0 operational boundary.

## Local control-store limitations

- A mode-`0600` JSON file under `/tmp` is only synthetic evidence. A privileged local user can replace it.
- A2-1 accepts no release state, so replacement cannot legitimately unlock access; corrupt or `RELEASED` content locks.
- Production requires an independently protected external authority, immutable/audited writes, authenticated operators, rollback protection, and a trusted launcher/mount. None is claimed here.
- Removing both the externally managed path and recovery identity from a production process is outside application control. The production supervisor must make those settings/mount non-bypassable; this remains P0 before provider use.
- The read-only reconciliation endpoint does not persist structured A2-2 approval evidence.

## A2-2 prerequisites

Before `RELEASED` can be introduced:

1. production-grade external authority and write audit;
2. canonical evidence digest and generation/rollback protection;
3. authenticated recovery administration separate from restored customer auth;
4. independent two-person approval bound to session, pair, evidence digest, restored identities, and generation;
5. atomic compare-and-set transition to `RELEASED`;
6. automatic approval invalidation/re-lock after any bound-state change;
7. restart, concurrency, stale-approval, tamper, and rollback E2E tests; and
8. an independently approved synthetic release rehearsal.

## Test evidence

Focused A2-1 tests cover:

- recovery starts locked;
- all three A2-1 states remain locked;
- `COMPLETE`, `FORCE_RELEASE`, and `SKIP_RECONCILIATION` cannot unlock;
- `RECOVERY_RESTORE_MODE=false` cannot unlock a discovered record;
- missing, corrupt, permissive, and identity-mismatched state locks;
- a new policy instance remains locked after restart;
- restored `DATABASE_URL` content is irrelevant to release;
- document download, report, login, and mutation routes return `503`;
- only health and authenticated read-only reconciliation routing is allowlisted;
- normal non-recovery startup remains compatible;
- background mutation assertion blocks; and
- `RELEASED` is rejected and has no allowed transition.

Local synthetic validation on 2026-11-05 produced:

- `npx prisma validate`: passed;
- `pnpm build`: passed;
- `pnpm lint`: passed with zero errors and 12 pre-existing warnings outside the A2-1 files;
- focused A2-1 unit tests: 2 suites, 17 tests passed;
- full unit tests: 61 suites, 735 tests passed;
- focused loopback PostgreSQL/HTTP E2E: 3 suites, 13 tests passed;
- local initializer: created a new owner-only (`0600`) `RECOVERY_LOCKED` synthetic record; and
- recovery rehearsal safety check: compiled and refused to run without both destructive-operation acknowledgements, before backup, restore, or cleanup.

No Prisma migration was required because authoritative state must remain outside the restored database.
