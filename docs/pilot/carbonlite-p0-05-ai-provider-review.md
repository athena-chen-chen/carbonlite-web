# CarbonLite P0-05 AI Provider Data Processing Review

**Task:** `AI-001`
**Prepared:** 2026-11-06
**Scope:** Read-only code, document, and official-provider review for the first 1–3 invitation-only paid-pilot organizations
**Decision state:** `DEC-PENDING-004` remains `PENDING`
**Real-data AI processing:** **NO-GO**

This review prepares an owner and legal/privacy decision. It does not approve a provider, policy, contract, consent mechanism, production configuration, or real-data processing. No provider account was accessed and no API request was made.

**Subsequent implementation note (2026-11-06):** Statements below describing the absence of an organization authorization gate reflect the original audit point. CarbonLite later added a locally tested default-deny organization gate and separate global activation gate. They are not deployed or approved. Current evidence is recorded in [`carbonlite-ai-001-consent-gate-implementation.md`](./carbonlite-ai-001-consent-gate-implementation.md) and [`carbonlite-ai-001-dpa-consent-approval-package.md`](./carbonlite-ai-001-dpa-consent-approval-package.md).

## 1. Evidence labels

| Label | Meaning in this review |
| --- | --- |
| `VERIFIED_FROM_CODE` | Directly observed in repository code or configuration templates. |
| `VERIFIED_FROM_PROVIDER` | Directly supported by current official OpenAI documentation reviewed on 2026-11-06. This does not verify CarbonLite's account settings or contract. |
| `OWNER_REPORTED` | Supplied as operating context but not independently verified. |
| `UNKNOWN` | No sufficient repository, provider-account, contract, or production evidence was available. |

## 2. Executive conclusion

- CarbonLite has one implemented AI provider path: OpenAI's Responses API, invoked through the Node `openai` SDK `^6.34.0` with model `gpt-4o-mini`. (`VERIFIED_FROM_CODE`)
- AI extraction sends the complete source bytes for PDF, CSV, JPEG, and PNG inputs. PDF/CSV are sent as file inputs with the source filename; JPEG/PNG are sent as base64 image inputs. JSON and Excel inputs use local parsing and do not call OpenAI in the inspected path. (`VERIFIED_FROM_CODE`)
- The request sets `store: false` and disables SDK retries for that call with `maxRetries: 0`. This is not evidence of Zero Data Retention. OpenAI states that default abuse-monitoring logs may retain customer content for up to 30 days, while Zero Data Retention or Modified Abuse Monitoring requires separate eligibility, approval, and organization/project configuration. (`VERIFIED_FROM_CODE`, `VERIFIED_FROM_PROVIDER`)
- Repository configuration proves only that an `OPENAI_API_KEY` is required. It does not establish the API account owner, project, contracting entity, data-sharing setting, retention control, processing region, DPA, or production key custody. (`VERIFIED_FROM_CODE`, `UNKNOWN`)
- The current upload workflow gives a general authorized-upload notice but has no AI-specific disclosure, consent record, per-organization enablement gate, or non-AI choice at the extraction action. The public Privacy Policy names OpenAI and possible processing outside Canada, but the Terms and pilot acknowledgement do not create a complete AI authorization record. (`VERIFIED_FROM_CODE`)
- **AI-001 is not ready for approval or real-data use.** The minimum safe state is AI disabled for real customer data, with manual entry and local spreadsheet/JSON parsing retained as the fallback.

## 3. Implemented provider inventory

| Item | Finding | Evidence state |
| --- | --- | --- |
| AI provider | OpenAI | `VERIFIED_FROM_CODE` |
| SDK | Node package `openai` `^6.34.0` | `VERIFIED_FROM_CODE` — [`package.json`](../../../carbonlite-api/package.json) |
| Endpoint | SDK call `openai.responses.create(...)`, corresponding to `/v1/responses`; no alternate `baseURL` is configured | `VERIFIED_FROM_CODE` — [`openai.client.ts`](../../../carbonlite-api/src/openai/openai.client.ts), [`document-extraction.service.ts`](../../../carbonlite-api/src/document-extraction/document-extraction.service.ts) |
| Model | Hard-coded `gpt-4o-mini` | `VERIFIED_FROM_CODE` |
| Provider tools | No web search, file search, remote MCP, Code Interpreter, Assistants, vector stores, fine-tuning, or moderation endpoint was found in the inspected AI call | `VERIFIED_FROM_CODE` |
| Other implemented AI providers | None found | `VERIFIED_FROM_CODE` within the searched repositories; production configuration remains `UNKNOWN` |
| API credential | `OPENAI_API_KEY` environment variable; value was not read or exposed | `VERIFIED_FROM_CODE` |
| Account/project owner | Not recorded in repository evidence | `UNKNOWN` |
| Production key custody/rotation | Not verified | `UNKNOWN` |
| Contracting OpenAI entity and plan | Not verified | `UNKNOWN` |

The `AIJobType` enum also lists `GENERATE_REPORT_SUMMARY` and `ASK_DATA_QUESTION`, but the `ai-jobs` controller, module, and service files are empty and the application module does not register an AI-jobs module. No active provider call for those features was found. These enum values and DTOs are dormant schema scaffolding, not evidence of implemented provider processing.

## 4. Actual AI data flow

1. An authenticated workspace contributor selects a document and invokes `POST /api/document-extraction/extract`.
2. CarbonLite verifies organization-scoped document access, reads the managed source file, applies file-type/content/size checks, and marks the document `PROCESSING`.
3. `.xlsx` and `.json` data are parsed locally. PDF, CSV, JPEG, and PNG continue to the OpenAI call.
4. CarbonLite builds a Responses API request containing extraction instructions, a strict output schema, and the source content. It sets `model: "gpt-4o-mini"`, `store: false`, a 60-second deadline, a 16,384-token output cap, and `maxRetries: 0`.
5. OpenAI returns structured activity rows. CarbonLite parses, filters, normalizes, and stores them as a `DocumentExtraction` draft requiring user review.
6. A user reviews and confirms selected rows before they become confirmed Activity Data. The provider output is not automatically treated as final emissions data.
7. Audit/activity events store operation metadata and counts. When organization quotas are enabled, an `AIJob` row records organization, document, creator, status, timestamps, lease, and a generic error message; the current extraction path does not populate its optional prompt/input/output fields.

### Data transmitted to OpenAI

| Data category | Transmitted? | Detail | Evidence state |
| --- | --- | --- | --- |
| Raw PDF | Yes | Complete bytes as base64 `input_file` | `VERIFIED_FROM_CODE` |
| Raw CSV | Yes | Complete bytes as base64 `input_file` | `VERIFIED_FROM_CODE` |
| Raw JPEG/PNG | Yes | Complete bytes as base64 `input_image`, high detail | `VERIFIED_FROM_CODE` |
| Excel workbook | No in inspected path | Parsed locally into review rows | `VERIFIED_FROM_CODE` |
| JSON document | No in inspected path | Parsed locally into review rows | `VERIFIED_FROM_CODE` |
| Filename | Yes for `input_file` | Original filename accompanies PDF/CSV file input; image input does not include a filename field | `VERIFIED_FROM_CODE` |
| MIME type and file size | Used locally; MIME embedded in data URL | Not sent as separate business metadata fields | `VERIFIED_FROM_CODE` |
| OCR text | No separate local OCR text | CarbonLite sends source bytes; provider-side interpretation may derive text | `VERIFIED_FROM_CODE` for CarbonLite behavior |
| Organization identifier | No in request payload found | Used locally for authorization, quota, monitoring, and persistence | `VERIFIED_FROM_CODE` |
| User identifier/email | No in request payload found | May be used in CarbonLite monitoring context, not the OpenAI request | `VERIFIED_FROM_CODE` |
| Personal information | Possible | Any personal data embedded in the source file is transmitted with the file | `VERIFIED_FROM_CODE` capability; actual customer content is `UNKNOWN` and prohibited pending authorization |
| Extracted response | Yes, provider to CarbonLite | Activity type, dates, quantities, units, locations/facilities, optional cost/source reference/notes, and air-travel fields | `VERIFIED_FROM_CODE` |

## 5. Logging, retries, caching, errors, and persistence

| Control | Current implementation | Boundary/gap |
| --- | --- | --- |
| Request logging | Logs document ID, storage key, model, MIME type, modality, and file size. Safe-log rules redact common content keys and provider credentials. | Storage keys and internal identifiers reach application logs/monitoring. Production destinations and retention are unverified. |
| Response logging | Logs status and row counts, not the raw provider response. | Provider-side logging remains governed by the actual OpenAI account controls. |
| Error monitoring | Provider errors are reduced to a safe category/status before optional Sentry capture; raw provider error/config/response is not handed to Sentry in this path. | Sentry production enablement, location, and retention are unverified. User ID/email and organization ID may be attached to an error event. |
| Retry | The OpenAI request explicitly uses `maxRetries: 0`; user-triggered retry can submit the document again. | Repeated user retries create new provider requests. No consent re-check or per-customer AI gate exists. |
| Timeout/concurrency | 60-second deadline; process-local duplicate suppression; database-backed quota leases when quota policy is enabled. | A timeout does not prove provider-side cancellation or deletion. |
| Application cache | No application cache of prompts/provider responses was found in this path. | OpenAI prompt-caching behavior and account configuration remain provider/account dependent. |
| Extraction draft storage | Structured response is stored in `DocumentExtraction.extractedJson` and `extractedRows` until document/workspace deletion. | No independent age-based expiry is implemented. RET-002 and DAT-001 remain open. |
| AI job storage | Quota-enabled extraction creates metadata-only `AIJob` rows. Schema permits prompt/input/output/error payloads, but current extraction does not populate those optional payload fields. | No independent AI-job expiry/minimization control; dormant fields could be populated by future code without a policy gate. |
| Deletion | Deleting a document cascades its `DocumentExtraction`; organization erasure cascades organization-owned `AIJob` rows. | No provider erasure call exists for abuse-monitoring records, and the active-system/backup policies remain pending. |

## 6. Current official provider findings

Official evidence was reviewed on 2026-11-06. Provider documentation can change; approval evidence should retain a dated copy or screenshot and the exact CarbonLite organization/project configuration.

| Topic | Finding | Evidence state |
| --- | --- | --- |
| Model training | OpenAI states API data is not used to train or improve models unless the customer explicitly opts in to data sharing. | `VERIFIED_FROM_PROVIDER` — [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) |
| Default abuse monitoring | Logs may contain prompts, responses, and derived metadata and are retained for up to 30 days by default, with stated legal/harm exceptions. | `VERIFIED_FROM_PROVIDER` — [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) |
| `store: false` | It controls Responses API application-state storage; it does not establish Zero Data Retention or remove default abuse-monitoring retention. | `VERIFIED_FROM_PROVIDER`; CarbonLite setting is `VERIFIED_FROM_CODE` |
| ZDR/MAM | Zero Data Retention and Modified Abuse Monitoring are eligibility/approval-based controls configured at organization or project level. `/v1/responses` is listed as eligible subject to limitations. | `VERIFIED_FROM_PROVIDER`; CarbonLite eligibility/configuration is `UNKNOWN` |
| File/image exception | Official guidance states image and file inputs may be retained for manual review if potential CSAM is detected, even under enhanced retention controls. | `VERIFIED_FROM_PROVIDER` — [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) |
| Prompt caching | Official guidance describes encrypted prompt-cache application state that may persist up to 24 hours for affected models/features. CarbonLite does not set a prompt-cache option. | `VERIFIED_FROM_PROVIDER`; actual CarbonLite caching behavior/account setting is `UNKNOWN` |
| Data residency | OpenAI documents regional storage/processing options, including a Canada storage endpoint that requires enhanced retention controls; the reviewed page does not show Canadian processing for that option. CarbonLite configures no regional base URL. | Provider capability `VERIFIED_FROM_PROVIDER`; CarbonLite region is `UNKNOWN` |
| Subprocessors | OpenAI publishes a current subprocessor list, including API-related providers and processing locations/purposes. The list is dynamic and must be reviewed with the exact service/account. | `VERIFIED_FROM_PROVIDER` — [OpenAI subprocessor list](https://platform.openai.com/subprocessors/openai-subprocessor-list/) |
| DPA | OpenAI's subprocessor page references an OpenAI Data Processing Agreement, establishing that a DPA document exists. CarbonLite has no evidence that the applicable DPA was executed or reviewed. | Availability reference `VERIFIED_FROM_PROVIDER`; CarbonLite status `UNKNOWN`. Manual review: [OpenAI Data Processing Addendum](https://openai.com/policies/data-processing-addendum/) |
| Contractual terms | No CarbonLite account contract, order form, entity, or accepted version was available. | `UNKNOWN`. Manual review: [OpenAI Services Agreement](https://openai.com/policies/services-agreement/) and applicable service terms shown for the account |
| Security/deletion commitments | Public documentation alone does not prove CarbonLite's account configuration or give CarbonLite a mechanism to delete default abuse-monitoring logs. | `UNKNOWN` for CarbonLite commitment capability |

This is a technical and operational review, not a conclusion that CarbonLite or OpenAI complies with any law.

## 7. Contract and customer-document inconsistencies

| Artifact | Existing position | Inconsistency or missing element |
| --- | --- | --- |
| Paid Pilot Agreement | Names OpenAI among candidate providers; says final providers, regions, data classes, terms, and DPA must be completed before real data. | Schedule B has no final AI purpose, exact provider entity/project/region, provider retention, authorization, opt-out/fallback, or AI-specific deletion limitation. |
| Privacy Policy | Says requested AI extraction may send document content to OpenAI and providers may process/store outside Canada. | Does not say full source files/filenames can be transmitted; does not explain `store:false`, up-to-30-day default abuse monitoring, account-specific ZDR status, AI draft persistence, explicit authorization, or fallback. It mixes active and contemplated subprocessors. |
| Terms of Use | Requires upload rights and human review generally. | Does not expressly authorize third-party AI processing, identify OpenAI, describe cross-border processing, or preserve a non-AI route. |
| Pilot acknowledgement | Covers reporting limitations and certification. | It is not stored as a durable customer agreement/consent record and does not address AI, data classes, provider, cross-border processing, retention, withdrawal, or alternative processing. |
| Upload workflow | Warns users to upload only authorized data and avoid unnecessary sensitive data. | The `Extract data` action sends supported documents to OpenAI without an AI-specific notice, affirmative authorization, consent version, organization policy check, or manual/local choice. |
| Retention/offboarding package | Correctly leaves AI-job/provider retention pending. | No approved provider-side retention position, AI draft expiry, or provider exception wording exists; FDR-2026-002 remains pending. |

## 8. First-pilot control gap matrix

| Requirement | Existing implementation | Evidence | Gap | Priority | Owner | Recommended minimum action |
| --- | --- | --- | --- | --- | --- | --- |
| AI disabled unless approved | No per-organization AI entitlement/consent gate in extraction endpoint | Code review | Any authorized contributor can invoke AI when an API key is configured | P0 | Application owner / business owner | Keep production AI unavailable for real data; before enablement add a fail-closed organization-level authorization gate tied to an approved policy/consent version. |
| Exact provider account and region | API key only; default SDK endpoint | Code review | Account owner, project, region, plan, data controls, and key custody unknown | P0 | Infrastructure / security owner | Capture secret-free account/project evidence, endpoint/region, data-sharing and retention-control settings, owner, billing entity, and key rotation. |
| Provider terms and DPA | Public provider documents identified | Official links | No executed/reviewed CarbonLite contract or DPA evidence | P0 | Legal/privacy / business owner | Counsel reviews applicable agreement, DPA, subprocessor list, transfers, retention exceptions, and account entity; record dated disposition. |
| Customer authorization | General upload notice and public Privacy wording | Code/document review | No complete AI authorization record or fallback election | P0 | Legal/privacy / business owner | Use a signed AI schedule plus organization-level election before provisioning; record version, signer authority, time, scope, and withdrawal/disablement path. |
| Data minimization/prohibited inputs | File validation and generic sensitive-data warning | Code/document review | Whole files are sent; prohibited categories are not explicit at upload | P0 | Privacy / product owner | Approve allowed/prohibited data classes; add pre-upload AI disclosure and prohibited-data warning; accept only minimum necessary pilot documents. |
| Human review | Extracted rows remain `REVIEW_REQUIRED` before confirmation | Code review | Contract/disclosure wording is incomplete | P0 | Product / legal owner | Preserve review-before-confirmation and state that extraction may be incomplete or wrong and is not professional advice. |
| Provider retention disclosure | `store:false` in code | Code/provider review | ZDR/MAM, prompt caching, exceptional retention, and actual account settings unknown | P0 | Infrastructure / legal/privacy | Verify account controls; disclose the actual default/enhanced retention state without describing `store:false` as ZDR. |
| CarbonLite AI draft/job expiry | Document draft persists; AI job schema has no age expiry | Schema/service review | No approved automated or repeatable expiry | P0 | Privacy / application / operations owner | Adopt RET-002/AI-001 periods and implement/rehearse repeatable draft/job deletion before real-data AI use. |
| Customer documents aligned | Agreement/Privacy/Terms/upload wording differ | Document review | Material omissions and conflicts remain | P0 | Legal/privacy / business owner | Approve one consistent clause set and effective version before signature or upload. Do not publish from this task. |
| Production evidence | None inspected or authorized | Scope boundary | Deployment, runtime endpoint, provider settings, logs, and controls unverified | P0 | Infrastructure / security owner | Complete secret-free production configuration review and synthetic end-to-end evidence after approval; no real data. |
| Provider-change process | Agreement contemplates final list | Document review | No notice/change procedure adopted | P1 | Legal/privacy / operations | Maintain a versioned provider register and contractual material-change notice process. |
| Dormant AI schema/functions | Optional payload fields and unused job types exist | Schema/code review | Future features could broaden processing without re-review | P1 | Application / privacy owner | Add AI change-review criteria; keep dormant features unregistered until separate approval. |

## 9. Minimum viable closure plan

1. **Maintain the stop:** keep real-data AI processing disabled. Permit only synthetic AI tests after separate test authorization; manual entry and local `.xlsx`/`.json` parsing remain the non-AI path.
2. **Verify the exact OpenAI account/project:** owner, contracting entity, API project, regional endpoint, data-sharing setting, ZDR/MAM status, eligible model/endpoint, key custody/rotation, and subprocessor version. Retain secret-free dated evidence.
3. **Complete legal/privacy review:** applicable Services Agreement/order form, DPA, subprocessor/transfers, retention/abuse-monitoring exceptions, security terms, and customer disclosure. Do not claim compliance.
4. **Decide the processing boundary:** allowed document/data classes, prohibited data, model, endpoint, whole-file transmission, human review, retry, local draft/job retention, provider retention, and withdrawal/disablement.
5. **Adopt a minimal consent method:** signed AI schedule plus an organization-level election recorded before provisioning. Add an in-product pre-upload notice and fail-closed organization authorization check; a per-upload checkbox may supplement but should not replace the signed/organization record.
6. **Close retention controls:** approve AI draft/job periods under RET-002/AI-001, add repeatable deletion, and distinguish CarbonLite active-system deletion from OpenAI abuse-monitoring/exception expiry and backups.
7. **Align customer documents:** final Agreement/Schedule B, Privacy, Terms, upload notice, onboarding checklist, and subprocessor register must use the same verified facts and effective versions.
8. **Verify synthetically:** test unauthorized organization denial, authorized synthetic extraction, logs/redaction, human review, retry behavior, consent-version evidence, draft/job deletion, withdrawal/disablement, and manual fallback. Then verify approved production configuration without customer content.

## 10. GO/NO-GO

| Decision | Result | Reason |
| --- | --- | --- |
| Owner/legal review of this package | **GO** | The findings and pending choices are documented. |
| Synthetic-only non-AI workflow preparation | **GO**, subject to existing task boundaries | Manual entry and local spreadsheet/JSON paths exist. |
| Publish or activate customer consent | **NO-GO** | No approval or legal review is recorded. |
| Enable AI for real customer data | **NO-GO** | Provider account/terms/region/retention, consent, application gate, retention controls, and production evidence remain open. |
| Overall real-data paid pilot | **NO-GO** | AI-001 and other P0 gates remain open. |

## 11. Validation performed

- Static inspection of frontend and backend source, Prisma schema, configuration templates, customer-facing pages, pilot agreement, retention package, Master TODO, Dashboard, and Decision Log.
- Focused mocked backend unit tests passed: 3 suites, 35 tests covering extraction payload/modality, `store:false`, response lineage, and safe provider-error logging. The OpenAI client was mocked; no provider request occurred.
- Official OpenAI data-control, regional-processing, and subprocessor documentation reviewed on 2026-11-06.
- No API key or customer content was read; no provider API call, provider login, production access, deletion, migration, deployment, or push occurred.
