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

  await test.step('upload document', async () => {
    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: /upload & extract carbon data/i }))
      .toBeVisible();

    await page.locator('#document-upload-input').setInputFiles(fixturePath);
    await page.getByRole('button', { name: 'Upload & Extract' }).click();

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

    await expect(page.getByRole('heading', {
      name: 'Review & Edit Data Before Import',
    })).toBeVisible();
    await expect(page.getByText('Extracted rows: 1')).toBeVisible();
    const previewRow = page.getByRole('row').filter({
      has: page.getByRole('option', { name: 'ELECTRICITY' }),
    });
    await expect(previewRow.getByRole('combobox')).toHaveValue('ELECTRICITY');
    await expect(previewRow.locator('input[type="number"]')).toHaveValue('4280');
    await expect(previewRow.locator('input[type="text"]').nth(1)).toHaveValue('kWh');
    await expect(documentRow).toContainText('Ready for Review');
    expect(api.extractionRequests).toBe(1);
  });

  await test.step('import activity records once and generate metrics', async () => {
    await page.getByRole('button', { name: 'Confirm Import' }).click();
    await expect(page).toHaveURL(/\/metrics-summary$/);
    await expect(page.getByText('2140 kg CO2e')).toBeVisible();
    await expect(page.getByText('4280 kWh')).toBeVisible();
    await expect(page.getByText('1 records included in summary')).toBeVisible();

    expect(api.importRequests).toBe(1);
    expect(api.activities).toHaveLength(1);
    expect(api.metricGenerationRequests).toBe(1);
  });

  await test.step('confirm imported document status', async () => {
    await page.getByRole('link', { name: 'Upload', exact: true }).click();
    const documentRow = page.getByRole('row').filter({
      hasText: 'enmax-electricity.csv',
    });
    await expect(documentRow).toContainText('Imported');
    await expect(documentRow.getByRole('button', { name: 'View Records' })).toBeVisible();
    expect(api.activities).toHaveLength(1);
  });

  await test.step('generate report and export PDF', async () => {
    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByText('2140 kg CO2e')).toBeVisible();
    await expect(page.getByText('4280 kWh')).toBeVisible();
    await expect(page.getByText('Emissions Summary Report')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^carbonlite-ai-emissions-report-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(api.summaryRequests).toBeGreaterThanOrEqual(2);
  });

  expect(api.importRequests, 'document import endpoint should be called once').toBe(1);
  expect(api.activities, 'only one activity record should exist after import').toHaveLength(1);
  failures.assertClean(api.unexpectedRequests);
});
