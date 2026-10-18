# External pilot acceptance script

Run only after the release-readiness document approves the build. Use a new, separately provisioned test workspace and a synthetic/sanitized source. A read-only sample reviewer account cannot perform this script. Do not use customer data to diagnose a blocked release.

Current result: **TASK 9 = PILOT RC BLOCKED**. Known failing acceptance points include corrected-row confirmation and durable, consistent calculation history. Use this script to retest fixes with synthetic data; it is not an approval to begin an external customer pilot.

1. **Login:** use the issued account in a fresh/private browser. Check the workspace name and that another customer's data is absent.
2. **Organization & Boundary:** review organization, reporting dates, facilities, scopes and exclusions. Save authorized changes, refresh, and verify them. Leave incomplete fields visibly needing attention; do not claim a review attestation unless it survives a fresh login.
3. **Upload:** open Input Data and upload a supported PDF/image or choose Import Spreadsheet for CSV/XLSX/XLS. Confirm the filename and current usage rows. An unsupported format should show an actionable error.
4. **Review:** inspect activity, quantity, unit, date, province, facility and source reference. Water should be tracked only. Do not turn service fees into waste quantities. Resolve one issue or explain why it must remain unresolved.
5. **Confirm:** confirm eligible records. Check the imported count and remaining review rows. Fix one remaining issue and confirm again: exactly the newly eligible row should import. An unchanged repeat must create zero duplicates. Stop and report a failure if a corrected row cannot import.
6. **Manual Entry:** add Electricity, 980 kWh, Alberta, 2026-10-14. Save it. Expect Scope 2, 0.53 kgCO2e/kWh, 519.40 kgCO2e, and Manual Entry as its source, with no invented uploaded file.
7. **Activity Records:** check quantities, units, facilities, source lineage, and missing optional costs. Refresh to confirm the rows persisted.
8. **Calculation Review:** check included/tracked/needs-review counts and calculation coverage. Compare a displayed result with quantity × disclosed factor. Do not accept totals that differ from reports or change after a factor-library edit without an explicit audited recalculation.
9. **Factor provenance:** inspect source authority/document, source year, factor vintage/version where supplied, units, applicability and assumptions. No internal identifier should be labeled as a semantic factor version.
10. **Audit Trail:** check real upload/import/manual-entry actions, actor, time and source/record identity. Refresh; events should remain ordered without duplicates. A navigation view need not create a workflow event.
11. **Reports:** select the reporting period, generate the report, and inspect readiness, boundary, source review, coverage, traceability and limitations. Calculations alone must not mark the boundary complete.
12. **Executive Summary PDF:** download/open it. Check total, scopes, dates, counts and Pilot Draft limitations; expect approximately two pages for the frozen combined dataset.
13. **Technical Review Package PDF:** download/open it. Check calculations, factor provenance, facilities, source evidence and traceability against the screen. Check every page for clipped or missing content.
14. **CSV:** download/open it. All activity rows must be represented; tracked water emissions and missing costs must be blank, while explicit numeric zero stays zero. Check manual provenance, facilities and factor version labels.
15. **Logout:** log out from the account menu. Protected pages should return to login; a private session should not open the workspace without authentication.
16. **Login again:** sign in, reopen records, Calculation Review, Reports and Audit Trail; compare IDs/counts, values, sources, boundary and history with the prior session.
17. **Persistence:** repeat after an operator restarts the backend. Any missing data, unexplained error, changed calculation or required console/SQL workaround fails acceptance. Report the step and sanitized evidence through in-app feedback.

For the frozen combined acceptance dataset, use ENMAX (358 kWh, 3 GJ, 6 m3 water) + `carbonlite_field_mapping_test.xlsx` + the manual electricity record above. Expect 9 records, 8 emissions-bearing and 1 tracked, 3,285.90 kgCO2e (Scopes 1/2/3: 1,377.06 / 1,371.64 / 537.20), 100% coverage, 8/8 traceability, 5 factors and 8 factor usages. The period is 2025-08-01 to 2026-10-14. This is an acceptance target, not a claim that the current blocked build passes.
