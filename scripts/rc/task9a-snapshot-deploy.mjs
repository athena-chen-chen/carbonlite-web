// Guarded Phase 1 operations. Does not reset databases or alter applied history.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve('../carbonlite-api');
const req = createRequire(path.join(root, 'package.json'));
const { loadEnvironment } = await import(pathToFileURL(path.join(root, 'scripts/dev-database.mjs')));
const { PrismaClient } = req('@prisma/client');
const migration = '20261017233000_canonical_calculation_snapshots';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sqlFile = path.join(root, 'prisma/migrations', migration, 'migration.sql');
const mode = 'deploy';
const { env } = loadEnvironment(mode === 'rehearse' ? 'localdb' : 'neon');
const cli = path.join(root, 'node_modules/prisma/build/index.js');
const schema = path.join(root, 'prisma/schema.prisma');
function run(args, commandEnv = env, label = 'prisma') {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, env: { ...commandEnv, PATH: path.dirname(process.execPath) + ':' + process.env.PATH }, encoding: 'utf8', timeout: 120000 });
  fs.writeFileSync(`/private/tmp/task9a-${label}.log`, (result.stdout ?? '') + (result.stderr ?? ''), { mode: 0o600 });
  console.log(JSON.stringify({ check: label, exitCode: result.status }));
  if (result.status !== 0) throw Error(label + ' failed');
}
let db;
try {
  if (mode === 'rehearse') {
    const url = new URL(env.DATABASE_URL);
    db = new PrismaClient({ datasourceUrl: url.href, log: [] });
    const database = `carbonlite_task9a_integrity_${Date.now()}_test`;
    await db.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
    url.pathname = '/' + database;
    const testEnv = { ...env, DATABASE_URL: url.href, NODE_ENV: 'test', APP_ENV: 'test' };
    run(['validate', '--schema', schema], testEnv, 'integrity-validate');
    run(['migrate', 'deploy', '--schema', schema], testEnv, 'integrity-clean-deploy');
    run(['migrate', 'diff', '--from-schema-datasource', schema, '--to-schema-datamodel', schema, '--exit-code'], testEnv, 'integrity-clean-diff');
    fs.writeFileSync('/private/tmp/task9a-integrity-rehearsal.json', JSON.stringify({ database, migrationHash: hash(sqlFile), passed: true }));
    console.log(JSON.stringify({ check: 'Clean local replay and schema alignment', pass: true }));
  } else if (mode === 'backup') {
    const directory = '/private/tmp/task9a-private-backup';
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const url = new URL(env.DATABASE_URL);
    const dump = path.join(directory, 'neon-development-before-integrity.dump');
    if (fs.existsSync(dump)) throw Error('Backup already exists; refusing overwrite');
    const result = spawnSync('/opt/homebrew/opt/libpq/bin/pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', dump], { env: { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: 'require' }, encoding: 'utf8', timeout: 120000 });
    if (result.status !== 0) throw Error('Private database backup failed');
    fs.chmodSync(dump, 0o600);
    const sources = path.join(directory, 'uploads.tar');
    const archived = spawnSync('/usr/bin/tar', ['-cf', sources, '-C', root, 'uploads'], { encoding: 'utf8', timeout: 120000 });
    if (archived.status !== 0) throw Error('Source backup failed');
    fs.chmodSync(sources, 0o600);
    const verified = spawnSync('/opt/homebrew/opt/libpq/bin/pg_restore', ['--list', dump], { encoding: 'utf8' });
    if (verified.status !== 0) throw Error('Backup archive verification failed');
    fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), dumpHash: hash(dump), sourceHash: hash(sources), target: 'Neon development' }), { mode: 0o600 });
    console.log(JSON.stringify({ check: 'Private database and source archives readable', pass: true, directory }));
  } else if (mode === 'deploy') {
    const rehearsal = JSON.parse(fs.readFileSync('/private/tmp/task9a-integrity-rehearsal.json'));
    if (!rehearsal.passed || fs.readFileSync('/private/tmp/task9a-integrity-clean-diff.log','utf8').includes('ALTER TABLE')) throw Error('Rehearsal does not match migration');
    if (hash(sqlFile) !== fs.readFileSync('/private/tmp/task9a-snapshot-rehearsed-hash','utf8')) throw Error('Snapshot migration changed after replay');
    const directory = '/private/tmp/task9a-private-backup';
    const backup = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json')));
    if (hash(path.join(directory, 'neon-development-before-integrity.dump')) !== backup.dumpHash || hash(path.join(directory, 'uploads.tar')) !== backup.sourceHash) throw Error('Backup integrity failed');
    db = new PrismaClient({ datasourceUrl: env.DATABASE_URL, log: [] });
    const fingerprint = () => db.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(string_agg((to_jsonb(a) - 'calculationSnapshot' - 'calculationVersion' - 'calculatedAt')::text, '' ORDER BY a.id)) AS digest FROM "ActivityData" a`);
    const before = await fingerprint();
    run(['migrate', 'deploy', '--schema', schema], env, 'integrity-neon-deploy');
    const after = await fingerprint();
    if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Activity fingerprint changed; investigate immediately');
    run(['migrate', 'status', '--schema', schema], env, 'integrity-neon-status');
    run(['migrate', 'diff', '--from-schema-datasource', schema, '--to-schema-datamodel', schema, '--exit-code'], env, 'integrity-neon-diff');
    fs.writeFileSync('/private/tmp/task9a-snapshot-deploy-result.json', JSON.stringify({ before, after, migration, migrationHash: hash(sqlFile), status: 'CLEAN', mainAccessed: false }, null, 2));
    console.log(JSON.stringify({ check: 'Neon development integrity repair', pass: true, activityRowsPreserved: before[0].count, mainAccessed: false }));
  } else throw Error('Choose rehearse, backup, or deploy');
} catch (error) {
  console.log(JSON.stringify({ check: 'Integrity operation failed', code: error.code ?? error.name, message: error.name === 'Error' ? error.message : 'See private operator log' }));
  process.exitCode = 1;
} finally { await db?.$disconnect(); }
