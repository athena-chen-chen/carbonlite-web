# Repository .gitignore audit

Date: 2026-10-18. Only `.gitignore` and this audit note were edited. No files were deleted, staged, or removed from Git tracking. Environment file contents were not read or printed.

## Ignore rules

- Temporary working artifacts: `tmp/` at any depth, including ad hoc copies, renders and downloaded dependencies. The current root `tmp/` contains generated copies/vendor files, not the product sources or reusable RC scripts.
- Dependencies/build/test output: `node_modules/`, `dist/`, `build/`, `coverage/`, `.nyc_output/`, `playwright-report/`, `test-results/`, `blob-report/`, and `**/playwright/.auth/`.
- Caches: `.vite/`, `.vitest/`, `.cache/`, `.parcel-cache/`, `.turbo/`, `.nx/cache/`, `.pnpm-store/`, `*.tsbuildinfo`, `.eslintcache`, `.stylelintcache`, and `__pycache__/`.
- Logs/local files: `*.log`, root `/logs/`, `.DS_Store`, `.env`, `.env.*`. Explicit negations retain `.env.example` and `.env.*.example` at any depth.
- Root downloaded PDFs: `/carbonlite-executive-summary-*.pdf`, `/carbonlite-technical-review-package-*.pdf`, and the existing pilot-data-readiness filename family (now root-scoped to avoid matching fixtures).
- Root generated CSV downloads: sample report exports (`/CarbonLite_Sample_Report_Export_*.csv`), `carbonlite-sample.csv`, the two template filenames, data-record exports, and the five named review-package export families. All filename patterns are root-scoped.
- Three known generated files under `output/reports/report-correctness/`: `executive.pdf`, `technical.pdf`, and `activity-records.csv`. The accompanying README remains visible and commit-eligible; `output/` is not globally ignored.

There are no global `*.pdf`, `*.png`, `*.csv` or `*.xlsx` rules. Existing rules for dependencies, environment files, logs, coverage, Vite and Playwright were normalized; the new coverage includes tmp, export downloads, additional caches and test-output directories.

## Generated artifacts still tracked — proposed list only

39 root PDF exports remain in Git's index: 6 Executive and 33 Technical files, dated October 3–8. All 39 were already marked deleted in the working tree before this audit. `.gitignore` cannot remove tracked files from the index, so those pre-existing deletion statuses remain unchanged.

These are the exact proposed candidates for a later, explicitly reviewed `git rm --cached` operation. No such command has been executed:

```text
carbonlite-executive-summary-2026-10-03-cl-draft-2026-0c5opeh-pilot-draft.pdf
carbonlite-executive-summary-2026-10-04-cl-draft-2026-0c5opeh-pilot-draft.pdf
carbonlite-executive-summary-2026-10-05-cl-draft-2026-0c5opeh-0-1.pdf
carbonlite-executive-summary-2026-10-06-cl-draft-2026-0c5opeh-0-1.pdf
carbonlite-executive-summary-2026-10-07-cl-draft-2026-0c5opeh-0-1.pdf
carbonlite-executive-summary-2026-10-08-cl-draft-2026-0c5opeh-0-1.pdf
carbonlite-technical-review-package-2026-10-03-cl-draft-2026-0c5opeh-pilot-draft.pdf
carbonlite-technical-review-package-2026-10-03-cl-draft-2026-0vplxsv-pilot-draft.pdf
carbonlite-technical-review-package-2026-10-03-cl-draft-2026-0y2fxyg-pilot-draft.pdf
carbonlite-technical-review-package-2026-10-03-cl-draft-2026-0z01ddi-pilot-draft.pdf
carbonlite-technical-review-package-2026-10-03-cl-draft-2026-1262hrm-pilot-draft.pdf
carbonlite-technical-review-package-2026-10-04-cl-draft-2026-0c5opeh-pilot-draft.pdf
carbonlite-technical-review-package-2026-10-04-cl-draft-2026-0vplxsv-pilot-draft.pdf
carbonlite-technical-review-package-2026-10-04-cl-draft-2026-0y2fxyg-pilot-draft.pdf
carbonlite-technical-review-package-2026-10-04-cl-draft-2026-0z01ddi-pilot-draft.pdf
carbonlite-technical-review-package-2026-10-04-cl-draft-2026-1262hrm-pilot-draft.pdf
carbonlite-technical-review-package-2026-10-05-cl-draft-2026-0c5opeh-0-1.pdf
carbonlite-technical-review-package-2026-10-05-cl-draft-2026-0vplxsv-0-1.pdf
carbonlite-technical-review-package-2026-10-05-cl-draft-2026-0y2fxyg-0-1.pdf
carbonlite-technical-review-package-2026-10-05-cl-draft-2026-0z01ddi-0-1.pdf
carbonlite-technical-review-package-2026-10-05-cl-draft-2026-1262hrm-0-1.pdf
carbonlite-technical-review-package-2026-10-06-cl-draft-2026-0c5opeh-0-1.pdf
carbonlite-technical-review-package-2026-10-06-cl-draft-2026-0vplxsv-0-1.pdf
carbonlite-technical-review-package-2026-10-06-cl-draft-2026-0y2fxyg-0-1.pdf
carbonlite-technical-review-package-2026-10-06-cl-draft-2026-0z01ddi-0-1.pdf
carbonlite-technical-review-package-2026-10-06-cl-draft-2026-1262hrm-0-1.pdf
carbonlite-technical-review-package-2026-10-06-cl-draft-2026-158tu9s-0-1.pdf
carbonlite-technical-review-package-2026-10-07-cl-draft-2026-0c5opeh-0-1.pdf
carbonlite-technical-review-package-2026-10-07-cl-draft-2026-0vplxsv-0-1.pdf
carbonlite-technical-review-package-2026-10-07-cl-draft-2026-0y2fxyg-0-1.pdf
carbonlite-technical-review-package-2026-10-07-cl-draft-2026-0z01ddi-0-1.pdf
carbonlite-technical-review-package-2026-10-07-cl-draft-2026-1262hrm-0-1.pdf
carbonlite-technical-review-package-2026-10-07-cl-draft-2026-158tu9s-0-1.pdf
carbonlite-technical-review-package-2026-10-08-cl-draft-2026-0c5opeh-0-1.pdf
carbonlite-technical-review-package-2026-10-08-cl-draft-2026-0vplxsv-0-1.pdf
carbonlite-technical-review-package-2026-10-08-cl-draft-2026-0y2fxyg-0-1.pdf
carbonlite-technical-review-package-2026-10-08-cl-draft-2026-0z01ddi-0-1.pdf
carbonlite-technical-review-package-2026-10-08-cl-draft-2026-1262hrm-0-1.pdf
carbonlite-technical-review-package-2026-10-08-cl-draft-2026-158tu9s-0-1.pdf
```

No tracked tmp/cache/build/report-directory files or generated sample CSV downloads were found. Files under `public/demo/`, `public/test-fixtures/`, `test-data/`, and `apps/web-e2e/fixtures/` are intentional product/demo/test inputs and are not cleanup candidates, even if their filenames contain “sample”, “export” or “DUPLICATE”. The nested `public/test-fixtures/public/test-fixtures/` copy is preserved; fixture deduplication is outside this task.

## Keep committed / commit-eligible

- All product sources, tests and E2E specifications, including the new `src/reports/` code and its tests.
- E2E CSV/XLSX fixtures, public demo PDFs/CSV, test-data libraries, PNG assets and fixture manifests.
- All `scripts/rc/` reusable scripts, development/database scripts and migration-related SQL.
- Human-written documentation, `docs/business-model.md`, audit notes/evidence and `output/reports/report-correctness/README.md`.
- `.env.example`, `.env.local.example`, `.env.pilot.example`, `.env.production.example`, `.env.docker.local.example`, and `.env.neon.local.example`. Four are already tracked; the two new examples remain visible for addition. No staging was performed.
- Prisma migrations: no ignore rule targets Prisma or migrations; representative future migration paths are checked explicitly. The sibling backend repository is outside this edit.

## Verification

Validation results and exact before/after status counts are recorded below after rule checks. Status counts distinguish ordinary aggregated `git status --short` entries from individual paths with `--untracked-files=all`; ignore rules do not reduce Git's tracked-file count.

| Measure | Before | After |
| --- | --- | --- |
| `git status --short` entries | 184 | 154 |
| Individual changed/untracked paths (`--untracked-files=all`) | 436 | 217 |
| Tracked paths | 437 | 437 |
| Modified tracked paths | 68 | 68 |
| Pre-existing deleted tracked paths | 39 | 39 |

Newly hidden existing untracked files: **220** (188 tmp artifacts, 29 root downloaded PDFs, 3 generated output exports). The new audit note adds one visible untracked file. All hidden files still exist; no filesystem deletion occurred.

`git check-ignore --no-index --stdin` checked **508 protected existing paths**, including tracked and untracked source/tests, fixtures, scripts, assets and documentation: **0 accidentally ignored**. **38 representative rule probes passed**, including nested environment examples, binary documentation/fixtures, and Prisma migration SQL. All six environment example paths remain eligible. The Git index is unchanged and has no staged changes. No application tests/build were run for this ignore-only edit; validation directly exercised Git ignore behavior.
