// Run only after pilot-rc-check.mjs on its fresh, guarded development workspaces.
import fs from 'node:fs';
const stateFile = process.env.TASK9_RC_STATE_FILE;
if (!stateFile) throw Error('TASK9_RC_STATE_FILE is required.');
const state = JSON.parse(fs.readFileSync(stateFile));
const base = 'http://localhost:3333/api';
const checks = [];
const log = (name, pass, evidence) => { checks.push({ name, pass, ...evidence }); console.log(JSON.stringify(checks.at(-1))); };
async function api(route, method = 'GET', body, key = 'Governance') {
  const r = await fetch(base + route, { method, headers: { Authorization: 'Bearer ' + state.accounts[key].token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
}
try {
  const factor = await api('/conversion-factors', 'POST', { name: 'Synthetic RC history factor', type: 'EMISSION', activityType: 'DIESEL', unit: 'L', factorValue: 2.68, resultUnit: 'kgCO2e', jurisdiction: 'Alberta', region: 'Alberta', country: 'Canada', sourceYear: 2026, verified: true, sourceAuthority: 'Synthetic test only', sourceDocument: 'RC isolated history test', applicability: 'CORPORATE_INVENTORY', emissionBasis: 'DIRECT_CO2E' });
  if (factor.status !== 201) throw Error('Factor create failed');
  log('Custom factor isolation', [403, 404].includes((await api('/conversion-factors/' + factor.data.id, 'GET', undefined, 'B')).status));
  const activity = await api('/activity-data', 'POST', { activityType: 'DIESEL', quantity: 100, unit: 'L', recordDate: '2026-10-14', jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', sourceType: 'MANUAL' });
  if (activity.status !== 201) throw Error('Activity create failed');
  const query = '/metrics/calculation-summary?selectedActivityRecordIds=' + activity.data.id;
  const before = await api(query);
  const d = before.data.calculationDetails[0];
  if (d.factorId !== factor.data.id || d.calculatedEmissionsKgCO2e !== 268) throw Error('Synthetic custom factor did not match');
  const calculated = await api('/metrics/calculate', 'POST', { activityDataIds: [activity.data.id], metricTypes: ['CARBON_EMISSION'] });
  log('Explicit historical calculation', calculated.status === 201 && calculated.data.count === 1, { status: calculated.status, total: calculated.data.items?.[0]?.value });
  const metricsBefore = await api('/metrics?pageSize=100');
  const edited = await api('/conversion-factors/' + factor.data.id, 'PATCH', { factorValue: 3.68 });
  const after = await api(query);
  const metricsAfter = await api('/metrics?pageSize=100');
  log('Historical summary immutability after own factor edit', before.data.totalEstimatedEmissionsKgCO2e === after.data.totalEstimatedEmissionsKgCO2e, { before: before.data.totalEstimatedEmissionsKgCO2e, after: after.data.totalEstimatedEmissionsKgCO2e, explicitRecalculationAfterEdit: false, factorEditStatus: edited.status, persistedMetricUnchanged: JSON.stringify(metricsBefore.data) === JSON.stringify(metricsAfter.data) });
  const facility = await api('/facilities', 'POST', { name: 'Synthetic Task 9 RC facility', type: 'OFFICE', country: 'Canada', provinceState: 'Alberta' });
  log('Facility ownership', facility.status === 201 && [403,404].includes((await api('/facilities/' + facility.data.id, 'GET', undefined, 'B')).status));
  const report = await api('/reports', 'POST', { title: 'Synthetic RC historical check', periodStart: '2025-08-01', periodEnd: '2026-10-14' });
  log('Persisted report ownership', report.status === 201 && [403,404].includes((await api('/reports/' + report.data.id, 'GET', undefined, 'B')).status));
  const foreign = await api('/metrics/calculation-summary?selectedActivityRecordIds=' + activity.data.id, 'GET', undefined, 'B');
  log('Cross-tenant calculation and export source isolation', foreign.status === 200 && foreign.data.calculationDetails?.length === 0, { status: foreign.status, count: foreign.data.calculationDetails?.length });
  const invalid = await api('/activity-data', 'POST', { activityType: 'ELECTRICITY', quantity: -1, unit: 'kWh', recordDate: '2026-10-14', sourceType: 'MANUAL' });
  log('Invalid negative quantity rejected', invalid.status === 400, { status: invalid.status });
  const missing = await api('/activity-data', 'POST', { activityType: 'ELECTRICITY' });
  log('Missing required fields rejected', missing.status === 400, { status: missing.status });
  const factorHistory = await api('/conversion-factors/' + factor.data.id);
  state.historyProbe = { activityId: activity.data.id, factorId: factor.data.id, metricId: calculated.data.items?.[0]?.metricResultId };
  fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
} catch (error) { log('History probe stopped', false, { message: error.message }); process.exitCode = 1; }
fs.writeFileSync('/private/tmp/task9-current-history-results.json', JSON.stringify(checks, null, 2));
