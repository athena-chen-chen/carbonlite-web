# CarbonLite Phase 3G-A2-2 Synthetic Rehearsal Report

**Execution date:** 2026-11-05 local / 2026-11-06 UTC
**Environment:** loopback PostgreSQL and disposable `/tmp` storage only
**Provider or customer access:** none

## Successful rehearsal identity

- Recovery pair: `PAIR-3GA2-2-20261106051033-B3FB7687`
- Recovery session: `recovery_e196e207_cac8_4798_bac9_e166be4dba2b`
- Operator: `recovery_operator_fae54b12-a8ba-4971-bcdd-a86591e3d2b6`
- Reviewer: `recovery_reviewer_3e4ffd33-8981-4ccd-9c71-15ff8bfc2eae`
- Evidence digest: `69e3a9579d908e699acdeefb5421859030617c0b388d5caa777c261b1e94cfac`
- Pair manifest digest: `586439b9091ff257a77b33e22c9e3ddb872f95e1d3388dbb2167e861d5c4a7a7`
- Authority public-key digest: `9ccd1e26d93c675bab9bf7fcee9637056c031d8d8384a70b01f9988ea9712ec2`

Evidence artifacts:

- Root: `/tmp/carbonlite-phase-3g-a/PAIR-3GA2-2-20261106051033-B3FB7687`
- Canonical evidence: `paired-backup/a2-2-canonical-recovery-evidence.json`
- Released authorization snapshot: `paired-backup/a2-2-released-authorization.json`
- Full rehearsal evidence: `paired-backup/rehearsal-evidence.json`
- Final external authority: `/tmp/carbonlite-recovery-control/recovery_e196e207_cac8_4798_bac9_e166be4dba2b/active-session.json`

Private authentication and authority keys were ephemeral and were not written to these artifacts.

## Scenario results

### 1. Older paired restore remained locked

The exact database dump and storage archive restored with database, file, migration, tenant-isolation, and quarantine parity. Reconciliation then detected three authoritative post-backup P0 events:

- one active Legal Hold missing from the older restore;
- one deleted document resurrected; and
- one erased organization resurrected.

Customer access remained blocked. The ten Phase 3G-A fail-closed injections also passed.

### 2. Explicit synthetic remediation and evidence

With the third `--acknowledge-synthetic-remediation` safety flag, the harness replayed the authorized synthetic events in authoritative order: document deletion, organization erasure, then the later organization hold. It did not purge quarantine.

Reconciliation after remediation reported zero unresolved P0 mismatches. Active and quarantined hashes were bound to the paired storage manifest and independent ledger. The canonical evidence package was then hashed.

### 3. Independent approval and controlled release

The operator submitted a signed command for the exact session, pair, generation, evidence, ledger, and state fingerprint. A different authorized reviewer signed approval of the same bindings. The authority consumed the approval once and produced a signed `RELEASED` record at generation 5.

The access gate independently verified the authority public key, signed history, approval identities, digest bindings, generation, zero-P0 result, and verification lease. Its decision was `VALID_EXTERNAL_RELEASE_AUTHORIZATION`.

### 4. Ledger change forced re-lock

The harness added a synthetic post-release ledger event and recomputed the ledger digest. The trusted verifier detected the mismatch, advanced to generation 6, and transitioned to `RECOVERY_LOCKED`. Customer access was blocked again.

The earlier valid generation-5 release snapshot was then evaluated with minimum generation 6 and rejected as `AUTHORITY_GENERATION_ROLLBACK`.

### 5. Restart persistence

A new policy instance reread the generation-6 external authority and remained locked. No restored database record or environment reconciliation flag could restore the prior release.

## Execution notes

Two earlier fresh attempts remained fail-closed before approval:

1. the new factor provenance verifier initially read the wrong nested snapshot field; and
2. quarantine verification initially omitted the manifest hash for a deletion already pending at backup time.

Both pairs were preserved without cleanup. No approval or release occurred. The verifier was corrected to use the established calculation snapshot structure and to bind quarantine hashes to both the paired manifest and independent ledger. No factor values or calculation governance changed.

Successful rehearsal summary:

- unresolved P0 before remediation: 3;
- unresolved P0 after remediation: 0;
- release generation: 5;
- re-lock generation: 6;
- release demonstrated: yes;
- re-lock demonstrated: yes;
- restart locked: yes;
- stale release rollback blocked: yes;
- automatic/provider change detection claimed: no;
- provider access: no;
- automatic destructive cleanup or quarantine purge: no.

## Validation results

- `npx prisma validate`: passed.
- `pnpm build`: passed.
- `pnpm test:unit -- src/common/security/recovery-approval.spec.ts src/common/security/recovery-control-store.spec.ts src/common/security/restore-access-gate.spec.ts`: 3 suites, 23 tests passed.
- `pnpm test:unit`: 62 suites, 741 tests passed.
- `DATABASE_URL=<loopback carbonlite_e2e> pnpm test:e2e -- test/recovery-access-gate.e2e-spec.ts test/legal-holds.e2e-spec.ts test/recoverable-deletion.e2e-spec.ts`: 3 suites, 14 tests passed.
- `LOCAL_RECOVERY_ADMIN_URL=<loopback postgres> pnpm recovery:rehearsal -- --local-synthetic-only --acknowledge-disposable-targets --acknowledge-synthetic-remediation`: passed for the pair/session above.
- `pnpm lint`: zero errors and 12 pre-existing warnings outside A2-2 files.
- `git diff --check`: passed in the backend and web repositories.

The final external record is owner-only (`0600`) and is deliberately left at `RECOVERY_LOCKED`, generation 6, after the re-lock scenario.

## Readiness decision

- A2-2 local synthetic code/rehearsal readiness: **GO**, subject to the recorded test suite.
- Provider-level recovery rehearsal: **NO-GO** until external authority, identity separation, continuous verification, routing isolation, and anti-rollback requirements are implemented.
- Real-data paid pilot recovery release: **NO-GO**.
