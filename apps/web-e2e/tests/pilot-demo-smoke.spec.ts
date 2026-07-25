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
const demoPassword = process.env.CARBONLITE_DEMO_PASSWORD ?? 'password123';

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
    await page.getByLabel(/password/i).fill(demoPassword);
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/upload$/);
    await expect(page.getByRole('heading', { name: 'Input Data' })).toBeVisible();
    expect(api.loginRequests).toBe(1);
  });

  await test.step('reset demo data', async () => {
    await page.getByRole('link', { name: 'Data Records', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Data Records' })).toBeVisible();

    await page.getByRole('button', { name: /^Reset Demo Data$/i }).click();
    const dialog = page.getByRole('dialog', { name: 'Reset Demo Data' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Type RESET DEMO DATA to confirm/i).fill('RESET DEMO DATA');
    await dialog.getByRole('button', { name: /^Reset Demo Data$/i }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(/Demo data reset:/i)).toBeVisible();
    expect(api.resetRequests).toBe(1);
    expect(api.activities).toHaveLength(0);
  });

  await test.step('import golden dataset', async () => {
    await page.getByRole('link', { name: 'Input Data', exact: true }).click();
    await page.locator('#document-upload-input').setInputFiles(fixturePath);
    await page.getByRole('button', { name: 'Extract Data' }).click();

    await expect(page.getByRole('heading', {
      name: 'Draft Records Review',
    })).toBeVisible();
    await expect(page.getByText('Extracted rows: 10')).toBeVisible();
    await expect(page.getByText(/PDF extraction/i)).toHaveCount(0);

    await page.getByRole('button', { name: 'Confirm Import' }).click();
    await expect(page).toHaveURL(/\/metrics-summary$/);
    expect(api.uploadRequests).toBe(1);
    expect(api.extractionRequests).toBe(1);
    expect(api.importRequests).toBe(1);
    expect(api.activities).toHaveLength(10);
  });

  await test.step('verify data records and tracked water treatment', async () => {
    await page.getByRole('link', { name: 'Data Records', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Data Records' })).toBeVisible();
    await expect(page.locator('[data-testid^="activity-row-"]')).toHaveCount(10);

    const waterRow = page.getByRole('row').filter({ hasText: 'Water' });
    await expect(waterRow).toContainText('Tracked Metric');
    await expect(waterRow).toContainText('100');
    await expect(waterRow).toContainText('m3');
  });

  await test.step('verify calculation review golden totals', async () => {
    await page.getByRole('link', { name: 'Calculation Review', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Calculation Review' })).toBeVisible();
    await expect(page.getByText('37,285 kg CO2e')).toBeVisible();
    await expect(page.getByText('63,600 kWh').first()).toBeVisible();

    const scopeSection = page.locator('section').filter({ hasText: 'Emissions by Scope' });
    await expect(scopeSection).toContainText('Scope 1');
    await expect(scopeSection).toContainText('3,313 kg CO2e');
    await expect(scopeSection).toContainText('Scope 2');
    await expect(scopeSection).toContainText('33,247 kg CO2e');
    await expect(scopeSection).toContainText('Scope 3');
    await expect(scopeSection).toContainText('725 kg CO2e');
    await expect(page.getByText(/1 tracked metric record is excluded from Scope 1, 2, and 3 totals/i)).toBeVisible();
  });

  await test.step('generate report and verify PDF and CSV exports', async () => {
    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByText('Pilot Emissions Data Readiness Report')).toBeVisible();
    await page.getByRole('button', { name: 'Generate Report' }).click();

    await expect(page.getByText('37,285 kgCO2e').first()).toBeVisible();
    await expect(page.getByText(/PDF extraction/i)).toHaveCount(0);

    const pdfDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF' }).click();
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toMatch(/^carbonlite-pilot-data-readiness-report-\d{4}-\d{2}-\d{2}\.pdf$/);

    const csvDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download CSV' }).click();
    const csvDownload = await csvDownloadPromise;
    expect(csvDownload.suggestedFilename()).toMatch(/^carbonlite-pilot-report-\d{4}-\d{2}-\d{2}\.csv$/);
    const csvPath = await csvDownload.path();
    expect(csvPath).toBeTruthy();
    const csv = await fs.readFile(csvPath ?? '', 'utf8');
    expect(csv).toContain('pilot-golden-dataset.csv');
    expect(csv).toContain('Tracked only');
    expect(csv).not.toMatch(/\b(?:pilot-activity|pilot-electricity|pilot-natural|pilot-gasoline|pilot-diesel|pilot-air|pilot-hotel|cm[a-z0-9]{20,})[\w-]*\b/i);
    expect(csv).not.toMatch(/PDF extraction/i);
  });

  await test.step('verify factor library table remains usable', async () => {
    await page.getByRole('link', { name: 'Factors', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Conversion Factor Library' })).toBeVisible();
    await expect(page.getByText('Scroll horizontally to view all columns →')).toBeVisible();

    const actionsHeader = page.getByRole('columnheader', { name: 'Actions' });
    await expect(actionsHeader).toBeVisible();
    await expect
      .poll(async () => actionsHeader.evaluate((element) => getComputedStyle(element).position))
      .toBe('sticky');
  });

  expect(api.summaryRequests).toBeGreaterThanOrEqual(2);
  failures.assertClean(api.unexpectedRequests);
});
