# CarbonLite OpenAI Business Terms and DPA Review

**Task:** `AI-001`
**Prepared:** 2026-11-06; support and account-alignment evidence reconciled 2026-11-07
**Review type:** Legal/privacy approval preparation; not legal advice
**Decision state:** `DEC-PENDING-004` remains `PENDING`
**Real-data AI:** **NO-GO**

This review records public provider terms, repository evidence, and owner-reported account facts. It does not establish that Kach Canada Ltd. accepted a particular agreement or DPA, that the public terms govern the account, or that any account setting is independently verified.

## 1. Evidence labels

| Label | Meaning |
| --- | --- |
| `VERIFIED_FROM_PROVIDER` | Supported by an official OpenAI page accessed on 2026-11-06. |
| `VERIFIED_FROM_CODE` | Directly observed in the CarbonLite repositories. |
| `OWNER_REPORTED` | Supplied by the owner without independent account or contract verification in this run. |
| `OWNER_PROVIDED_SUPPORT_RESPONSE` | AI-assisted OpenAI Support guidance supplied by the founder. It is not legal advice, a signed agreement, or account-specific contractual certification. |
| `UNKNOWN` | Evidence is missing, inaccessible, or insufficient for the specific account. |

## 2. Official source register

| Source | Public title and date | Access result |
| --- | --- | --- |
| [OpenAI Business Terms](https://openai.com/policies/business-terms) | Current effective date not independently verified in this reconciliation | Founder-provided support says these are the general terms for self-service API use; `OWNER_PROVIDED_SUPPORT_RESPONSE`. Account acceptance remains `UNKNOWN`. |
| [OpenAI Data Processing Addendum](https://openai.com/policies/data-processing-addendum/) | Prior review recorded updated December 1, 2025; effective January 1, 2026 | Public document was `VERIFIED_FROM_PROVIDER` on 2026-11-06. Current account applicability and incorporation remain `UNKNOWN`. |
| [Data controls in the OpenAI platform](https://developers.openai.com/api/docs/guides/your-data) | Current page; no effective date displayed in the reviewed content | `VERIFIED_FROM_PROVIDER` on 2026-11-07 for default abuse-monitoring retention, Responses storage, ZDR/MAM, image/file exceptions, and residency limits. |
| [OpenAI API subprocessor list](https://openai.com/policies/sub-processor-list/) | Dynamic page; list version not recorded | URL supplied by support; `OWNER_PROVIDED_SUPPORT_RESPONSE`. Individual subprocessors, purposes, locations, and change date are **NOT VERIFIED IN THIS RUN**. |

Provider pages can change. Approval evidence should retain dated copies or screenshots and account-specific evidence in a restricted repository.

## 3. Founder-provided OpenAI Support evidence

| Evidence item | Recorded finding | Classification / limit |
| --- | --- | --- |
| Response date | Not present in the supplied evidence | `UNKNOWN`; do not invent a date or ticket number. |
| Source | AI-assisted OpenAI Support response supplied by the founder | `OWNER_PROVIDED_SUPPORT_RESPONSE` |
| General API terms | Self-service API use is generally governed by OpenAI Business Terms rather than consumer Terms of Use. | General guidance only; actual account terms and acceptance evidence remain `UNKNOWN`. |
| Acceptance | General acceptance is handled through the online terms flow. | No accepted version, acceptance event, accepter, account, or contracting entity was supplied. |
| DPA | A separately signed DPA is generally associated with contracted/enterprise arrangements or specific additional requirements. | Do not infer that a separate signature is required or that a DPA was signed. Applicability/incorporation for this account remains `UNKNOWN`. |
| Retention | Default abuse-monitoring retention may be up to 30 days; Responses storage depends on request parameters/features. | Independently aligned to the current official data-controls page; account-specific exceptions remain `UNKNOWN`. |
| ZDR/MAM | Requires separate approval and additional requirements. | Independently aligned to the current official data-controls page; CarbonLite approval/configuration remains `UNKNOWN`. |
| Subprocessors | Support supplied `https://openai.com/policies/sub-processor-list/`. | URL recorded; current list contents and account applicability remain unverified. |

The support response is not `FORMAL_LEGAL_APPROVAL`, a `SIGNED_DPA`, or `ACCOUNT_SPECIFIC_CERTIFICATION`.

## 4. Business Terms findings

The support response identifies the OpenAI Business Terms as the general contractual framework for self-service API use. This reconciliation did not obtain account acceptance evidence or independently establish the current Business Terms effective date. The prior package's public Services Agreement analysis is retained as historical review evidence, but it must not be treated as proof of the terms governing this account.

Relevant public terms:

- the customer must maintain accurate account information and is responsible for account and end-user activity;
- the customer must obtain necessary end-user consents and must have the rights, licences, and permissions required for inputs;
- OpenAI states it will not use Customer Content to develop or improve services unless the customer explicitly agrees;
- the customer remains responsible for evaluating output accuracy and appropriateness;
- OpenAI states it will comply with its referenced security measures and can provide recent audit reports on written request, no more than annually; and
- for customers outside the EEA or Switzerland, the public definition identifies OpenAI OpCo, LLC as the contracting party unless an Order Form designates OpenAI Public Sector, LLC.

The actual OpenAI contracting party, accepted version, acceptance event, accepting representative, account, and any order form or reseller terms remain `UNKNOWN`.

## 5. DPA findings

The current public DPA says it supplements and is incorporated into the Services Agreement. It describes OpenAI as processing Customer Data on the customer's behalf as a processor. It treats the agreement, order form, and service configuration tools as documented instructions.

Material terms for review:

- OpenAI states it will process Customer Data for service delivery and according to customer instructions, subject to applicable-law exceptions.
- OpenAI states it will implement reasonable and appropriate security measures.
- OpenAI states it will notify the customer without undue delay after becoming aware of a Personal Data Breach and provide reasonable assistance.
- The customer gives general authorization for listed subprocessors. OpenAI states it will notify customers of changes; customers may object within 30 days, with termination rights if no commercially reasonable resolution is available.
- Following expiry or termination, OpenAI states it will return or delete Customer Data at customer instruction, except where applicable law requires retention. This is not a promise that an individual API request or abuse-monitoring log can be immediately deleted on demand.
- The customer represents that it has given necessary notices and maintains the rights, consents, and authorizations required to provide data and instruct processing.
- The customer remains responsible for service configuration and design choices, including retention and deletion settings.
- Schedule 1 contemplates unstructured personal data concerning employees, customers, suppliers, and end users. It says sensitive data is not intended unless unexpectedly included in unstructured data.
- The DPA contains transfer mechanisms for EEA, Swiss, and UK data. This review did not identify a Canada-specific transfer mechanism or Canadian-residency promise in the public DPA.

No signed copy, online-acceptance record, order form, or account record for Kach Canada Ltd. was available. The support guidance indicates that a separately signed DPA is not necessarily required for self-service use, but it does not establish whether the public DPA is incorporated into the governing terms for this account. DPA applicability and acceptance remain `UNKNOWN`.

## 6. API data-control findings

| Topic | Official finding | CarbonLite disposition |
| --- | --- | --- |
| Model training | API data is not used to train or improve OpenAI models unless the API customer explicitly opts in. | Public rule `VERIFIED_FROM_PROVIDER`; sharing disabled is `OWNER_REPORTED`. |
| Abuse monitoring | Logs may include prompts, responses, and derived metadata. Default retention is up to 30 days, with longer legal or harm-prevention exceptions. | Must be disclosed unless enhanced controls are independently verified. |
| `store:false` | CarbonLite sets `store:false`. For the Responses API, this avoids the ordinary stored-response application state for the foreground request. | It does not disable default abuse-monitoring logs and is not proof of ZDR. |
| ZDR/MAM | Modified Abuse Monitoring and Zero Data Retention require OpenAI approval and additional requirements. Controls can be applied at organization or project level. `/v1/responses` is listed as eligible, subject to limitations. | Eligibility and enablement are `UNKNOWN`; owner reports neither is verified. |
| Files/images | Potential CSAM detections may cause file/image input retention for manual review even with ZDR or MAM. | The schedule must disclose safety/legal exceptions and prohibit unsuitable data. |
| Prompt caching | Official documentation describes encrypted prompt-cache application state that can persist for up to 24 hours for affected features/models. | CarbonLite sets no prompt-cache option; actual behavior for the reviewed model/account remains `UNKNOWN`. |
| Residency | Residency is configured per project and does not cover all system data. Non-US regions require enhanced retention controls and a Modified Retention amendment. Regional storage does not always mean regional inference. | Project geography is `OWNER_REPORTED` as Global. No Canadian-residency claim is supportable. |

## 7. Contracting-entity and account checklist

The founder reports that the OpenAI Organization display name, Project name, and Billing Preferences company name align to Kach Canada Ltd. and CarbonLite. This is useful consistency evidence, but it remains `OWNER_REPORTED`. It is not independent provider verification, proof of the contracting party, proof of a Business Terms acceptance event, or proof that a DPA was signed or incorporated.

| Evidence item | Current status | Minimum acceptable evidence |
| --- | --- | --- |
| OpenAI Organization display name | `OWNER_REPORTED`: Kach Canada Ltd. | Dated, secret-free organization screenshot and organization ID in restricted inventory. Display name alone is not contracting-party proof. |
| OpenAI Project | `OWNER_REPORTED`: CarbonLite | Dated project screenshot/ID, owner, region, inherited controls, and reviewer. |
| API key/project mapping | `OWNER_REPORTED`: Render key last four characters match the CarbonLite Project key | Secret-free project-key identifier/custodian evidence and independent review. Never copy the key value. |
| Billing Preferences company name | `OWNER_REPORTED`: Kach Canada Ltd.; founder reports the Billing Preferences update was saved | Dated, secret-free Billing Preferences evidence and, if available, an invoice/account billing record. This does not by itself prove the contracting entity. |
| Payment/invoice details | `UNKNOWN` | Invoice or billing statement showing the service, account, dates, and legal entity, with sensitive payment data redacted. |
| Applicable Business Terms / other agreement | `UNKNOWN` for the account | Accepted version/effective date, acceptance event or order form, contracting party, account, and authorized accepter. |
| DPA applicability/acceptance | `UNKNOWN` | Durable account/contract evidence establishing incorporation or execution and the applicable entity/version; do not require or claim a separate signature without evidence. |
| Business verification | `UNKNOWN`; no evidence it is required for this account | Record only if the platform requires it. Do not collect identification documents into this package. |
| Data-sharing settings | `OWNER_REPORTED`: model feedback, eval/fine-tuning, and input/output sharing disabled | Dated secret-free screenshots at organization and project levels. |
| API call logging | `OWNER_REPORTED`: enabled per call | Dated screenshot plus approved purpose, access, and retention treatment. Logging is not ZDR. |
| ZDR/MAM | `UNKNOWN`; owner reports not verified enabled | Eligibility/approval correspondence and organization/project configuration screenshot. |
| Project residency | `OWNER_REPORTED`: Global | Dated project setting and endpoint/base-URL evidence. Global does not promise Canadian storage or processing. |
| Production deployment configuration | `UNKNOWN`; consent gate not deployed | Approved release, migration/config evidence, environment attestation, and synthetic rehearsal. |

## 8. Contract framework and responsibility boundaries

| Instrument | Role in the package | Current state |
| --- | --- | --- |
| OpenAI Business Terms | General contractual framework for self-service API use, according to support guidance. | Account acceptance/version/party `UNKNOWN`. |
| OpenAI DPA | Provider processing obligations and data-protection terms, subject to the actual governing terms and account relationship. | Public document reviewed previously; account applicability/incorporation `UNKNOWN`; no separate signature claimed. |
| CarbonLite Controlled Paid Pilot Agreement | Contract proposed between Kach Canada Ltd. and the pilot customer. | Draft only; not approved, offered, or signed. |
| Customer AI Processing Schedule | Versioned customer authorization and disclosure for optional AI processing. | Internal source is `v0.2-review`; customer schedule is `CARBONLITE-AI-PILOT-CUSTOMER-v0.2-review`. Both are review drafts; legal/privacy, founder, and operational approvals remain pending. |

## 9. Legal/privacy questions

1. Which Business Terms, DPA, order form, or other agreement governs the exact API organization/project, and who accepted it for which legal entity?
2. Is Kach Canada Ltd. acting as controller, processor/service provider, or in different roles for different pilot data classes?
3. Is organization-level contractual authorization sufficient, or is another legal basis or individual notice/consent required for embedded personal information?
4. Is the proposed cross-border disclosure adequate for Alberta/Canadian customers and affected individuals?
5. Which sensitive or regulated data must be prohibited rather than conditionally accepted?
6. What provider and CarbonLite retention wording is supportable while ZDR/MAM and provider-log deletion remain unverified?
7. What incident-notice timing should Kach commit to downstream, given the DPA's “without undue delay” provider commitment?
8. What subprocessor change-notice and customer-objection process should the paid-pilot agreement adopt?

## 10. Review conclusion

- **GO:** qualified legal/privacy and founder review of the public terms and evidence checklist.
- **NO-GO:** claim that Kach Canada Ltd. is the verified OpenAI contracting customer.
- **NO-GO:** claim that the DPA was separately signed or proven applicable to the account.
- **NO-GO:** claim of Canadian residency or zero provider retention.
- **NO-GO:** real-customer AI processing.
