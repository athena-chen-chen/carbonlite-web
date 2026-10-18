// Read-only recheck of the existing synthetic RC evidence. Never logs credentials.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const apiDir = path.resolve('../carbonlite-api');
const requireApi = createRequire(path.join(apiDir, 'package.json'));
const { loadEnvironment } = await import(pathToFileURL(path.join(apiDir, 'scripts/dev-database.mjs')));
const { env } = loadEnvironment('neon');
const { PrismaClient } = requireApi('@prisma/client');
const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL, log: [] });
const state = JSON.parse(fs.readFileSync(process.env.TASK9_RC_STATE_FILE));
if (['A', 'B', 'Governance'].some(key => !state.accounts?.[key]?.token) || !state.manual || !state.document) {
  throw Error('Use a complete, prepared synthetic RC state file.');
}
const checks = [];
const record = (name, pass, notes = {}) => {
  const result = { name, pass, ...notes };
  checks.push(result);
  console.log(JSON.stringify(result));
};
async function api(route, key = 'A', token = state.accounts[key].token) {
  const response = await fetch('http://localhost:3333/api' + route, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let data; try { data = await response.json(); } catch { data = null; }
  if (response.status >= 500) record('Unexpected API 500', false, { route: route.split('?')[0], status: response.status });
  return { status: response.status, data };
}

try {
  const account = state.accounts.A;
  const user = await db.user.findFirst({ where: { id: account.user.id, organizationId: account.user.organizationId } });
  const me = await api('/auth/me');
  if (!user || me.data?.id !== user.id) throw Error('Runtime identity not verified');
  record('Runtime matches guarded Neon development database', true, { mainAccessed: false });
  for (const route of ['/activity-data', '/documents', '/spreadsheet-import/review-rows', '/metrics/summary', '/metrics/calculation-summary', '/organization-profile', '/activity-events/workflow', '/reports', '/facilities']) {
    const result = await api(route, 'B');
    record('Empty tenant ' + route, result.status === 200, { status: result.status });
  }
  for (const token of ['', 'invalid']) {
    const result = await api('/activity-data', 'B', token);
    record(token ? 'Invalid token' : 'Unauthenticated API', result.status === 401, { status: result.status });
  }
  for (const route of ['/activity-data/' + state.manual.id, '/documents/' + state.document.id + '/download', '/document-extraction/' + state.document.id]) {
    const result = await api(route, 'B');
    record('Cross-tenant ' + route.split('/')[1], [403, 404].includes(result.status), { status: result.status });
  }
  const summary = await api('/metrics/calculation-summary?selectedActivityRecordIds=' + state.manual.id);
  const manual = summary.data.calculationDetails?.[0];
  record('Manual electricity calculation', manual?.calculatedEmissionsKgCO2e === 519.4, { emissions: manual?.calculatedEmissionsKgCO2e, factor: manual?.factorValue, sourceType: manual?.sourceType, manualLineageAvailable: Boolean(manual?.manualSourceProvenance) });
  const governance = await api('/metrics/calculation-summary?periodStart=2026-10-14&periodEnd=2026-10-14', 'Governance');
  const expected = { ELECTRICITY: 530, NATURAL_GAS: 148.32, GASOLINE: 231, DIESEL: 268 };
  record('Corporate activities in live development tenant', governance.status === 200 && Object.entries(expected).every(([activity, emissions]) => governance.data.calculationDetails?.some(d => d.activityType === activity && d.calculatedEmissionsKgCO2e === emissions)), {
    details: governance.data.calculationDetails?.map(d => ({ activity: d.activityType, quantity: d.activityQuantity, unit: d.activityUnit, status: d.status, factor: d.factorValue, emissions: d.calculatedEmissionsKgCO2e })),
  });
  const history = state.historyProbe;
  if (history) {
    const metric = await db.metricResult.findFirst({ where: { id: history.metricId, organizationId: state.accounts.Governance.user.organizationId } });
    const live = await api('/metrics/calculation-summary?selectedActivityRecordIds=' + history.activityId, 'Governance');
    record('Historical report agrees with persisted calculation', Number(metric?.value) === live.data.totalEstimatedEmissionsKgCO2e, { storedEmissions: Number(metric?.value), snapshotFactor: metric?.detailsJson?.factorValue, displayedEmissions: live.data.totalEstimatedEmissionsKgCO2e, displayedFactor: live.data.calculationDetails?.[0]?.factorValue });
  }
  for (const key of ['Structured', 'Combined']) {
    if (!state.accounts[key]) continue;
    const result = await api('/metrics/calculation-summary?periodStart=2025-08-01&periodEnd=2026-10-14', key);
    const target = key === 'Combined' ? { total: 3285.9, count: 9, included: 8 } : { total: 579.4, count: 3, included: 2 };
    record(key + ' existing synthetic workflow outcome', result.status === 200 && result.data.totalEstimatedEmissionsKgCO2e === target.total && result.data.recordsInScope === target.count && result.data.recordsIncluded === target.included, { expected: target, total: result.data.totalEstimatedEmissionsKgCO2e, included: result.data.recordsIncluded, count: result.data.recordsInScope, details: result.data.calculationDetails?.map(d => ({ activity: d.activityType, status: d.status, emissions: d.calculatedEmissionsKgCO2e })) });
    if (key === 'Combined') {
      // Keep this read usable while the separately reported sourceType schema
      // drift is unresolved; filter the small synthetic tenant in memory.
      const manualRecords = (await db.activityData.findMany({ where: { organizationId: state.accounts[key].user.organizationId } })).filter(row => row.sourceType === 'MANUAL');
      for (const row of manualRecords) {
        const metrics = await db.metricResult.findMany({ where: { organizationId: row.organizationId, activityDataId: row.id, metricType: 'CARBON_EMISSION' } });
        record('Durable UI manual factor and calculation snapshot', (row.matchedFactorValue !== null && row.calculatedEmissionsKgCO2e !== null) || metrics.some(metric => metric.detailsJson?.factorValue && metric.value !== null), { activityFactorSnapshot: row.matchedFactorValue, activityCalculationSnapshot: row.calculatedEmissionsKgCO2e, persistedMetricCount: metrics.length, sourceFileAbsent: !row.sourceDocumentId && !row.sourceFileName });
      }
    }
  }
} catch (error) {
  record('Recheck interrupted', false, { code: error.code ?? 'RC_RECHECK_FAILED' });
  process.exitCode = 1;
} finally {
  await db.$disconnect();
  fs.writeFileSync('/private/tmp/task9-recheck-live.json', JSON.stringify({ checkedAt: new Date().toISOString(), checks }, null, 2));
  if (checks.some(check => !check.pass)) process.exitCode = 1;
}
