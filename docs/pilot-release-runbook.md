# Controlled pilot runbook

Status: **release blocked**. See [Task 9 validation](audits/task9-pilot-release-candidate.md) before inviting a user or accepting customer documents. This runbook describes intended operation; it is not evidence that every gate has passed.

Current release blockers include historical summaries changing after factor edits, inconsistent frontend/backend calculation totals, corrected spreadsheet rows not importing, incomplete manual snapshots, unsupported persisted boundary review, migration drift/checksum integrity, and failing validation suites. Ordinary administrator boundary material saves/reloads pass. A Task 9 fix prevents default-date initialization from overwriting an early reporting-period edit. Do not treat a successful PDF download as evidence that these gates passed.

## Environment and access

The RC target is a local frontend → local API on port 3333 → the explicitly confirmed **Neon development branch**. Neon main is protected and is never a development, seed, migration-test, or reset target. No production deployment is authorized by this runbook.

An operator must check the actual Neon project/branch identity before supplying the endpoint in ignored API `.env.neon.local`. `NEON_DEVELOPMENT_HOST` must exactly match it. A hostname alone does not prove branch purpose. Run the API repository's `npm run dev:neon`, then start the web repository's `pnpm dev:local`. The older web `dev:neon` wrapper expects a separate web env file; do not mix the two loaders. Ensure port 3333 is free before switching databases. The guarded launcher disables demo authentication, fixture seeding, and demo reset; startup does not apply migrations.

Provision each pilot customer into a separate workspace through an intentional administrator process. A read-only `PILOT_REVIEWER` sample account cannot perform the acceptance workflow. A contributor needs appropriate import/manual-entry permissions; the existing API requires an administrator for organization/boundary saves. Do not give credentials to a shared developer workspace. Public signup currently lacks the documented backend environment gate; do not expose this build as invite-only until corrected. Do not weaken JWT authentication for testing.

Before a release freeze, record both repository SHAs, exact dirty-file manifest (or commit reviewed changes), dependency lockfiles, migration checksums, schema diff, runtime target confirmation, and tests. All RC release gates must pass; `migrate status` alone does not prove schema consistency.

## Workflow and current supported inputs

Define organization/boundary → upload or enter source data → review rows and resolve issues → confirm eligible rows → review Activity Records, Calculation Review, factor provenance, audit history, and readiness → export Executive Summary PDF, Technical Review Package PDF, and CSV → log out/in and verify persistence.

The UI accepts PDF, CSV, XLSX/XLS, JPG/JPEG, PNG, and JSON. Spreadsheet parsing is available through Import Spreadsheet; JSON has a structured parser. PDF/image extraction uses OpenAI. Acceptance of a file extension does not establish extraction quality for that file. HEIC is unsupported. Review current usage, dates, units, province, and source evidence before importing. Charges without operational quantities are not waste weights.

Current selectable activities: electricity (kWh, province required), natural gas (m3 or direct GJ), gasoline/diesel (L/liters), air travel and ground transport (km), accommodation (nights), shipping (ton-km), and water (m3, tracked only). Other categories/units are not promised. Natural gas GJ uses a direct factor; no universal GJ-to-m3 conversion is supported.

Corporate pilot baselines remain electricity Alberta 0.53 kgCO2e/kWh, natural gas Canada generic 49.44 kgCO2e/GJ, gasoline 2.31 and diesel 2.68 kgCO2e/L. Task 7/8 protections exclude offset-only, TIER/SGRR-only, reference-only and gas-component factors from direct corporate CO2e matching. Pilot factors can be estimates or use prior source years; inspect the disclosed source, applicability and vintage. These limitations do not justify missing or inconsistent calculations; the current live backend mismatch is release blocking.

Report status is **Pilot Draft**. CarbonLite does not provide regulatory assurance, certification, third-party verification, or carbon-credit eligibility determination. Scope 3 coverage and inventory completeness are limited to reviewed supported records. Optional cost completeness is separate from emissions calculation coverage. Missing cost stays blank; tracked water has no numeric emissions. A complete calculation does not complete a reporting boundary.

## Pilot data handling

Show participants the app's Privacy Policy and Terms of Use before accepting documents. Obtain their permission to process the documents; ask for synthetic or sanitized examples until release gates pass. OpenAI may receive source content for AI extraction. Configured analytics/error providers may process technical and usage data. No promise about provider training, residency, retention, or certification is made here.

The development PostgreSQL database is authoritative for accounts, organizations, boundary material fields, staged rows, ActivityData, metric snapshots, audit events, factor metadata and report metadata. Original uploaded bytes are stored separately in the API checkout's `uploads/` directory. PDFs and CSVs generated in the browser are downloaded copies; a download is not a server backup. Browser drafts and review attestations must not be treated as durable server evidence without verification.

No automated retention schedule, full account erasure workflow, or backup guarantee has been established. Document/record deletion is available subject to permissions and removes related active data; minimal audit metadata can remain. In the current document service, deletion does not establish physical source-byte erasure. Support must verify storage and provider limitations when responding to deletion requests. Do not promise deletion from backups or third-party systems on a fixed schedule.

## Manual backup and recovery

No automatic backup system is added by Task 9. The operator must establish and test a paired database/source-file recovery point before accepting valuable pilot data. Neon branch/history recovery is an option only after checking that the project's actual history window covers the incident; Task 9 has not verified a plan, retention window or restore SLA.

1. Pause pilot writes and stop the development API. Verify the endpoint belongs to development. Record both code versions, migrations, database environment and UTC backup time. Keep credentials outside the backup manifest.
2. From an operator shell with the confirmed development URL, create a restricted backup directory outside the web/public/uploads trees. Use a PostgreSQL-compatible `pg_dump --format=custom` to make a logical database dump. Archive the API `uploads/` directory at the same paused point. Keep database dump, source archive, code manifest and checksums together in access-controlled storage independent of the running API disk. Verify the archive and dump can be read before resuming writes. Never put them in git or an issue attachment.
3. For a mistaken development change, preserve the current state for investigation. Restore the dump into a **new development branch/database** (or use Neon history restore to a new development branch only if its available window is confirmed). Restore paired source bytes into an isolated API directory. Do not restore over main or silently overwrite a live pilot workspace.
4. Point an isolated backend at the restored development endpoint. Compare migration checksums/schema before applying anything. Do not use `db push`, reset, checksum rewrites, or speculative backfills to conceal differences. Reconcile an edited applied migration from its reviewed original and use an explicit forward migration for new schema work.
5. With original source bytes present, test login, tenant isolation, record counts, calculations, factor/provenance snapshots, boundaries, source downloads, audit history and report exports. Compare against the manifest and participant exports. Only then deliberately switch the pilot endpoint and notify affected participants about the verified recovery scope.
6. Document the drill, recovery point and any missing sources. Database-only recovery cannot restore missing local files. If neither a verified dump nor an available Neon history point exists, recovery is not guaranteed; disclose the actual loss and request source re-upload. Do not reconstruct audit events or fabricate source files.

Protect main with separate credentials/endpoints, restricted operator access, reviewed deployments and verified main backup/restore configuration before it holds production data. No main backup guarantee or recovery test is claimed by this development audit.

## Issues

Use the existing in-app feedback mechanism or the Privacy/Terms contact `carbonliteai@gmail.com`. Include the workspace, page, action, time, expected/actual behavior, and a sanitized record/source reference. Never send tokens, passwords, database URLs or raw customer documents in general issue reports. Stop using affected results after a suspected calculation, isolation, source-loss, or history failure; preserve the source and downloaded outputs for an authorized investigation.


Task 9A release-candidate gate: **PASS**. See [remediation, validation and remaining P2 limitations](audits/task9a-blocker-remediation.md) and [sanitized evidence/source hashes](audits/task9a-pilot-rc-evidence.json). Development migration inventory is 48, clean and aligned. All synthetic RC accounts are disabled after testing; provision a fresh authorized pilot account for any subsequent acceptance session. This decision authorizes no production migration or deployment.
