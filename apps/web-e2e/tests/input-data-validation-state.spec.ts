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

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures',
);

async function uploadAndExtract(page: import('@playwright/test').Page, fixtureName: string) {
  await page.locator('#document-upload-input').setInputFiles(path.join(fixturesDir, fixtureName));
  await expect(page.getByRole('button', { name: 'Extract Data' })).toBeEnabled();
  await page.getByRole('button', { name: 'Extract Data' }).click();
}

test('Input Data validation banner is scoped to the active uploaded file', async ({ page }) => {
  const api = createCarbonLiteApiState();
  const failures = monitorCriticalFailures(page);

  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/input-data');
  await expect(page.getByRole('heading', { name: 'Input Data' })).toBeVisible();

  await uploadAndExtract(page, 'input-validation-a.csv');
  api.releaseExtraction();
  await expect(page.getByText('File: input-validation-a.csv')).toBeVisible();
  await expect(page.getByText('Row 1: Missing Province')).toBeVisible();

  await page.locator('#document-upload-input').setInputFiles(path.join(fixturesDir, 'input-validation-b.csv'));
  await expect(page.getByText(/Please correct the following issues/)).toHaveCount(0);
  await expect(page.getByText('Row 1: Missing Province')).toHaveCount(0);
  await expect(page.getByText('FILE-A-ROW')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Extract Data' })).toBeEnabled();
  await page.getByRole('button', { name: 'Extract Data' }).click();
  await expect(page.getByText('File: input-validation-b.csv')).toBeVisible();
  await expect(page.locator('input[value="FILE-B-ROW"]')).toBeVisible();
  await expect(page.getByText('Row 1: Invalid Amount')).toBeVisible();
  await expect(page.getByText('Row 1: Missing Province')).toHaveCount(0);
  await expect(page.getByText('FILE-A-ROW')).toHaveCount(0);

  await page.locator('#document-upload-input').setInputFiles(path.join(fixturesDir, 'input-validation-clean.csv'));
  await expect(page.getByText(/Please correct the following issues/)).toHaveCount(0);
  await expect(page.getByText('Row 1: Invalid Amount')).toHaveCount(0);
  await expect(page.getByText('FILE-B-ROW')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Extract Data' })).toBeEnabled();
  await page.getByRole('button', { name: 'Extract Data' }).click();
  await expect(page.getByText('File: input-validation-clean.csv')).toBeVisible();
  await expect(page.locator('input[value="FILE-C-ROW"]')).toBeVisible();
  await expect(page.getByText(/Please correct the following issues/)).toHaveCount(0);
  await expect(page.getByText('Row 1: Invalid Amount')).toHaveCount(0);
  await expect(page.getByText('Row 1: Missing Province')).toHaveCount(0);

  expect(api.extractionRequests).toBe(3);
  failures.assertClean(api.unexpectedRequests);
});
