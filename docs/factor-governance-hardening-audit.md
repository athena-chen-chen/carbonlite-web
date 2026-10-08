# Factor Governance Hardening Audit

Date: 2026-10-03

## Scope

This audit covers the `carbonlite-web` checkout. The repository does not include a Prisma schema directory, so database nullability and physical column definitions were inferred from frontend API contracts in `src/services/*`, factor matching/reporting code, and SQL helper scripts in `scripts/`.

## Current Factor Fields

| Field | Type in web contract | Nullable | Meaning | Populated | Used in matching | Shown in UI/report | ActivityData snapshot | CSV/PDF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `id` | string | no | Stable factor id | yes | yes | yes | `matchedFactorId` | indirect |
| `name` | string | no | Display/source factor name | yes | activity inference fallback | yes | `matchedFactorName` | yes |
| `activityType` | string | yes | Activity/category applicability | yes | yes | yes | no, activity has own type | yes |
| `factorValue` | number/string | no | Emission factor value | yes | validated usable | yes | `matchedFactorValue` | yes |
| `unit` / `inputUnit` | string | `inputUnit` optional | Activity input unit denominator | yes | yes | yes | `matchedFactorUnit` stores result/input unit | yes |
| `resultUnit` | string | optional | Emissions numerator, normally kgCO2e | yes | no | yes | folded into `matchedFactorUnit` | yes |
| `jurisdictionCountry` / `country` | string | yes | Country applicability | partially | yes | yes | not separately snapped | report inferred |
| `jurisdictionRegion` / `region` / `jurisdiction` | string | yes | Province/region or generic jurisdiction | yes | yes | yes | not separately snapped | report inferred |
| `sourceYear` | number | yes | Publication/source factor year | yes | yes | yes | `matchedFactorSourceYear` | yes |
| `effectiveYear` | number | yes | Year used for applicability when present | partial | yes | yes | via source year snapshot | yes |
| `effectiveFrom` / `effectiveTo` | string | yes | Effective date range | type-supported | not yet date-range matched | factor detail | no | no |
| `factorVersion` / `version` | string | yes | Version label | yes | tie-break via current version value | yes | `matchedFactorVersion` | yes |
| `sourceAuthority` | string | yes | Publisher/authority, separate from review status | yes | quality tie-break indirectly | yes | `matchedFactorSourceAuthority` | yes |
| `sourceDocument` / `sourceReference` | string | yes | Publication/dataset title | yes | no | yes | `matchedFactorSourceDocument` | yes |
| `sourceUrl` | string | yes | Primary source URL/reference | partial | no | yes | `matchedFactorSourceUrl` added | yes |
| `verificationStatus` | string | yes | CarbonLite review/mapping status | yes | quality tie-break | yes | `matchedFactorVerificationStatus` | yes |
| `confidenceLevel` / `confidence` | string | yes | Reliability/provenance confidence | yes | quality tie-break | yes | `matchedFactorConfidenceLevel` | yes |
| `assumptions` | string | yes | Limits and calculation assumptions | yes | no | yes | `matchedFactorAssumptions` | yes |
| `factorType` | string | yes | SYSTEM/CUSTOM classification | yes | custom/system priority | yes | not separately snapped | yes |
| `factorStatus` / `status` / `isActive` | string/boolean | yes | Lifecycle status | yes | excludes archived/deprecated/inactive | yes | not separately snapped | yes |
| `verified` | boolean | yes | Review flag | partial | quality tie-break | yes | represented by verification snapshot | yes |
| `reviewedBy` / `reviewedAt` | string | yes | Review actor/time | factor version API supports | no | factor detail | no | no |
| `createdAt` / `updatedAt` | string | no | Audit timestamps | yes | `updatedAt` deterministic tie-break | yes | no | no |

## Canonical Governance Model

CarbonLite should treat every factor as an immutable governed data asset with:

- Identity: `id`, `name`, `activityType`.
- Value: `factorValue`, `inputUnit`, `resultUnit`.
- Geography: `jurisdictionCountry`, `jurisdictionRegion`, with `Canada`/null region meaning Canada generic.
- Time: `sourceYear`, `effectiveFrom`, `effectiveTo`, and optional `effectiveYear`.
- Source provenance: `sourceAuthority`, `sourceDocument`, `sourceUrl`, source publication year/date.
- Version: `factorVersion` or factor-version record id/label.
- Review: `verificationStatus`, `confidenceLevel`, `reviewedBy`, `reviewedAt`.
- Assumptions: `assumptions`, `methodology`, `notes`.
- Lifecycle: active/draft/superseded/archived via existing `factorStatus`/`status`/`isActive`.
- Calculation linkage: ActivityData must snapshot factor id, value, unit, source year, version, authority, document, URL, review status, confidence, assumptions, selection reason, and selection explanation.

## Selection Policy

The canonical selector is `findBestConversionFactorMatch` in `src/utils/conversionFactorMatching.ts`.

Selection now filters to usable factors only, then considers activity, unit, country, region, lifecycle, and valid numeric values. It then prefers organization custom factors within the organization before system factors. Within each group it ranks exact activity year, exact jurisdiction before generic jurisdiction, governance quality, non-pilot factors before pilot defaults, default flag, year proximity, update time, name, and id.

Selection metadata is persisted as:

- `factorSelectionReason`: `EXACT_MATCH`, `PRIOR_YEAR_FALLBACK`, `GENERIC_JURISDICTION_FALLBACK`, `PILOT_DEFAULT_FALLBACK`, or `NEAREST_YEAR_PROXY`.
- `factorSelectionExplanation`: canonical human-readable explanation generated by the selector.

## Source Authority Semantics

`sourceAuthority` identifies the publisher of the factor source, not CarbonLite's review status. Internal pilot factors should use `CarbonLite` and keep `sourceDocument` such as `CarbonLite MVP Default Factors v1.0`, `verificationStatus` as `Internal Review Required`, and confidence as pilot/low/placeholder as appropriate.

`SYSTEM` means CarbonLite-provided, not official. Official source provenance and CarbonLite review status remain separate.

## Current Gaps

- Physical DB schema and backend immutability rules could not be verified from this frontend checkout.
- Effective date range matching is represented in contracts but still needs backend/source data and selector date-range policy beyond year matching.
- Factor admin UI has multiple legacy/new surfaces; factor detail is provenance-rich, while legacy forms should be retired or expanded before production use.
- Existing ECCC-labelled frontend reference factors need real official source URLs/documents from backend-managed factor source records before they should be presented as production official factors.
