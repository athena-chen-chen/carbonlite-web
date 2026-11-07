# CarbonLite Legal Hold Manual Runbook

**Status:** Draft operating procedure with local Phase 3E enforcement; not approved for real customer data

**Version:** v0.3-p0-01-readiness

**Prepared:** November 6, 2026

> PostgreSQL hold state and shared backend guards are implemented locally and synthetically tested. The Legal Holds worksheet remains a non-authoritative operational tracker. Owner/legal approval, provider access inventory, paired backup evidence, and restored-hold reconciliation remain incomplete, so the real-data pilot is **NO-GO**.

## Roles

| Role | Responsibility |
| --- | --- |
| Business Policy Owner | Owns policy, resources, provisional-freeze authority, and business GO/NO-GO; cannot substitute for legal approval. Proposed: Founder; not approved. |
| Legal/Privacy Reviewer | Verifies legal authority and approves scope, cadence, communications, and release. Must be independently qualified and formally assigned. |
| Hold Request Intake Owner | Opens the minimized case record, verifies requester authority through an approved channel, and escalates a provisional freeze. |
| Technical Operator | Executes approved activation/release steps and verifies technical enforcement. Proposed: Founder; cannot self-approve release. |
| Independent Release Reviewer | Verifies exact release authority, deadlines, deletion plan, recovery points, and evidence. Must differ from requester and technical release operator. |
| Backup Operator | Inventories paired recovery points and performs approved isolated restore/reconciliation; cannot release customer access alone. |

If the independent Legal/Privacy Reviewer or Independent Release Reviewer cannot be staffed, stop: the workflow is `BLOCKED` for operational use.

**Current staffing note:** A founder-related candidate (the founder's husband) has reportedly given verbal willingness to be considered as Independent Business Reviewer. No personal name is stored here. Formal appointment, identity verification, conflict disposition, training, individual access, and operational approval remain `PENDING`; the candidate is not active and cannot replace the qualified Legal/Privacy Reviewer. Use `carbonlite-independent-reviewer-appointment.md` and `carbonlite-independent-reviewer-checklist.md` only for preparation and synthetic training until every gate passes.

## Intake checklist

- [ ] Timestamp receipt in UTC and assign an opaque `LH-...` case ID.
- [ ] Verify requester identity, role, organization, authority source, scope, and urgency through an approved channel.
- [ ] Keep substantive legal analysis and source evidence in the approved restricted case store; do not copy it into Excel, logs, tickets, or chat.
- [ ] If authority or scope is uncertain, apply only the authorized emergency provisional organization freeze and escalate.
- [ ] Identify affected organization/document IDs, data classes, date range, recovery points, deletion requests, and active destructive jobs.
- [ ] Record legal/privacy reviewer, technical operator, independent release reviewer, next review, and evidence references.
- [ ] Notify authorized operators using only the minimized case/scope information.

## Required records

Use an opaque hold case ID. Record only organization ID, scope type, document IDs or a restricted reference, dates, authority category and verification result, reason category, status, approvers, next review, freeze verification, recovery-point references, evidence references, and short non-sensitive notes. Store the request and substantive legal analysis in the approved restricted case location. **An Excel register alone cannot activate, enforce, or release a deletion freeze.** The PostgreSQL hold and guarded application paths provide local request-time enforcement; direct provider/operator paths require separate controls.

## Procedure

1. **Receive the request or identify a potential hold.** Timestamp receipt in UTC. Do not forward or copy evidence into ordinary email, tickets, chat, or the workbook.
2. **Record a case ID.** Create a `LH-...` reference and a Legal Holds row. Set status `INTAKE`. Do not enter sensitive evidence.
3. **Verify authority and scope.** Confirm the requester's identity, authority, organization, matter, requested data classes, date range, and urgency through an approved channel.
4. **Apply an immediate technical deletion freeze.** Under the approved emergency-freeze authority, the authenticated platform-admin approver calls `POST /api/admin/legal-holds/activate` with status `PROVISIONAL`, the organization, the narrowest safe scope, opaque case reference, a different requester, authority reference, and optional restricted evidence reference. The `approvedByUserId` must be the authenticated caller; another operator cannot claim their approval. Confirm the response and `GET /api/admin/legal-holds/organization/:organizationId`. Record the escalation deadline and restrict operator access as defense in depth. Do not rely on a UI button or register field.
5. **Suspend scheduled and manual retention deletion.** Mark the affected organization and document references as excluded from every manual retention queue. Confirm that no scheduled deletion worker exists in the inspected code; still check deployment jobs, provider automation, and operator scripts outside the repository.
6. **Notify authorized operators.** Send the case ID, organization ID, permitted scope, prohibited actions, and escalation contact. Do not include evidence content or privileged rationale.
7. **Escalate for legal/privacy approval.** Set `PENDING_REVIEW`. The reviewer decides whether a qualifying hold exists and whether provisional scope must change. A business decision alone is insufficient.
8. **Inventory active data and recovery points.** Inventory documents, extraction/review rows, activity/calculation data, reports/artifacts, AI jobs, audit/activity events, organization/account metadata, custom factors, and paired database/document recovery points. Use counts, IDs, hashes, and recovery-point references.
9. **Record approval and review date.** For approval, activate an `ACTIVE` hold through the same endpoint and record its effective UTC time, approved-by, exact scope, and next review. A rejected intake does not create an active database hold; retain only approved minimized decision evidence in the restricted process record.
10. **Verify every deletion path is blocked.** Test with synthetic data and expect HTTP `409`, code `LEGAL_HOLD_ACTIVE`, and no confidential reason: individual document deletion and retained bytes; both activity bulk endpoints and individual activity deletion; admin clear; report deletion; workspace erasure; provisioning and golden-sample cleanup; demo reset boundaries; dependent custom-factor deletion; and restore reconciliation. The local Phase 3E E2E suite covers these application paths except provider restore. Record endpoint, expected denial, actual result, actor, time, and evidence. Any successful held deletion is an incident.
11. **Review weekly while any hold is open.** Confirm case owner, status, upcoming review, deletion requests, new endpoints/jobs, backup changes, and exceptions. Conduct the formal authority/necessity/scope review at least every 90 days or on the earlier approved date. Narrow or end the hold only through the authorized workflow.
12. **Receive release authorization.** An authorized platform operator calls `POST /api/admin/legal-holds/:id/release-request`, which moves the hold to `RELEASE_PENDING` and continues blocking. Verify the authorization covers the exact case and scope. Do not infer release from silence, case closure, pilot end, or a customer request.
13. **Recalculate retention and deletion deadlines.** Apply the approved policy and contract to each data class. Record the calculation reference and whether data is immediately overdue. Do not automatically add the hold duration unless approved rules require it.
14. **Require independent review and technical release.** A platform-admin approver other than the release requester confirms authorization, active-data inventory, recalculated deadlines, deletion plan, affected recovery points, and communications by calling `POST /api/admin/legal-holds/:id/release-review`. A different release operator then calls `POST /api/admin/legal-holds/:id/release`. Confirm `RELEASED`. Release does not delete data and does not start an automatic purge.
15. **Reconcile backups and restoration.** Record recovery points that contain held or newly deletable data, their expiry/disposition, and the deletion evidence that must be replayed after any restore. Keep a restored environment isolated. Compare restored hold/event and deletion-intent state with the restricted external register; re-enter later provisional/active/release-pending holds; run the read-only storage report; treat active bytes reappearing for `PENDING_PURGE`/`PURGED`, missing quarantine, and orphan quarantine as stop conditions; replay later authorized deletions only after review; verify tenant boundaries and blocked APIs; and obtain infrastructure plus independent approval before access. An external append-only ledger and an isolated provider restore test are not yet implemented.
16. **Close with minimized evidence.** After the technical guard is released and separately authorized retention/deletion actions finish, set `RELEASED`, then `CLOSED`. Retain only the approved case ID, scope identifiers, authority/approval references, dates, verification evidence, outcome, and recovery-point disposition. Record that release itself caused no deletion.

## Evidence record for each technical check

Record the opaque case ID, UTC time, synthetic actor role, endpoint/operation, target type/count, expected result, actual result, response code, retained-byte/hash result where applicable, unrelated-tenant result, and restricted evidence reference. Do not record customer payloads, filenames, legal narrative, credentials, tokens, or full database URLs.

The 2026-11-06 P0-01 local rehearsal evidence is in `carbonlite-p0-01-legal-hold-readiness-report.md`. It does not replace human owner/legal review or production verification.

## STOP conditions

Stop deletion, release, restore, and customer-access work for the affected scope when any condition below applies:

- **Unverified request authority:** keep only a provisional freeze; do not label the hold active or disclose evidence.
- **Ambiguous organization or document scope:** freeze the whole affected organization temporarily; do not guess object IDs or exclusions.
- **Unapproved release:** leave the hold active and deletion suspended.
- **Incomplete deletion-path coverage:** do not accept real data or claim enforcement.
- **Unavailable backup/restore evidence:** do not release a restored environment or claim backup expiry/reconciliation.
- **Failed or inconsistent enforcement:** disable affected deletion access, preserve logs, escalate as an incident, and keep the organization frozen.
- **Register/system disagreement:** treat the restrictive state as authoritative until independent reconciliation.
- **Evidence exposure:** stop copying information, restrict access, and follow the incident process.

## Implemented control and current operational restriction

The local backend now persists holds and serializes activation, release, upload metadata acceptance, document/activity/bulk/admin/report/custom-factor/provisioning/sample-cleanup/workspace-erasure, quarantine transition, and manual purge paths using a PostgreSQL advisory transaction lock. Hold reads occur under that lock and database errors fail closed. Recoverable deletion persists a `PREPARED` intent before a same-volume rename; a rollback leaves the quarantined copy and intent available for retry. Manual permanent unlink still cannot roll back with PostgreSQL. Do not describe DB/filesystem operations as atomic. Use the recoverable-deletion and storage-reconciliation runbooks before any purge.

No repository-scheduled retention purge was found. Provider automation, manual SQL/storage access, deployment jobs, and actual Neon/Render recovery configuration remain unverified and can bypass the application. Keep those privileges restricted and require the manual owner/legal checks in this runbook. The real-data pilot remains blocked until the owner approval record and recovery P0s are complete.

## Synthetic rehearsal evidence

Before approval, run a tabletop and API-level synthetic rehearsal that covers activation, concurrent delete attempts, admin/bulk bypass attempts, hold release, deadline recalculation, and isolated restore. No real customer or confidential legal data may be used. Record opaque evidence references in the owner approval document and Legal Holds worksheet.
