# CarbonLite Optional AI Processing Schedule — Customer Review Draft

**Proposed schedule version:** `CARBONLITE-AI-PILOT-CUSTOMER-v0.2-review`
**Status:** Review draft only; not approved, offered, signed, or effective
**Provider:** OpenAI
**Related task:** `AI-001`
**Decision:** `DEC-PENDING-004` remains `PENDING`
**Founder preference state:** `PENDING_FOUNDER_APPROVAL`

This schedule is proposed for attachment to a Controlled Paid Pilot Agreement between Kach Canada Ltd. (“Kach”) and the Customer. It describes the Customer's choice about optional AI-assisted document extraction in CarbonLite. It requires founder and qualified legal/privacy approval before use.

## 1. AI processing is optional

AI-assisted document extraction is optional and disabled by default for each Customer organization. Uploading a document, accepting general website terms, or acknowledging a privacy notice does not authorize AI processing.

If the Customer declines AI processing, CarbonLite will keep AI-assisted extraction disabled for the Customer organization. The Customer may still use manual entry and supported local processing for approved spreadsheet or structured-data formats. These non-AI options do not provide local extraction for every file type. In the current pilot design, automated extraction from PDF, CSV, JPEG, and PNG files depends on AI processing.

## 2. What the AI feature does

If the Customer authorizes AI processing, CarbonLite may use OpenAI to prepare draft activity-data rows from an eligible document. The draft may include dates, quantities, units, locations, facilities, costs, source references, and other information relevant to the pilot.

For an authorized request, Kach may send OpenAI:

- the complete contents of an eligible PDF, CSV, JPEG, or PNG document;
- the filename for some PDF or CSV inputs;
- instructions describing the extraction task; and
- a structure describing the requested draft output.

The complete file may contain personal, confidential, or irrelevant information that is embedded in the document or filename. The Customer should therefore review and minimize every document before submission.

## 3. Proposed document classes

The following proposed classes are **PENDING founder approval**:

- electricity bills;
- natural gas bills;
- fuel purchase invoices; and
- other specifically approved energy or activity records.

This list describes proposed pilot document classes. It does not mean that every listed class, file format, layout, or data field is currently supported by AI extraction. The signed pilot scope must identify the document classes and formats approved for the Customer.

Unless Kach approves an exception in writing after qualified legal/privacy review, the Customer must not submit:

- passwords, API keys, security credentials, or other secrets;
- payment-card details, banking credentials, or government identity documents;
- health, biometric, genetic, or criminal information;
- employee files, payroll, job-applicant records, or performance records;
- information about minors;
- privileged legal material;
- export-controlled or specially regulated information outside the approved pilot scope; or
- unrelated, excessive, or unauthorized personal or confidential information.

## 4. Customer authority and data rights

The Customer confirms that its authorized representative may make this choice for the identified organization. The Customer must have the rights, permissions, and authority needed to provide each document and instruct Kach to process it. The Customer is responsible for providing any required notices and for limiting submissions to approved, necessary data.

The Customer should keep its original documents and authoritative business records. It must restrict CarbonLite access to authorized users.

## 5. OpenAI data practices and processing location

OpenAI and its subprocessors may process information outside Canada, where foreign laws may apply. Kach does not promise that Customer information will be stored or processed only in Canada.

OpenAI's public documentation states that API data is not used to train or improve OpenAI models by default unless the API customer opts in, subject to the applicable provider terms. Kach's current data-sharing settings are reported as disabled, but the exact account and configuration must be verified before activation.

CarbonLite currently requests that OpenAI not retain the generated response as ordinary application state for later retrieval. This setting does not provide Zero Data Retention. Unless different approved account controls are verified, OpenAI's abuse-monitoring logs may contain prompts, responses, and related information for up to 30 days. Longer retention or separate handling may apply when required by law or reasonably necessary for safety, security, or protection of OpenAI's services or third parties. File and image safety-review exceptions may also apply.

Kach does not promise immediate deletion of OpenAI logs or other provider-held records.

## 6. Accuracy, review, and responsibility

AI extraction may be incomplete, inaccurate, or misleading. It may miss information or misread dates, quantities, units, locations, categories, or other document details. AI output is a draft. It is not a verified source record, professional advice, regulatory filing, assurance opinion, certification, or guarantee of compliance.

Before confirming or relying on an AI-derived result, the Customer must review the source document, extracted rows, dates, quantities, units, locations, reporting boundary, factor selection, calculation provenance, exclusions, and exports. The Customer remains responsible for its authoritative records and for obtaining any professional review it requires.

These Customer review obligations do not remove or reduce Kach's contractual or legal obligations. Kach remains responsible for the duties it accepts under the signed Pilot Agreement, this schedule, and applicable law.

## 7. CarbonLite retention and deletion

Kach's retention and deletion rules are separate from OpenAI's retention. Deleting a document or organization from CarbonLite does not prove that OpenAI has immediately deleted abuse-monitoring logs, safety records, or other provider-held information.

CarbonLite source documents, extraction drafts, confirmed records, reports, audit evidence, and operational records follow the approved Pilot Agreement and retention schedule. Active-system deletion may be subject to valid Legal Holds, legal or contractual preservation duties, security investigations, disputes, and approved evidence-retention exceptions.

Access-restricted backup or recovery copies may remain until their approved expiry. A later restore may require Kach to reapply eligible deletion records before restored information is made available. Kach cannot delete copies already downloaded or otherwise controlled by the Customer.

The exact CarbonLite retention periods, backup expiry rules, and exceptions remain **PENDING founder and qualified legal/privacy approval**.

## 8. Withdrawal

The Customer may request prospective withdrawal of its AI authorization by emailing **carbonliteai@gmail.com**. Kach will verify the requester's identity, organization, authority, and requested scope before acting on the request. This proposed channel remains `PENDING_FOUNDER_APPROVAL`.

Kach proposes to acknowledge a verified withdrawal within **2 business days**. This acknowledgement target remains `PENDING_FOUNDER_APPROVAL` and **PENDING operational approval** and is not effective until included in an approved schedule.

Once withdrawal is verified, Kach must promptly disable new AI provider requests for the Customer organization. The 2-business-day acknowledgement target does not permit Kach to delay that technical disablement. Withdrawal cannot retroactively cancel a request that is already complete or in flight. It does not itself delete source documents, drafts, confirmed records, audit evidence, backups, Customer-controlled copies, or provider-held records. Those items remain subject to the applicable retention, deletion, Legal Hold, and exception rules.

## 9. Customer choice

Select exactly one choice. Both choices must remain unchecked until the authorized representative makes the Customer's election.

- [ ] **AUTHORIZE** optional AI processing. The Customer authorizes Kach Canada Ltd. to use OpenAI for the approved organization, purpose, document classes, locations, and data-handling terms described in the approved version of this schedule.

- [ ] **DECLINE** AI processing. Kach will keep AI-assisted extraction disabled for the Customer organization. The Customer will use the supported manual or local-processing options, subject to their file-format and feature limitations.

Customer legal name: ________________________________________
Authorized representative name and title: ________________________________________
Signature: ________________________________________
Date and timezone: ________________________________________
Schedule version: ________________________________________

## 10. Review and approval status

Founder/business approval: `PENDING`
Legal/privacy approval: `PENDING`
Infrastructure/security verification: `PENDING`
Approved customer schedule version: `PENDING`
Effective date: `PENDING`

This draft does not authorize AI processing, change production settings, or permit use of real Customer data.
