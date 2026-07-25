# CarbonLite Web

React + Vite frontend for CarbonLite AI.

This app provides document upload, extraction preview, validation, activity records,
Calculation Review, reporting, and pilot demo workflows.

## Tech Stack

- React
- Vite
- TypeScript
- Playwright
- Vitest

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and set local values as needed.

## Common Commands

```bash
pnpm dev
pnpm dev:local
pnpm test
pnpm build
pnpm build:pilot
pnpm test:e2e
pnpm test:smoke
```

## Environment Separation

CarbonLite uses three practical environment profiles:

- Local Development: daily work, disposable/local database, demo reset enabled.
- Pilot / UAT: stable pilot demo database and release branch, demo reset enabled
  with backend guardrails.
- Production: future production database, demo reset disabled.

See [docs/environment-separation.md](docs/environment-separation.md) for the
required environment variables, reset safety contract, seed script contract, and
pilot smoke-test checklist.

## CarbonLite Pilot Demo Smoke Test

Run the deterministic Pilot Demo v0.1 smoke test locally:

```bash
pnpm test:smoke
```

The test starts from the login page and uses local demo credentials from:

```bash
CARBONLITE_DEMO_EMAIL=pilot@carbonliteapp.ca
CARBONLITE_DEMO_PASSWORD=password123
```

The smoke test uses a deterministic Playwright API mock. It does not call AI
services and does not modify a real database. The golden fixture lives at:

```text
apps/web-e2e/fixtures/pilot-golden-dataset.csv
```

The smoke workflow verifies:

- login succeeds
- Reset Demo Data completes
- golden dataset import creates 10 records
- Water is tracked-only and excluded from GHG totals
- Calculation Review totals are Scope 1 `3,313`, Scope 2 `33,247`,
  Scope 3 `725`, and Total `37,285` kgCO2e
- PDF and CSV exports download successfully
- pilot-facing CSV avoids internal database ids
- spreadsheet imports do not display `PDF extraction`
- Factor Library loads with horizontal scrolling and a sticky Actions column

Playwright already keeps screenshots, videos, and traces for failed runs through
`apps/web-e2e/playwright.config.ts`.
