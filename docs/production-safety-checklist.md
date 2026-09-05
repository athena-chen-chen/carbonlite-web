# CarbonLite Production Safety Checklist

Use this checklist before inviting external pilot reviewers or stepping away from active monitoring.

## Production Access

- [ ] Production frontend loads: `https://www.carbonliteapp.ca`
- [ ] Production API health check returns `status: ok`: `https://carbonlite-api.onrender.com/api/health`
- [ ] Public signup is not visible on the login page.
- [ ] Direct public registration is disabled.
- [ ] Admin login works with the approved admin account.

## Pilot Reviewer Invite Flow

- [ ] Admin can open the Pilot Reviewers admin page.
- [ ] Admin can create a Pilot Reviewer account.
- [ ] Generated invite link uses `https://www.carbonliteapp.ca/set-password?...`
- [ ] Generated invite link does not use `localhost`.
- [ ] Admin can copy the invite link.
- [ ] Pilot Reviewer can set a password from the invite link.
- [ ] Pilot Reviewer can log in after setting a password.
- [ ] Expired, used, or invalid invite links show friendly support messages.

## Pilot Reviewer Workspace

- [ ] Pilot Reviewer sees the banner: `Pilot review account · Sample data only · Not for formal reporting`
- [ ] Pilot Reviewer sees `CarbonLite Sample Workspace`.
- [ ] Data Records shows 10 sample records.
- [ ] Calculation Review total is `37,285 kgCO2e`.
- [ ] Reports page loads and shows the sample report.
- [ ] Factors page loads in read-only mode.

## Pilot Reviewer Permissions

- [ ] Pilot Reviewer cannot access Admin pages.
- [ ] Pilot Reviewer cannot upload files.
- [ ] Pilot Reviewer cannot import spreadsheets.
- [ ] Pilot Reviewer cannot manually add records.
- [ ] Pilot Reviewer cannot edit records.
- [ ] Pilot Reviewer cannot delete records.
- [ ] Pilot Reviewer cannot reset demo/sample data.
- [ ] Pilot Reviewer cannot create, edit, delete, or import factors.

## Feedback And Error Safety

- [ ] Feedback entry point works and routes to CarbonLite support.
- [ ] Production error messages are friendly and do not expose stack traces.
- [ ] UI and API errors do not expose tokens.
- [ ] UI and exports do not expose raw database IDs.
- [ ] Error responses do not expose secrets, environment variables, or database URLs.

## Final Go / No-Go

- [ ] Public signup is disabled.
- [ ] Admin invite flow works.
- [ ] Pilot Reviewer read-only review flow works.
- [ ] Golden sample totals remain unchanged.
- [ ] No debug UI or internal backend wording appears in pilot-facing pages.
