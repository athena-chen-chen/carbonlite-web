-- CarbonLite pilot user audit helper.
-- Review generated SQL against your actual backend schema before running.
-- Intentionally excludes password hashes, tokens, and auth secrets.

SELECT
  u.email,
  COALESCE(u.name, u."fullName", '') AS name,
  COALESCE(c.name, o.name, '') AS company,
  u.role,
  COALESCE(u.status, 'ACTIVE') AS status,
  u."createdAt",
  u."lastLoginAt" AS "lastLogin"
FROM "User" u
LEFT JOIN "Company" c ON c.id = u."companyId"
LEFT JOIN "Organization" o ON o.id = u."organizationId"
ORDER BY u."createdAt" DESC;
