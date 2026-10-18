import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test('pilot RC: administrator boundary save survives a browser reload', async ({ page }) => {
  test.skip(!process.env.TASK9_RC_STATE_FILE, 'Requires guarded synthetic development workspaces.');
  const state = JSON.parse(fs.readFileSync(process.env.TASK9_RC_STATE_FILE!, 'utf8'));
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(state.accounts.A.email);
  await page.locator('input[type="password"]').fill(state.password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto('/organization-profile');
  await expect(page.getByRole('textbox', { name: 'Geographic Boundary', exact: true })).toHaveValue('Synthetic Canadian operations');
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Edmonton');
  const saved = page.waitForResponse(r => r.url().endsWith('/organization-profile') && r.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Save Organization Profile', exact: true }).click();
  expect((await saved).status()).toBe(200);
  const reviewed = page.waitForResponse(r => r.url().endsWith('/organization-profile') && r.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Review Boundary', exact: true }).click();
  const attestation = await (await reviewed).json();
  expect(attestation.boundaryStatus).toBe('REVIEWED');
  expect(attestation.boundaryReviewedByUserId).toBe(state.accounts.A.user.id);
  expect(attestation.boundaryReviewedAt).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'City', exact: true })).toHaveValue('Edmonton');
  await expect(page.getByText('Reviewed', { exact: true }).first()).toBeVisible();
});

test('pilot RC: real combined upload, manual entry, report downloads and login persistence', async ({ page, request }) => {
  test.skip(!process.env.TASK9_RC_STATE_FILE || !process.env.TASK9_ENMAX_FILE, 'Requires guarded development state and synthetic ENMAX fixture.');
  test.setTimeout(240_000);
  const stateFile = process.env.TASK9_RC_STATE_FILE!;
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const base = process.env.E2E_API_BASE_URL!;
  expect(['localhost', '127.0.0.1']).toContain(new URL(base).hostname);
  const email = `rc9a-combined-${Date.now()}@example.com`;
  const registration = await request.post(`${base}/auth/register`, { data: { organizationName: `Task 9A RC Combined ${Date.now()}`, email, password: state.password } });
  expect(registration.status()).toBe(201);
  const registered = await registration.json();
  state.accounts.Combined = { email, user: registered.user, token: registered.accessToken ?? registered.token };
  fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 500) errors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  const login = async () => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(state.password);
    await page.getByRole('button', { name: 'Log In', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  };
  await login();
  await page.goto('/input-data');
  await page.getByRole('tab', { name: /^Import Spreadsheet/ }).click();
  await page.locator('input[type="file"][accept^=".csv"]').setInputFiles('apps/web-e2e/fixtures/carbonlite_field_mapping_test.xlsx');
  await expect(page.getByText('5 ready for calculation', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save All', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Draft Records Review', exact: true })).toBeVisible();
  const confirm = page.waitForResponse(r => r.url().endsWith('/document-extraction/confirm') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Import', exact: true }).click();
  expect((await (await confirm).json()).count).toBe(5);
  await expect(page).toHaveURL(/\/(data-records|activity-records)$/);

  await page.goto('/input-data');
  await page.locator('#document-upload-input').setInputFiles(process.env.TASK9_ENMAX_FILE!);
  await page.getByRole('button', { name: 'Extract Data', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Draft Records Review', exact: true })).toBeVisible({ timeout: 120_000 });
  const enmax = page.waitForResponse(r => r.url().endsWith('/document-extraction/confirm') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Import', exact: true }).click();
  expect((await (await enmax).json()).count).toBe(3);
  await expect(page).toHaveURL(/\/(data-records|activity-records)$/);

  await page.goto('/input-data');
  await page.getByRole('tab', { name: /^Manual Entry/ }).click();
  await page.getByRole('button', { name: 'Add activity record', exact: true }).click();
  const row = page.getByRole('group', { name: 'Activity row 1', exact: true });
  await row.getByRole('combobox', { name: /^Activity Type/ }).selectOption('ELECTRICITY');
  await row.getByRole('spinbutton', { name: /^Quantity/ }).fill('980');
  await row.getByRole('combobox', { name: /^Unit/ }).selectOption('kWh');
  await row.getByLabel(/^Date/).fill('2026-10-14');
  await row.getByRole('combobox', { name: /Province/ }).selectOption({ label: 'Alberta' });
  const manual = page.waitForResponse(r => r.url().endsWith('/activity-data') && r.request().method() === 'POST');
  await row.getByRole('button', { name: 'Save row 1', exact: true }).click();
  const manualResponse = await manual;
  expect(manualResponse.status()).toBe(201);
  const manualRecord = await manualResponse.json();
  // Keep failures visible while collecting the rest of the release evidence.
  expect(manualRecord.calculatedEmissionsKgCO2e).toBe(519.4);
  expect(manualRecord.sourceType).toBe('MANUAL');
  expect(manualRecord.sourceDocumentId).toBeFalsy();

  await page.goto('/reports');
  await page.locator('input[type="date"]').nth(0).fill('2025-08-01');
  await page.locator('input[type="date"]').nth(1).fill('2026-10-14');
  await page.getByRole('button', { name: 'Generate Report', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate Report', exact: true })).toBeEnabled({ timeout: 120_000 });
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  // Capture exports and persistence even when the frozen-total gate fails.
  const visibleReport = await page.locator('body').innerText();
  fs.writeFileSync('/private/tmp/task9-current-combined-visible.txt', await page.locator('body').innerText());
  await page.screenshot({ path: '/private/tmp/task9-current-combined.png', fullPage: true });
  for (const [label, file] of [['Executive Summary (PDF)', 'executive.pdf'], ['Technical Review Package (PDF)', 'technical.pdf'], ['Data Export (CSV)', 'records.csv']]) {
    await page.getByRole('button', { name: 'Export reports', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: label, exact: true }).click();
    await (await download).saveAs(`/private/tmp/task9-current-${file}`);
  }
  const headers = { Authorization: `Bearer ${state.accounts.Combined.token}` };
  const before = await (await request.get(`${base}/activity-data?pageSize=100`, { headers })).json();
  expect(before.items).toHaveLength(9);
  fs.writeFileSync('/private/tmp/task9-current-combined-records.json', JSON.stringify(before.items), { mode: 0o600 });
  await page.getByRole('button', { name: email, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login();
  await page.goto('/data-records');
  const after = await (await request.get(`${base}/activity-data?pageSize=100`, { headers })).json();
  expect(after.items.map((r: { id: string }) => r.id).sort()).toEqual(before.items.map((r: { id: string }) => r.id).sort());
  expect(manualRecord.calculationSnapshot).toMatchObject({ contractVersion: 1, result: { value: 519.4, scope: 'SCOPE_2' } });
  expect(errors).toEqual([]);
  expect(visibleReport).toContain('3,285.90');
});
