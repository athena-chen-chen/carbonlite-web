# CarbonLite Agent Instructions

## Minimal Change and Maintainability Rules

When modifying this codebase:

1. Prefer the smallest safe change that satisfies the requirement.
2. Do not refactor unrelated code unless explicitly requested.
3. Preserve existing architecture, naming conventions, and public interfaces.
4. Before making a change, identify the source of truth and the smallest set of affected files.
5. Update only tests affected by the change, while maintaining appropriate regression coverage.
6. Avoid unnecessary abstractions, wrappers, utilities, or additional layers.
7. After implementation, summarize:
   - What changed
   - Why it changed
   - Which files contain the main business logic
   - Which tests were added or updated
   - Any remaining risks
8. Keep the code understandable and maintainable by a senior developer without AI assistance.

Important: Optimize for long-term maintainability, not maximum code generation.

## CarbonLite Master TODO & Pilot Readiness

1. At the start of a task involving CarbonLite development, pilot readiness, release, security, infrastructure, or customer onboarding, read `docs/pilot/CARBONLITE_MASTER_TODO.md`.
2. Use the Master TODO as the authoritative source for task IDs, statuses, priorities, dependencies, and planned dates.
3. Before beginning work:
   - Find the matching existing task ID.
   - Identify its acceptance criteria.
   - Check prerequisites and blockers.
   - Do not duplicate an existing task.
4. After completing work:
   - Update the existing task status when tracker editing is in scope.
   - Record exact evidence and test results.
   - Add newly discovered blockers.
   - Update dependencies and suggested dates.
   - Synchronize `docs/pilot/CarbonLite_Pilot_Task_Tracker.xlsx` where practical, following `docs/pilot/carbonlite-task-tracker-maintenance.md`.
5. Mark `DONE` only when acceptance criteria are supported by evidence.
6. Distinguish the achieved evidence level explicitly:
   - `LOCAL_CODE_COMPLETE`
   - `LOCAL_TESTED`
   - `PROVIDER_VERIFIED`
   - `PRODUCTION_DEPLOYED`
   - `OPERATIONALLY_APPROVED`
7. Never treat local test success as permission to deploy or accept real customer data.
8. Never silently mark a P0 blocker closed.
9. Never mark legal, privacy, or owner decisions approved without explicit authorization and a dated evidence reference.
10. Keep the Master TODO concise and deduplicated.
11. Preserve historical task IDs and evidence.
12. When task-tracker editing is not in scope, do not modify unrelated files merely to synchronize the workbook. Report the exact tracker updates needed instead.

## Session Handoff and Master TODO Update

For work involving development, pilot readiness, release, security, infrastructure, recovery, or customer onboarding, include a short `Master TODO Update` section in the execution summary with:

- Current phase, task ID, and scope.
- Completed work and exact evidence.
- Open P0 blockers, including any newly discovered blocker.
- Next recommended tasks and dependencies.
- Files changed.
- Test commands and results, distinguishing tests run from tests merely recommended.
- Deployment status, including whether production deployment was not attempted or not authorized.
- Explicit STOP conditions and the authority needed to proceed.

If the authoritative tracker was updated, state which task IDs and fields changed and whether the Excel tracker was synchronized. If tracker editing was out of scope, provide the proposed task-ID-specific updates without changing tracker files.

## CarbonLite Founder Operating Workflow

At the start and end of any CarbonLite task, apply this workflow within the user's explicit scope:

### At the start of the task

1. Read `docs/pilot/CARBONLITE_MASTER_TODO.md` as the authoritative task source.
2. Read `docs/pilot/CARBONLITE_FOUNDER_DASHBOARD.md` for the current operating summary.
3. Read `docs/pilot/CARBONLITE_DECISION_LOG.md` when the work depends on or records a founder, legal, privacy, commercial, infrastructure, or go/no-go decision.
4. Find the matching existing task ID and check its priority, dependencies, blockers, acceptance criteria, and evidence level. Do not create a duplicate task.
5. Respect the task's stated scope and STOP conditions. Do not proceed through a blocked P0 gate without the required explicit approval.

### At the end of the task

1. When tracker editing is in scope, update the existing Master TODO task with status, exact files changed, test results, newly discovered P0/P1 blockers, dependencies, evidence references, and suggested dates. Do not infer a stronger evidence level than was demonstrated or move a planned date without recording the rationale.
2. Update the Founder Dashboard only with concise summaries supported by the Master TODO or other cited repository evidence. The dashboard must not become a second task tracker.
3. Add or change a Decision Log entry only when explicit authorization and dated evidence exist. Otherwise record the item as `PENDING` or report the proposed change.
4. Synchronize `docs/pilot/CarbonLite_Pilot_Task_Tracker.xlsx` only when authoritative task fields changed and workbook editing is safe and in scope.
5. Refresh the dashboard's last-updated timestamp only when its content changes.
6. Include a short `Founder Dashboard Update` section in the execution summary stating dashboard changes, decision-log changes, current Top 5 priorities, and any proposed updates that were not applied.

### Daily and weekly operating rhythm

- Daily: review the dashboard Top 3; include a customer/sales action when appropriate; identify one engineering outcome and one founder decision when needed. A scheduled action is not a completed action.
- Weekly: review P0 closure, the prospect/contact/demo/pilot funnel, customer feedback, and next-week priorities; record only approved decisions; change planned dates only with a documented rationale.

Never fabricate sales activity, customer feedback, provider verification, deployment, approval, or operational readiness. Never mark `DONE` without acceptance evidence, turn a local GO into a production GO, or convert a local result into `PROVIDER_VERIFIED`, `PRODUCTION_DEPLOYED`, or `OPERATIONALLY_APPROVED`. Do not update unrelated files for a read-only request. If the shared files are unavailable or editing them is outside scope, continue only within the requested repository scope and report the exact proposed cross-repository updates.
