import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createCarbonLiteApiState,
  installCarbonLiteApiMock,
} from '../support/mock-api';
import {
  authenticateTestUser,
  monitorCriticalFailures,
} from '../support/smoke-test';

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/enmax-electricity.csv',
);

test('@smoke upload, extract, import, summarize, report, and export', async ({ page }) => {
  const api = createCarbonLiteApiState();
  const failures = monitorCriticalFailures(page);

  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  async function expectExtractedPreview() {
    await expect(page.getByRole('heading', {
      name: 'Draft Records Review',
    })).toBeVisible();
    await expect(page.getByText('Extracted rows: 1')).toBeVisible();
    const previewRow = page.getByRole('row').filter({
      has: page.getByRole('option', { name: 'ELECTRICITY' }),
    });
    await expect(previewRow.getByRole('combobox')).toHaveValue('ELECTRICITY');
    await expect(previewRow.locator('input[type="number"]')).toHaveValue('4280');
    await expect(previewRow.locator('input[type="text"]').nth(1)).toHaveValue('kWh');
  }

  async function openPersistedPreview() {
    const documentRow = page.getByRole('row').filter({
      hasText: 'enmax-electricity.csv',
    });
    await documentRow.getByRole('button', { name: 'Review Rows' }).click();
    await expectExtractedPreview();
  }

  await test.step('upload document', async () => {
    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: 'Input Data' }))
      .toBeVisible();

    await page.locator('#document-upload-input').setInputFiles(fixturePath);
    await page.getByRole('button', { name: 'Extract Data' }).click();

    const documentRow = page.getByRole('row').filter({
      hasText: 'enmax-electricity.csv',
    });
    await expect(documentRow).toContainText('Uploaded');
    expect(api.uploadRequests).toBe(1);
    await expect.poll(() => api.extractionRequests).toBe(1);
  });

  await test.step('extract and review document', async () => {
    api.releaseExtraction();
    const documentRow = page.getByRole('row').filter({
      hasText: 'enmax-electricity.csv',
    });

    await expectExtractedPreview();
    await expect(documentRow).toContainText('Needs Review');
    expect(api.extractionRequests).toBe(1);
  });

  await test.step('persist extracted preview across refresh, navigation, and login restore', async () => {
    await page.reload();
    await openPersistedPreview();

    await page.getByRole('link', { name: 'Calculation Review', exact: true }).click();
    await expect(page).toHaveURL(/\/metrics-summary$/);
    await page.getByRole('link', { name: 'Input Data', exact: true }).click();
    await openPersistedPreview();

    await page.evaluate(() => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
    });
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'playwright-access-token');
      localStorage.setItem(
        'currentUser',
        JSON.stringify({
          id: 'user-1',
          email: 'pilot@carbonliteapp.ca',
          role: 'USER',
          organizationId: 'organization-1',
          organizationName: 'CarbonLite E2E Workspace',
        }),
      );
    });
    await page.goto('/upload');
    await openPersistedPreview();
  });

  await test.step('import activity records once and generate metrics', async () => {
    await page.getByRole('button', { name: 'Confirm Import' }).click();
    await expect(page).toHaveURL(/\/data-records$/);
    await expect(page.getByRole('heading', { name: 'Data Records' })).toBeVisible();
    await expect(page.getByRole('main').getByText('Import completed successfully')).toBeVisible();

    await page.getByRole('link', { name: 'Calculation Review', exact: true }).click();
    await expect(page).toHaveURL(/\/metrics-summary$/);
    await expect(page.getByText('85.60 kg CO₂e').first()).toBeVisible();
    await expect(page.getByText('4,280 kWh').first()).toBeVisible();
    await expect(page.getByText('Records Included in GHG Total')).toBeVisible();

    expect(api.importRequests).toBe(1);
    expect(api.activities).toHaveLength(1);
    expect(api.metricGenerationRequests).toBe(1);
  });

  await test.step('confirm imported document status', async () => {
    await page.getByRole('link', { name: 'Input Data', exact: true }).click();
    const documentRow = page.getByRole('row').filter({
      hasText: 'enmax-electricity.csv',
    });
    await expect(documentRow).toContainText('Imported');
    await expect(documentRow.getByRole('button', { name: 'View Imported Records' })).toBeVisible();
    expect(api.activities).toHaveLength(1);
  });

  await test.step('generate report and export PDF', async () => {
    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByText('85.60 kg CO₂e').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /C\. Executive Summary/ })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Export reports$/i }).click();
    await page.getByRole('menuitem', { name: /Technical Review Package \(PDF\)/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^carbonlite-technical-emissions-report-.*\.pdf$/,
    );
    expect(api.summaryRequests).toBeGreaterThanOrEqual(2);
  });

  expect(api.importRequests, 'document import endpoint should be called once').toBe(1);
  expect(api.activities, 'only one activity record should exist after import').toHaveLength(1);
  failures.assertClean(api.unexpectedRequests);
});
