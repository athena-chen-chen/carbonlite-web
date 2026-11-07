# CarbonLite AI-001 DPA and Consent Approval Package

**Prepared:** 2026-11-06; support evidence reconciled 2026-11-07
**Review time:** approximately 10–15 minutes
**Task status:** `AI-001` remains `READY_FOR_REVIEW`
**Decision:** `DEC-PENDING-004` remains `PENDING`
**Production consent gate:** not deployed
**Real-data AI:** **NO-GO**

This package prepares founder and qualified legal/privacy review. It does not provide legal advice, approve provider terms, activate customer consent, or establish compliance.

## 1. Executive summary

CarbonLite has a locally tested, fail-closed organization authorization gate and a separate default-off global activation gate. It supports the founder's stated preference that AI is optional, organizations default to AI disabled, and customers who decline use supported manual or local workflows. The gate passed 82 focused unit tests and 2 focused PostgreSQL E2E tests. It is not deployed.

Founder-provided AI-assisted OpenAI Support guidance states that self-service API use is generally governed by OpenAI Business Terms, that acceptance is generally handled through the online terms flow, and that a separately signed DPA is typically associated with contracted/enterprise arrangements or specific additional requirements. This is `OWNER_PROVIDED_SUPPORT_RESPONSE`, not legal advice or account-specific certification. It does not prove that Kach Canada Ltd. accepted a particular version or that the DPA governs this account.

OpenAI states that API data is not used for model training unless the API customer opts in. The Responses API request uses `store:false`, but default abuse-monitoring logs may still retain customer content for up to 30 days, with exceptions. ZDR/MAM is not verified for the CarbonLite project. The project is owner-reported as Global; no Canadian-residency claim is supportable.

Recommendation: preserve `READY_FOR_REVIEW`, keep real-data AI at **NO-GO**, and obtain account/contract evidence plus founder, legal/privacy, infrastructure/security, release, and final go/no-go approvals before activation.

## 2. Provider terms evidence

| Topic | Finding | Evidence state |
| --- | --- | --- |
| Business Terms | Support says these are the general terms for self-service API use and are generally accepted through the online terms flow. | `OWNER_PROVIDED_SUPPORT_RESPONSE`; current version, account acceptance, contracting party, and accepter `UNKNOWN` |
| DPA | Public DPA was reviewed previously; support says a separately signed DPA is not necessarily the self-service path. | Public document previously `VERIFIED_FROM_PROVIDER`; account applicability/incorporation `UNKNOWN`; no separate signature claimed |
| Customer duties | Customer must have input rights and necessary consents/authorizations and remains responsible for configurations and output evaluation. | `VERIFIED_FROM_PROVIDER` |
| Training | API data not used to train/improve models unless the customer opts in. | `VERIFIED_FROM_PROVIDER`; CarbonLite sharing-disabled state `OWNER_REPORTED` |
| Default retention | Abuse-monitoring logs may include prompts/responses and are retained up to 30 days by default, subject to longer legal/harm exceptions. | `VERIFIED_FROM_PROVIDER` |
| `store:false` | Avoids ordinary Responses stored-response application state for the inspected foreground request. It is not ZDR. | Provider behavior and code setting verified; account control `UNKNOWN` |
| ZDR/MAM | Requires approval/additional requirements; can be set at organization/project level; Responses is eligible subject to limitations. | `VERIFIED_FROM_PROVIDER`; CarbonLite status `UNKNOWN` |
| Residency | Project-configured; does not cover all system data; regional storage may not mean regional inference. | `VERIFIED_FROM_PROVIDER`; CarbonLite Global project `OWNER_REPORTED` |
| Subprocessors | Support supplied `https://openai.com/policies/sub-processor-list/`. | `OWNER_PROVIDED_SUPPORT_RESPONSE`; actual current list, purposes, locations, and account applicability **NOT VERIFIED IN THIS RUN**. |
| Security/incidents | DPA states reasonable security measures and breach notification without undue delay. | `VERIFIED_FROM_PROVIDER`; downstream commitment needs counsel. |

Official and owner-provided sources:

- https://openai.com/policies/data-processing-addendum/
- https://openai.com/policies/business-terms
- https://developers.openai.com/api/docs/guides/your-data
- https://openai.com/policies/sub-processor-list/ — supplied by support; list contents not independently verified in this run

## 3. Contracting-entity finding

| Item | Status |
| --- | --- |
| Organization display name “Kach Canada Ltd.” | `OWNER_REPORTED` |
| Project “CarbonLite” and Global geography | `OWNER_REPORTED` |
| Render key suffix matches project key | `OWNER_REPORTED`; supporting only, not cryptographic verification |
| Data-sharing settings disabled | `OWNER_REPORTED` |
| API call logging enabled per call | `OWNER_REPORTED` |
| Billing legal entity and invoices | `UNKNOWN` |
| Accepted Business Terms or other agreement/version | `UNKNOWN` |
| DPA applicability/acceptance | `UNKNOWN` |
| ZDR/MAM approval and configuration | `UNKNOWN` |
| Production release/configuration | `UNKNOWN` / not deployed |

Changing an organization display name does not establish the legal contracting customer. For a Canadian customer, the public agreement points to OpenAI OpCo, LLC by default, but the actual account/order relationship must be verified.

## 4. Data-processing matrix

| Category | Purpose/location | Retention position | Decision gap |
| --- | --- | --- | --- |
| Source documents and filenames | Full authorized file to OpenAI; PDF/CSV filename included; Global project | CarbonLite rule pending; provider abuse logs separate | Approve classes, prohibited data, local period, provider wording |
| AI request/response | Draft extraction through `/v1/responses`; outside-Canada processing possible | `store:false`; default abuse logs up to 30 days unless verified enhanced control | Verify DPA/account/ZDR/MAM/subprocessors |
| Extraction drafts | CarbonLite database for human review | Cascades with source; no age expiry | Approve and rehearse expiry |
| AI job metadata | CarbonLite quota/traceability metadata | No approved period | Minimize fields and approve period |
| Audit/security logs | Authorization and operational evidence | Audit retention undecided | Approve access and expiry |
| Backups | Recovery copies in unverified provider design | Backup expiry undecided | Provider proof and expiry rehearsal |
| Customer exports | Customer reporting and archive | Customer-controlled after download | State limits of Kach deletion control |

The full matrix is in [AI consent alignment review](review/carbonlite-ai-consent-alignment-review.md).

## 5. Customer AI election proposal

The proposed schedule states:

- AI is optional and disabled by default.
- Complete eligible PDF, CSV, JPEG, and PNG content may be sent to OpenAI; PDF/CSV filenames may be included.
- Processing may occur outside Canada.
- AI output is a draft and requires human review.
- Manual entry and local `.xlsx`/`.json` parsing remain available.
- Customer must have authority and avoid prohibited data.
- Authorization is specific to organization, provider, processing scope, data classes, and schedule version.
- Withdrawal is prospective, blocks new requests, and cannot retroactively cancel an in-flight request.
- Provider retention and CarbonLite retention are separate.

Election:

- [ ] I authorize optional AI-assisted processing under the identified schedule/version.
- [ ] I decline AI-assisted processing and will use supported non-AI workflows.

Neither option may be prechecked. An upload is not consent.

## 6. Current technical evidence

- OpenAI Responses API, model `gpt-4o-mini`, SDK `openai ^6.34.0`.
- Complete PDF/CSV/JPEG/PNG content is transmitted; PDF/CSV filenames may be included.
- `store:false`, `maxRetries:0`, structured draft response, and human review.
- Organization-level default deny; exact consent version/provider/scope; evidence and representative references; verifier/effective/expiry/withdrawal controls.
- Separate default-off `REAL_DATA_AI_PROCESSING_ENABLED` gate.
- Cross-tenant and suspended-organization denial.
- 82 focused unit tests and 2 focused PostgreSQL E2E tests passed; denial paths made zero mocked OpenAI calls.
- Manual entry and local `.xlsx`/`.json` paths remain available.
- Production gate is not deployed and no real provider request was made in this review.

## 7. Remaining P0 blockers

1. Verify billing legal entity, accepted agreement/order form, DPA applicability/acceptance, and authorized account purchaser.
2. Verify organization/project IDs, project geography/endpoint, data-sharing state, API logging, ZDR/MAM status, key custody, and current subprocessor list.
3. Obtain qualified legal/privacy review of roles, legal basis, notices/authorization, cross-border wording, prohibited data, incident notice, and withdrawal.
4. Approve the exact AI schedule/version and evidence repository.
5. Approve CarbonLite AI draft/job/audit retention and provider exception wording under `RET-002`/`AI-001`.
6. Align the Agreement, Privacy Policy, Terms, onboarding, upload notice, and subprocessor register without publishing until approved.
7. Review and deploy the migration/gate, configure the approved version, rehearse synthetic production-shaped denial/enablement/withdrawal/fallback, and retain release evidence.
8. Obtain a separate founder production-activation decision and final `GOV-001` real-data approval.

## 8. AI-001 closure checklist

`VERIFIED` below means the named evidence was directly reviewed for this package. It does not mean legal approval, provider-account verification, deployment, or operational authorization.

| Item | Status | Evidence / remaining action |
| --- | --- | --- |
| Business Terms reviewed | `PENDING` | Support guidance and official URL recorded; current wording/effective date and account acceptance must be independently verified. |
| DPA applicability assessed | `PENDING` | Public DPA and support guidance reviewed; qualified legal/privacy review and account incorporation evidence remain open. |
| Billing entity evidence recorded | `BLOCKED` | No invoice or account billing evidence supplied. |
| Current subprocessors reviewed | `BLOCKED` | URL recorded; current list contents, locations, purposes, and change date not independently verified. |
| Provider retention understood | `VERIFIED` | Current official data-controls page confirms default abuse-monitoring retention up to 30 days, Responses storage distinctions, and ZDR/MAM approval requirements. Account-specific controls remain pending. |
| AI Processing Schedule reviewed | `PENDING` | `v0.2-review` is ready for founder and qualified legal/privacy review; not approved or signed. |
| Customer election mechanism approved | `PENDING` | Two unchecked organization choices and versioned evidence record are drafted; approval remains open. |
| Privacy/legal reviewer sign-off | `BLOCKED` | Named qualified reviewer and dated approval evidence not supplied; `COM-003` remains blocked. |
| Consent version approved | `PENDING` | No effective schedule version is approved. |
| Production Consent Gate deployed/tested | `BLOCKED` | Local gate is `LOCAL_TESTED`; production deployment and production-shaped rehearsal were not authorized or performed. |
| Final founder activation approval | `BLOCKED` | `DEC-PENDING-004` remains `PENDING`; no activation authority recorded. |

## 9. Founder decisions required

| Decision | Recommended review position | State |
| --- | --- | --- |
| Optionality/default | AI optional; every organization defaults disabled; manual/local fallback retained | Founder preference recorded; final approval `PENDING` |
| Provider/account | OpenAI Responses API only under the exact verified Kach account/project | `PENDING` |
| Allowed/prohibited data | Bounded approved operational documents; explicit sensitive-data prohibition | `PENDING` |
| Retention | Disclose actual default/MAM/ZDR state; do not equate `store:false` with ZDR | `PENDING` |
| Schedule/election | Signed versioned organization election, no prechecked choice | `PENDING` |
| Withdrawal | Prospective disablement with verified request and retained evidence | `PENDING` |
| Production activation | Separate from customer authorization and provider verification | `PENDING` |

## 10. Questions for legal/privacy reviewer

1. Confirm Kach's and Customer's roles for each data class and the appropriate legal basis.
2. Confirm whether and how the public DPA is incorporated for this account, without assuming that a separate signature is required.
3. Approve or revise the organization-level election, representative authority standard, and withdrawal timing.
4. Approve the prohibited-data list and treatment of incidental personal information inside business documents.
5. Approve the Global/cross-border disclosure and any required individual notice.
6. Approve provider-retention, exception, breach-notice, subprocessor-change, and deletion language.
7. Confirm document precedence among the signed Agreement/schedule and public Privacy/Terms.

## 11. Readiness decision

- **GO:** founder and qualified legal/privacy review.
- **GO:** collect secret-free account and contract evidence without provider calls or configuration changes.
- **NO-GO:** approve or publish the schedule from this package.
- **NO-GO:** invoke the authorization endpoint or activate the global gate.
- **NO-GO:** production deployment.
- **NO-GO:** real-customer AI processing and overall real-data pilot.
