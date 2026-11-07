# CarbonLite Deletion Request Runbook

**Status:** Draft for owner and legal/privacy review. Not approved for operational or real-customer use.

**Prepared:** November 6, 2026

**Master TODO:** `DEL-002`

**Scope:** Manual-first deletion-request operations for 1–3 invitation-only paid-pilot organizations

This runbook coordinates the existing local deletion controls. It does not authorize a deletion, approve a deadline, change retention policy, or prove production deployment. Real customer data remains **NO-GO**.

## 1. Required systems and records

- Use the **Deletion Requests** worksheet in `CarbonLite_Paid_Pilot_Retention_Register.xlsx` as the minimized operating register.
- Use an approved restricted case store for request messages, identity/authority evidence, legal analysis, approvals, and customer correspondence. The register contains only opaque references.
- Use PostgreSQL Legal Holds and the guarded application workflows as the local technical controls. The workbook is not an enforcement system.
- Use the deletion-intent register, private `.quarantine`, and storage reconciliation for recoverable source deletion.
- Use paired-backup and external hold/deletion authority records when implemented. Neon, Render, or the restored application must not be the sole authority for completed deletion.

Do not record customer source content, identity documents, privileged narratives, credentials, tokens, full database URLs, or unminimized request messages in the workbook.

## 2. STOP conditions

Do not execute deletion when any of these conditions applies:

- requester identity or organization authority is not verified through an approved channel;
- the organization, resource, environment, or scope is ambiguous;
- a Legal Hold is active, pending, or cannot be checked;
- a contract, accounting-preservation, dispute, audit, or legal exception is unresolved;
- the Assigned Owner, Technical Operator, or Independent Reviewer is missing;
- the Technical Operator would approve their own destructive action;
- exact document IDs or the workspace dry-run inventory do not match the approved request;
- an unsupported external artifact exists;
- storage reconciliation reports an unexplained inconsistency;
- backup survival, expiry, or post-restore reconciliation is unknown;
- the action would use direct SQL, broad filesystem deletion, an ad hoc script, or provider controls instead of the supported workflow; or
- production/staging access, real customer data, a permanent purge, or a provider operation has not been separately authorized.

Set the register status to the narrowest accurate blocked or pending state, assign an escalation owner, and notify the requester using approved wording. An approaching deadline is not authority to continue.

## 3. Request lifecycle

| Stage | Required action | Register outcome | Exit evidence |
| --- | --- | --- | --- |
| Intake | Receive through an approved channel, create opaque `DR-...` ID, record UTC receipt, organization, channel, and restricted requester reference. | `Intake` | Case reference and receipt timestamp |
| Identity | Verify the person through a known contact or approved out-of-band method. Do not accept email possession alone. | `Pending verification`, `Rejected`, or continue | Verifier, date, method category, restricted evidence reference |
| Authority | Confirm authority for the exact organization and requested scope. Knowing an Organization ID is insufficient. | `Pending verification`, `Rejected`, or continue | Authority source and decision reference |
| Classification | Select the narrowest supported scope and clarify exclusions. | `Pending scope clarification` or continue | Approved scope statement and target IDs/reference |
| Hold/exception review | Check active and pending Legal Holds, contract retention, confirmed-record preservation, disputes, audits, and legal requirements. | `Hold review`, `BLOCKED`, or continue | Hold/exception status, reviewer, date, opaque reference |
| Inventory | Identify active data, managed files, drafts/extractions, confirmed records, reports/artifacts, evidence, subprocessors, and recovery points. | `Awaiting independent approval` | Exact minimized inventory and backup-expiry reference |
| Approval | Assigned Owner prepares the packet. Independent Reviewer approves or rejects. Approval expires if target, scope, environment, hold, or inventory changes. | `Scheduled`, `Rejected`, or pending | Reviewer identity, timestamp, exact approval reference |
| Execution | Technical Operator uses only the authorized application workflow. | `In progress` | Operator, environment, start time, request/approval references |
| Verification | Verify active-system result, retained exceptions, tenant isolation, evidence, and failure state. | `Active-system complete`, `Backup expiry pending`, or `Failed - escalation required` | Post-action checks and checksum/reference |
| Communication | Send accurate completion, delay, or exception notice. | Status unchanged | Notification date and restricted correspondence reference |
| Closure | Close only after required active-system checks and the approved backup milestone. | `Complete` | Closure date, evidence reference, retained exceptions, expiry verification |

## 4. Scope classification

| Request scope | Supported action and effect | Mandatory caution |
| --- | --- | --- |
| Individual source document | Authenticated tenant-scoped document deletion moves source bytes to recoverable quarantine, deletes the document row, and cascades extraction/review drafts. | Confirmed `ActivityData` and copied provenance remain by design. Do not claim they were deleted. |
| Draft/extraction data | Delete through the supported parent document or another specifically supported workflow. | Do not invent direct SQL cleanup. Confirm whether a source or confirmed record must remain. |
| Confirmed accounting records | Use only an approved activity-record workflow after the contract/retention decision. | Source-document deletion does not remove these records. |
| Entire organization/workspace | Platform-admin dry run, exact ID and slug confirmation, fresh independent approval, then supported workspace erasure. | Unsupported external artifacts, Legal Holds, or unreconciled inventory block execution. |
| Account/contact data | Apply the approved deactivation, shared-user, membership, session, and account-retention rules. | No complete approved account-erasure rule is currently evidenced. Escalate. |
| Other supported scope | Document the exact supported adapter and acceptance checks before approval. | Unrecognized or ambiguous scope blocks deletion. |

## 5. Verification and authority

The intake verifier must record only the method category and restricted evidence reference. Acceptable evidence may include confirmation through a previously registered organization contact, an authorized contract contact, or another approved out-of-band method. An ordinary inbound email, a matching display name, or knowledge of an Organization ID is not sufficient.

The approval packet must contain:

- request ID, organization ID, exact target IDs or dry-run inventory;
- identity and authority verification references;
- approved scope and expected retained data;
- Legal Hold and contract/legal exception results;
- customer export/notice status;
- Technical Operator and different Independent Reviewer;
- exact environment and supported method;
- pre-action counts/hashes and storage reconciliation result;
- affected recovery pairs and expected backup expiry;
- verification, retry, customer-communication, and evidence plans; and
- approval expiry conditions.

Unassigned independent review blocks execution. The requester cannot approve solely because they requested the action. The Technical Operator cannot approve their own action.

## 6. Proposed responsibilities and RACI

R = Responsible, A = Accountable, C = Consulted, I = Informed. Every assignment below remains proposed until a dated owner decision records a real identity and backup.

| Activity | Request Intake Owner | Business/Privacy Decision Owner | Technical Operator | Independent Reviewer | Legal/Privacy Advisor | Backup/Reconciliation Owner |
| --- | --- | --- | --- | --- | --- | --- |
| Intake and request ID | R | A | I | I | C | I |
| Identity/authority verification | R | A | I | C | C | I |
| Scope and retention decision | C | A | C | C | C | C |
| Legal Hold/exception decision | I | C | I | C | A/R | C |
| Inventory and execution plan | C | A | R | C | C | C |
| Independent destructive approval | I | I | C | A/R | C | C |
| Technical execution and verification | I | A | R | C | I | C |
| Backup expiry and post-restore reconciliation | I | C | C | A | C | R |
| Customer notice and closure | R | A | C | C | C | C |

Proposed founder-led operating model for review only:

- Founder: Request Intake Owner and Business Decision Owner, subject to legal/privacy decisions outside founder authority.
- Founder: Technical Operator where least-privilege access and a different Independent Reviewer are established.
- Independent Reviewer: proposed founder-related Independent Business Reviewer candidate; verbal willingness reported, but legal name is withheld from the repository and formal appointment, identity verification, conflict disposition, training, access, and operational approval remain `PENDING`. The candidate cannot be the operator or substitute for qualified legal/privacy authority. This provides only proposed internal separation, not presumed external/legal independence.
- Legal/Privacy Advisor: unassigned qualified reviewer; founder cannot self-designate as legal approver.
- Backup/Reconciliation Owner: unassigned infrastructure/recovery operator; cannot alone authorize customer access after restore.

Each primary role needs a named backup with separately issued access, dated delegation, and the same separation boundary. Absence of an independent reviewer or legal/privacy authority does not permit role consolidation; it blocks execution.

## 7. Proposed deadlines and escalation

These are internal review targets only. They are not approved contractual commitments or a conclusion about legal sufficiency.

| Milestone | Proposed target | Trigger |
| --- | --- | --- |
| Acknowledge request | Within 2 business days | Recorded receipt through an approved channel |
| Verify identity/authority or send status | Within 5 business days | Recorded receipt |
| Active-system deletion | Within 30 calendar days | Later of verified request and applicable hold/contract/legal clearance, subject to valid independent approval |
| Backup expiry | Approved and verified backup schedule | Active-system completion plus identification of every applicable recovery point |

Business days mean Monday through Friday in the approved operating time zone, excluding holidays only when an approved holiday calendar is maintained. Until then, calculate manually and have the Assigned Owner verify the date. Record both the trigger and Due Date; do not silently extend a date because staffing or approval is missing.

Escalation rules:

- At 1 business day before acknowledgement or verification due: notify Assigned Owner.
- On a missed milestone: set an overdue status, notify Business/Privacy Decision Owner and Independent Reviewer, record cause and next update.
- At 5 calendar days before the active-system target: require a documented execution or delay plan.
- On Legal Hold or legal/contract exception: set `BLOCKED`, reference only the opaque case, and use legal-approved customer wording.
- On failed or partial deletion: set `Failed - escalation required`; notify Technical, Privacy, Security/Incident, and Backup/Reconciliation owners; never mark complete.
- When delayed: give the customer an approved status update that states what is known, what remains, and the next update date without promising unsupported deletion.

## 8. Authorized execution and verification

### Source document

1. Reconfirm tenant, document ID, approved scope, hold result, operator, reviewer, and environment.
2. Record existing extraction/review and confirmed-record counts without content.
3. Use the authenticated document-deletion action.
4. Verify the document is absent from active listing/download, its source bytes are in private quarantine, extraction/review drafts are removed, and intended confirmed records remain.
5. Record deletion-intent ID, result, minimized audit reference, and affected backups. Do not permanently purge as part of request completion.

### Workspace

1. Require a platform-admin operator outside the target workspace.
2. Run the protected dry run and reconcile every reported class, managed file, report artifact, and known provider copy.
3. Reconfirm exact organization ID and slug. Obtain fresh independent approval against the reconciled inventory.
4. Use the protected workspace-erasure workflow only.
5. Verify target active data is inaccessible, unrelated tenants are unchanged, managed bytes are quarantined, unsupported artifacts are absent, and minimized erasure evidence remains.

### Failure

- Storage failure before database deletion: retain database data, preserve the intent, and retry only after review.
- Database failure after quarantine movement: preserve `PREPARED` and quarantine evidence; retry idempotently or reconcile.
- Missing/inconsistent bytes: stop and set reconciliation required.
- Unsupported external artifact: stop; no workspace completion claim.
- Suspected wrong tenant or target: stop immediately and initiate incident review.

## 9. Evidence and customer communication

Minimized evidence must include request ID, target identifiers, verification references, hold/exception decision, operator/reviewer, pre/post counts, operation result, failures/retries, backup pair/expiry references, notification date, closure date, and restricted evidence checksum/reference. It must not reproduce deleted content.

Use `carbonlite-deletion-request-templates.md`. A completion notice must distinguish active-system completion from quarantine, backup survival, provider deletion, and evidence retention. Do not say “all data is permanently deleted” unless each relevant store and exception was independently verified under an approved policy.

## 10. Backup expiry and post-restore reconciliation

1. List every paired recovery point created before active-system deletion that expires afterward.
2. Record pair ID, provider, immutable/manual state, retention rule, expected expiry, and owner.
3. Keep the request `Backup expiry pending` unless the approved closure rule permits earlier case closure with a documented outstanding expiry milestone.
4. Verify expiry or authorized destruction independently. Do not infer it from a lifecycle proposal.
5. Before restored data is exposed, compare the recovery-point time with the external deletion/hold ledger, reapply later approved deletions, run storage reconciliation, and obtain independent review.
6. A restore that reintroduces deleted data remains isolated and is an escalation condition.

## 11. Closure checklist

- [ ] Approved channel, receipt timestamp, request ID, organization, and requester reference recorded.
- [ ] Identity and exact organization authority verified.
- [ ] Scope is unambiguous and supported.
- [ ] Legal Hold and contract/legal exceptions cleared or accurately blocked.
- [ ] Assigned Owner, Technical Operator, and different Independent Reviewer recorded.
- [ ] Exact inventory and recovery-point impact reconciled.
- [ ] Approval binds the current target, environment, inventory, and evidence.
- [ ] Supported action completed or accurate failure state recorded.
- [ ] Active-system verification passed and retained data is explained.
- [ ] Backup expiry milestone recorded and handled under the approved closure rule.
- [ ] Customer received accurate approved wording.
- [ ] Minimized evidence reference and closure date recorded.

## 12. Current limitations

- The application has no deletion-request case model or automatic deadline scheduler; the process is manual.
- Owner, legal/privacy, independent reviewer, and backup/reconciliation assignments remain unapproved. A founder-related business-review candidate has been identified, but verbal willingness and prepared documents do not activate or appoint the role.
- Retention, backup-survival, evidence-retention, and customer-language decisions remain pending.
- Local technical controls are not proved deployed in production.
- Direct provider, SQL, shell, filesystem, and lifecycle-rule bypass controls are unverified.
- Independent paired backups, external non-rollback deletion authority, provider expiry proof, and isolated provider rehearsal remain incomplete.
- No complete approved account/contact deletion workflow or external artifact adapter is evidenced.

These limits keep operational use, production deletion, and the real-data pilot at **NO-GO**.
