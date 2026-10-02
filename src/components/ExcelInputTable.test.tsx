import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as XLSX from 'xlsx';
import { ExcelInputTable, normalizeSpreadsheetDate } from './ExcelInputTable';
import { AppDialogProvider } from './AppDialog';
import { ToastProvider } from './Toast';
import { createActivityData, updateActivityData } from '../services/activityData';
import { getAllConversionFactors } from '../services/conversionFactors';
import { getFacilities } from '../services/facilities';
import { saveSpreadsheetReviewRows } from '../services/spreadsheetReviewRows';

vi.mock('../services/activityData', () => ({
  createActivityData: vi.fn(),
  updateActivityData: vi.fn(),
}));

vi.mock('../services/spreadsheetReviewRows', () => ({
  saveSpreadsheetReviewRows: vi.fn(),
}));

vi.mock('../services/conversionFactors', () => ({
  getAllConversionFactors: vi.fn(),
}));

vi.mock('../services/facilities', () => ({
  getFacilities: vi.fn(),
}));

vi.mock('../services/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    id: 'user-1',
    organizationId: 'org-1',
  })),
  getOrganizationId: vi.fn(() => 'org-1'),
}));

vi.mock('../utils/permissions', () => ({
  canImportActivityRecords: vi.fn(() => true),
}));

describe('ExcelInputTable empty activity row UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAllConversionFactors).mockResolvedValue([
        {
          id: 'factor-diesel',
          name: 'Diesel factor',
          type: 'EMISSION',
          activityType: 'DIESEL',
          inputUnit: 'liters',
          unit: 'liters',
          factorValue: 2.68,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2025,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-electricity-ab-2025',
          name: 'Electricity - Alberta - 2025',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          unit: 'kWh',
          factorValue: 0.53,
          resultUnit: 'kgCO2e/kWh',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2025,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          isSystemDefault: true,
          isDefault: true,
          verified: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-electricity-bc-2025',
          name: 'Electricity - British Columbia - 2025',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          unit: 'kWh',
          factorValue: 0.02,
          resultUnit: 'kgCO2e/kWh',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2025,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'British Columbia',
          isSystemDefault: true,
          isDefault: true,
          verified: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-electricity-on-2025',
          name: 'Electricity - Ontario - 2025',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          unit: 'kWh',
          factorValue: 0.12,
          resultUnit: 'kgCO2e/kWh',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2025,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Ontario',
          isSystemDefault: true,
          isDefault: true,
          verified: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-natural-gas',
          name: 'Natural gas factor',
          type: 'EMISSION',
          activityType: 'NATURAL_GAS',
          inputUnit: 'm3',
          unit: 'm3',
          factorValue: 1.89,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-gasoline',
          name: 'Gasoline factor',
          type: 'EMISSION',
          activityType: 'GASOLINE',
          inputUnit: 'liters',
          unit: 'liters',
          factorValue: 2.31,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-air-travel',
          name: 'Business travel flight factor',
          type: 'EMISSION',
          activityType: 'AIR_TRAVEL',
          inputUnit: 'km',
          unit: 'km',
          factorValue: 0.16,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-hotel',
          name: 'Business Travel - Accommodation factor',
          type: 'EMISSION',
          activityType: 'HOTEL',
          inputUnit: 'nights',
          unit: 'nights',
          factorValue: 18,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-ground-transport',
          name: 'Ground Transport - Canada - 2025',
          type: 'EMISSION',
          activityType: 'GROUND_TRANSPORT',
          inputUnit: 'km',
          unit: 'km',
          factorValue: 0.2,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'CarbonLite',
          sourceYear: 2025,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Canada',
          confidenceLevel: 'Pilot Estimate',
          verificationStatus: 'Internal Review Required',
          verified: false,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    vi.mocked(getFacilities).mockResolvedValue([]);
    vi.mocked(createActivityData).mockResolvedValue({ id: 'activity-1' } as any);
    vi.mocked(updateActivityData).mockResolvedValue({ id: 'activity-1' } as any);
    vi.mocked(saveSpreadsheetReviewRows).mockImplementation(async (input) => ({
      savedCount: input.rows.length,
      readyCount: input.rows.filter((row) => row.status === 'READY').length,
      needsReviewCount: input.rows.filter((row) => row.status === 'NEEDS_REVIEW').length,
      trackedOnlyCount: input.rows.filter((row) => row.status === 'TRACKED_ONLY').length,
    }));
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  function renderTable(mode: 'manual' | 'spreadsheet' = 'manual') {
    return render(
      <ToastProvider>
        <AppDialogProvider>
          <ExcelInputTable mode={mode} onSuccess={vi.fn()} />
        </AppDialogProvider>
      </ToastProvider>,
    );
  }

  async function getActivityRow(rowNumber: number) {
    return screen.findByRole('group', { name: `Activity row ${rowNumber}` });
  }

  async function addEmptyRow(rowNumber = 1) {
    await userEvent.click(
      await screen.findByRole('button', { name: /Add activity record|Add another manual row/i }),
    );
    return getActivityRow(rowNumber);
  }

  async function addValidDieselRow(quantity = '100') {
    const row = await addEmptyRow(screen.queryAllByRole('group', { name: /Activity row/i }).length + 1);
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'DIESEL');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), quantity);
    await waitFor(() => {
      expect(within(row).getByText('Diesel factor')).toBeInTheDocument();
      expect(within(row).getByText(/kg CO₂e\/L/)).toBeInTheDocument();
      expect(within(row).queryByText(/kg CO₂e\/liters/)).not.toBeInTheDocument();
    });
    return row;
  }

  it('starts with a clear empty state and disabled Save All', async () => {
    renderTable();

    await waitFor(() => {
      expect(getAllConversionFactors).toHaveBeenCalledWith();
    });
    expect(await screen.findByText('No manual activity rows yet.')).toBeInTheDocument();
    expect(screen.getByText('Click "Add activity record" to begin.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save All' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Remove row/i })).not.toBeInTheDocument();
    expect(screen.queryByText('No matching factor')).not.toBeInTheDocument();
  });

  it('shows spreadsheet import guidance without manual add-row controls in spreadsheet mode', async () => {
    renderTable('spreadsheet');

    expect(await screen.findByText('Spreadsheet rows')).toBeInTheDocument();
    expect(screen.getByText('Import a CSV/XLSX file or paste rows from Excel.')).toBeInTheDocument();
    expect(screen.getByText('File import')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose spreadsheet file' })).toBeInTheDocument();
    expect(screen.getByText('Select a CSV or XLSX file from your computer.')).toBeInTheDocument();
    expect(screen.getByText('To paste copied rows, use the paste area below.')).toBeInTheDocument();
    expect(screen.getByLabelText('Paste spreadsheet rows')).toBeInTheDocument();
    expect(screen.getByText('Paste rows copied from Excel here.')).toBeInTheDocument();
    expect(screen.getByText('No spreadsheet rows yet.')).toBeInTheDocument();
    expect(screen.getByText('Choose a spreadsheet file above or paste rows from Excel.')).toBeInTheDocument();
    expect(screen.queryByText('Paste spreadsheet rows into this area.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add activity record/i })).not.toBeInTheDocument();
  });

  it('normalizes spreadsheet dates from Date objects, Excel serials, and ISO strings without shifting days', () => {
    expect(normalizeSpreadsheetDate(new Date('2026-03-01T00:00:00.000Z'))).toBe('2026-03-01');
    expect(normalizeSpreadsheetDate(46082)).toBe('2026-03-01');
    expect(normalizeSpreadsheetDate('2026-03-01')).toBe('2026-03-01');
    expect(normalizeSpreadsheetDate('2026-03-01T00:00:00.000Z')).toBe('2026-03-01');
    expect(normalizeSpreadsheetDate('TOTAL')).toBe('');
    expect(normalizeSpreadsheetDate('unknown')).toBe('');
  });

  it('imports Excel date serials as activity dates and does not mark real rows as missing date', async () => {
    renderTable('spreadsheet');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Activity Type', 'Quantity', 'Unit', 'Country', 'Province'],
      [46082, 'Diesel', 100, 'L', 'Canada', 'Alberta'],
      [46083, 'Water', 20, 'm3', 'Canada', 'British Columbia'],
    ]);
    worksheet.A2.z = 'yyyy-mm-dd';
    worksheet.A3.z = 'yyyy-mm-dd';
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Import');
    const file = new File(
      [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
      'carbonlite_needs_review_test.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });

    expect(await screen.findByDisplayValue('2026-03-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-03-02')).toBeInTheDocument();
    expect(screen.getByText('2 records found')).toBeInTheDocument();
    expect(screen.getByText('0 records missing date')).toBeInTheDocument();
    expect(screen.getByText('1 tracked metric')).toBeInTheDocument();
  });

  it('keeps Save All available for mixed-quality spreadsheet rows and preserves review issues', async () => {
    renderTable('spreadsheet');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Activity Type', 'Quantity', 'Unit', 'Country', 'Province', 'Notes'],
      [46082, 'Diesel', 100, 'L', 'Canada', 'Alberta', 'ready row'],
      [46083, 'Electricity', 500, 'kWh', 'Canada', '', 'needs province'],
      [46084, 'Water', 20, 'm3', 'Canada', 'British Columbia', 'tracked row'],
      [46085, 'Natural Gas', 12.4, '', 'Canada', 'Alberta', 'missing unit'],
      [46086, 'Gasoline', 'approx 500', 'L', 'Canada', 'Alberta', 'bad quantity'],
      [46087, 'Air Travel', '', 'km', 'Canada', 'Alberta', 'missing quantity'],
    ]);
    ['A2', 'A3', 'A4', 'A5', 'A6', 'A7'].forEach((cell) => {
      worksheet[cell].z = 'yyyy-mm-dd';
    });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mixed Rows');
    const file = new File(
      [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
      'carbonlite_needs_review_test.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });

    expect(await screen.findByText('6 records found')).toBeInTheDocument();
    expect(screen.getByText('0 records missing date')).toBeInTheDocument();
    expect(screen.getByText('2 records missing quantity')).toBeInTheDocument();
    expect(screen.getByText('1 missing province')).toBeInTheDocument();
    expect(screen.getByText('1 tracked metric')).toBeInTheDocument();

    const saveAllButton = screen.getByRole('button', { name: 'Save All' });
    expect(saveAllButton).toBeEnabled();

    await userEvent.click(saveAllButton);

    await waitFor(() => {
      expect(saveSpreadsheetReviewRows).toHaveBeenCalledTimes(1);
    });
    expect(createActivityData).not.toHaveBeenCalled();
    expect(saveSpreadsheetReviewRows).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'EXCEL',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        rows: expect.arrayContaining([
          expect.objectContaining({
            activityType: 'DIESEL',
            status: 'READY',
            recordDate: '2026-03-01',
            quantity: 100,
            sourceFileName: 'carbonlite_needs_review_test.xlsx',
            sourceSheetName: 'Mixed Rows',
            sourceRow: 2,
          }),
          expect.objectContaining({
            activityType: 'ELECTRICITY',
            status: 'NEEDS_REVIEW',
            calculationStatus: 'MISSING_PROVINCE',
            reportTreatment: 'EXCLUDED',
            sourceRow: 3,
            issues: expect.arrayContaining([
              expect.objectContaining({ code: 'MISSING_PROVINCE' }),
            ]),
          }),
          expect.objectContaining({
            activityType: 'WATER',
            status: 'TRACKED_ONLY',
            calculationStatus: 'TRACKED_ONLY',
            reportTreatment: 'TRACKED_ONLY',
            sourceRow: 4,
          }),
          expect.objectContaining({
            activityType: 'NATURAL_GAS',
            status: 'NEEDS_REVIEW',
            quantity: 12.4,
            unit: '',
            sourceRow: 5,
            issues: expect.arrayContaining([
              expect.objectContaining({ code: 'MISSING_UNIT' }),
            ]),
          }),
          expect.objectContaining({
            activityType: 'GASOLINE',
            status: 'NEEDS_REVIEW',
            quantity: null,
            rawQuantity: 'approx 500',
            sourceRow: 6,
            matchingStatus: 'MATCHED',
            calculationStatus: 'INVALID_QUANTITY',
            reportTreatment: 'EXCLUDED',
            calculatedEmissionsKgCO2e: null,
            issues: expect.arrayContaining([
              expect.objectContaining({ code: 'INVALID_QUANTITY' }),
            ]),
          }),
          expect.objectContaining({
            activityType: 'AIR_TRAVEL',
            status: 'NEEDS_REVIEW',
            quantity: null,
            rawQuantity: '',
            sourceRow: 7,
            matchingStatus: 'MATCHED',
            calculationStatus: 'MISSING_QUANTITY',
            reportTreatment: 'EXCLUDED',
            calculatedEmissionsKgCO2e: null,
            issues: expect.arrayContaining([
              expect.objectContaining({ code: 'MISSING_QUANTITY' }),
            ]),
          }),
        ]),
      }),
    );
    expect(await screen.findByText(/6 spreadsheet rows saved for review/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Missing unit/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Quantity must be greater than 0/i).length).toBeGreaterThan(0);
  });

  it('preserves Cost CAD from spreadsheet rows into review-row payloads', async () => {
    renderTable('spreadsheet');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Type', 'Quantity', 'Unit', 'Province', 'Site', 'Source Reference', 'Cost CAD', 'Notes'],
      [46082, 'Electricity', 980, 'kWh', 'Alberta', 'Calgary HQ', 'MARCH-ELEC-001', 214.55, 'Valid row'],
      [46088, 'Water', 18, 'm3', 'Alberta', 'Calgary HQ', 'MARCH-WATER-007', 0, 'Tracked-only candidate'],
    ]);
    worksheet.A2.z = 'yyyy-mm-dd';
    worksheet.A3.z = 'yyyy-mm-dd';
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Messy_Operations');
    const file = new File(
      [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
      'carbonlite_needs_review_test.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

    expect(await screen.findByText('2 records found')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save All' }));

    await waitFor(() => {
      expect(saveSpreadsheetReviewRows).toHaveBeenCalledTimes(1);
    });
    const payload = vi.mocked(saveSpreadsheetReviewRows).mock.calls[0][0];
    expect(payload.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceReference: 'MARCH-ELEC-001',
          facilityName: 'Calgary HQ',
          costCad: 214.55,
          costCurrency: 'CAD',
        }),
        expect.objectContaining({
          sourceReference: 'MARCH-WATER-007',
          facilityName: 'Calgary HQ',
          costCad: 0,
          costCurrency: 'CAD',
        }),
      ]),
    );
  });

  it('saves the needs-review workbook rows with Electricity ready, Water tracked, Accommodation ready, and Diesel blocked', async () => {
    renderTable('spreadsheet');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Activity Type', 'Quantity', 'Unit', 'Country', 'Province', 'Source Reference'],
      ['2026-03-01', 'Electricity', 980, 'kWh', 'Canada', 'Alberta', 'ELEC-001'],
      ['2026-03-06', 'Diesel', 240, 'kg', 'Canada', 'Alberta', 'DIESEL-001'],
      ['2026-03-07', 'Water', 18, 'm3', 'Canada', 'Alberta', 'WATER-001'],
      ['2026-03-10', 'Business Travel - Accommodation', 4, 'nights', 'Canada', 'Ontario', 'HOTEL-001'],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Needs Review');
    const file = new File(
      [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
      'carbonlite_needs_review_test.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

    expect(await screen.findByText('4 records found')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save All' }));

    await waitFor(() => {
      expect(saveSpreadsheetReviewRows).toHaveBeenCalledTimes(1);
    });

    const payload = vi.mocked(saveSpreadsheetReviewRows).mock.calls[0][0];
    const rowsByType = new Map(payload.rows.map((row) => [row.activityType, row]));

    expect(rowsByType.get('ELECTRICITY')).toEqual(
      expect.objectContaining({
        status: 'READY',
        quantity: 980,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        matchingStatus: 'MATCHED',
        reportTreatment: 'INCLUDED',
        calculationStatus: 'CALCULATED',
        matchedFactorName: 'Electricity - Alberta - 2025',
        matchedFactorValue: 0.53,
        matchedFactorUnit: 'kgCO2e/kWh/kWh',
        calculatedEmissionsKgCO2e: 519.4,
      }),
    );
    expect(rowsByType.get('DIESEL')).toEqual(
      expect.objectContaining({
        status: 'NEEDS_REVIEW',
        quantity: 240,
        unit: 'kg',
        jurisdictionRegion: 'Alberta',
        matchingStatus: 'UNIT_MISMATCH',
        reportTreatment: 'EXCLUDED',
        calculationStatus: 'UNIT_MISMATCH',
      }),
    );
    expect(rowsByType.get('DIESEL')?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'UNIT_MISMATCH', field: 'unit' }),
      ]),
    );
    expect(rowsByType.get('WATER')).toEqual(
      expect.objectContaining({
        status: 'TRACKED_ONLY',
        quantity: 18,
        unit: 'm3',
        matchingStatus: 'TRACKED_ONLY',
        reportTreatment: 'TRACKED_ONLY',
        calculationStatus: 'TRACKED_ONLY',
      }),
    );
    expect(rowsByType.get('HOTEL')).toEqual(
      expect.objectContaining({
        status: 'READY',
        quantity: 4,
        unit: 'nights',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Ontario',
        matchingStatus: 'MATCHED',
        reportTreatment: 'INCLUDED',
        calculationStatus: 'CALCULATED',
        matchedFactorName: 'Business Travel - Accommodation factor',
        matchedFactorValue: 18,
        matchedFactorUnit: 'kgCO2e/nights',
        calculatedEmissionsKgCO2e: 72,
      }),
    );
  }, 40000);

  it('does not send obvious spreadsheet total rows as review rows', async () => {
    renderTable('spreadsheet');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Activity Type', 'Quantity', 'Unit', 'Country', 'Province'],
      [46082, 'Diesel', 100, 'L', 'Canada', 'Alberta'],
      [46083, 'Electricity', 500, 'kWh', 'Canada', 'Alberta'],
      ['TOTAL', '', 600, '', '', ''],
    ]);
    worksheet.A2.z = 'yyyy-mm-dd';
    worksheet.A3.z = 'yyyy-mm-dd';
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Totals');
    const file = new File(
      [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
      'carbonlite_totals_test.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

    expect(await screen.findByText('2 records found')).toBeInTheDocument();
    expect(screen.getByText('0 records missing date')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save All' }));

    await waitFor(() => {
      expect(saveSpreadsheetReviewRows).toHaveBeenCalledTimes(1);
    });
    expect(saveSpreadsheetReviewRows).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            activityType: 'DIESEL',
            recordDate: '2026-03-01',
            sourceRow: 2,
          }),
          expect.objectContaining({
            activityType: 'ELECTRICITY',
            recordDate: '2026-03-02',
            sourceRow: 3,
          }),
        ],
      }),
    );
    const payload = vi.mocked(saveSpreadsheetReviewRows).mock.calls[0][0];
    expect(payload.rows).toHaveLength(2);
    expect(payload.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rawRecordDate: 'TOTAL',
        }),
      ]),
    );
  });

  it('shows the error modal for technical spreadsheet review-row save failures', async () => {
    vi.mocked(saveSpreadsheetReviewRows).mockRejectedValueOnce(
      Object.assign(new Error('Database unavailable'), {
        status: 500,
        technicalMessage: 'spreadsheet review rows insert failed',
      }),
    );
    renderTable('spreadsheet');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Activity Type', 'Quantity', 'Unit', 'Country', 'Province'],
      [46082, 'Diesel', 100, 'L', 'Canada', 'Alberta'],
    ]);
    worksheet.A2.z = 'yyyy-mm-dd';
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Import');
    const file = new File(
      [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
      'technical_failure.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
    await userEvent.click(await screen.findByRole('button', { name: 'Save All' }));

    const dialog = await screen.findByRole('dialog', { name: 'Unable to save records' });
    expect(within(dialog).getByText('We could not save these records. Please review the information and try again.')).toBeInTheDocument();
    expect(within(dialog).getByText('Technical details')).toBeInTheDocument();
    expect(within(dialog).getByText(/HTTP 500.*spreadsheet review rows insert failed/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-03-01')).toBeInTheDocument();
    expect(screen.queryByText(/spreadsheet rows saved for review/i)).not.toBeInTheDocument();
  });

  it('adds an empty row without showing remove or missing factor warnings', async () => {
    renderTable();

    const row = await addEmptyRow();

    expect(within(row).getByRole('combobox', { name: /Activity type/i })).toHaveValue('');
    expect(within(row).getByPlaceholderText('Quantity')).toHaveValue(null);
    expect(screen.queryByText('No manual activity rows yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('No matching factor')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove row/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save All' })).toBeDisabled();
    expect(within(row).getByText('Scope')).toBeInTheDocument();
    expect(
      within(row).getByText('GHG Protocol category inferred from activity type.'),
    ).toBeInTheDocument();
    expect(within(row).getByText('Factor Status')).toBeInTheDocument();
    expect(
      within(row).getByText('Whether this record is ready for emissions calculation.'),
    ).toBeInTheDocument();
    expect(within(row).getByText('Matched Factor')).toBeInTheDocument();
    expect(
      within(row).getByText('Conversion factor matched by type, unit, province, and year.'),
    ).toBeInTheDocument();
    expect(within(row).getByText('Report Treatment')).toBeInTheDocument();
    expect(
      within(row).getByText('How this row will affect totals after saving.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Import Review Summary')).not.toBeInTheDocument();
    expect(screen.queryByText(/Bulk set province for selected imported rows/i)).not.toBeInTheDocument();
  });

  it('sets the default unit when activity type changes in manual entry', async () => {
    renderTable();

    const row = await addEmptyRow();
    const activityTypeSelect = within(row).getByRole('combobox', { name: /Activity type/i });
    const unitInput = within(row).getByPlaceholderText('Unit');

    await userEvent.selectOptions(activityTypeSelect, 'ELECTRICITY');
    expect(unitInput).toHaveValue('kWh');

    await userEvent.selectOptions(activityTypeSelect, 'GASOLINE');
    expect(unitInput).toHaveValue('L');

    await userEvent.selectOptions(activityTypeSelect, 'DIESEL');
    expect(unitInput).toHaveValue('L');

    await userEvent.selectOptions(activityTypeSelect, 'AIR_TRAVEL');
    expect(unitInput).toHaveValue('km');

    await userEvent.selectOptions(activityTypeSelect, 'HOTEL');
    expect(unitInput).toHaveValue('nights');

    await userEvent.selectOptions(activityTypeSelect, 'WATER');
    expect(unitInput).toHaveValue('m3');
  });

  it('preserves manual unit edits until activity type changes again', async () => {
    renderTable();

    const row = await addEmptyRow();
    const activityTypeSelect = within(row).getByRole('combobox', { name: /Activity type/i });
    const unitInput = within(row).getByPlaceholderText('Unit');

    await userEvent.selectOptions(activityTypeSelect, 'NATURAL_GAS');
    expect(unitInput).toHaveValue('m3');

    await userEvent.clear(unitInput);
    await userEvent.type(unitInput, 'GJ');
    expect(unitInput).toHaveValue('GJ');

    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '3');
    await waitFor(() => {
      expect(within(row).getAllByText('Unit Mismatch').length).toBeGreaterThan(0);
    });
    expect(unitInput).toHaveValue('GJ');

    await userEvent.selectOptions(activityTypeSelect, 'ELECTRICITY');
    expect(unitInput).toHaveValue('kWh');
  });

  it('uses the current pilot province dropdown for manual input', async () => {
    renderTable();

    const row = await addEmptyRow();
    const activityTypeSelect = within(row).getByRole('combobox', { name: /Activity type/i });
    const provinceSelect = within(row).getByRole('combobox', { name: /^Province$/i });

    expect(within(activityTypeSelect).getByRole('option', { name: 'Electricity' })).toHaveValue('ELECTRICITY');
    expect(within(activityTypeSelect).getByRole('option', { name: 'Natural Gas' })).toHaveValue('NATURAL_GAS');
    expect(within(activityTypeSelect).getByRole('option', { name: 'Air Travel' })).toHaveValue('AIR_TRAVEL');
    expect(within(activityTypeSelect).queryByRole('option', { name: 'ELECTRICITY' })).not.toBeInTheDocument();
    expect(within(activityTypeSelect).queryByRole('option', { name: 'BUSINESS_TRAVEL' })).not.toBeInTheDocument();
    expect(within(activityTypeSelect).queryByRole('option', { name: 'CUSTOM' })).not.toBeInTheDocument();
    expect(within(activityTypeSelect).queryByRole('option', { name: 'WASTE' })).not.toBeInTheDocument();
    expect(provinceSelect).toHaveDisplayValue('Select province');
    expect(within(provinceSelect).getByRole('option', { name: 'Alberta' })).toBeInTheDocument();
    expect(
      within(provinceSelect).getByRole('option', { name: 'British Columbia' }),
    ).toBeInTheDocument();
    expect(within(provinceSelect).getByRole('option', { name: 'Ontario' })).toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Quebec' })).not.toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Saskatchewan' })).not.toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Nunavut' })).not.toBeInTheDocument();
  });

  it('shows Clear Draft after a type is selected and returns to empty state after clearing', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'DIESEL');

    const clearDraftButton = await screen.findByRole('button', { name: /Clear draft row 1/i });
    expect(clearDraftButton).toHaveTextContent('Clear Draft');
    expect(screen.queryByRole('button', { name: /Remove row 1/i })).not.toBeInTheDocument();

    await userEvent.click(clearDraftButton);

    expect(screen.getByText('No manual activity rows yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove row/i })).not.toBeInTheDocument();
  });

  it('updates factor matching when type and unit are valid', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'DIESEL');

    await waitFor(() => {
      expect(within(row).getByText('Diesel factor')).toBeInTheDocument();
    });
    expect(screen.queryByText('No matching factor')).not.toBeInTheDocument();
  });

  it('shows tracked metric guidance for water rows', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'WATER');

    expect(within(row).getByText('Tracked Metric')).toBeInTheDocument();
    expect(within(row).getAllByText('Not Emissions Factor Required').length).toBeGreaterThan(0);
    expect(within(row).getByText('Tracked Only')).toBeInTheDocument();
    expect(within(row).getByText('Excluded from GHG total.')).toBeInTheDocument();
    expect(within(row).queryByText('Included')).not.toBeInTheDocument();
    expect(within(row).queryByText('Included in GHG total.')).not.toBeInTheDocument();
  });

  it('saves water rows as tracked only and excluded from GHG totals', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      'WATER',
    );
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '10');
    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'WATER',
          quantity: 10,
          matchingStatus: 'TRACKED_ONLY',
          reportTreatment: 'TRACKED_ONLY',
          scope: 'TRACKED_METRIC',
          calculationStatus: 'TRACKED_ONLY',
          calculatedEmissionsKgCO2e: undefined,
        }),
      );
    });
    expect(within(row).getByText('Saved · Tracked Only')).toBeInTheDocument();
    expect(within(row).getByText('Tracked Only')).toBeInTheDocument();
    expect(within(row).getByText('Excluded from GHG total.')).toBeInTheDocument();
    expect(within(row).queryByText('Included in GHG total.')).not.toBeInTheDocument();
  });

  it.each([
    ['ELECTRICITY', 'British Columbia', 'Scope 2', 'Electricity - British Columbia - 2025'],
    ['NATURAL_GAS', '', 'Scope 1', 'Natural gas factor'],
    ['GASOLINE', '', 'Scope 1', 'Gasoline factor'],
    ['DIESEL', '', 'Scope 1', 'Diesel factor'],
    ['AIR_TRAVEL', '', 'Scope 3', 'Business travel flight factor'],
    ['HOTEL', '', 'Scope 3', 'Business Travel - Accommodation factor'],
    ['GROUND_TRANSPORT', '', 'Scope 3', 'Ground Transport - Canada - 2025'],
  ])('assigns scope and matched status for %s rows', async (activityType, province, scopeLabel, factorName) => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      activityType,
    );
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '10');

    if (province) {
      await userEvent.selectOptions(
        within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
        province,
      );
    }

    expect(within(row).getByText('Scope')).toBeInTheDocument();
    expect(within(row).getByText(scopeLabel)).toBeInTheDocument();
    expect(within(row).getByText('Ready')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
    expect(within(row).getByText(factorName)).toBeInTheDocument();
  });

  it('keeps electricity province requirements concise until province is selected', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'ELECTRICITY');
    const provinceSelect = within(row).getByRole('combobox', {
      name: /Province required for electricity records/i,
    });

    expect(within(row).queryByText('Province *')).not.toBeInTheDocument();
    expect(provinceSelect).toHaveDisplayValue('Select province');
    expect(provinceSelect).toBeRequired();
    expect(within(provinceSelect).getByRole('option', { name: 'Alberta' })).toBeInTheDocument();
    expect(
      within(provinceSelect).getByRole('option', { name: 'British Columbia' }),
    ).toBeInTheDocument();
    expect(within(provinceSelect).getByRole('option', { name: 'Ontario' })).toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Quebec' })).not.toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Nunavut' })).not.toBeInTheDocument();
    expect(within(row).getByText('Missing Province')).toBeInTheDocument();
    expect(within(row).getByText('Select province to calculate.')).toBeInTheDocument();
    expect(within(row).getByText('Not selected')).toBeInTheDocument();
    expect(within(row).getByText('Province required')).toBeInTheDocument();
    expect(within(row).getByText('Current pilot coverage supports AB, BC, and ON.')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Imported electricity rows require province-specific factors. Use the bulk action above or edit each imported row before saving.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Import Review Summary')).not.toBeInTheDocument();
    expect(screen.queryByText(/Bulk set province for selected imported rows/i)).not.toBeInTheDocument();
    expect(within(row).queryByText(/Electricity emissions require a province-specific factor/i)).not.toBeInTheDocument();
    expect(within(row).getByText('Excluded')).toBeInTheDocument();
    expect(within(row).getByText('Province required before calculation.')).toBeInTheDocument();
  });

  it('shows import review summary and bulk province only for pasted imported rows', async () => {
    renderTable('spreadsheet');

    fireEvent.paste(await screen.findByText('No spreadsheet rows yet.'), {
      clipboardData: {
        getData: () => 'ELECTRICITY\t2026-07-20\t100\tkWh\tCanada\t',
      },
    });

    expect(await screen.findByText('Import Review Summary')).toBeInTheDocument();
    expect(screen.getByText('1 record found')).toBeInTheDocument();
    expect(screen.getByText('1 missing province')).toBeInTheDocument();
    expect(screen.getByText('Bulk set province for selected imported rows')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Apply a province to selected imported electricity rows that need province-specific factor matching.',
      ),
    ).toBeInTheDocument();

    const row = await getActivityRow(1);
    const bulkProvinceSelect = screen.getByRole('combobox', {
      name: /Province to apply to selected electricity records/i,
    });

    expect(within(bulkProvinceSelect).getByRole('option', { name: 'Alberta' })).toBeInTheDocument();
    expect(within(bulkProvinceSelect).getByRole('option', { name: 'Ontario' })).toBeInTheDocument();
    expect(within(bulkProvinceSelect).queryByRole('option', { name: 'Quebec' })).not.toBeInTheDocument();

    await userEvent.selectOptions(
      bulkProvinceSelect,
      'British Columbia',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Apply province' }));

    expect(screen.getByRole('status')).toHaveTextContent('Province applied to imported electricity rows.');
    expect(
      within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
    ).toHaveDisplayValue('British Columbia');
    expect(within(row).queryByText('Missing Province')).not.toBeInTheDocument();
    expect(within(row).getByText('Ready')).toBeInTheDocument();
    expect(
      within(row).getByText('British Columbia electricity factor matched. Using latest available factor year: 2025.'),
    ).toBeInTheDocument();
    expect(within(row).getByText('Electricity - British Columbia - 2025')).toBeInTheDocument();
    expect(within(row).getByText('Scope 2')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
  });

  it('matches a valid manual electricity row with the Alberta pilot factor', async () => {
    vi.mocked(getAllConversionFactors).mockResolvedValueOnce([
        {
          id: 'factor-electricity-ab',
          name: 'Electricity - Alberta',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          unit: 'kWh',
          factorValue: 0.12,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          isSystemDefault: true,
          isDefault: true,
          verified: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      'ELECTRICITY',
    );
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '500');
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
      'Alberta',
    );

    await waitFor(() => {
      expect(within(row).getByText('Ready')).toBeInTheDocument();
    });
    expect(within(row).getByText('Electricity - Alberta')).toBeInTheDocument();
    expect(within(row).getByText('Scope 2')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
    expect(within(row).queryByText('Missing Province')).not.toBeInTheDocument();
  });

  it.each([
    ['Alberta', 'Electricity - Alberta - 2025', 'Estimated emissions: 6,625 kg CO₂e'],
    ['British Columbia', 'Electricity - British Columbia - 2025', 'Estimated emissions: 250 kg CO₂e'],
    ['Ontario', 'Electricity - Ontario - 2025', 'Estimated emissions: 1,500 kg CO₂e'],
  ])('uses the 2025 %s electricity factor for a 2026 manual row', async (province, factorName, emissionsText) => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      'ELECTRICITY',
    );
    await userEvent.clear(within(row).getByLabelText('Date'));
    await userEvent.type(within(row).getByLabelText('Date'), '2026-07-20');
    await userEvent.clear(within(row).getByPlaceholderText('Unit'));
    await userEvent.type(within(row).getByPlaceholderText('Unit'), 'KWH');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '12500');
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
      province,
    );

    expect(within(row).getByText('Ready')).toBeInTheDocument();
    expect(within(row).getByText(factorName)).toBeInTheDocument();
    expect(within(row).getAllByText(/Using latest available factor year: 2025/i).length).toBeGreaterThan(0);
    expect(within(row).getByText(emissionsText)).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
    expect(within(row).queryByText('Missing Factor')).not.toBeInTheDocument();
  });

  it('matches manually selected Alberta electricity with the latest prior-year factor before quantity is entered', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'ELECTRICITY');
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
      'Alberta',
    );

    expect(within(row).getByText('Ready')).toBeInTheDocument();
    expect(within(row).getByText('Electricity - Alberta - 2025')).toBeInTheDocument();
    expect(within(row).getAllByText(/Using latest available factor year: 2025/i).length).toBeGreaterThan(0);
    expect(within(row).getByText('Estimated emissions: Waiting for quantity')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
    expect(within(row).queryByText('Missing Factor')).not.toBeInTheDocument();
    expect(within(row).queryByText('No factor found')).not.toBeInTheDocument();
  });

  it.each(['2025-07-20', '2026-07-20'])('matches the exact Manual Entry Alberta diagnostic factor for %s', async (recordDate) => {
    vi.mocked(getAllConversionFactors).mockResolvedValueOnce([
      {
        id: 'factor-electricity-sk-2026',
        name: 'Electricity - Saskatchewan - 2026',
        type: 'EMISSION',
        activityType: 'ELECTRICITY',
        unit: 'kWh',
        value: 0.64,
        resultUnit: 'kgCO2e/kWh',
        sourceAuthority: 'CarbonLite',
        sourceYear: 2026,
        jurisdiction: 'Saskatchewan',
        isSystemDefault: true,
        isDefault: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'cmr75gv6l0007gdjbs0bz4d3j',
        name: 'Electricity - Alberta',
        type: 'EMISSION',
        activityType: 'ELECTRICITY',
        unit: 'kWh',
        factorValue: 0.53,
        resultUnit: 'kgCO2e/kWh',
        sourceAuthority: 'CarbonLite',
        sourceYear: 2025,
        jurisdiction: 'Alberta',
        isSystemDefault: true,
        isDefault: true,
        confidenceLevel: 'Demo / Placeholder',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ] as any);
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'ELECTRICITY');
    await userEvent.clear(within(row).getByLabelText('Date'));
    await userEvent.type(within(row).getByLabelText('Date'), recordDate);
    await userEvent.clear(within(row).getByPlaceholderText('Unit'));
    await userEvent.type(within(row).getByPlaceholderText('Unit'), 'kWh');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '100');
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
      'Alberta',
    );

    expect(within(row).getByText('Ready')).toBeInTheDocument();
    expect(within(row).getByText('Electricity - Alberta')).toBeInTheDocument();
    expect(within(row).getByText('Estimated emissions: 53 kg CO₂e')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
    expect(within(row).queryByText('Missing Factor')).not.toBeInTheDocument();
    expect(within(row).queryByText('No factor found')).not.toBeInTheDocument();
  });

  it('matches exact-year Alberta electricity when factor data uses display labels, province code, and spaced unit text', async () => {
    vi.mocked(getAllConversionFactors).mockResolvedValueOnce([
      {
        id: 'factor-electricity-ab-display',
        name: 'Electricity - Alberta - 2025',
        type: 'EMISSION',
        activityType: 'Electricity',
        unit: ' kWh ',
        factorValue: 0.53,
        resultUnit: 'kgCO2e/kWh',
        sourceAuthority: 'CarbonLite',
        sourceYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'AB',
        isSystemDefault: true,
        isDefault: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      'ELECTRICITY',
    );
    await userEvent.clear(within(row).getByLabelText('Date'));
    await userEvent.type(within(row).getByLabelText('Date'), '2025-07-20');
    await userEvent.clear(within(row).getByPlaceholderText('Unit'));
    await userEvent.type(within(row).getByPlaceholderText('Unit'), 'kwh');
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
      'Alberta',
    );

    expect(within(row).getByText('Ready')).toBeInTheDocument();
    expect(within(row).getByText('Electricity - Alberta - 2025')).toBeInTheDocument();
    expect(within(row).getByText('Estimated emissions: Waiting for quantity')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
    expect(within(row).queryByText('Missing Factor')).not.toBeInTheDocument();
  });

  it('saves matched BC electricity records with factor metadata and calculated emissions', async () => {
    vi.mocked(getAllConversionFactors).mockResolvedValueOnce([
      {
        id: 'factor-electricity-bc-2025',
        name: 'Electricity - British Columbia - 2025',
        type: 'EMISSION',
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        unit: 'kWh',
        factorValue: 0.02,
        resultUnit: 'kgCO2e/kWh',
        sourceAuthority: 'CarbonLite',
        sourceYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'British Columbia',
        isSystemDefault: true,
        isDefault: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      'ELECTRICITY',
    );
    await userEvent.clear(within(row).getByLabelText('Date'));
    await userEvent.type(within(row).getByLabelText('Date'), '2026-07-20');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '100');
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
      'British Columbia',
    );
    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'ELECTRICITY',
          recordDate: '2026-07-20',
          quantity: 100,
          unit: 'kWh',
          jurisdictionRegion: 'British Columbia',
          matchingStatus: 'MATCHED',
          reportTreatment: 'INCLUDED',
          scope: 'SCOPE_2',
          matchedFactorId: 'factor-electricity-bc-2025',
          matchedFactorName: 'Electricity - British Columbia - 2025',
          matchedFactorSourceYear: 2025,
          calculatedEmissionsKgCO2e: 2,
          calculationStatus: 'CALCULATED',
          calculationMessage: 'Proxy factor · Review recommended. No exact 2026 factor was available. The nearest available factor was used for internal review only.',
          notes: expect.stringContaining('Calculated emissions: 2 kgCO2e.'),
        }),
      );
    });
    expect(String(vi.mocked(createActivityData).mock.calls[0][0].notes)).not.toMatch(/Missing Factor|No conversion factor/i);
  });

  it('matches Ground Transport as Scope 3 without province and calculates the pilot estimate', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      'GROUND_TRANSPORT',
    );
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '100');

    await waitFor(() => {
      expect(within(row).getByText('Ready')).toBeInTheDocument();
    });
    expect(within(row).queryByRole('combobox', { name: /Province required for electricity records/i })).not.toBeInTheDocument();
    expect(within(row).getByText('Ground Transport - Canada - 2025')).toBeInTheDocument();
    expect(within(row).getByText('Scope 3')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
    expect(within(row).getByText('Estimated emissions: 20 kg CO₂e')).toBeInTheDocument();
  });

  it('shows Unit Mismatch for Ground Transport when the unit is not km', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      'GROUND_TRANSPORT',
    );
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '100');
    await userEvent.clear(within(row).getByPlaceholderText('Unit'));
    await userEvent.type(within(row).getByPlaceholderText('Unit'), 'miles');

    await waitFor(() => {
      expect(within(row).getAllByText('Unit Mismatch').length).toBeGreaterThan(0);
    });
    expect(within(row).getAllByText(/Supported unit: km/i).length).toBeGreaterThan(0);
    expect(within(row).queryByText('Missing Province')).not.toBeInTheDocument();
  });

  it('shows Natural Gas GJ as Unit Mismatch when only an m3 factor is available', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      'NATURAL_GAS',
    );
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '3');
    await userEvent.clear(within(row).getByPlaceholderText('Unit'));
    await userEvent.type(within(row).getByPlaceholderText('Unit'), 'GJ');

    await waitFor(() => {
      expect(within(row).getAllByText('Unit Mismatch').length).toBeGreaterThan(0);
      expect(within(row).getByText('Natural gas usage is in GJ, but the available factor uses m3.')).toBeInTheDocument();
    });
    expect(within(row).queryByText('Missing Factor')).not.toBeInTheDocument();
  });

  it('saves electricity rows missing province as requiring review', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'ELECTRICITY');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '100');
    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'ELECTRICITY',
          quantity: 100,
          jurisdictionRegion: undefined,
          notes: expect.stringContaining('Status: MISSING_PROVINCE'),
        }),
      );
    });
    await waitFor(() => {
      expect(within(row).getByText('Requires Review')).toBeInTheDocument();
    });
    expect(within(row).getByText('Province is required before this electricity record can be calculated.')).toBeInTheDocument();
  });

  it('saves invalid-unit rows as requiring review instead of blocking save', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'DIESEL');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '20');
    await userEvent.clear(within(row).getByPlaceholderText('Unit'));
    await userEvent.type(within(row).getByPlaceholderText('Unit'), 'bottles');

    await waitFor(() => {
      expect(within(row).getAllByText('Unit Mismatch').length).toBeGreaterThan(0);
      expect(within(row).getByText(/Submitted unit does not match available factor units/i)).toBeInTheDocument();
      expect(within(row).getAllByText(/Supported unit: liters/i).length).toBeGreaterThan(0);
    });

    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'DIESEL',
          quantity: 20,
          unit: 'bottles',
        }),
      );
    });
    await waitFor(() => {
      expect(within(row).getByText('Saved · Unit Mismatch')).toBeInTheDocument();
    });
    expect(within(row).getByRole('button', { name: /Save row 1/i })).toBeDisabled();
  });

  it('requires a valid date and positive amount before save', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'DIESEL');
    await userEvent.clear(within(row).getByPlaceholderText('Quantity'));
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '0');
    await userEvent.clear(within(row).getByLabelText('Date'));
    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    expect(await within(row).findByText(/Missing date/i)).toBeInTheDocument();
    expect(within(row).getByText(/Quantity must be greater than 0/i)).toBeInTheDocument();
    expect(createActivityData).not.toHaveBeenCalled();
  });

  it('saves a single row from the row action', async () => {
    const onSuccess = vi.fn();
    render(
      <ToastProvider>
        <AppDialogProvider>
          <ExcelInputTable onSuccess={onSuccess} />
        </AppDialogProvider>
      </ToastProvider>,
    );

    const row = await addValidDieselRow('100');
    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'DIESEL',
          quantity: 100,
          unit: 'L',
          sourceType: 'MANUAL',
        }),
      );
    });
    await waitFor(() => {
      expect(within(row).getAllByText('Saved').length).toBeGreaterThan(0);
    });
    expect(within(row).getByRole('button', { name: /Save row 1/i })).toBeDisabled();
    expect(within(row).queryByRole('button', { name: /Remove row 1/i })).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Add Another Record' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'View in Data Records' })).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('saves a valid spreadsheet row as an import source while preserving spreadsheet metadata', async () => {
    renderTable('spreadsheet');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Activity Type', 'Quantity', 'Unit', 'Country', 'Province', 'Source Reference'],
      [46082, 'Electricity', 980, 'kWh', 'Canada', 'Alberta', 'MARCH-ELEC-001'],
    ]);
    worksheet.A2.z = 'yyyy-mm-dd';
    XLSX.utils.book_append_sheet(workbook, worksheet, 'March');
    const file = new File(
      [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
      'carbonlite_needs_review_test.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
    const row = await screen.findByRole('group', { name: 'Activity row 1' });
    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'ELECTRICITY',
          quantity: 980,
          unit: 'kWh',
          jurisdictionRegion: 'Alberta',
          sourceType: 'IMPORT',
          sourceReference: 'MARCH-ELEC-001',
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceRow: 2,
        }),
      );
    });
    expect(vi.mocked(createActivityData).mock.calls[0][0].sourceType).not.toBe('EXCEL');
  });

  it('keeps all imported workbook review rows visible before Save All and factor reloads', async () => {
    renderTable('spreadsheet');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['CarbonLite March electricity review'],
      [],
      ['Date', 'Type', 'Quantity', 'Unit', 'Province', 'Site', 'Source Reference'],
      ['2026-03-01', 'Electricity', 980, 'kWh', 'Alberta', 'Calgary HQ', 'MARCH-ELEC-001'],
      ['2026-03-02', 'Electricity', 760, 'kWh', '', 'Calgary Warehouse', 'MARCH-ELEC-002'],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'March');
    const file = new File(
      [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
      'carbonlite_needs_review_test.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });

    const rowA = await screen.findByRole('group', { name: 'Activity row 1' });
    const rowB = await screen.findByRole('group', { name: 'Activity row 2' });
    expect(screen.getAllByRole('group', { name: /Activity row/i })).toHaveLength(2);

    expect(within(rowA).getByDisplayValue('MARCH-ELEC-001')).toBeInTheDocument();
    expect(within(rowB).getByDisplayValue('MARCH-ELEC-002')).toBeInTheDocument();
    expect(within(rowA).getByRole('combobox', { name: /Activity type/i })).toHaveValue('ELECTRICITY');
    expect(within(rowA).getByPlaceholderText('Quantity')).toHaveValue(980);
    expect(within(rowA).getByRole('combobox', { name: /Province required for electricity records/i })).toHaveValue('Alberta');

    await waitFor(() => {
      expect(within(rowA).getByText('Ready')).toBeInTheDocument();
    });
    expect(within(rowB).getAllByText('Missing Province').length).toBeGreaterThan(0);
    expect(within(rowA).queryByText('Missing Factor')).not.toBeInTheDocument();
    expect(within(rowB).queryByText('Missing Factor')).not.toBeInTheDocument();
    expect(saveSpreadsheetReviewRows).not.toHaveBeenCalled();
  });

  it('marks spreadsheet subtotal rows as ignored and prevents ActivityData creation', async () => {
    renderTable('spreadsheet');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Activity Type', 'Quantity', 'Unit', 'Country', 'Province', 'Source Reference', 'Notes'],
      ['TOTAL', '', 2277.4, '', 'Canada', '', 'MARCH-SUBTOTAL-009', 'Subtotal/header-like row - should not kill import'],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'March');
    const file = new File(
      [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
      'carbonlite_subtotal_test.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
    const row = await screen.findByRole('group', { name: 'Activity row 1' });

    expect(within(row).getByText('Ignored')).toBeInTheDocument();
    expect(within(row).getAllByText('Non-activity row').length).toBeGreaterThan(0);
    expect(within(row).getByRole('button', { name: /Save row 1/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Save All' }));
    expect(createActivityData).not.toHaveBeenCalled();
    expect(saveSpreadsheetReviewRows).not.toHaveBeenCalled();
  });

  it('saves multiple rows individually', async () => {
    renderTable();

    const firstRow = await addValidDieselRow('100');
    const secondRow = await addValidDieselRow('200');

    await userEvent.click(within(firstRow).getByRole('button', { name: /Save row 1/i }));
    await userEvent.click(within(secondRow).getByRole('button', { name: /Save row 2/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledTimes(2);
    });
    expect(within(firstRow).getAllByText('Saved').length).toBeGreaterThan(0);
    expect(within(secondRow).getAllByText('Saved').length).toBeGreaterThan(0);
  });

  it('Save All saves unsaved rows and skips already saved rows', async () => {
    renderTable();

    const firstRow = await addValidDieselRow('100');
    await userEvent.click(within(firstRow).getByRole('button', { name: /Save row 1/i }));
    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledTimes(1);
    });

    await addValidDieselRow('200');
    await userEvent.click(screen.getByRole('button', { name: 'Save All' }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledTimes(2);
    });
    expect(createActivityData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activityType: 'DIESEL',
        quantity: 200,
      }),
    );
  });

  it('shows a centered error dialog when Save All fails', async () => {
    vi.mocked(createActivityData).mockRejectedValueOnce(new Error('API unavailable'));
    renderTable();

    await addValidDieselRow('100');
    await userEvent.click(screen.getByRole('button', { name: 'Save All' }));

    const dialog = await screen.findByRole('dialog', { name: 'Unable to save records' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('We could not save these records. Please review the information and try again.')).toBeInTheDocument();
    expect(within(dialog).getByText('Technical details')).toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('removes an unsaved row', async () => {
    renderTable();

    const row = await addValidDieselRow('100');
    await userEvent.click(within(row).getByRole('button', { name: /Clear draft row 1/i }));

    expect(screen.getByText('No manual activity rows yet.')).toBeInTheDocument();
    expect(createActivityData).not.toHaveBeenCalled();
  });

  it('warns when navigating away with unsaved activity rows', async () => {
    renderTable();

    await addValidDieselRow('100');

    const event = new Event('beforeunload', { cancelable: true });
    const allowed = window.dispatchEvent(event);

    expect(allowed).toBe(false);
  });
});
