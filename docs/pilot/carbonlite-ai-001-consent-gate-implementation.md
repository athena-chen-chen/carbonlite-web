# CarbonLite AI-001 Organization AI Authorization Gate

**Status:** `LOCAL_TESTED / READY_FOR_REVIEW`
**Prepared:** 2026-11-06
**Decision state:** `DEC-PENDING-004` remains `PENDING`
**Real-data AI:** **NO-GO**

This document records a scoped local implementation for synthetic testing. It does not approve customer wording, provider terms, a production migration, production configuration, or real-customer AI processing.

## 1. Architecture summary

CarbonLite now has one fail-closed organization authorization boundary in the backend:

1. A platform administrator records a verified organization election through a protected admin API.
2. The durable record binds the organization to a status, consent version, provider, processing scope, evidence reference, representative reference, independent verifier, and effective/expiry/withdrawal timestamps.
3. Immediately before the sole active external AI call, `AiAuthorizationService.assertProviderRequestAllowed(...)` verifies the global gate and the current organization record.
4. Any missing, invalid, withdrawn, expired, superseded, cross-tenant, suspended, or unreadable state prevents the provider call.
5. Excel and JSON document processing remain local. Manual activity entry remains independent of AI authorization.

No frontend admin interface was added. The implementation reuses JWT authentication, `PlatformAdminGuard`, the existing organization model, Prisma transaction patterns, and `AuditLog`.

## 2. Durable data model

`OrganizationAiAuthorization` is a one-to-one organization record. Absence of a row means AI is disabled.

| Field | Purpose |
| --- | --- |
| `organizationId` | Tenant-bound primary key and cascading organization reference |
| `status` | `DISABLED`, `ENABLED`, or `WITHDRAWN` |
| `consentVersion` | Exact customer disclosure/election version expected by runtime configuration |
| `provider` | Provider identifier; current supported value is `OPENAI` |
| `processingScope` | Authorized purpose; current supported value is `DOCUMENT_EXTRACTION` |
| `evidenceReference` | Reference to separately controlled authorization evidence; not the agreement content |
| `authorizedRepresentativeReference` | Reference to the customer representative/authority evidence |
| `verifiedById`, `verifiedAt` | Platform administrator who independently recorded the verification and when |
| `effectiveAt`, `expiresAt` | Effective boundary and optional expiry |
| `withdrawnAt`, `withdrawalReference` | Prospective withdrawal state and evidence reference |
| `createdAt`, `updatedAt` | Record history timestamps |

Raw agreements, signatures, customer documents, and consent evidence content are not copied into ordinary audit values. Audit events record status/version/provider/scope and Boolean evidence-presence indicators.

## 3. Administrative workflow

All routes require an authenticated platform administrator; organization owners/admins and ordinary users cannot use them.

| Method and route | Effect |
| --- | --- |
| `GET /api/admin/organizations/:organizationId/ai-authorization` | Read the current organization record for administrative review |
| `PUT /api/admin/organizations/:organizationId/ai-authorization` | Record a verified `ENABLED` or `DISABLED` customer election for an exact consent version/provider/scope |
| `POST /api/admin/organizations/:organizationId/ai-authorization/withdraw` | Mark the current record `WITHDRAWN` and timestamp the withdrawal |

Recording creates `AI_AUTHORIZATION_RECORDED`; withdrawal creates `AI_AUTHORIZATION_WITHDRAWN`. Re-enablement is never automatic: a later `ENABLED` record requires another explicit platform-admin write with complete evidence/version fields and leaves an audit event.

## 4. Provider enforcement

The repository search found one active provider invocation: `openai.responses.create(...)` in document extraction. The gate is called after local file validation/preparation and immediately before that invocation. Therefore it covers initial extraction, user-triggered re-extraction/retry, and quota-managed extraction jobs using the same service. The current `ai-jobs` scaffolding has no separate registered provider worker or invocation.

The check denies unless all of the following are true:

- `REAL_DATA_AI_PROCESSING_ENABLED` is exactly `true`;
- `CARBONLITE_AI_CONSENT_VERSION` is non-empty and exactly matches the record;
- the record belongs to the organization supplied by the authenticated extraction path;
- the organization is active and not `SUSPENDED`;
- status is `ENABLED`, with no withdrawal timestamp;
- provider is `OPENAI` and scope is `DOCUMENT_EXTRACTION`;
- evidence, representative, and verifier references are non-empty;
- verification and effective timestamps are not in the future; and
- optional expiry has not passed.

Missing rows and database failures fail before the OpenAI call. Denied extraction returns a safe message directing the user to manual entry or local Excel/JSON import. A valid organization record alone is insufficient because the independent global gate defaults off when absent or set to any value other than `true`.

No environment was changed. No production activation value or consent version was configured.

## 5. Withdrawal and concurrency boundary

Withdrawal blocks subsequent requests. Work waiting in local extraction preparation rechecks the record immediately before provider invocation, so a withdrawal before that check produces zero provider calls. Once the check passes and the provider request begins, the request is in flight; this implementation does not claim retroactive cancellation. Withdrawal also does not claim deletion of provider-held data, abuse-monitoring records, CarbonLite drafts, source files, backups, or audit evidence.

## 6. Non-AI fallback

- Manual Activity Data creation does not call the AI authorization service.
- `.xlsx` and `.json` document extraction use existing local parsers and do not call OpenAI.
- Review and confirmation of locally parsed rows remain available.
- PDF, CSV, JPEG, and PNG extraction remains AI-dependent in the inspected implementation. If either gate is closed, the backend rejects the provider path with a safe fallback message; it does not silently submit the document.

This does not claim equivalent local extraction for every supported upload format.

## 7. Synthetic test evidence

No real OpenAI request or customer document was used. The OpenAI client was mocked.

| Required case | Local evidence |
| --- | --- |
| New organization defaults disabled | Missing-record service test denies |
| Existing organization without consent denied | Missing-record service test denies |
| Valid consent plus global gate permits | Service test and mocked extraction path permit |
| Global gate disabled | Denied before authorization lookup/provider call |
| Invalid/superseded consent version | Denied |
| Missing evidence | Denied |
| Withdrawal | Denied |
| Queued work recheck | Deferred-read concurrency test withdraws before provider boundary; zero calls |
| Cross-tenant reuse | Lookup remains bound to requested organization ID and denies |
| Suspended organization | Denied |
| Database failure | Error propagates before provider invocation |
| Unauthorized user cannot enable | Focused PostgreSQL E2E denies ordinary and cross-tenant users |
| Unsupported provider/scope | Both denied |
| Manual entry | Existing backend path is independent; PostgreSQL E2E case added |
| Local Excel/JSON | Existing focused local-parser tests remain provider-free |
| Re-extraction | Every call through `extract(...)` reaches the same immediate pre-provider assertion |

Focused unit suites cover the gate, zero-call behavior, provider ordering/failure handling, safe logging, local spreadsheet fallback, provider request shape, and re-extraction entry point. The PostgreSQL E2E test covers the absent-record default, platform-admin-only record creation, ordinary-user and cross-tenant denial, audit minimization, withdrawal, manual entry, and zero calls to the globally mocked OpenAI client.

Validation results on 2026-11-06:

- Eight focused mocked/local unit suites passed: **82 tests passed, 0 failed**. This includes the administrative guard, central authorization service, manual Activity Data service, provider boundary/zero-call assertions, queued-work revocation, safe provider-error logging, PDF request shape, and local Excel/JSON parsing.
- `pnpm exec prisma validate` passed.
- `pnpm build` passed.
- `git diff --check` passed in both repositories.
- All 59 repository migrations applied to a freshly recreated `127.0.0.1:5432/carbonlite_e2e` database. The focused PostgreSQL suite then passed: **1 suite, 2 tests, 0 failures**. The OpenAI client was globally mocked and denial/manual-fallback cases made zero provider calls.
- Frontend tests were not run because no frontend application code or behavior was changed.

## 8. Remaining unknowns and approvals

Still `UNKNOWN` or pending:

- exact OpenAI account/project owner, contracting entity, project and key custody;
- production region and cross-border transfer path;
- data-sharing setting and Zero Data Retention / Modified Abuse Monitoring status;
- applicable provider terms, DPA, subprocessors, and account-specific retention exceptions;
- approved consent wording/version and restricted evidence repository;
- qualified legal/privacy approval of authority, legal basis, notice, withdrawal, retention, and transfer wording;
- founder approval of the optional-AI boundary;
- AI draft/job expiry and provider-artifact treatment under `RET-002`;
- production migration, release review, deployment, configuration, monitoring, and independent synthetic rehearsal.

## 9. Production prerequisites and known limitations

Before any real-data use:

1. Keep `DEC-PENDING-004` pending until named founder, legal/privacy, and infrastructure authorities approve the exact scope.
2. Approve and version the customer schedule/disclosure, non-AI election, evidence custody, and withdrawal process.
3. Verify the exact OpenAI account/project, contract/DPA, locations, subprocessors, retention controls, and key custody.
4. Review and approve the migration and release; deploy them to the verified target with rollback/forward-recovery evidence.
5. Set `CARBONLITE_AI_CONSENT_VERSION` only to the approved version.
6. Record and independently verify the exact customer organization election.
7. Set `REAL_DATA_AI_PROCESSING_ENABLED=true` only under a separate explicit production activation decision.
8. Run production-shaped synthetic tests proving denial, withdrawal, tenant isolation, audit evidence, and non-AI fallback.

Known limitations: the record is intentionally minimal rather than a general consent platform; the UI does not expose administration; withdrawal is prospective; in-flight requests are not cancelled; provider deletion is separate; and production/database/provider evidence has not been established.

## 10. Readiness decision

- **Local synthetic implementation:** **GO for review.** The default-deny control is locally implemented and mocked unit evidence passes.
- **Production deployment:** **NO-GO.** No production migration, configuration, deployment, or rehearsal was authorized or performed.
- **Real-customer AI processing:** **NO-GO.** `DEC-PENDING-004`, founder approval, legal/privacy approval, provider/account verification, `RET-002`, and final real-data approval remain open.
