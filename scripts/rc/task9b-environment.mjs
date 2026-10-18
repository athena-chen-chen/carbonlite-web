// Prove the running localhost API uses the confirmed development database before
// creating any synthetic regression accounts. Never prints credentials or URLs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const apiDir = path.resolve('../carbonlite-api');
const req = createRequire(path.join(apiDir, 'package.json'));
const { loadEnvironment } = await import(pathToFileURL(path.join(apiDir, 'scripts/dev-database.mjs')));
const { env } = loadEnvironment('neon');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL, log: [] });
const jwt = new (req('@nestjs/jwt').JwtService)({ secret: env.JWT_SECRET });
const stateFile = process.env.TASK9B_STATE_FILE;
if (!stateFile?.startsWith('/private/tmp/task9b-')) throw Error('Use a private task9b state path.');
if (!['prepare', 'inspect', 'retire'].includes(process.argv[2] ?? 'prepare')) throw Error('Choose prepare, inspect, or retire.');
const base = 'http://localhost:3333/api';
try {
  if (process.argv[2] === 'inspect') {
    const docs = await db.document.findMany({ where: { fileName: { in: ['carbonlite_field_mapping_test.xlsx', 'carbonlite_field_mapping_test (1).xlsx'] } }, orderBy: { createdAt: 'desc' }, take: 15,
      select: { id: true, fileName: true, createdAt: true, mimeType: true, fileHash: true, fileUrl: true, status: true, extractedJson: true, extractions: { select: { extractedRows: true, extractedJson: true } }, spreadsheetReviewRows: true, activityData: { select: { activityType: true, quantity: true, sourceRow: true, sourceSheetName: true, calculationStatus: true, calculatedEmissionsKgCO2e: true } } } });
    fs.writeFileSync('/private/tmp/task9b-source-inspection.json', JSON.stringify(docs, null, 2), { mode: 0o600 });
    console.log(JSON.stringify(docs.map(d => ({ id: d.id, name: d.fileName, createdAt: d.createdAt, status: d.status, storedBinary: !!d.fileHash, staged: d.spreadsheetReviewRows.map(r => ({ activity: r.activityType, status: r.status, unit: r.unit, province: r.jurisdictionRegion, row: r.sourceRow, match: r.matchingStatus, message: r.calculationMessage })), persisted: d.activityData }))));
  } else if (process.argv[2] === 'retire') {
    const state = JSON.parse(fs.readFileSync(stateFile));
    // Existing Task 9A regressions register their own synthetic identities and
    // replace the Combined/Structured slots; previous slots are retained by the runner.
    const initialCombined = await db.user.findMany({ where: { email: { startsWith: 'task9b-' }, organization: { name: 'Task 9B Combined synthetic' } } });
    const accounts = [...Object.values(state.accounts), ...initialCombined.map(user => ({ email: user.email, user }))];
    const seen = new Set();
    for (const account of accounts) {
      if (seen.has(account.user.id)) continue;
      seen.add(account.user.id);
      const user = await db.user.findFirst({ where: { id: account.user.id, email: account.email, organizationId: account.user.organizationId } });
      if (!user || !/^(task9b-|rc9a-combined-|rc9a-structured-)/.test(account.email)) throw Error('Synthetic identity mismatch.');
      await db.user.update({ where: { id: user.id }, data: { isActive: false } });
      if (account.token) {
        const rejected = await fetch(base + '/auth/me', { headers: { Authorization: `Bearer ${account.token}` } });
        if (rejected.status !== 401) throw Error('Retired synthetic session still accepted.');
      }
    }
    console.log(JSON.stringify({ retiredSyntheticAccounts: seen.size, sourceAndCalculationEvidenceRetained: true, neonMainModified: false }));
  } else {
    const user = await db.user.findFirst({ where: { isActive: true, accountType: 'CUSTOMER' } });
    if (!user) throw Error('No development identity available for read-only runtime proof.');
    const token = jwt.sign({ sub: user.id, email: user.email, organizationId: user.organizationId }, { expiresIn: '1m' });
    const me = await fetch(base + '/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    const identity = await me.json();
    if (me.status !== 200 || identity.id !== user.id || identity.organizationId !== user.organizationId) throw Error('Running API does not match guarded development database.');
    if (fs.existsSync(stateFile)) throw Error('Choose a fresh state file; existing state is never overwritten.');
    const state = { environment: 'Neon development', apiBase: base, password: crypto.randomBytes(24).toString('base64url'), accounts: {} };
    for (const key of ['Original', 'Renamed', 'GoldenC', 'Combined']) {
      const email = `task9b-${Date.now()}-${key.toLowerCase()}@example.com`;
      const r = await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: state.password, organizationName: `Task 9B ${key} synthetic` }) });
      if (r.status !== 201) throw Error('Synthetic registration failed.');
      const account = await r.json();
      const stored = await db.user.findFirst({ where: { id: account.user.id, email, organizationId: account.user.organizationId } });
      if (!stored) throw Error('Runtime database identity mismatch.');
      state.accounts[key] = { email, user: account.user, token: account.accessToken ?? account.token };
      fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
    }
    console.log(JSON.stringify({ environment: state.environment, runtimeIdentityVerified: true, syntheticAccounts: Object.keys(state.accounts).length, neonMainModified: false }));
  }
} catch (error) {
  console.error(JSON.stringify({ check: 'Task 9B environment', failed: true, code: error.code ?? error.name }));
  process.exitCode = 1;
} finally { await db.$disconnect(); }
