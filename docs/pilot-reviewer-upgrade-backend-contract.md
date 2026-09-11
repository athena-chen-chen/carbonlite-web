# Pilot Reviewer to Paid Customer Upgrade Contract

CarbonLite web provides a manual admin script for upgrading an interested Pilot Reviewer into a paid pilot Customer workspace.

This is not a billing flow. It is an admin-controlled account/workspace transition for pilot operations.

## Command

```bash
pnpm upgrade:pilot-to-customer -- \
  --email customer@example.com \
  --workspace "Customer Pilot Workspace" \
  --role ADMIN
```

Use `--dry-run` to inspect the request without calling the API.

## Expected Backend Endpoint

```text
POST /api/admin/pilot-reviewers/upgrade-to-customer
```

The endpoint must accept an authenticated platform admin session or `ADMIN_SCRIPT_TOKEN`.

## Request Body

```json
{
  "email": "customer@example.com",
  "currentAccountType": "PILOT_REVIEWER",
  "accountType": "CUSTOMER",
  "workspaceName": "Customer Pilot Workspace",
  "createWorkspace": true,
  "preserveSampleWorkspace": true,
  "role": "ADMIN",
  "accessScope": "CUSTOMER_WORKSPACE_ONLY",
  "permissions": {
    "canUpload": true,
    "canImport": true,
    "canEditRecords": true,
    "canDeleteRecords": true,
    "canViewFactors": true,
    "canGenerateReports": true,
    "canEditOrganizationBoundary": true,
    "canSubmitFeedback": true,
    "canEditSystemFactors": false,
    "canManagePlatformUsers": false,
    "canAccessPlatformAdmin": false,
    "canResetGlobalSampleData": false,
    "canAccessOtherWorkspaces": false
  }
}
```

## Backend Validation

The backend must verify:

- user exists
- user is currently `PILOT_REVIEWER`
- user is assigned to the sample/demo workspace before upgrade
- target workspace name is present
- target workspace does not conflict with an existing workspace unless explicit reuse is supported
- a new customer workspace is created
- user is moved to the new customer workspace
- user `accountType` becomes `CUSTOMER`
- user role becomes `ADMIN` or `OWNER` for that customer workspace
- user does not retain customer access to `CarbonLite Sample Workspace`

## Safety Rules

Do not simply make the user admin of `CarbonLite Sample Workspace`.

Sample workspace data must remain unchanged and read-only for non-upgraded reviewers.

Upgraded customer admins may upload/import data, edit their own activity records, generate reports, edit their own Organization & Boundary, and submit feedback.

Upgraded customer admins must not access platform admin tools, manage platform users, edit global/system factor records, reset global sample data, or access other workspaces.

## Production Guard

For production usage, set:

```bash
APP_ENV=production
CONFIRM_PRODUCTION_PILOT_UPGRADE=UPGRADE_PILOT_TO_CUSTOMER_IN_PRODUCTION
ADMIN_SCRIPT_TOKEN=...
API_BASE_URL=https://carbonlite-api.onrender.com/api
```

The script will refuse production upgrades without the confirmation variable.
