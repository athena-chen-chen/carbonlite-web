# CarbonLite Task Tracker Maintenance

**Applies to:** `CARBONLITE_MASTER_TODO.md` and `CarbonLite_Pilot_Task_Tracker.xlsx`
**Task-ID rule:** IDs are permanent. Never renumber or reuse a retired ID.

## Update procedure

1. Read the latest execution report and the current Markdown and workbook before changing status.
2. Match each result to an existing task by objective and acceptance criteria. Update that task instead of creating a duplicate for a repeated audit statement.
3. Add a new task only when the work has a distinct deliverable, owner, dependency, or acceptance test. Use the existing ID family and next unused number.
4. Attach the narrowest durable evidence link: test report, runbook section, signed decision reference, provider evidence bundle, release record, or customer record. Do not place secrets or real customer data in either tracker.
5. Use only the six allowed statuses. `DONE` requires every acceptance criterion and evidence for the task's stated scope. Local completion stays production-not-ready until deployment and operational evidence exist.
6. If a new real-data blocker appears, set priority `P0`, real-data blocking `YES`, assign an accountable owner, add acceptance criteria, and connect its dependencies. Do not hide it inside a note.
7. Recalculate dates forward from incomplete dependencies. Preserve the original decision or due date in the Change Log when a material date changes.
8. Update affected dependent tasks, weekly views, launch gates, decisions, risks, dashboard counts, and upcoming deadlines.
9. Record one Change Log row with date, editor, task IDs, old state, new state, evidence, and reason.
10. Reconcile the Markdown and Excel versions before finishing. Counts, fields, statuses, owners, dependencies, and evidence must agree.

## Evidence and closure rules

- A test command in prose is not evidence that it ran. Link the dated report or captured result.
- A prepared checklist is not an approval. Approval requires the named authority, decision, date, scope, and evidence reference.
- A local or synthetic pass is not a provider or production pass.
- A deployed build is not production-ready if migrations, monitoring, backups, privacy, methodology, or customer gates remain open.
- A provider screenshot should be timestamped, secret-free, scoped to the exact resource, and independently reviewed when the task requires it.
- Customer-specific agreement, onboarding, feedback, and deletion evidence must use sanitized references in the tracker. Store sensitive records only in the approved restricted system.

## Status transitions

| Status | Use when |
| --- | --- |
| `NOT_STARTED` | No substantive work or reviewable deliverable exists. |
| `IN_PROGRESS` | Work has begun and an owner is actively progressing it. |
| `BLOCKED` | A named dependency, decision, authority, or external condition prevents progress. |
| `READY_FOR_REVIEW` | A complete draft or implementation is available, but required review or approval is not complete. |
| `DONE` | Acceptance criteria and evidence are complete for the stated local, provider, production, or customer scope. |
| `DEFERRED` | An owner intentionally moved the task outside the current pilot plan and recorded why. |

## Dependency and date rules

- Dependencies must reference existing task IDs or `NONE`.
- Do not mark a task `DONE` while a required acceptance dependency remains open.
- A blocked task may retain a suggested date, but the dashboard should show that the date is conditional.
- Use 2026-11-06 as the planning baseline for this initial tracker. Do not use `TODAY()` to rewrite the historical baseline.
- Keep customer discovery and synthetic demos parallel to infrastructure work, but never let them authorize real-data onboarding.

## Workbook synchronization checklist

- `All Tasks` contains exactly one row per Markdown task.
- `P0 Launch Gates` contains every and only open real-data-blocking P0 task.
- `Completed Evidence` contains every and only `DONE` task.
- `Weekly Plan` preserves the suggested dates and schedule band.
- Every `Weekly Plan` task status matches the corresponding authoritative `All Tasks` status; correct stale derived cells without changing the authoritative task state.
- `Decisions & Approvals` does not show a blank or proposed item as approved.
- `Risks & Blockers` includes all `BLOCKED` tasks and material launch risks.
- Dashboard formulas recalculate total tasks, completed tasks, open P0 gates, status counts, and upcoming deadlines.
- Status, priority, owner, code-readiness, production-readiness, and real-data-blocking validations remain intact.
- Add one `Change Log` row for the update.
- Validate formulas, conditional formatting, filters, frozen panes, and date formats before export.

## Release evidence synchronization

- Record application candidate SHAs separately from later documentation-only governance commits so the runtime release pair remains unambiguous.
- Record only commands that actually passed, including the tested scope and count. Do not turn historical results into a new execution claim.
- Preserve explicit `PENDING` operator, provider, migration, deployment, and independent-review fields until the named evidence exists.
- Reconcile dirty-file disposition against Git status. Excluded local helpers, drafts, generated artifacts, and unrelated files must not be presented as release inputs.
- Factor-baseline notes must distinguish unchanged historical snapshots from fresh fail-closed calculations and must not imply methodology approval.

## Reusable prompt

> Update the CarbonLite Master TODO based on the latest Codex execution report. Preserve stable task IDs, deduplicate repeated findings, attach actual evidence, close tasks only when acceptance criteria are met, recalculate dependent dates, record the change in the Change Log, keep Markdown and Excel synchronized, and report any new P0 real-data blockers. Do not infer production deployment, owner approval, legal approval, or real-data GO from local work.
