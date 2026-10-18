import { expect, test } from '@playwright/test';
import {
  createCarbonLiteApiState,
  installCarbonLiteApiMock,
} from '../support/mock-api';
import {
  authenticateTestUser,
  monitorCriticalFailures,
} from '../support/smoke-test';

const reviewUrlPattern = /\/input-data\?(?=.*documentId=document-1)(?=.*view=review)/;

test('@smoke restores active Input Review after Confirm Import navigation', async ({ page }) => {
  const api = createCarbonLiteApiState();
  const failures = monitorCriticalFailures(page);

  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/input-data');
  await expect(page.getByRole('heading', { name: 'Input Data' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Draft Records Review' })).toHaveCount(0);

  await page.locator('#document-upload-input').setInputFiles({
    name: 'enmax-electricity.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% CarbonLite workflow continuity fixture\n'),
  });
  await expect(page.getByRole('button', { name: 'Extract Data' })).toBeEnabled();
  await page.getByRole('button', { name: 'Extract Data' }).click();
  api.releaseExtraction();

  await expect(page.getByRole('heading', { name: 'Draft Records Review' })).toBeVisible();
  await expect(page).toHaveURL(reviewUrlPattern);
  await expect(page.getByText('Extracted rows: 1')).toBeVisible();

  await page.getByRole('button', { name: 'Confirm Import' }).click();
  await expect(page).toHaveURL(/\/data-records$/);
  await expect(page.getByRole('heading', { name: 'Data Records' })).toBeVisible();
  await expect(page.getByRole('main').getByText('Import completed successfully')).toBeVisible();
  expect(api.activities).toHaveLength(1);
  expect(api.extractionRequests).toBe(1);

  await page.getByRole('link', { name: 'Input Data' }).click();

  await expect(page).toHaveURL(reviewUrlPattern);
  await expect(page.getByRole('heading', { name: 'Draft Records Review' })).toBeVisible();
  await expect(page.getByText('Extracted rows: 1')).toBeVisible();
  await expect(page.getByText(/Already imported: 1/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm Import' })).toBeDisabled();
  expect(api.extractionRequests).toBe(1);
  expect(api.activities).toHaveLength(1);

  failures.assertClean(api.unexpectedRequests);
});
