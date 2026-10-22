import { expect, test } from '@playwright/test';
import { createCarbonLiteApiState, installCarbonLiteApiMock } from '../support/mock-api';
import { authenticateTestUser } from '../support/smoke-test';

test('manual preview stays compact, discloses factor provenance, and preserves Diesel/Gasoline saves', async ({ page }, testInfo) => {
  const api = createCarbonLiteApiState();
  const base = api.conversionFactors[0];
  api.conversionFactors = [
    { ...base, id: 'diesel-preview', name: 'Diesel combustion', activityType: 'DIESEL', unit: 'L', inputUnit: 'L', factorValue: 2.68, resultUnit: 'kgCO2e', sourceYear: 2025,
      jurisdiction: 'Alberta', jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', defaultScope: 'SCOPE_1', sourceAuthority: 'CarbonLite System Defaults', sourceDocument: 'Diesel methodology',
      verificationStatus: 'INTERNAL_REVIEW_REQUIRED', confidenceLevel: 'MEDIUM', assumptions: 'Validate combustion assumptions before formal reporting.' },
    { ...base, id: 'gasoline-preview', name: 'Gasoline combustion', activityType: 'GASOLINE', unit: 'L', inputUnit: 'L', factorValue: 2.31, resultUnit: 'kgCO2e', sourceYear: 2026,
      jurisdiction: 'Canada', jurisdictionCountry: 'Canada', jurisdictionRegion: 'Canada', defaultScope: 'SCOPE_1' },
  ] as typeof api.conversionFactors;
  const writes: Record<string, unknown>[] = [];
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);
  await page.route('**/api/activity-data', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const input = route.request().postDataJSON();
    writes.push(input);
    await route.fulfill({ status: 201, json: { ...input, id: `manual-${writes.length}` } });
  });
  await page.goto('/input-data');
  await page.getByRole('tab', { name: /^Manual Entry/ }).click();
  await page.getByRole('button', { name: 'Add activity record', exact: true }).click();
  const row = page.getByRole('group', { name: 'Activity row 1', exact: true });
  await row.getByLabel('Date', { exact: true }).fill('2026-10-19');
  await row.getByRole('combobox', { name: 'Activity Type', exact: true }).selectOption('DIESEL');
  await row.getByRole('combobox', { name: 'Province', exact: true }).selectOption('Alberta');
  await row.getByLabel('Quantity', { exact: true }).fill('100');
  const preview = row.getByRole('region', { name: 'Calculation preview', exact: true });
  await expect(preview.getByText('Scope 1', { exact: true })).toBeVisible();
  await expect(preview.getByText('Estimated emissions: 268 kg CO₂e', { exact: true })).toBeVisible();
  await expect(preview.getByText('Diesel combustion', { exact: true })).toBeVisible();
  await expect(preview.getByText('Factor needs validation', { exact: true })).toHaveCount(1);
  await expect(preview.getByText('Ready to save', { exact: true })).toBeVisible();
  await expect(row.getByText('Calculated', { exact: true })).toHaveCount(0);
  await expect(preview.getByText('Included in GHG total', { exact: true })).toBeVisible();
  await expect(preview.getByText('Source: CarbonLite System Defaults', { exact: true })).toBeHidden();
  await expect(preview.getByText('Medium Confidence', { exact: true })).toBeHidden();
  await row.screenshot({ path: testInfo.outputPath('diesel-compact-preview.png') });
  expect(writes).toHaveLength(0);
  await preview.getByText('View calculation details', { exact: true }).click();
  await expect(preview.getByText('Source: CarbonLite System Defaults', { exact: true })).toBeVisible();
  await expect(preview.getByText('Source document: Diesel methodology', { exact: true })).toBeVisible();
  await expect(preview.getByText('Internal Review Required', { exact: true })).toBeVisible();
  await expect(preview.getByText('Medium Confidence', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(0);
  await preview.getByText('View calculation details', { exact: true }).click();
  await row.getByRole('button', { name: 'Save row 1', exact: true }).click();
  await expect(row.getByRole('status', { name: 'Manual entry saved', exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ quantity: 100, unit: 'L', calculatedEmissionsKgCO2e: 268, scope: 'SCOPE_1', calculationStatus: 'CALCULATED', reportTreatment: 'INCLUDED' });

  await row.getByRole('button', { name: 'Add another entry', exact: true }).click();
  await row.getByLabel('Date', { exact: true }).fill('2026-10-19');
  await row.getByRole('combobox', { name: 'Activity Type', exact: true }).selectOption('GASOLINE');
  await row.getByLabel('Quantity', { exact: true }).fill('50');
  await expect(preview.getByText('Estimated emissions: 115.50 kg CO₂e', { exact: true })).toBeVisible();
  await expect(preview.getByText('Scope 1', { exact: true })).toBeVisible();
  await expect(preview.getByText('Calculated', { exact: true })).toHaveCount(0);
  await row.screenshot({ path: testInfo.outputPath('gasoline-compact-preview.png') });
  expect(writes).toHaveLength(1);
  await row.getByRole('button', { name: 'Save row 1', exact: true }).click();
  await expect(row.getByRole('status', { name: 'Manual entry saved', exact: true })).toContainText('115.50 kgCO2e');
  expect(writes).toHaveLength(2);
  expect(writes[1]).toMatchObject({ quantity: 50, unit: 'L', calculatedEmissionsKgCO2e: 115.5, scope: 'SCOPE_1' });
});
