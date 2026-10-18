import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import {
  createCarbonLiteApiState,
  installCarbonLiteApiMock,
  seedEnmaxMissingCostReport,
  seedFailedDocument,
  seedImportedDocument,
  seedMissingFileDocument,
} from '../support/mock-api';
import {
  authenticateTestUser,
  monitorCriticalFailures,
} from '../support/smoke-test';

function countPdfPages(buffer: Buffer) {
  const text = buffer.toString('latin1');
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? 0;
}

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
    name: 'Draft Records Review',
  })).toBeVisible();
  await expect(page.getByText('Detected Source Items Not Used in Emissions Calculation')).toBeVisible();
  await expect(page.getByText('Waste & Recycling')).toBeVisible();
  await expect(page.getByText('Service Days: 30')).toBeVisible();
  await expect(page.getByText('Source Cost: $19.54')).toBeVisible();
  await expect(page.getByText('Blue Cart: $2.17; Black Cart: $7.39; Green Cart: $9.98')).toBeVisible();
  await expect(page.getByText('Reason: No supported waste quantity was provided.')).toBeVisible();
  await expect(documentRow).toContainText('Needs Review');
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

test('@smoke missing uploaded files explain re-upload and keep delete available', async ({ page }) => {
  const api = createCarbonLiteApiState();
  seedMissingFileDocument(api);
  const failures = monitorCriticalFailures(page);
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/upload');
  await expect(page.getByText(
    'This file is no longer available on the server. This may happen after system updates or temporary storage cleanup. Please upload the file again if you need to extract or review it.',
  )).toBeVisible();

  const documentRow = page.getByRole('row').filter({
    hasText: 'old-enmax-electricity.csv',
  });
  await expect(documentRow).toContainText('Re-upload Required');
  await expect(documentRow).toContainText('SPREADSHEET');
  await expect(documentRow).toContainText('113');

  await expect(documentRow.getByRole('button', {
    name: 'Re-upload Required',
  })).toBeDisabled();
  await expect(documentRow.getByRole('button', {
    name: /extract/i,
  })).toHaveCount(0);
  await expect(documentRow.getByRole('button', {
    name: /preview data/i,
  })).toHaveCount(0);

  await documentRow.locator(
    'span[title="The original uploaded file is no longer available. Please upload it again."]',
  ).click();
  await expect(page.getByText(
    'This file is no longer available. Please upload it again.',
  )).toBeVisible();

  await documentRow.getByRole('button', {
    name: 'More actions for old-enmax-electricity.csv',
  }).click();
  await expect(documentRow.getByRole('button', { name: 'Delete' })).toBeVisible();
  failures.assertClean(api.unexpectedRequests);
});

test('@smoke reports show first-report empty state for an empty organization', async ({ page }) => {
  const api = createCarbonLiteApiState();
  const failures = monitorCriticalFailures(page);
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/reports');
  await expect(page.getByRole('heading', {
    name: 'No reporting data found.',
  })).toBeVisible();
  await expect(page.getByText(
    'Upload and import activity data to generate your first emissions report.',
  )).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go to Upload' })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Generate Report' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveAttribute(
    'title',
    'Generate a report before exporting.',
  );
  await expect(page.getByText('Emissions Summary Report')).toHaveCount(0);
  await expect(page.getByText('Scope Breakdown')).toHaveCount(0);

  await page.getByRole('button', { name: 'Go to Upload' }).click();
  await expect(page).toHaveURL(/\/upload$/);
  failures.assertClean(api.unexpectedRequests);
});

test('@smoke reports show selected-period empty state separately from no data', async ({ page }) => {
  const api = createCarbonLiteApiState();
  seedImportedDocument(api);
  const failures = monitorCriticalFailures(page);
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/reports');
  await expect(page.getByText('Emissions Summary Report')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled();

  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.nth(0).fill('2025-01-01');
  await dateInputs.nth(1).fill('2025-12-31');
  await dateInputs.nth(1).blur();

  await expect(page.getByText('No records found for the selected period.')).toBeVisible();
  await expect(page.getByRole('heading', {
    name: 'No reporting data found.',
  })).toHaveCount(0);
  await expect(page.getByText('Emissions Summary Report')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Generate Report' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
  failures.assertClean(api.unexpectedRequests);
});

test('@smoke reports generate content and enable exports from activity records', async ({ page }) => {
  const api = createCarbonLiteApiState();
  seedImportedDocument(api);
  const failures = monitorCriticalFailures(page);
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/reports');
  await page.getByRole('button', { name: 'Generate Report' }).click();

  await expect(page.getByText('Emissions Summary Report')).toBeVisible();
  await expect(page.getByText('Calculation Traceability')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  failures.assertClean(api.unexpectedRequests);
});

test('@smoke ENMAX report CSV keeps missing Cost CAD cells blank', async ({ page }) => {
  const api = createCarbonLiteApiState();
  seedEnmaxMissingCostReport(api);
  const failures = monitorCriticalFailures(page);
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/reports');
  await page.getByRole('button', { name: 'Generate Report' }).click();

  await expect(page.getByText('Pilot Emissions Data Readiness Report')).toBeVisible();
  await expect(page.getByText('0 of 3 imported activity records include optional cost data')).toBeVisible();

  const csvDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export reports$/i }).click();
  await page.getByRole('menuitem', { name: /Data Export \(CSV\)/i }).click();
  const csvDownload = await csvDownloadPromise;
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await fs.readFile(csvPath ?? '', 'utf8');

  expect(csv).toContain('\n1,Electricity,2025-08-01,358,358 kWh,kWh,,');
  expect(csv).toContain('\n2,Natural Gas,2025-08-01,3,3 GJ,GJ,,');
  expect(csv).toContain('\n3,Water,2025-08-01,6,6 m3,m3,,');

  const executiveDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export reports$/i }).click();
  await page.getByRole('menuitem', { name: /Executive Summary \(PDF\)/i }).click();
  const executivePath = await (await executiveDownloadPromise).path();
  expect(executivePath).toBeTruthy();
  expect(countPdfPages(await fs.readFile(executivePath ?? ''))).toBe(2);

  const technicalDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export reports$/i }).click();
  await page.getByRole('menuitem', { name: /Technical Review Package \(PDF\)/i }).click();
  const technicalPath = await (await technicalDownloadPromise).path();
  expect(technicalPath).toBeTruthy();
  expect(countPdfPages(await fs.readFile(technicalPath ?? ''))).toBe(9);
  await expect(page.getByRole('button', { name: /^Export reports$/i })).toBeEnabled();
  await expect(page).toHaveURL(/\/reports$/);
  failures.assertClean(api.unexpectedRequests);
});

test('@smoke data records Columns menu opens and toggles columns', async ({ page }) => {
  const api = createCarbonLiteApiState();
  seedImportedDocument(api);
  const failures = monitorCriticalFailures(page);
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);

  await page.goto('/activity-records');
  await expect(page.getByRole('heading', { name: 'Activity Records' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Source Reference' })).toBeVisible();

  await expect(page.getByText('Scroll horizontally to view all columns →')).toBeVisible();
  await expect(page.getByRole('button', { name: /Scroll horizontally/i })).toHaveCount(0);

  const moreColumnsButton = page.getByRole('button', { name: 'Columns' });
  await expect(moreColumnsButton).toHaveAttribute('aria-expanded', 'false');

  await moreColumnsButton.click();

  await expect(moreColumnsButton).toHaveAttribute('aria-expanded', 'true');
  const menu = page.getByRole('menu', { name: 'Activity table columns' });
  await expect(menu).toBeVisible();

  await menu.getByRole('checkbox', { name: 'Source Reference' }).uncheck();

  await expect(page.getByRole('columnheader', { name: 'Source Reference' })).toHaveCount(0);
  await expect(menu).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(moreColumnsButton).toHaveAttribute('aria-expanded', 'false');

  const recordRow = page.getByRole('row').filter({ hasText: 'ELECTRICITY' });
  const rowActionButton = recordRow.getByRole('button', {
    name: /More actions for/i,
  });
  await rowActionButton.click();
  await expect(rowActionButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(rowActionButton).toHaveAttribute('aria-expanded', 'false');
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
