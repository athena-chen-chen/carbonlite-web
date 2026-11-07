# CarbonLite Paid-Pilot Data Retention Policy

**Status:** Draft for owner and legal review. Not approved.
**Policy owner:** To be assigned
**Legal reviewer:** To be assigned
**Effective date:** Not set
**Review cycle:** Proposed quarterly during the paid pilot and after any material provider, product, or contract change
**Applies to:** Proposed controlled paid pilot for 1–3 customer organizations

This document proposes how KACH CANADA LTD. should classify, retain, review, and delete CarbonLite paid-pilot data. It is an operating proposal, not legal advice, a customer commitment, or evidence of compliance certification. Values labelled **Proposed — not approved** must not be presented as binding until the owner and legal reviewer record approval in the retention register and align the customer contract, Privacy Policy, Terms of Use, and provider configuration.

## 1. Objectives

The policy is intended to:

1. retain only data needed to operate and support the pilot, preserve agreed accounting evidence, protect the service, and meet contractual or legal obligations;
2. distinguish original evidence and review drafts from confirmed accounting records;
3. support verified customer deletion requests and controlled offboarding;
4. prevent deletion while an authorized legal hold applies;
5. reconcile active-system deletion with database and document-storage backups; and
6. produce proportionate evidence of review, approval, deletion, retry, and restoration handling.

## 2. Scope and system boundaries

This policy covers customer and operational data held in CarbonLite-controlled active systems, including:

- account, organization, membership, facility, and profile data;
- uploaded source documents and storage metadata;
- AI and local extraction outputs;
- spreadsheet import drafts and review rows;
- confirmed activity records, calculation snapshots, metric results, and factor provenance;
- reports, report metadata, and export events;
- audit logs, usage/activity events, feedback, AI job records, and quota usage;
- database and document-storage recovery points; and
- deletion and offboarding evidence.

Customer-downloaded files, customer-retained originals, customer email systems, and customer-controlled devices are outside CarbonLite's deletion control. Provider systems remain subject to the applicable contract, data-processing terms, configuration, and provider retention behavior.

## 3. Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| Policy owner | Approves business purpose, retention schedule, exceptions, owners, and operating resources. |
| Legal/privacy reviewer | Reviews legal basis, contractual periods, legal holds, notices, subprocessors, residency, and customer-facing language. |
| Retention coordinator | Maintains the register, performs weekly review, coordinates notices, and records evidence. |
| Request verifier | Verifies requester identity, organization authority, request scope, and communication channel. |
| Destructive-operation operator | Executes a separately authorized document deletion or workspace erasure using the supported application workflow. |
| Independent approver | Reviews the target, scope, hold result, dry-run inventory, backup implications, and evidence plan before execution. Must not be the operator. |
| Infrastructure owner | Verifies Render, Neon, backup, restore, access, encryption, and expiry configuration without exposing secrets. |
| Customer contact | Confirms customer authority, export opportunity, notice receipt, and any contract-specific retention requirement. |

No person may approve and execute the same workspace-erasure operation.

## 4. Data classification

### 4.1 Permitted pilot data

CarbonLite may accept operational business records needed for the agreed emissions workflow, such as utility bills, fuel records, travel activity, waste or water records, facility information, and limited business contact details. Data should be limited to the fields and periods necessary for the pilot.

### 4.2 Restricted data requiring explicit approval

The policy owner and legal/privacy reviewer must approve any planned use of:

- personal information beyond ordinary business contact details;
- employee-level, traveller-level, vehicle-driver, or payment-card-related records;
- information subject to sector-specific confidentiality or localization requirements;
- data about minors;
- government identifiers, tax identifiers, bank account details, or precise financial account data; or
- information classified as confidential or highly sensitive by the customer.

### 4.3 Prohibited uploads

Customers and operators must not upload:

- passwords, authentication tokens, API keys, private keys, recovery codes, or database connection strings;
- payment-card numbers, CVV values, bank credentials, or online-banking exports containing account credentials;
- health, biometric, genetic, criminal, or similarly sensitive personal information;
- government-issued identity documents or identification numbers;
- employee files, payroll records, resumes, or performance records;
- data the customer lacks authority to disclose;
- malware, executable payloads, or content intended to disrupt or probe the service; or
- information unrelated to the agreed carbon-accounting pilot.

If prohibited data is discovered, stop routine processing, restrict access, record an incident without copying the prohibited content into the register, consult the legal/privacy reviewer, and use the deletion-request workflow when authorized.

## 5. Retention schedule

The register is the operational source for customer-specific dates, approvals, legal holds, and evidence. The schedule below is a proposal until formally approved.

| Data class | Current system behavior | Proposed retention rule | Trigger | Deletion or review method | Approval status |
| --- | --- | --- | --- | --- | --- |
| Original source documents and storage metadata | Retained until an authorized document deletion or workspace erasure. Source deletion preserves confirmed activity records but removes linked extraction/review rows. Deletion audit metadata may remain. | Pilot end plus 30 calendar days. | Approved pilot end date. | Manual document deletion or workspace erasure, with verification and evidence. | **Proposed — not approved** |
| Persisted extraction artifacts | Stored in document and extraction records; deleted with the source document or workspace. | Same deadline as the associated source document unless the contract requires earlier deletion. | Source-document deadline or approved request. | Delete through the source-document or workspace workflow. | **Proposed — not approved** |
| Multipart temporary upload files | Normal and handled-failure paths attempt immediate cleanup; crash leftovers have no automatic age purge. | Target removal within 24 hours. | File creation time. | Daily/weekly controlled review until a tested automated control exists. | **Proposed — not approved** |
| Abandoned spreadsheet/import drafts and review rows | Retained until their source record or workspace is deleted. | Review after 30 inactive days; notify before deletion; delete only after approval. | Last meaningful user activity, definition pending. | Weekly register review, customer notice, then source deletion if authorized. | **Proposed — not approved** |
| Confirmed accounting records, calculations, and factor provenance | Retained independently of source-document deletion. Organization erasure removes organization-owned records. | Contract-defined. No default period may be inferred. | Contract end, statutory/contractual period, or approved request. | Customer-specific decision recorded in the register. | **Owner/legal decision required** |
| Reports and report metadata | Browser exports normally remain on the customer device; backend report rows can retain summaries, content, or artifact references. | Align with confirmed-record retention unless a shorter contract period is approved. | Report creation or contract end, as approved. | Manual review; workspace erasure must fail closed if an external artifact cannot be safely deleted. | **Owner/legal decision required** |
| AI job records and provider request/response payloads | Organization-scoped AI job rows can retain prompt, input, output, error, and timing fields. OpenAI-assisted extraction requests use `store: false`, but this does not establish CarbonLite-side or provider-side deletion timing. | Minimize persisted payloads and approve a period no longer than needed for retry, support, security, and traceability. | Job completion, failure closure, or source-document deadline, as approved. | Periodic review and workspace erasure; reconcile provider terms separately. | **Owner/infrastructure/legal decision required** |
| Audit logs and security/operational events | Organization-scoped records normally cascade on workspace erasure. Some deletion logs can retain prior object metadata. Minimal workspace-erasure evidence survives with a hashed organization ID. | Separate approved period based on security, traceability, dispute, and minimization needs. | Event date or case closure. | Periodic review and approved minimization/deletion procedure. | **Owner/legal decision required** |
| Quota periods and usage records | Organization-scoped and removed on workspace erasure. Document/user links may be cleared while usage remains. | Proposed alignment with audit/operational-event retention. | Usage occurrence or period close. | Periodic review or workspace erasure. | **Owner/legal decision required** |
| Feedback and support records | Retained until workspace erasure; may contain optional email and free text. | Separate approved support-case period; remove unnecessary document content from free text. | Case closure or submission date. | Manual review and workspace erasure. | **Owner/legal decision required** |
| Analytics and error-monitoring data held by providers | Retention depends on which optional services are enabled and their configured/provider defaults. CarbonLite does not intentionally send document contents or credentials. | Approve provider-specific collection, retention, deletion, and identifier-minimization settings before use for paid-pilot data. | Event collection, account closure, or provider change. | Provider configuration review, deletion assistance where available, and subprocessor register evidence. | **Owner/infrastructure/legal decision required** |
| Account and membership data | Retained while the workspace exists; removed through workspace erasure subject to relation rules. | Active pilot plus approved offboarding period. | Pilot termination or account closure. | Workspace erasure after identity, authority, hold, and export checks. | **Proposed — not approved** |
| Active-system offboarding | No automatic schedule. Platform-admin erasure supports dry-run, managed-file deletion, database cascade, audit evidence, and retry. | Target completion within 30 calendar days after the approved offboarding trigger. | Later of verified request, contract termination, and agreed export period, unless a hold applies. | Manual runbook with two-person approval. | **Proposed — not approved** |
| Deletion and workspace-erasure evidence | Document-deletion audits can retain prior document metadata or payload fields. Workspace erasure intentionally retains a minimized audit with an organization-ID hash, actor, timestamps, status, and counts. | Approve separate evidence content and retention periods. Remove raw or excessive payload fields from deletion evidence. | Operation completion, failure closure, or dispute closure. | Restricted evidence store, periodic minimization review, and approved expiry. | **Owner/legal decision required** |
| Database and document-storage backups | Actual provider configuration and rotation are not established by repository documentation. | Approved rotation schedule that is paired across database and files and compatible with customer commitments. | Recovery-point creation. | Infrastructure register, access control, expiry reconciliation, and restore rehearsal. | **Owner/infrastructure/legal decision required** |

## 6. Source documents and extraction artifacts

1. Source documents must be scoped to the pilot purpose and kept separate by organization.
2. Document deletion must use the authenticated, organization-scoped application workflow. Operators must not delete storage objects or database rows directly.
3. The current local Phase 3F workflow commits a durable deletion intent, moves the physical source to private same-volume quarantine under a Legal Hold/advisory lock, then commits database deletion as `PENDING_PURGE`. A DB rollback can leave live metadata with a recoverable quarantined copy; retry or reconciliation is required. Permanent purge is a separate manual, exact-ID, dry-run-gated action. Filesystem and PostgreSQL operations are not atomic together.
4. Source deletion removes linked extraction and spreadsheet review records. Confirmed activity records and copied provenance remain unless separately authorized for deletion.
5. Deletion evidence must not contain source bytes, extracted text, full customer payloads, secret values, or unnecessary personal information.
6. Filenames and storage metadata in audit history require their own approved retention and minimization decision.

## 7. Temporary files and abandoned drafts

1. Temporary upload staging is not approved as durable source storage.
2. Until an automated age-based control is implemented and tested, the retention coordinator must review the exact configured staging path on the approved schedule. No broad or unresolved filesystem path may be used for cleanup.
3. A file older than the approved temporary-file target is an exception. Record its opaque identifier, creation time, size, reason if known, owner, action, and verification without copying its contents.
4. “Inactive” for draft review must be defined before the 30-day proposal is approved. Candidate events include the latest draft update, extraction, review-row edit, or user confirmation action. Account login alone should not reset a draft deadline.
5. Draft deletion requires notice and an opportunity to confirm, export, or extend the review period.

## 8. Confirmed accounting records and factor provenance

1. Confirmed activity data, current calculation snapshots, metric results, and factor provenance are distinct from original source retention.
2. Source deletion must not be treated as deletion of confirmed accounting records.
3. The customer contract must define the retention period, responsible record owner, permitted correction/deletion process, and whether CarbonLite or the customer is the authoritative accounting archive.
4. Global factor-library records and governance evidence are not customer-owned records and are not deleted through customer workspace erasure. Customer-specific factors are organization-owned and included in workspace erasure.
5. No automatic confirmed-record deletion may occur solely from record age until the contract, hold check, and provenance requirements are approved.

## 9. Audit logs, reports, quota usage, and deletion evidence

1. Audit and activity records must be minimized to what is needed for security, traceability, dispute handling, and pilot operations.
2. Free-text descriptions and before/after JSON must not become an uncontrolled archive of source or personal data.
3. Browser-generated exports are downloaded to the customer device. The customer controls retention of those copies.
4. Any backend report artifact must have an identified storage adapter and deletion method. Workspace erasure must stop if an external artifact cannot be included safely.
5. Quota usage should retain identifiers and counts only as long as operationally required under the approved schedule.
6. Workspace-erasure evidence may retain a one-way organization-ID hash, operator identity, timestamps, outcome, counts, and retry status. It must not retain the organization name, source content, activity payloads, or emissions details.

## 10. Customer deletion requests

1. Record each request in the retention register using a synthetic/internal request ID, not the requester's message contents.
2. Verify the requester's identity, organization, role, authority, communication channel, and requested scope.
3. Acknowledge receipt using the approved customer communication template and state that verification, legal holds, contractual records, and backup expiry may affect timing.
4. Classify the request as source-document deletion, selected active records, account data, full workspace erasure, or another approved scope.
5. Check legal hold and confirmed-record obligations before approval.
6. Require an independent approver for destructive operations.
7. Record completion, exceptions, verification, backup expiry implications, and customer notification. Do not mark a request complete merely because an API returned success.

## 11. Legal holds

1. A legal hold suspends conflicting deletion deadlines for the specified organization, data classes, date range, or matter.
2. Only the designated legal/privacy authority may place, modify, or release a hold.
3. Record the hold ID, scope, authority, placed date, next review date, and release date. Do not describe privileged facts in the general retention register.
4. Every document deletion, workspace erasure, and scheduled retention review must check the hold status before approval.
5. When a hold is released, recalculate the applicable deletion deadline and complete an independent review before deletion.

## 12. Pilot termination and offboarding

1. Record the approved termination trigger and pilot-end date.
2. Suspend new uploads when appropriate and agreed with the customer.
3. Offer the customer a defined export window for source references, activity data, and reports.
4. Resolve open requests, disputes, holds, and contract-defined accounting retention.
5. Run the workspace-erasure dry-run and compare its inventory with the register.
6. Identify all managed document keys and any unsupported report artifacts.
7. Obtain two-person approval before executing erasure.
8. Verify active-system deletion and record backup expiry dates.
9. Notify the customer of active-system completion, retained exceptions, and the latest expected backup expiry date using approved language.

## 13. Backup retention and restoration

1. Database and document-source recovery points must be paired or explicitly reconciled. A database dump does not contain document bytes.
2. Record provider, project/service identity, branch or disk identity, region, recovery-point time, pair ID, retention/expiry, encryption/access status, checksum evidence, and restore-test status without recording secrets.
3. A general provider feature description is not proof that backup, PITR, snapshots, or retention are enabled for CarbonLite.
4. The approved rotation must support recovery objectives while limiting how long deleted customer data can remain recoverable.
5. Active-system deletion does not imply immediate physical removal from immutable or provider-managed backups. Customer-facing language must state the approved backup exception and maximum survival period.
6. Restoration must occur only into an authorized destination. Before restored data becomes customer-accessible, operators must reconcile the deletion-request and offboarding register and reapply all deletions whose effective time is later than the recovery point.
7. A restored branch, disk, or archive containing deleted data must remain isolated until post-restore erasure review passes.

## 14. OpenAI and other subprocessors

Current customer-facing materials identify or contemplate Vercel, Render, Neon or another managed PostgreSQL host, OpenAI, Sentry, PostHog, and Google Analytics. Actual use and configuration must be confirmed before customer disclosure.

1. OpenAI-assisted extraction must be used only for approved data classes and customer-authorized purposes. The current extraction request uses `store: false`, but provider retention, abuse-monitoring, residency, and contractual terms still require owner/legal confirmation.
2. Subprocessor records must include service purpose, data classes, region/residency, retention/deletion terms, security terms, data-processing agreement status, and change-notice procedure.
3. Analytics and error-monitoring providers must not intentionally receive document contents, extracted rows, passwords, tokens, or full customer payloads.
4. A provider change requires privacy/contract review and, where required, customer notice before customer data is sent.

## 15. Manual review, approval, and evidence

The retention coordinator must conduct a weekly review using the manual runbook and register. Evidence should include:

- review date, reviewer, organizations reviewed, and exceptions;
- policy decision or approval references;
- verified request and authority result;
- legal-hold result;
- two-person approval record;
- workspace-erasure dry-run inventory or document deletion scope;
- deletion response and independent verification;
- file/database count and checksum reconciliation where applicable;
- retry attempts and final resolution;
- related backup pair IDs and expected expiry dates; and
- customer notification date and outcome.

Evidence locations must be access-controlled. The register should contain references, hashes, and counts, not credentials or raw customer content.

## 16. Exceptions and incidents

An overdue deletion, unexplained temporary file, unsupported report artifact, failed storage deletion, failed database erasure, backup without an expiry date, restoration that reintroduces deleted data, or prohibited upload is an exception. The operator must stop, restrict access where appropriate, record the exception, notify the policy owner, and obtain direction before resuming destructive work.

## 17. Required owner and legal decisions

Approval requires recorded decisions on:

1. the authoritative definition of pilot end and inactivity;
2. source-document, draft, report, AI-job, audit, quota, feedback, analytics/error-monitoring, account, and deletion-evidence retention;
3. confirmed accounting-record retention and archive responsibility;
4. legal-hold authority, scope, review, and release;
5. deletion-request response and completion targets;
6. customer notice periods and export window;
7. database and document-backup frequency, retention, independent copy, and maximum deletion survival;
8. RPO/RTO and restore authorization;
9. subprocessor contracts, residency, provider-side retention/deletion, and change notice;
10. audit-log, AI-job, feedback, and operational-event payload minimization;
11. responsibility for customer-downloaded exports; and
12. final Privacy Policy, Terms of Use, pilot agreement, and data-processing language.

## 18. Conflicts requiring resolution before approval

- The current Privacy Policy uses an open-ended “as long as reasonably needed” standard and says practices may evolve. It does not state the proposed 24-hour/30-day or contract-defined rules.
- The Privacy Policy permits deletion requests subject to technical, legal, backup, and operational limitations but does not define verification, timing, active-system completion, backup expiry, or deletion evidence.
- The current Privacy Policy does not explain that source-document deletion and confirmed accounting-record deletion are separate operations with different effects.
- The current Terms tell customers to retain their own copies and disclaim guaranteed permanent storage, recovery, or backup. An approved recovery commitment or backup schedule must be reconciled with that disclaimer.
- Current customer-facing language advises users to avoid unnecessary sensitive information but does not contain the explicit prohibited-upload categories in this draft.
- Current materials name potential subprocessors but do not provide approved retention, provider-side deletion, residency, DPA, or change-notice details.

## 19. Approval record

This policy remains unapproved until the following fields are completed in the Policy Decisions worksheet of the retention register and referenced here:

- Business owner decision ID: ____________________
- Legal/privacy decision ID: ____________________
- Infrastructure decision ID: ____________________
- Approved version and date: ____________________
- Next review date: ____________________
