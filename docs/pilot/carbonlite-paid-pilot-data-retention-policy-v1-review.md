# CarbonLite Paid-Pilot Data Retention Policy v1 — Review Draft

**Document status:** Draft for business-owner and legal/privacy review. Not approved.
**Version:** v1-review
**Prepared:** November 5, 2026
**Policy owner:** ____________________
**Legal/privacy reviewer:** ____________________
**Infrastructure reviewer:** ____________________
**Effective date:** ____________________
**Next review date:** ____________________

This document prepares decisions for a controlled, invitation-only pilot of one to three organizations. It is not legal advice, an executed customer commitment, proof of a security control, or evidence of compliance certification. Every period described as **proposed** remains non-binding until the required approvals and evidence are recorded. Real customer data remains **NO-GO** until the operational P0 gates identified below are closed.

## 1. Purpose and scope

This policy defines the proposed classification, retention, deletion, offboarding, backup, and evidence rules for customer and operational data in the CarbonLite paid pilot. It covers account and organization data, uploaded sources, extraction artifacts, drafts, confirmed activity and calculation records, factor provenance, reports, usage events, logs, AI jobs, support records, deletion evidence, and paired database/document backups.

Customer-downloaded files and customer-controlled systems are outside CarbonLite's deletion control. Provider-held data is governed by the verified provider configuration and contract, not by repository wording alone.

## 2. Roles

| Party or role | Proposed responsibility |
| --- | --- |
| Kach Canada Ltd. | Contracting party and proposed operator of CarbonLite. It determines purposes and operating rules for the pilot, subject to the executed agreement and applicable law. Legal review is required before assigning privacy-law roles conclusively. |
| CarbonLite | The software service and operating workflow. It is not a separate legal person. |
| Customer | Controls the content it submits, confirms authority to provide it, limits it to the agreed purpose, reviews outputs, and retains its authoritative archive unless the executed agreement states otherwise. |
| Business owner / policy owner | Approves commercial purpose, supported data, periods, exceptions, owners, resources, and effective date. |
| Legal/privacy reviewer | Reviews privacy roles, legal basis, notices, contractual periods, holds, subprocessors, cross-border processing, and rights-request handling. |
| Retention coordinator | Maintains the register and conducts the manual weekly review. This role does not receive authority to delete merely because a deadline appears in the register. |
| Request verifier | Verifies requester identity, organization, authority, channel, and scope without collecting excessive identity material. |
| Operator and independent approver | Prepare, approve, execute, and verify supported destructive operations. One person may not both approve and execute the same workspace erasure. |
| Infrastructure reviewer | Verifies actual hosting, backup, restore, access, retention, expiry, region, and provider settings without recording secrets. |

## 3. Data classifications

### 3.1 Permitted for the pilot

Only the minimum operational business records needed for the executed Schedule A may be accepted. Candidate categories are utility bills, fuel records, approved business-travel activity, shipping, waste or water records, facility information, and ordinary business contact details. Supported jurisdictions, activity types, units, reporting periods, factor allowlists, and document quota must be fixed in the executed agreement.

### 3.2 Restricted pending explicit approval

Personal information beyond ordinary business contacts, employee- or traveller-level records, payment-related records, sector-regulated information, data about minors, government or tax identifiers, bank information, and customer-designated highly sensitive information require written business-owner and legal/privacy approval before collection. No such approval is recorded by this draft.

### 3.3 Prohibited uploads

The proposed prohibited categories are credentials or secrets; payment-card or banking credentials; health, biometric, genetic, criminal, or similarly sensitive personal information; government identity documents or identifiers; employee files, payroll, resumes, or performance records; content the customer lacks authority to disclose; malware or disruptive payloads; and material unrelated to the agreed pilot. If discovered, stop routine processing, restrict access, create a minimized incident record, consult the legal/privacy reviewer, and use only an authorized deletion workflow.

## 4. Proposed retention schedule and controls

All periods below are proposals. The trigger, accountable role, current manual control, and missing evidence are part of the rule; the number alone is not a guarantee.

| Data or deadline | Proposed rule and trigger | Accountable owner | Current manual enforcement | Missing implementation or evidence |
| --- | --- | --- | --- | --- |
| Original source documents | Delete from active systems at **pilot end + 30 calendar days**. Trigger: the approved customer-specific pilot end recorded in the register. A hold, dispute, or executed contract may suspend the date. | Retention coordinator; operator; independent approver | Weekly register review followed by authenticated document deletion or approved workspace erasure. | Owner/legal approval; signed agreement; confirmed pilot-end source of truth; production workflow evidence; backup-expiry mapping. |
| Temporary upload files | Normal paths attempt immediate cleanup. Proposed exception target: remove crash/orphan files within **24 hours of file creation**. | Infrastructure owner | Metadata-only review of the exact configured staging path; exceptions are recorded and separately authorized. | Tested automated age purge; production path/configuration proof; alerting; evidence that all failure paths are covered. |
| Abandoned drafts | Review after **30 inactive calendar days**, then provide a proposed **14-day notice/grace period** before deletion. Trigger: latest approved meaningful draft event, not account login. | Retention coordinator; customer contact | Weekly candidate review, notice, response tracking, and separately approved source deletion. | Formal inactivity-event definition; reliable query/report; notice template; proof of delivery; extension rule. |
| Confirmed accounting records and provenance | Customer is the proposed authoritative archive. CarbonLite retention and deletion are governed by the executed agreement; no age-based default is approved. Trigger: contract term, verified request, or agreed offboarding event. | Policy owner and legal/privacy reviewer | Customer-specific decision in the register; export and hold review before erasure. | Executed agreement; archive responsibility; correction/deletion rule; statutory/contractual analysis; export completeness evidence. |
| Customer export window | Proposed **14 calendar days**. Trigger: later of termination notice or CarbonLite's notice that the export package is available, unless the parties record another date. | Customer contact; retention coordinator | Manual notice and register entry; operator pauses final offboarding until window and clearance checks finish. | Owner/legal approval; tested export contents; delivery method; receipt evidence; accessibility during suspension. |
| Active-system offboarding | Target completion within **30 calendar days** after the later of verified request or termination, expiration of the agreed export window, and legal/contractual clearance. | Operator and independent approver | Runbook, dry-run inventory, hold check, two-person approval, supported erasure, and independent verification. | Approved trigger; production dry-run evidence; complete artifact coverage; quota inventory gap; customer wording; trained assigned personnel. |
| Reports and exports | Browser-created PDF/CSV copies are customer-controlled. Backend report rows and managed artifacts follow the confirmed-record rule unless the executed agreement specifies a shorter period. | Policy owner; infrastructure owner | Manual artifact inventory; workspace erasure fails closed for unsupported external artifacts. | Inventory of every artifact store; supported deletion adapter; export-package validation; contract decision. |
| Security/audit events | Proposed **12 months** from event creation or case closure, whichever is later, subject to minimization, hold, and legal review. | Security/infrastructure owner | Periodic register review; organization data removed through workspace erasure where implemented. | Approved event taxonomy; payload minimization; expiry job or repeatable deletion procedure; access review; legal basis. |
| Quota/operational events | Proposed **90 days after the applicable usage period closes**. | Product/operations owner | Periodic manual review or workspace erasure. | Complete inventory; dry-run counts currently omit quota records; expiry procedure; billing/dispute need assessment. |
| AI-job metadata and payloads | Retain minimized metadata only for an approved retry, support, security, and traceability period. No period is approved. Payloads should not become a secondary archive. | Product and infrastructure owners | Periodic review and workspace erasure; OpenAI requests currently use `store: false` where documented. | CarbonLite-side expiry; field minimization; provider retention/abuse-monitoring terms; residency; DPA; verified configuration. |
| Feedback and support | Retain only minimized case data for an owner/legal-approved period after case closure. No period is approved. | Support owner | Manual case review and workspace erasure. | Case-closure definition; free-text minimization; expiry procedure; privacy notice. |
| Analytics/error monitoring | Provider-specific period and identifier set must be approved before use with paid-pilot data. | Infrastructure owner | Configuration review and provider deletion assistance where available. | Actual enabled-provider list; settings; region; provider expiry/deletion evidence; DPA and change notice. |
| Account and membership data | Retain during the active pilot and approved offboarding window, then erase subject to shared-user, legal-hold, and evidence rules. | Policy owner; request verifier | Verified workspace-erasure process. | Identity/shared-user rules; deactivation semantics; session revocation evidence; contract/privacy alignment. |
| Minimized deletion evidence | Proposed **24 months after operation completion or final dispute closure, whichever is later**. Retain only approved hashes, identifiers, actors, timestamps, counts, result, and retry status. | Security/legal evidence owner | Restricted evidence location and periodic review. | Legal approval; field-level schema; current document audit may retain excessive prior payloads; access and expiry controls. |
| Paired backups | Proposed daily recovery points with **24-hour RPO**, plus a pair before deployment/migration, retained **14 days**. Trigger: recovery-point creation. | Infrastructure owner | Manual paired database dump/document archive, pair ID, checksum manifest, and register review. | Provider verification; automation; encryption/access proof; independent copy decision; restore rehearsal; actual expiry proof. |
| Maximum deleted-data backup survival | Proposed maximum **30 calendar days after verified active-system deletion**, subject to technical proof and legal exceptions. | Infrastructure owner | Register each affected recovery point and expected expiry; weekly reconciliation; post-restore re-deletion. | Provider and independent-copy evidence that every recoverable copy expires within the proposed maximum. |

## 5. Source documents, temporary files, and extraction artifacts

Source-document deletion and confirmed-record deletion are separate operations. The authenticated document workflow deletes managed source bytes and the document record, with linked extraction and spreadsheet review records cascading as implemented. Confirmed activities and copied provenance may remain. Storage failure is expected to stop before database deletion. A later database failure can leave a missing-source state that requires the supported retry process.

Persisted extraction artifacts follow the associated source deadline unless the executed agreement requires earlier removal. Temporary staging is never approved as durable storage. No operator may use an unresolved path, direct filesystem deletion, direct SQL, or an ad hoc cleanup script in place of the runbook.

## 6. Draft and unconfirmed data

The inactivity trigger must be approved before draft deletion begins. Candidate events are the most recent draft update, extraction, review-row edit, or user confirmation action. A login must not reset the clock. The proposed 14-day notice must let the customer confirm, export, request an extension, or allow deletion. The register must record the candidate date, notice date, response deadline, disposition, approver, and evidence reference.

## 7. Confirmed records, factor provenance, and reporting

Confirmed activity records, calculation snapshots, current results, and factor provenance are accounting/traceability records distinct from original evidence. The executed agreement must identify the customer as authoritative archive or state another arrangement, define export and deletion, and preserve the provenance needed to explain delivered calculations.

Global factor-library and governance evidence is not customer-owned and is not erased with a workspace. Customer-specific factors are workspace data. Supported calculations require the approved factor allowlist, applicability, unit, geography, vintage, gas basis, and human review. CarbonLite must not represent a value as verified merely because its source or record is labelled official.

PDF/CSV exports downloaded to customer devices are controlled by the customer. CarbonLite cannot delete those copies. Backend report content, summaries, references, and generated artifacts must be included in the active-system inventory. An unsupported external artifact blocks a complete-erasure representation.

## 8. Logs, usage, AI jobs, and evidence

Audit, activity, quota, AI-job, feedback, and provider telemetry must be minimized. Free text and before/after JSON must not become uncontrolled copies of source or personal data. The proposed 12-month, 90-day, and 24-month periods cannot be promised until corresponding expiry controls and legal approval exist.

Deletion evidence may retain a one-way organization-ID hash, operator and approver identities, timestamps, approved scope, counts, result, backup-expiry references, and retry status. It must not retain organization name, source content, extracted rows, activity payloads, emissions details, secrets, or excessive prior-object payloads.

## 9. Customer deletion requests and identity verification

1. Assign an opaque case ID and keep the underlying message in a restricted case location.
2. Verify identity through the known customer contact or another approved method, confirm organization and role, and confirm authority for the requested scope.
3. Acknowledge that receipt is not approval and that holds, contract records, active-system work, backup expiry, and minimized evidence are separate issues.
4. Classify the request as source deletion, selected records, account data, complete workspace, or another approved scope.
5. Check the restricted legal-hold source and the executed agreement.
6. Prepare a dry-run or resource inventory and obtain independent approval.
7. Use only the supported authenticated workflow, verify results independently, record failures and retries, map affected backups, and send approved completion wording.

Response and completion deadlines remain pending legal and owner approval. A successful API response alone does not establish completion.

## 10. Legal holds and preservation exceptions

A valid hold suspends conflicting deletion for the specified organization, data class, period, or matter. Only the designated legal/privacy authority may place, change, or release a hold. The general register records only the hold ID, scope category, authority, dates, and status; privileged detail stays in the restricted legal source of truth. After release, recalculate the applicable deadline and obtain an independent review before deletion.

## 11. Offboarding and account deactivation

Offboarding records the approved trigger and pilot end, may suspend new uploads, provides the agreed export window, resolves open cases and holds, runs and reconciles the erasure dry-run, obtains two-person approval, executes the supported erasure, verifies active systems, records backup expiries, and notifies the customer of retained exceptions.

Account deactivation must not be described as data erasure. The owner must approve session-revocation and shared-user handling, and evidence must show that a deactivated account cannot continue accessing the organization.

## 12. Active-system deletion, backups, and restoration

Active-system completion and backup expiration are separate milestones. Customer wording must state that deleted data may remain in access-restricted backups until expiry and could be restored only through an authorized recovery process.

Database and source-file recovery points must be paired or their consistency difference documented. A database dump does not contain document bytes. Each pair needs provider/service identifiers, region, time, pair ID, expiry, access/encryption status, checksum evidence, and test status without secrets.

The **proposed RPO is 24 hours** and is an internal target, not a recovery guarantee. The **RTO is NOT APPROVED**. Prior proposals of **four hours** and **two business days** conflict. Neither is selected in this policy. Owner and infrastructure review must establish the recovery scenario, measurement start and stop, service hours, staffing, provider capability, and customer wording before any RTO appears in an executed agreement.

No continuous availability or guaranteed recovery is promised. Before restored data becomes accessible, operators must isolate the destination, compare the recovery-point time with every later deletion/offboarding event, reapply approved deletions, reconcile holds, verify paired files/database, and obtain independent sign-off.

## 13. AI processing, subprocessors, and cross-border disclosure

Candidate providers identified in current materials include Vercel, Render, a managed PostgreSQL provider such as Neon, OpenAI, Sentry, PostHog, and Google Analytics. Actual use and configuration must be verified before the executed disclosure is finalized.

OpenAI-assisted extraction may be used only for approved data classes and customer-authorized purposes. A request setting such as `store: false` does not prove provider-side deletion, abuse-monitoring retention, residency, or contractual protection. The subprocessor register must record purpose, data classes, location, retention/deletion terms, security terms, DPA status, and change-notice procedure. Some processing may occur outside Canada and be subject to foreign law, but exact locations require verification.

## 14. Manual register and two-person control

The retention coordinator performs a weekly review using `CarbonLite_Paid_Pilot_Retention_Register.xlsx` and `carbonlite-retention-manual-runbook.md`. The register stores opaque IDs, dates, counts, hashes, decisions, and evidence references, never credentials or customer payloads.

Before document deletion or workspace erasure, an independent approver reviews the target, environment, scope, identity/authority result, hold result, notice/export status, dry-run inventory, artifact coverage, retained records, backups, verification plan, and evidence destination. Approval expires if the target, scope, inventory, hold, or environment changes.

## 15. Incidents, exceptions, and failed deletion

Overdue deletion, unexplained staging files, prohibited content, unsupported report artifacts, deletion failure, missing backup expiry, or restoration of deleted data is an exception. Stop the affected workflow, restrict access where appropriate, preserve minimized diagnostic evidence, notify the policy and security owners, consult legal/privacy where required, and retry only through the supported reviewed process. Customer communications must distinguish delay, partial state, active-system completion, backup expiry, and retained legal/evidence exceptions.

## 16. Policy decisions pending approval

| ID | Decision and current proposal | Recommended final wording for approval | Business owner | Legal/privacy | Technical/operational prerequisites | Supporting evidence | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PD-SYN-001 | Source retention: pilot end + 30 days. | “Approve active-system deletion of original sources 30 calendar days after the approved pilot end, subject to holds, contract exceptions, verified execution, and backup-expiry disclosure.” | Required | Required | Pilot-end source; deletion verification; backup mapping | Existing policy §§5–6; register Schedule RS-SYN-001; runbook §§7–12 | PENDING_OWNER |
| PD-SYN-002 | Temporary files: immediate normal cleanup; 24-hour exception target. | “Approve a 24-hour internal exception target from file creation, contingent on a tested age-based control and monitored exceptions; do not state it as a customer guarantee until evidenced.” | Required | Required | Exact staging path; sweeper; tests; monitoring | Existing policy §§5,7; register RS-SYN-002; runbook §3.2 | PENDING_EVIDENCE |
| PD-SYN-003 | Confirmed records: contract-defined; customer proposed as authoritative archive. | “Approve customer archive responsibility and contract-defined CarbonLite retention/export/deletion, with no inferred default.” | Required | Required | Export completeness; record/provenance inventory; signed agreement | Existing policy §§5,8; register RS-SYN-004; Terms “Data and Backups” | PENDING_OWNER |
| PD-SYN-004 | Drafts: review after 30 inactive days and proposed 14-day notice. | “Approve the defined meaningful-activity trigger, review at 30 days, and 14-day notice/grace period before authorized deletion.” | Required | Required | Activity definition/query; notice delivery; extension rule | Existing policy §7; register RS-SYN-003; runbook §3.2 | PENDING_EVIDENCE |
| PD-SYN-005 | Audit 12 months; quota 90 days after close; deletion evidence 24 months. | “Approve the three separate minimized periods and require field-level expiry controls, hold handling, and access review.” | Required | Required | Taxonomy; minimization; expiry procedures; quota inventory fix | Existing policy §§5,9; register RS-SYN-005/006/014; runbook §§10–11 | PENDING_EVIDENCE |
| PD-SYN-006 | Offboarding: 14-day export window and target within 30 days after the later trigger/clearance. | “Approve the trigger hierarchy, export opportunity, and qualified active-system target; backup expiry remains a separate milestone.” | Required | Required | Export test; dry run; artifact coverage; staffing | Existing policy §12; register RS-SYN-007; runbook §§8–14 | PENDING_OWNER |
| PD-SYN-007 | Backups: 24-hour RPO, 14-day paired retention, maximum 30-day deleted-data survival; RTO unresolved. | “Approve only after provider proof and restore rehearsal. Do not approve an RTO until the four-hour and two-business-day proposals are reconciled.” | Required | Required | Actual configuration; paired automation; expiry proof; restore test; authority | Existing policy §13; backup runbooks; register backup sheet; release backup recommendation | PENDING_EVIDENCE |
| PD-SYN-008 | Subprocessors: verify provider list, location, DPA, retention, deletion, and change notice. | “Approve only the verified provider register and customer disclosure; no contemplated provider is represented as active without evidence.” | Required | Required | Provider inventory/config; contracts; DPA; location/retention proof | Privacy “How Information May Be Shared”; existing policy §14 | PENDING_EVIDENCE |
| PD-SYN-009 | Deletion requests: manual verification and timing pending. | “Approve identity/authority, acknowledgement, scope, hold, approval, verification, exception, and communication procedure; set legal response targets separately.” | Required | Required | Templates; legal deadline analysis; trained roles; case store | Privacy “User Choices”; existing policy §§10–11; runbook §§4–14 | PENDING_LEGAL |
| PD-SYN-010 | Reports: confirmed-record period or approved shorter period. | “Approve a period only after every backend/artifact store has an owner and supported deletion method; customer copies remain customer-controlled.” | Required | Required | Artifact inventory; adapter; fail-closed test; export definition | Existing policy §§5,9; workspace-erasure doc; register RS-SYN-009 | PENDING_EVIDENCE |
| PD-SYN-011 | AI jobs: minimize and retain only for approved operational needs; no period approved. | “Approve field minimization, CarbonLite expiry, and verified provider terms before real-data AI processing.” | Required | Required | Field inventory; purge/expiry; `store:false` verification; provider terms | Privacy “Uploaded Documents”; existing policy §§5,14; register RS-SYN-010 | PENDING_EVIDENCE |
| PD-SYN-012 | Feedback/support: no default period. | “Approve a case-closure trigger, minimized fields, and period before paid-pilot support intake.” | Required | Required | Case workflow; free-text controls; expiry; notice | Privacy “Feedback Submissions”; existing policy §5; register RS-SYN-011 | PENDING_OWNER |
| PD-SYN-013 | Accounts: active pilot plus offboarding; shared-user handling unresolved. | “Approve account/member retention, deactivation, session revocation, shared-user preservation, and erasure rules.” | Required | Required | Identity rules; token/session test; membership relation review | Privacy “Information We Collect”; Terms “Account Termination”; register RS-SYN-013 | PENDING_LEGAL |
| PD-SYN-014 | Deletion evidence: minimized evidence proposed for 24 months. | “Approve the listed minimal fields, restricted access, 24-month trigger, and expiry only after removing excessive prior-object payloads.” | Required | Required | Audit payload remediation; schema; access/expiry control | Workspace-erasure doc; existing policy §§6,9; register RS-SYN-014 | PENDING_EVIDENCE |
| PD-SYN-015 | Prohibited uploads: draft categories and discovery response. | “Approve the prohibited categories, pre-upload notice, contractual restriction, incident handling, and legal/privacy escalation.” | Required | Required | Terms/Privacy language; upload guidance; support response | Existing policy §4; current Privacy/Terms; register decision row | PENDING_LEGAL |

No decision is `READY_FOR_APPROVAL` while its listed owner/legal review or evidence prerequisite remains open.

## 17. Review, approval, and version history

Review this policy at least quarterly during the pilot and after a material product, provider, contract, legal, or incident change. Changes require a version, rationale, impacted customer language, effective date, and approval record. An owner signature does not substitute for legal/privacy or infrastructure review where marked required.

| Version | Date | Change | Business owner | Legal/privacy | Infrastructure | Effective date |
| --- | --- | --- | --- | --- | --- | --- |
| v1-review | November 5, 2026 | Approval-preparation draft; no approvals recorded | ____________________ | ____________________ | ____________________ | ____________________ |

## 18. Readiness conclusion

- **GO for owner/legal review:** Yes. The package identifies proposals, conflicts, controls, and missing evidence without treating them as approved.
- **GO for real-data paid pilot:** No. Required owner/legal decisions, customer-document alignment, provider/backup proof, expiry/minimization controls, artifact deletion coverage, operational assignments, and the broader real-data P0 security/privacy gates remain open.
