# CarbonLite Decision Log

This file is the authoritative record only for explicit CarbonLite founder, owner, legal, privacy, commercial, infrastructure, and go/no-go decisions. It is not a task tracker. `CARBONLITE_MASTER_TODO.md` remains authoritative for task status, priority, dependencies, dates, acceptance criteria, and evidence.

## Decision Recording Rules

Allowed decision statuses are:

- `PENDING` — no authorized decision has been recorded.
- `APPROVED` — an identified authority explicitly approved the exact recorded decision and dated evidence is linked.
- `REJECTED` — an identified authority explicitly rejected the exact proposal and dated evidence is linked.
- `SUPERSEDED` — a later authorized decision replaces the record; both records remain in history.

An entry may be marked `APPROVED`, `REJECTED`, or `SUPERSEDED` only when it records:

1. the named decision authority and role;
2. the exact decision and its scope;
3. the decision date and time, including timezone;
4. the effective date, if different;
5. a durable evidence reference; and
6. affected Master TODO task IDs and any conditions or expiry.

Silence, review readiness, local test success, document creation, provider configuration, or deployment does not constitute approval. Historical entries are append-only; correct an error with a new linked entry rather than silently rewriting an approved decision.

## Current Decision Register

No approved, rejected, or superseded business decision is recorded in this initial repository baseline.

The identifiers below are decision-record identifiers, not Master TODO task IDs. They do not change task status.

| Decision ID | Related task | Decision topic | Status | Authority | Decision / evidence |
|---|---|---|---|---|---|
| `DEC-PENDING-001` | `OWN-001` | Accountable owners and independent recovery/reviewer identities | `PENDING` | Not recorded | No approved assignment recorded. |
| `DEC-PENDING-002` | `COM-002` | Pilot price, scope, usage limits, and support terms | `PENDING` | Not recorded | Founder preference record `FDR-2026-001` is `PENDING_FOUNDER_APPROVAL`; no approved commercial terms recorded. |
| `DEC-PENDING-003` | `RET-002` | Retention, deletion, legal-hold, erasure, and backup-expiry policy | `PENDING` | Not recorded | Founder preference record `FDR-2026-002` is `PENDING_FOUNDER_APPROVAL`; no approved policy decision recorded. |
| `DEC-PENDING-004` | `AI-001` | AI-processing boundary, data handling, and fallback | `PENDING` | Not recorded | Founder preference record `FDR-2026-003` is `PENDING_FOUNDER_APPROVAL`. AI remains optional and organization-default-disabled. Proposed document scope and withdrawal handling are recorded for review, not approved. Provider, legal/privacy, retention, deployment, activation, and final real-data decisions remain pending. |
| `DEC-PENDING-005` | `AWS-002` | Separate AWS account, region, S3 Object Lock, encryption, and proposed retention | `PENDING` | Not recorded | No approval to create or configure AWS resources recorded. |
| `DEC-PENDING-006` | `FAC-001` | Production factor/methodology allowlist and governance | `PENDING` | Not recorded | No approved production allowlist recorded. |
| `DEC-PENDING-007` | `GOV-001` | Final real-data paid-pilot go/no-go | `PENDING` | Not recorded | Prerequisites remain open; no operational approval recorded. |

## Founder Preference Records

### FDR-2026-001 — Founder commercial preference

- Record state: `PENDING_FOUNDER_APPROVAL`
- Decision Log status: `PENDING`
- Related decision: `DEC-PENDING-002`
- Related task: `COM-002`
- Authority: Founder preference communicated; final founder approval not recorded
- Recorded at: 2026-11-06 15:44 America/Edmonton
- Effective date: None
- Scope: Proposed first invitation-only paid pilot offer only
- Preferred proposal:
  - CAD 199 plus applicable taxes
  - 4 weeks / 28 calendar days
  - 20 eligible documents
  - 1 organization
  - 2 named users
  - 1 reviewed PDF/CSV reporting package
  - 1 revision round
  - 1 feedback session
- Decision effect: None. This is the founder's preferred proposal, not an approved commercial policy, offer, contract, pricing publication, or authority to accept real customer data.
- Conditions: Explicit founder approval, finance/tax/legal review, and the remaining `COM-002` acceptance criteria and dependencies are still required.
- Evidence: Founder instruction recorded in the 2026-11-06 Codex session and this repository record.
- Supersedes / superseded by: None
- Recorded by: Codex session

### FDR-2026-002 — 30-day active-system deletion preference

- Record state: `PENDING_FOUNDER_APPROVAL`
- Decision Log status: `PENDING`
- Related decision: `DEC-PENDING-003`
- Related tasks: `RET-002`, `DEL-002`, `LGL-002`
- Authority: Founder preference communicated; final founder and qualified legal/privacy approval not recorded
- Recorded at: 2026-11-06 16:23 America/Edmonton
- Effective date: None
- Scope: Proposed paid-pilot active-system deletion completion deadline
- Founder preference: Complete deletion of covered customer data from active systems within 30 calendar days after the end of the paid pilot, subject to applicable preservation obligations, valid Legal Holds, and expressly disclosed exceptions.
- Deadline meaning: Completion deadline, not a deletion-start deadline. Moving managed bytes to recoverable quarantine does not by itself satisfy completion.
- Covered pending preferences preserved: Original source files, AI/extraction drafts, confirmed Activity Data, calculated emissions, and Kach-controlled PDF/CSV report data and artifacts are proposed for active-system completion within the same 30-day period. Customer-controlled downloads are excluded.
- Unresolved periods: Audit-record retention and backup/recovery-copy retention remain `UNDECIDED`.
- Decision effect: None. This is a founder preference for review, not an approved retention policy, customer commitment, signed contract term, production procedure, or deletion authorization.
- Conditions: Explicit founder approval, qualified legal/privacy approval, named roles, complete active/external-artifact coverage, production deployment evidence, synthetic operational rehearsal, and separate audit/backup decisions are still required.
- Evidence: Founder instruction recorded in the 2026-11-06 Codex session and [RET-002 feasibility review](carbonlite-ret-002-30-day-deletion-feasibility.md).
- Supersedes / superseded by: None; clarifies the pending 30-day proposals without approving them
- Recorded by: Codex session

### FDR-2026-003 — AI document scope and withdrawal preference

- Record state: `PENDING_FOUNDER_APPROVAL`
- Decision Log status: `PENDING`
- Related decision: `DEC-PENDING-004`
- Related task: `AI-001`
- Authority: Founder preference communicated; final founder, qualified legal/privacy, and operational approvals not recorded
- Recorded at: 2026-11-07 09:06 America/Edmonton
- Effective date: None
- Scope: Proposed optional AI processing boundary for the first controlled paid pilot
- Founder preferences:
  - AI processing remains optional and disabled by default for each Customer organization.
  - Proposed allowed documents are electricity bills, natural gas bills, fuel purchase invoices, and other specifically approved energy or activity records.
  - Proposed withdrawal contact is `carbonliteai@gmail.com`.
  - Proposed acknowledgement target is within 2 business days after verified withdrawal.
  - Once withdrawal is verified, new AI requests must be disabled promptly. The acknowledgement target does not permit delay of technical disablement.
- Decision effect: None. These are founder preferences for review, not an approved customer schedule, legal/privacy position, operational service level, provider authorization, production change, or authority to process real customer data.
- Conditions: Explicit founder approval, qualified legal/privacy approval, operational approval of the acknowledgement target and withdrawal workflow, final document-scope approval, aligned customer documents, production deployment evidence, synthetic rehearsal, and the remaining `AI-001` acceptance criteria are still required.
- Evidence: Founder instruction recorded in the 2026-11-07 Codex session, [P0-05 founder decision package](carbonlite-p0-05-founder-decisions.md), and [customer AI schedule review draft](review/carbonlite-ai-processing-schedule-customer-draft.md).
- Supersedes / superseded by: None; expands the pending preferences under `DEC-PENDING-004` without approving them
- Recorded by: Codex session

## Release Evidence Note — 2026-11-08 (Non-decision)

The locally reviewed application candidates are frontend `ecd58a7e522a3756680cc6dd92183871eb3690df` and backend `6ffd2a62479c3a11ff25522178c85f8ed7e3c015`. The later frontend commit `05789a1` adds repository agent instructions only. This evidence does not approve deployment, provider configuration, production migration, factor use, AI processing, or real-data operation. `DEC-PENDING-004` remains `PENDING`, `FDR-2026-003` remains `PENDING_FOUNDER_APPROVAL`, `AI-001` remains `READY_FOR_REVIEW`, `FAC-001` remains `NOT_STARTED`, and the real-data pilot remains **NO-GO**.

## Current Control State

The Master TODO records the real-data pilot as **NO-GO** while P0 gates remain open. This is a safety control state, not an inferred approved business decision. Synthetic-only activities remain limited by their task prerequisites, documented scope, and STOP conditions.

## Append-Only Decision Entry Template

Copy this template below the current register when explicit evidence exists:

```text
### DEC-YYYY-NNN — Short title

- Status: PENDING | APPROVED | REJECTED | SUPERSEDED
- Authority: Full name and role
- Decided at: YYYY-MM-DD HH:MM TZ
- Effective at: YYYY-MM-DD HH:MM TZ
- Related tasks: TASK-001, TASK-002
- Scope: Exact systems, organizations, data, and duration covered
- Decision: Exact approved or rejected statement
- Conditions / expiry: Preconditions, limits, review date, or none
- Evidence: Repository path, signed record, meeting record, or other durable reference
- Supersedes / superseded by: Decision ID or none
- Recorded by: Full name or agent/session identifier
- Recorded at: YYYY-MM-DD HH:MM TZ
```

Do not use this template to manufacture an approval. Leave a proposed decision `PENDING` until the required authority and evidence are present.
