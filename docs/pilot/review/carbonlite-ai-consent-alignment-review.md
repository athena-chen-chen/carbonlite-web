# CarbonLite AI Consent Alignment Review

**Task:** `AI-001`
**Prepared:** 2026-11-06; reconciled 2026-11-07
**Status:** Customer review draft prepared; no approved or public document changed
**Real-data AI:** **NO-GO**

## 1. Current alignment result

The local organization authorization gate can enforce a versioned, provider-specific, scope-specific election after approval and deployment. A concise customer schedule now consolidates the proposed organization election and material disclosures for qualified review, but no schedule is approved or effective. The existing public Privacy Policy gives general notice that OpenAI may receive document content, but it does not establish optional organization-level authorization. The public Terms do not adequately describe the AI provider, whole-file transmission, cross-border processing, withdrawal, or fallback.

## 2. Artifact comparison

| Artifact | Current position | Required review edit |
| --- | --- | --- |
| Controlled Paid Pilot Agreement review draft | AI disabled unless `AI-001` and Schedule B authorize it; human review and non-AI workflow stated. | Attach the versioned AI schedule; define precedence; identify the exact verified provider/account boundary; separate customer election from Kach production activation. |
| Retention Policy review draft | AI-job and provider retention remain pending; `store:false` is not complete provider deletion. | Insert the approved CarbonLite draft/job/log periods and provider exception wording only after `RET-002` and provider review. |
| Privacy Policy | Says requested AI extraction may send document content to OpenAI and processing may occur outside Canada. | State AI is optional/default-disabled; disclose complete eligible files and PDF/CSV filenames; identify non-AI workflows, provider/default retention, human review, prospective withdrawal, and the separate signed schedule. Do not imply Canadian residency or ZDR. |
| Terms of Use | Requires upload rights and review of extracted results. | Add a paid-pilot carve-out; prohibit unauthorized/sensitive uploads; state AI is governed by the signed schedule and ordinary upload is not consent; preserve human review and non-AI use. |
| Onboarding/upload disclosure | General authorized-upload warning; no approved AI-specific election UI. | Before an AI action, show the schedule version, whole-file/provider/cross-border/retention notice, current organization status, and non-AI choice. Do not use prechecked boxes. |
| AI Consent Gate | Default deny, exact version/provider/scope, evidence references, verifier, effective/expiry/withdrawal checks, and global gate. | Deploy only after approval. Add operational evidence custody and a controlled admin runbook. Do not treat the record as proof that legal/provider/production prerequisites closed. |

## 3. Consent mechanism assessment

| Mechanism | Assessment |
| --- | --- |
| Privacy Policy notice alone | Insufficient for the proposed organization-specific election. It is general notice and is not tied to version, scope, provider, representative authority, or withdrawal evidence. |
| Terms acceptance alone | Insufficient. It does not currently contain the necessary AI details and should not silently amend a signed pilot schedule. |
| Ordinary file upload | Must not be treated as consent. Upload authority and AI processing authorization are distinct. |
| Prechecked AI box | Not permitted by the proposed design. |
| Per-user click without organization authority | Insufficient for organization enablement. A user may lack authority to bind the customer or approve whole-file third-party processing. |
| Signed schedule plus explicit organization election | Recommended for the controlled paid pilot, subject to legal review. It supports version, scope, provider, representative, evidence, effective date, and withdrawal. |
| Local admin authorization record | Appropriate enforcement evidence after all prerequisites close. It is not the signed authorization itself and should store references rather than raw agreement content. |

## 4. Gate-to-evidence mapping

| Gate field/control | Proposed evidence | Current boundary |
| --- | --- | --- |
| Organization | Customer legal entity and exact CarbonLite organization | Implemented locally; production deployment pending. |
| Status | Explicit `ENABLED`, `DISABLED`, or `WITHDRAWN` election | Implemented locally. Default absence denies. |
| Consent version | Exact approved schedule/version | Field implemented; no approved version exists. |
| Provider | `OPENAI` | Implemented; contracting/account evidence open. |
| Processing scope | `DOCUMENT_EXTRACTION` | Implemented; document classes still require approval. |
| Evidence reference | Restricted signed schedule reference | Implemented; evidence repository/owner open. |
| Authorized representative | Customer authority reference | Implemented as a reference; legal sufficiency open. |
| Verifier and effective time | Authorized Kach operator and date | Implemented; role assignment/runbook open. |
| Expiry/withdrawal | Optional expiry and prospective withdrawal record | Implemented; customer timing and communication open. |
| Global activation | Separate environment flag and configured current consent version | Implemented locally; not deployed or approved. |

## 5. Data-processing responsibility matrix

Roles below are operational descriptions, not legal conclusions. Qualified counsel must determine controller/processor roles for each relationship and data class.

| Data category | Operational responsibility and purpose | Location/residency | Retention/deletion status | Evidence | Remaining gap |
| --- | --- | --- | --- | --- | --- |
| Customer source documents | Customer supplies authorized records; Kach hosts and uses them for pilot processing; OpenAI processes authorized files for extraction. | CarbonLite production location unverified; OpenAI project owner-reported Global. | CarbonLite 30-day preference pending; provider logs separate. | Code/provider audit; `FDR-2026-002`. | Legal roles, production stores, approved period, provider expiry. |
| PDF/CSV filenames | Kach transmits original filename with file input for extraction context. | OpenAI Global boundary; exact infrastructure unknown. | May enter provider logs; no separate CarbonLite filename expiry. | Code review. | Minimize filenames and prohibit embedded personal/sensitive data. |
| AI request payloads | Kach determines extraction instructions and sends complete eligible file content. OpenAI DPA publicly describes processor role for Customer Data. | Global project; outside-Canada processing possible. | `store:false` avoids ordinary stored response state; default abuse-monitoring retention remains possible. | Code; official DPA/data controls. | Account DPA, ZDR/MAM, subprocessor and regional evidence. |
| AI responses | OpenAI returns draft structured activity rows; Kach normalizes and stores review drafts. | Transit from OpenAI; CarbonLite production location unknown. | CarbonLite draft expiry not approved; provider response may enter abuse logs. | Code/schema review. | `RET-002` period and deletion rehearsal. |
| Extraction drafts | Kach stores `DocumentExtraction` draft for human review. | CarbonLite database; production provider/region unverified. | Cascades with source deletion; no independent age expiry. | Code/schema review. | Approved deadline, scheduler/manual procedure, production proof. |
| AI job metadata | Kach stores organization/document/user/status/timing metadata for quota workflow. | CarbonLite database. | No approved independent expiry; optional payload fields remain a future risk. | Schema/code review. | Field minimization and retention rule. |
| Audit/security logs | Kach records authorization state changes and operational metadata; raw signed evidence is referenced, not copied. | CarbonLite logging/monitoring locations unverified. | Audit retention remains undecided. | Gate implementation. | Access, retention, monitoring providers, incident process. |
| OpenAI abuse-monitoring logs | OpenAI uses logs to enforce policies and prevent harmful use. | OpenAI-managed infrastructure; exact locations and subprocessors not verified. | Up to 30 days by default, with legal/harm and file/image exceptions; ZDR/MAM not verified. | Official data-controls page. | Account-specific control evidence and customer wording. |
| Backups/recovery copies | Kach/infrastructure providers may hold database and document recovery copies. | Production/backup providers and regions unverified. | Backup expiry remains undecided and separate from active-system deletion. | Retention/recovery drafts. | Provider proof, expiry rehearsal, legal approval. |
| Customer exports | Kach generates approved reports/exports; Customer controls downloaded copies. | Customer-selected systems after download. | CarbonLite copies follow confirmed-record/report policy; customer copies are outside Kach deletion control. | Agreement/retention drafts. | Approved report period and customer offboarding wording. |

## 6. Suggested edits

### Paid Pilot Agreement

Add: “AI-assisted extraction is optional and disabled by default. It may be enabled only for the Customer organization identified in the signed AI Processing Schedule, for the exact provider, processing scope, document classes, and schedule version recorded there. Customer authorization does not itself activate production processing. Kach must separately complete provider verification, internal approval, deployment, and activation controls.”

### Privacy Policy

Replace the current general AI paragraph only after approval with language that states complete eligible files and PDF/CSV filenames may be sent to OpenAI; processing may occur outside Canada; default provider abuse-monitoring retention may apply; AI output requires review; the customer may choose supported non-AI workflows; and withdrawal blocks new requests prospectively.

### Terms of Use

Add a paid-pilot provision stating that AI processing is governed by the signed pilot agreement and schedule. Uploading a document or accepting general Terms does not authorize optional AI processing. Customer must have authority for the full file and must avoid prohibited data.

### Onboarding and upload

Display the current organization AI status and schedule version before the AI action. When disabled, direct users to manual entry and local `.xlsx`/`.json` processing. When enabled, repeat a short whole-file/provider/cross-border/human-review notice. Do not add an activation control for ordinary users.

## 7. Remaining inconsistencies and blockers

- The Organization display name, Project name, Billing Preferences company name, Global geography, voluntary data-sharing settings, and project-key suffix alignment are owner-reported, not independent provider or contracting-party proof.
- Actual payment/invoice evidence, accepted Business Terms or other governing agreement, DPA applicability/incorporation, current subprocessors, ZDR/MAM, and production configuration remain `UNKNOWN`.
- CarbonLite AI draft/job/log retention and provider-artifact treatment remain pending.
- No schedule version is approved or signed.
- The gate is not deployed, and the independent global activation flag remains unauthorized.

## 8. Material contract consistency check

| Material issue | Current consistency result | Required disposition |
| --- | --- | --- |
| Optional/default-off AI | Agreement draft and revised schedule align; public Privacy/Terms do not yet provide the complete versioned election. | Keep public content unchanged until `COM-003` legal/privacy review. |
| Global residency / cross-border processing | Agreement and schedule disclose possible processing outside Canada. No Canadian-only claim is supportable. | Verify provider/account configuration and approve the customer wording. |
| Full-file and filename transmission | Revised schedule discloses complete eligible PDF/CSV/JPEG/PNG content and some filenames. Existing public Privacy language is less specific. | Align Privacy, Terms, onboarding, and upload notice only after approval. |
| Provider retention and `store:false` | Revised schedule distinguishes ordinary Responses storage from abuse-monitoring retention and does not claim ZDR. | Verify account controls and retain the up-to-30-day default disclosure unless stronger evidence exists. |
| Withdrawal | Schedule correctly blocks new requests prospectively and does not promise retroactive cancellation or provider deletion. | Approve request channel, authority check, and acknowledgement timing. |
| CarbonLite 30-day proposal | Agreement/retention drafts treat the 30-day active-system boundary as pending, not approved; provider retention is separate. | Resolve `RET-002`; do not promise backup or provider deletion within the active-system period. |
| Backups and Legal Holds | Agreement and schedule preserve separate expiry and Legal Hold exceptions. | Approve exact periods, authority, and customer wording under `RET-002`, `LGL-002`, and `DEL-002`. |
| Human review | Agreement, schedule, and product evidence consistently require review of extraction and calculations. | Preserve this requirement in the approved customer documents and onboarding flow. |
| Proposed document classes | The customer draft lists electricity bills, natural gas bills, fuel invoices, and other approved energy/activity records. This remains pending founder approval and does not claim every class or format is supported. | Reconcile the final list to the signed pilot scope and verified extraction capability. |

No additional material contradiction was identified among the Controlled Paid Pilot Agreement review draft, Privacy/Terms review drafts, pending `RET-002` retention position, the customer schedule, and the local `AI-001` gate. The unresolved items above are approval or implementation gaps, not silent changes to approved documents.

## 9. Alignment conclusion

- **GO:** founder and qualified legal/privacy review of the schedule and proposed edits.
- **NO-GO:** silently modify or publish the Privacy Policy, Terms, Agreement, or onboarding flow.
- **NO-GO:** record an organization as enabled.
- **NO-GO:** real-data AI processing.
