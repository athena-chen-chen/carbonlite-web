# CarbonLite Retention and Controlled Paid-Pilot Owner Approval Checklist

**Package status:** Prepared for review. No approval is recorded.
**Checklist version:** v1-review
**Prepared:** November 5, 2026
**Policy effective date:** ____________________
**Agreement effective date:** ____________________
**Next policy review:** ____________________

Use this checklist with:

- `carbonlite-paid-pilot-data-retention-policy-v1-review.md`;
- `carbonlite-controlled-paid-pilot-agreement-draft.md`;
- `carbonlite-privacy-terms-alignment-proposal.md`;
- `carbonlite-paid-pilot-data-retention-policy.md`;
- `CarbonLite_Paid_Pilot_Retention_Register.xlsx`;
- `carbonlite-retention-manual-runbook.md`;
- the backend `docs/paid-pilot-recovery.md` and `docs/workspace-erasure.md`; and
- the Phase 3A/3B readiness, factor-governance, and reporting evidence cited by the review drafts.

Do not mark a row approved merely because the recommendation is acceptable in principle. Approval requires the named decision maker, legal/privacy disposition, required evidence, effective date, and corresponding register update. This checklist does not authorize deletion or real customer data.

## 1. Decision checklist

### PD-SYN-001 — Original source-document retention

- **Current proposal:** Active-system deletion at approved pilot end plus 30 calendar days.
- **Recommended approval wording:** “Approve active-system deletion of original source documents 30 calendar days after the customer-specific approved pilot end, subject to a valid legal hold, executed-contract exception, verified supported deletion, minimized evidence retention, and disclosed backup expiry.”
- **Current status:** `PENDING_OWNER`
- **Business owner:** Required — signature/initial: ____________________ date: ____________________
- **Legal/privacy reviewer:** Required — signature/initial: ____________________ date: ____________________
- **Infrastructure/operations consultation:** Required — reviewer: ____________________ date: ____________________
- **Evidence required:** authoritative pilot-end field; authenticated deletion test; source/extraction/confirmed-record effect; backup mapping and expiry; customer wording.
- **Evidence references:** Register `Policy Decisions`/`RS-SYN-001`; existing policy §§5–6; runbook §§7–12; workspace-erasure documentation.
- **Open questions:** Which event controls pilot end? Can Customer extend retention? What is retained after source deletion? Can every backup be mapped to a latest expiry?
- **Effective date:** ____________________
- **Decision:** [ ] Approve  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-002 — Temporary upload files

- **Current proposal:** Immediate cleanup in normal/handled paths; 24-hour exception target from file creation.
- **Recommended approval wording:** “Approve a 24-hour internal exception target only after a tested age-based cleanup and alert control covers the exact production staging path. Do not present it as a binding customer guarantee without evidence.”
- **Current status:** `PENDING_EVIDENCE`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Infrastructure reviewer:** Required — ____________________ / ____________________
- **Evidence required:** resolved production path; crash-orphan test; automated sweeper; monitoring/alert; exception record; safe target validation.
- **Evidence references:** Register `PD-SYN-002`/`RS-SYN-002`; existing policy §7; runbook §3.2.
- **Open questions:** Is 24 hours technically achievable across restarts and provider incidents? Who receives an overdue alert? Is the weekly manual review sufficient as an interim control?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after evidence  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-003 — Confirmed records and authoritative archive

- **Current proposal:** Contract-defined; Customer is proposed as authoritative archive.
- **Recommended approval wording:** “Approve Customer as authoritative accounting archive. CarbonLite retains, exports, corrects, and deletes confirmed records and provenance only as stated in the executed agreement; no default period is inferred.”
- **Current status:** `PENDING_OWNER`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Methodology/data owner consultation:** Required — ____________________ / ____________________
- **Evidence required:** complete export definition/test; record/provenance inventory; correction/recalculation rule; statutory/contract analysis; signed Schedule B.
- **Evidence references:** Register `PD-SYN-003`/`RS-SYN-004`; existing policy §8; Terms “Data and Backups”; agreement §§8, 13 and Schedule B.
- **Open questions:** What exact package is an authoritative export? Are delivered snapshots immutable? Which records survive source deletion and for how long?
- **Effective date:** ____________________
- **Decision:** [ ] Approve  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-004 — Draft inactivity, notice, and grace

- **Current proposal:** Review after 30 inactive days; proposed 14-day notice/grace period.
- **Recommended approval wording:** “Approve inactivity as the latest approved meaningful draft event, review at 30 inactive calendar days, and provide 14 calendar days' notice before separately authorized deletion. Login alone does not reset inactivity.”
- **Current status:** `PENDING_EVIDENCE`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Technical reviewer:** Required — ____________________ / ____________________
- **Evidence required:** enumerated activity events; reliable query; notice template/delivery proof; extension and no-response rule; deletion verification.
- **Evidence references:** Register `PD-SYN-004`/`RS-SYN-003`; existing policy §7; runbook §3.2.
- **Open questions:** Which event wins when source and review rows differ? How many extensions are allowed? What happens when contact delivery fails?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after evidence  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-005 — Audit, quota, operational, and deletion-evidence periods

- **Current proposal:** Security/audit 12 months; quota/operational 90 days after period close; minimized deletion evidence 24 months after completion or final dispute closure.
- **Recommended approval wording:** “Approve these three distinct periods subject to field-level minimization, legal holds, role-restricted access, expiry controls, and verification that quota records are included in the inventory.”
- **Current status:** `PENDING_EVIDENCE`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Security/infrastructure reviewer:** Required — ____________________ / ____________________
- **Evidence required:** event taxonomy; before/after payload remediation; quota dry-run coverage; expiry job or repeatable procedure; access review; legal basis.
- **Evidence references:** Register `PD-SYN-005`, `RS-SYN-005/006/014`; existing policy §9; runbook §§10–11 and §18.
- **Open questions:** Is 12 months proportionate for the pilot? Which dispute or incident extends the trigger? Do tax/payment records belong in a separate class?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after evidence  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-006 — Offboarding and export

- **Current proposal:** 14-day export window; active-system target within 30 days after the later of verified request/termination, export expiry, and hold/contract clearance.
- **Recommended approval wording:** “Approve the trigger hierarchy, 14-day export opportunity, and qualified 30-day active-system target. Backup expiry and approved retained evidence remain separate milestones.”
- **Current status:** `PENDING_OWNER`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Operations/infrastructure reviewer:** Required — ____________________ / ____________________
- **Evidence required:** tested export; delivery/receipt process; dry-run reconciliation; artifact coverage; staffing; notification templates.
- **Evidence references:** Register `PD-SYN-006`/`RS-SYN-007`; existing policy §12; runbook §§8–14; agreement §13/Schedule B.
- **Open questions:** Does termination immediately suspend uploads/access? When does the export window start? What exception permits delay and who approves it?
- **Effective date:** ____________________
- **Decision:** [ ] Approve  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-007 — Backups, RPO/RTO, and restore authority

- **Current proposal:** 24-hour internal RPO; paired daily/pre-change recovery points; 14-day retention; maximum 30-day deleted-data survival; RTO not approved.
- **Recommended approval wording:** “Approve only after configuration and restore evidence. Do not approve a recovery guarantee. Reconcile the prior four-hour and two-business-day RTO proposals through a defined scenario and capability test before selecting either value.”
- **Current status:** `PENDING_EVIDENCE`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Infrastructure reviewer:** Required — ____________________ / ____________________
- **Evidence required:** provider plan/settings; database/document pair automation; encryption/access; independent-copy decision; expiry proof; completed restore rehearsal; post-restore deletion test; named restore authority.
- **Evidence references:** Register `PD-SYN-007` and Backup & Restore sheet; backend recovery runbook; release backup/recovery runbook; existing policy §13.
- **Open questions:** Is RPO measured from the last consistent pair? Does RTO mean restore to isolated verification or customer access? Calendar or business hours? Who declares a disaster? Can all deleted data expire within 30 days?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after evidence  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-008 — Subprocessors and cross-border processing

- **Current proposal:** Approve only the actual provider list, locations, retention/deletion, DPA, security terms, and change notice.
- **Recommended approval wording:** “Approve the verified subprocessor register and corresponding customer disclosure. A contemplated provider is not represented as active without configuration and contract evidence.”
- **Current status:** `PENDING_EVIDENCE`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Infrastructure reviewer:** Required — ____________________ / ____________________
- **Evidence required:** enabled-service inventory; contracts/DPAs; region/location; data fields; provider retention/deletion; analytics settings; material-change process.
- **Evidence references:** Privacy “How Information May Be Shared”; register `PD-SYN-008`; existing policy §14; alignment proposal.
- **Open questions:** Which of Vercel, Render, Neon, OpenAI, Sentry, PostHog, and Google Analytics are actually used for pilot data? Which countries and account settings apply?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after evidence  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-009 — Deletion-request handling

- **Current proposal:** Manual verification and two-person workflow; response and completion timing pending.
- **Recommended approval wording:** “Approve the documented identity, authority, acknowledgement, scope, hold, contract, approval, verification, exception, backup, and communication process. Adopt legal response targets only after Alberta/Canadian privacy-law review.”
- **Current status:** `PENDING_LEGAL`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Operations reviewer:** Required — ____________________ / ____________________
- **Evidence required:** request channel; acknowledgement/completion templates; restricted case store; trained verifier; legal deadline analysis; escalation process.
- **Evidence references:** Privacy “User Choices”; register `PD-SYN-009`; existing policy §§10–11; runbook §§4–14.
- **Open questions:** Which privacy statutes and contractual rights apply? What distinguishes access, correction, individual deletion, source deletion, and organization erasure? What identity evidence is proportionate?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after legal review  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-010 — Reports, exports, and artifact stores

- **Current proposal:** Backend reports follow confirmed-record retention unless shorter; customer downloads are customer-controlled.
- **Recommended approval wording:** “Approve only after every report/artifact store has an owner, retention trigger, supported deletion method, and verification. Unsupported external artifacts block a complete-erasure representation.”
- **Current status:** `PENDING_EVIDENCE`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Infrastructure/product reviewer:** Required — ____________________ / ____________________
- **Evidence required:** artifact inventory; managed/external URL handling; deletion adapter; fail-closed test; report export/package definition.
- **Evidence references:** Register `PD-SYN-010`/`RS-SYN-009`; workspace-erasure documentation; existing policy §9.
- **Open questions:** Are generated PDFs ever stored outside browser devices? Which report metadata survives? What does the customer export include?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after evidence  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-011 — AI-job payloads and provider retention

- **Current proposal:** Minimize; period not approved; retain only for approved retry/support/security/traceability needs.
- **Recommended approval wording:** “Approve field-level minimization, a defined CarbonLite expiry, verified provider terms and location, and customer authorization before real-data AI processing.”
- **Current status:** `PENDING_EVIDENCE`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Infrastructure/product reviewer:** Required — ____________________ / ____________________
- **Evidence required:** AI-job field inventory; payload minimization; expiry control; request-setting verification; provider abuse-monitoring/retention, DPA, and region evidence.
- **Evidence references:** Privacy “Uploaded Documents”; register `PD-SYN-011`/`RS-SYN-010`; existing policy §14.
- **Open questions:** Which prompts, inputs, outputs, errors, and files persist locally? What exact provider plan and retention exception applies? Is AI optional per customer/file?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after evidence  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-012 — Feedback and support records

- **Current proposal:** Case-closure period not yet selected; minimize free text.
- **Recommended approval wording:** “Approve a defined case-closure trigger, prohibited-content warning, minimized fields, access rules, and retention period before paid-pilot support intake.”
- **Current status:** `PENDING_OWNER`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Support/product consultation:** Required — ____________________ / ____________________
- **Evidence required:** case workflow; owner; closure definition; free-text controls; expiry process; privacy wording.
- **Evidence references:** Privacy “Feedback Submissions”; register `PD-SYN-012`/`RS-SYN-011`; existing policy §5.
- **Open questions:** What period is needed after closure? Which cases become security/legal records? Can attachments be submitted?
- **Effective date:** ____________________
- **Decision:** [ ] Approve  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-013 — Accounts, memberships, identity, and deactivation

- **Current proposal:** Active pilot plus approved offboarding; shared-user handling unresolved.
- **Recommended approval wording:** “Approve account/member retention, invitation-only provisioning, deactivation and session revocation, shared-user preservation, authority verification, and erasure behavior.”
- **Current status:** `PENDING_LEGAL`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Security/technical reviewer:** Required — ____________________ / ____________________
- **Evidence required:** relation map; multi-organization/shared-user cases; account disable/session tests; membership removal; public-registration restriction; privacy/contract wording.
- **Evidence references:** Privacy “Information We Collect”; Terms “Account Termination”; register `PD-SYN-013`/`RS-SYN-013`; Phase 3 findings on registration/token deactivation.
- **Open questions:** Is a person account deleted when one organization ends? How are copied/live sessions revoked? Who may request full account deletion?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after legal review  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-014 — Deletion evidence

- **Current proposal:** Minimized fields retained for proposed 24 months.
- **Recommended approval wording:** “Approve organization hash, case/decision reference, actor/approver, timestamps, counts, status, retry, and backup-expiry references only; restrict access and expire 24 months after completion or final dispute closure. Remove excessive prior-object payloads first.”
- **Current status:** `PENDING_EVIDENCE`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Security/technical reviewer:** Required — ____________________ / ____________________
- **Evidence required:** field schema; audit-payload remediation; access roles; expiry control; test showing no source/extracted/emissions payload.
- **Evidence references:** Workspace-erasure documentation; register `PD-SYN-014`/`RS-SYN-014`; existing policy §§6,9; runbook §18.
- **Open questions:** Is operator identity needed for 24 months? What dispute extends the clock? How is hash re-identification risk controlled?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after evidence  [ ] Reject  [ ] Revise  [ ] Defer

### PD-SYN-015 — Prohibited uploads and discovery response

- **Current proposal:** Use the draft policy categories; legal review required.
- **Recommended approval wording:** “Approve the prohibited categories, pre-upload and contractual notice, customer responsibility, discovery triage, access restriction, incident escalation, and authorized deletion response.”
- **Current status:** `PENDING_LEGAL`
- **Business owner:** Required — ____________________ / ____________________
- **Legal/privacy reviewer:** Required — ____________________ / ____________________
- **Security/support consultation:** Required — ____________________ / ____________________
- **Evidence required:** aligned Privacy/Terms/Agreement language; upload guidance; operator playbook; escalation contacts; deletion/hold handling.
- **Evidence references:** Existing policy §4; register `PD-SYN-015`; current Privacy and Terms; alignment proposal.
- **Open questions:** Are employee/traveller details ever essential for an approved activity? Which discovered categories require breach assessment or mandatory preservation? Is automated detection appropriate?
- **Effective date:** ____________________
- **Decision:** [ ] Approve after legal review  [ ] Reject  [ ] Revise  [ ] Defer

## 2. Commercial and agreement approvals

The retention decisions do not approve the commercial agreement. Record separate decisions:

- [ ] Proposed **four-week** term approved; owner: ____________________ date: ____________________
- [ ] Proposed **CAD $199 per organization plus applicable taxes** approved; owner/finance: ____________________ date: ____________________
- [ ] Payment, tax, cancellation, and refund rule approved; owner/legal: ____________________ / ____________________
- [ ] Seats, document/page/file-size/total-storage, AI-job, report-cycle, and support limits completed in Schedule A.
- [ ] Supported jurisdictions, activity types, units, factor allowlist, and reviewer completed in Schedule C.
- [ ] Location-based Scope 2 and **“Market-based Scope 2 not calculated”** disclosure approved.
- [ ] No certification, assurance, regulatory acceptance, availability, or recovery guarantee confirmed.
- [ ] Liability cap, carve-outs, indemnities, confidentiality, termination, governing forum, and notice terms approved by counsel.
- [ ] Privacy/data-processing roles, subprocessors, cross-border disclosure, and any DPA approved by counsel.
- [ ] Invitation-only/manual provisioning and invoicing procedure assigned and tested.

## 3. Operational readiness dependencies

Real-data authorization requires evidence for all applicable P0 gates, including:

- [ ] tenant authorization matrix and organization isolation verified for every pilot role and route;
- [ ] public self-registration restricted as intended and account deactivation/session revocation verified;
- [ ] source deletion semantics, confirmed-record survival, workspace-erasure dry run, quota coverage, and report-artifact deletion verified;
- [ ] retention owners assigned; weekly review, request, hold, two-person approval, notification, and evidence workflows rehearsed with synthetic data;
- [ ] automated or repeatable expiry/minimization controls exist for temporary files, logs, quota events, AI jobs, feedback, and deletion evidence;
- [ ] actual providers, regions, contracts/DPAs, retention/deletion settings, analytics fields, and change notice verified;
- [ ] paired database/document backup configuration, 24-hour RPO capability, 14-day retention, maximum 30-day deleted-data survival, restore authority, and post-restore re-deletion tested;
- [ ] RTO conflict resolved; neither four hours nor two business days is represented as approved before evidence;
- [ ] approved factor allowlist and methodology cover every included activity, unit, jurisdiction, period, gas basis, and provenance requirement;
- [ ] demo/synthetic/reference-only/offset/TIER/component or unsupported factors cannot enter real-customer totals;
- [ ] reports and exports preserve approved provenance and state location-based Scope 2; market-based Scope 2 is not calculated;
- [ ] Privacy, Terms, and Paid Pilot Scope are aligned, versioned, effective-dated, and tested;
- [ ] executed agreement and schedules exist for the specific customer; and
- [ ] no customer data or secrets are placed in the register, approval package, or test evidence.

## 4. Explicit open questions for owner and counsel

1. Which exact event establishes pilot end, contract termination, inactivity, case closure, period close, dispute closure, and final offboarding clearance?
2. Which Canadian privacy statutes and sector/customer obligations apply to the intended customers and data?
3. What response and completion periods apply to access, correction, individual deletion, source deletion, and workspace erasure?
4. Is Customer conclusively the authoritative accounting archive, and what export proves handoff?
5. Which support, security, legal, tax, audit, and payment records require separate classes rather than the proposed general periods?
6. Which providers are actually used, where do they process data, what contracts/settings apply, and what material-change notice is required?
7. Is AI optional, and what customer authorization and alternative workflow apply if it is declined?
8. What recovery scenario should an RTO measure, and why would four hours or two business days be achievable and proportionate?
9. Can every database, document, provider, and independent backup copy containing deleted data be proven to expire within 30 days?
10. What usage quota, supported-source formats, seats, support effort, acceptance criteria, cancellation, and refund rule make CAD $199 commercially workable?
11. Which liability cap, carve-outs, indemnities, confidentiality duration, and dispute forum are appropriate for Alberta?
12. Does the current page acknowledgement have any legal role beyond confirming the reporting limitation? It must not be treated as the agreement or real-data consent without counsel.

## 5. Approval history

| Version | Date | Decision/change | Business owner | Legal/privacy | Infrastructure/security | Effective date |
| --- | --- | --- | --- | --- | --- | --- |
| v1-review | November 5, 2026 | Approval package prepared; all 15 decisions remain pending | ____________________ | ____________________ | ____________________ | ____________________ |
| ______ | ______ | ______ | ______ | ______ | ______ | ______ |

## 6. Final sign-off

### A. Approval package readiness

**Recommendation:** `GO` for business-owner and legal/privacy review. The package is internally reviewable but contains no inferred approval.

- Business owner decision: [ ] GO  [ ] NO-GO  [ ] Return for revision
- Name/title: ____________________
- Signature: ____________________
- Date: ____________________

- Legal/privacy decision: [ ] GO  [ ] NO-GO  [ ] Return for revision
- Name/title: ____________________
- Signature: ____________________
- Date: ____________________

### B. Real-data controlled paid pilot

**Current recommendation:** `NO-GO`.

Do not authorize real customer data until every applicable P0 dependency above has evidence, all required policy/commercial decisions are approved, the customer documents are aligned, and the customer agreement is executed.

- Business owner real-data decision: [ ] GO  [ ] NO-GO
- Legal/privacy real-data decision: [ ] GO  [ ] NO-GO
- Security/infrastructure real-data decision: [ ] GO  [ ] NO-GO
- Methodology/factor reviewer real-data decision: [ ] GO  [ ] NO-GO
- Approved environment and evidence bundle: ____________________
- Customer agreement/version: ____________________
- Authorized start date: ____________________
- Signatures: ____________________ / ____________________ / ____________________ / ____________________

Blank boxes and fields are intentional. No GO is recorded by this document.
