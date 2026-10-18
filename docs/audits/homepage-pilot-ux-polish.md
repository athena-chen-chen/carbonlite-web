# Homepage simplification — pilot UX polish

Date: 2026-10-18. Scope: homepage presentation and focused tests only.

## Before and after

| Area | Before | After |
| --- | --- | --- |
| Navigation | How It Works, Source Data, Who It's For, Review Package, Pilot Program, plus access buttons | How It Works, For SMEs, For Consultants, Demo; access buttons depend on the existing authentication state |
| Product entry CTA | Dashboard / Login | Open CarbonLite / Sign In; existing `/upload` and `/login` destinations retained |
| Hero copy | Two long paragraphs | Original headline and one concise paragraph; primary audiences named above the headline |
| Hero CTA count | Three actions | Two: Open CarbonLite or Request Pilot Access, plus Watch Demo |
| Demo stats | Sample counts in both a stats row and a mock product panel | Both removed |
| Why CarbonLite | Four overlapping feature cards | Three outcomes: organize data, catch issues, trace results |
| Workflow step count | Six canonical stages | Five user actions, read from the existing presentation-only `USER_WORKFLOW` constant |
| Workflow labels | Long internal descriptions | Set Boundary; Add Data; Resolve Issues; Review Calculations; Generate Report |
| Demo alignment | Upload / extract / review / match / export terminology | Same five action labels; existing video URL, embed handling and hero analytics event retained |
| Audience section | Four equally weighted cards | Canadian SMEs and sustainability consultants; other teams/sites mentioned in supporting text |
| Trust/output content | Separate Source Data, Factor Transparency and Review-ready Output sections | One compact section listing source record, factor, jurisdiction/year, traceability and three export formats |
| Pilot CTA duplication | Header, hero, review-output, middle pilot section and final section | Header access action, hero action and one final invitation; middle CTA sections removed; authenticated pilot request de-emphasized |
| Disclaimer | Long homepage limitations paragraph | “Pilot results require professional review before formal use.” Full report and legal content untouched |
| Accessibility | Responsive layout, headings and buttons | Named sections/navigation, semantic five-item list, focus indicators, wrapping navigation and responsive anchor offsets |

The final content order is hero, Why CarbonLite, How It Works, Product Demo, Who It's For, Review-ready Output, and final invitation. Homepage anchors were simplified; no application route definitions changed. Removing See Sample Workflow removes that homepage shortcut only; sample-workspace functionality was not edited.

## Protected behavior

| Area | Changed? |
| --- | --- |
| Backend | NO |
| Auth behavior | NO |
| App workflow logic | NO |
| Canonical six-stage model | NO |
| Report semantics | NO |
| Database | NO |
| Pilot request submission | NO |
| Calculations, matching and applicability | NO |
| Primary application pages | NO |

## Validation

- Focused homepage unit tests: PASS, 15 tests. Includes public/authenticated CTA states, existing destinations, anchors, demo analytics, five-step consistency, outcomes, audiences, outputs, footer links and CTA counts.
- Browser tests: PASS, three Chromium tests. Public homepage checked at 1440px and 390px; authenticated entry reaches Input Data. Keyboard navigation, sticky-header clearance, horizontal overflow and existing sign-in/pilot destinations checked. Desktop and mobile screenshots inspected. Video content was stubbed in public layout tests; the production video configuration was preserved.
- Typecheck: PASS (`pnpm typecheck`).
- Production build: PASS (`pnpm build:production`). Existing Browserslist and chunk-size warnings remain.
- Full frontend suite: PASS (`pnpm test --maxWorkers=2`), 87 Vitest files / 1,066 tests, plus two database-selection script tests.

The first browser run found a mobile anchor partly obscured by the wrapped sticky header. Mobile link spacing and anchor offsets were corrected; all browser tests then passed. The first full frontend run hit an asynchronous assertion in the unchanged Data Records test (`shows a document-specific empty state when no imported records match`). No non-homepage code or tests were changed; the final run uses two workers.

## Files changed

- `src/pages/LandingPage.tsx`
- `src/pages/LandingPage.test.tsx`
- `apps/web-e2e/tests/homepage-simplification.spec.ts`
- `docs/audits/homepage-pilot-ux-polish.md`

Other pre-existing workspace changes are outside this task.
