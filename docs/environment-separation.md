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
| `PUBLIC_SIGNUP_ENABLED` | `false` by default. May be `true` only for local development. | `false` | `false` |
| `API_BASE_URL` | `http://localhost:3333/api` | Pilot API URL | Production API URL |
| `FRONTEND_URL` | `http://localhost:5173` | Pilot frontend URL | Production frontend URL |

Frontend-owned variables:

| Variable | Purpose |
| --- | --- |
| `VITE_APP_ENV` | Frontend-visible environment label: `local`, `pilot`, or `production` |
| `VITE_API_BASE_URL` | Frontend API base URL. This should match backend `API_BASE_URL`. |
| `VITE_PUBLIC_SIGNUP_ENABLED` | Frontend signup UI flag. Defaults to disabled; only use `true` locally. |
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

## Pilot User Management Safety Contract

CarbonLite Pilot Demo v0.1 / v0.2 uses minimal role-based access control. It is
not an enterprise identity system.

Required roles:

| Role | Allowed pilot actions |
| --- | --- |
| `ADMIN` | Reset demo data, delete records, edit company settings, manage custom factors, import data, generate reports |
| `MEMBER` | Import data, edit activity records, generate reports, view records, view reports, view factors |
| `VIEWER` | View records, view reports, view factors only |

The frontend permission helpers fail closed when there is no authenticated user
or no company/organization id. The backend must enforce the same checks because
frontend hiding is not a security boundary.

Backend auth requirements:

- `POST /api/auth/login` returns `200` for valid credentials.
- Invalid credentials return `401`, never an uncaught `500`.
- `POST /api/auth/register` must return `403` when
  `PUBLIC_SIGNUP_ENABLED=false`.
- The registration-disabled response should say:
  `Public signup is currently disabled. CarbonLite pilot access is invite-only.`
- Public registration must not create a user unless signup is explicitly enabled
  for local development.
- Missing user, missing password hash, or missing company/tenant relation must
  return a controlled `401` or account-setup error, not a crash.
- Disabled users must not be able to log in.
- Auth tokens must include the user id, role, and company/organization id when
  company setup is complete.
- Users with no company/tenant context must not mutate company-scoped data.

Recommended user status values:

- `ACTIVE`
- `DISABLED`
- `PENDING`

Pilot account model:

- Create pilot users manually through an admin process or seed script.
- Do not expose public signup in pilot or production.
- Use one admin account for Athena / Kach Canada Ltd.
- Create optional `MEMBER` or `VIEWER` accounts for pilot reviewers.
- Reviewers should not receive admin/reset/delete permissions by default.
- Each reviewer should have a separate company/workspace if they will interact
  with non-demo data.

Tenant isolation requirements:

- Every company-scoped query must include the authenticated user's
  `companyId`, `organizationId`, or `tenantId`.
- Detail, update, and delete endpoints must verify the target record belongs to
  the current company before returning or mutating it.
- List endpoints must never return another company's rows.
- Bulk endpoints must apply the company filter together with requested ids.
- System conversion factors may have no company id and be visible to all
  authenticated users.
- Custom factors must always belong to exactly one company and must only be
  visible inside that company.

Company-scoped models:

- `ActivityData`
- `ImportBatch`
- `UploadedDocument`
- parsed or staged input-review rows
- generated reports and report drafts
- `Facility`
- custom conversion factors
- company settings

Destructive endpoint rules:

- Reset Demo Data: `ADMIN` only, environment-gated, exact confirmation phrase,
  company-scoped deletes only.
- Activity record delete and bulk delete: `ADMIN` or `MEMBER`, company-scoped.
- Custom factor create/update/delete: `ADMIN` only, company-scoped.
- Viewer requests to mutate data must return `403`.

Reset Demo Data must preserve login-critical data:

- users
- companies or organizations
- auth accounts
- sessions
- roles
- company settings
- system factors
- custom factors

Suggested backend regression tests:

- valid demo admin login succeeds
- wrong password returns `401`
- missing user returns `401`
- user with missing company does not crash login
- public signup disabled returns `403` and creates no user
- public signup enabled works only in local development
- disabled user cannot log in
- admin can reset own company demo data
- viewer cannot reset demo data
- reset preserves users, companies, auth accounts, roles, settings, and factors
- company A cannot list, view, update, or delete company B activity records
- company A cannot see company B custom factors
- production reset returns `403` even for admins

## User Audit

Before pilot/UAT, list existing users and review whether public signup created
unknown accounts.

Read-only helper:

```bash
psql "$DATABASE_URL" -f scripts/list-pilot-users.sql
```

Expected columns:

- email
- name
- company
- role
- status
- createdAt
- lastLogin

Do not export or share password hashes, reset tokens, access tokens, or session
secrets. If your backend schema uses different table or column names, adapt the
read-only query before running it.

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
