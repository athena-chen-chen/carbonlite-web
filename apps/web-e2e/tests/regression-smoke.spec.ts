import { expect, test } from '@playwright/test';
import {
  createCarbonLiteApiState,
  installCarbonLiteApiMock,
  seedFailedDocument,
  seedImportedDocument,
} from '../support/mock-api';
import {
  authenticateTestUser,
  monitorCriticalFailures,
} from '../support/smoke-test';

test('@smoke retry extraction restores a failed document to review', async ({ page }) => {
  const api = createCarbonLiteApiState();
  seedFailedDocument(api);
  const failures = monitorCriticalFailures(page);
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/upload');
  const documentRow = page.getByRole('row').filter({
    hasText: 'enmax-electricity.csv',
  });
  await expect(documentRow).toContainText('Needs Attention');

  await documentRow.getByRole('button', { name: 'Retry Extract' }).click();
  await expect.poll(() => api.extractionRequests).toBe(1);
  await expect(
    documentRow.getByRole('button', { name: 'Extracting...' }),
  ).toBeDisabled();
  api.releaseExtraction();

  await expect(page.getByRole('heading', {
    name: 'Review & Edit Data Before Import',
  })).toBeVisible();
  await expect(documentRow).toContainText('Ready for Review');
  failures.assertClean(api.unexpectedRequests);
});

test('@smoke deleting a document removes its related imported records', async ({ page }) => {
  const api = createCarbonLiteApiState();
  seedImportedDocument(api);
  const failures = monitorCriticalFailures(page);
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/upload');
  const documentRow = page.getByRole('row').filter({
    hasText: 'enmax-electricity.csv',
  });
  await documentRow.getByRole('button', {
    name: 'More actions for enmax-electricity.csv',
  }).click();
  await documentRow.getByRole('button', { name: 'Delete' }).click();

  const dialog = page.getByRole('dialog', {
    name: 'Delete this document and its imported activity records?',
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText(
    'Document deleted. 1 related activity record removed.',
  )).toBeVisible();
  await expect(documentRow).toHaveCount(0);
  expect(api.documentDeleteRequests).toBe(1);
  expect(api.documents).toHaveLength(0);
  expect(api.activities).toHaveLength(0);
  failures.assertClean(api.unexpectedRequests);
});

test('@smoke conversion factors load, create, and delete', async ({ page }) => {
  const api = createCarbonLiteApiState();
  const failures = monitorCriticalFailures(page);
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/conversion-factors');
  await expect(page.getByRole('heading', {
    name: 'Conversion Factor Library',
  })).toBeVisible();
  const systemRow = page.getByRole('row').filter({
    hasText: 'Electricity - Alberta - 2026',
  });
  await expect(systemRow).toBeVisible();
  await expect(systemRow.getByText('Verified', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '+ Add Custom Factor' }).click();
  const factorForm = page.locator('form').filter({
    has: page.getByRole('heading', { name: 'Add Custom Factor' }),
  });
  await factorForm.getByLabel('Name', { exact: true }).fill('Custom diesel regression factor');
  await factorForm.locator('select').nth(1).selectOption('DIESEL');
  await factorForm.getByLabel('Input Unit', { exact: true }).fill('L');
  await factorForm.getByLabel('Jurisdiction / Region', { exact: true }).fill('Alberta, Canada');
  await factorForm.getByLabel('Factor Value', { exact: true }).fill('2.68');
  await factorForm.getByLabel('Source Authority', { exact: true }).fill('Regression fixture');
  await factorForm.getByLabel('Source Year', { exact: true }).fill('2026');
  await factorForm.getByRole('button', {
    name: 'Create Conversion Factor',
  }).click();

  await expect(page.getByText('Conversion factor created successfully.')).toBeVisible();
  const customRow = page.getByRole('row').filter({
    hasText: 'Custom diesel regression factor',
  });
  await expect(customRow).toContainText('Custom');
  expect(api.factorCreateRequests).toBe(1);

  page.once('dialog', (dialog) => dialog.accept());
  await customRow.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Conversion factor deleted successfully.')).toBeVisible();
  await expect(customRow).toHaveCount(0);
  expect(api.factorDeleteRequests).toBe(1);
  failures.assertClean(api.unexpectedRequests);
});
