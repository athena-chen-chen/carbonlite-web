import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_E2E_EMAIL = 'e2e@carbonlite.test';
export const DEFAULT_E2E_PASSWORD = 'CarbonLiteE2E!123';
export const DEFAULT_E2E_ORG_ID = 'org-carbonlite-e2e';
export const DEFAULT_E2E_USER_ID = 'user-carbonlite-e2e';
export const DEFAULT_E2E_FACILITY_ID = 'facility-calgary-hq-e2e';

export function resolveApiDir() {
  return path.resolve(process.env.CARBONLITE_API_DIR || '../carbonlite-api');
}

export function assertE2eDatabaseSafety() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for E2E database commands.');
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }

  const databaseName = parsed.pathname.replace(/^\/+/, '').split('?')[0];
  if (!/e2e|test/i.test(databaseName)) {
    throw new Error(
      `Refusing to reset or seed non-E2E database "${databaseName}". Include "e2e" or "test" in the database name.`,
    );
  }

  if (process.env.ALLOW_TEST_DB_RESET !== 'true') {
    throw new Error('Refusing to mutate test database without ALLOW_TEST_DB_RESET=true.');
  }

  if (/prod|production|staging|stage/i.test(databaseUrl)) {
    throw new Error('Refusing to run E2E database commands against a production/staging-looking URL.');
  }

  return { databaseName, databaseUrl };
}

export async function importFromApiNodeModules(packagePath) {
  const apiDir = resolveApiDir();
  const modulePath = path.join(apiDir, 'node_modules', packagePath);
  return import(pathToFileURL(modulePath).href);
}

export async function createPrismaClient() {
  const { PrismaClient } = await importFromApiNodeModules('@prisma/client/default.js');
  return new PrismaClient();
}
