import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { authenticateTestUser } from '../support/smoke-test';
import { createCarbonLiteApiState, installCarbonLiteApiMock, seedImportedDocument } from '../support/mock-api';

test('partially imported files stay Needs Review while their imported subset is reportable', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const api = createCarbonLiteApiState();
  seedImportedDocument(api);
  const base = api.documents[0];
  const filename = 'carbonlite_needs_review_test.xlsx';
  let corrected = false;
  const partial = () => [
    { id: 'electricity', activityType: 'ELECTRICITY', facilityName: 'Calgary HQ', quantity: 980, unit: 'kWh', emissions: 519.4, scope: 'SCOPE_2' },
    { id: 'hotel', activityType: 'HOTEL', facilityName: 'Toronto Client Visit', quantity: 4, unit: 'nights', emissions: 60, scope: 'SCOPE_3' },
    { id: 'water', activityType: 'WATER', facilityName: 'Calgary HQ', quantity: 18, unit: 'm3', emissions: null, scope: 'TRACKED_METRIC' },
    ...(corrected ? [{ id: 'corrected', activityType: 'ELECTRICITY', quantity: 100, unit: 'kWh', emissions: 53, scope: 'SCOPE_2' }] : []),
  ];
  const field = [
    { id: 'field-electricity', activityType: 'ELECTRICITY', facilityName: 'Calgary HQ', quantity: 1250, unit: 'kWh', emissions: 662.5, scope: 'SCOPE_2' },
    { id: 'field-gas', activityType: 'NATURAL_GAS', facilityName: 'Calgary HQ', quantity: 8.5, unit: 'GJ', emissions: 420.24, scope: 'SCOPE_1' },
    { id: 'field-gasoline', activityType: 'GASOLINE', facilityName: 'Vancouver Fleet', quantity: 350, unit: 'L', emissions: 808.5, scope: 'SCOPE_1' },
    { id: 'field-hotel', activityType: 'HOTEL', facilityName: 'Toronto Sales Trip', quantity: 3, unit: 'nights', emissions: 45, scope: 'SCOPE_3' },
    { id: 'field-air', activityType: 'AIR_TRAVEL', facilityName: 'Corporate Travel', quantity: 4280, unit: 'km', emissions: 492.2, scope: 'SCOPE_3' },
  ];
  const requests: string[][] = [];
  const writes: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && /document-extraction\/confirm|activity-data$|metrics\/calculate/.test(new URL(request.url()).pathname)) writes.push(request.url());
  });
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);
  await page.route('**/api/documents', (route) => route.fulfill({ json: {
    items: [
      { ...base, id: 'partial', fileName: filename, status: 'REVIEW_REQUIRED', importedRecordCount: partial().length, extractedRowCount: 9, sourceRowCount: 9 },
      { ...base, id: 'empty', fileName: 'unconfirmed.xlsx', status: 'REVIEW_REQUIRED', importedRecordCount: 0 },
      { ...base, id: 'field', fileName: 'fully-imported.xlsx', status: 'IMPORTED', importedRecordCount: field.length },
    ], page: 1, pageSize: 20, total: 3, totalPages: 1,
  } }));
  await page.route('**/api/spreadsheet-import/review-rows?*', (route) => {
    const ids = new URL(route.request().url()).searchParams.get('sourceDocumentIds')?.split(',') ?? [];
    return route.fulfill({ json: { items: ids.includes('partial') ? Array.from({ length: 9 }, (_, index) => ({
      id: `review-${index}`, sourceDocumentId: 'partial', sourceFileName: filename,
      sourceRow: index + 2, sourceSheetName: 'Operations', activityType: 'ELECTRICITY',
      quantity: index < partial().length ? 1 : 999999, unit: 'kWh',
      status: index < partial().length ? (index === 2 ? 'TRACKED_ONLY' : 'READY') : 'NEEDS_REVIEW',
      issues: index < partial().length ? [] : [{ code: 'MISSING_FIELD', message: 'Review required.' }],
    })) : [] } });
  });
  await page.route(/\/api\/metrics\/(calculation-summary|summary)(\?.*)?$/, (route) => {
    const ids = new URL(route.request().url()).searchParams.get('selectedDocumentIds')?.split(',') ?? [];
    requests.push(ids);
    const scoped = ids.length > 0;
    const records = [
      ...(!scoped || ids.includes('partial') ? partial().map((record) => ({ ...record, sourceDocumentId: 'partial', sourceFileName: filename })) : []),
      ...(!scoped || ids.includes('field') ? field.map((record) => ({ ...record, sourceDocumentId: 'field', sourceFileName: 'fully-imported.xlsx' })) : []),
      ...(!scoped ? [{ id: 'manual-gasoline', activityType: 'GASOLINE', quantity: 50, unit: 'L', emissions: 115.5, scope: 'SCOPE_1', facilityName: 'Manual Fleet', sourceDocumentId: null, sourceFileName: null }] : []),
    ];
    const activities = records.map((record) => ({ ...record, recordDate: '2026-03-01', sourceType: record.id === 'manual-gasoline' ? 'MANUAL' : 'EXCEL', jurisdictionRegion: 'Alberta', jurisdictionCountry: 'Canada' }));
    const details = records.map((record) => ({
      ...record, activityDataId: record.id, activityQuantity: record.quantity, activityUnit: record.unit,
      recordDate: '2026-03-01', sourceType: record.id === 'manual-gasoline' ? 'MANUAL' : 'EXCEL', sourceRow: 2, jurisdiction: 'Alberta, Canada',
      status: record.emissions === null ? 'TRACKED_ONLY' : 'CALCULATED',
      calculationStatus: record.emissions === null ? 'TRACKED_ONLY' : 'CALCULATED',
      matchingStatus: record.emissions === null ? 'TRACKED_ONLY' : 'MATCHED',
      calculatedEmissionsKgCO2e: record.emissions, calculatedEmission: record.emissions,
      factorId: `factor-${record.id}`, factorName: 'Reviewed fixture factor', factorValue: record.emissions === null ? null : record.emissions / record.quantity,
      factorInputUnit: record.unit, factorDefaultScope: record.scope, sourceAuthority: 'Fixture', factorVerified: true,
    }));
    const calculated = records.filter((record) => record.emissions !== null);
    return route.fulfill({ json: {
      activities, calculationDetails: details, totalEstimatedEmissionsKgCO2e: calculated.reduce((sum, record) => sum + (record.emissions ?? 0), 0),
      recordsCalculated: calculated.length, recordsInScope: records.length, totalRecordsFound: records.length,
      processedRecords: calculated.length, skippedRecords: 0, missingFactorCount: 0, missingFactors: [], conversionFactorsUsed: [],
    } });
  });

  async function openPartialReport(imported: number, unresolved: number) {
    await page.goto('/input-data');
    const row = page.getByRole('row').filter({ hasText: filename });
    await expect(row.getByText('Needs Review', { exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Review Rows', exact: true })).toBeVisible();
    await expect(row.getByRole('checkbox')).toBeEnabled();
    await expect(page.getByRole('checkbox', { name: 'Select document unconfirmed.xlsx' })).toBeDisabled();
    await row.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'View Calculation Results', exact: true }).click();
    await expect(page).toHaveURL(/\/metrics-summary$/);
    await expect(page.getByText('Step 4 of 5 · Calculation Results')).toBeVisible();
    const calculationContext = page.getByRole('region', { name: 'Document review scope' });
    await expect(calculationContext).toContainText(`Imported records: ${imported} · Unresolved source rows: ${unresolved}`);
    await page.getByRole('link', { name: 'Generate Report', exact: true }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByText('Step 5 of 5 · Generate Report')).toBeVisible();
    const context = page.getByRole('region', { name: 'Document review scope' });
    await expect(context).toContainText(`Imported records: ${imported} · Unresolved source rows: ${unresolved}`);
    await expect(context).toContainText(filename);
    return context;
  }
  const context = await openPartialReport(3, 6);
  await expect(page.locator('body')).toContainText('579.40');
  expect(requests.at(-1)).toEqual(['partial']);
  await expect(page.getByRole('button', { name: 'Export reports', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Export reports', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Technical Emissions Report (PDF)', exact: true }).click();
  const pdf = await fs.readFile((await (await download).path())!);
  expect(pdf.toString('latin1')).toContain('579.40');
  await context.getByRole('link', { name: 'View Calculation Results' }).click();
  await expect(page).toHaveURL(/\/metrics-summary$/);
  await expect(page.getByRole('region', { name: 'Document review scope' })).toContainText('Imported records: 3 · Unresolved source rows: 6');
  await expect(page.locator('body')).toContainText('579.40');
  await page.getByRole('region', { name: 'Document review scope' }).getByRole('link', { name: 'Generate Report' }).click();
  await expect(page.getByRole('region', { name: 'Document review scope' })).toContainText('Imported records: 3 · Unresolved source rows: 6');

  await page.goto('/input-data');
  await page.getByRole('checkbox', { name: 'Select document fully-imported.xlsx' }).check();
  await page.getByRole('button', { name: 'View Calculation Results', exact: true }).click();
  await expect(page).toHaveURL(/\/metrics-summary$/);
  await expect(page.getByRole('region', { name: 'Document review scope' })).toContainText('Imported records: 5');
  await page.getByRole('link', { name: 'Generate Report', exact: true }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.locator('body')).toContainText('2,428.44');
  expect(requests.at(-1)).toEqual(['field']);

  // Golden two-workbook scope, excluding a separate manual Gasoline 50 L record.
  await page.goto('/input-data');
  await expect(page.getByRole('button', { name: 'View Calculation Results', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Generate Report', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Select visible documents' }).check();
  await page.getByRole('button', { name: 'View Calculation Results', exact: true }).click();
  await expect(page).toHaveURL(/\/metrics-summary$/);
  await expect(page.getByRole('region', { name: 'Document review scope' })).toContainText('Imported records: 8 · Unresolved source rows: 6');
  await expect(page.locator('body')).toContainText('3,007.84');
  await expect(page.locator('body')).not.toContainText('Manual Fleet');
  await page.getByRole('button', { name: /Site \/ Facility Breakdown/ }).click();
  for (const [name, value] of [['Calgary HQ', '1,602.14'], ['Vancouver Fleet', '808.50'], ['Corporate Travel', '492.20'], ['Toronto Client Visit', '60'], ['Toronto Sales Trip', '45']]) {
    await expect(page.getByRole('region', { name: 'Site / Facility Breakdown' }).getByRole('row').filter({ hasText: name })).toContainText(value);
  }
  await expect(page.getByText('7 Calculated Emissions Records', { exact: true })).toBeVisible();
  await expect(page.getByText('1 Tracked Metric', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('selected-calculation-results.png'), fullPage: true });
  await page.getByRole('link', { name: 'Generate Report', exact: true }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.locator('body')).toContainText('3,007.84');
  for (const value of ['1,228.74', '1,181.90', '597.20']) await expect(page.locator('body')).toContainText(value);
  expect([...(requests.at(-1) ?? [])].sort()).toEqual(['field', 'partial']);
  await page.screenshot({ path: testInfo.outputPath('selected-reports.png'), fullPage: true });
  const combinedPdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export reports', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Technical Emissions Report (PDF)', exact: true }).click();
  const combinedPdf = await fs.readFile((await (await combinedPdfDownload).path())!);
  expect(combinedPdf.toString('latin1')).toContain('3,007.84');

  // Direct main-navigation entry retains workspace scope, including Manual Gasoline.
  await page.goto('/metrics-summary');
  await expect(page.getByRole('region', { name: 'Document review scope' })).toHaveCount(0);
  await expect(page.locator('body')).toContainText('3,123.34');
  await page.getByRole('link', { name: 'Generate Report', exact: true }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole('region', { name: 'Document review scope' })).toHaveCount(0);
  await expect(page.locator('body')).toContainText('3,123.34');

  // Simulate the next authoritative read after a separate confirmation. This test
  // verifies refreshed scope; it does not implement or mock a new confirm policy.
  corrected = true;
  await openPartialReport(4, 5);
  await expect(page.locator('body')).toContainText('632.40');
  await openPartialReport(4, 5);
  await expect(page.locator('body')).toContainText('632.40');

  await page.goto('/input-data');
  await page.getByRole('checkbox', { name: 'Select visible documents' }).check();
  await expect(page.getByRole('checkbox', { name: 'Select document unconfirmed.xlsx' })).not.toBeChecked();
  await page.getByRole('button', { name: 'View Calculation Results', exact: true }).click();
  await expect(page).toHaveURL(/\/metrics-summary$/);
  await expect(page.getByRole('region', { name: 'Document review scope' })).toContainText('Imported records: 9 · Unresolved source rows: 5');
  await page.getByRole('link', { name: 'Generate Report', exact: true }).click();
  expect([...(requests.at(-1) ?? [])].sort()).toEqual(['field', 'partial']);
  await expect(page.locator('body')).toContainText('3,060.84');
  expect(writes).toEqual([]);
});
