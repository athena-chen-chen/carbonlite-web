import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test('pilot RC: live combined workspace preserves the frozen report total', async ({ page }) => {
  test.skip(!process.env.TASK9_RC_STATE_FILE, 'Requires prepared Task 9 development workspace.');
  test.setTimeout(120_000);
  const state = JSON.parse(fs.readFileSync(process.env.TASK9_RC_STATE_FILE!, 'utf8'));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/api/') && response.status() >= 500) errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(state.accounts.Combined.email);
  await page.locator('input[type="password"]').fill(state.password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto('/reports');
  const generate = page.getByRole('button', { name: 'Generate Report', exact: true });
  await expect(generate).toBeEnabled();
  await page.locator('input[type="date"]').nth(0).fill('2025-08-01');
  await page.locator('input[type="date"]').nth(0).press('Tab');
  await expect(generate).toBeEnabled();
  await page.locator('input[type="date"]').nth(1).fill('2026-10-14');
  await page.locator('input[type="date"]').nth(1).press('Tab');
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(generate).toBeEnabled({ timeout: 120_000 });
  await expect(page.getByRole('button', { name: 'Expand all', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  await expect(page.locator('body')).toContainText('3,285.90');
  await expect(page.locator('input[type="date"]').nth(0)).toHaveValue('2025-08-01');
  await expect(page.locator('input[type="date"]').nth(1)).toHaveValue('2026-10-14');
  await page.screenshot({ path: '/private/tmp/task9-combined-report.png', fullPage: true });
  fs.writeFileSync('/private/tmp/task9-combined-report-visible.txt', await page.locator('body').innerText());
  for (const [label, filename] of [
    ['Executive Summary (PDF)', 'executive.pdf'],
    ['Technical Review Package (PDF)', 'technical.pdf'],
    ['Data Export (CSV)', 'records.csv'],
  ]) {
    await page.getByRole('button', { name: 'Export reports', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: label, exact: true }).click();
    await (await pending).saveAs(`/private/tmp/task9-recheck-${filename}`);
  }
  expect(errors).toEqual([]);
});
