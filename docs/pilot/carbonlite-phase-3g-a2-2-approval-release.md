# CarbonLite Phase 3G-A2-2 Approval and Controlled Release

**Status:** Implemented and verified for local synthetic recovery only
**Not approved for:** provider deployment, production recovery, or real customer data

## State machine

| State | Customer access | Transition authority |
| --- | --- | --- |
| `NORMAL` | Available | No recovery record or binding exists. |
| `RECOVERY_LOCKED` | Blocked | External authority creates a new session or re-locks changed state. |
| `RECONCILING` | Blocked | External authority begins reconciliation. |
| `PENDING_APPROVAL` | Blocked | Authenticated Recovery Operator submits eligible bound evidence. |
| `APPROVED_FOR_RELEASE` | Blocked | A different authenticated Recovery Reviewer approves the exact submission. |
| `RELEASED` | Available while verification remains current | Trusted authority consumes the approval once and signs the release. |
| `REJECTED` | Blocked | Reviewer rejects the submission. |

There is no automatic transition to `RELEASED`. Environment variables cannot create a release, and `RECOVERY_RECONCILIATION_STATUS`, `RECOVERY_RESTORE_MODE`, `FORCE_RELEASE`, and `SKIP_RECONCILIATION` are not release authorities.

## External trust boundary

The restored Nest application remains a read-only consumer of the external record. The trusted writer is a local rehearsal/administration harness under `scripts/recovery-control`; it is not registered as a Nest provider, controller, or generic endpoint.

The local adapter:

- permits paths only below `/tmp/carbonlite-recovery-control`;
- uses owner-only files and refuses symlinked control records;
- serializes writers with exclusive lock creation;
- applies generation compare-and-swap;
- writes a new file, fsyncs it, atomically renames it, and fsyncs the directory;
- signs every transition and the complete envelope with an Ed25519 authority key; and
- maintains a signed SHA-256 transition chain bound to session, pair, evidence, ledger, restored-state fingerprint, actor, time, and generation.

This is a test adapter, not production authority. The rehearsal ran under one local OS identity. Code separation and asymmetric signatures were verified; distinct OS principals were not established. A privileged local process can replace the files or keys.

## Authenticated independent approval

Recovery Operator and Recovery Reviewer each use a separately generated Ed25519 key pair and immutable principal ID. The authority registry assigns exactly one recovery role to each public key. Commands are signed over:

- action;
- principal ID;
- recovery session and pair IDs;
- expected generation;
- evidence, ledger, and restored-state digests;
- unique nonce; and
- authentication and expiry timestamps.

The authority derives authorization from the registered public key and verified signature, not a client identity string. Operator and reviewer IDs must differ. Nonces already present in transition history cannot be reused. Generation compare-and-swap prevents concurrent or stale approval/release. The approval is consumed by setting `usedAt`; a second release fails.

No private keys, passwords, customer content, raw extracted rows, or approval secrets are written to the control record or ordinary logs.

## Canonical reconciliation evidence

The canonical JSON serializer recursively sorts object keys before SHA-256 hashing. The minimized evidence schema binds:

- session and pair IDs;
- database dump, storage archive, pair manifest, and independent ledger SHA-256 values;
- restored database fingerprint;
- active and quarantine inventory counts/digests;
- Legal Hold, deletion-intent, and erasure-tombstone reconciliation;
- tenant isolation, confirmed ActivityData, factor provenance, and report consistency checks;
- migration manifest and application revision;
- coded mismatch severities;
- operator principal ID and evidence creation time.

Submission is refused if any required check is false or any unresolved P0 mismatch exists. Material evidence fields must match both the signed command and external session record.

## Gate verification

The access gate rereads external state for every request. `RELEASED` opens customer routes only when:

- the authority envelope and complete history chain verify against the pinned public key;
- session, pair, and evidence bindings match;
- generation is at least the trusted launcher's minimum generation;
- operator and reviewer are distinct;
- approval is present, unexpired, and single-use;
- approval, verification lease, and control record digests match;
- unresolved P0 count is zero; and
- the short-lived verification lease has not expired.

All failures remain blocked. Health liveness remains available, but readiness is blocked during recovery. The only recovery operation allowlisted through the restored application is the existing authenticated, platform-admin read-only storage reconciliation report.

## Re-lock behavior and limitation

The trusted authority recomputes or receives newly recomputed current ledger/evidence/state values. Any mismatch transitions the session back to `RECOVERY_LOCKED`, advances the generation, and signs the new history head. Replaying the earlier signed release is blocked by the pinned minimum generation.

Detection is not continuous in this local adapter. The application does not independently scan PostgreSQL, storage, Legal Holds, deletion ledgers, or provider state on every request. It relies on a short verification lease and trusted external verifier runs. There is no claim of real-time re-lock. A production-grade continuously supervised verifier and non-rollbackable generation checkpoint remain P0 requirements.

## Production requirements and A2-2 limits

Before provider use:

1. run writer, application, and reviewer credentials under independently controlled identities;
2. place authority state and keys in a provider-grade external control plane with immutable audit and anti-rollback storage;
3. authenticate operators through production identity assurance and enforce recovery-specific roles;
4. continuously or event-driven recompute protected-state fingerprints and renew short leases;
5. protect the minimum generation from environment/operator rollback;
6. integrate provider routing so public traffic cannot bypass the gate; and
7. complete an isolated provider-level rehearsal without real customer data.

No owner or legal policy is marked approved by this implementation.
