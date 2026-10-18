import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve('../carbonlite-api');
const req = createRequire(path.join(root, 'package.json'));
const { loadEnvironment } = await import(pathToFileURL(path.join(root, 'scripts/dev-database.mjs')));
const { env } = loadEnvironment('neon');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL, log: [] });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
try {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const migrations = await tx.$queryRawUnsafe('SELECT migration_name, checksum, started_at, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name');
    const mismatches = [];
    for (const row of migrations.filter(m => m.finished_at && !m.rolled_back_at)) {
      const name = `prisma/migrations/${row.migration_name}/migration.sql`;
      const bytes = fs.readFileSync(path.join(root, name));
      if (hash(bytes) === row.checksum) continue;
      const commits = execFileSync('git', ['log', '--all', '--format=%H', '--', name], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
      const matches = commits.filter(commit => hash(execFileSync('git', ['show', `${commit}:${name}`], { cwd: root })) === row.checksum);
      mismatches.push({ migration: row.migration_name, appliedChecksum: row.checksum, localChecksum: hash(bytes), startedAt: row.started_at, finishedAt: row.finished_at, historyRevisions: commits.length, matchingGitRevisions: matches });
    }
    const columns = await tx.$queryRawUnsafe(`SELECT table_name, column_name, data_type, udt_name, column_default FROM information_schema.columns WHERE table_schema='public' AND ((table_name='ActivityData' AND column_name='sourceType') OR (table_name IN ('Factor','FactorSource','FactorVersion') AND column_name='updatedAt')) ORDER BY table_name`);
    const enums = await tx.$queryRawUnsafe(`SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='ActivityType' ORDER BY e.enumsortorder`);
    const sourceTypes = await tx.$queryRawUnsafe(`SELECT "sourceType"::text AS value, count(*)::int AS count FROM "ActivityData" GROUP BY "sourceType"::text ORDER BY value`);
    const obsoleteEnumUsage = {};
    for (const table of ['ActivityData', 'ConversionFactor', 'Factor']) {
      obsoleteEnumUsage[table] = await tx.$queryRawUnsafe(`SELECT "activityType"::text AS value, count(*)::int AS count FROM "${table}" WHERE "activityType"::text IN ('BUSINESS_TRAVEL','FREIGHT') GROUP BY "activityType"::text`);
    }
    const index = await tx.$queryRawUnsafe(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='SpreadsheetImportReviewRow'`);
    return { checkedAt: new Date().toISOString(), target: 'guarded Neon development', mainAccessed: false, applied: migrations.filter(m => m.finished_at && !m.rolled_back_at).length, mismatches, columns, enums, sourceTypes, obsoleteEnumUsage, reviewIndexes: index };
  }, { timeout: 30000 });
  fs.writeFileSync('/private/tmp/task9a-migration-audit.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.log(JSON.stringify({ error: 'Migration audit failed', code: error.code ?? error.name }));
  process.exitCode = 1;
} finally { await db.$disconnect(); }
