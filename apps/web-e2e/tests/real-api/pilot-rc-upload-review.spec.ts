import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test('pilot RC: supplied needs-review workbook reaches partial confirmation through the real UI', async ({ page, request }) => {
  test.skip(!process.env.TASK9_RC_STATE_FILE || !process.env.TASK9_NEEDS_REVIEW_FILE, 'Requires isolated development workspace and supplied workbook.');
  test.setTimeout(180_000);
  const state = JSON.parse(fs.readFileSync(process.env.TASK9_RC_STATE_FILE!, 'utf8'));
  const email = `rc9a-structured-${Date.now()}@example.com`;
  const registration = await request.post(`${process.env.E2E_API_BASE_URL}/auth/register`, {
    data: { organizationName: `Task 9A structured ${Date.now()}`, email, password: state.password },
  });
  expect(registration.status()).toBe(201);
  const registered = await registration.json();
  state.accounts.Structured = { email, user: registered.user, token: registered.accessToken ?? registered.token };
  fs.writeFileSync(process.env.TASK9_RC_STATE_FILE!, JSON.stringify(state), { mode: 0o600 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/api/') && response.status() >= 500) errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.locator('input[type="password"]').fill(state.password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto('/input-data');
  await page.getByRole('tab', { name: /^Import Spreadsheet/ }).click();
  await page.locator('input[type="file"][accept^=".csv"]').setInputFiles(process.env.TASK9_NEEDS_REVIEW_FILE!);
  await expect(page.getByText('2 ready for calculation', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save All', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Draft Records Review', exact: true })).toBeVisible({ timeout: 120_000 });
  fs.writeFileSync('/private/tmp/task9-upload-review-visible.txt', await page.locator('body').innerText());
  await page.screenshot({ path: '/private/tmp/task9-upload-review.png', fullPage: true });
  const confirmation = page.waitForResponse(response => response.url().includes('/document-extraction/confirm') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Import', exact: true }).click();
  const response = await confirmation;
  expect(response.status()).toBe(201);
  expect((await response.json()).count).toBe(3);
  await expect(page).toHaveURL(/\/(data-records|activity-records)$/);
  await page.goto('/input-data');
  await page.getByRole('button', { name: 'Review Rows', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Draft Records Review', exact: true })).toBeVisible();
  const correctedRow = page.getByRole('row').filter({ hasText: 'Missing Province' });
  const provinceInput = correctedRow.locator('input[data-validation-field="jurisdictionRegion"]');
  const rowIndex = Number(await provinceInput.getAttribute('data-validation-row'));
  await provinceInput.fill('Alberta');
  const selection = page.getByRole('checkbox', { name: `Select preview row ${rowIndex + 1}`, exact: true });
  await expect(selection).toBeEnabled();
  await selection.check();
  const second = page.waitForResponse(response => response.url().includes('/document-extraction/confirm') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Import', exact: true }).click();
  const secondResponse = await second;
  expect(secondResponse.status()).toBe(201);
  expect((await secondResponse.json()).count).toBe(1);
  const third = await request.post(`${process.env.E2E_API_BASE_URL}/document-extraction/confirm`, {
    headers: { Authorization: `Bearer ${state.accounts.Structured.token}` },
    data: secondResponse.request().postDataJSON(),
  });
  expect(third.status()).toBe(201);
  expect((await third.json()).count).toBe(0);
  const persisted = await request.get(`${process.env.E2E_API_BASE_URL}/activity-data?pageSize=100`, { headers: { Authorization: `Bearer ${state.accounts.Structured.token}` } });
  expect((await persisted.json()).items).toHaveLength(4);
  expect(errors).toEqual([]);
});
