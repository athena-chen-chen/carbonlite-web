# CarbonLite Playwright E2E

This project is the CarbonLite deployment regression suite. It tests critical
authenticated workflows with a deterministic, stateful API mock:

1. Upload a document.
2. Extract and review its activity row.
3. Import the row exactly once.
4. Generate and verify the Metrics Summary.
5. Generate the Reports view.
6. Export the report as PDF.
7. Retry a failed extraction.
8. Delete a document and its related imported records.
9. Load, create, and delete conversion factors.

The workflow also fails when the browser logs a console error, any response has
an HTTP 500 status, or the frontend makes an unexpected backend request.

## Run

Install the Chromium browser once:

```bash
pnpm exec playwright install chromium
```

Run headlessly:

```bash
pnpm test:e2e
```

Run only deployment-blocking smoke tests:

```bash
pnpm test:regression
```

Run the complete deployment gate locally:

```bash
pnpm verify:deployment
```

Open Playwright UI mode:

```bash
pnpm test:e2e:ui
```

By default Playwright starts Vite at `http://127.0.0.1:4173`. To test an
already-running or deployed frontend:

```bash
PLAYWRIGHT_BASE_URL=https://carbonliteapp.ca pnpm test:e2e
```

The tests mock backend API responses, so they do not modify production data.

GitHub Actions runs `pnpm verify:deployment` for pull requests and every push
to `main`. Configure `CarbonLite Regression Gate` as a required branch check so
deployment cannot proceed when a critical workflow fails.
