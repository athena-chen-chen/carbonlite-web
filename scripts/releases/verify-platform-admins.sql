-- Minimal-PII platform-role inventory. No names, emails, passwords or token fields.
\ir _verified-pilot-readonly.sql
SELECT count(*) AS persisted_admin_assignments,
       count(*) FILTER (WHERE "isActive" AND coalesce("accountType", 'CUSTOMER') <> 'PILOT_REVIEWER') AS active_effective_platform_admins
FROM public."User" WHERE role::text = 'ADMIN';
SELECT u.id AS user_id, u."organizationId" AS home_organization_id,
       u."isActive" AS active, u."accountType" AS account_type,
       coalesce(u."accountType", 'CUSTOMER') <> 'PILOT_REVIEWER' AS platform_role_capable,
       coalesce((SELECT jsonb_agg(jsonb_build_object('organization_id', m."organizationId", 'membership_role', m.role::text)
                     ORDER BY m."organizationId")
                 FROM public."Membership" m WHERE m."userId" = u.id), '[]'::jsonb) AS memberships
FROM public."User" u WHERE u.role::text = 'ADMIN' ORDER BY u.id;
COMMIT;
\echo 'Inventory only: an operator must explicitly review every assignment. Workspace OWNER/ADMIN alone does not create a platform ADMIN.'
