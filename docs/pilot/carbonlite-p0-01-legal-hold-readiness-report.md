# CarbonLite P0-01 Legal Hold Readiness Report

**Prepared:** November 6, 2026

**Scope:** Existing Phase 3D/3E Legal Hold controls, deletion-freeze coverage, synthetic local rehearsal, and owner-approval preparation

**Related Master TODO tasks:** `LGL-001` (completed local implementation baseline), `LGL-002` (approval gate), `OWN-001` (named/separated roles), `RET-002` (policy decisions)

**Evidence level:** `LOCAL_TESTED`
**Real customer data:** **NO-GO**

This report records local synthetic technical evidence. It does not record legal advice, owner approval, production deployment, provider verification, or operational authorization.

## 1. Current implementation evidence

The inspected backend contains:

- persistent organization- and document-scoped `LegalHold`, `LegalHoldDocument`, and minimized `LegalHoldEvent` records;
- `PROVISIONAL`, `ACTIVE`, and `RELEASE_PENDING` blocking states;
- `JwtAuthGuard` plus `PlatformAdminGuard` on activation, listing, release-request, independent review, and release endpoints;
- requester/approver/operator identity separation in the activation and release workflow;
- the shared `LegalHoldsService.withDeletionGuard()` and an organization-keyed PostgreSQL advisory transaction lock;
- stable confidential `409 LEGAL_HOLD_ACTIVE` denial without case details;
- recoverable active-document and managed-report deletion through private same-volume quarantine;
- hold-aware workspace-erasure preparation/retry and exact manual quarantine-purge review; and
- local tests for authorization, dependency resolution, physical-byte preservation, unrelated organizations, concurrency, fail-closed database errors, recoverable deletion, and later-hold protection.

Primary implementation evidence is in sibling `carbonlite-api`:

- `src/legal-holds/legal-holds.service.ts` and `legal-holds.controller.ts`;
- `src/deletion-recovery/deletion-recovery.service.ts`;
- `src/workspace-erasure/workspace-erasure.service.ts`;
- guarded destructive methods in documents, activity data, reports, custom factors, provisioning, and sample-data services;
- `src/legal-holds/legal-holds.service.spec.ts`;
- `test/legal-holds.e2e-spec.ts`; and
- `test/recoverable-deletion.e2e-spec.ts`.

No application-code change was made for P0-01.

## 2. RACI and proposed assignments

R = Responsible, A = Accountable/approving authority, C = Consulted, I = Informed.

| Activity | Business Policy Owner | Legal/Privacy Reviewer | Hold Request Intake Owner | Technical Operator | Independent Release Reviewer | Backup Operator |
| --- | --- | --- | --- | --- | --- | --- |
| Policy/scope decision | A | C | I | C | I | C |
| Request intake and authority verification | I | C | R | I | I | I |
| Legal basis, scope, and release authority | I | A | C | I | C | C |
| Emergency provisional freeze | A | C | R | R | I | I |
| Technical activation and verification | I | C | C | R | C | I |
| Weekly/formal hold review | A | A | R | C | C | C |
| Release request and retention recalculation | A | A | R | R | C | C |
| Independent release review | I | C | I | C | A/R | C |
| Technical release | I | C | I | R | A | I |
| Backup/restore reconciliation | I | C | I | C | A | R |

Proposed for owner review only:

- Founder: Business Policy Owner.
- Founder: Technical Operator.
- Independent qualified reviewer: Legal/Privacy Reviewer.
- Proposed founder-related candidate: Independent Business Reviewer / possible Independent Release Reviewer for business-operational evidence only. Verbal willingness was later reported; formal appointment, identity, conflict review, training, access, and operational approval remain pending. The candidate cannot replace the qualified Legal/Privacy Reviewer.
- Hold Request Intake Owner and Backup Operator: to be assigned.

Delegation must be dated, scoped, and supported by separately issued access. The release requester, independent release reviewer, and technical release operator must be separate identities. If independent legal/privacy review or independent release review cannot be staffed, operational use is **BLOCKED**.

## 3. Safety preflight and synthetic rehearsal results

### Safety preflight

| Check | Result |
| --- | --- |
| Default backend `.env` | Refused for E2E: it points to a remote Neon host. No connection was attempted with that URL. |
| Database used | `127.0.0.1:5432/carbonlite_e2e`, inside the running local `postgres:16` Docker container. The database name and loopback host satisfy the repository test guard. |
| Storage used | Fresh `/tmp/carbonlite-p0-01-*` root for each E2E run. Each exact root was verified by prefix and removed after the run. |
| Data | Generated users, organizations, documents, activities, reports, factors, hold IDs, and evidence references only. No real customer data. |
| External providers | E2E setup mocks OpenAI; no Neon, Render, AWS, production, or staging access. |

The first sandboxed E2E attempt could not reach loopback PostgreSQL and failed 5/5 during application initialization. It did not reach any remote host or execute scenarios. The same verified command was rerun with localhost access and passed 5/5. This environmental retry is recorded to distinguish setup failure from control behavior.

### Scenario results

| Scenario | Result | Evidence / limitation |
| --- | --- | --- |
| Receive request and assign opaque case | `TABLETOP PASS` | Runbook intake checklist and synthetic `caseReference`; human restricted-case system remains unassigned. |
| Verify requester/approver authority | `PASS` | Non-platform user and forged approver activation returned `403`. |
| Register and activate organization hold | `PASS` | Persistent synthetic hold created through guarded endpoint. |
| Block document deletion and retain bytes | `PASS` | `409 LEGAL_HOLD_ACTIVE`; storage read returned bytes. |
| Block single and both bulk activity deletions | `PASS` | Single plus POST/DELETE bulk paths denied; mixed batch remained intact. |
| Block admin clear | `PASS` | Activity clear denied. |
| Block managed report deletion | `PASS` | Hold denial passed; managed report quarantine/external fail-closed paths passed in recoverable-deletion suite. |
| Block workspace erasure | `PASS` | Held organization erasure denied; unit failure/retry behavior passed. |
| Leave unrelated organization unaffected | `PASS` | Unrelated document deletion succeeded without cross-tenant impact. |
| Request release | `PASS` | Unauthorized request denied; authorized platform request moved to `RELEASE_PENDING`. |
| Require independent review | `PASS WITH CODE-REVIEW LIMIT` | Premature release denied and different reviewer approved. The explicit self-review branch exists, but the focused E2E suite does not contain a standalone same-requester review attempt. |
| Technical release through separate operator | `PASS` | Unauthorized/premature release denied; separate operator released after review. |
| Release causes no automatic deletion | `PASS` | Document row and bytes remained after release. |
| Normal authorization/retention review still required | `TABLETOP PASS` | Runbook and endpoint semantics require a separate deletion action; approved retention policy/human decision remains pending. |
| Minimized evidence | `PASS WITH EXTERNAL-STORE GAP` | Stable denial omits case details; event schema is minimized. Restricted external authority/evidence store remains unassigned. |
| Concurrent activation/deletion | `PASS` | Advisory-lock E2E queued activation before deletion; deletion returned `409`, row and bytes remained. |
| Database error fails closed | `PASS` | Unit test rejected the operation and did not execute destructive callback. |
| Manual purge and later hold | `PASS` | Unauthorized purge denied; later document hold blocked purge; exact unheld set and unrelated tenant checks passed. |

### Executed validation totals

| Command | Result |
| --- | --- |
| Focused unit suites: Legal Holds, activity deletion/reset, workspace erasure, document storage orchestration, sample data | **5 suites, 44 tests passed** |
| Focused Legal Hold PostgreSQL E2E | **1 suite, 5 tests passed** on final safe run |
| Focused recoverable-deletion PostgreSQL E2E | **1 suite, 7 tests passed** |
| `npx prisma validate` with process-local loopback URL | **Passed** |
| Backend build | Not run; no code or test dependency changed. |

## 4. Deletion-path coverage

| Path | Local protection | Test evidence | Production deployed | Remaining bypass / limitation | Priority |
| --- | --- | --- | --- | --- | --- |
| Document deletion and physical bytes | Yes; guard plus recoverable quarantine | Legal Hold E2E; recoverable-deletion E2E | **NO / unverified** | Direct SQL/filesystem/provider access; DB/filesystem non-atomicity | P0 for real data |
| Activity single/bulk deletion | Yes; dependency resolution and atomic mixed-batch denial | Legal Hold E2E; service unit tests | **NO / unverified** | Direct SQL/operator path | P0 for real data |
| Admin clear | Yes | Legal Hold E2E; unit tests | **NO / unverified** | Direct SQL/operator path | P0 for real data |
| Demo reset | Guarded in code | Unit/code evidence only for hold boundary | **NO / unverified** | Deletes document rows without physical cleanup; must remain disabled for paid pilot | P1 if disabled; P0 if enabled |
| Managed report deletion | Yes; managed artifacts use quarantine | Legal Hold and recoverable-deletion E2E | **NO / unverified** | Unsupported external artifacts fail closed; adapter/inventory incomplete | P1, or P0 if external artifacts are in pilot scope |
| Custom factor dependency deletion | Yes for organization custom factors linked to held activity | Legal Hold E2E | **NO / unverified** | Global factor-source deletion and projection replacement are separately governed | P1 unless included by matter scope |
| Provisioning/sample cleanup | Yes for inspected service paths | Legal Hold E2E; sample-data unit tests | **NO / unverified** | Direct low-level helper/new caller architecture risk | P1 |
| Workspace erasure and retry | Yes | Legal Hold E2E; workspace unit failure/retry tests | **NO / unverified** | Direct provider/operator access; external storage rollback impossible | P0 for real data |
| Manual quarantine purge | Yes; exact review token, hold recheck, later-hold protection | Recoverable-deletion E2E | **NO / unverified** | Direct storage shell/provider access | P0 for real data |
| Background cleanup/retry | Application workspace/deletion retries are guarded; accepted-document hold applies | Unit/E2E evidence above | **NO / unverified** | No repository retention scheduler found; external cron/provider lifecycle/operator scripts unknown; temporary upload hygiene is outside accepted-document scope | P0 inventory; P1 transient-override decision |

The updated `carbonlite-deletion-freeze-control-matrix.md` contains the detailed path mapping. No local test proves production deployment or provider/operator bypass control.

## 5. Proposed owner approval wording

> Approve CarbonLite Legal Hold policy version ______ effective ______ for the stated controlled-pilot scope, subject to the named RACI assignments and evidence references in `carbonlite-legal-hold-owner-approval.md`. Authorize the named Business Policy Owner to order an emergency provisional freeze; authorize only the named Legal/Privacy Reviewer to approve legal basis, scope, communications, and release authority; authorize only the named Technical Operator to execute the recorded technical steps; require an Independent Release Reviewer and a separate technical release operator; require weekly operational review and formal necessity/scope review at least every 90 days; and keep real customer data and production use at NO-GO until provider/operator bypass, deployment, backup/restore reconciliation, and external authority controls are independently evidenced.

This is proposed wording. It is not approved and must not be copied into the Decision Log as an approval without the named authority, exact decision, date, scope, conditions, and durable evidence.

## 6. Legal/privacy review requirements

The reviewer must decide and evidence:

1. legitimate hold triggers and requester authority;
2. organization versus document scope and covered data classes;
3. confidentiality, access, communications, and minimized evidence fields;
4. provisional-freeze authority and escalation deadline;
5. review cadence, narrowing, release authority, and record closure;
6. interaction with deletion requests, offboarding, contract terms, and retention deadlines;
7. backup survival, expiry, restoration, and reapplication of later holds/deletions;
8. provider/operator direct-access and lifecycle-rule controls; and
9. correction of outdated statements in the draft policy and retention-register `Read Me` before approval.

No legal/privacy reviewer, signature, or legal conclusion was fabricated by this work.

## 7. Production deployment prerequisites

- Assign all accountable roles and independent identities under `OWN-001`.
- Complete explicit owner/legal/privacy approval for `RET-002`, `LGL-002`, and the aligned deletion procedure `DEL-002`.
- Correct and version the stale policy/register implementation descriptions.
- Freeze exact release SHAs and migration inventory under `REL-001`.
- Obtain production change approval under `REL-002`; then deploy only the approved migrations/release under `REL-003`.
- Inventory and restrict direct Neon, Render, shell, CI/CD, SQL, storage, backup, and recovery access under `INF-001` and `IAM-001`.
- Complete the external append-only hold/deletion authority and paired backup/restore controls under `REC-005` through `REC-007` and `BAK-002` through `BAK-004`.
- Run independently reviewed production-safe synthetic verification under `REL-004`.
- Keep customer access and real data blocked until `GOV-001` records the final authorized GO.

## 8. Remaining blockers

### P0

- `OWN-001`: a founder-related Independent Business Reviewer candidate has been identified, but no restricted named appointment, identity verification, conflict disposition, training, access evidence, backup, legal/privacy reviewer, intake owner, or backup operator assignment is complete.
- `RET-002` and `LGL-002`: policy and workflow are prepared but unapproved; no legal/privacy disposition or human rehearsal sign-off.
- The policy draft and retention register contain stale statements that no persistent Legal Hold model exists.
- `INF-001`/`IAM-001`: provider/operator bypass paths and effective access are unverified.
- `REL-001` through `REL-004`: exact release/migration/deployment/production verification is incomplete.
- `REC-005` through `REC-007` and backup tasks: no authoritative external non-rollback ledger, paired provider recovery evidence, or isolated provider rehearsal.

### P1 / conditional P0

- Add explicit regression coverage for release-requester self-review denial; current code branch is reviewed but focused E2E lacks a standalone attempt.
- Keep demo reset disabled for paid pilots until physical-file lifecycle is safe.
- Inventory external report artifact stores and implement an approved adapter if used.
- Add an architecture/static control against new direct Prisma/storage destructive paths.
- Decide global factor-source and destructive projection preservation when a matter includes them.

## 9. Readiness decisions

- **Local technical readiness:** **GO** for continued synthetic rehearsal and owner review. Evidence is `LOCAL_TESTED`.
- **Local operational use:** **NO-GO** until named independent roles, human tabletop participation, policy correction, and explicit owner/legal approval are recorded.
- **Production use:** **NO-GO**. Deployment, migrations, provider/operator bypass controls, recovery authority, and provider rehearsal are not evidenced.
- **Real-data paid pilot:** **NO-GO**.

## 10. STOP conditions

Stop activation/release/deletion/restore/customer-access work if authority or scope is ambiguous, an independent reviewer is unavailable, a held delete succeeds, the register and database disagree, provider/direct access is unverified, backup or restore evidence is incomplete, production release evidence is missing, or any step would use real customer data before final approval.
