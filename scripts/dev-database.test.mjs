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

function withIsolatedJwtSecret(run) {
  const hadJwtSecret = Object.hasOwn(process.env, 'JWT_SECRET');
  const previousJwtSecret = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    return run();
  } finally {
    if (hadJwtSecret) process.env.JWT_SECRET = previousJwtSecret;
    else delete process.env.JWT_SECRET;
  }
}

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

test('selected file wins over inherited URL and disables demo auth and Neon fixtures', () => withIsolatedJwtSecret(() => {
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
    // Exercise the repository-pinned dotenv version, not a developer-machine sibling.
    const require = createRequire(path.resolve('package.json'));
    const dotenv = require.resolve('dotenv/config.js');
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
}));

test('inherited JWT secret wins while the selected database URL and auth safeguards remain enforced', () => withIsolatedJwtSecret(() => {
  const dir = mkdtempSync(path.join(tmpdir(), 'carbonlite-db-'));
  const previousUrl = process.env.DATABASE_URL;
  try {
    writeFileSync(path.join(dir, '.env'), 'JWT_SECRET=file-fixture-only\nLOCAL_DEMO_AUTH_ENABLED=true\n');
    const file = path.join(dir, '.env.neon.local');
    writeFileSync(file, `DATABASE_URL=${neon.DATABASE_URL}\nNEON_DEVELOPMENT_HOST=${neon.NEON_DEVELOPMENT_HOST}\n`);
    process.env.JWT_SECRET = 'inherited-fixture-only';
    process.env.DATABASE_URL = local.DATABASE_URL;
    const { env } = loadDatabaseEnvironment('neon', dir, file);
    assert.equal(env.JWT_SECRET, process.env.JWT_SECRET);
    assert.equal(env.DATABASE_URL, neon.DATABASE_URL);
    assert.equal(env.LOCAL_DEMO_AUTH_ENABLED, 'false');
    assert.equal(env.ALLOW_TASK7_DEV_FIXTURES, 'false');
    assert.equal(env.DEMO_RESET_ENABLED, 'false');
  } finally {
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    rmSync(dir, { recursive: true, force: true });
  }
}));

test('JWT isolation restores absent, empty and populated states after success and assertion failure', () => {
  const originallyPresent = Object.hasOwn(process.env, 'JWT_SECRET');
  const original = process.env.JWT_SECRET;
  try {
    for (const previous of [undefined, '', 'restoration-fixture-only']) {
      if (previous === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previous;
      for (const fail of [false, true]) {
        const run = () => withIsolatedJwtSecret(() => {
          assert.equal(Object.hasOwn(process.env, 'JWT_SECRET'), false);
          process.env.JWT_SECRET = 'temporary-fixture-only';
          if (fail) assert.fail('intentional fixture assertion');
        });
        if (fail) assert.throws(run, { code: 'ERR_ASSERTION' });
        else run();
        assert.equal(Object.hasOwn(process.env, 'JWT_SECRET'), previous !== undefined);
        assert.equal(process.env.JWT_SECRET, previous);
      }
    }
  } finally {
    if (originallyPresent) process.env.JWT_SECRET = original;
    else delete process.env.JWT_SECRET;
  }
});
