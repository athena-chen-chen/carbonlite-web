# Task 9C — Pilot UX simplification

Completed 2026-10-18. Scope: interactive frontend presentation only.

## Audit and result

Before implementation there was no general reusable page header. Reports had a specialized header in `src/reports/components/ReportPresentationSections.tsx`. Workflow panels were inline in `UploadPage.tsx` and `DataCollectionGuidePage.tsx`; canonical definitions remain in `src/constants/carbonliteWorkflow.ts`.

Stage wording appeared in Organization & Boundary, Input Data, Data Records, Emission Factors, Reports, the guide's document instructions, and Calculation Review's reviewer welcome panel. Input Data repeated all six stage titles and role assignments; the guide repeated the sequence again. Headers differed in title size, spacing, subtitle length, and container treatment. The removed panel showed SME, Data Contributor, Reviewer, Consultant, and organization lead labels; permission notices and contextual reviewer guidance remain.

| Area | Before | After |
| --- | --- | --- |
| Organization header | Stage 1 introduction | Shared header, concise subtitle, Step 1 · Set Boundary |
| Input Data header | Long explanation | Shared header, concise subtitle, Step 2 · Add Data |
| Six-stage Input Data panel | Large panel with role and architecture explanations | Removed; existing read-only notices preserved |
| Data Collection Guide | Long hero and repeated six-stage sequence | Short supporting introduction, reassurance, template download and existing links; document guidance retained below |
| Data Records header | Stage 3 and contributor responsibilities | Shared header, concise subtitle, Step 3 · Resolve Issues |
| Emission Factors stage treatment | Stage 4 of 6 | Short subtitle and Advanced reviewer tool badge; governance controls unchanged |
| Calculation Review header | Internal-workspace description and staged welcome links | Shared header, concise subtitle, Step 4 · Review Calculations; welcome links use page names |
| Reports header | Stage 6 and long instruction | Shared header, concise subtitle, Step 5 · Generate Report |
| Pilot disclaimer | Full disclaimer always expanded | Compact visible pilot warning; native View limitations disclosure retains the exact existing disclaimer |
| Navigation terminology | Boundary hidden under Settings; Factors and Data Guide among primary tabs | Five primary pages ordered; full supporting-tool names in the existing Settings dropdown |
| Accessibility | Existing heading focus, menus and permissions | Heading refs and keyboard behavior retained; current step stated in text and aria-current; navigation wraps on narrow screens |
| Tests | Existing workflow, reporting and permission regressions | Five-header and canonical-stage tests; browser coverage for all seven pages, keyboard disclosures, supporting menus and mobile overflow |

No additional progress navigation was added: the existing navigation and compact step labels provide orientation without a second navigation row. Sample-reviewer restrictions remain unchanged, including hiding Input Data in that account's primary navigation.

## Validation

| Check | Result |
| --- | --- |
| `pnpm test` | PASS: 87 Vitest files, 1,057 tests; two database-selection script tests |
| `pnpm exec playwright test -c apps/web-e2e/playwright.config.ts pilot-ux-simplification.spec.ts` | PASS: three Chromium tests against the existing mocked API |
| `pnpm typecheck` | PASS |
| `pnpm build:production` | PASS |

The first full test run exposed two asynchronous assertion races: a read-only notice/filter caption could appear before fetched rows. Assertions now wait for the actual rows. Focused tests and the final full run pass. Browser tests required permission to bind the local test server under the workspace sandbox. Build warnings about the Browserslist dataset and chunk sizes remain.

PDF tests retain the three golden scenarios (579.40, 338.06, 2,428.44), and report semantics tests retain the combined 3,285.90 kg CO₂e total. Added assertions check canonical Stage 2, 3 and 6 labels in the generated technical PDF and canonical stage labels in readiness items. The six canonical definitions remain independently asserted. No exported report renderer or shared disclaimer text was edited.

| Protected area | Changed? |
| --- | --- |
| Canonical six-stage backend workflow | NO |
| Report readiness six-stage model | NO |
| Calculation logic | NO |
| Factor matching or applicability | NO |
| Database | NO |
| Report/PDF/CSV content semantics | NO |
| Golden expected values | NO |

No backend files, schemas, application workflow logic, import behavior, snapshots, audit events, tenant isolation, or persistence were changed. Backend tests were not required for this presentation-only change. Browser coverage uses mocked data; this is not a new live-backend import certification.

## Files changed for this task

Presentation:

- `src/components/PageHeader.tsx` (new)
- `src/constants/userWorkflow.ts` (new, separate from canonical workflow)
- `src/components/AppNav.tsx`
- `src/pages/OrganizationProfilePage.tsx`
- `src/pages/UploadPage.tsx`
- `src/pages/DataCollectionGuidePage.tsx`
- `src/pages/ActivityDataPage.tsx`
- `src/pages/ConversionFactorsPage.tsx`
- `src/pages/MetricsSummaryPage.tsx`
- `src/pages/ReportingPage.tsx`

Tests and evidence:

- `src/components/PageHeader.test.tsx` (new)
- `src/components/AppNav.test.tsx`
- `src/pages/UploadPage.sample.test.tsx`
- `src/pages/ActivityDataPage.test.tsx`
- `src/pages/ConversionFactorsPage.test.tsx`
- `src/utils/reportingReadiness.test.ts`
- `src/reports/pdf/__tests__/pdfRenderers.test.ts`
- `apps/web-e2e/tests/pilot-ux-simplification.spec.ts` (new)
- `docs/audits/task9c-pilot-ux-simplification.md` (this document)

The workspace contains pre-existing changes; this list identifies this task's contributions rather than all working-tree changes.
