# Daily development and local database tests

Run these commands from `carbonlite-web`. Both start the sibling `carbonlite-api`
in watch mode on port 3333. Start the frontend separately with `npm run dev:local`.
Stop the existing backend before starting another mode. Switching databases
requires restarting the backend; there is no runtime database switch.

| Purpose | Backend command | Database file |
| --- | --- | --- |
| Daily work | `npm run dev:neon` | `.env.neon.local` |
| Task 7 fixtures and local manual tests | `npm run dev:localdb` | `.env.docker.local` |

Both files are gitignored by the existing `.env.*` rule. Never put secrets in
the committed `.example` templates. `CARBONLITE_API_DIR` can select a different
backend checkout; it defaults to the sibling `../carbonlite-api`.

## Neon development setup

No Neon development connection was present during the initial audit. Copy
`.env.neon.local.example` to `.env.neon.local`. In Neon, identify a DEVELOPMENT
branch/database separate from production, staging, and pilot. Put its connection
URL in `DATABASE_URL` and its exact hostname in `NEON_DEVELOPMENT_HOST`.
The hostname setting records the operator's confirmation of development purpose;
a Neon hostname or a `neondb` database name cannot establish the branch purpose.
If only production exists, stop and create a development branch first.

Use `sslmode=require`. The startup command refuses missing confirmation, remote
non-Neon hosts, production/staging-looking targets, and conflicting environments.
It cannot independently verify branch metadata with Neon. Do not label a
production endpoint as development.

## Loading and safety

The backend's original `dev` and `start` commands load `carbonlite-api/.env`
through `dotenv/config`; Prisma's CLI also discovers that root `.env`.
Neither automatically selects `.env.local` or a named database environment.
The original backend commands are unchanged:

- `npm run dev`: `nest start --watch`
- `npm start`: `node dist/main.js`
- `npm run build`: `nest build`
- `npm run prisma:migrate`: `prisma migrate dev`
- `npm run seed`: `tsx prisma/seed.ts`

The new wrapper reads backend `.env` for existing backend settings and secrets,
then explicitly sets `DATABASE_URL` from the selected file in the child process.
The selected database wins over an inherited shell URL. Backend `.env` and
`.env.local` are never overwritten. The wrapper forces local development on port
3333, disables demo-auth fallback, and disables Task 7 seeding and demo reset
in Neon mode. Existing database users must authenticate normally.
Only database settings are read from the new files; other secrets stay in the
backend `.env`. `LOCAL_ADMIN_EMAIL` and `LOCAL_ADMIN_PASSWORD` in the existing
backend `.env.local` can be used for local login verification.

Startup prints only `CarbonLite database: Neon development` or
`CarbonLite database: Local PostgreSQL / carbonlite_dev`. To verify selection
without starting a server, run `npm run db:check:neon` or
`npm run db:check:localdb`. These checks validate configuration, not connectivity.

## Migrations and fixtures

Startup runs no migrations or seeds. Intentionally apply committed migrations:

```sh
npm run db:migrate:neon
npm run db:migrate:localdb
```

Both use `prisma migrate deploy` against the selected database. They never reset
it. Use a separate disposable local `*_test`/`*_e2e` database for migration resets
and destructive E2E, using the existing `e2e:db:guard`, `e2e:migrate`, `e2e:reset`,
and `e2e:seed` commands and their explicit opt-ins. The existing E2E reset guard
requires a test/e2e database name, so it intentionally rejects `carbonlite_dev`.
Do not weaken that guard to reuse the manual-fixture database.

Task 7 manual fixtures remain local-only and separately opt-in:

```sh
node --env-file=.env.docker.local scripts/e2e/seed-task7-factor-fixtures.mjs
```

An exported shell URL takes precedence with Node's `--env-file`; the unchanged
Task 7 guard still rejects Neon and remote or production/staging-looking URLs.
See [Task 7 fixtures](task7-manual-test-fixtures.md). Never seed fixtures in Neon.
No production deployment workflow or production migration behavior changes.

## Verification

After starting each backend, check `GET http://localhost:3333/api/health`, log in
with the existing users of that database, and open Admin Factors. Local mode
should show both `dev-task7-*` fixtures. Neon development should show its expected
factors and no Task 7 fixtures. A successful configuration check alone does not
establish any of these live results.

Credential safety checks:

```sh
git status --short
git check-ignore .env.docker.local .env.neon.local
git -C ../carbonlite-api check-ignore .env .env.local
```

## Setup verification — October 15, 2026

- Audit: backend `.env` and `.env.local` both targeted local Docker PostgreSQL.
  No actual Neon URL was present in either checkout's env files; Neon references
  in the backend README and Prisma error guidance do not establish a branch type.
- Docker env file created from the existing local URL; credential files are
  gitignored in both repositories. Templates contain no credentials. No commit
  was made, and existing unrelated working-tree changes were retained.
- Local startup compiled successfully; health returned HTTP 200 and database `ok`.
- Existing seeded admin credentials authenticated successfully. The current API
  returns HTTP **201**, so the requested exact HTTP 200 login contract is unmet.
- Authenticated Factors searches returned HTTP 200 and both Task 7 fixture IDs.
  These were API checks, not a browser inspection of the Admin page.
- Wrapper safety tests passed, including the backend's actual dotenv loader;
  all 14 existing Task 7 fixture tests passed. The fixture guard is unchanged.
- Neon development startup, login, and factor checks remain **not run** until a
  confirmed development connection is supplied. No production connection was
  used and no migration or seed ran during this setup.
