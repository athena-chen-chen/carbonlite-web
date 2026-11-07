# CarbonLite Optional AI Processing Schedule — Review Draft

**Proposed schedule ID:** `CARBONLITE-AI-PILOT-v0.2-review`
**Status:** Review draft only; not approved, offered, signed, or effective
**Provider:** OpenAI; exact contracting entity and account relationship pending verification
**Decision:** `DEC-PENDING-004` remains `PENDING`

This schedule is proposed for attachment to a signed Controlled Paid Pilot Agreement between Kach Canada Ltd. and the customer. Qualified legal/privacy review is required before use.

## 1. Optional service

AI-assisted extraction is optional and disabled by default for each Customer organization. Customer may use manual entry and supported local parsing of approved `.xlsx` and `.json` files without authorizing AI processing. PDF, CSV, JPEG, and PNG extraction is AI-dependent in the current implementation and is unavailable when AI is disabled.

An ordinary upload, website Terms acceptance, Privacy Policy acknowledgement, or user click does not authorize AI processing. Kach enables AI only after the prerequisites in this schedule are satisfied and separately recorded.

## 2. Purpose and processing scope

If Customer elects AI-assisted extraction, Kach may use OpenAI's Responses API to prepare draft activity-data rows from eligible Customer documents. The approved processing scope is `DOCUMENT_EXTRACTION`. AI output is a draft for human review and is not a verified source record, certification, assurance opinion, or professional advice.

## 3. Data sent to OpenAI

For each authorized extraction request, Kach may transmit:

- the complete contents of an eligible PDF, CSV, JPEG, or PNG file;
- the PDF or CSV filename where the file-input format includes it;
- extraction instructions and a structured-output schema; and
- any personal or confidential information embedded in the full source file, whether or not it is relevant to the intended extraction.

Kach does not intentionally place CarbonLite organization IDs, user IDs, or user email addresses in the inspected OpenAI request payload. This does not remove identifiers contained inside a document or filename.

**Allowed document classes:** only the operational invoices, receipts, utility statements, travel records, fuel records, shipping records, and other business documents expressly listed in the signed pilot scope and necessary for the approved extraction purpose.
**Prohibited document/data classes:** credentials or secrets; payment-card or banking credentials; government identity documents; health, biometric, genetic, or criminal information; employee files, payroll, or job-applicant records; information about minors; privileged legal material; export-controlled or regulated information outside the approved pilot; and unrelated, excessive, or unauthorized information. No exception applies unless Kach and the Customer approve it in a separately reviewed written amendment after qualified legal/privacy review.

## 4. Provider, model, and location

- Provider: OpenAI
- API: Responses API, `/v1/responses`
- Current application model: `gpt-4o-mini`
- Current application request: `store:false`
- Project: `CarbonLite` (`OWNER_REPORTED`)
- Project geography: Global (`OWNER_REPORTED`)
- Actual OpenAI contracting party, account agreement, DPA status, ZDR/MAM status, and subprocessor list version: **[verify before signature]**

OpenAI and its subprocessors may process data outside Canada, where foreign laws may apply. Global project geography does not promise Canadian storage or inference. Kach must not state that all data remains in Canada.

## 5. Provider use, retention, and exceptions

OpenAI's public documentation states that API data is not used to train or improve models by default unless the API customer explicitly opts in, subject to the applicable provider terms. Kach's data-sharing settings are owner-reported as disabled and require secret-free account evidence before activation.

`store:false` avoids ordinary stored-response application state for the inspected foreground Responses API request. It does not provide Zero Data Retention. Unless different approved account controls are verified, OpenAI's default abuse-monitoring logs may contain prompts, responses, and derived metadata for up to 30 days, with longer legal or harm-prevention exceptions. Potential CSAM detections may cause image or file inputs to be retained for manual review even under enhanced retention controls.

Kach's own retention and deletion rules are separate from OpenAI's provider retention. Deleting a CarbonLite source document or workspace does not prove immediate deletion of provider abuse-monitoring or exception records. CarbonLite active-system deletion, backup expiry, minimized deletion evidence, and Legal Hold treatment are governed by the approved pilot retention terms. Those rules remain pending and may include disclosed backup, legal, contractual, security, and Legal Hold exceptions.

## 6. Accuracy and human review

AI extraction may be incomplete, inaccurate, or misleading. Customer must review the source, draft rows, activity type, dates, quantities, units, location, factor selection, provenance, calculations, exclusions, and exports before confirmation or reliance. Customer remains responsible for its authoritative records and professional review.

## 7. Customer responsibilities

Customer represents that it:

1. is authorized to enter this schedule and instruct Kach to process the approved data;
2. has provided required notices and obtained required rights, permissions, and authorizations;
3. will upload only approved, necessary data and will not upload prohibited data;
4. will maintain originals and an authoritative archive;
5. will restrict access to named authorized users; and
6. will complete human review before confirming or using AI-derived data.

## 8. Election

Select exactly one. Both choices must be shown unchecked. Neither option may be prechecked.

- [ ] **AUTHORIZE optional AI processing.** On behalf of **[Customer legal name]**, I authorize Kach Canada Ltd. to use the identified OpenAI service for the approved organization, document classes, provider, model, processing scope, locations, and retention boundary described in this schedule.
- [ ] **DECLINE AI processing.** Kach will keep AI disabled for the Customer organization. Customer will use the supported manual or local-processing workflow.

Customer organization: ____________________
Authorized representative name and title: ____________________
Authority/evidence reference: ____________________
Schedule version: ____________________
Signature: ____________________
Date/time and timezone: ____________________

## 9. Withdrawal

Customer may withdraw its AI election prospectively through **[approved request channel]**. Kach will verify the requester, organization, authority, and scope, record a withdrawal reference, and disable new provider requests for that organization.

Withdrawal does not retroactively cancel a provider request already in flight. It does not itself delete source documents, CarbonLite drafts, confirmed records, audit evidence, backups, or provider-held records. Those items follow the approved retention, deletion, Legal Hold, and exception processes. Kach will provide **[approved acknowledgement/confirmation timing]** after verified withdrawal.

## 10. Activation prerequisites

The customer election is necessary but not sufficient. Before Kach records the organization as `ENABLED`, all four states must be independently satisfied:

| State | Required evidence |
| --- | --- |
| `CUSTOMER_AUTHORIZED` | Signed schedule, authorized representative, exact version, organization, allowed document scope, provider/model, effective date, and evidence reference. |
| `FOUNDER_APPROVED` | Dated approval of the optional-AI boundary, allowed/prohibited data, provider/region, retention, fallback, and activation authority. |
| `PROVIDER_VERIFIED` | Account/project ownership, contracting and DPA evidence, data-sharing settings, ZDR/MAM/default state, residency/endpoint, subprocessor review, key custody, and billing entity. |
| `PRODUCTION_ACTIVATED` | Approved migration/release, deployed gate, configured consent version, separate global activation decision, monitoring, rollback evidence, and synthetic production-shaped rehearsal. |

These states must not be merged into one checkbox.

## 11. Administrative record

After every prerequisite is satisfied, an authorized platform operator may use the protected organization administration workflow to record:

- organization ID;
- `ENABLED` status;
- exact consent schedule version;
- provider `OPENAI`;
- processing scope `DOCUMENT_EXTRACTION`;
- signed evidence reference;
- authorized-representative reference;
- verifier identity and verification time;
- effective date and optional expiry.

The endpoint must not be invoked from this draft. The independent global gate remains off until separately approved production activation.

## 12. Review fields

Founder/business disposition: `PENDING`
Legal/privacy disposition: `PENDING`
Infrastructure/security disposition: `PENDING`
Approved schedule version: `PENDING`
Effective date: `PENDING`
