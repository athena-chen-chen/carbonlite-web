# CarbonLite Legal Hold and Preservation Policy — Draft

**Status:** Draft for business-owner and Alberta/Canadian legal and privacy review. Not approved.
**Version:** v0.1-review
**Prepared:** November 5, 2026
**Owner:** [Policy owner — to be assigned]

> This draft does not assert that a legal obligation exists and is not legal advice. A hold must have a documented, legitimate preservation reason, approved scope, named authority, and review date. The Legal Holds register tracks the workflow but is not a technical deletion lock.

## 1. Purpose and scope

This policy defines how Kach Canada Ltd. identifies, authorizes, applies, reviews, and releases a preservation hold affecting CarbonLite pilot data. It covers active PostgreSQL records, durable uploaded documents, generated or referenced report artifacts, logs and operational evidence, customer exports still controlled by Kach, and identified database/document recovery points.

The policy applies to Kach personnel and approved operators. It does not authorize access to customer content, create a legal duty, or expand collection. Customer-controlled downloads and copies outside Kach's control are out of operational scope but may require communication or preservation instructions approved by counsel.

## 2. Qualifying hold

A legal or preservation hold is a time-limited suspension of ordinary deletion or alteration for data reasonably connected to a documented matter. Potential triggers include a verified litigation or regulatory preservation request, a legally reviewed contractual dispute, a privacy or security investigation, or another preservation direction approved by the designated legal/privacy authority.

An inquiry, informal concern, spreadsheet entry, or desire to retain data “just in case” is not enough. The approving reviewer must record the authority, reason category, scope, effective time, responsible owner, and next review date without copying privileged advice or sensitive evidence into the register.

## 3. Authority and separation of duties

- A customer-authorized contact, Kach business owner, privacy/security lead, or legal counsel may request review of a potential hold.
- Only the designated legal/privacy reviewer, acting within documented authority, may approve the legal basis and scope or authorize release.
- The business owner may order an immediate provisional administrative freeze while authority is verified. A provisional freeze is protective and does not constitute legal approval.
- The operations owner applies the freeze and verifies technical and manual coverage. A separate reviewer verifies activation and release.
- No requester may approve their own hold release. Operator access must be least privilege and recorded.

Names and delegated authorities remain blank until the owner approval document is completed.

## 4. Scope rules

The narrowest workable scope must be used:

- **Organization-wide hold:** all covered data for one organization when document-level selection would omit relevant relationships or cannot be enforced reliably.
- **Document-specific hold:** named document IDs plus related extraction, draft-review, provenance, audit, and activity links. It may be used only when every destructive path can enforce that scope.

Where enforcement cannot safely distinguish held from unheld records, the operations owner must apply an organization-wide freeze and record the broader temporary operational scope. Scope must identify included organizations, document IDs or opaque references, data classes, date range if applicable, and exclusions. The register must not contain source text, allegations, legal strategy, personal information, or customer narratives.

## 5. Covered data and metadata

Subject to approved scope, preservation includes:

- source documents and durable storage keys;
- document extraction results and spreadsheet review rows;
- activity records, copied provenance, calculation snapshots, and metric results;
- reports, report metadata, generated artifact references, and managed artifacts;
- AI-job metadata and retained inputs/outputs where they exist and are in scope;
- organization, user, membership, facility, asset, quota, feedback, audit, and activity-event records necessary to interpret the evidence;
- minimized hold, deletion-request, and erasure evidence; and
- identified paired database/document recovery points capable of restoring covered data.

Preservation does not authorize new data collection. System-wide factor libraries are included only when the matter specifically requires them; organization-owned custom factors may be covered.

## 6. Confidentiality, access, and evidence integrity

Hold existence, scope, and evidence references are confidential. Access is limited to the legal/privacy reviewer, business owner, operations owner, backup operator when needed, and approved technical personnel. Use opaque case IDs, object IDs, timestamps, counts, hashes, and restricted evidence locations. Do not place privileged instructions, customer payloads, credentials, or identity documents in the workbook, logs, tickets, or ordinary chat.

Preserved evidence must remain in its existing system when feasible. If a copy is necessary, record source, time, actor, hash or integrity check, storage location, and access restriction. Do not modify original timestamps or content. Every access or export must be necessary, approved, and minimized.

## 7. Deletion and retention during a hold

An active or provisional hold suspends all retention deadlines and customer-initiated deletion for the covered scope. Operators must not invoke document deletion, activity deletion, bulk deletion, admin clear/reset, report deletion, workspace erasure, provisioning cleanup, retention cleanup, or any equivalent database/storage operation against held data.

Customer deletion requests remain open and must be acknowledged under the approved request process. Record that deletion is restricted, route the request to legal/privacy review, preserve only the required scope, and delete unaffected data where independently authorized and technically separable. Customer communications must not disclose privileged analysis, investigation details, another party's information, or facts whose disclosure is legally restricted. Counsel must approve any exception to ordinary notice.

The current code has tenant authorization but no legal-hold state or shared backend guard. Manual restriction therefore does not reliably prevent every authorized user or platform-admin deletion route. Real customer data remains blocked until the P0 enforcement described in the enforcement design is implemented and tested.

## 8. Review and release

Active and provisional holds must be reviewed at least every 90 days, and sooner on a date set by the approver, a scope change, a customer deletion request, an incident, or a change to systems or recovery points. Review whether the reason remains legitimate, the scope is still narrow, access remains appropriate, and all deletion paths and backups remain covered.

Only documented release authorization from the designated legal/privacy authority ends a hold. Operations then:

1. records the authorization and effective UTC time;
2. inventories affected active data and recovery points;
3. recalculates each retention deadline from the approved policy and contract, without assuming the hold period automatically extends every deadline;
4. identifies data already overdue for deletion;
5. obtains independent review of the recalculation and deletion plan; and
6. resumes deletion only after backup/restoration reconciliation and technical guard release are verified.

Release does not itself authorize immediate deletion. Unaffected contractual, privacy, security, or retention restrictions still apply.

## 9. Backups and restoration

A hold does not imply indefinite backup retention. The infrastructure owner must identify the minimum recovery points needed for the approved scope, their paired database/document identifiers, expiry, access controls, and disposition. Recovery points outside the approved scope follow the approved rotation.

Any restore may reintroduce data deleted after the recovery point or revert hold state. Restore into an isolated environment, block customer access and writes, reapply the authoritative hold and deletion ledger, reconcile document storage and database state, validate tenant isolation, and obtain independent approval before release. Repository documentation does not prove Neon or Render recovery configuration, expiry, or a completed post-restore deletion test; that evidence is a P0 dependency.

## 10. Incidents and failed enforcement

Stop all affected deletion and restoration activity and escalate immediately to the legal/privacy reviewer, security lead, business owner, and infrastructure owner if:

- held data is deleted, changed, exposed, or restored without reconciliation;
- scope, authority, or release is disputed;
- a deletion path bypasses the freeze;
- the hold register and system state disagree;
- backup evidence is missing or inconsistent; or
- an operator cannot verify enforcement.

Preserve minimized incident evidence. Do not attempt unapproved recovery, notify customers, or characterize legal impact until the authorized incident and legal/privacy process determines the response.

## 11. Approval and version history

| Version | Date | Change | Policy owner | Legal/privacy reviewer | Status |
| --- | --- | --- | --- | --- | --- |
| v0.1-review | 2026-11-05 | Initial manual-first policy and technical-readiness boundary | To be assigned | To be assigned | Draft; not approved |

Approval requires completed owner, legal/privacy, security/technical, and infrastructure review. No signature or approval is implied by this draft.
