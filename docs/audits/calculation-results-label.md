# Calculation Results page label (2026-10-19)

The current customer-facing page/navigation name is **Calculation Results**. Step 4 of the five-step interactive workflow displays **Step 4 of 5 · Calculation Results** with the subtitle **Review emissions calculations, matched factors, and records needing attention.**

Updated surfaces include main navigation, page heading, pilot reviewer links and instructions, document-scoped report links, upload/manual-entry follow-up links, guide/scope/boundary help copy, homepage workflow presentation, loading/error messages, calculation-page export titles/filenames, UI/browser expected text, README and current user-facing documentation. The shared PageHeader layout remains unchanged.

Routes `/metrics-summary` and the legacy `/calculation-review` alias, route constants, event enums, internal timing/analytics identifiers and the six canonical audit/report workflow definitions remain unchanged. The three historical `primaryPages` references in `carbonliteWorkflow.ts` are preserved as part of the canonical model; they are not rendered as primary navigation or page titles. Historical audit documents retain the terminology used when those investigations were performed. Human review, reviewer sign-off, formal review status and approval semantics are preserved.

No backend implementation, database/schema, historical records/snapshots, factor matching, calculation logic, report scope or aggregation changes were made. All runtime edits are presentation strings. Tests explicitly verify the new heading/step/subtitle, absence of the old primary heading/navigation label, unchanged `/metrics-summary` destination, both active-route aliases and unchanged six-stage workflow definitions.

Verification:

- New PageHeader test asserts Calculation Results, exact step text and subtitle, absence of the old heading, and unchanged route. AppNav tests assert the new label, absence of the old link, and active styling for both existing route aliases. Canonical six-stage assertions remain unchanged and pass.
- All rename-related UI, upload, report, golden-value and matching regression tests pass. Full-suite runs each recorded 1087 passing tests and one asynchronous failure outside this rename: first Emission Factors row rendering, then User Activity summary-card rendering. The two affected files then passed together in isolation (34/34). User Activity source/tests were not edited. No claim of a completely clean single full-suite run is made.
- Chromium browser regressions: 2/2 PASS (Field Mapping calculation/results/report navigation and document-scoped report → Calculation Results → report continuity).
- Typecheck: PASS. Build: PASS, with the existing Vite chunk-size warning.
- Golden A/B/C/combined expectations remain unchanged and pass: 579.40 / 338.06 / 2428.44 / 3285.90 kgCO2e.
- Source audit: no current customer-facing primary navigation/page title uses the old label. Remaining exact-name occurrences are intentionally preserved internal workflow/analytics labels, negative test assertions and historical audit documentation.
- No database operations, backend changes or historical-data rewrites were performed for this rename.
