# Paid-pilot reporting readiness audit — 2026-10-27

## Scope and frozen baseline

- Frontend baseline: `1a10f05e`
- Backend baseline: `f0aa475b`
- Scope: Upload/Confirm persisted state through Dashboard, report preview, PDF/CSV presentation, traceability, deletion, and historical snapshot preservation.
- Factor methodology, numerical factor values, production data, deployment, and unrelated working-tree changes were out of scope and were not changed.

## Findings and remediation

The persisted calculation result remains the reporting source of truth. Dashboard/report totals are built from stored calculation details, not from a browser-side recalculation. Scope classification and factor provenance continue to come from the stored factor snapshot/override. Historical calculation snapshots remain immutable.

Four presentation/count defects were found and corrected:

1. Tracked-only metrics were counted as skipped, while unresolved structured source-review rows were omitted from the report's review count.
2. Uncalculated records could render a blank emissions unit or look like a calculated zero.
3. Unsupported Alberta electricity rows did not explain clearly enough that no approved corporate-inventory factor was available and reference-only factors were ineligible.
4. The skipped-reason breakdown ignored structured source-review rows.

The corrected report distinguishes persisted imported activities from all source records found, counts tracked metrics separately from Needs Review, renders uncalculated values as `Not calculated`, and carries the Alberta explanation consistently into screen, PDF, and CSV paths. It does not expose or apply the unsupported `0.53 kgCO2e/kWh` pilot factor.

## Golden reconciliation

| Scenario | Old | Removed unsupported Alberta electricity | New calculated total | Included | Needs Review / skipped | Tracked |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Golden A | 579.40 | `980 × 0.53 = 519.40` | **60.00** | 1 | 7 | 1 |
| Golden C | 2428.44 | `1250 × 0.53 = 662.50` | **1765.94** | 4 | 1 | 0 |
| Combined | 3007.84 | `519.40 + 662.50 = 1181.90` | **1825.94** | 5 | 8 | 1 |

Exact combined arithmetic:

```text
60.00 hotel
+ 420.24 natural gas
+ 808.50 gasoline
+ 45.00 hotel
+ 492.20 air travel
= 1825.94 kgCO2e
```

Scope reconciliation:

```text
Scope 1 = 420.24 + 808.50 = 1228.74
Scope 2 = 0.00
Scope 3 = 60.00 + 45.00 + 492.20 = 597.20
Combined = 1228.74 + 0.00 + 597.20 = 1825.94
```

The combined source workflow contains 14 rows: 5 calculated/included, 8 Needs Review/unsupported, and 1 tracked metric. Six persisted activity records remain (the five calculated records plus the tracked metric). The Dashboard/report/CSV regression contract reconciles to `1825.94 kgCO2e`.

## Mutation and persistence checks

- Confirm/import reevaluates factor eligibility server-side. A newly calculated Alberta ordinary Scope 2 electricity result cannot be persisted with the unsupported pilot factor; the row remains `REQUIRES_REVIEW` with `MISSING_FACTOR`, `calculatedEmissions = null`, and no factor snapshot.
- Confirm retry/concurrency coverage remains green and prevents duplicate current-state persistence.
- Backend delete coverage proves `53.60 → 26.80 kgCO2e` when one included record is removed; deleting the unsupported Alberta row leaves the total at `26.80` and changes skipped `1 → 0`.
- Golden report deletion coverage proves `1825.94 → 1405.70 kgCO2e` after deleting the `420.24` natural-gas record, with included `5 → 4`, while Needs Review stays `8`; deleting a source Needs Review row leaves emissions unchanged and changes Needs Review/skipped `8 → 7`.
- Historical snapshot regression coverage is unchanged and green. No factor snapshot or historical numerical value was rewritten.

## Factor-policy confirmations

- `0.53` automatically selectable: **NO**
- Alberta EGDF automatically selectable for ordinary Scope 2: **NO**
- ECCC reference-only electricity factors automatically selectable: **NO**
- Factor numerical values changed: **NO**
- Historical snapshots changed: **NO**
- Production database changed: **NO**

## Validation evidence

- Frontend focused reporting/factor-policy tests: `106/106` passed.
- Frontend full test suite, deterministic single-worker run: `1476/1476` passed (`108` files). The default parallel runner showed unrelated timing/order flakes on repeated runs; the deterministic run was clean.
- Frontend TypeScript: passed.
- Frontend pilot build: passed (chunk-size warnings only).
- Backend focused unit snapshot/governance/security tests: `60/60` passed.
- Backend full unit suite: `558/558` passed (`41` suites).
- Backend full E2E suite against disposable `carbonlite_ci_test`: `231/231` passed (`35` suites).
- Backend build: passed.
- No production database connection or mutation was used.

## Remaining paid-pilot blockers

No unresolved runtime correctness blocker was found within this reporting-readiness scope. Boundary completion and reviewer approval remain explicit report readiness states rather than silently asserted certifications. The frontend's default parallel test command retains an unrelated timing/order reliability issue; the complete deterministic test run passes.
