// Disposable local PostgreSQL only. Never resets an existing database or uses db push.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const apiDir = path.resolve('../carbonlite-api');
const req = createRequire(path.join(apiDir, 'package.json'));
const { loadEnvironment } = await import(pathToFileURL(path.join(apiDir, 'scripts/dev-database.mjs')));
const { env } = loadEnvironment('localdb');
const url = new URL(env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/carbonlite_dev') throw Error('Local target required');
const { PrismaClient } = req('@prisma/client');
const admin = new PrismaClient({ datasourceUrl: url.href, log: [] });
const name = `carbonlite_task9_${Date.now()}_test`;
try {
  await admin.$queryRawUnsafe('SELECT 1');
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  console.log(JSON.stringify({ check: 'Fresh local test database created', database: name, mainAccessed: false }));
  url.pathname = '/' + name;
  const childEnv = { ...env, DATABASE_URL: url.href, NODE_ENV: 'test', APP_ENV: 'test', LOCAL_DEMO_AUTH_ENABLED: 'false', PATH: path.dirname(process.execPath) + ':' + process.env.PATH };
  const migration = spawnSync(process.execPath, [path.join(apiDir, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: apiDir, env: childEnv, encoding: 'utf8', timeout: 120000 });
  fs.writeFileSync('/private/tmp/task9-current-clean-migrate.log', (migration.stdout ?? '') + (migration.stderr ?? ''), { mode: 0o600 });
  console.log(JSON.stringify({ check: 'Migrate deploy from empty local database', exitCode: migration.status, dbPushUsed: false }));
  if (migration.status !== 0) { process.exitCode = 1; }
  else {
    const result = spawnSync(process.execPath, [path.join(apiDir, 'node_modules/jest/bin/jest.js'), '--config', 'test/jest-e2e.json', '--runInBand', '--cacheDirectory=/private/tmp/task9-current-integration-jest'], { cwd: apiDir, env: childEnv, encoding: 'utf8', timeout: 300000 });
    fs.writeFileSync('/private/tmp/task9-current-api-integration.log', (result.stdout ?? '') + (result.stderr ?? ''), { mode: 0o600 });
    console.log(JSON.stringify({ check: 'Backend integration suite on local test database', exitCode: result.status }));
    process.exitCode = result.status ?? 1;
  }
} catch (error) {
  console.log(JSON.stringify({ check: 'Local database validation unavailable', code: error.code ?? 'CONNECTION_OR_CONFIGURATION', mainAccessed: false }));
  process.exitCode = 1;
} finally { await admin.$disconnect(); }
