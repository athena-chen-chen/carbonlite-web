# Paid-Pilot Trust Foundation Audit

Date: 2026-10-03

## Scope

This audit covers the CarbonLite frontend trust foundation for paid pilot data: reporting-boundary acknowledgement, reviewer identity, role visibility, data-retention messaging, backup/recovery posture, privacy notice, and reporting metadata.

## Current Architecture Observed

- Authentication state is read from the frontend auth service. Organization identity is derived from the signed-in user and passed into workspace/profile/report flows.
- Frontend permissions are centralized in `src/utils/permissions.ts`. The canonical organization role model is `OWNER`, `ADMIN`, `CONTRIBUTOR`, `REVIEWER`, and `VIEWER`.
- Organization and reporting-boundary data are stored through `src/services/organizationProfile.ts`. When a backend token exists, the app uses `/organization-profile`; otherwise it falls back to organization-scoped local storage.
- Reporting uses `profileToInventoryBoundary` to keep the configured reporting boundary distinct from CarbonLite calculation coverage.
- Reports now include report ID/version, organization/workspace, boundary review status/version, reviewer identity, and review timestamp where available.
- Audit trail event types include boundary update/review and member-management event names. Boundary update/review tracking is best-effort and should not block profile saves.

## Permission Matrix

| Capability | Owner | Admin | Contributor | Reviewer | Viewer |
| --- | --- | --- | --- | --- | --- |
| View workspace data | Yes | Yes | Yes | Yes | Yes |
| Upload/import activity data | Yes | Yes | Yes | No | No |
| Edit workspace boundary fields | Yes | Yes | No | No | No |
| Record boundary review | Yes | Yes | No | Yes | No |
| Manage users | Yes | Yes | No | No | No |
| Review reports | Yes | Yes | No | Yes | No |

Backend APIs must enforce this matrix. Hidden buttons and disabled controls are not sufficient authorization controls.

## Data Handling Posture

- CarbonLite processes uploaded operational data to extract source rows, calculate emissions, and prepare review outputs.
- Workspace data is presented as retained until deleted by an authorized workspace user or by CarbonLite support action. No automatic deletion window is currently shown in the app.
- Deleting source documents or records may remove active workspace content; minimal audit metadata may remain for traceability.
- No customer-facing backup or point-in-time recovery guarantee is currently configured in the app UI.
- Upload guidance now asks users to provide only information they are authorized to upload and to avoid unnecessary personal or sensitive information.

## Gaps Requiring Backend/Ops Confirmation

- Full member directory, invitation, role-change, and removal APIs were not confirmed in this frontend audit.
- Organization isolation depends on backend authorization for every API route that reads or mutates workspace data.
- Retention, deletion, and backup/recovery behavior should be confirmed against backend storage, backups, logs, and support tooling before making customer commitments.
- Source-file deletion and audit metadata retention need an explicit backend contract.
- No SOC 2, ISO, PIPEDA, GDPR, certification, compliance, audit assurance, or regulatory-filing claims should be made from the current frontend state.
