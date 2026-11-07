# CarbonLite Controlled Paid Pilot Agreement — Draft

**Status:** Draft for business-owner and Alberta/Canadian legal review. Not approved or offered.
**Version:** v0.1-review
**Prepared:** November 5, 2026

> Drafting note: Bracketed text and every item labelled **proposed**, **pending**, or **internal target** requires completion and approval. This draft does not authorize real customer data. The parties must not start real-data processing until Kach Canada Ltd. records closure of the applicable P0 operational security, privacy, factor-governance, recovery, and deletion gates.

## 1. Parties and effective date

This Controlled Paid Pilot Agreement (the **Agreement**) is between **Kach Canada Ltd.**, an Alberta corporation operating CarbonLite (**Kach**), and **[Customer Legal Name]**, of **[address]** (**Customer**). It takes effect on **[Effective Date]** after signature by both parties.

CarbonLite is the name of the software service, not a separate contracting entity.

## 2. Pilot objective and scope

The pilot evaluates whether CarbonLite can help Customer organize an agreed, limited dataset, review emission-factor matching and calculation provenance, identify data-readiness issues, and produce draft review outputs. It is invitation-only, manually provisioned, and limited to the workspace, users, activities, units, reporting period, and quota in Schedule A.

The pilot is not a production migration, regulatory filing service, assurance engagement, certification, audit, verification, carbon-credit eligibility determination, or professional legal, accounting, engineering, environmental, or regulatory advice.

## 3. Term

The proposed pilot term is **four weeks**, beginning **[Start Date]** and ending **[End Date]**, unless ended earlier under section 23. Any extension must be written and must state its effect on fee, quota, retention triggers, support, and export dates.

The four-week term is a proposed contractual commitment requiring owner approval before offer and agreement by both parties.

## 4. Fee, invoicing, and taxes

The proposed fee is **CAD $199 per organization**, plus applicable taxes. The proposed payment term is **[due on signature / Net __ days]**. Kach will invoice manually. No automated billing or recurring subscription is included.

The fee, payment term, tax treatment, late-payment rule, cancellation treatment, and any refund are **pending business-owner and legal review**. Customer owes no draft fee merely because it receives this document.

## 5. Access and organization separation

Kach will manually provision named users into one organization workspace. Customer must identify authorized users and promptly request removal of access that is no longer needed. Users must keep credentials secure and must not share accounts.

CarbonLite is designed to scope customer data by organization, but Customer acknowledges that final real-data use is conditional on Kach completing the applicable tenant-isolation, authorization, deactivation, and session-control gates. Public self-registration is not part of this pilot.

## 6. Customer responsibilities and authorized data

Customer will:

1. provide only data it is authorized to disclose and that falls within Schedule A;
2. avoid prohibited and unnecessary personal or sensitive information;
3. identify any contractual, sector, confidentiality, localization, or preservation requirement before upload;
4. maintain its own originals and authoritative accounting archive;
5. review extracted rows, mappings, quantities, units, jurisdictions, reporting boundaries, factors, assumptions, calculations, exclusions, and exports;
6. correct errors and make all decisions about formal or external use; and
7. notify Kach promptly of suspected unauthorized access, prohibited uploads, or inaccurate material results.

Unless expressly approved in writing after legal/privacy review, authorized data excludes credentials; payment-card or banking credentials; health, biometric, genetic, criminal, or similarly sensitive personal information; government identity material; employee files, payroll, resumes, or performance records; data about minors; and data unrelated to the pilot.

## 7. AI-assisted extraction and human review

If enabled and authorized, CarbonLite may send relevant document content to OpenAI or another disclosed AI provider to assist extraction. AI output may be incomplete or wrong. Customer must complete human review before confirming rows or relying on a result. Kach does not represent AI output as a verified source record.

AI processing is conditional on the executed Schedule B, verified subprocessor terms and configuration, and closure of the real-data AI-processing gates. A technical request option such as `store: false` is not, by itself, a contractual promise of immediate provider deletion.

## 8. Calculations, factors, and provenance

CarbonLite calculates only records that satisfy the approved pilot rules and have an eligible factor. Outputs may exclude records with missing or invalid quantity, unit, jurisdiction, factor, or other required context. Factor source, value, unit, applicability, geography, vintage, status, and calculation provenance must be reviewed.

Kach will not silently substitute a demo, synthetic, offset-project, TIER/SGRR, reference-only, component-gas, or otherwise inapplicable factor for an approved corporate-inventory factor. A source label, official citation, or verified database flag does not constitute third-party approval of Customer's use.

Customer remains responsible for determining whether the reporting boundary, methodology, factor, gas basis, global-warming potential, period, and use are suitable. Supported categories are further limited in Schedule C and may be marked **not calculated** where no approved factor is available.

## 9. Scope 2 disclosure

Where an eligible electricity factor is available, CarbonLite's current pilot reporting is **location-based Scope 2**. **Market-based Scope 2 is not calculated.** A missing market-based result must not be shown or interpreted as zero. Customer must not infer market-based performance, renewable-electricity claims, contractual-instrument quality, avoided emissions, offsets, or carbon-credit eligibility from a location-based result.

## 10. No certification, assurance, or acceptance guarantee

CarbonLite outputs are draft workflow and reporting materials. Kach does not guarantee that a regulator, auditor, verifier, lender, customer, investor, certification body, or other third party will accept them. No output is certified, assured, independently verified, or approved merely because CarbonLite generated it.

## 11. Data ownership and limited processing right

As between the parties, Customer retains its rights in data and documents it provides. Customer grants Kach a limited, non-exclusive right during the Agreement and applicable retention period to host, copy, transmit, extract, structure, calculate, display, support, secure, back up, and delete Customer data only as reasonably necessary to perform the pilot, meet the Agreement, comply with law, resolve incidents or disputes, and follow an authorized hold.

The parties must obtain legal advice on their privacy-law roles, legal basis, and any required data-processing addendum. Nothing in this draft conclusively assigns controller, organization, processor, or service-provider status.

## 12. Privacy, subprocessors, and cross-border processing

Kach will process personal information under the executed Agreement, Schedule B, and an aligned Privacy Policy. Candidate service providers currently identified in materials include Vercel, Render, a managed PostgreSQL provider such as Neon, OpenAI, Sentry, PostHog, and Google Analytics. The final list must state which providers are actually enabled, their purpose, relevant data, processing location, retention/deletion terms, and change-notice process.

Some providers may process or store information outside Canada, where foreign law may apply. Exact locations and safeguards are **pending verification and legal review**. Kach must not represent a contemplated provider or region as actual without evidence.

## 13. Retention, deletion, export, and offboarding

Schedule B distinguishes source documents, drafts, confirmed records, reports, logs, operational events, evidence, active systems, and backups. The proposed commercial terms are:

- original source documents: active-system deletion at pilot end plus 30 calendar days;
- draft review: after 30 inactive days with a proposed 14-day notice/grace period;
- customer export window: proposed 14 calendar days;
- confirmed records: Customer is the authoritative archive; CarbonLite treatment follows this executed Agreement;
- active-system offboarding: target within 30 calendar days after the later approved trigger, export window, and hold/contract clearance; and
- backup survival: separate from active-system completion, with a proposed maximum of 30 calendar days subject to technical proof and legal exceptions.

These values are **not approved contractual commitments in this draft**. They become binding only if retained in the signed Agreement after legal, owner, and evidence review. Kach may retain minimized deletion evidence and data required by a valid legal hold or law under the approved Schedule B. Customer-controlled downloads cannot be deleted by Kach.

## 14. Confidentiality

Each party will use the other party's non-public information only to perform or receive the pilot, protect it using reasonable care, and disclose it only to personnel, professional advisers, and approved service providers who need it and are bound by appropriate duties. Confidentiality does not apply to information that the receiving party can show was lawfully public, already known without duty, independently developed, or lawfully received from another source.

A party required by law to disclose confidential information will, where legally permitted, give prompt notice and reasonable cooperation. **Alberta/Canadian legal review is required** for exclusions, compelled disclosure, duration, remedies, and interaction with privacy obligations.

## 15. Security responsibilities

Kach will operate the pilot using the controls actually implemented and evidenced for the approved environment. Customer will manage its users, devices, credentials, lawful data selection, and downloaded files. Neither party will introduce malware, attempt unauthorized access, or bypass access controls.

No certification, penetration-test result, security framework conformance, encryption configuration, provider agreement, or incident-response SLA is promised unless specifically listed in a signed schedule with evidence.

## 16. Availability, support, and incidents

The pilot is provided on an **as available** basis. Kach does not promise continuous availability, uptime, uninterrupted access, or response/resolution times in this draft. Proposed support channel: **[email/channel]** during **[hours and time zone]**. Proposed incident contact: **[contact]**.

Kach will use the approved communication process for material incidents affecting the pilot and will state known impact, containment, next update, and required Customer action when appropriate. Notification timing, threshold, and legal obligations require legal/security approval and must not be inferred from this draft.

## 17. Backup and recovery limitations

Customer must keep its originals and exports. Kach's proposed internal backup design is a paired database/document recovery point at least daily, a new pair before deployment or migration, and 14-day retention. The proposed internal recovery point objective (**RPO**) is 24 hours. The proposed maximum deleted-data backup survival is 30 days. Each value is contingent on provider/configuration proof and is not a guarantee of recovery.

The internal recovery time objective (**RTO**) is **NOT APPROVED**. Prior proposals of four hours and two business days conflict. Neither applies unless the parties expressly add an approved commitment after Kach defines the recovery scenario and proves capability. Kach does not guarantee that any data can be recovered or that recovery will occur within a stated time.

A restore may reintroduce data deleted after the recovery point. Kach must keep a restored environment isolated until deletion/offboarding records are reconciled and required deletions are reapplied.

## 18. Intellectual property

Kach and its licensors retain all rights in CarbonLite, its software, branding, interfaces, templates, documentation, general methods, and improvements. Customer retains its rights in Customer data and Customer confidential information. No implied licence is granted beyond the limited rights necessary to use the pilot during the term.

Third-party data, factors, software, and publications remain subject to their own rights and terms. A citation or provenance record does not transfer third-party rights.

## 19. Feedback

Customer may provide product feedback. Subject to the confidentiality section, Customer grants Kach a perpetual, worldwide, royalty-free right to use feedback to improve CarbonLite, provided Kach does not disclose Customer confidential information, personal information, source documents, or Customer-identifying facts through that use without separate permission.

**Legal review is required** for the feedback licence and any de-identification or publicity use. No logo, testimonial, case study, or customer name right is granted by this clause.

## 20. Warranties and disclaimers

Each party represents that the person signing is authorized to bind it. Customer represents that it has the rights and authority required to provide and instruct processing of the submitted data.

Except for express terms in the signed Agreement and to the extent permitted by law, the pilot and outputs are provided “as is” and “as available,” without implied warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, completeness, availability, regulatory compliance, certification, assurance, or data recovery. **Legal review is required** to ensure enforceability and preserve non-excludable rights.

## 21. Liability allocation

**Draft for legal review:** Neither party should be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or lost profits, revenue, opportunity, goodwill, or data, except to the extent a limitation is prohibited by law or an agreed carve-out applies.

**Proposed cap for legal review:** Each party's aggregate liability arising from the pilot would be limited to **[the fees paid or payable under this Agreement / CAD $___ / another negotiated amount]**. The parties must decide appropriate carve-outs, which may include confidentiality, privacy/security, infringement, fraud, wilful misconduct, payment, or indemnity. No cap or exclusion is approved by this draft.

## 22. Indemnities

**Open legal-review question:** Determine whether Customer should indemnify Kach for unlawful or unauthorized Customer data and misuse, whether Kach should provide an IP infringement indemnity, the defence-control procedure, exclusions, and cap treatment. This draft intentionally does not invent an approved indemnity.

## 23. Suspension, termination, refunds, and survival

Either party may terminate for material breach if the breach is not cured within **[__ days]** after written notice, or immediately for an uncurable material security, legal, or prohibited-data risk. Customer may terminate for convenience on **[__ days]** written notice. Kach may suspend access as reasonably necessary to contain misuse or a security/legal risk and will give notice where appropriate and lawful.

Refund treatment is **pending owner/legal approval**. Options for review include no refund after work starts, a pro-rated refund for Kach's convenience termination, or a refund tied to failure to provision the agreed pilot. The signed Agreement must select one rule.

Termination ends access but does not itself prove deletion. Export, active-system deletion, backup expiry, holds, and minimized evidence follow Schedule B. Sections intended by their nature to survive, including ownership, confidentiality, disclaimers, liability, payment, records, and governing law, survive for the approved duration.

## 24. General terms and governing law

This Agreement, including its schedules, is the entire agreement for the pilot and prevails over general website terms for a direct conflict concerning this pilot, subject to legal review. Amendments and waivers must be in writing by authorized representatives. Neither party may assign the Agreement except under **[approved assignment rule]**. Notices must be sent to the contacts below by **[approved notice method]**.

The proposed governing law is the law of Alberta and the applicable federal laws of Canada. Proposed forum: **[courts located in Alberta / arbitration terms]**. Conflict-of-law, venue, electronic-signature, severability, force-majeure, relationship, and counterpart language require Alberta/Canadian legal review.

## 25. Signatures

No signature or date has been filled.

| Kach Canada Ltd. | [Customer Legal Name] |
| --- | --- |
| Name: ____________________ | Name: ____________________ |
| Title: ____________________ | Title: ____________________ |
| Signature: ____________________ | Signature: ____________________ |
| Date: ____________________ | Date: ____________________ |

# Schedule A — Pilot Scope and Usage Limits

## A1. Commercial scope

| Item | Draft value |
| --- | --- |
| Organization workspaces | One manually provisioned, separately scoped organization workspace |
| Pilot duration | Proposed four weeks; exact dates blank |
| Fee | Proposed CAD $199 plus applicable taxes; pending approval |
| Users/seats | **[__ named users; pending owner and technical approval]** |
| Document quota | **[__ source documents, __ total pages, __ MB per file, __ MB total; pending owner and capacity evidence]** |
| Extraction quota | **[__ AI-assisted jobs/retries; pending owner, provider-cost, and rate-limit evidence]** |
| Report cycles | **[__ PDF/CSV review packages; pending owner approval]** |
| Feedback/support | One structured feedback session proposed; support channel/hours pending |
| Registration/billing | Invitation-only; manual provisioning and invoicing; no public self-registration or automated subscription required |

An unspecified quota is not unlimited. Kach must complete the blanks before signature.

## A2. Candidate supported activities

Subject to approved factors, units, geography, context, and P0 gates:

- purchased electricity for supported Canadian pilot jurisdictions, currently proposed as Alberta, British Columbia, and Ontario;
- natural gas, gasoline, and diesel only where an approved corporate-inventory method and required activity context exist;
- selected Scope 3 air travel, accommodation, ground transport, and shipping only where an approved factor and required inputs exist; and
- water as a tracked operational metric only, with emissions **not calculated by default**.

Rows outside the allowlist, without required context, or without an approved factor are excluded from calculated totals and marked for review or not calculated.

## A3. Exclusions

No enterprise SSO, public registration, automated billing, production migration, unlimited datasets, unrestricted custom factors, formal filing preparation, third-party verification, audit assurance, certification, offsets, credits, market-based Scope 2 calculation, or guaranteed service/recovery is included.

## A4. Deliverables

Proposed deliverables are a configured workspace, reviewed limited activity dataset, visible factor/calculation provenance, draft PDF/CSV review outputs, and a summary of gaps and next steps. Acceptance criteria: **[pending owner/customer agreement]**.

# Schedule B — Data Processing and Retention

## B1. Processing summary

Kach may process approved account, organization, source-document, extracted, confirmed activity, calculation, factor-provenance, report, support, usage, security, and deletion-evidence data for the purposes in the Agreement. The final subprocessor list, regions, data classes, and provider terms must be attached or incorporated before real-data processing.

## B2. Proposed retention terms

| Data class | Draft contractual position | Internal control/target, not a customer guarantee unless expressly adopted |
| --- | --- | --- |
| Source documents | Proposed active-system deletion at pilot end + 30 days, subject to holds and exceptions | Weekly register review; supported deletion; backup mapping |
| Temporary upload staging | Not durable storage | Immediate normal cleanup; proposed 24-hour exception target pending automated proof |
| Abandoned drafts | Proposed review after 30 inactive days and 14-day notice/grace | Manual candidate review and notice; inactivity control pending |
| Confirmed records/provenance | Customer authoritative archive; export/deletion per signed Agreement | Customer-specific register decision; no automatic age deletion |
| Customer exports | Customer controls downloaded copies | Proposed 14-day export window |
| Active-system offboarding | Proposed qualified 30-day target after later trigger/window/clearance | Dry run, two-person approval, supported erasure, verification |
| Audit/security events | Period pending legal adoption | Proposed internal 12 months, subject to minimization/control evidence |
| Quota/operational events | Period pending legal adoption | Proposed internal 90 days after period close |
| Deletion evidence | Disclosed minimized exception; period pending adoption | Proposed internal 24 months after completion/final dispute closure |
| Backups | Data may survive active deletion until controlled expiry | Proposed 14-day paired retention; maximum deleted-data survival 30 days, both pending proof |

## B3. Requests, holds, and deletion evidence

Requests require identity and authority verification. Holds and contractual preservation may delay deletion. Active-system completion, backup expiry, provider deletion, and evidence expiry are separate. Completion wording will describe retained exceptions. Kach will not state that all data is permanently deleted unless every relevant active system, provider, backup, independent copy, hold, and evidence exception has been verified.

## B4. Security and incident contacts

Customer privacy contact: **[name/email]**
Kach privacy contact: **[name/email]**
Kach security/incident contact: **[name/email]**
Approved request channel: **[channel]**

The parties must complete applicable privacy addendum, breach-notification terms, international-processing disclosure, and legal-request procedure after legal review.

# Schedule C — Supported Calculations and Reporting Limitations

1. CarbonLite provides estimated calculations only for records that pass the approved eligibility and data-quality rules.
2. Customer must review source mapping, reporting boundary, quantity, unit, date, jurisdiction, facility, factor provenance, methodology, and exclusions.
3. Scope 2 reporting is location-based when supported. **Market-based Scope 2 is not calculated** and is not zero.
4. Water is tracked-only unless a separately reviewed method is enabled; no default water emissions result is promised.
5. Demo, synthetic, reference-only, offset-project, TIER/SGRR, component-gas, unapproved custom, and unsupported factors are not eligible for ordinary customer totals.
6. Missing or unsupported rows remain visible for review or are excluded. The absence of a result is not evidence of zero emissions.
7. Historical snapshots and provenance should be preserved. A later factor change must not silently rewrite a delivered historical result; recalculation must be explicit and reviewed.
8. Outputs do not establish completeness outside the agreed categories, units, jurisdictions, periods, files, or quota.
9. No regulatory certification, assurance, third-party verification, audit acceptance, legal compliance, or carbon-credit eligibility is promised.
10. The final factor allowlist, source/version, supported unit/context, reviewer, approval record, and effective period must be attached or referenced before real-data calculations begin.

## Version control

| Version | Date | Status | Change | Owner approval | Legal approval |
| --- | --- | --- | --- | --- | --- |
| v0.1-review | November 5, 2026 | Draft; not approved | Initial controlled paid-pilot agreement approval draft | ____________________ | ____________________ |
