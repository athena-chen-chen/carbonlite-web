# CarbonLite Paid-Pilot Data Retention Policy — P0-04 Review Draft

**Status:** Review draft only. Not approved, effective, or customer-facing.
**Prepared:** November 6, 2026
**Preserved source:** `../carbonlite-paid-pilot-data-retention-policy.md`
**Applies to:** Proposed invitation-only pilot for 1–3 organizations
**Real customer data:** **NO-GO**

## Change notes

- Corrects stale statements by recognizing the locally implemented persistent Legal Hold model and shared deletion guards.
- Distinguishes recoverable quarantine from permanent deletion and from backup expiry.
- Records that workspace erasure does **not** enforce an independently signed, operation-bound second-person approval.
- Keeps backup/provider recovery as unverified and makes all numeric recovery values proposals only.
- Retains a manual review model for the initial pilot; no automatic retention scheduler is required by this draft.
- Does not approve a statutory period, legal deadline, provider configuration, production control, or real-data use.

## 1. Purpose and authority

Kach Canada Ltd. proposes this policy to minimize paid-pilot data, keep necessary accounting and security evidence, support verified requests and offboarding, prevent deletion under an authorized Legal Hold, and reconcile active-system deletion with recoverable copies and backups.

The policy becomes operative only after the business owner and qualified legal/privacy reviewer approve the exact rules, effective date, owner assignments, customer wording, and evidence prerequisites. Infrastructure approval is also required for provider, backup, and expiry claims.

## 2. Scope

Covered data includes accounts and memberships, uploaded sources and metadata, temporary upload files, extraction/draft data, confirmed activity and provenance records, reports, AI jobs, support and telemetry, deletion evidence, quarantine, and paired recovery points controlled by Kach.

Customer-downloaded files and customer-controlled systems are outside Kach's deletion control. Provider-side behavior is not established until verified against the actual account, configuration, contract, region, and retention settings.

## 3. Data restrictions

Only business records necessary for the signed pilot scope may be submitted. Credentials, payment-card or banking credentials, government identity material, health/biometric/genetic/criminal information, employee files and payroll, data about minors, and unrelated or unauthorized data are prohibited unless a later written exception is approved after legal/privacy review.

Discovery of prohibited data stops routine processing. Restrict access, create a minimized incident record, and use only an authorized hold/deletion/incident workflow.

## 4. Proposed retention schedule

All periods below are proposed business or operational targets. They are not statutory periods or legal deadlines.

| Data class | Current locally evidenced control | Proposed rule for review | Required disposition |
| --- | --- | --- | --- |
| Original source documents | Authenticated deletion creates durable intent, moves bytes to private same-volume quarantine, deletes database metadata, and leaves confirmed activities/provenance separate. | Active-system deletion at approved pilot end + 30 calendar days, subject to holds, contract, export, verification, and backup disclosure. | Owner + legal/privacy approval; production evidence. |
| Temporary uploads | Normal paths attempt immediate cleanup; crash leftovers have no automatic age purge. | Internal 24-hour exception target only after exact-path testing; manual daily review may be used initially. | Owner + legal/privacy + technical evidence. |
| Extraction and drafts | Source deletion cascades linked extraction/review rows; no age scheduler exists. | Extraction follows source. Review drafts after 30 inactive days and give 14 days' notice before separately authorized deletion. | Define meaningful activity, notice, and extension rule. |
| Confirmed records and provenance | Persist independently of source deletion; workspace erasure removes organization-owned records. | Contract-defined. Customer proposed as authoritative archive; no default period inferred. | Owner + legal/privacy; complete export evidence. |
| Reports/exports | Customer downloads are customer-controlled; backend artifacts may exist. | Align backend report data with confirmed records unless a shorter approved period applies. | Inventory every artifact store and supported deletion adapter. |
| Accounts/memberships | Exist while workspace exists and are subject to relation and session behavior. | Active pilot plus approved offboarding window. | Identity, deactivation, shared-user, and session rules. |
| AI job data | CarbonLite may persist job fields; `store: false` does not establish complete provider deletion. | Minimize fields; approve a CarbonLite expiry and verified provider rule before real-data AI use. | `AI-001`, legal/privacy, provider evidence. |
| Logs, quota, support, and deletion evidence | Some records survive or cascade differently; current audit payloads may be excessive. | Separate minimized periods; no period becomes binding until field-level expiry and access controls exist. | Owner + legal/privacy + technical evidence. |
| Quarantine | Recoverable copies remain until an exact-ID, dry-run-gated purge is separately approved. | Treat quarantine as restricted recoverable deletion state, not completion or backup. | Hold check, reviewer, purge authority, evidence, and expiry decision. |
| Paired backups | Local paired restore rehearsals passed; provider and independent backup operations are not verified. | Proposed daily + pre-change paired capture, 14-day rotation, 24-hour internal RPO, and maximum 30-day deleted-data survival. No RTO selected. | Provider proof, restore/expiry evidence, owner/legal/infrastructure approval. |

## 5. Legal Holds

Persistent organization- and document-scoped Legal Holds exist locally. Guarded document deletion, workspace erasure, dependent destructive paths, and quarantine purge fail closed when an applicable hold is active. Hold release does not delete or resume deletion automatically.

Only the designated legal/privacy authority may approve a hold's basis, scope, modification, or release. Technical activation/release and provider/direct-access bypass controls still require approved roles, production deployment, least privilege, and operational evidence. Privileged facts belong in a restricted legal source of truth, not the general register.

## 6. Deletion, quarantine, and erasure

Source deletion, confirmed-record deletion, workspace erasure, quarantine purge, provider deletion, backup expiry, and evidence expiry are separate events.

The local workspace-erasure workflow supports dry-run inventory, exact organization confirmation, recoverable quarantine, organization cascade, retry, and minimized hashed evidence. It does not technically require a signed second-person approval packet bound to the exact operation, release SHA, inventory, environment, and expiry. Until that control or an approved equivalent exists and is rehearsed, real-customer erasure remains NO-GO.

No deletion request is complete solely because an API returns success. Completion evidence must cover the approved scope, active systems, unsupported artifacts, quarantine disposition, provider state where applicable, backup expiry, retained exceptions, and customer communication.

## 7. Manual retention operation

For the initial 1–3 organization pilot, an assigned retention coordinator may conduct a weekly register review and daily temporary-file exception review. Manual operation is acceptable only when:

1. named primary and backup owners are assigned;
2. every due item has an owner, next action, and evidence reference;
3. holds and contract exceptions are checked before destructive work;
4. operator and independent reviewer are separate;
5. exact supported application workflows are used; and
6. missed targets escalate and do not silently change the due date.

Automation should be reconsidered when volume, missed reviews, staff availability, or risk makes this process unreliable. This draft does not authorize automatic deletion of confirmed records or held data.

## 8. Customer requests and offboarding

Verify identity, organization, authority, scope, and channel. Acknowledge receipt using approved wording, then assess holds, contract records, export, active systems, quarantine, backups, providers, and evidence. Counsel must determine applicable legal deadlines; internal targets must be labelled as such.

Proposed offboarding provides a 14-day export opportunity and targets active-system completion within 30 calendar days after the later approved trigger, export window, and hold/contract clearance. Account suspension is not erasure. Active-system completion is not backup expiry.

## 9. AI and subprocessors

Real-data AI processing is disabled by policy until `AI-001` identifies and approves the exact provider, region, terms, retention, abuse-monitoring behavior, minimization, customer authorization, and fallback. Human review remains mandatory. Spreadsheet/manual entry is the fallback.

The final subprocessor schedule must list only providers actually enabled and verified. It must state purpose, data classes, location, retention/deletion, safeguards, DPA status, and material-change process.

## 10. Recovery and restoration

Database and document recovery points must be paired or explicitly reconciled. Local recovery rehearsals do not prove provider capability. A restored environment remains isolated until later deletion/offboarding events and Legal Holds are reconciled, required deletions are replayed, and independent review is complete.

No recovery guarantee or RTO is approved. Prior four-hour and two-business-day RTO proposals remain rejected as current commitments pending a defined scenario and measured evidence.

## 11. Evidence and review

Use opaque IDs, hashes, counts, timestamps, status, operator/reviewer identities, and restricted evidence references. Do not put customer payloads, extracted text, legal narrative, credentials, or secrets into trackers or general evidence.

Review quarterly during the pilot and after a material product, provider, contract, legal, or incident change. Each revision requires version, rationale, impacted customer language, approvers, effective date, and evidence.

## 12. Readiness

- **GO for founder and legal/privacy review:** Yes.
- **GO for contract use:** No.
- **GO for production retention operations:** No.
- **GO for real-data paid pilot:** No.
