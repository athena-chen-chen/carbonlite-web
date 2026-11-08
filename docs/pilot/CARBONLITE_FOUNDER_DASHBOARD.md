# CarbonLite Founder Dashboard

This is a concise operating summary. `CARBONLITE_MASTER_TODO.md` remains authoritative for task IDs, priorities, statuses, dependencies, dates, acceptance criteria, and evidence. `CARBONLITE_DECISION_LOG.md` is authoritative only for explicitly authorized decisions. If this dashboard conflicts with either source, use the relevant authoritative source and correct this summary.

## 1. Current Week Objectives

1. Prepare the synthetic-only pilot demonstration path (`DEM-001`, `DEM-003`, `DEM-005`) without using real customer data.
2. Obtain or document the pending owner decisions that gate pilot work (`OWN-001`, `COM-002`, `RET-002`, `LGL-002`, `AI-001`, `AWS-002`, `FAC-001`).
3. Assemble release and provider evidence (`REL-001`, `INF-001`, `IAM-001`) without deploying or changing provider configuration.
4. Keep the real-data pilot at **NO-GO** until every P0 acceptance criterion is closed with the required evidence and authority.

These are current planning objectives, not evidence of completion or approval.

## 2. Daily Top 3 Priorities

| Order | Workstream | Task | Current status | Today's intended outcome |
|---:|---|---|---|---|
| 1 | Founder decision | `OWN-001` | `IN_PROGRESS` | Complete or reject the proposed Independent Business Reviewer appointment: verify identity, sign the restricted appointment, resolve the family-relationship conflict disclosure, complete training, provision an individual identity, and keep the role inactive until every gate passes. |
| 2 | Engineering outcome | `REL-001` | `IN_PROGRESS` | Complete the evidence package needed to freeze candidate application SHAs and migration evidence; no deployment. |
| 3 | Sales/customer action | `DEM-002` | `NOT_STARTED` | Build a ranked shortlist of 10–20 prospective pilot organizations with an owner and next action, using no customer-confidential data and recording no unverified commitment as fact. |

## 3. Product & Engineering

| Area | Tracker evidence | Highest demonstrated level | Remaining boundary |
|---|---|---|---|
| Security, quotas, legal holds, deletion, and recovery controls | `SEC-001`, `QUO-001`, `LGL-001`, `DEL-001`, `REC-001` through `REC-004` are `DONE`. P0-01 recorded 44 focused unit and 12 focused PostgreSQL E2E passes. P0-02 added a manual deletion-request package, an expanded synthetic register, 24 focused unit passes, and 12 focused PostgreSQL E2E passes. P0-03 recorded a bounded organization-erasure rehearsal with 24 focused unit and 12 PostgreSQL E2E passes; `DAT-002` is `IN_PROGRESS`, while `LGL-002` and `DEL-002` remain `READY_FOR_REVIEW`. | `LOCAL_TESTED` | Named independent roles, technical two-person erasure approval, a dedicated active-file workspace-erasure E2E case, legal/privacy approval, human operational rehearsal, provider bypass controls, backup-expiry proof, production deployment, and operational approval are not established. |
| Independent backup design and AWS preparation | `BAK-001` and `AWS-001` are `DONE` as documentation/offline preparation. | `LOCAL_CODE_COMPLETE` | `AWS-002` approval, AWS setup, paired capture, and provider rehearsal remain open. |
| Commercial and communications preparation | `COM-001` is `DONE` as a local documentation package. `FDR-2026-001` records the preferred commercial proposal and `FDR-2026-002` records a 30-day active-system deletion-completion preference; both are `PENDING_FOUNDER_APPROVAL`. The RET-002 feasibility review passed 24 focused local unit tests. | `LOCAL_TESTED` for focused deletion controls; documentation otherwise `LOCAL_CODE_COMPLETE` | Neither preference is approved policy. The 30-day customer commitment is **NO-GO** pending exact clock/coverage, roles, Legal Hold and exception wording, quarantine purge, external/provider coverage, production evidence, operational rehearsal, and separate audit/backup decisions. |
| AI provider and customer authorization | `AI-001` is `READY_FOR_REVIEW`. The default-deny organization gate and separate global gate are locally implemented; 82 focused unit and 2 focused PostgreSQL E2E tests passed with zero mocked OpenAI calls on denial. `FDR-2026-003` records the proposed document scope, withdrawal channel, 2-business-day acknowledgement target, and prompt disablement after verified withdrawal as `PENDING_FOUNDER_APPROVAL`. | `LOCAL_TESTED`; the new preference record is documentation-only and is not `PROVIDER_VERIFIED`, `PRODUCTION_DEPLOYED`, or `OPERATIONALLY_APPROVED` | Real-data AI is **NO-GO**. Founder, legal/privacy, and operational approvals; exact provider terms/configuration; approved schedule/version; customer election; retention; production deployment/configuration; and rehearsal remain open. |
| Release evidence | `REL-001` is `IN_PROGRESS`. Reviewed application candidates are frontend `ecd58a7e522a3756680cc6dd92183871eb3690df` and backend `6ffd2a62479c3a11ff25522178c85f8ed7e3c015`. The frontend candidate passed typecheck, pilot build, 156 focused tests, and 1/1 browser smoke; a fresh committed archive passed typecheck and pilot build. The manifest records both lockfile hashes, the 59-file committed migration inventory digest, the schema hash/static validation, and dirty-file disposition. The later frontend `05789a1` commit is documentation-only. `REL-002` through `REL-004` remain blocked. | `LOCAL_TESTED` for the recorded frontend candidate and focused backend checks | Schema replay drift, target applied/unapplied migration evidence, final operator fields, independent review, provider verification, and production deployment remain open. |
| Paired backup implementation | `BAK-002` is `NOT_STARTED`. | Not demonstrated | Independent capture, verification, rehearsal, expiry, and evidence remain required. |
| Independent business review | `OWN-001` is `IN_PROGRESS`; a founder-related candidate has verbally indicated willingness and a public-safe appointment/checklist/guide package exists. | `LOCAL_CODE_COMPLETE` documentation only | Legal name and identity, formal appointment, conflict disposition, training, restricted evidence store, individual access, operational approval, and workspace-erasure two-person enforcement remain pending. This is internal separation only, not external/legal independence. |

## 4. Paid Pilot Readiness

| Measure | Current value | Meaning |
|---|---:|---|
| Master tasks | 78 | Authoritative tracker inventory. |
| Tasks marked `DONE` | 13 | Completion is limited to each task's recorded acceptance evidence. |
| Open P0 launch gates | 32 | Must be resolved or explicitly dispositioned by the authorized owner before real-data acceptance. |
| Production-ready organizations | 0 | No organization is recorded as approved for real-data operation. |
| Real-data pilot | **NO-GO** | Local success is not provider verification, production deployment, or operational approval. |

Evidence boundaries:

- `LOCAL_CODE_COMPLETE`: implementation or documentation exists locally.
- `LOCAL_TESTED`: relevant local checks passed.
- `PROVIDER_VERIFIED`: provider state was directly verified and recorded.
- `PRODUCTION_DEPLOYED`: the approved artifact was deployed and verified in production.
- `OPERATIONALLY_APPROVED`: an authorized owner accepted the operational and policy gates.

No current dashboard evidence establishes the last three levels for the real-data pilot.

## 5. Sales Pipeline

Repository evidence does not establish a verified pipeline count, prospect list, revenue forecast, signed pilot, or customer commitment. Those values remain **UNKNOWN** and must not be guessed.

| Task | Status | Next evidence needed |
|---|---|---|
| `DEM-002` | `NOT_STARTED` | Ranked 10–20 prospect shortlist with fit, contact, sector, likely data sources, owner, and next action; no customer-confidential data. |
| `DEM-006` | `NOT_STARTED` | Approved synthetic demo execution plan and evidence format. |
| `CUS-001` | `BLOCKED` | Named customer/onboarding authority, approved commercial terms, and closed prerequisite gates. |

## 6. Customer Feedback

No completed customer interview, verified feedback record, or approved product commitment is evidenced in the repository. Customer feedback therefore remains **UNKNOWN / PENDING COLLECTION**.

- `DEM-007` is `READY_FOR_REVIEW`; this does not prove that customer feedback was collected.
- `DEM-008` is `NOT_STARTED`; findings must be linked to dated evidence before they affect product commitments or task status.
- Synthetic observations must be labeled synthetic and kept separate from actual customer statements.

## 7. Founder Decisions

The following decisions are pending. The Decision Log contains no approved value for them:

| Task | Decision required | Current tracker status |
|---|---|---|
| `OWN-001` | Complete or reject the proposed founder-related Independent Business Reviewer appointment and assign all remaining accountable roles. Verbal willingness is not appointment or approval. | `IN_PROGRESS` |
| `COM-002` | Review `FDR-2026-001`: CAD 199 plus applicable taxes for 4 weeks / 28 calendar days, 20 eligible documents, 1 organization, 2 named users, 1 reviewed PDF/CSV reporting package, 1 revision round, and 1 feedback session. The proposal is `PENDING_FOUNDER_APPROVAL`, not approved policy. | `READY_FOR_REVIEW` |
| `RET-002` | Review `FDR-2026-002`: proposed completion of covered active-system deletion within 30 calendar days after paid-pilot end. Audit and backup retention remain undecided; commitment remains **NO-GO**. | `READY_FOR_REVIEW` |
| `LGL-002` | Approve, reject, or revise Legal Hold authority, RACI, release separation, evidence custody, and bypass controls. | `READY_FOR_REVIEW` |
| `DEL-002` | Assign separated deletion-request roles and approve, reject, or revise intake, verification, execution, backup-expiry, evidence, and customer-communication procedures. | `READY_FOR_REVIEW` |
| `AI-001` | Review `FDR-2026-003` and the DPA/consent package. Proposed scope is electricity bills, natural gas bills, fuel purchase invoices, and other specifically approved energy or activity records. Proposed withdrawal uses `carbonliteai@gmail.com`, acknowledgement within 2 business days after verification, and prompt technical disablement that must not wait for acknowledgement. All items remain `PENDING_FOUNDER_APPROVAL`. | `READY_FOR_REVIEW` |
| `AWS-002` | Approve or reject the proposed AWS backup-account and S3 setup. | `READY_FOR_REVIEW` |
| `FAC-001` | Approve the production factor/methodology allowlist and governance boundary. | `NOT_STARTED` |
| `GOV-001` | Make the final real-data pilot go/no-go decision after all prerequisite evidence exists. | `BLOCKED` |

## 8. Risks & Blockers

- The 16-day immutable-retention and expiry proof may delay the earliest conditional launch window.
- Legal, privacy, retention, deletion, and AI-processing decisions are not operationally approved.
- Candidate application SHAs are recorded locally. Lockfile hashes, migration inventory/checksums, Prisma drift evidence, independent review, deployment state, and rollback evidence remain incomplete or unverified.
- Provider configuration, access inventory, monitoring, and independent backup controls are not fully verified.
- Founder-provided AI-assisted OpenAI Support guidance says self-service API use generally follows Business Terms and online acceptance, a separately signed DPA is not assumed, default abuse-monitoring retention may be up to 30 days, and ZDR/MAM require separate approval. It is support guidance, not legal advice or account-specific certification. Current official API data controls independently support the retention/ZDR boundary. Organization display name, CarbonLite Project, Billing Preferences company name, Global geography, three disabled voluntary data-sharing settings, and Render key-suffix alignment are `OWNER_REPORTED` only. Actual payment/invoice evidence, accepted Business Terms or other agreement, DPA applicability/incorporation, current subprocessor details, ZDR/MAM, key custody, and production configuration remain unverified; `store:false` is not Zero Data Retention.
- Independent external recovery authority, paired backup capture, expiry reconciliation, and isolated provider rehearsal are not operational.
- Founder concentration remains a material authority and continuity risk. A founder-related business-review candidate is proposed, but formal appointment, conflict disposition, training, protected evidence access, backup coverage, and other independent/legal roles remain open.
- Workspace erasure requires platform-admin authority and exact confirmations but does not technically enforce an independently signed second-person approval bound to the operation.
- Recoverable quarantine remains on application-managed storage until a separate reviewed purge; a quarantine move alone cannot satisfy the proposed active-system completion deadline.
- Temporary crash leftovers, external/provider artifacts, audit-evidence expiry, and backup expiry lack complete approved controls, owners, and production evidence for a 30-day commitment.
- The 1 GB Render persistent disk requires explicit capacity monitoring, alerting, and runbook evidence.
- Factor/methodology allowlisting and customer-specific procurement/security requirements remain open.

## 9. Weekly Review

This dashboard is the initial operating baseline; no completed weekly review is claimed.

At the weekly review:

1. Reconcile every displayed status and count against the Master TODO and Excel tracker.
2. Review open P0 tasks, dependencies, owners, evidence, and dates.
3. Review sales and customer-feedback evidence without inventing activity or commitments.
4. Record only explicitly authorized decisions in the Decision Log.
5. Select the next week's objectives and daily Top 3, including one sales/customer action, one engineering outcome, and one founder decision where applicable.
6. Reconfirm the pilot go/no-go state and explicit STOP conditions.

## 10. Next Actions

The current Top 10 from the Master TODO are:

1. `OWN-001` — assign owners and independent identities.
2. `COM-002` — decide pilot price, scope, limits, and support.
3. `RET-002` — decide retention, deletion, legal-hold, and expiry policy.
4. `AI-001` — decide the AI boundary and fallback.
5. `AWS-002` — approve or reject the AWS proposal.
6. `INF-001` — collect provider configuration and health evidence.
7. `FAC-001` — establish the factor/methodology allowlist.
8. `IAM-001` — complete the provider and application access inventory.
9. `REL-001` — freeze release SHAs and migration evidence.
10. `BAK-002` — implement the paired backup capture after prerequisites and approval.

## 11. Last Updated / Evidence

- Last updated: **2026-11-08 17:14 America/Edmonton**.
- Authoritative task source: [`CARBONLITE_MASTER_TODO.md`](./CARBONLITE_MASTER_TODO.md).
- Workbook mirror: [`CarbonLite_Pilot_Task_Tracker.xlsx`](./CarbonLite_Pilot_Task_Tracker.xlsx).
- Decision authority record: [`CARBONLITE_DECISION_LOG.md`](./CARBONLITE_DECISION_LOG.md).
- Tracker maintenance rules: [`carbonlite-task-tracker-maintenance.md`](./carbonlite-task-tracker-maintenance.md).
- Source evidence is repository-local unless the Master TODO explicitly records a stronger level.
- Release evidence: frontend application candidate `ecd58a7e522a3756680cc6dd92183871eb3690df`; frontend documentation-only agent-instruction commit `05789a1`; backend candidate `6ffd2a62479c3a11ff25522178c85f8ed7e3c015`. The fresh fail-closed combined factor baseline is 4 included / 1 tracked / 9 review rows and 1333.74 kgCO2e; the 4280 km air-travel row remains excluded by `UNIT_MISMATCH`, and `FAC-001` remains `NOT_STARTED`.
- P0-01 evidence: [`carbonlite-p0-01-legal-hold-readiness-report.md`](./carbonlite-p0-01-legal-hold-readiness-report.md).
- P0-02 evidence: [`carbonlite-p0-02-deletion-request-readiness-report.md`](./carbonlite-p0-02-deletion-request-readiness-report.md).
- P0-03 evidence: [`carbonlite-p0-03-organization-erasure-readiness-report.md`](./carbonlite-p0-03-organization-erasure-readiness-report.md).
- AI-001 evidence: [`CARBONLITE_DECISION_LOG.md#fdr-2026-003--ai-document-scope-and-withdrawal-preference`](./CARBONLITE_DECISION_LOG.md#fdr-2026-003--ai-document-scope-and-withdrawal-preference), [`carbonlite-p0-05-founder-decisions.md`](./carbonlite-p0-05-founder-decisions.md), [`carbonlite-ai-001-dpa-consent-approval-package.md`](./carbonlite-ai-001-dpa-consent-approval-package.md), [`review/carbonlite-openai-dpa-review.md`](./review/carbonlite-openai-dpa-review.md), [`review/carbonlite-ai-processing-schedule-draft.md`](./review/carbonlite-ai-processing-schedule-draft.md), [`review/carbonlite-ai-processing-schedule-customer-draft.md`](./review/carbonlite-ai-processing-schedule-customer-draft.md), [`review/carbonlite-ai-consent-alignment-review.md`](./review/carbonlite-ai-consent-alignment-review.md), and [`carbonlite-ai-001-consent-gate-implementation.md`](./carbonlite-ai-001-consent-gate-implementation.md). `FDR-2026-003` records the proposed document scope and withdrawal handling as `PENDING_FOUNDER_APPROVAL`; `DEC-PENDING-004` remains `PENDING`. `AI-001` remains `READY_FOR_REVIEW`; `COM-003` remains `BLOCKED`; no customer-facing document was published, no AI setting was activated, and real-data AI remains **NO-GO**.
- Independent reviewer preparation: [`carbonlite-independent-reviewer-appointment.md`](./carbonlite-independent-reviewer-appointment.md), [`carbonlite-independent-reviewer-checklist.md`](./carbonlite-independent-reviewer-checklist.md), and [`carbonlite-independent-reviewer-quick-guide.md`](./carbonlite-independent-reviewer-quick-guide.md).
- `FDR-2026-001` records the founder's preferred commercial proposal as `PENDING_FOUNDER_APPROVAL` and reconciles it to pending decision `DEC-PENDING-002`. `COM-002` and `RET-002` remain `READY_FOR_REVIEW`; `COM-003` remains `BLOCKED`; no Decision Log approval status changed. This preference does not establish legal/privacy authority, approval, provider verification, deployment, operational authorization, or real-data pilot readiness.
- `FDR-2026-002` records a pending 30-day active-system deletion-completion preference and reconciles it to `DEC-PENDING-003`. The feasibility review found a conditional manual path for continued synthetic rehearsal but a **NO-GO** for customer commitment. Audit-record and backup retention remain undecided. `RET-002` remains `READY_FOR_REVIEW`, all formal approval fields remain `PENDING`, and no production or provider evidence is claimed.
- `FDR-2026-003` records the pending AI document-scope and withdrawal preferences under existing decision `DEC-PENDING-004`. It remains `PENDING_FOUNDER_APPROVAL`; the 2-business-day target does not permit delayed technical disablement after verification. No approval, publication, activation, deployment, or real-data authorization is recorded.
