# CarbonLite Retention Manual Runbook

**Status:** Draft for owner and legal review. Not approved for operational use.
**Scope:** Manual retention review and evidence workflow for 1–3 controlled paid-pilot organizations
**Safety:** This runbook does not authorize access, deletion, database operations, provider changes, or restoration. Every operational action requires separate authorization and verified targets.

## 1. Purpose

Use this runbook with the CarbonLite paid-pilot retention policy and retention register. It provides a manual-first process while automated retention deadlines, legal holds, and deletion queues do not exist in the application.

Never copy credentials, connection strings, tokens, source documents, extracted rows, personal information, or customer payloads into the register or evidence log. Use opaque IDs, counts, checksums, timestamps, decision references, and access-controlled evidence locations.

## 2. Stop conditions

Stop before any destructive or provider action when:

- the organization, environment, service, database, disk, storage path, or backup destination is uncertain;
- a legal-hold check is incomplete or a hold may apply;
- requester identity or authority is unverified;
- the requested scope conflicts with contract-defined accounting retention;
- the independent approver is unavailable or is also the operator;
- the workspace-erasure dry-run differs from the register without explanation;
- an unsupported report artifact is present;
- backup expiry or restoration implications are unknown;
- the evidence destination is not access-controlled;
- the customer has not received any required notice or export opportunity;
- the command or action would bypass the authenticated application workflow; or
- production/staging access or a provider change has not been separately approved.

Escalate the case to the policy owner and legal/privacy reviewer. Do not treat an approaching deadline as authority to continue.

## 3. Weekly retention review

### 3.1 Prepare

1. Create a new entry in **Retention Review Log** with review ID, date, reviewer, scope, and status `In progress`.
2. Confirm the current approved policy version and unresolved decisions in **Policy Decisions**.
3. Confirm the register contains synthetic examples only unless real-customer use has been separately authorized.
4. Review **Pilot Organizations** for missing pilot-end dates, holds, open deletion requests, offboarding dates, and overdue actions.
5. Review **Data Retention Schedule** for unapproved rules, missing owners, missing triggers, and overdue next reviews.
6. Review **Deletion Requests** for unacknowledged, unverified, overdue, failed, or awaiting-approval cases.
7. Review **Backup & Restore Register** for missing pair IDs, expiries, independent copies, checksums, restore tests, or post-restore erasure reviews.

### 3.2 Review temporary files and abandoned drafts

1. Resolve and record the exact configured temporary-upload path through an authorized environment-specific procedure. Never assume a default path in a deployed service.
2. Inspect metadata only unless content inspection is specifically authorized: opaque filename, creation/modification time, size, and ownership.
3. Record files older than the approved target as exceptions. Do not delete them during review without a separately approved cleanup action.
4. Identify draft candidates using the approved inactivity definition. Do not use `createdAt` or account login as an unapproved substitute.
5. Record the proposed review date, customer notice date, response deadline, and disposition.

### 3.3 Close the review

1. Record counts of organizations, requests, backups, overdue items, holds, and exceptions.
2. Create owner actions for every overdue or blocked item.
3. Set the review status to `Complete`, `Complete with exceptions`, or `Escalated`.
4. Record the evidence location and independent reviewer if used.

## 4. Customer deletion-request intake

1. Assign an opaque request ID such as `DR-SYN-0001` or an approved production case ID.
2. Record received date, channel, organization ID, requester role, requested scope, and requested completion date.
3. Do not paste the email, document contents, or sensitive explanation into the register. Link to a restricted case location.
4. Send an acknowledgement that:
   - receipt is recorded but deletion is not yet approved;
   - identity, authority, scope, legal holds, contractual records, and backups require review;
   - active-system completion and backup expiry are separate milestones; and
   - a final response will describe any approved exception.
5. Set status to `Identity verification`.

## 5. Identity and authority verification

The request verifier must:

1. use the known customer contact or another approved out-of-band method;
2. confirm requester identity without collecting excessive identity documents;
3. confirm the requester is authorized for the named organization and requested scope;
4. confirm whether the request concerns an individual, selected source documents, selected records, the account, or the complete organization;
5. record method, result, verifier, date, and evidence reference; and
6. reject or escalate requests that cannot be verified.

Set identity status to `Verified`, `Failed`, or `Escalated`. Never proceed with `Pending`.

## 6. Legal-hold and contractual-retention review

1. Check the organization hold status in **Pilot Organizations** and the restricted legal-hold source of truth.
2. Ask the legal/privacy reviewer whether the requested data, period, or matter is subject to preservation.
3. Check the customer contract for confirmed accounting-record retention, dispute, audit, or export obligations.
4. Record only hold ID, scope category, status, authority, dates, and decision reference. Keep privileged detail elsewhere.
5. If a hold applies, set the request to `Blocked by legal hold`, notify the policy owner, and provide customer wording approved by legal counsel.
6. If the hold does not apply, record `Cleared` and the reviewer/date.

## 7. Scope and deletion method

Choose the narrowest supported method that satisfies the approved request:

| Approved scope | Supported method | Expected effect |
| --- | --- | --- |
| Original source document and its extraction/review artifacts | Authenticated document deletion | Deletes managed source bytes and document row; linked extraction/review rows cascade; confirmed activities and copied provenance remain. |
| Selected confirmed activity records | Supported activity-record deletion workflow | Deletes selected records and associated current projections as implemented; audit history may retain prior values. Requires accounting-retention approval. |
| Complete organization/workspace | Platform-admin workspace erasure | Deletes managed files first, then organization-owned database data; minimal hashed operational evidence remains. |
| External report artifact | No general adapter confirmed | Stop. Identify owner and supported deletion mechanism. Workspace erasure must not claim completion while unsupported artifacts remain. |
| Provider backup copy | Provider/backup expiry process | Record expected expiry or authorized backup deletion. Do not alter provider settings without separate approval. |

Do not substitute direct SQL, filesystem deletion, database reset, migration, provider restore, or an ad hoc script for the supported application workflow.

## 8. Two-person destructive-operation approval

Before any document deletion or workspace erasure, the operator prepares an approval packet containing:

- request/case ID and verified organization ID;
- approved scope and reason;
- policy/contract decision reference;
- legal-hold result;
- customer notice/export status;
- proposed method and environment;
- document ID list or workspace-erasure dry-run inventory;
- managed-file and report-artifact assessment;
- expected retained data, including confirmed accounting records or minimized erasure audit;
- backup pair IDs and expected expiry implications;
- verification and retry plan; and
- evidence destination.

The independent approver checks every item, records `Approved` or `Rejected`, identity, timestamp, and decision reference. Approval expires if the target, scope, inventory, hold status, or environment changes.

## 9. Document deletion procedure

This section describes the approved workflow; it does not authorize executing it.

1. Reconfirm environment, authenticated operator, organization ID, document ID, and approved scope.
2. Confirm whether the source has imported/confirmed activities and record the expected retained count.
3. Confirm no active extraction, confirmation, download, or customer export is in progress.
4. Capture approved pre-deletion evidence: document ID, opaque storage key reference, size/hash if already available, extraction/review counts, confirmed-record count, and timestamp. Do not copy content.
5. Use the authenticated application document-deletion action.
6. If storage deletion fails, stop. The expected safe state is that the database document remains for retry. Record the failure and do not claim completion.
7. If the database step fails after source deletion, stop customer activity involving that source, record the missing-source state, and use the supported retry path after approval.
8. Verify:
   - the document is no longer listed;
   - authenticated download no longer returns the source;
   - extraction and spreadsheet review rows are removed;
   - confirmed activity records intended to remain are present;
   - calculations/reports remain consistent where source-independent records are expected; and
   - the deletion audit/event exists without exposing customer content in the register.
9. Record result, evidence, retry count, final status, and related backup expiry.

## 10. Workspace erasure dry-run and execution

### 10.1 Dry-run

1. Use only the platform-admin protected dry-run endpoint or approved administrative interface.
2. Confirm the platform administrator is not operating from the target workspace.
3. Supply the exact organization ID and capture the returned counts without customer payloads.
4. Reconcile users, memberships, facilities, assets, documents/files, extractions, review rows, activities/snapshots, imports, metrics, reports/artifacts, AI jobs, organization-owned factors, audit logs, feedback, and activity events with the counts returned by the dry run. The current dry-run response does not report quota-policy, quota-period, or quota-usage counts; record that limitation and do not infer a zero count.
5. Investigate unexplained differences. Do not approve erasure based on an unreconciled inventory.
6. Identify unsupported report artifacts. Any such artifact blocks execution.

### 10.2 Execution

1. Obtain fresh two-person approval after dry-run reconciliation.
2. Reconfirm exact organization ID, exact slug, explicit confirmation flag, environment, and evidence destination.
3. Use only the protected workspace-erasure workflow.
4. If managed-file deletion fails, the expected behavior is to retain database data for safe retry. Record failure and stop.
5. If database deletion fails after source cleanup, record the partial state and use the supported retry path. Do not recreate source files or manually delete rows.
6. An `ALREADY_ERASED` result is acceptable only when the prior completed-erasure evidence matches the approved target.

### 10.3 Verification

Verify that:

- the organization and organization-owned active data are no longer accessible;
- managed source objects are deleted or were already missing as recorded;
- cross-tenant authentication cannot access the erased identifiers;
- unsupported report artifacts are absent;
- only the minimized organization-hash erasure evidence remains as designed;
- no secret or source content appears in the evidence package; and
- backup expiry and post-restore actions are recorded.

## 11. Verification and evidence package

Each completed destructive operation needs:

1. request or retention-review ID;
2. target organization and resource IDs;
3. requester verification evidence reference;
4. legal-hold decision reference;
5. operator and independent approver;
6. pre-operation inventory/counts and timestamp;
7. operation type and result;
8. post-operation checks and timestamp;
9. failures, retries, and resolution;
10. backup pair IDs, expiry dates, and restoration restrictions;
11. customer notification date; and
12. restricted evidence location and integrity checksum when available.

Evidence must be sufficient to explain what was deleted and retained without becoming another copy of the deleted data.

## 12. Backup expiry reconciliation

1. List every recovery point whose creation time precedes active-system deletion and whose expiry is later than deletion.
2. Confirm the database recovery point and document archive share a pair ID or document the consistency difference.
3. Record provider, immutable/manual status, retention rule, expected expiry, and responsible owner.
4. Do not claim final backup deletion until provider behavior or independent-backup destruction is verified.
5. Review overdue backup expiry weekly. Escalate missing evidence or a changed provider schedule.
6. When the last applicable recovery point expires, record the verification date and notify the case owner.

## 13. Post-restore erasure review

Before any restored environment becomes customer-accessible:

1. identify the recovery-point time and pair ID;
2. keep the destination isolated and disable external side effects;
3. compare the recovery-point time with every completed deletion and offboarding effective time;
4. create a post-restore action for each deletion newer than the recovery point;
5. reapply the approved deletion using supported application workflows;
6. verify document/file checksums and database/file consistency;
7. verify tenant isolation, authenticated download, activities, snapshots, reports, and audit evidence using synthetic or authorized test identities;
8. record the post-restore erasure result and independent review; and
9. allow customer access only after all required deletions and holds are reconciled.

Never use a restored backup to silently reverse an approved customer deletion.

## 14. Customer notification

Use legal-approved templates. Notifications should distinguish:

- request acknowledgement;
- identity or authority clarification;
- advance draft/source deletion notice;
- active-system deletion completion;
- retained contract/legal exceptions;
- backup survival and latest expected expiry;
- failed or delayed deletion; and
- final backup-expiry confirmation where promised.

Do not state that “all data is permanently deleted” unless active systems, subprocessors, backups, independent copies, legal exceptions, and evidence retention have all been verified against the approved policy.

## 15. Suggested notification fields

### Acknowledgement

- Request ID
- Date received
- Organization
- Scope as understood
- Verification needed
- Target response date
- Contact channel

### Completion

- Request ID
- Active-system completion date
- Scope completed
- Data intentionally retained and approved reason
- Latest expected backup expiry date
- Customer action, if any
- Contact for questions

## 16. Exception and retry handling

| Condition | Required response |
| --- | --- |
| Storage deletion failure | Stop; retain database state; record exception; retry only after review. |
| Database failure after source deletion | Restrict affected workflow; record partial state; use supported retry. |
| Unsupported report artifact | Stop workspace erasure; identify adapter/owner and deletion evidence. |
| Legal hold discovered after approval | Cancel approval; preserve scoped data; notify legal/privacy reviewer. |
| Wrong organization/resource suspected | Stop immediately; do not retry; initiate incident review. |
| Backup expiry missed | Escalate to infrastructure owner and legal/privacy reviewer; update customer wording if necessary. |
| Restored deleted data | Isolate destination; reapply approved deletion; complete incident/post-restore review before access. |
| Temporary file exceeds target | Record exception; verify exact path and ownership; obtain cleanup approval. |

## 17. Weekly sign-off checklist

- [ ] Current approved policy version confirmed; draft values not treated as approved.
- [ ] All active pilot organizations reviewed.
- [ ] Pilot-end, notice, offboarding, and next-review dates checked.
- [ ] Open deletion requests reviewed for identity, scope, holds, approval, and deadlines.
- [ ] Temporary-file exceptions reviewed without content exposure.
- [ ] Abandoned-draft candidates reviewed under the approved inactivity definition.
- [ ] Backup pairs, retention, expiry, independent copies, and restore evidence checked.
- [ ] Post-restore deletion reconciliation completed for any restoration.
- [ ] Overdue items assigned to an owner and escalated.
- [ ] Review outcome and evidence reference recorded.

## 18. Current implementation limits to retain in owner review

- The application has no retention-deadline or deletion-request case model and no automatic retention scheduler. Persistent Legal Hold records and shared deletion guards now exist locally, and recoverable deletion has durable intents plus an exact-ID manual purge workflow. These controls are not production deployed or operationally approved, and workspace erasure does not enforce an independently signed second-person approval bound to the exact operation.
- Normal upload handling cleans temporary files, but no crash-orphan age sweeper exists.
- Drafts and extraction artifacts have no independent expiry.
- Document-deletion audits can retain the prior document object, including extracted fields, unless payload minimization is implemented and approved.
- AI job rows can retain prompt, input, output, and error payloads without an independent expiry.
- Optional analytics and error-monitoring retention depends on enabled providers and their approved configuration; repository wording alone does not prove provider-side expiry or deletion.
- Confirmed accounting records survive source deletion and require a separate contract decision.
- Workspace erasure handles managed files and database data but not unknown external report artifacts.
- Actual Render durable-disk/snapshot and Neon backup/PITR settings are not proven by repository documentation.
- Backup restoration can reintroduce data deleted after the recovery point unless this runbook is followed.
