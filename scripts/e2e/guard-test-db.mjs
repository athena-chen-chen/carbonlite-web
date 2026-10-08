import { assertE2eDatabaseSafety } from './test-db-safety.mjs';

const { databaseName } = assertE2eDatabaseSafety();
console.log(`[e2e] Database safety guard passed for "${databaseName}".`);
