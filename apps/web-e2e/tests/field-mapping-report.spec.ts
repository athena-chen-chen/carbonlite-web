import { expect, test } from '@playwright/test';
import XLSX from 'xlsx';
import fs from 'node:fs/promises';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { createCarbonLiteApiState, installCarbonLiteApiMock } from '../support/mock-api';
import { authenticateTestUser } from '../support/smoke-test';

const fixture = path.resolve('apps/web-e2e/fixtures/carbonlite_field_mapping_test.xlsx');
const factors = [0.53, 49.44, 2.31, 15, 0.115];
const types = ['ELECTRICITY', 'NATURAL_GAS', 'GASOLINE', 'HOTEL', 'AIR_TRAVEL'];
const scopes = ['SCOPE_2', 'SCOPE_1', 'SCOPE_1', 'SCOPE_3', 'SCOPE_3'];

test('field mapping import retains facilities and missing costs in reports and exports', async ({ page }, testInfo) => {
  const api = createCarbonLiteApiState();
  const workbook = XLSX.readFile(fixture);
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets.Operations_2026);
  const field = (value: unknown) => ({ value, confidence: 'high' });
  api.extractionResponseOverride = {
    status: 'REVIEW_REQUIRED', sourceRowCount: 5, extractedRowCount: 5, possibleMissingRows: false,
    parsedActivities: rows.map((row, index) => ({
      activityType: field(types[index]), recordDate: field(row['Service Date']), quantity: field(row.Consumption), unit: field(row.UOM),
      jurisdictionCountry: field('Canada'), jurisdictionRegion: field(row.Region), facilityName: field(row['Location Name']),
      sourceReference: field(row['Original Document']), notes: field(null), sourceSheetName: 'Operations_2026', sourceRow: index + 2, costCad: null,
    })),
  };
  api.conversionFactors = rows.map((row, index) => ({
    ...api.conversionFactors[0], id: `field-factor-${index}`, activityType: types[index],
    name: `${types[index]} - Canada - 2026`, jurisdiction: index === 1 ? 'Canada' : `${row.Region === 'AB' ? 'Alberta' : row.Region}, Canada`,
    unit: row.UOM, factorValue: factors[index], defaultScope: scopes[index],
    sourceAuthority: index === 1 ? 'Environment and Climate Change Canada' : 'Verified fixture',
  }));
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, api);
  await page.goto('/reports');
  await page.getByRole('button', { name: /Expand Audit Trail/ }).click();
  await expect(page.getByText('No workflow audit events recorded yet.')).toBeVisible();
  await page.getByRole('link', { name: 'Input Data', exact: true }).click();
  await page.locator('#document-upload-input').setInputFiles(fixture);
  await page.getByRole('button', { name: 'Extract Data' }).click();
  api.releaseExtraction();
  await expect(page.getByRole('heading', { name: 'Draft Records Review' })).toBeVisible();
  await expect(page.getByText('Extracted rows: 5')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Import' }).click();
  await expect(page).toHaveURL(/\/data-records$/);
  expect(api.activities).toHaveLength(5);
  expect(api.activities.map((row) => [row.facilityId, row.facilityName, row.costCad])).toEqual(rows.map((row) => [null, row['Location Name'], null]));

  api.activities.forEach((row, index) => expect(Number(row.calculatedEmissionsKgCO2e)).toBeCloseTo([662.5, 420.24, 808.5, 45, 492.2][index], 8));
  expect(api.activities[1].matchedFactorSourceAuthority).toBe('Environment and Climate Change Canada');
  expect(api.activities[1].factorSelectionReason).toBe('GENERIC_JURISDICTION_FALLBACK');

  const details = api.activities.map((row, index) => ({
    ...row, activityDataId: row.id, activityQuantity: row.quantity, activityUnit: row.unit,
    reportingYear: 2026, jurisdiction: `${row.jurisdictionRegion}, Canada`, factorValue: factors[index], factorInputUnit: row.unit,
    factorResultUnit: `kgCO2e/${row.unit}`, factorDefaultScope: scopes[index], status: 'CALCULATED',
    calculatedEmissionsKgCO2e: row.calculatedEmissionsKgCO2e,
    factorId: `factor-${index}`, factorName: `${types[index]} factor`, factorType: 'System', factorVerified: true,
    factorJurisdiction: index === 1 ? 'Canada (Generic)' : row.jurisdictionRegion,
    sourceAuthority: index === 1 ? 'Environment and Climate Change Canada' : 'Verified fixture',
    factorSelectionReason: index === 1 ? 'GENERIC_JURISDICTION_FALLBACK' : 'VERIFIED_SYSTEM',
  }));
  api.calculationSummaryOverride = {
    activities: api.activities, calculationDetails: details, totalEstimatedEmissionsKgCO2e: 2428.44,
    totalRecordsFound: 5, recordsInScope: 5, recordsCalculated: 5, recordsIncluded: 5, processedRecords: 5,
    skippedRecords: 0, missingFactorCount: 0, missingFactorRecords: 0, invalidRecordCount: 0,
    totalsByMetric: [{ metricType: 'CARBON_EMISSION', totalValue: '2428.44', unit: 'kgCO2e', count: 5 }],
    totalsByFacility: [], missingFactors: [],
    matchedActivityEmissions: details.map((detail) => ({ ...detail, quantity: detail.activityQuantity, unit: detail.activityUnit, estimatedEmissionsKgCO2e: detail.calculatedEmissionsKgCO2e })),
    conversionFactorsUsed: api.conversionFactors.map((factor) => ({ ...factor, factorId: factor.id, factorName: factor.name, inputUnit: factor.unit, reportingYear: 2026 })),
  };
  await page.getByRole('link', { name: 'Calculation Review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Calculation Review' })).toBeVisible();
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await page.getByRole('button', { name: 'Generate Report' }).click();
  await page.getByRole('button', { name: /Expand Audit Trail/ }).click();
  const audit = page.getByRole('region', { name: 'Audit Trail' });
  await expect(audit.getByText('Import confirmed', { exact: true })).toHaveCount(1);
  await expect(audit).toContainText('5 activity records imported from carbonlite_field_mapping_test.xlsx');
  await audit.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(audit.getByText('Import confirmed', { exact: true })).toHaveCount(1);
  expect(api.workflowEvents.filter((event) => event.eventName === 'ACTIVITY_RECORD_IMPORTED')).toHaveLength(1);
  await expect(page.getByText('2,428.44 kg CO₂e').first()).toBeVisible();
  await expect(page.getByText('0 of 5 imported activity records include optional cost data')).toBeVisible();
  await expect(page.getByText('5 of 5 imported activity records include optional cost data')).toHaveCount(0);
  await expect(page.getByText(/4 site\/facility groups/)).toBeVisible();
  const sourceReview = page.getByRole('region', { name: 'Source Dataset Review Status' });
  await expect(sourceReview).toContainText('5 of 5');
  await expect(sourceReview).toContainText('Reviewable Source Rows5');
  await expect(sourceReview).toContainText('Source Rows Still Requiring Review0');
  await expect(sourceReview).not.toContainText('Limited');
  const optional = page.getByText('Optional Data Completeness', { exact: true }).locator('..');
  await expect(optional).toContainText('0%');
  // Facility section may be collapsed initially.
  const toggle = page.getByRole('button', { name: /Emissions by Site \/ Facility/ });
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
  for (const name of new Set(rows.map((row) => row['Location Name']))) await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('1 site/facility group', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Emissions by Site / Facility' }).getByRole('cell', { name: 'Unassigned', exact: true })).toHaveCount(0);
  for (const total of ['1,082.74', '808.50', '492.20', '45 kg']) await expect(page.getByRole('region', { name: 'Emissions by Site / Facility' })).toContainText(total);
  for (const total of ['1,228.74', '662.50', '537.20']) await expect(page.getByText(new RegExp(total.replace('.', '\\.') + '.*kg')).first()).toBeVisible();

  const csvPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export reports$/i }).click();
  await page.getByRole('menuitem', { name: /Data Export \(CSV\)/ }).click();
  const csv = await fs.readFile((await (await csvPromise).path())!, 'utf8');
  const csvRows = XLSX.utils.sheet_to_json<Record<string, any>>(XLSX.read(csv, { type: 'string', raw: true }).Sheets.Sheet1, { defval: '' });
  expect(csvRows.map((row) => row['Cost CAD'])).toEqual(['', '', '', '', '']);
  for (const name of new Set(rows.map((row) => row['Location Name']))) expect(csv).toContain(name);
  const pdfPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export reports$/i }).click();
  await page.getByRole('menuitem', { name: /Technical Review Package \(PDF\)/ }).click();
  const pdf = await fs.readFile((await (await pdfPromise).path())!);
  const encoded = pdf.toString('latin1');
  expect(encoded).toContain('%PDF');
  const streams = [...encoded.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map((match) => {
    try { return inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1'); }
    catch { return match[1]; }
  });
  // jsPDF wraps table cells across multiple Tj text operators.
  const pdfText = streams.flatMap((stream) => [...stream.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((match) => match[1])).join(' ');
  expect(pdfText).toContain('Optional Data Completeness');
  expect(pdfText).toContain('0%');
  expect(pdfText).toContain('0 of 5 imported activity records include optional cost data');
  for (const name of new Set(rows.map((row) => row['Location Name']))) expect(pdfText).toContain(name);
  expect(pdfText).toContain('1,082.74');
  await fs.writeFile(testInfo.outputPath('technical-review.pdf'), pdf);
  await audit.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(audit.getByText('PDF exported', { exact: true })).toHaveCount(1);
  await expect(audit.getByText('Import confirmed', { exact: true })).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: /Expand Audit Trail/ }).click();
  await expect(page.getByRole('region', { name: 'Audit Trail' }).getByText('Import confirmed', { exact: true })).toHaveCount(1);
});
