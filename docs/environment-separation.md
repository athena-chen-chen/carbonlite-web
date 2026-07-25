# CarbonLite Environment Separation Plan

CarbonLite is currently pilot-demo ready, not production-ready. This plan keeps
daily development away from the stable Pilot Demo v0.1 workspace while preparing
safe production configuration.

## Environment Matrix

| Environment | Purpose | Database | Demo Reset | Stability |
| --- | --- | --- | --- | --- |
| Local Development | Daily development and Codex changes | Local or disposable dev DB | Enabled | May change daily |
| Pilot / UAT | Pilot demos, demo video, consultant and SME review | Dedicated pilot DB | Enabled with strict guardrails | Stable tagged release only |
| Production | Future production deployment | Dedicated production DB | Disabled | No destructive demo endpoints |

Local development changes must not point at the pilot database unless explicitly
running a controlled pilot smoke or seed task.

## Required Environment Variables

Backend-owned variables:

| Variable | Local | Pilot / UAT | Production |
| --- | --- | --- | --- |
| `APP_ENV` | `local` | `pilot` | `production` |
| `DATABASE_URL` | Local/dev database | Dedicated pilot database | Dedicated production database |
| `JWT_SECRET` | Local secret | Pilot secret | Production secret |
| `DEMO_RESET_ENABLED` | `true` | `true` | `false` |
| `API_BASE_URL` | `http://localhost:3333/api` | Pilot API URL | Production API URL |
| `FRONTEND_URL` | `http://localhost:5173` | Pilot frontend URL | Production frontend URL |

Frontend-owned variables:

| Variable | Purpose |
| --- | --- |
| `VITE_APP_ENV` | Frontend-visible environment label: `local`, `pilot`, or `production` |
| `VITE_API_BASE_URL` | Frontend API base URL. This should match backend `API_BASE_URL`. |
| `VITE_SHOW_TEST_CONTROLS` | May be `true` locally. Must be `false` in pilot and production. |
| `CARBONLITE_DEMO_EMAIL` | Playwright smoke-test login email. |
| `CARBONLITE_DEMO_PASSWORD` | Playwright smoke-test login password. |

Templates:

- `.env.local.example`
- `.env.pilot.example`
- `.env.production.example`

Never share a `DATABASE_URL` between local, pilot, and production.

## Backend Reset Safety Contract

The backend `POST /api/admin/demo-data/reset` endpoint must be guarded before
any delete operations run.

Required gate:

```ts
const appEnv = process.env.APP_ENV;
const resetEnabled = process.env.DEMO_RESET_ENABLED === 'true';

if (!(resetEnabled && (appEnv === 'local' || appEnv === 'pilot'))) {
  throw new ForbiddenException('Demo reset is disabled in this environment.');
}
```

The endpoint must also require an authenticated Owner/Admin and the exact
confirmation phrase:

```json
{ "confirmation": "RESET DEMO DATA" }
```

Reset must always be scoped by the current user's `companyId`,
`organizationId`, or `tenantId`.

Allowed to delete or reset, company-scoped only:

- activity records
- import batches
- uploaded document metadata
- parsed or staged input-review rows
- generated demo reports
- calculation, metrics, or report caches

Never delete:

- users
- companies or organizations
- auth accounts
- sessions
- roles
- company settings
- system conversion factors
- custom factors unless a future explicit factor-reset feature is designed

Production rule: in `APP_ENV=production`, reset must return `403` even for
Owner/Admin users.

## Database Separation

Recommended databases:

| Environment | Database name pattern |
| --- | --- |
| Local Development | `carbonlite_local` or developer-specific disposable DB |
| Pilot / UAT | `carbonlite_pilot` |
| Production | `carbonlite_production` |

Operational rules:

- Pilot deploys use only the `release/pilot-demo-v0.1` branch or an explicit
  pilot tag.
- Local `.env` must not contain the pilot `DATABASE_URL` during daily work.
- Production must use a different database, JWT secret, and frontend URL from
  pilot.
- Backups should be enabled before pilot reviewers begin using the pilot DB.

## Pilot Seed Script Contract

The backend seed command for pilot should be idempotent. Running it repeatedly
must not duplicate users, companies, factors, or golden records.

Required behavior:

- create demo company if missing
- create demo Owner/Admin user if missing
- create required system conversion factors if missing
- update system factor metadata only when the canonical seed version changes
- load the golden dataset only when explicitly requested
- skip golden dataset loading by default to avoid polluting a clean reset state

Suggested backend commands:

```bash
APP_ENV=pilot npm run seed:pilot
APP_ENV=pilot LOAD_GOLDEN_DATASET=true npm run seed:pilot
```

Pilot seed must preserve existing users, companies, auth accounts, sessions,
roles, company settings, and conversion factor ownership.

## Frontend Scripts

Local development:

```bash
pnpm dev:local
```

Pilot-mode local frontend build:

```bash
pnpm build:pilot
```

Future production build:

```bash
pnpm build:production
```

Run the deterministic pilot smoke test:

```bash
pnpm test:smoke
```

Run pilot build plus smoke test:

```bash
pnpm verify:pilot
```

Backend reset can be checked manually with the pilot API only when signed in as
Owner/Admin:

```bash
curl -X POST "$API_BASE_URL/admin/demo-data/reset" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmation":"RESET DEMO DATA"}'
```

Do not run reset commands against production.

## Pilot Smoke Test Coverage

`pnpm test:smoke` is deterministic and does not call AI services. It verifies:

- login works
- Reset Demo Data works
- golden dataset import works
- Data Records count is 10
- Water is tracked-only and excluded from GHG totals
- Scope 1 is `3,313 kgCO2e`
- Scope 2 is `33,247 kgCO2e`
- Scope 3 is `725 kgCO2e`
- Total emissions is `37,285 kgCO2e`
- PDF export downloads
- CSV export downloads
- CSV does not expose internal database ids
- spreadsheet import labels do not show `PDF extraction`
- Factor Library loads with horizontal scrolling and a sticky Actions column

The golden fixture is:

```text
apps/web-e2e/fixtures/pilot-golden-dataset.csv
```

## Pre-Pilot Release Checklist

- Deploy frontend from `release/pilot-demo-v0.1` or tag `pilot-demo-v0.1`.
- Deploy backend with `APP_ENV=pilot`.
- Point frontend `VITE_API_BASE_URL` at the pilot API.
- Point backend `DATABASE_URL` at the pilot database only.
- Set `DEMO_RESET_ENABLED=true` for pilot.
- Verify `VITE_SHOW_TEST_CONTROLS=false`.
- Run the pilot seed command.
- Run `pnpm test:smoke`.
- Manually verify PDF and CSV outputs do not contain debug wording or internal ids.

## Production Preparation Checklist

- Set `APP_ENV=production`.
- Set `DEMO_RESET_ENABLED=false`.
- Use a production-only `DATABASE_URL`.
- Use a production-only `JWT_SECRET`.
- Do not expose sample data loaders or test controls.
- Ensure `/api/admin/demo-data/reset` returns `403`.
- Require a separate production readiness review before enabling real customers.
