import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test('historical report and CSV retain 268 until explicit audited recalculation', async ({ page, request }) => {
  test.skip(!process.env.TASK9_RC_STATE_FILE, 'Requires isolated prepared development history fixture.');
  const state = JSON.parse(fs.readFileSync(process.env.TASK9_RC_STATE_FILE!, 'utf8'));
  const account = state.accounts.History;
  const history = state.historyProbe;
  const base = process.env.E2E_API_BASE_URL!;
  const headers = { Authorization: `Bearer ${account.token}` };
  test.setTimeout(120_000);
  expect((await request.patch(`${base}/conversion-factors/${history.factorId}`, { headers, data: { factorValue: 2.68 } })).status()).toBe(200);
  expect((await request.post(`${base}/metrics/calculate`, { headers, data: { activityDataIds: [history.activityId], metricTypes: ['CARBON_EMISSION'] } })).status()).toBe(201);
  const baseline = await (await request.get(`${base}/activity-data/${history.activityId}`, { headers })).json();
  expect(baseline.calculatedEmissionsKgCO2e).toBe(268);
  history.beforeSnapshot = baseline.calculationSnapshot;
  expect((await request.patch(`${base}/conversion-factors/${history.factorId}`, { headers, data: { factorValue: 3.68 } })).status()).toBe(200);
  try {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(account.email);
    await page.locator('input[type="password"]').fill(state.password);
    await page.getByRole('button', { name: 'Log In', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    await page.goto('/reports');
    await page.getByRole('button', { name: 'Generate Report', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Generate Report', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Expand all', exact: true }).click();
    await expect(page.locator('body')).toContainText('268 kg CO₂e');
    await page.getByRole('button', { name: 'Export reports', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Data Export (CSV)', exact: true }).click();
    await (await download).saveAs('/private/tmp/task9a-history.csv');
    const csv = fs.readFileSync('/private/tmp/task9a-history.csv', 'utf8');
    expect(csv).toContain('268');
    expect(csv).toContain('2.68');
    expect(csv).not.toContain('3.68');
    const before = await (await request.get(`${base}/activity-data/${history.activityId}`, { headers })).json();
    expect(before.calculationSnapshot).toEqual(history.beforeSnapshot);
    const recalculation = await request.post(`${base}/metrics/calculate`, { headers, data: { activityDataIds: [history.activityId], metricTypes: ['CARBON_EMISSION'] } });
    expect(recalculation.status()).toBe(201);
    expect((await recalculation.json()).items[0].value).toBe('368');
    const after = await (await request.get(`${base}/activity-data/${history.activityId}`, { headers })).json();
    expect(after.calculatedEmissionsKgCO2e).toBe(368);
    expect(after.calculationSnapshot.version).toBe(history.beforeSnapshot.version + 1);
    state.historyProbe.afterSnapshot = after.calculationSnapshot;
    state.historyProbe.explicitRecalculationPassed = true;
    fs.writeFileSync(process.env.TASK9_RC_STATE_FILE!, JSON.stringify(state), { mode: 0o600 });
  } finally {
    const restore = await request.patch(`${base}/conversion-factors/${history.factorId}`, { headers, data: { factorValue: 2.68 } });
    expect(restore.status()).toBe(200);
  }
});
