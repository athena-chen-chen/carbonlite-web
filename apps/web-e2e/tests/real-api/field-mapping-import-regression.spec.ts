import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import XLSX from 'xlsx';

const fixtures = path.resolve('apps/web-e2e/fixtures');
const fieldWorkbook = path.join(fixtures, 'carbonlite_field_mapping_original.xlsx');
const needsWorkbook = path.join(fixtures, 'carbonlite_needs_review_test.xlsx');

for (const accountKey of ['Original', 'Renamed'] as const) {
  test(`Task 9B: actual two-workbook import through UI and real persistence (${accountKey})`, async ({ page, request }, testInfo) => {
    test.skip(!process.env.TASK9B_STATE_FILE, 'Requires guarded, fresh synthetic development accounts.');
    test.setTimeout(180_000);
    const state = JSON.parse(fs.readFileSync(process.env.TASK9B_STATE_FILE!, 'utf8'));
    expect(state.environment).toBe('Neon development');
    const base = process.env.E2E_API_BASE_URL!;
    expect(base).toBe(state.apiBase);
    const email = `task9b-${accountKey.toLowerCase()}-${Date.now()}@example.com`;
    const registration = await request.post(base + '/auth/register', { data: { organizationName: `Task 9B ${accountKey} synthetic`, email, password: state.password } });
    expect(registration.status()).toBe(201);
    const registered = await registration.json();
    const account = { email, user: registered.user, token: registered.accessToken ?? registered.token };
    state.accounts[email] = account;
    fs.writeFileSync(process.env.TASK9B_STATE_FILE!, JSON.stringify(state), { mode: 0o600 });
    const headers = { Authorization: `Bearer ${account.token}` };
    const read = async (route: string) => {
      const r = await request.get(base + route, { headers });
      expect(r.status()).toBe(200);
      return r.json();
    };
    expect((await read('/activity-data?pageSize=100')).items).toHaveLength(0);
    const trace: Record<string, unknown> = { accountKey, events: [] };
    const events = trace.events as unknown[];
    page.on('request', r => {
      if (r.method() === 'POST' && /spreadsheet-import|document-extraction\/confirm/.test(r.url())) {
        events.push({ stage: 'request', route: new URL(r.url()).pathname, payload: r.postDataJSON() });
      }
    });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill(account.email);
      await page.locator('input[type="password"]').fill(state.password);
      await page.getByRole('button', { name: 'Log In', exact: true }).click();
      await expect(page).not.toHaveURL(/\/login$/);
      for (const [kind, workbook, filename, count] of [
        ['NeedsReview', needsWorkbook, 'carbonlite_needs_review_test.xlsx', 3],
        ['FieldMapping', fieldWorkbook, accountKey === 'Renamed' ? 'carbonlite_field_mapping_test (1).xlsx' : 'carbonlite_field_mapping_test.xlsx', 5],
      ] as const) {
        const w = XLSX.readFile(workbook);
        events.push({ stage: 'workbook', kind, rows: XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], { defval: null }) });
        await page.goto('/input-data');
        await page.locator('#document-upload-input').setInputFiles({ name: filename, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: fs.readFileSync(workbook) });
        const extracted = page.waitForResponse(r => r.url().endsWith('/document-extraction/extract') && r.request().method() === 'POST', { timeout: 120_000 });
        await page.getByRole('button', { name: 'Extract Data', exact: true }).click();
        const extraction = await extracted;
        expect(extraction.status()).toBe(201);
        const extractedData = await extraction.json();
        events.push({ stage: 'extracted-response', kind, data: extractedData });
        expect.soft(extractedData.sourceRowCount).toBe(kind === 'NeedsReview' ? 9 : 5);
        expect.soft(extractedData.extractedRowCount).toBe(kind === 'NeedsReview' ? 9 : 5);
        if (kind === 'FieldMapping') {
          const gasoline = extractedData.parsedActivities.filter((r: any) => r.activityType?.value === 'GASOLINE');
          expect(gasoline).toHaveLength(1);
          expect(gasoline[0]).toMatchObject({
            rawActivityType: 'Gasoline', rawQuantity: 350, rawRecordDate: 46058,
            activityType: { value: 'GASOLINE' }, quantity: { value: 350 }, unit: { value: 'L' },
            recordDate: { value: '2026-02-05' }, jurisdictionRegion: { value: 'British Columbia' },
            facilityName: { value: 'Vancouver Fleet' }, sourceReference: { value: 'fuel_card_feb.csv' },
            sourceSheetName: 'Operations_2026', sourceRow: 4,
          });
        }
        await expect(page.getByRole('heading', { name: 'Draft Records Review', exact: true })).toBeVisible({ timeout: 120_000 });
        events.push({ stage: 'draft-review', kind, visible: await page.locator('body').innerText() });
        if (kind === 'FieldMapping') {
          const gasolineRow = page.getByRole('row').filter({ has: page.locator('input[title="fuel_card_feb.csv"]') });
          await expect(gasolineRow).toHaveCount(1);
          await expect(gasolineRow.locator('[data-validation-field="activityType"]')).toHaveValue('GASOLINE');
          await expect(gasolineRow.locator('[data-validation-field="unit"]')).toHaveValue('L');
          await expect(gasolineRow.getByRole('checkbox')).toBeEnabled();
          await expect(gasolineRow.getByRole('checkbox')).toBeChecked();
          await expect(gasolineRow).toContainText('Calculated');
          await expect(gasolineRow).toContainText('Included in GHG Total');
          events.push({ stage: 'gasoline-review-eligibility', selected: true, confirmEligible: true,
            activityType: 'GASOLINE', unit: 'L', sourceReference: 'fuel_card_feb.csv' });
        }
        const confirm = page.waitForResponse(r => r.url().endsWith('/document-extraction/confirm') && r.request().method() === 'POST');
        await page.getByRole('button', { name: 'Confirm Import', exact: true }).click();
        const response = await confirm;
        expect(response.status()).toBe(201);
        const data = await response.json();
        if (kind === 'FieldMapping') {
          const payload = response.request().postDataJSON();
          expect(payload.activities).toHaveLength(5);
          const gasoline = payload.activities.filter((r: any) => r.activityType === 'GASOLINE');
          expect(gasoline).toHaveLength(1);
          expect(gasoline[0]).toMatchObject({ quantity: 350, unit: 'L', jurisdictionRegion: 'British Columbia',
            sourceReference: 'fuel_card_feb.csv', sourceRow: 4, sourceSheetName: 'Operations_2026',
            sourceDocumentId: payload.documentId, matchingStatus: 'MATCHED', calculationStatus: 'CALCULATED',
            reportTreatment: 'INCLUDED', matchedFactorValue: 2.31, calculatedEmissionsKgCO2e: 808.5, scope: 'SCOPE_1' });
          expect(gasoline[0].facilityName ?? gasoline[0].facility).toBe('Vancouver Fleet');
          expect(data.createdIds).toHaveLength(5);
          expect(new Set(data.createdIds).size).toBe(5);
          events.push({ stage: 'gasoline-backend-confirmed', payloadRows: 5, createdRows: data.count,
            rowIdentity: `${payload.documentId}::row:${gasoline[0].sourceRow}` });
        }
        events.push({ stage: 'confirmation-response', kind, data });
        expect.soft(data.count, `${kind} newly persisted records`).toBe(count);
        // The UI also awaits metrics generation after confirmation. Finish that
        // user action before independently probing repeat-confirm idempotence.
        await expect(page).toHaveURL(/\/(data-records|activity-records)$/, { timeout: 30_000 });
        const repeat = await request.post(base + '/document-extraction/confirm', { headers, data: response.request().postDataJSON() });
        expect(repeat.status()).toBe(201);
        const repeated = await repeat.json();
        expect(repeated.count).toBe(0);
        events.push({ stage: 'repeat-confirm', kind, imported: repeated.count });
        const stageSummary = await read('/metrics/calculation-summary');
        events.push({ stage: 'persisted', kind, records: (await read('/activity-data?pageSize=100')).items, summary: stageSummary });
        if (kind === 'NeedsReview') {
          expect.soft(stageSummary.totalEstimatedEmissionsKgCO2e, 'Golden A').toBe(579.4);
          expect.soft(stageSummary.recordsCalculated).toBe(2);
          await page.goto('/input-data');
          await page.getByRole('button', { name: 'Review Rows', exact: true }).click();
          await expect(page.getByRole('heading', { name: 'Draft Records Review', exact: true })).toBeVisible();
          await expect(page.getByText('Extracted rows: 9', { exact: true })).toBeVisible();
          await expect(page.getByText(/Requires review: 6 · Already imported: 3/)).toBeVisible();
        }
      }
      const records = (await read('/activity-data?pageSize=100')).items;
      const summary = await read('/metrics/calculation-summary');
      trace.records = records;
      trace.summary = summary;
      trace.factors = await read('/conversion-factors?pageSize=100');
      trace.reviewRows = await read('/spreadsheet-import/review-rows');
      expect.soft(records).toHaveLength(8);
      expect.soft(summary.recordsCalculated).toBe(7);
      expect.soft(summary.calculationDetails.filter((r: any) => r.status === 'TRACKED_ONLY')).toHaveLength(1);
      expect.soft(summary.totalEstimatedEmissionsKgCO2e).toBe(3007.84);
      const fieldRecords = records.filter((r: any) => r.sourceFileName === (accountKey === 'Renamed' ? 'carbonlite_field_mapping_test (1).xlsx' : 'carbonlite_field_mapping_test.xlsx'));
      expect.soft(fieldRecords).toHaveLength(5);
      expect.soft(fieldRecords.map((r: any) => r.activityType).sort()).toEqual(['ELECTRICITY', 'NATURAL_GAS', 'GASOLINE', 'HOTEL', 'AIR_TRAVEL'].sort());
      expect.soft(fieldRecords.reduce((n: number, r: any) => n + Number(r.calculatedEmissionsKgCO2e), 0)).toBeCloseTo(2428.44, 2);
      const scopes: Record<string, number> = {};
      const facilities: Record<string, number> = {};
      for (const r of records) {
        const value = Number(r.calculatedEmissionsKgCO2e ?? 0);
        if (r.calculationStatus !== 'CALCULATED') continue;
        scopes[r.scope] = (scopes[r.scope] ?? 0) + value;
        facilities[r.facilityName] = (facilities[r.facilityName] ?? 0) + value;
      }
      expect.soft(scopes.SCOPE_1).toBeCloseTo(1228.74, 2);
      expect.soft(scopes.SCOPE_2).toBeCloseTo(1181.90, 2);
      expect.soft(scopes.SCOPE_3).toBeCloseTo(597.20, 2);
      expect.soft(Object.keys(facilities)).toHaveLength(5);
      for (const [name, total] of Object.entries({ 'Calgary HQ': 1602.14, 'Vancouver Fleet': 808.50, 'Corporate Travel': 492.20, 'Toronto Client Visit': 60, 'Toronto Sales Trip': 45 })) expect.soft(facilities[name], name).toBeCloseTo(total, 2);
      const fieldScopes: Record<string, number> = {};
      const fieldFacilities: Record<string, number> = {};
      for (const record of fieldRecords) {
        fieldScopes[record.scope] = (fieldScopes[record.scope] ?? 0) + Number(record.calculatedEmissionsKgCO2e);
        fieldFacilities[record.facilityName] = (fieldFacilities[record.facilityName] ?? 0) + Number(record.calculatedEmissionsKgCO2e);
      }
      for (const [scope, total] of Object.entries({ SCOPE_1: 1228.74, SCOPE_2: 662.5, SCOPE_3: 537.2 })) expect(fieldScopes[scope], scope).toBeCloseTo(total, 2);
      for (const [name, total] of Object.entries({ 'Calgary HQ': 1082.74, 'Vancouver Fleet': 808.5, 'Corporate Travel': 492.2, 'Toronto Sales Trip': 45 })) expect(fieldFacilities[name], name).toBeCloseTo(total, 2);
      expect(records.filter((r: any) => r.activityType === 'GASOLINE')).toHaveLength(1);
      const gas = records.find((r: any) => r.activityType === 'GASOLINE');
      expect(gas).toMatchObject({ sourceReference: 'fuel_card_feb.csv', facilityName: 'Vancouver Fleet',
        sourceRow: '4', sourceSheetName: 'Operations_2026', calculationStatus: 'CALCULATED', scope: 'SCOPE_1' });
      expect(gas.documentId).toBe(gas.sourceDocumentId);
      expect(gas.importBatchId).toBe(`document-${gas.documentId}`);
      expect(Number(gas.quantity)).toBe(350);
      expect(['L', 'liters']).toContain(gas.unit);
      expect(gas.calculationSnapshot.detail).toMatchObject({ normalizedUnit: 'liters', matchingStatus: 'MATCHED',
        matchedBy: 'SYSTEM_COUNTRY_YEAR', factorSelectionReason: 'GENERIC_JURISDICTION_FALLBACK', sourceYear: 2025 });
      expect.soft(gas?.calculationSnapshot).toMatchObject({ input: { quantity: 350, region: 'British Columbia' }, factor: { value: 2.31 }, result: { value: 808.5, scope: 'SCOPE_1' } });
      await page.goto('/reports');
      const generate = page.getByRole('button', { name: 'Generate Report', exact: true });
      await expect(generate).toBeEnabled();
      await generate.click();
      await expect(generate).toBeEnabled();
      await page.getByRole('button', { name: 'Expand all', exact: true }).click();
      await expect(page.getByText('3,007.84 kg CO₂e').first()).toBeVisible();
      const facilityTable = page.getByRole('region', { name: 'Emissions by Site / Facility' });
      await expect(facilityTable).toContainText('Vancouver Fleet');
      await expect(facilityTable).toContainText('808.50');
      const sourceEvidence = page.getByRole('row')
        .filter({ hasText: accountKey === 'Renamed' ? 'carbonlite_field_mapping_test (1).xlsx' : 'carbonlite_field_mapping_test.xlsx' })
        .filter({ hasText: '5 record-level references' });
      await expect(sourceEvidence).toHaveCount(1);
      await expect(sourceEvidence.getByRole('cell').nth(4)).toHaveText('5');
      expect(errors).toEqual([]);
    } finally {
      fs.writeFileSync(testInfo.outputPath('import-stage-trace.json'), JSON.stringify(trace, null, 2));
    }
  });
}

test('gasoline manual entry uses the same generic factor without interpreting a CSV reference as an upload', async ({ page, request }, testInfo) => {
  test.skip(!process.env.TASK9B_STATE_FILE, 'Requires guarded synthetic development accounts.');
  test.setTimeout(120_000);
  const state = JSON.parse(fs.readFileSync(process.env.TASK9B_STATE_FILE!, 'utf8'));
  expect(state.environment).toBe('Neon development');
  const base = process.env.E2E_API_BASE_URL!;
  expect(base).toBe(state.apiBase);
  const email = `task9b-manual-${Date.now()}@example.com`;
  const registration = await request.post(base + '/auth/register', { data: { organizationName: 'Gasoline manual path synthetic', email, password: state.password } });
  expect(registration.status()).toBe(201);
  const registered = await registration.json();
  const account = { email, user: registered.user, token: registered.accessToken ?? registered.token };
  state.accounts[email] = account;
  fs.writeFileSync(process.env.TASK9B_STATE_FILE!, JSON.stringify(state), { mode: 0o600 });
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.locator('input[type="password"]').fill(state.password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto('/input-data');
  await page.getByRole('tab', { name: /^Manual Entry/ }).click();
  await page.getByRole('button', { name: 'Add activity record', exact: true }).click();
  const row = page.getByRole('group', { name: 'Activity row 1', exact: true });
  await row.getByRole('combobox', { name: /^Activity Type/ }).selectOption('GASOLINE');
  await row.getByRole('spinbutton', { name: /^Quantity/ }).fill('350');
  await row.getByRole('combobox', { name: /^Unit/ }).selectOption('L');
  await row.getByLabel(/^Date/).fill('2026-02-05');
  await row.getByRole('combobox', { name: /Province/ }).selectOption({ label: 'British Columbia' });
  await row.getByRole('textbox', { name: 'Site / Facility', exact: true }).fill('Vancouver Fleet');
  await row.getByRole('textbox', { name: 'Source Reference', exact: true }).fill('fuel_card_feb.csv');
  const saved = page.waitForResponse(r => r.url().endsWith('/activity-data') && r.request().method() === 'POST');
  await row.getByRole('button', { name: 'Save row 1', exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(201);
  const record = await response.json();
  expect(record).toMatchObject({ activityType: 'GASOLINE', unit: 'L', jurisdictionRegion: 'British Columbia',
    facilityName: 'Vancouver Fleet', sourceReference: 'fuel_card_feb.csv', sourceType: 'MANUAL',
    calculatedEmissionsKgCO2e: 808.5, scope: 'SCOPE_1' });
  expect(Number(record.quantity)).toBe(350);
  expect(record.sourceDocumentId).toBeFalsy();
  expect(record.calculationSnapshot).toMatchObject({ factor: { value: 2.31 }, result: { value: 808.5, scope: 'SCOPE_1' },
    detail: { normalizedUnit: 'liters', matchedBy: 'SYSTEM_COUNTRY_YEAR', factorSelectionReason: 'GENERIC_JURISDICTION_FALLBACK' } });
  const persisted = await request.get(base + '/activity-data?pageSize=100', { headers: { Authorization: `Bearer ${account.token}` } });
  expect(persisted.status()).toBe(200);
  const records = (await persisted.json()).items;
  expect(records).toHaveLength(1);
  expect(records[0].id).toBe(record.id);
  fs.writeFileSync(testInfo.outputPath('manual-gasoline-evidence.json'), JSON.stringify({ record, persistedCount: records.length }, null, 2));
});
