# Pilot Reviewer Invite Backend Contract

CarbonLite web already has the admin UI and `pnpm create:pilot-reviewer` client script for creating invite-only pilot reviewers. The API service must provide the persistent endpoint below for the flow to work end to end.

This frontend repository does not include the API service, Prisma schema, database client, password hashing dependency, or token persistence layer. Implement this contract in the backend/API repository.

## Endpoint

`POST /api/admin/pilot-reviewers`

Allowed callers:

- authenticated Admin/Owner users
- trusted script requests with `Authorization: Bearer ${ADMIN_SCRIPT_TOKEN}`

Request body:

```json
{
  "name": "Alexander",
  "email": "alexander@example.com",
  "workspace": "CarbonLite Sample Workspace",
  "expires": "2026-09-14"
}
```

For compatibility with the existing web client, also accept `workspaceName` and `expiresAt`.

Response body:

```json
{
  "success": true,
  "pilotReviewer": {
    "name": "Alexander",
    "email": "alexander@example.com",
    "accountType": "PILOT_REVIEWER",
    "role": "REVIEWER",
    "workspaceName": "CarbonLite Sample Workspace",
    "expiresAt": "2026-09-14T23:59:59.999Z"
  },
  "inviteLink": "http://localhost:5173/set-password?token=<secure-token>"
}
```

Do not return password hashes, token hashes, JWT secrets, raw database ids, or internal workspace ids.

## Required Persistence

When creating or updating the pilot reviewer:

- find or create `CarbonLite Sample Workspace`
- find or create the user by normalized email
- set `accountType = PILOT_REVIEWER`
- set `role = REVIEWER` or `VIEWER`
- set `accessScope = SAMPLE_WORKSPACE_ONLY`
- set `mustResetPassword = true`
- set `isActive = true`
- set optional `expiresAt`
- assign the user only to the sample workspace
- remove or ignore memberships in non-sample workspaces for this reviewer account

Invite token handling:

- generate a token with cryptographically secure randomness, for example `crypto.randomBytes(32).toString("base64url")`
- store only a SHA-256/HMAC hash of the token
- store `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdBy`, and `createdAt`
- expire setup tokens after 48 hours by default
- return the plaintext token only once inside `inviteLink`
- never log plaintext tokens except as the one-time admin/script response
- never log token hashes

## Set Password Flow

The frontend currently calls:

- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`

The backend should let `/auth/password-reset/confirm` consume invite tokens as well as reset tokens:

1. hash the submitted token
2. find an unused, unexpired token
3. hash the submitted password with the backend's password hashing standard
4. save the password hash
5. mark token `usedAt`
6. set `mustResetPassword = false`
7. keep `accountType = PILOT_REVIEWER`
8. keep role read-only

Invalid, expired, or used tokens should return a controlled `400` or `401` with a safe user-facing message.

## Permission Rules

Pilot reviewers may:

- view the sample dashboard
- view sample activity records
- view Calculation Review and Calculation Trail
- view sample reports
- download sample PDF/CSV if enabled
- submit feedback

Pilot reviewers must not:

- access admin routes
- upload or import files
- confirm imports
- edit or delete records
- reset demo data
- edit factors
- create custom factors
- manage users
- access real customer workspaces

Enforce these permissions in backend guards. Frontend hiding is not sufficient.

## Backend Tests

Add API tests for:

- missing fields return `400`
- invalid email returns `400`
- non-admin user returns `403`
- missing/invalid script token returns `401` or `403`
- existing user is updated by email without duplicates
- reviewer is assigned `PILOT_REVIEWER`
- reviewer role is read-only
- reviewer belongs only to `CarbonLite Sample Workspace`
- invite token is generated, hashed, stored, and expires
- `inviteLink` is returned
- set-password consumes the token once
- login works after setting password
- reused/expired token is rejected
- pilot reviewer cannot access admin, upload/import, edit/delete, reset, or factor mutation endpoints
- public signup remains disabled

## Manual Test

```bash
APP_ENV=pilot \
API_BASE_URL=http://localhost:3333/api \
APP_URL=http://localhost:5173 \
ADMIN_SCRIPT_TOKEN=<secure-local-admin-token> \
pnpm create:pilot-reviewer \
  --name "Alexander" \
  --email "alexander@example.com" \
  --workspace "CarbonLite Sample Workspace" \
  --expires "2026-09-14"
```

Expected script output includes:

```text
Pilot reviewer created successfully.

Name: Alexander
Email: alexander@example.com
Account type: PILOT_REVIEWER
Role: REVIEWER
Workspace: CarbonLite Sample Workspace
Expires: 2026-09-14T23:59:59.999Z

Invite link:
http://localhost:5173/set-password?token=<secure-token>
```

