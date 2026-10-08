# CarbonLite E2E Foundation Audit

Date: 2026-10-07

## Phase 0 Findings

1. Monorepo structure: `carbonlite-web` is a standalone Vite React repo. The backend is a sibling repo at `../carbonlite-api`, not inside this checkout.
2. Frontend app path: repository root, with Playwright under `apps/web-e2e`.
3. Backend/API app path: `../carbonlite-api`, NestJS.
4. Package manager: `pnpm`.
5. Lockfile used: `pnpm-lock.yaml` in both web and API repos.
6. Nx usage: no Nx workspace config found in this repo. Some TypeScript config references Nx ambient typings, but there is no local Nx project graph.
7. Existing Playwright config: `apps/web-e2e/playwright.config.ts`.
8. Existing E2E tests: mocked API smoke/regression tests in `apps/web-e2e/tests`.
9. Existing Jest/Vitest tests: Vitest in web via `vitest.config.mts`; Jest in API via `jest.unit.json` and `test/jest-e2e.json`.
10. Frontend dev/start command: `pnpm dev`; Playwright uses Vite on `127.0.0.1:4173`.
11. Backend dev/start command: API has `pnpm dev`; production start is `pnpm build` then `pnpm start`.
12. Production build/start commands: web `pnpm build`; API `pnpm build` / `pnpm start`.
13. API base URL: frontend default is `http://localhost:3333/api`; real E2E uses `E2E_API_BASE_URL` or `http://127.0.0.1:3333/api`.
14. Frontend base URL: Playwright default is `http://127.0.0.1:4173`.
15. Current auth mechanism: `/auth/login` returns a JWT stored in `localStorage` as `accessToken`, with user metadata in `currentUser`.
16. Auth seed/bypass: mocked tests inject localStorage. Real E2E seeds a test-only user and uses normal UI login. No production auth bypass is added.
17. Prisma schema location: `../carbonlite-api/prisma/schema.prisma`.
18. Migration command: `pnpm --dir ../carbonlite-api exec prisma migrate deploy` after `prisma generate`.
19. Existing seed infrastructure: API has `prisma/seed.ts` and `scripts/seed-sample-workspace.ts`; neither is an isolated E2E reset.
20. Existing test DB helpers: API has Jest e2e helpers, but no frontend Playwright DB reset harness.
21. Existing GitHub Actions workflows: `.github/workflows/regression-gate.yml` for unit/build/mocked Playwright smoke.
22. Current CI commands: `pnpm verify:deployment`.
23. Env requirements: web needs `VITE_API_BASE_URL`; API needs `DATABASE_URL`, `JWT_SECRET`, `PORT`, and optional `FRONTEND_URL`.
24. External services: Postgres is required for real API E2E. OpenAI/object storage should not be required for the initial app smoke. Document extraction flows may need service fakes or explicit test-mode handling before becoming real DB E2E.
25. Fixture directories: `apps/web-e2e/fixtures`, `test-data`, and `public/test-fixtures`.
26. Artifact/export behavior: existing mocked workflow validates PDF download filename; Playwright output directories are `apps/web-e2e/test-results` and `apps/web-e2e/playwright-report`.
27. Stable `data-testid`: tests mostly use accessible roles/labels rather than test IDs.
28. Playwright `webServer`: already starts frontend. Real API mode now starts both API and frontend through Playwright webServer entries.
29. Docker/Postgres setup: API has `docker-compose.yml` with Postgres 16 for local dev. The new CI workflow uses a Postgres 16 service database named `carbonlite_e2e`.

## Smallest Safe Plan

1. Keep the existing mocked E2E regression gate for fast frontend coverage.
2. Add a separate real API E2E mode guarded by `E2E_REAL_API=true`.
3. Require `DATABASE_URL` to point at a database whose name contains `e2e` or `test`.
4. Require `ALLOW_TEST_DB_RESET=true` before reset/seed scripts mutate data.
5. Seed only deterministic baseline data: organization, user, membership, facility, and the factor rows required by golden workflows.
6. Start API and frontend through Playwright `webServer` in real API mode.
7. Begin PR gating with a small app/auth/navigation smoke; expand golden import/report tests only after upload/extraction endpoints can run deterministically without external SaaS dependencies.

## Local Real API E2E

Use a dedicated database such as:

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/carbonlite_e2e'
export ALLOW_TEST_DB_RESET=true
export CARBONLITE_API_DIR=../carbonlite-api
export E2E_API_BASE_URL=http://127.0.0.1:3333/api
pnpm e2e:migrate
pnpm e2e:reset
pnpm e2e:seed
pnpm test:e2e:real
```

The seeded login is:

```text
e2e@carbonlite.test
CarbonLiteE2E!123
```

These are test-only values and must never be reused for production.
