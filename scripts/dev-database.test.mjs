import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { databaseTarget, loadDatabaseEnvironment } from './dev-database.mjs';
import { assertTask7FixtureSafety } from './e2e/task7-factor-fixtures.mjs';

const local = { DATABASE_URL: 'postgresql://test:test@localhost:5432/carbonlite_dev' };
const neon = {
  DATABASE_URL: 'postgresql://test:test@ep-development.neon.tech/neondb?sslmode=require',
  NEON_DEVELOPMENT_HOST: 'ep-development.neon.tech',
};

test('named modes reject crossed targets and unconfirmed Neon endpoints', () => {
  assert.equal(databaseTarget('localdb', local), 'Local PostgreSQL / carbonlite_dev');
  assert.equal(databaseTarget('neon', neon), 'Neon development');
  for (const [mode, env] of [
    ['neon', local], ['localdb', neon],
    ['neon', { ...neon, NEON_DEVELOPMENT_HOST: '' }],
    ['neon', { ...neon, DATABASE_URL: neon.DATABASE_URL.replace('require', 'disable') }],
    ['localdb', { DATABASE_URL: local.DATABASE_URL + '?host=remote.example' }],
    ['localdb', { DATABASE_URL: local.DATABASE_URL.replace('5432', '5433') }],
    ['neon', { ...neon, DATABASE_URL: neon.DATABASE_URL.replace('neondb', 'production') }],
  ]) assert.throws(() => databaseTarget(mode, env));
});

test('selected file wins over inherited URL and disables demo auth and Neon fixtures', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'carbonlite-db-'));
  const previous = process.env.DATABASE_URL;
  try {
    writeFileSync(path.join(dir, '.env'), `DATABASE_URL=${local.DATABASE_URL}\nLOCAL_DEMO_AUTH_ENABLED=true\nJWT_SECRET=test-only\n`);
    const file = path.join(dir, '.env.neon.local');
    writeFileSync(file, `DATABASE_URL=${neon.DATABASE_URL}\nNEON_DEVELOPMENT_HOST=${neon.NEON_DEVELOPMENT_HOST}\n`);
    process.env.DATABASE_URL = local.DATABASE_URL;
    const { env } = loadDatabaseEnvironment('neon', dir, file);
    assert.equal(env.DATABASE_URL, neon.DATABASE_URL);
    assert.equal(env.JWT_SECRET, 'test-only');
    assert.equal(env.PORT, '3333');
    assert.equal(env.LOCAL_DEMO_AUTH_ENABLED, 'false');
    assert.equal(env.ALLOW_TASK7_DEV_FIXTURES, 'false');
    assert.equal(env.DEMO_RESET_ENABLED, 'false');
    // Exercise the backend's actual dotenv version, not only the wrapper object.
    const require = createRequire(path.resolve('package.json'));
    const dotenv = require.resolve('../carbonlite-api/node_modules/dotenv/config.js');
    const child = spawnSync(process.execPath, ['-r', dotenv, '-e',
      'process.exit(process.env.DATABASE_URL.includes("ep-development.neon.tech") && process.env.LOCAL_DEMO_AUTH_ENABLED === "false" ? 0 : 1)'],
    { env, encoding: 'utf8' });
    assert.equal(child.status, 0);
    assert.throws(() => assertTask7FixtureSafety({ ...env, ALLOW_TASK7_DEV_FIXTURES: 'true' }));
    writeFileSync(path.join(dir, '.env'), 'APP_ENV=production\n');
    assert.throws(() => loadDatabaseEnvironment('neon', dir, file));
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});
