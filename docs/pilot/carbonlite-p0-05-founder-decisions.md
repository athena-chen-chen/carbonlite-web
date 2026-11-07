# CarbonLite P0-05 Founder Decision Package

**Related task:** `AI-001`
**Related Decision Log entry:** `DEC-PENDING-004` — remains `PENDING`
**Prepared:** 2026-11-06
**Package state:** `READY_FOR_FOUNDER_AND_LEGAL_PRIVACY_REVIEW`; no decision is recorded by this document
**Founder preference record:** `FDR-2026-003` is `PENDING_FOUNDER_APPROVAL`

## 1. Recommended interim position

Keep AI processing with real customer data **NOT AUTHORIZED**. Keep the overall real-data pilot **NO-GO**. Continue synthetic review and preserve manual entry plus local spreadsheet/JSON parsing as the non-AI fallback.

The code has a bounded OpenAI extraction path and human review, but the customer, provider-account, retention, contract, and authorization controls are not ready for a real-data commitment.

The founder has proposed, without approving, that AI remain optional and organization-default-disabled; that allowed documents be limited to electricity bills, natural gas bills, fuel purchase invoices, and other specifically approved energy or activity records; and that verified withdrawal requests use `carbonliteai@gmail.com`. The proposed acknowledgement target is within 2 business days after verified withdrawal. Prompt technical disablement of new AI requests must follow verification and must not wait for the acknowledgement deadline. These preferences remain `PENDING_FOUNDER_APPROVAL`.

## 2. Decisions required

Each row requires an explicit named authority, decision date/time and timezone, effective date, scope, conditions, and durable evidence. Leave it pending if any required reviewer or fact is missing.

| # | Decision | Recommended proposal for review | Required authority | Current state |
| ---: | --- | --- | --- | --- |
| 1 | Allow real-data AI extraction? | Keep disabled until every row below and AI-001 acceptance criteria are closed | Founder/business, legal/privacy, infrastructure/security | `PENDING` |
| 2 | Provider and endpoint | OpenAI Responses API only; exact contracting entity, account/project, model snapshot/alias policy, and endpoint/region must be verified | Founder/business, infrastructure/security, legal/privacy | `PENDING` |
| 3 | Allowed data | Proposed classes: electricity bills, natural gas bills, fuel purchase invoices, and other specifically approved energy or activity records; each class and supported format remains subject to approval | Founder/business, legal/privacy, product | `PENDING` |
| 4 | Prohibited data | Prohibit credentials, payment/banking credentials, government IDs, health/biometric/genetic/criminal data, employee files/payroll, minors' data, and similarly sensitive data unless separately approved | Legal/privacy, founder/business | `PENDING` |
| 5 | Whole-file transmission | Disclose and, if accepted, authorize complete PDF/CSV/JPEG/PNG content plus filename for file inputs; do not describe this as field-only sharing | Legal/privacy, founder/business | `PENDING` |
| 6 | Provider retention posture | Verify and adopt the actual account state: default abuse monitoring, MAM, or ZDR. Do not equate `store:false` with ZDR | Infrastructure/security, legal/privacy, founder/business | `PENDING` |
| 7 | Region/transfers/subprocessors | Approve only the verified endpoint, storage/processing locations, transfer wording, DPA/terms, subprocessor list, and change-notice process | Legal/privacy, infrastructure/security | `PENDING` |
| 8 | Customer authorization | Signed AI schedule plus organization-level election before provisioning; pre-upload notice; AI disabled when election absent/expired/withdrawn | Legal/privacy, founder/business, product | `PENDING` |
| 9 | Human review/limitations | Preserve `REVIEW_REQUIRED`; disclose error/omission risk and no certification/professional advice | Founder/business, product, legal/privacy | `PENDING` |
| 10 | CarbonLite retention | Apply the pending 30-day active-system completion preference to AI extraction drafts only after RET-002 approval and implementation; independently decide AI-job/log/evidence treatment | Founder/business, legal/privacy, operations/product | `PENDING` |
| 11 | Provider deletion wording | Separate CarbonLite active-system deletion from provider expiry, safety/legal exceptions, and backups; make no immediate/permanent deletion promise | Legal/privacy, founder/business | `PENDING` |
| 12 | Non-AI fallback | Offer manual entry and local `.xlsx`/`.json` parsing when AI is declined or unavailable | Founder/business, product/operations | `PENDING` |
| 13 | Consent withdrawal/disablement | Proposed contact: `carbonliteai@gmail.com`; acknowledge within 2 business days after verified withdrawal; promptly disable new AI requests once verified without waiting for the acknowledgement deadline; define record and existing-data treatment | Founder/business, legal/privacy, operations/product | `PENDING` |
| 14 | Production activation | Require provider/config evidence, fail-closed organization gate, aligned documents, synthetic rehearsal, release evidence, and final GOV-001 approval | Founder/business, legal/privacy, infrastructure/security | `PENDING` |

## 3. Provider/account evidence the founder should require

- OpenAI account and API organization/project owner;
- exact contracting entity, account plan, accepted terms/order form, and DPA status;
- project ID recorded in a restricted inventory, without exposing credentials;
- data sharing/training opt-in state;
- ZDR/MAM/default retention state at organization and project level;
- endpoint/base URL, storage region, processing region, model eligibility, and prompt-cache behavior;
- current subprocessor-list version and material-change notification path;
- API key custodian, runtime location, least privilege, rotation and revocation process;
- billing/spend limit and incident contact;
- secret-free production screenshots/exports with reviewer and timestamp; and
- evidence that the configured application release uses the reviewed setting.

## 4. Minimum closure choices

### Option A — Keep AI disabled for the paid pilot

- Use manual entry and local spreadsheet/JSON parsing.
- Do not send real customer documents to OpenAI.
- Retain the AI review package for a later controlled enablement.
- This resolves the AI fallback direction but does not by itself close the other real-data P0 gates.

### Option B — Prepare controlled AI enablement

Complete all of the following before authorization:

1. approve the exact provider/account/region/retention boundary;
2. complete counsel review of provider terms, DPA, subprocessors, transfers, and customer wording;
3. approve allowed/prohibited data and CarbonLite/provider retention;
4. implement a fail-closed organization authorization/version gate and AI decline path;
5. align and execute the customer agreement/election before provisioning;
6. rehearse synthetic authorization, denial, extraction, review, retry, logging, deletion, withdrawal, and fallback;
7. verify production configuration without real customer content; and
8. obtain the final multi-authority `GOV-001` decision after all P0 prerequisites close.

## 5. Suggested decision record text if Option A is later approved

> For the specified first paid-pilot organizations, AI-assisted processing of real customer data is not authorized. CarbonLite must keep AI extraction disabled and use the approved manual or locally parsed spreadsheet/JSON workflow. Synthetic AI testing requires separate test authorization and must not use customer data. This decision does not approve the overall real-data pilot and remains subject to the other P0 gates.

Do not place this text in the Decision Log unless the named authorities explicitly approve it with dated evidence.

## 6. Suggested decision record fields if Option B is later approved

- Authority names and roles: ____________________
- Decided at and timezone: ____________________
- Effective date/time: ____________________
- Pilot organizations/environments: ____________________
- OpenAI entity/account/project: ____________________
- Endpoint/region/model: ____________________
- Data-sharing and ZDR/MAM/default state: ____________________
- Allowed/prohibited data: ____________________
- Customer disclosure/election versions: ____________________
- CarbonLite/provider retention and exceptions: ____________________
- Non-AI fallback: ____________________
- Conditions/expiry/review date: ____________________
- Evidence bundle: ____________________

## 7. GO/NO-GO recommendation

- **GO:** founder and qualified legal/privacy review of the package.
- **GO:** synthetic-only non-AI workflow preparation within existing task controls.
- **NO-GO:** publish/activate consent or customer-facing policy changes from this draft.
- **NO-GO:** real-data AI processing.
- **NO-GO:** overall real-data paid pilot until all P0 gates and `GOV-001` close.
