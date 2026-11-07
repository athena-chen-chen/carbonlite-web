# CarbonLite P0-02 Deletion Request Readiness Report

**Prepared:** November 6, 2026

**Scope:** Deletion Request Register, manual-first workflow, synthetic tabletop, focused local technical validation, and owner-review preparation

**Master TODO:** `DEL-002`

**Evidence level:** `DOCUMENTED` and `LOCAL_TESTED` as stated below

**Real customer data:** **NO-GO**

This report does not record owner approval, legal advice, production deployment, provider verification, or operational authorization.

## 1. Evidence-level summary

| Level | Result | Boundary |
| --- | --- | --- |
| `DOCUMENTED` | Yes | Manual workflow, RACI, deadlines, escalation, evidence, backup reconciliation, communications, and five tabletop scenarios are documented. |
| `LOCAL_TESTED` | Yes, for the focused technical controls listed below | 24 unit tests and 12 PostgreSQL E2E tests passed with synthetic data. Manual identity checking, human approval, customer communication, deadlines, backup expiry, and provider behavior were not technically tested. |
| `OWNER_APPROVED` | No | No named owner, legal/privacy disposition, reviewer assignment, or approval was supplied. |
| `PRODUCTION_DEPLOYED` | No / unverified | No deployment, migration, staging, production, Neon, Render, or provider action occurred. |
| `OPERATIONALLY_VERIFIED` | No | No trained human rehearsal, live operating case, provider reconciliation, or customer communication occurred. |

## 2. Current code capabilities

Repository inspection found these local capabilities in `carbonlite-api`:

- authenticated tenant-scoped document deletion;
- durable deletion intents with `PREPARED`, `PENDING_PURGE`, `PURGED`, and `RECONCILIATION_REQUIRED` states;
- same-volume private quarantine under `.quarantine` before document metadata deletion;
- cascade removal of extraction/review drafts while confirmed `ActivityData` and copied provenance remain;
- persistent organization/document Legal Holds and fail-closed deletion guards;
- platform-admin workspace dry run and exact ID/slug/confirmation erasure;
- managed report-artifact quarantine and fail-closed handling for unsupported external artifacts;
- read-only storage reconciliation and exact-ID manual purge review; and
- minimized technical audit/event evidence.

The application has no deletion-request case model, automatic deadline scheduler, approved identity-verification service, or approved customer-notification workflow. Direct provider/operator bypass and production deployment remain unverified.

## 3. Register operationalization

The existing **Deletion Requests** worksheet was extended in place from 17 to 23 fields without adding or removing sheets. It now tracks:

`Request ID`, `Organization ID`, `Request Received Date`, `Request Channel`, `Requester Reference`, `Identity Verified`, `Authority Verified`, `Request Scope`, `Assigned Owner`, `Technical Operator`, `Independent Reviewer`, `Legal Hold Status`, `Legal/Contract Exception`, `Approval Status`, `Due Date`, `Execution Date`, `Deletion Result`, `Evidence Reference`, `Backup Expiry Reference`, `Customer Notification Date`, `Closure Date`, `Status`, and `Notes`.

Controlled lists cover channel, identity, authority, scope, hold, exception, approval, result, and lifecycle status. Dates are typed and formatted. Conditional formatting identifies overdue open requests, missing owners, pending independent approval, Legal Hold blocks, and failed deletion escalation. The two prior synthetic examples remain synthetic and were mapped to the expanded fields. The **Legal Holds** and **Policy Decisions** worksheets remain intact and their approval states remain Pending.

## 4. Proposed RACI and assignments

| Role | Proposed assignment for review | Required boundary |
| --- | --- | --- |
| Request Intake Owner | Founder/operations owner | May intake and verify through approved methods; cannot provide legal approval. |
| Business/Privacy Decision Owner | Founder for business decisions; named privacy authority still required | Owns case decision and resources; cannot substitute for qualified legal/privacy review. |
| Technical Operator | Founder or named least-privilege operator | Cannot approve their own destructive action. |
| Independent Reviewer | Proposed founder-related Independent Business Reviewer candidate; verbal willingness reported; formal appointment remains pending | If formally appointed, must review the exact target, scope, hold result, inventory, method, and evidence; cannot be operator or legal/privacy authority. Internal separation only; no external/legal independence is claimed. |
| Legal/Privacy Advisor | Unassigned qualified reviewer | Decides preservation, legal basis, disclosure, deadlines, and exceptions. |
| Backup/Reconciliation Owner | Unassigned infrastructure/recovery operator | Owns paired recovery-point and post-restore reconciliation; cannot alone authorize restored customer access. |

Every role requires a dated primary and backup assignment. Missing independent review, unresolved Legal Hold, failed verification, or ambiguous scope blocks execution.

## 5. Synthetic scenario results

The scenarios used only synthetic identifiers and files. “Tabletop pass” means the documented steps produced a safe expected decision; it is not a human operational rehearsal or provider test.

### Scenario 1 — one source document

**Result:** `TABLETOP PASS` and technical path `LOCAL_TESTED`.

- Register example: `DR-TBL-001`, `ORG-TBL-001`, exact `DOC-TBL-001`; identity/authority and hold clearance are synthetic assumptions, not real approvals.
- Workflow selects only the exact tenant document, requires an independent reviewer, and expects recoverable quarantine.
- E2E evidence verifies active bytes move to quarantine, the document row disappears, extraction and spreadsheet-review rows cascade, confirmed `ActivityData` remains with source provenance, quota evidence remains, and duplicate deletion is idempotent.
- Required customer wording distinguishes active-system source deletion from retained confirmed records, quarantine, and backups.

### Scenario 2 — complete organization erasure

**Result:** `TABLETOP PASS`; workspace service behavior `LOCAL_TESTED` by unit tests and a focused synthetic E2E path.

- Register example: `DR-TBL-002`, `ORG-TBL-002`; exact ID and slug, platform-admin operator outside the target workspace, and a different reviewer are mandatory.
- Unit evidence verifies a non-mutating dry run, comprehensive counts, exact ID/slug/confirmation checks, tenant-boundary preservation, quarantine before organization deletion, and idempotent retry.
- The E2E suite verifies workspace erasure can preserve recovery records and later Legal Hold protection.
- Unsupported external artifacts fail closed; backup expiry and post-restore replay remain tracked, not presumed complete.
- Human identity/authority verification and independent approval were only tabled, not executed by real people.

### Scenario 3 — active Legal Hold

**Result:** `TABLETOP PASS` and technical denial `LOCAL_TESTED`.

- Register example: `DR-TBL-003`, `ORG-TBL-003`, opaque `LH-TBL-001`; no sensitive hold reason is recorded.
- Workflow sets status `BLOCKED`, executes no deletion, and routes customer wording through legal/privacy review.
- E2E evidence verifies organization/document holds return confidential `409 LEGAL_HOLD_ACTIVE`, preserve bytes and database records, block workspace and dependent destructive paths, and do not expose case details.

### Scenario 4 — unauthorized requester or ambiguous scope

**Result:** `TABLETOP PASS`; application authorization boundary partially `LOCAL_TESTED`.

- Register example: `DR-TBL-004`; identity `Pending`, authority `Failed` or `Pending`, scope `Other supported scope` with clarification required.
- No deletion packet is created and status remains `Pending verification` or `Pending scope clarification`.
- E2E evidence verifies ordinary tenant users cannot perform platform Legal Hold administration and forged approver identity is rejected. It does not implement or test the external customer identity-verification process.

### Scenario 5 — partial storage or database failure

**Result:** `TABLETOP PASS` and failure handling `LOCAL_TESTED`.

- Register example: `DR-TBL-005`; result `Failed` or `Reconciliation required`, status `Failed - escalation required`; never `Complete`.
- Unit evidence verifies storage exhaustion leaves database data intact, missing active/quarantine copies fail closed, and database failure after recoverable movement supports retry.
- E2E evidence verifies a database rollback leaves a traceable `PREPARED` intent and quarantine copy, then succeeds through the same idempotent retry; reconciliation reports missing bytes, orphan quarantine, and restore mismatch without mutation.

## 6. Focused validation performed

### Safety boundary

- Database: explicit process-local `postgresql://...@127.0.0.1:5432/carbonlite_e2e`; the repository guard accepts only loopback and recognized disposable database names.
- Storage: dedicated `/tmp/carbonlite-p0-02-e2e`.
- Data: generated synthetic users, organizations, documents, activities, reports, holds, and evidence references.
- Providers: no Neon, Render, AWS, staging, production, or external provider access.

### Results

| Command scope | Result |
| --- | --- |
| `documents.service.storage`, `workspace-erasure.service`, and `legal-holds.service` focused unit suites | **3 suites, 24 tests passed** |
| `legal-holds.e2e-spec.ts` and `recoverable-deletion.e2e-spec.ts` against verified local PostgreSQL and `/tmp` storage | **2 suites, 12 tests passed** |
| Application build | Not run; no application code changed. |

Executed commands:

```bash
pnpm test:unit -- src/documents/documents.service.storage.spec.ts src/workspace-erasure/workspace-erasure.service.spec.ts src/legal-holds/legal-holds.service.spec.ts
```

```bash
DATABASE_URL='postgresql://carbonlite:carbonlite@127.0.0.1:5432/carbonlite_e2e' DOCUMENT_STORAGE_PATH='/tmp/carbonlite-p0-02-e2e' NODE_ENV='test' pnpm test:e2e -- test/legal-holds.e2e-spec.ts test/recoverable-deletion.e2e-spec.ts
```

Expected error logs for simulated storage exhaustion, reconciliation-required state, and database failure appeared during passing unit tests. They are evidence of fail-closed branches, not failed tests.

## 7. Deadline tracking validation

The register now has typed receipt, due, execution, notification, and closure dates. Its overdue rule flags a non-closed row when Due Date is earlier than the workbook calculation date. The runbook defines proposed 2-business-day acknowledgement, 5-business-day verification/status, and 30-calendar-day active-system targets with explicit triggers and manual holiday review.

Limitations:

- no approved holiday calendar or automatic business-day formula exists;
- no scheduler, reminder delivery, or escalation integration was tested;
- targets are proposed and not approved contractual or legal deadlines; and
- staffing or approval delay does not silently move the recorded Due Date.

## 8. Backup expiry and evidence dependencies

Active-system completion, quarantine retention, backup expiry, provider deletion, and evidence expiry are separate milestones. Closure requires the approved policy to decide whether a case may close before verified final backup expiry. Current dependencies remain:

- approved `RET-002` retention and backup-survival values;
- paired independent backup implementation and verified expiry;
- external append-only hold/deletion authority and non-rollback checkpoint;
- isolated provider restore rehearsal and post-restore deletion replay;
- minimized evidence-retention period and expiry control; and
- provider/operator bypass inventory and least-privilege evidence.

## 9. P0 blockers

- `OWN-001`: a founder-related reviewer candidate has been identified, but restricted named appointment, identity verification, conflict disposition, training, individual access, primary/backup assignments, legal/privacy authority, and backup/reconciliation roles remain incomplete.
- `RET-002`: retention, deletion, offboarding, backup survival, and evidence periods remain unapproved.
- `LGL-002`: Legal Hold authority and release workflow remain unapproved.
- `DEL-002`: human owner/legal review, assignments, communication approval, and operational rehearsal remain incomplete.
- `INF-001` / `IAM-001`: provider state and destructive bypass access are unverified.
- `REL-001` through `REL-004`: exact release, migration approval, deployment, and production-safe synthetic verification are incomplete.
- `REC-005` through `REC-007` and `BAK-002` through `BAK-004`: external authority, paired backup capture, provider rehearsal, and expiry evidence are incomplete.
- `DAT-001` / `DAT-002`: repeatable expiry/minimization and end-to-end deletion semantics across every store are incomplete.

## 10. P1 / conditional blockers

- Add a reviewed operating calendar or approved manual holiday-control process.
- Train primary and backup operators and conduct a human tabletop with signed evidence.
- Add reminders/escalation automation only after the manual process and policy are approved.
- Complete account/contact deletion semantics and shared-user handling.
- Inventory external report/artifact stores and add an approved adapter if they enter pilot scope.
- Add a case-management system if volume or legal requirements exceed safe workbook operation.

## 11. Readiness decisions

- **GO — local synthetic workflow rehearsal and owner/legal review:** The manual process is documented, the register is operationalized for synthetic use, and focused local technical tests passed.
- **NO-GO — local operational use with real customer requests:** Named roles, human independent approval, legal/privacy dispositions, approved communication, and backup/expiry operations are absent.
- **NO-GO — production deletion workflow:** No deployment, provider access evidence, production-safe test, or operational authority exists.
- **NO-GO — real-data paid pilot:** P0 gates remain open. Local documentation and tests do not authorize customer data.

## 12. Required owner approval packet

Before `DEL-002` can be considered for `DONE`, the authorized owner and legal/privacy reviewer must record:

- named primary and backup roles with separation of duties;
- approved request channel and restricted case/evidence store;
- identity and organization-authority verification methods;
- approved scope categories and account/contact handling;
- Legal Hold, contract, confirmed-record, and other exception decisions;
- exact deadlines, calendar/time-zone convention, escalation, and customer-update rules;
- approval expiry and two-person destructive-action rules;
- active-system verification and failure/retry criteria;
- backup survival, final expiry, restore replay, and case-closure rules;
- minimized deletion-evidence fields, access, retention, and expiry;
- legally reviewed communication templates;
- dated human synthetic tabletop evidence; and
- explicit production/deployment/provider prerequisites and STOP conditions.

No checkbox, synthetic row, or local test result in this package records that approval.
