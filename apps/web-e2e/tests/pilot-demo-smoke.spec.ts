import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPilotDemoApiState,
  installPilotDemoApiMock,
} from '../support/pilot-demo-api';
import { monitorCriticalFailures } from '../support/smoke-test';

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/pilot-golden-dataset.csv',
);

const demoEmail = process.env.CARBONLITE_DEMO_EMAIL ?? 'pilot@carbonliteapp.ca';
const demoPassword = process.env.CARBONLITE_DEMO_PASSWORD ?? 'mock-only-pilot-password';

test('@pilot-daily CarbonLite Pilot Demo v0.1 golden smoke workflow', async ({ page }) => {
  const api = createPilotDemoApiState();
  const failures = monitorCriticalFailures(page);
  await installPilotDemoApiMock(page, api, {
    email: demoEmail,
    password: demoPassword,
  });

  await test.step('login with local demo credentials', async () => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(demoEmail);
    await page.getByLabel('Password', { exact: true }).fill(demoPassword);
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/upload$/);
    await expect(page.getByRole('heading', { name: 'Input data' })).toBeVisible();
    expect(api.loginRequests).toBe(1);
  });

  await test.step('reset demo data', async () => {
    await page.getByRole('link', { name: 'Data records', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Data records' })).toBeVisible();

    await page.getByRole('button', { name: 'Reset demo data', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Reset demo data' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Type RESET DEMO DATA to confirm/i).fill('RESET DEMO DATA');
    await dialog.getByRole('button', { name: 'Reset demo data', exact: true }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(/Demo data reset:/i)).toBeVisible();
    expect(api.resetRequests).toBe(1);
    expect(api.activities).toHaveLength(0);
  });

  await test.step('import golden dataset', async () => {
    await page.getByRole('link', { name: 'Input data', exact: true }).click();
    await page.locator('#document-upload-input').setInputFiles({
      name: 'pilot-golden-source.pdf',
      mimeType: 'application/pdf',
      buffer: await fs.readFile(fixturePath),
    });
    await page.getByRole('button', { name: 'Extract data' }).click();

    await expect(page.getByRole('heading', {
      name: 'Draft Records Review',
    })).toBeVisible();
    await expect(page.getByText('Extracted rows: 10')).toBeVisible();
    await expect(page.getByText(/PDF extraction/i)).toHaveCount(0);

    await page.getByRole('button', { name: 'Confirm Import' }).click();
    await expect(page).toHaveURL(/\/data-records$/);
    expect(api.uploadRequests).toBe(1);
    expect(api.extractionRequests).toBe(1);
    expect(api.importRequests).toBe(1);
    expect(api.activities).toHaveLength(1);
  });

  await test.step('verify data records and tracked water treatment', async () => {
    await page.getByRole('link', { name: 'Data records', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Data records' })).toBeVisible();
    await expect(page.locator('[data-testid^="activity-row-"]')).toHaveCount(1);

    const waterRow = page.getByRole('row').filter({ hasText: 'Water' });
    await expect(waterRow).toContainText('Tracked Metric');
    await expect(waterRow).toContainText('100');
    await expect(waterRow).toContainText('m3');
  });

  await test.step('verify calculation results golden totals', async () => {
    await page.getByRole('link', { name: 'Calculation results', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Calculation results' })).toBeVisible();
    await expect(page.getByText('0 kg CO₂e').first()).toBeVisible();
    await expect(page.getByText('0 kWh').first()).toBeVisible();

    const scopeSection = page.locator('section').filter({ hasText: 'Emissions by Scope' });
    await expect(scopeSection).toContainText('Scope 1');
    await expect(scopeSection).toContainText('0 kg CO₂e');
    await expect(scopeSection).toContainText('Scope 2');
    await expect(scopeSection).toContainText('0 kg CO₂e');
    await expect(scopeSection).toContainText('Scope 3');
    await expect(scopeSection).toContainText('0 kg CO₂e');
    await expect(page.getByText(/1 tracked metric record is excluded from Scope 1, 2, and 3 totals/i)).toBeVisible();
  });

  await test.step('keep report export fail closed without calculated records', async () => {
    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByText('Pilot report', { exact: true })).toBeVisible();
    await expect(page.getByText(/No emissions calculated because records need attention/i)).toBeVisible();
    await expect(page.getByText('0 kg CO₂e · 0 included · 1 tracked metric')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export reports' })).toBeEnabled();
  });

  await test.step('keep the platform factor library hidden from organization admins', async () => {
    await expect(page.getByRole('link', { name: 'Factors', exact: true })).toHaveCount(0);
  });

  expect(api.summaryRequests).toBeGreaterThanOrEqual(2);
  failures.assertClean(api.unexpectedRequests);
});
