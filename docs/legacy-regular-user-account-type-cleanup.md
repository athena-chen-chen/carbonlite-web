# Legacy Regular User Account Type Cleanup

CarbonLite treats users with `accountType = null` as regular customer users for
normal workspace permissions. This preserves access for older accounts while
keeping `PILOT_REVIEWER` accounts read-only.

Before inviting more pilot users, review existing accounts manually:

- Keep `PILOT_REVIEWER` users unchanged.
- Keep `INTERNAL_TEST` users unchanged.
- For known customer users with `accountType = null`, set `accountType` to `CUSTOMER`.
- Do not bulk-update service, admin, or unknown accounts without reviewing their purpose.

Suggested review fields:

- email
- name
- role
- accountType
- organization/workspace
- createdAt
- lastLogin, if available

Use a database migration or admin script only after confirming the affected
accounts are normal customer workspace users.
