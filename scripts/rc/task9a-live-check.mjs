// Non-destructive RC probes. Creates synthetic development-only tenants and data.
// No seeds, migrations, existing-tenant changes, or production connections.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const apiDir = path.resolve(root, '../carbonlite-api');
const requireApi = createRequire(path.join(apiDir, 'package.json'));
const { loadEnvironment } = await import(pathToFileURL(path.join(apiDir, 'scripts/dev-database.mjs')));
const { env } = loadEnvironment('neon');
const { PrismaClient } = requireApi('@prisma/client');
const jwt = new (requireApi('@nestjs/jwt').JwtService)({ secret: env.JWT_SECRET });
const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL, log: [] });
const base = 'http://localhost:3333/api';
const stateFile = process.env.TASK9_RC_STATE_FILE || '/private/tmp/task9-current-state.json';
const resultFile = '/private/tmp/task9a-current-live-results.json';
const checks = [];
const record = (name, pass, notes = {}) => { const row = { name, pass, ...notes }; checks.push(row); console.log(JSON.stringify(row)); };
async function call(route, { key = 'A', method = 'GET', body, token, anonymous = false } = {}) {
  const response = await fetch(base + route, { method, headers: {
    ...(!anonymous ? { Authorization: `Bearer ${token ?? state.accounts[key].token}` } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  }, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await response.json(); } catch { data = null; }
  if (response.status >= 500) record('Unexpected API 500', false, { route: route.split('?')[0], status: response.status });
  return { status: response.status, data };
}
async function upload(name, bytes, key = 'A', mime = 'text/csv') {
  const form = new FormData(); form.append('type', 'OTHER'); form.append('file', new Blob([bytes], { type: mime }), name);
  const r = await fetch(base + '/documents/upload', { method: 'POST', headers: { Authorization: `Bearer ${state.accounts[key].token}` }, body: form });
  return { status: r.status, data: await r.json() };
}
const save = () => fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
let state;
try {
  if (process.argv[2] === 'prepare') {
    if (fs.existsSync(stateFile)) throw Error('Choose a new state path; refusing to reuse a prior workspace.');
    state = { createdAt: new Date().toISOString(), password: crypto.randomBytes(24).toString('base64url'), accounts: {} };
    const suffix = Date.now();
    for (const key of ['A', 'B', 'Partial', 'Governance']) {
      const email = `rc9a-${suffix}-${key.toLowerCase()}@example.com`;
      const r = await call('/auth/register', { anonymous: true, method: 'POST', body: { organizationName: `Task 9A RC ${key} ${suffix}`, email, password: state.password } });
      if (r.status !== 201) throw Error('Synthetic account registration failed.');
      state.accounts[key] = { email, token: r.data.accessToken ?? r.data.token, user: r.data.user }; save();
      // Prove this running API writes to the guarded development database before
      // performing an intentional administrator provisioning action on this new account.
      const user = await db.user.findUnique({ where: { id: r.data.user.id } });
      if (!user || user.email !== email || user.organizationId !== r.data.user.organizationId) throw Error('Runtime database does not match guarded development target.');
      const payload = jwt.decode(state.accounts[key].token);
      jwt.verify(state.accounts[key].token);
      if (payload.sub !== user.id) throw Error('Unexpected token identity.');
      await db.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
      const login = await call('/auth/login', { anonymous: true, method: 'POST', body: { email, password: state.password } });
      state.accounts[key].token = login.data.accessToken ?? login.data.token;
      state.accounts[key].user = login.data.user; save();
    }
    record('Runtime target and real JWT authentication', true, { environment: 'Neon development', syntheticOrganizations: 4, demoBypass: false, mainAccessed: false });
  } else {
    state = JSON.parse(fs.readFileSync(stateFile));
    for (const account of Object.values(state.accounts)) {
      const r = await call('/auth/login', { anonymous: true, method: 'POST', body: { email: account.email, password: state.password } });
      if (r.status !== 201) throw Error('Synthetic login failed.'); account.token = r.data.accessToken ?? r.data.token;
    }
    save();
  }
  for (const route of ['/auth/me', '/activity-data', '/documents', '/spreadsheet-import/review-rows', '/metrics/summary', '/metrics/calculation-summary?periodStart=2025-08-01&periodEnd=2026-10-14', '/organization-profile', '/activity-events/workflow', '/reports', '/facilities']) {
    const r = await call(route, { key: 'B' }); record('Empty tenant ' + route.split('?')[0], r.status === 200, { status: r.status });
  }
  for (const [name, options] of [['no token', { anonymous: true }], ['invalid token', { token: 'invalid' }], ['expired token', { token: jwt.sign({ sub: state.accounts.A.user.id }, { expiresIn: -1 }) }]]) {
    const r = await call('/auth/me', options); record('Auth ' + name, r.status === 401, { status: r.status });
  }
  const wrong = await call('/auth/login', { anonymous: true, method: 'POST', body: { email: state.accounts.A.email, password: 'intentionally-wrong' } }); record('Wrong password', wrong.status === 401, { status: wrong.status });
  if (!state.document) {
    const bytes = Buffer.from(`Synthetic Task 9 source ${state.createdAt}\n`);
    const up = await upload('rc-private-source.csv', bytes); state.document = up.data; save();
    record('Source upload', up.status === 201, { status: up.status });
    const anon = await fetch(new URL(up.data.fileUrl, base)); record('Anonymous source bytes blocked', [401, 403, 404].includes(anon.status), { status: anon.status });
    for (const [name, filename, content, key, expected] of [
      ['Duplicate identical', 'rc-private-source.csv', bytes, 'A', 409],
      ['Duplicate renamed', 'rc-renamed.csv', bytes, 'A', 409],
      ['Same filename different bytes', 'rc-private-source.csv', Buffer.from(`Different ${state.createdAt}`), 'A', 201],
      ['Hash scoped to tenant', 'rc-private-source.csv', bytes, 'Governance', 201],
    ]) { const r = await upload(filename, content, key); record(name, r.status === expected, { status: r.status }); }
    const unsupported = await upload('rc-unsupported.heic', Buffer.from('Synthetic unsupported file'), 'A', 'application/octet-stream');
    const rejected = await call('/document-extraction/extract', { method: 'POST', body: { documentId: unsupported.data.id } });
    record('Unsupported extraction actionable 400', rejected.status === 400 && /unsupported/i.test(rejected.data.message), { status: rejected.status });
  }
  if (!state.manual) {
    const r = await call('/activity-data', { method: 'POST', body: { activityType: 'ELECTRICITY', recordDate: '2026-10-14', quantity: 980, unit: 'kWh', jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', sourceType: 'MANUAL' } });
    record('Manual API persistence', r.status === 201 && !!r.data.id, { status: r.status }); state.manual = r.data; save();
  }
  for (const [route, method, body] of [
    ['/activity-data/' + state.manual.id, 'GET'],
    ['/documents/' + state.document.id + '/download', 'GET'],
    ['/document-extraction/' + state.document.id, 'GET'],
    ['/document-extraction/confirm', 'POST', { documentId: state.document.id, activities: [] }],
  ]) { const r = await call(route, { key: 'B', method, body }); record('Cross-tenant ' + route.split('/').slice(1, 2), [403, 404].includes(r.status), { status: r.status }); }
  for (const route of ['/activity-data', '/documents', '/spreadsheet-import/review-rows', '/activity-events/workflow', '/reports', '/facilities']) {
    const r = await call(route + '?organizationId=' + state.accounts.A.user.organizationId, { key: 'B' });
    const rows = Array.isArray(r.data) ? r.data : r.data?.items;
    record('Tenant query override ' + route, r.status === 400 || (r.status === 200 && Array.isArray(rows) && rows.length === 0), { status: r.status, count: rows?.length ?? null });
  }
  const profile = (await call('/organization-profile')).data;
  const boundary = { ...profile, industry: 'Technology', provinceOrState: 'Alberta', country: 'Canada', geographicBoundary: 'Synthetic Canadian operations', includedFacilitiesOrLocations: 'Synthetic pilot facilities', includedScopes: 'Scope 1, Scope 2, selected Scope 3', reportingPeriodStart: '2025-08-01', reportingPeriodEnd: '2026-10-14', exclusionsAndLimitations: 'Synthetic pilot draft only' };
  const material = await call('/organization-profile', { method: 'PATCH', body: boundary });
  record('Boundary backend material save', material.status === 200, { status: material.status });
  const full = await call('/organization-profile', { method: 'PATCH', body: { ...material.data, boundaryStatus: 'DRAFT', boundaryVersion: material.data.boundaryVersion, boundaryReviewedBy: '', boundaryReviewedByUserId: '', boundaryReviewedAt: '', boundaryReviewNote: '', boundaryReviewFingerprint: '' } });
  record('Boundary current frontend contract', full.status === 200, { status: full.status, rejectedFields: Array.isArray(full.data?.message) ? full.data.message.filter(x => /should not exist/.test(x)) : [] });
  const bProfile = (await call('/organization-profile', { key: 'B' })).data;
  record('Boundary tenant isolation', bProfile.organizationName !== profile.organizationName && bProfile.geographicBoundary !== boundary.geographicBoundary);
  const factors = (await call('/conversion-factors?pageSize=100')).data;
  record('Available legacy factors', true, { count: factors.items?.length, activities: [...new Set(factors.items?.map(f => f.activityType))] });
  for (const [activityType, quantity, unit, expected] of [['ELECTRICITY', 1000, 'kWh', 530], ['NATURAL_GAS', 3, 'GJ', 148.32], ['GASOLINE', 100, 'L', 231], ['DIESEL', 100, 'L', 268]]) {
    const r = await call('/activity-data', { key: 'Governance', method: 'POST', body: { activityType, quantity, unit, recordDate: '2026-10-14', jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', sourceType: 'MANUAL' } });
    if (r.status !== 201) { record('Governance create ' + activityType, false, { status: r.status }); continue; }
    const summary = await call('/metrics/calculation-summary?periodStart=2026-10-14&periodEnd=2026-10-14', { key: 'Governance' });
    const d = summary.data.calculationDetails?.find(x => (x.activityDataId ?? x.id) === r.data.id);
    record('Corporate factor ' + activityType, d?.status === 'CALCULATED' && Math.abs(d.calculatedEmissionsKgCO2e - expected) < 0.001, { status: d?.status, expected, actual: d?.calculatedEmissionsKgCO2e, factor: d?.factorValue });
  }
  const audit = await call('/activity-events/workflow?pageSize=100');
  record('Persisted workflow events', audit.status === 200 && audit.data.items?.every(e => e.organizationId === state.accounts.A.user.organizationId && !!e.userId && !!e.createdAt && !!e.entityId), { count: audit.data.items?.length, events: [...new Set(audit.data.items?.map(e => e.eventName))] });
  state.persistenceBefore = { activities: (await call('/activity-data?pageSize=100')).data.items, audit: audit.data.items, boundary: (await call('/organization-profile')).data };
  const logout = await call('/auth/logout', { method: 'POST' });
  const login = await call('/auth/login', { anonymous: true, method: 'POST', body: { email: state.accounts.A.email, password: state.password } }); state.accounts.A.token = login.data.accessToken ?? login.data.token;
  record('Logout login persistence', logout.status === 201 && login.status === 201 && JSON.stringify((await call('/activity-data?pageSize=100')).data.items) === JSON.stringify(state.persistenceBefore.activities)); save();
} catch (error) {
  record('Probe interrupted', false, { code: error.code ?? 'RC_CHECK_FAILED', message: /^(Choose a new|Synthetic |Runtime |Unexpected token)/.test(error.message) ? error.message : 'See private operator log; no credentials emitted.' });
  process.exitCode = 1;
} finally {
  fs.writeFileSync(resultFile, JSON.stringify({ checkedAt: new Date().toISOString(), checks }, null, 2));
  await db.$disconnect();
}
