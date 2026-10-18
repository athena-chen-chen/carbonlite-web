import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test('pilot RC: fresh browser login, empty workspace, navigation and login persistence', async ({ page }) => {
  test.skip(!process.env.TASK9_RC_STATE_FILE, 'Requires isolated Task 9 development workspaces.');
  test.setTimeout(120_000);
  const state = JSON.parse(fs.readFileSync(process.env.TASK9_RC_STATE_FILE!, 'utf8'));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/api/') && response.status() >= 500) errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  const login = async () => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(state.accounts.B.email);
    await page.locator('input[type="password"]').fill(state.password);
    await page.getByRole('button', { name: 'Log In', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  };
  await login();
  for (const route of ['/organization-profile', '/activity-records', '/metrics-summary', '/reports']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByText('Internal server error', { exact: true })).toHaveCount(0);
  }
  await page.reload();
  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'No reporting data found.' })).toBeVisible();
  fs.writeFileSync('/private/tmp/task9-browser-visible.txt', await page.locator('body').innerText());
  await page.screenshot({ path: '/private/tmp/task9-empty-reports.png', fullPage: true });
  await page.getByRole('button', { name: state.accounts.B.email, exact: true }).click();
  const logout = page.getByRole('menuitem', { name: 'Logout', exact: true });
  await expect(logout).toBeVisible();
  await logout.click();
  await expect(page).toHaveURL(/\/login$/);
  await login();
  await page.goto('/reports');
  await expect(page.locator('main')).toBeVisible();
  expect(errors).toEqual([]);
});
