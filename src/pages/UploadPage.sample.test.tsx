import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  UploadPage,
  buildDocumentImportActivityPayload,
  classifyDraftRow,
  isDocumentImportPayloadImportable,
} from './UploadPage';
import {
  CALCULATION_REVIEW_ROUTE,
  DATA_RECORDS_ROUTE,
  INPUT_DATA_ROUTE,
  INPUT_REVIEW_ROUTE,
  REPORTS_ROUTE,
} from '../constants/routes';
import {
  DuplicateDocumentError,
  deleteDocument,
  getDocuments,
  uploadDocument,
} from '../services/documents';
import { ApiError } from '../services/api';
import {
  DuplicateDocumentImportError,
  confirmDocumentImport,
  extractDocument,
  getDocumentExtraction,
} from '../services/documentExtraction';
import { calculateMetrics } from '../services/metrics';
import {
  createActivityData,
  getAllActivityData,
} from '../services/activityData';
import { getAllConversionFactors } from '../services/conversionFactors';
import { trackActivityEvent } from '../services/activityEvents';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function LocationStateProbe() {
  const location = useLocation();
  return (
    <div>
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
      <div data-testid="location-state">{JSON.stringify(location.state ?? null)}</div>
    </div>
  );
}

vi.mock('../components/ExcelInputTable', () => ({
  ExcelInputTable: ({
    mode = 'manual',
    onSuccess,
  }: {
    mode?: 'spreadsheet' | 'manual';
    onSuccess?: (result?: { source: 'manual' | 'spreadsheet'; sourceDocumentId?: string }) => void | Promise<void>;
  }) =>
    mode === 'spreadsheet' ? (
      <div>
        <h3>Spreadsheet rows</h3>
        <p>Import a CSV/XLSX file or paste rows from Excel.</p>
        <strong>No spreadsheet rows yet.</strong>
        <span>Choose a spreadsheet file above or paste rows from Excel.</span>
        <button
          type="button"
          onClick={() =>
            void onSuccess?.({
              source: 'spreadsheet',
              sourceDocumentId: 'spreadsheet-source-1',
            })
          }
        >
          Mock spreadsheet save
        </button>
      </div>
    ) : (
      <div>
        <h3>Manual activity rows</h3>
        <p>Enter one activity record manually when no file is available.</p>
        <button type="button">Add activity record</button>
        <strong>No manual activity rows yet.</strong>
      </div>
    ),
}));

vi.mock('../components/AppDialog', () => ({
  useAppDialog: () => ({
    confirm: vi.fn(async () => true),
    showError: vi.fn(),
  }),
}));

vi.mock('../services/documents', () => ({
  DuplicateDocumentError: class DuplicateDocumentError extends Error {
    constructor(public readonly existingDocument?: { id: string; fileName: string; createdAt: string }) {
      super('This file has already been uploaded.');
      this.name = 'DuplicateDocumentError';
    }
  },
  deleteDocument: vi.fn(),
  getDocuments: vi.fn(() =>
    Promise.resolve({
      items: [],
      page: 1,
      pageSize: 0,
      total: 0,
      totalPages: 1,
    }),
  ),
  uploadDocument: vi.fn(),
}));

vi.mock('../services/documentExtraction', () => ({
  DuplicateDocumentImportError: class DuplicateDocumentImportError extends Error {
    constructor() {
      super('This document has already been imported.');
      this.name = 'DuplicateDocumentImportError';
    }
  },
  confirmDocumentImport: vi.fn(),
  extractDocument: vi.fn(),
  getDocumentExtraction: vi.fn(),
}));

vi.mock('../services/metrics', () => ({
  calculateMetrics: vi.fn(),
}));

vi.mock('../services/activityData', () => ({
  createActivityData: vi.fn(),
  getAllActivityData: vi.fn(),
}));

vi.mock('../services/activityEvents', () => ({
  trackActivityEvent: vi.fn(() => Promise.resolve({ id: 'event-1' })),
}));

vi.mock('../services/conversionFactors', () => ({
  getAllConversionFactors: vi.fn(() => Promise.resolve([])),
}));

describe('UploadPage sample workflow', () => {
  const failedDocument = {
    id: 'doc-1',
    fileName: 'failed-invoice.pdf',
    fileUrl: '',
    type: 'PDF',
    status: 'EXTRACTION_FAILED',
    fileSize: 100,
    createdAt: '2026-05-31T00:00:00.000Z',
    updatedAt: '2026-05-31T00:00:00.000Z',
  };
  const defaultConversionFactors = [
    {
      id: 'factor-electricity-ab-2026',
      name: 'Electricity - Alberta - 2026',
      type: 'EMISSION',
      activityType: 'ELECTRICITY',
      inputUnit: 'kWh',
      unit: 'kWh',
      factorValue: 0.53,
      resultUnit: 'kgCO2e',
      sourceYear: 2026,
      effectiveYear: 2026,
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      isDefault: true,
      isSystemDefault: true,
    },
    {
      id: 'factor-electricity-bc-2026',
      name: 'Electricity - British Columbia - 2026',
      type: 'EMISSION',
      activityType: 'ELECTRICITY',
      inputUnit: 'kWh',
      unit: 'kWh',
      factorValue: 0.02,
      resultUnit: 'kgCO2e',
      sourceYear: 2026,
      effectiveYear: 2026,
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'British Columbia',
      isDefault: true,
      isSystemDefault: true,
    },
    {
      id: 'factor-electricity-on-2026',
      name: 'Electricity - Ontario - 2026',
      type: 'EMISSION',
      activityType: 'ELECTRICITY',
      inputUnit: 'kWh',
      unit: 'kWh',
      factorValue: 0.12,
      resultUnit: 'kgCO2e',
      sourceYear: 2026,
      effectiveYear: 2026,
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Ontario',
      isDefault: true,
      isSystemDefault: true,
    },
    {
      id: 'factor-natural-gas-canada-2025',
      name: 'Natural Gas - Canada - 2025',
      type: 'EMISSION',
      activityType: 'NATURAL_GAS',
      inputUnit: 'm3',
      unit: 'm3',
      factorValue: 1.89,
      resultUnit: 'kgCO2e',
      sourceYear: 2025,
      effectiveYear: 2025,
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Canada',
      isDefault: true,
      isSystemDefault: true,
    },
    {
      id: 'factor-gasoline-canada-2025',
      name: 'Gasoline - Canada - 2025',
      type: 'EMISSION',
      activityType: 'GASOLINE',
      inputUnit: 'liters',
      unit: 'liters',
      factorValue: 2.31,
      resultUnit: 'kgCO2e',
      sourceYear: 2025,
      effectiveYear: 2025,
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Canada',
      isDefault: true,
      isSystemDefault: true,
    },
    {
      id: 'factor-diesel-canada-2025',
      name: 'Diesel - Canada - 2025',
      type: 'EMISSION',
      activityType: 'DIESEL',
      inputUnit: 'liters',
      unit: 'liters',
      factorValue: 2.68,
      resultUnit: 'kgCO2e',
      sourceYear: 2025,
      effectiveYear: 2025,
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Canada',
      isDefault: true,
      isSystemDefault: true,
    },
    {
      id: 'factor-air-travel-canada-2025',
      name: 'Air Travel - Canada - 2025',
      type: 'EMISSION',
      activityType: 'AIR_TRAVEL',
      inputUnit: 'km',
      unit: 'km',
      factorValue: 0.115,
      resultUnit: 'kgCO2e',
      sourceYear: 2025,
      effectiveYear: 2025,
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Canada',
      isDefault: true,
      isSystemDefault: true,
    },
    {
      id: 'factor-ground-transport-canada-2025',
      name: 'Ground Transport - Canada - 2025',
      type: 'EMISSION',
      activityType: 'GROUND_TRANSPORT',
      inputUnit: 'km',
      unit: 'km',
      factorValue: 0.2,
      resultUnit: 'kgCO2e',
      sourceYear: 2025,
      effectiveYear: 2025,
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Canada',
      isDefault: true,
      isSystemDefault: true,
    },
    {
      id: 'factor-hotel-canada-2025',
      name: 'Business Travel - Accommodation - Canada - 2025',
      type: 'EMISSION',
      activityType: 'HOTEL',
      inputUnit: 'nights',
      unit: 'nights',
      factorValue: 15,
      resultUnit: 'kgCO2e',
      sourceYear: 2025,
      effectiveYear: 2025,
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Canada',
      isDefault: true,
      isSystemDefault: true,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'admin@example.com',
        role: 'ADMIN',
        accountType: 'CUSTOMER',
        organizationId: 'org-1',
      }),
    );
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    vi.mocked(getDocuments).mockReset();
    vi.mocked(deleteDocument).mockReset();
    vi.mocked(uploadDocument).mockReset();
    vi.mocked(extractDocument).mockReset();
    vi.mocked(getDocumentExtraction).mockReset();
    vi.mocked(confirmDocumentImport).mockReset();
    vi.mocked(calculateMetrics).mockReset();
    vi.mocked(createActivityData).mockReset();
    vi.mocked(getAllActivityData).mockReset();
    vi.mocked(getAllConversionFactors).mockReset();
    vi.mocked(getDocuments).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 0,
      total: 0,
      totalPages: 1,
    });
    vi.mocked(deleteDocument).mockResolvedValue({
      deletedDocument: true,
      deletedActivityRecords: 0,
    });
    vi.mocked(uploadDocument).mockResolvedValue({
      id: 'uploaded-doc',
      fileName: 'uploaded.pdf',
      fileUrl: '',
      type: 'PDF',
      status: 'UPLOADED',
      createdAt: '2026-06-10T00:00:00.000Z',
      updatedAt: '2026-06-10T00:00:00.000Z',
    } as any);
    vi.mocked(confirmDocumentImport).mockImplementation(
      async (_documentId, activities) => ({
        count: activities.length,
        createdIds: activities.map((_, index) => `created-${index + 1}`),
        importBatchId: 'document-import-batch',
        alreadyImported: false,
      }),
    );
    vi.mocked(calculateMetrics).mockResolvedValue({ count: 0, items: [] });
    vi.mocked(createActivityData).mockResolvedValue({ id: 'created-fallback-1' } as any);
    vi.mocked(getAllActivityData).mockResolvedValue([]);
    vi.mocked(getAllConversionFactors).mockResolvedValue(defaultConversionFactors as any);
  });

  it('classifies tracked-only Water rows as importable tracked metrics, not review errors', () => {
    const row = {
      selected: true,
      documentId: 'doc-water',
      documentFileName: 'pilot-golden-dataset.csv',
      dateEstimated: false,
      activityType: { value: 'Water', confidence: 'high' },
      recordDate: { value: '2026-07-20', confidence: 'high' },
      quantity: { value: 100, confidence: 'high' },
      unit: { value: 'm3', confidence: 'high' },
      jurisdictionCountry: { value: 'Canada', confidence: 'high' },
      jurisdictionRegion: { value: '', confidence: 'high' },
      facilityName: { value: '', confidence: 'medium' },
      sourceReference: { value: 'pilot-golden-dataset.csv', confidence: 'high' },
      matchingStatus: 'TRACKED_ONLY',
      reportTreatment: 'TRACKED_ONLY',
      scope: 'TRACKED_METRIC',
      calculationStatus: 'TRACKED_ONLY',
      calculationMessage: 'Water usage is tracked only and excluded from GHG emissions totals.',
      notes: { value: 'Water tracked only', confidence: 'high' },
    } as const;

    expect(classifyDraftRow(row)).toBe('TRACKED_METRIC');
  });

  it('classifies Diesel 240 kg unit mismatch rows as requiring review before confirm import', () => {
    const row = {
      selected: true,
      documentId: 'doc-diesel',
      documentFileName: 'carbonlite_needs_review_test.xlsx',
      dateEstimated: false,
      activityType: { value: 'Diesel', confidence: 'high' },
      recordDate: { value: '2026-03-06', confidence: 'high' },
      quantity: { value: 240, confidence: 'high' },
      unit: { value: 'kg', confidence: 'high' },
      jurisdictionCountry: { value: 'Canada', confidence: 'high' },
      jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
      facilityName: { value: '', confidence: 'medium' },
      sourceReference: { value: 'carbonlite_needs_review_test.xlsx', confidence: 'high' },
      matchingStatus: 'UNIT_MISMATCH',
      reportTreatment: 'EXCLUDED',
      scope: 'SCOPE_1',
      calculationStatus: 'UNIT_MISMATCH',
      calculationMessage: 'Diesel is in kg, but the available factor uses liters.',
      notes: { value: '', confidence: 'medium' },
    } as const;

    expect(classifyDraftRow(row)).toBe('REQUIRES_REVIEW');
  });

  it('shows missing province ahead of stale missing factor and re-matches Electricity after setting Alberta', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'electricity-missing-province-doc',
          fileName: 'carbonlite_needs_review_test.xlsx',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'electricity-missing-province-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'Electricity',
          recordDate: '2026-03-01',
          quantity: 980,
          unit: 'kWh',
          country: 'Canada',
          province: '',
          matchingStatus: 'MISSING_FACTOR',
          reportTreatment: 'EXCLUDED',
          calculationStatus: 'MISSING_FACTOR',
          calculationMessage: 'Stale saved status from Save All.',
          sourceRow: 2,
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: false,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    const electricityRow = await screen.findByDisplayValue('Electricity');
    const row = electricityRow.closest('tr');
    expect(row).toBeTruthy();
    expect(within(row!).getAllByText('Missing Province').length).toBeGreaterThan(0);
    expect(within(row!).queryByText('Missing Factor')).not.toBeInTheDocument();
    expect(screen.getByText('Missing province helper')).toBeInTheDocument();
    expect(screen.getByText('Row 1: Missing Province')).toBeInTheDocument();

    const helper = screen.getByText('Missing province helper').closest('div')?.parentElement;
    expect(helper).toBeTruthy();
    await userEvent.selectOptions(
      within(helper!).getByRole('combobox', { name: 'Province' }),
      'Alberta',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Set Province' }));

    await waitFor(() => {
      expect(within(row!).getByDisplayValue('Alberta')).toBeInTheDocument();
      expect(within(row!).getByText('Ready')).toBeInTheDocument();
    });
    expect(within(row!).queryByText('Missing Province')).not.toBeInTheDocument();
    expect(within(row!).queryByText('Missing Factor')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    const importedActivities = vi.mocked(confirmDocumentImport).mock.calls[0][1];
    expect(importedActivities).toEqual([
      expect.objectContaining({
        activityType: 'ELECTRICITY',
        quantity: 980,
        unit: 'kWh',
        jurisdictionRegion: 'Alberta',
        matchedFactorName: 'Electricity - Alberta - 2026',
        matchedFactorValue: 0.53,
        matchingStatus: 'MATCHED',
        reportTreatment: 'INCLUDED',
        calculationStatus: 'CALCULATED',
        calculatedEmissionsKgCO2e: 519.4,
      }),
    ]);
  }, 20000);

  it('keeps MARCH-ELEC-001 ready while MARCH-ELEC-002 remains missing province in the same review table', async () => {
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      {
        id: 'electricity-alberta-2025',
        factorType: 'SYSTEM',
        name: 'Electricity - Alberta',
        type: 'EMISSION',
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        unit: 'kWh',
        factorValue: 0.53,
        resultUnit: 'kgCO2e',
        sourceYear: 2025,
        effectiveYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
      },
    ] as any);
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'two-electricity-doc',
          fileName: 'carbonlite_needs_review_test.xlsx',
          type: 'SPREADSHEET',
          status: 'REVIEW_REQUIRED',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(getDocumentExtraction).mockResolvedValue({
      documentId: 'two-electricity-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          rowId: 'row-march-elec-001',
          status: 'READY',
          activityType: 'Electricity',
          recordDate: '2026-03-01',
          quantity: 980,
          unit: 'kWh',
          country: 'Canada',
          province: 'Alberta',
          facilityName: 'Calgary HQ',
          sourceReference: 'MARCH-ELEC-001',
          notes: 'Valid row',
          matchingStatus: 'MATCHED',
          reportTreatment: 'INCLUDED',
          scope: 'SCOPE_2',
          matchedFactorId: 'electricity-alberta-2025',
          matchedFactorName: 'Electricity - Alberta',
          matchedFactorSourceYear: 2025,
          matchedFactorValue: 0.53,
          calculatedEmissionsKgCO2e: 519.4,
          calculationStatus: 'CALCULATED',
          sourceRow: 2,
        },
        {
          rowId: 'row-march-elec-002',
          status: 'MISSING_PROVINCE',
          activityType: 'Electricity',
          recordDate: '2026-03-02',
          quantity: 760,
          unit: 'kWh',
          country: 'Canada',
          province: '',
          facilityName: 'Calgary Warehouse',
          sourceReference: 'MARCH-ELEC-002',
          notes: 'Missing province — should need review',
          matchingStatus: 'MISSING_PROVINCE',
          reportTreatment: 'EXCLUDED',
          scope: 'SCOPE_2',
          calculationStatus: 'MISSING_PROVINCE',
          sourceRow: 3,
        },
      ],
      sourceRowCount: 2,
      extractedRowCount: 2,
      possibleMissingRows: false,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Review Rows/i }));

    const rowA = screen.getByDisplayValue('MARCH-ELEC-001').closest('tr');
    const rowB = screen.getByDisplayValue('MARCH-ELEC-002').closest('tr');
    expect(rowA).toBeTruthy();
    expect(rowB).toBeTruthy();

    expect(within(rowA!).getByDisplayValue('Alberta')).toBeInTheDocument();
    expect(within(rowA!).getByText('Ready')).toBeInTheDocument();
    expect(within(rowA!).queryByText('Missing Factor')).not.toBeInTheDocument();
    expect(within(rowA!).queryByText('Missing Province')).not.toBeInTheDocument();
    expect(within(rowA!).getByRole('checkbox', { name: 'Select preview row 1' })).toBeChecked();
    expect(screen.queryByText('Row 1: Missing Factor')).not.toBeInTheDocument();
    expect(screen.queryByText('Row 1: Missing Province')).not.toBeInTheDocument();

    expect(within(rowB!).getByPlaceholderText('Province')).toHaveValue('');
    expect(within(rowB!).getAllByText('Missing Province').length).toBeGreaterThan(0);
    expect(within(rowB!).queryByText('Missing Factor')).not.toBeInTheDocument();
    expect(within(rowB!).getByRole('checkbox', { name: 'Select preview row 2' })).not.toBeChecked();
    expect(within(rowB!).getByRole('checkbox', { name: 'Select preview row 2' })).toBeDisabled();
    expect(screen.getByText('Missing province helper')).toBeInTheDocument();
    expect(screen.getByText('Row 2: Missing Province')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    const importedActivities = vi.mocked(confirmDocumentImport).mock.calls[0][1];
    expect(importedActivities).toHaveLength(1);
    expect(importedActivities[0]).toEqual(
      expect.objectContaining({
        activityType: 'ELECTRICITY',
        recordDate: '2026-03-01',
        quantity: 980,
        unit: 'kWh',
        jurisdictionRegion: 'Alberta',
        sourceReference: 'MARCH-ELEC-001',
        sourceRow: 2,
        matchedFactorName: 'Electricity - Alberta',
        matchedFactorSourceYear: 2025,
        matchedFactorValue: 0.53,
        matchingStatus: 'MATCHED',
        reportTreatment: 'INCLUDED',
        calculationStatus: 'CALCULATED',
        calculatedEmissionsKgCO2e: 519.4,
      }),
    );
    expect(importedActivities).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceReference: 'MARCH-ELEC-002' }),
      ]),
    );
  }, 20000);

  it('keeps only unimported actionable review rows after confirming workbook rows', async () => {
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      {
        id: 'factor-electricity-ab-2026',
        factorType: 'SYSTEM',
        name: 'Electricity - Alberta - 2026',
        type: 'EMISSION',
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        unit: 'kWh',
        factorValue: 0.53,
        resultUnit: 'kgCO2e',
        sourceYear: 2026,
        effectiveYear: 2026,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
      },
      {
        id: 'factor-hotel-on-2026',
        factorType: 'SYSTEM',
        name: 'Business Travel - Accommodation - Ontario - 2026',
        type: 'EMISSION',
        activityType: 'HOTEL',
        inputUnit: 'nights',
        unit: 'nights',
        factorValue: 15,
        resultUnit: 'kgCO2e',
        sourceYear: 2026,
        effectiveYear: 2026,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Ontario',
      },
      {
        id: 'factor-diesel-liters-2026',
        factorType: 'SYSTEM',
        name: 'Diesel - Canada - 2026',
        type: 'EMISSION',
        activityType: 'DIESEL',
        inputUnit: 'liters',
        unit: 'liters',
        factorValue: 2.68,
        resultUnit: 'kgCO2e',
        sourceYear: 2026,
        effectiveYear: 2026,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Canada',
      },
    ] as any);
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'needs-review-workbook-doc',
          fileName: 'carbonlite_needs_review_test.xlsx',
          type: 'SPREADSHEET',
          status: 'REVIEW_REQUIRED',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });

    const allReviewRows = [
      { activityType: 'Electricity', recordDate: '2026-03-01', quantity: 980, unit: 'kWh', country: 'Canada', province: 'Alberta', facilityName: 'Calgary HQ', sourceReference: 'MARCH-ELEC-001', sourceRow: 2 },
      { activityType: 'Electricity', recordDate: '2026-03-02', quantity: 760, unit: 'kWh', country: 'Canada', province: '', facilityName: 'Calgary Warehouse', sourceReference: 'MARCH-ELEC-002', sourceRow: 3 },
      { activityType: 'Natural Gas', recordDate: '2026-03-03', quantity: 120, unit: '', country: 'Canada', province: 'Alberta', sourceReference: 'MARCH-GAS-003', sourceRow: 4 },
      { activityType: 'Gasoline', recordDate: '2026-03-04', quantity: 'approx 50', unit: 'liters', country: 'Canada', province: 'Alberta', sourceReference: 'MARCH-FUEL-004', sourceRow: 5 },
      { activityType: 'CUSTOM', recordDate: '2026-03-05', quantity: 12, unit: 'widgets', country: 'Canada', province: 'Alberta', sourceReference: 'MARCH-OTHER-005', sourceRow: 6 },
      { activityType: 'Diesel', recordDate: '2026-03-06', quantity: 240, unit: 'kg', country: 'Canada', province: 'Alberta', sourceReference: 'MARCH-DIESEL-006', sourceRow: 7 },
      { activityType: 'Water', recordDate: '2026-03-07', quantity: 18, unit: 'm3', country: 'Canada', province: 'Alberta', sourceReference: 'MARCH-WATER-007', matchingStatus: 'TRACKED_ONLY', reportTreatment: 'TRACKED_ONLY', scope: 'TRACKED_METRIC', calculationStatus: 'TRACKED_ONLY', sourceRow: 8 },
      { activityType: 'Air Travel', recordDate: '2026-03-08', quantity: null, unit: 'km', country: 'Canada', province: 'Alberta', sourceReference: 'MARCH-AIR-008', sourceRow: 9 },
      { activityType: 'Business Travel - Accommodation', recordDate: '2026-03-10', quantity: 4, unit: 'nights', country: 'Canada', province: 'Ontario', sourceReference: 'MARCH-HOTEL-010', sourceRow: 11 },
    ] as any[];
    vi.mocked(getDocumentExtraction)
      .mockResolvedValueOnce({
        documentId: 'needs-review-workbook-doc',
        status: 'REVIEW_REQUIRED',
        parsedActivities: allReviewRows,
        sourceRowCount: 10,
        extractedRowCount: 9,
        possibleMissingRows: false,
        warning: null,
      })
      .mockResolvedValueOnce({
        documentId: 'needs-review-workbook-doc',
        status: 'REVIEW_REQUIRED',
        parsedActivities: allReviewRows,
        sourceRowCount: 10,
        extractedRowCount: 9,
        possibleMissingRows: false,
        warning: null,
      })
      .mockResolvedValueOnce({
        documentId: 'needs-review-workbook-doc',
        status: 'REVIEW_REQUIRED',
        parsedActivities: allReviewRows,
        sourceRowCount: 10,
        extractedRowCount: 9,
        possibleMissingRows: false,
        warning: null,
      });
    vi.mocked(getAllActivityData).mockImplementation(async () => {
      const confirmedCount = vi.mocked(confirmDocumentImport).mock.calls.length;
      const importedRows = allReviewRows.filter((row) =>
        [
          'MARCH-ELEC-001',
          'MARCH-WATER-007',
          'MARCH-HOTEL-010',
          ...(confirmedCount >= 2 ? ['MARCH-DIESEL-006'] : []),
        ].includes(row.sourceReference),
      );

      return importedRows.map((row, index) => ({
        id: `existing-${index + 1}`,
        sourceDocumentId: 'needs-review-workbook-doc',
        sourceRow: row.sourceRow,
        sourceReference: row.sourceReference,
        activityType: row.activityType,
        recordDate: row.recordDate,
        quantity: row.quantity,
        unit: row.unit === 'kg' && row.sourceReference === 'MARCH-DIESEL-006' ? 'liters' : row.unit,
      })) as any;
    });
    vi.mocked(confirmDocumentImport).mockResolvedValueOnce({
      count: 3,
      createdIds: ['created-electricity', 'created-water', 'created-hotel'],
      createdRecordKeys: [
        'needs-review-workbook-doc::row:2',
        'needs-review-workbook-doc::row:8',
        'needs-review-workbook-doc::row:11',
      ],
      importBatchId: 'document-needs-review-workbook-doc',
      alreadyImported: false,
    }).mockResolvedValueOnce({
      count: 1,
      createdIds: ['created-diesel'],
      createdRecordKeys: ['needs-review-workbook-doc::row:7'],
      importBatchId: 'document-needs-review-workbook-doc',
      alreadyImported: false,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Review Rows/i }));

    expect(await screen.findByText('Extracted rows: 9')).toBeInTheDocument();
    expect(screen.getByText('Ready: 2 · Tracked metrics: 1 · Requires review: 6 · Selected for import: 3')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Select preview row/i)).toHaveLength(9);
    expect(screen.getByDisplayValue('MARCH-ELEC-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-HOTEL-010')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-WATER-007')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(confirmDocumentImport).mock.calls[0][1]).toHaveLength(3);
    expect(calculateMetrics).toHaveBeenCalledWith([
      'created-electricity',
      'created-water',
      'created-hotel',
    ]);

    expect(
      await screen.findByText(/Imported 3 activity record\(s\).*6 rows were left in draft because they require review/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Extracted rows: 6')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Select preview row/i)).toHaveLength(6);
    expect(screen.queryByDisplayValue('MARCH-ELEC-001')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('MARCH-HOTEL-010')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('MARCH-WATER-007')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-ELEC-002')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-GAS-003')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-FUEL-004')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-OTHER-005')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-DIESEL-006')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-AIR-008')).toBeInTheDocument();
    expect(
      screen.getAllByLabelText(/Select preview row/i).filter((checkbox) => (checkbox as HTMLInputElement).checked),
    ).toHaveLength(0);
    expect(screen.queryByText('Extracted rows: 1')).not.toBeInTheDocument();
    expect(screen.queryByText('No extracted activities.')).not.toBeInTheDocument();

    const dieselRow = screen.getByDisplayValue('MARCH-DIESEL-006').closest('tr');
    expect(dieselRow).toBeTruthy();
    const dieselUnitInput = within(dieselRow!).getByDisplayValue('kg');
    fireEvent.change(dieselUnitInput, { target: { value: 'liters' } });
    await waitFor(() => {
      const updatedDieselRow = screen.getByDisplayValue('MARCH-DIESEL-006').closest('tr');
      expect(updatedDieselRow).toBeTruthy();
      expect(within(updatedDieselRow!).getByText('Ready')).toBeInTheDocument();
    });
    const updatedDieselRow = screen.getByDisplayValue('MARCH-DIESEL-006').closest('tr');
    expect(updatedDieselRow).toBeTruthy();
    const dieselCheckbox = within(updatedDieselRow!).getByLabelText(/Select preview row/i);
    await waitFor(() => {
      expect(dieselCheckbox).toBeEnabled();
    });
    fireEvent.click(dieselCheckbox);
    await waitFor(() => {
      const selectedDieselRow = screen.getByDisplayValue('MARCH-DIESEL-006').closest('tr');
      expect(selectedDieselRow).toBeTruthy();
      expect(within(selectedDieselRow!).getByLabelText(/Select preview row/i)).toBeChecked();
      expect(screen.getByRole('button', { name: 'Confirm Import' })).toBeEnabled();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(2);
    });
    expect(vi.mocked(confirmDocumentImport).mock.calls[1][1]).toHaveLength(1);
    expect(vi.mocked(confirmDocumentImport).mock.calls[1][1][0]).toMatchObject({
      sourceReference: 'MARCH-DIESEL-006',
      unit: 'liters',
    });
    expect(
      await screen.findByText(/Imported 1 activity record\(s\).*5 rows were left in draft because they require review/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Extracted rows: 5')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('MARCH-DIESEL-006')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-ELEC-002')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-GAS-003')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-FUEL-004')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-OTHER-005')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MARCH-AIR-008')).toBeInTheDocument();
    expect(
      screen.getAllByLabelText(/Select preview row/i).filter((checkbox) => (checkbox as HTMLInputElement).checked),
    ).toHaveLength(0);
  }, 30000);

  it('rejects unit mismatch import payloads even when stale included signals are present', () => {
    expect(
      isDocumentImportPayloadImportable({
        activityType: 'DIESEL',
        quantity: 240,
        unit: 'kg',
        matchingStatus: 'UNIT_MISMATCH',
        calculationStatus: 'CALCULATED',
        reportTreatment: 'INCLUDED',
        scope: 'SCOPE_1',
      } as any),
    ).toBe(false);

    expect(
      isDocumentImportPayloadImportable({
        activityType: 'WATER',
        quantity: 18,
        unit: 'm3',
        matchingStatus: 'TRACKED_ONLY',
        calculationStatus: 'TRACKED_ONLY',
        reportTreatment: 'TRACKED_ONLY',
        scope: 'TRACKED_METRIC',
      } as any),
    ).toBe(true);

    expect(
      isDocumentImportPayloadImportable({
        activityType: 'GASOLINE',
        quantity: null,
        unit: 'L',
        matchingStatus: 'MATCHED',
        calculationStatus: 'CALCULATED',
        reportTreatment: 'INCLUDED',
        scope: 'SCOPE_1',
      } as any),
    ).toBe(false);

    expect(
      isDocumentImportPayloadImportable({
        activityType: 'AIR_TRAVEL',
        quantity: undefined,
        unit: 'km',
        matchingStatus: 'MATCHED',
        calculationStatus: 'CALCULATED',
        reportTreatment: 'INCLUDED',
        scope: 'SCOPE_3',
      } as any),
    ).toBe(false);

    expect(
      classifyDraftRow({
        rowId: 'gas-stale-ready-metadata',
        selected: true,
        documentId: 'doc-gas',
        documentFileName: 'carbonlite_needs_review_test.xlsx',
        status: 'NEEDS_REVIEW',
        dateEstimated: false,
        activityType: { value: 'Gasoline', confidence: 'high' },
        recordDate: { value: '2026-03-04', confidence: 'high' },
        quantity: { value: 10, confidence: 'high' },
        unit: { value: 'L', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
        facilityName: { value: 'Fleet', confidence: 'medium' },
        sourceReference: { value: 'MARCH-FUEL-004', confidence: 'high' },
        matchingStatus: 'MATCHED',
        calculationStatus: 'CALCULATED',
        reportTreatment: 'INCLUDED',
        notes: { value: '', confidence: 'medium' },
      } as any),
    ).toBe('REQUIRES_REVIEW');
  });

  it('builds Diesel 240 Canada Alberta as blocked for kg and eligible after unit is fixed', () => {
    const baseRow = {
      selected: true,
      documentId: 'doc-diesel',
      documentFileName: 'carbonlite_needs_review_test.xlsx',
      dateEstimated: false,
      activityType: { value: 'Diesel', confidence: 'high' },
      recordDate: { value: '2026-03-06', confidence: 'high' },
      quantity: { value: 240, confidence: 'high' },
      unit: { value: 'kg', confidence: 'high' },
      jurisdictionCountry: { value: 'Canada', confidence: 'high' },
      jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
      facilityName: { value: '', confidence: 'medium' },
      sourceReference: { value: 'carbonlite_needs_review_test.xlsx', confidence: 'high' },
      notes: { value: '', confidence: 'medium' },
    } as const;
    const factors = [
      {
        id: 'factor-diesel-canada-2025',
        name: 'Diesel - Canada - 2025',
        type: 'EMISSION',
        activityType: 'DIESEL',
        inputUnit: 'liters',
        unit: 'liters',
        factorValue: 2.68,
        resultUnit: 'kgCO2e',
        sourceYear: 2025,
        effectiveYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Canada',
        isDefault: true,
        isSystemDefault: true,
      },
    ] as any;

    const kgPayload = buildDocumentImportActivityPayload({
      item: baseRow as any,
      documentId: 'doc-diesel',
      sourceFileName: 'carbonlite_needs_review_test.xlsx',
      importBatchId: 'document-doc-diesel',
      conversionFactors: factors,
    });
    expect(kgPayload).toMatchObject({
      matchingStatus: 'UNIT_MISMATCH',
      calculationStatus: 'UNIT_MISMATCH',
      reportTreatment: 'EXCLUDED',
    });
    expect(isDocumentImportPayloadImportable(kgPayload)).toBe(false);

    const litersPayload = buildDocumentImportActivityPayload({
      item: {
        ...baseRow,
        unit: { value: 'liters', confidence: 'high' },
      } as any,
      documentId: 'doc-diesel',
      sourceFileName: 'carbonlite_needs_review_test.xlsx',
      importBatchId: 'document-doc-diesel',
      conversionFactors: factors,
    });
    expect(litersPayload).toMatchObject({
      activityType: 'DIESEL',
      quantity: 240,
      unit: 'liters',
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      reportTreatment: 'INCLUDED',
    });
    expect(isDocumentImportPayloadImportable(litersPayload)).toBe(true);
  });

  it('builds the needs-review workbook rows as 3 importable records and 2 calculated emissions records', () => {
    const factors = [
      {
        id: 'factor-electricity-ab-2026',
        name: 'Electricity - Alberta - 2026',
        type: 'EMISSION',
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        unit: 'kWh',
        factorValue: 0.53,
        resultUnit: 'kgCO2e',
        sourceYear: 2026,
        effectiveYear: 2026,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        isDefault: true,
        isSystemDefault: true,
      },
      {
        id: 'factor-diesel-canada-2025',
        name: 'Diesel - Canada - 2025',
        type: 'EMISSION',
        activityType: 'DIESEL',
        inputUnit: 'liters',
        unit: 'liters',
        factorValue: 2.68,
        resultUnit: 'kgCO2e',
        sourceYear: 2025,
        effectiveYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Canada',
        isDefault: true,
        isSystemDefault: true,
      },
      {
        id: 'factor-hotel-canada-2025',
        name: 'Business Travel - Accommodation - Canada - 2025',
        type: 'EMISSION',
        activityType: 'HOTEL',
        inputUnit: 'nights',
        unit: 'nights',
        factorValue: 15,
        resultUnit: 'kgCO2e',
        sourceYear: 2025,
        effectiveYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Canada',
        isDefault: true,
        isSystemDefault: true,
      },
    ] as any;
    const base = {
      selected: true,
      documentId: 'needs-review-doc',
      documentFileName: 'carbonlite_needs_review_test.xlsx',
      dateEstimated: false,
      facilityName: { value: '', confidence: 'medium' },
      sourceReference: { value: 'carbonlite_needs_review_test.xlsx', confidence: 'high' },
      notes: { value: '', confidence: 'medium' },
    } as const;
    const rows = [
      {
        ...base,
        activityType: { value: 'Electricity', confidence: 'high' },
        recordDate: { value: '2026-03-01', confidence: 'high' },
        quantity: { value: 980, confidence: 'high' },
        unit: { value: 'kWh', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
      },
      {
        ...base,
        activityType: { value: 'Diesel', confidence: 'high' },
        recordDate: { value: '2026-03-06', confidence: 'high' },
        quantity: { value: 240, confidence: 'high' },
        unit: { value: 'kg', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
      },
      {
        ...base,
        activityType: { value: 'Water', confidence: 'high' },
        recordDate: { value: '2026-03-07', confidence: 'high' },
        quantity: { value: 18, confidence: 'high' },
        unit: { value: 'm3', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
      },
      {
        ...base,
        activityType: { value: 'Business Travel - Accommodation', confidence: 'high' },
        recordDate: { value: '2026-03-10', confidence: 'high' },
        quantity: { value: 4, confidence: 'high' },
        unit: { value: 'nights', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Ontario', confidence: 'high' },
      },
    ];
    const payloads = rows.map((item) =>
      buildDocumentImportActivityPayload({
        item: item as any,
        documentId: 'needs-review-doc',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        importBatchId: 'document-needs-review-doc',
        conversionFactors: factors,
      }),
    );
    const importable = payloads.filter(isDocumentImportPayloadImportable);
    const calculated = importable.filter((payload) => payload.reportTreatment === 'INCLUDED');

    expect(importable.map((payload) => payload.activityType).sort()).toEqual([
      'ELECTRICITY',
      'HOTEL',
      'WATER',
    ]);
    expect(payloads.find((payload) => payload.activityType === 'DIESEL')).toMatchObject({
      matchingStatus: 'UNIT_MISMATCH',
      reportTreatment: 'EXCLUDED',
      calculationStatus: 'UNIT_MISMATCH',
    });
    expect(calculated).toHaveLength(2);
    const waterPayload = importable.find((payload) => payload.activityType === 'WATER');
    expect(waterPayload).toMatchObject({
      scope: 'TRACKED_METRIC',
      reportTreatment: 'TRACKED_ONLY',
    });
    expect(waterPayload?.calculatedEmissionsKgCO2e).toBeUndefined();
    expect(importable.find((payload) => payload.activityType === 'ELECTRICITY')).toMatchObject({
      scope: 'SCOPE_2',
      calculatedEmissionsKgCO2e: 519.4,
    });
    expect(importable.find((payload) => payload.activityType === 'HOTEL')).toMatchObject({
      scope: 'SCOPE_3',
      calculatedEmissionsKgCO2e: 60,
    });
    expect(
      calculated.reduce((total, payload) => total + Number(payload.calculatedEmissionsKgCO2e ?? 0), 0),
    ).toBe(579.4);
  });

  it('preserves Site / Facility on document import payloads', () => {
    const payload = buildDocumentImportActivityPayload({
      item: {
        selected: true,
        documentId: 'facility-doc',
        documentFileName: 'facility-import.xlsx',
        dateEstimated: false,
        activityType: { value: 'Natural Gas', confidence: 'high' },
        recordDate: { value: '2026-07-20', confidence: 'high' },
        quantity: { value: 1000, confidence: 'high' },
        unit: { value: 'm3', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
        facilityName: { value: 'Edmonton Factory', confidence: 'high' },
        sourceReference: { value: 'facility-import.xlsx', confidence: 'high' },
        notes: { value: '', confidence: 'medium' },
      },
      documentId: 'facility-doc',
      sourceFileName: 'facility-import.xlsx',
      importBatchId: 'facility-import-batch',
      conversionFactors: [],
      organizationId: 'org-1',
    });

    expect(payload.facility).toBe('Edmonton Factory');
    expect(payload.facilityId).toBeUndefined();
  });

  it('shows pilot reviewers a read-only sample review path instead of import tools', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'reviewer@example.com',
        role: 'VIEWER',
        accountType: 'PILOT_REVIEWER',
        organizationId: 'sample-workspace',
      }),
    );

    render(
      <MemoryRouter initialEntries={[{ pathname: '/', state: { focusInputMethod: 'documents' } }]}>
        <UploadPage />
      </MemoryRouter>,
    );

    const workflow = screen.getByLabelText(/CarbonLite input workflow/i);
    expect(workflow).toHaveTextContent('Input Data');
    expect(workflow).toHaveTextContent('Review extracted rows');
    expect(workflow).toHaveTextContent('Confirm activity records');
    expect(workflow).toHaveTextContent('Match emission factors');
    expect(workflow).toHaveTextContent('Review calculations');
    expect(workflow).toHaveTextContent('Generate report');
    expect(workflow).toHaveTextContent(
      'This reviewer account uses preloaded sample data and is read-only. Upload and import actions are disabled.',
    );
    expect(await screen.findByText(/sample data is already loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/pilot reviewer accounts use preloaded sample data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /data records/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /calculation review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reports/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /upload documents/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load sample data/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Manual activity rows')).not.toBeInTheDocument();
  });

  it('keeps customer viewers read-only without pilot-reviewer wording or Set Province controls', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'viewer@example.com',
        role: 'VIEWER',
        accountType: 'CUSTOMER',
        organizationId: 'org-1',
      }),
    );

    render(
      <MemoryRouter initialEntries={[{ pathname: '/', state: { focusInputMethod: 'documents' } }]}>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Read-only access: you can view existing records/i)).toBeInTheDocument();
    expect(screen.queryByText(/pilot reviewer accounts use preloaded sample data/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set Province' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm Import/i })).not.toBeInTheDocument();
  });

  it('allows customer users with workspace context to access upload and import workflows', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'user@example.com',
        role: 'USER',
        accountType: 'CUSTOMER',
        organizationId: 'org-1',
      }),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('tab', { name: /Upload Documents/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Import Spreadsheet/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Manual Entry/i })).toBeInTheDocument();
    expect(screen.queryByText(/Read-only access:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pilot reviewer accounts use preloaded sample data/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set Province' })).not.toBeInTheDocument();
  });

  it('clears Review Data sources when demo data reset is broadcast', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'doc-reset',
          fileName: 'stale-import.xlsx',
          fileUrl: '',
          type: 'SPREADSHEET',
          status: 'IMPORTED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('stale-import.xlsx')).toBeInTheDocument();

    window.dispatchEvent(new Event('carbonlite:demo-data-reset'));

    expect(await screen.findByText('No data sources to review yet.')).toBeInTheDocument();
    expect(screen.getByText('Upload documents or import a spreadsheet to create reviewable activity data.')).toBeInTheDocument();
    expect(screen.queryByText('stale-import.xlsx')).not.toBeInTheDocument();
  });

  it('keeps Input Data open after spreadsheet Save All and shows the spreadsheet source in Review Data', async () => {
    const savedSpreadsheetDocuments = {
      items: [
        {
          id: 'spreadsheet-source-1',
          fileName: 'carbonlite_needs_review_test.xlsx',
          fileUrl: 'spreadsheet-import://batch-1',
          type: 'SPREADSHEET',
          status: 'REVIEW_REQUIRED',
          fileSize: null,
          createdAt: '2026-09-28T16:00:00.000Z',
          updatedAt: '2026-09-28T16:00:00.000Z',
          sourceRowCount: 9,
          extractedRowCount: 9,
          importedRecordCount: 0,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    };

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: INPUT_DATA_ROUTE, state: { focusInputMethod: 'spreadsheet' } },
        ]}
      >
        <Routes>
          <Route
            path={INPUT_DATA_ROUTE}
            element={
              <>
                <LocationProbe />
                <UploadPage />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('No data sources to review yet.')).toBeInTheDocument();

    vi.mocked(getDocuments).mockResolvedValue(savedSpreadsheetDocuments);

    await userEvent.click(screen.getByRole('button', { name: 'Mock spreadsheet save' }));

    expect(screen.getByTestId('location')).toHaveTextContent(INPUT_DATA_ROUTE);
    expect(await screen.findByRole('heading', { level: 2, name: 'Review Data' })).toBeInTheDocument();
    expect(await screen.findByText('carbonlite_needs_review_test.xlsx')).toBeInTheDocument();
    expect(screen.getByText('Spreadsheet import')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review Selected Data' })).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Select document carbonlite_needs_review_test.xlsx'));
    expect(screen.getByRole('button', { name: 'Review Selected Data' })).toBeEnabled();
    expect(screen.getByText('Spreadsheet rows saved for review.')).toBeInTheDocument();
  });

  it('uses the current Save All source document id when duplicate filenames exist', async () => {
    vi.mocked(getDocuments)
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'old-spreadsheet-source',
            fileName: 'carbonlite_needs_review_test.xlsx',
            fileUrl: 'spreadsheet-import://old-batch',
            type: 'SPREADSHEET',
            status: 'REVIEW_REQUIRED',
            fileSize: null,
            createdAt: '2026-09-28T16:00:00.000Z',
            updatedAt: '2026-09-28T16:00:00.000Z',
            sourceRowCount: 9,
            extractedRowCount: 9,
            importedRecordCount: 0,
          },
          {
            id: 'spreadsheet-source-1',
            fileName: 'carbonlite_needs_review_test.xlsx',
            fileUrl: 'spreadsheet-import://new-batch',
            type: 'SPREADSHEET',
            status: 'REVIEW_REQUIRED',
            fileSize: null,
            createdAt: '2026-09-30T21:05:31.289Z',
            updatedAt: '2026-09-30T21:05:31.289Z',
            sourceRowCount: 9,
            extractedRowCount: 9,
            importedRecordCount: 0,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      });
    vi.mocked(getDocumentExtraction).mockResolvedValue({
      documentId: 'spreadsheet-source-1',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'Water',
          recordDate: '2026-03-07',
          quantity: 18,
          unit: 'm3',
          country: 'Canada',
          province: 'Alberta',
          sourceReference: 'MARCH-WATER-007',
          matchingStatus: 'TRACKED_ONLY',
          reportTreatment: 'TRACKED_ONLY',
          scope: 'TRACKED_METRIC',
          calculationStatus: 'TRACKED_ONLY',
          sourceRow: 8,
        },
      ] as any,
      sourceRowCount: 9,
      extractedRowCount: 9,
      possibleMissingRows: false,
      warning: null,
    });
    vi.mocked(confirmDocumentImport).mockResolvedValue({
      count: 1,
      createdIds: ['created-water'],
      createdRecordKeys: ['spreadsheet-source-1::row:8'],
      importBatchId: 'document-spreadsheet-source-1',
      alreadyImported: false,
    });

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: INPUT_DATA_ROUTE, state: { focusInputMethod: 'spreadsheet' } },
        ]}
      >
        <Routes>
          <Route path={INPUT_DATA_ROUTE} element={<UploadPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Mock spreadsheet save' }));

    expect(await screen.findByText(/Save All documentId: spreadsheet-source-1/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Review Selected Data' }));
    await waitFor(() => {
      expect(getDocumentExtraction).toHaveBeenCalledWith('spreadsheet-source-1');
    });

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    expect(confirmDocumentImport).toHaveBeenCalledWith(
      'spreadsheet-source-1',
      expect.any(Array),
      'document-spreadsheet-source-1',
    );
    expect(screen.getByText(/Confirm documentId: spreadsheet-source-1/i)).toBeInTheDocument();
  }, 15000);

  it('redirects the old Input Review URL to the Input Data review section', async () => {
    render(
      <MemoryRouter initialEntries={[INPUT_REVIEW_ROUTE]}>
        <Routes>
          <Route path={INPUT_REVIEW_ROUTE} element={<Navigate to={`${INPUT_DATA_ROUTE}?section=review`} replace />} />
          <Route
            path={INPUT_DATA_ROUTE}
            element={
              <>
                <LocationProbe />
                <UploadPage />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Input Data' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(`${INPUT_DATA_ROUTE}?section=review`);
    expect(screen.getByRole('heading', { level: 2, name: 'Review Data' })).toBeInTheDocument();
  });

  it('renders saved activity success destinations as semantic links', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: INPUT_DATA_ROUTE,
            state: {
              flashMessage:
                'Activity data saved. Review saved records in Data Records, Calculation Review, or Reports.',
            },
          },
        ]}
      >
        <Routes>
          <Route path={INPUT_DATA_ROUTE} element={<UploadPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Activity data saved/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Data Records' })).toHaveAttribute('href', DATA_RECORDS_ROUTE);
    expect(screen.getByRole('link', { name: 'Calculation Review' })).toHaveAttribute('href', CALCULATION_REVIEW_ROUTE);
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', REPORTS_ROUTE);
  });

  it('renders post-import review actions as pointer semantic buttons with unchanged destinations', async () => {
    function renderPostImportBanner() {
      return render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: INPUT_DATA_ROUTE,
              state: {
                flashMessage: 'Imported activity records. Generated emissions metrics.',
              },
            },
          ]}
        >
          <Routes>
            <Route
              path={INPUT_DATA_ROUTE}
              element={
                <>
                  <LocationProbe />
                  <UploadPage />
                </>
              }
            />
            <Route path={CALCULATION_REVIEW_ROUTE} element={<LocationProbe />} />
            <Route path={REPORTS_ROUTE} element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>,
      );
    }

    const firstRender = renderPostImportBanner();

    const calculationReviewButton = await screen.findByRole('button', {
      name: 'View Calculation Review',
    });
    const reportsButton = screen.getByRole('button', { name: 'View Reports' });

    expect(calculationReviewButton).toHaveClass('cursor-pointer');
    expect(calculationReviewButton).toHaveClass('input-data-post-import-action');
    expect(reportsButton).toHaveClass('cursor-pointer');
    expect(reportsButton).toHaveClass('input-data-post-import-action');

    await userEvent.click(calculationReviewButton);
    expect(screen.getByTestId('location')).toHaveTextContent(CALCULATION_REVIEW_ROUTE);

    firstRender.unmount();
    renderPostImportBanner();

    await userEvent.click(await screen.findByRole('button', { name: 'View Reports' }));
    expect(screen.getByTestId('location')).toHaveTextContent(REPORTS_ROUTE);
  });

  it('renders the Input Review row action menu in a fixed portal', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'demo-activity-csv',
          fileName: 'pilot-import.xlsx',
          fileUrl: '/demo/sample-activity-data.csv',
          type: 'SPREADSHEET',
          status: 'IMPORTED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
          importedRecordCount: 10,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 768,
    });

    const menuButton = await screen.findByRole('button', {
      name: /Open document actions for pilot-import.xlsx/i,
    });
    Object.defineProperty(menuButton, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 760,
        y: 120,
        top: 120,
        right: 794,
        bottom: 154,
        left: 760,
        width: 34,
        height: 34,
        toJSON: () => {},
      }),
    });

    await userEvent.click(menuButton);

    const menu = screen.getByRole('menu', {
      name: /More actions for pilot-import.xlsx/i,
    });
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveStyle({
      position: 'fixed',
      top: '160px',
      right: '230px',
      zIndex: '1000',
    });
    expect(within(menu).queryByRole('menuitem', { name: 'View' })).not.toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'View Details' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Download Source File' })).toBeInTheDocument();
    expect(within(menu).getByRole('separator')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Delete Source Document' })).toBeInTheDocument();

    await userEvent.click(within(menu).getByRole('menuitem', { name: 'View Details' }));

    expect(await screen.findByRole('dialog', { name: /Document Details/i })).toBeInTheDocument();
    expect(screen.getByText('Metadata for pilot-import.xlsx')).toBeInTheDocument();
    expect(screen.getByText('Imported record count')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(windowOpenSpy).not.toHaveBeenCalled();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Document Details/i })).not.toBeInTheDocument();
    });

    await userEvent.click(menuButton);
    await userEvent.click(
      within(screen.getByRole('menu', { name: /More actions for pilot-import.xlsx/i }))
        .getByRole('menuitem', { name: 'Download Source File' }),
    );

    expect(windowOpenSpy).toHaveBeenCalledWith(
      '/demo/sample-activity-data.csv',
      '_blank',
      'noopener,noreferrer',
    );

    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('deletes an unimported source document after confirmation', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'doc-ready-delete',
          fileName: 'ready-invoice.pdf',
          fileUrl: '',
          type: 'PDF',
          status: 'REVIEW_REQUIRED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: /Open document actions for ready-invoice.pdf/i }),
    );
    await userEvent.click(
      within(screen.getByRole('menu', { name: /More actions for ready-invoice.pdf/i }))
        .getByRole('menuitem', { name: 'Delete Source Document' }),
    );

    expect(await screen.findByRole('dialog', { name: /Delete source document/i })).toBeInTheDocument();
    expect(screen.getByText('This will remove the uploaded file and its extracted review rows.')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));

    await waitFor(() => {
      expect(deleteDocument).toHaveBeenCalledWith('doc-ready-delete');
    });
    expect(await screen.findByText('No data sources to review yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Upload documents or import a spreadsheet to create reviewable activity data.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Source document deleted.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Calculation Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Reports' })).not.toBeInTheDocument();
    expect(screen.queryByText('ready-invoice.pdf')).not.toBeInTheDocument();
  });

  it('warns that imported activity records remain when deleting an imported source document', async () => {
    vi.mocked(deleteDocument).mockResolvedValueOnce({
      deletedDocument: true,
      deletedActivityRecords: 0,
    });
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'doc-imported-delete',
          fileName: 'imported-source.xlsx',
          fileUrl: '',
          type: 'SPREADSHEET',
          status: 'IMPORTED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
          importedAt: '2026-07-20T01:00:00.000Z',
          importedRecordCount: 4,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'user@example.com',
        role: 'USER',
        accountType: 'CUSTOMER',
        organizationId: 'org-1',
      }),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: /Open document actions for imported-source.xlsx/i }),
    );
    await userEvent.click(
      within(screen.getByRole('menu', { name: /More actions for imported-source.xlsx/i }))
        .getByRole('menuitem', { name: 'Delete Source Document' }),
    );

    expect(await screen.findByRole('dialog', { name: /Delete source document/i })).toBeInTheDocument();
    expect(screen.getByText('This source document has already been imported.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Deleting/removing the source document from Review Data will NOT delete the imported Activity Records.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Delete Source Document$/i }));

    await waitFor(() => {
      expect(deleteDocument).toHaveBeenCalledWith('doc-imported-delete');
    });
    expect(await screen.findByText('No data sources to review yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Upload documents or import a spreadsheet to create reviewable activity data.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Source document removed from Review Data. Imported records were kept.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Calculation Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Reports' })).not.toBeInTheDocument();
    expect(screen.queryByText('imported-source.xlsx')).not.toBeInTheDocument();
    expect(deleteDocument).toHaveBeenCalledTimes(1);
  });

  it('renders normal Review Data workflow again after deleting the last source and uploading another document', async () => {
    const initialDocument = {
      id: 'doc-imported-delete',
      fileName: 'imported-source.xlsx',
      fileUrl: '',
      type: 'SPREADSHEET',
      status: 'IMPORTED',
      fileSize: 100,
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T00:00:00.000Z',
      importedAt: '2026-07-20T01:00:00.000Z',
      importedRecordCount: 4,
    };
    const uploadedDocument = {
      id: 'new-upload-doc',
      fileName: 'new-invoice.pdf',
      fileUrl: '',
      type: 'PDF',
      status: 'UPLOADED',
      fileSize: 100,
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z',
    };
    vi.mocked(getDocuments)
      .mockResolvedValueOnce({
        items: [initialDocument],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      } as any)
      .mockResolvedValue({
        items: [uploadedDocument],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      } as any);
    vi.mocked(uploadDocument).mockResolvedValue(uploadedDocument as any);
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'new-upload-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'Electricity',
          recordDate: '2026-07-21',
          quantity: 100,
          unit: 'kWh',
          country: 'Canada',
          province: 'Alberta',
          sourceReference: 'NEW-ELEC-001',
          sourceRow: 2,
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: false,
      warning: null,
    } as any);

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: /Open document actions for imported-source.xlsx/i }),
    );
    await userEvent.click(
      within(screen.getByRole('menu', { name: /More actions for imported-source.xlsx/i }))
        .getByRole('menuitem', { name: 'Delete Source Document' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: /^Delete Source Document$/i }));

    expect(await screen.findByText('No data sources to review yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Calculation Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Reports' })).not.toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /Document Type/i }),
      'UTILITY_BILL',
    );
    const fileInput = document.getElementById('document-upload-input') as HTMLInputElement;
    await userEvent.upload(
      fileInput,
      new File(['new invoice bytes'], 'new-invoice.pdf', { type: 'application/pdf' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Extract Data' }));

    expect(await screen.findByText('new-invoice.pdf')).toBeInTheDocument();
    expect(await screen.findByText('Draft Records Review')).toBeInTheDocument();
    expect(screen.getByDisplayValue('NEW-ELEC-001')).toBeInTheDocument();
    expect(
      screen.queryByText('Source document removed from Review Data. Imported records were kept.'),
    ).not.toBeInTheDocument();
  });

  it('keeps the document when source delete confirmation is cancelled', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'doc-cancel-delete',
          fileName: 'cancel-delete.pdf',
          fileUrl: '',
          type: 'PDF',
          status: 'UPLOADED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: /Open document actions for cancel-delete.pdf/i }),
    );
    await userEvent.click(
      within(screen.getByRole('menu', { name: /More actions for cancel-delete.pdf/i }))
        .getByRole('menuitem', { name: 'Delete Source Document' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: /^Cancel$/i }));

    expect(deleteDocument).not.toHaveBeenCalled();
    expect(screen.getByText('cancel-delete.pdf')).toBeInTheDocument();
  });

  it('hides Delete Source Document from viewer accounts', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'viewer@example.com',
        role: 'VIEWER',
        accountType: 'CUSTOMER',
        organizationId: 'org-1',
      }),
    );
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'doc-viewer',
          fileName: 'viewer-document.pdf',
          fileUrl: '',
          type: 'PDF',
          status: 'UPLOADED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await screen.findByText('viewer-document.pdf');
    const menuButton = screen.queryByRole('button', {
      name: /Open document actions for viewer-document.pdf/i,
    });

    if (menuButton) {
      await userEvent.click(menuButton);
      expect(screen.queryByRole('menuitem', { name: 'Delete Source Document' })).not.toBeInTheDocument();
    } else {
      expect(screen.queryByRole('button', { name: 'Delete Source Document' })).not.toBeInTheDocument();
    }
  });

  it('keeps the document visible and shows an error when source delete fails', async () => {
    vi.mocked(deleteDocument).mockRejectedValue(new Error('delete failed'));
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'doc-delete-fails',
          fileName: 'delete-fails.pdf',
          fileUrl: '',
          type: 'PDF',
          status: 'UPLOADED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: /Open document actions for delete-fails.pdf/i }),
    );
    await userEvent.click(
      within(screen.getByRole('menu', { name: /More actions for delete-fails.pdf/i }))
        .getByRole('menuitem', { name: 'Delete Source Document' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: /^Delete$/i }));

    expect(await screen.findByText('Unable to delete source document. Please try again.')).toBeInTheDocument();
    expect(screen.getAllByText('delete-fails.pdf').length).toBeGreaterThan(0);
  });

  it('uses status-aware selected document action labels', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'doc-ready',
          fileName: 'ready-upload.xlsx',
          fileUrl: '',
          type: 'SPREADSHEET',
          status: 'REVIEW_REQUIRED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
        },
        {
          id: 'doc-imported',
          fileName: 'imported-upload.xlsx',
          fileUrl: '',
          type: 'SPREADSHEET',
          status: 'IMPORTED',
          fileSize: 100,
          createdAt: '2026-07-21T00:00:00.000Z',
          updatedAt: '2026-07-21T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('ready-upload.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review Rows' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Imported Records' })).toBeInTheDocument();

    const selectedAction = screen.getByRole('button', { name: 'Review Selected Data' });
    expect(selectedAction).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Select document ready-upload.xlsx'));
    expect(screen.getByRole('button', { name: 'Review Selected Data' })).toBeEnabled();

    await userEvent.click(screen.getByLabelText('Select document imported-upload.xlsx'));
    expect(screen.getByRole('button', { name: 'Select Compatible Documents' })).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Select document ready-upload.xlsx'));
    expect(screen.getByRole('button', { name: 'Generate Report' })).toBeEnabled();
  });

  it('opens Manual Entry when route state requests manual input focus', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/input-data',
            state: { focusInputMethod: 'manual' },
          },
        ]}
      >
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /^Manual Entry$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Manual Entry/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('heading', { name: /^Upload Documents$/i })).not.toBeInTheDocument();
  });

  it('keeps upload, spreadsheet import, and manual entry mode content distinct', async () => {
    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /^Upload Documents$/i })).toBeInTheDocument();
    expect(screen.getByText(/Supported files: PDF, JPG, PNG, HEIC/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download CSV template/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add activity record/i })).not.toBeInTheDocument();
    const documentTypeSelect = screen.getByRole('combobox', { name: /Document Type/i });
    expect(documentTypeSelect).toHaveValue('');
    expect(within(documentTypeSelect).getByRole('option', { name: /Select document type/i })).toBeInTheDocument();
    expect(within(documentTypeSelect).getByRole('option', { name: /Utility Bill/i })).toBeInTheDocument();
    expect(within(documentTypeSelect).getByRole('option', { name: /Fuel Invoice/i })).toBeInTheDocument();
    expect(within(documentTypeSelect).getByRole('option', { name: /Water Bill/i })).toBeInTheDocument();
    expect(within(documentTypeSelect).getByRole('option', { name: /Travel Document/i })).toBeInTheDocument();
    expect(within(documentTypeSelect).getByRole('option', { name: /Hotel Invoice/i })).toBeInTheDocument();
    expect(within(documentTypeSelect).queryByRole('option', { name: /^SPREADSHEET$/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Import Spreadsheet/i }));
    expect(screen.getByRole('heading', { name: /^Import Spreadsheet$/i })).toBeInTheDocument();
    expect(
      screen.getAllByText(/Import CSV or Excel activity data from a CarbonLite template or your existing spreadsheet/i)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Download CSV template/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Excel template/i })).toBeInTheDocument();
    expect(screen.getByText('No spreadsheet rows yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add activity record/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Drop files here or choose files/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Manual Entry/i }));
    expect(screen.getByRole('heading', { name: /^Manual Entry$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add activity record/i })).toBeInTheDocument();
    expect(screen.getByText('No manual activity rows yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download CSV template/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Supported files: PDF, JPG, PNG, HEIC/i)).not.toBeInTheDocument();
  });

  it('loads sample files without enabling a hidden demo mode', async () => {
    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: /load sample data/i }),
    );

    expect(
      screen.getByText(
        'Sample files loaded. You can review, import, edit, and generate reports like a real workflow.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Prairie Logistics - diesel fuel invoice.pdf')).toBeInTheDocument();
    expect(screen.getByText('NorthGrid utility bill - March 2026.pdf')).toBeInTheDocument();
    expect(screen.queryByText(/Demo Mode/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('carbonliteDemoMode')).toBeNull();
  });

  it('keeps document upload focused on documents instead of sample JSON imports', async () => {
    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /^Upload Documents$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Upload utility bills, fuel invoices, water bills, travel documents/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Supported files: PDF, JPG, PNG, HEIC/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Use Sample JSON/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Use Sample CSV/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/CSV, XLSX/i)).not.toBeInTheDocument();
  });

  it('blocks duplicate document uploads without offering a separate copy import', async () => {
    vi.mocked(uploadDocument).mockRejectedValue(
      new DuplicateDocumentError({
        id: 'existing-doc',
        fileName: 'carbonlite_needs_review_test.xlsx',
        createdAt: '2026-05-30T10:00:00.000Z',
      }),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /^Upload Documents$/i })).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /Document Type/i }),
      'UTILITY_BILL',
    );
    const fileInput = document.getElementById('document-upload-input') as HTMLInputElement;
    await userEvent.upload(
      fileInput,
      new File(['same invoice bytes'], 'renamed-copy.pdf', {
        type: 'application/pdf',
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Extract Data' }));

    expect(
      await screen.findByText(
        'carbonlite_needs_review_test.xlsx was already uploaded on 2026-05-30. Duplicate upload blocked.',
      ),
    ).toBeInTheDocument();
    expect(uploadDocument).toHaveBeenCalledTimes(1);
    expect(getDocumentExtraction).not.toHaveBeenCalled();
    expect(screen.queryByText(/Keep separate copy/i)).not.toBeInTheDocument();
  });

  it('shows loading state while retry extraction is running', async () => {
    let resolveExtract!: (value: any) => void;
    vi.mocked(getDocuments).mockResolvedValue({
      items: [failedDocument],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockReturnValue(
      new Promise((resolve) => {
        resolveExtract = resolve;
      }) as any,
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const retryButton = await screen.findByRole('button', { name: /Retry Extract/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await userEvent.click(retryButton);

    expect(screen.getByRole('button', { name: /Extracting/i })).toBeDisabled();

    resolveExtract({
      documentId: 'doc-1',
      status: 'PROCESSED',
      parsedActivities: [
        {
          activityType: 'DIESEL',
          recordDate: '2026-05-01',
          quantity: 100,
          unit: 'L',
          sourceReference: 'failed-invoice.pdf',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    expect(
      await screen.findByText(/Extraction completed. Review the preview below/i),
    ).toBeInTheDocument();
  });

  it('normalizes JSON preview rows and marks electricity records without province for review', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'json-doc',
          fileName: 'activity-records.json',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'json-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'electricity',
          amount: '12500',
          unit: 'kWh',
          country: 'CAN',
          province: '',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          facilityName: 'Calgary Main Office',
          serviceLocation: 'Calgary, AB',
          notes: 'Optional note',
        },
        {
          activityType: 'Natural Gas',
          amount: '100',
          unit: 'm3',
          country: 'canada',
          province: 'AB',
          date: '2026-02-01',
        },
      ],
      sourceRowCount: 2,
      extractedRowCount: 2,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const retryButton = await screen.findByRole('button', { name: /Retry Extract/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await userEvent.click(retryButton);

    expect((await screen.findAllByText('Missing Province')).length).toBeGreaterThan(0);
    expect(screen.getByText('Scroll horizontally to view all columns →')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Electricity')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Natural Gas')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('Canada').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByDisplayValue('Calgary Main Office')).toBeInTheDocument();
    expect(screen.getByText('Site / Facility')).toBeInTheDocument();
    expect(screen.getByText('2026-01-01 to 2026-01-31')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Optional note')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Missing Province: Electricity records require province before factor matching.',
      ),
    ).not.toBeInTheDocument();

    const electricityRow = screen.getByDisplayValue('Electricity').closest('tr');
    expect(electricityRow).toBeTruthy();
    expect(within(electricityRow!).getByRole('checkbox')).not.toBeChecked();
    expect(within(electricityRow!).getByRole('checkbox')).toBeDisabled();
    expect(within(electricityRow!).getByText('Province required')).toBeInTheDocument();
    expect(
      within(electricityRow!)
        .getAllByText('Missing Province')
        .some(
          (element) =>
            element.getAttribute('title') ===
            'Electricity records require province before factor matching.',
        ),
    ).toBe(true);
    expect(within(electricityRow!).queryByText('-')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Select All/i }));
    expect(within(electricityRow!).getByRole('checkbox')).not.toBeChecked();
  });

  it('moves misclassified facility values out of Source Reference into Site / Facility', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'facility-doc',
          fileName: 'carbonlite-site-facility-upload-test.xlsx',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'facility-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'Electricity',
          amount: 8000,
          unit: 'kWh',
          country: 'Canada',
          province: 'AB',
          startDate: '2026-07-20',
          sourceReference: 'Calgary Office',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const retryButton = await screen.findByRole('button', { name: /Retry Extract/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await userEvent.click(retryButton);

    const row = screen.getByDisplayValue('Calgary Office').closest('tr');
    expect(row).toBeTruthy();
    expect(screen.getByText('Site / Facility')).toBeInTheDocument();
    expect(within(row!).getByDisplayValue('Calgary Office')).toBeInTheDocument();
    expect(
      within(row!).getByDisplayValue('carbonlite-site-facility-upload-test.xlsx'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));
    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });

    const importedActivities = vi.mocked(confirmDocumentImport).mock.calls[0][1];
    expect(importedActivities[0]).toMatchObject({
      facility: 'Calgary Office',
      sourceReference: 'carbonlite-site-facility-upload-test.xlsx',
    });
    expect(importedActivities[0].facilityId).toBeUndefined();
  });

  it('enables customer admins to set province on missing-province draft rows', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'admin@example.com',
        role: 'ADMIN',
        accountType: 'CUSTOMER',
        companyId: 'company-1',
      }),
    );
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'province-doc',
          fileName: 'province-missing.xlsx',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'province-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'electricity',
          amount: '1000',
          unit: 'kWh',
          country: 'Canada',
          province: '',
          startDate: '2026-01-01',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    const row = screen.getByDisplayValue('Electricity').closest('tr');
    expect(row).toBeTruthy();
    expect(within(row!).getByText('Province required')).toBeInTheDocument();

    const setProvinceButton = screen.getByRole('button', { name: 'Set Province' });
    expect(setProvinceButton).toBeDisabled();
    expect(setProvinceButton).toHaveAttribute('title', 'Select a province to apply.');

    await userEvent.selectOptions(screen.getByLabelText('Province'), 'Alberta');
    expect(setProvinceButton).toBeEnabled();

    await userEvent.click(setProvinceButton);

    expect(within(row!).getByDisplayValue('Alberta')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(row!).queryByText('Province required')).not.toBeInTheDocument();
    });
    expect(within(row!).getByText('Ready')).toBeInTheDocument();
    expect(within(row!).getByRole('checkbox')).toBeEnabled();
    expect(within(row!).getByRole('checkbox')).toBeChecked();
  });

  it('allows customer users to set province on draft rows and import ready rows', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'user@example.com',
        role: 'USER',
        accountType: 'CUSTOMER',
        organizationId: 'org-1',
      }),
    );
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'province-doc-user',
          fileName: 'province-missing-user.xlsx',
          type: 'SPREADSHEET',
          status: 'REVIEW_REQUIRED',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(getDocumentExtraction).mockResolvedValue({
      documentId: 'province-doc-user',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'electricity',
          amount: '1000',
          unit: 'kWh',
          country: 'Canada',
          province: '',
          startDate: '2026-01-01',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Review Rows/i }));

    const row = screen.getByDisplayValue('Electricity').closest('tr');
    expect(row).toBeTruthy();

    const setProvinceButton = screen.getByRole('button', { name: 'Set Province' });
    expect(setProvinceButton).toBeDisabled();
    expect(setProvinceButton).toHaveAttribute('title', 'Select a province to apply.');

    await userEvent.selectOptions(screen.getByLabelText('Province'), 'Alberta');
    expect(setProvinceButton).toBeEnabled();

    await userEvent.click(setProvinceButton);

    expect(within(row!).getByDisplayValue('Alberta')).toBeInTheDocument();
    const confirmImportButton = screen.getByRole('button', { name: /Confirm Import/i });
    expect(confirmImportButton).toBeEnabled();

    await userEvent.click(confirmImportButton);

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(confirmDocumentImport).mock.calls[0][1]).toHaveLength(1);
  });

  it('keeps unsupported electricity provinces in JSON preview for factor review', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'json-doc',
          fileName: 'activity-records.json',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'json-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'electricity',
          amount: '1000',
          unit: 'kWh',
          country: 'Canada',
          province: 'SK',
          startDate: '2026-01-01',
          notes: 'Unsupported pilot province should be factor-reviewed later.',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    const row = screen.getByDisplayValue('Electricity').closest('tr');
    expect(row).toBeTruthy();
    expect(within(row!).getByDisplayValue('Saskatchewan')).toBeInTheDocument();
    expect(within(row!).getAllByText('Missing Factor').length).toBeGreaterThan(0);
    expect(within(row!).getByText('Excluded')).toBeInTheDocument();
    expect(
      within(row!)
        .getAllByText('Missing Factor')
        .some(
          (element) =>
            element.getAttribute('title') ===
            'Electricity factor not available for this province in the current pilot.',
        ),
    ).toBe(true);
    expect(within(row!).queryByText('Missing Province')).not.toBeInTheDocument();
    expect(within(row!).queryByText('Province required')).not.toBeInTheDocument();
    expect(within(row!).getByRole('checkbox')).not.toBeChecked();
    expect(within(row!).getByRole('checkbox')).toBeDisabled();
  });

  it('keeps unsupported activity rows visible and not importable in the review table', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'custom-doc',
          fileName: 'custom-activity.csv',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'custom-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'CUSTOM',
          amount: '25',
          unit: 'widgets',
          country: 'Canada',
          province: '',
          startDate: '2026-07-25',
          dateEstimated: true,
          notes: 'Unsupported activity should remain readable during review.',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const retryButton = await screen.findByRole('button', { name: /Retry Extract/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await userEvent.click(retryButton);

    const unsupportedSelect = screen.getByDisplayValue('Custom (Unsupported)');
    const row = unsupportedSelect.closest('tr');
    expect(row).toBeTruthy();

    expect(within(row!).getAllByText(/Unsupported Activity/i).length).toBeGreaterThan(0);
    expect(within(row!).getAllByText(/Unsupported Activity Type/i).length).toBeGreaterThan(0);
    expect(within(row!).getByDisplayValue('Custom (Unsupported)')).toBeInTheDocument();
    expect(within(row!).getByDisplayValue('25')).toBeInTheDocument();
    expect(within(row!).getByDisplayValue('widgets')).toBeInTheDocument();
    expect(within(row!).getByDisplayValue('Canada')).toBeInTheDocument();
    expect(within(row!).getByDisplayValue('Unsupported activity should remain readable during review.')).toBeInTheDocument();
    expect(within(row!).getByText('Date estimated: 2026-07-25')).toBeInTheDocument();

    expect(within(row!).getByRole('checkbox')).not.toBeChecked();
    expect(within(row!).getByRole('checkbox')).toBeDisabled();
  });

  it('imports selected ready rows while leaving invalid draft rows for review', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'mixed-doc',
          fileName: 'mixed-activity-records.csv',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'mixed-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        { activityType: 'Electricity', amount: 12500, unit: 'kWh', country: 'Canada', province: 'AB', startDate: '2026-07-20', site: 'Calgary Office' },
        { activityType: 'Electricity', amount: 100, unit: 'kWh', country: 'Canada', province: 'BC', startDate: '2026-07-20', location: 'Red Deer Yard' },
        { activityType: 'Electricity', amount: 1000, unit: 'kWh', country: 'Canada', province: 'ON', startDate: '2026-07-20' },
        { activityType: 'Natural Gas', amount: 1000, unit: 'm3', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Gasoline', amount: 500, unit: 'liters', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Diesel', amount: 100, unit: 'liters', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Air Travel', amount: 5000, unit: 'km', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Business Travel - Accommodation', amount: 10, unit: 'nights', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Shipping', amount: 50, unit: 'kg', country: 'Canada', startDate: '2026-07-20', dateEstimated: true },
        { activityType: 'Water', amount: 100, unit: 'm3', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'CUSTOM', amount: 25, unit: 'widgets', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Electricity', amount: 500, unit: 'kWh', country: 'Canada', province: '', startDate: '2026-07-20' },
        { activityType: 'Electricity', amount: 700, unit: 'kWh', country: 'Canada', province: 'SK', startDate: '2026-07-20' },
      ],
      sourceRowCount: 13,
      extractedRowCount: 13,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const retryButton = await screen.findByRole('button', { name: /Retry Extract/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await userEvent.click(retryButton);

    expect(screen.getByText('Extracted rows: 13')).toBeInTheDocument();
    expect(screen.getByText(/File: mixed-activity-records\.csv/i)).toBeInTheDocument();
    expect(screen.getByText(/Source type: Spreadsheet import/i)).toBeInTheDocument();
    expect(screen.queryByText(/Document ID:/i)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Calgary Office')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Red Deer Yard')).toBeInTheDocument();
    expect(screen.getByText(/Ready:/i)).toHaveTextContent(/Tracked metrics:/i);
    expect(screen.getByText(/Ready:/i)).toHaveTextContent(/Requires review:/i);

    const checkboxes = screen.getAllByLabelText(/Select preview row/i) as HTMLInputElement[];
    const importableCheckboxes = checkboxes.filter((checkbox) => !checkbox.disabled);
    const reviewOnlyCheckboxes = checkboxes.filter((checkbox) => checkbox.disabled);
    expect(importableCheckboxes.length).toBeGreaterThan(0);
    expect(reviewOnlyCheckboxes.length).toBeGreaterThan(0);
    const selectedImportableCheckboxes = importableCheckboxes.filter(
      (checkbox) => checkbox.checked,
    );
    expect(selectedImportableCheckboxes.length).toBeGreaterThan(0);
    expect(reviewOnlyCheckboxes.every((checkbox) => !checkbox.checked)).toBe(true);

    const waterRow = checkboxes[9].closest('tr');
    expect(waterRow).toBeTruthy();
    expect(within(waterRow!).getByText('Tracked Metric')).toBeInTheDocument();
    expect(within(waterRow!).getByText('Tracked Only')).toBeInTheDocument();
    expect(within(waterRow!).getByRole('checkbox')).toBeChecked();

    const confirmButton = screen.getByRole('button', { name: 'Confirm Import' });
    expect(confirmButton).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    const importedActivities = vi.mocked(confirmDocumentImport).mock.calls[0][1];
    expect(importedActivities.length).toBeLessThan(selectedImportableCheckboxes.length);
    expect(importedActivities).toHaveLength(9);
    expect(importedActivities.map((activity) => activity.activityType)).toContain('WATER');
    expect(importedActivities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ facility: 'Calgary Office' }),
        expect.objectContaining({ facility: 'Red Deer Yard' }),
      ]),
    );
    expect(importedActivities.map((activity) => activity.activityType)).not.toContain('CUSTOM');
    expect(importedActivities).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ jurisdictionRegion: 'Saskatchewan' }),
      ]),
    );
    expect(
      await screen.findByText(/Imported 9 activity record\(s\).*4 rows were left in draft because they require review/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Extracted rows: 4')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Custom (Unsupported)')).toBeInTheDocument();
    expect(screen.getAllByText('Missing Province').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Missing Factor').length).toBeGreaterThan(0);
  });

  it('does not import Diesel 240 kg when the available Diesel factor expects liters', async () => {
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      {
        id: 'factor-electricity-ab-2026',
        name: 'Electricity - Alberta - 2026',
        type: 'EMISSION',
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        unit: 'kWh',
        factorValue: 0.53,
        resultUnit: 'kgCO2e',
        sourceYear: 2026,
        effectiveYear: 2026,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        isDefault: true,
        isSystemDefault: true,
      },
      {
        id: 'factor-hotel-canada-2025',
        name: 'Business Travel - Accommodation - Canada - 2025',
        type: 'EMISSION',
        activityType: 'HOTEL',
        inputUnit: 'nights',
        unit: 'nights',
        factorValue: 15,
        resultUnit: 'kgCO2e',
        sourceYear: 2025,
        effectiveYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Canada',
        isDefault: true,
        isSystemDefault: true,
      },
      {
        id: 'factor-diesel-canada-2025',
        name: 'Diesel - Canada - 2025',
        type: 'EMISSION',
        activityType: 'DIESEL',
        inputUnit: 'liters',
        unit: 'liters',
        factorValue: 2.68,
        resultUnit: 'kgCO2e',
        sourceYear: 2025,
        effectiveYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Canada',
        isDefault: true,
        isSystemDefault: true,
      },
    ] as any);
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'needs-review-doc',
          fileName: 'carbonlite_needs_review_test.xlsx',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'needs-review-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'Business Travel - Accommodation',
          recordDate: '2026-03-10',
          quantity: 4,
          unit: 'nights',
          country: 'Canada',
          province: 'Ontario',
          sourceRow: 2,
        },
        {
          activityType: 'Water',
          recordDate: '2026-03-07',
          quantity: 18,
          unit: 'm3',
          country: 'Canada',
          province: 'Alberta',
          matchingStatus: 'TRACKED_ONLY',
          reportTreatment: 'TRACKED_ONLY',
          scope: 'TRACKED_METRIC',
          calculationStatus: 'TRACKED_ONLY',
          calculationMessage: 'Water usage is tracked only and excluded from GHG emissions totals.',
          sourceRow: 3,
        },
        {
          activityType: 'Diesel',
          recordDate: '2026-03-06',
          quantity: 240,
          unit: 'kg',
          country: 'Canada',
          province: 'Alberta',
          sourceRow: 4,
        },
        {
          activityType: 'Electricity',
          recordDate: '2026-03-01',
          quantity: 980,
          unit: 'kWh',
          country: 'Canada',
          province: 'Alberta',
          matchingStatus: 'MISSING_FACTOR',
          reportTreatment: 'EXCLUDED',
          calculationStatus: 'MISSING_FACTOR',
          calculationMessage: 'Stale saved status from Save All.',
          sourceRow: 5,
        },
      ],
      sourceRowCount: 4,
      extractedRowCount: 4,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const retryButton = await screen.findByRole('button', { name: /Retry Extract/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await userEvent.click(retryButton);

    expect(screen.getByDisplayValue('Diesel')).toBeInTheDocument();
    const dieselRowBeforeImport = screen.getByDisplayValue('Diesel').closest('tr');
    expect(dieselRowBeforeImport).toBeTruthy();
    expect(within(dieselRowBeforeImport!).getAllByText('Unit Mismatch').length).toBeGreaterThan(0);
    expect(within(dieselRowBeforeImport!).queryByText('Ready')).not.toBeInTheDocument();
    expect(within(dieselRowBeforeImport!).getByRole('checkbox')).not.toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    const importedActivities = vi.mocked(confirmDocumentImport).mock.calls[0][1];
    expect(importedActivities).toHaveLength(3);
    expect(importedActivities.map((activity) => activity.activityType).sort()).toEqual([
      'ELECTRICITY',
      'HOTEL',
      'WATER',
    ]);
    expect(importedActivities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityType: 'ELECTRICITY',
          quantity: 980,
          unit: 'kWh',
          jurisdictionRegion: 'Alberta',
          matchingStatus: 'MATCHED',
          reportTreatment: 'INCLUDED',
          calculationStatus: 'CALCULATED',
          calculatedEmissionsKgCO2e: 519.4,
        }),
        expect.objectContaining({
          activityType: 'HOTEL',
          quantity: 4,
          unit: 'nights',
          matchingStatus: 'MATCHED',
          reportTreatment: 'INCLUDED',
          calculationStatus: 'CALCULATED',
          calculatedEmissionsKgCO2e: 60,
        }),
        expect.objectContaining({
          activityType: 'WATER',
          quantity: 18,
          unit: 'm3',
          matchingStatus: 'TRACKED_ONLY',
          reportTreatment: 'TRACKED_ONLY',
          calculationStatus: 'TRACKED_ONLY',
        }),
      ]),
    );
    expect(importedActivities).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ activityType: 'DIESEL' }),
      ]),
    );
    expect(calculateMetrics).toHaveBeenCalledWith(['created-1', 'created-2', 'created-3']);
    expect((await screen.findAllByText('Unit Mismatch')).length).toBeGreaterThan(0);
    const remainingDieselRow = screen.getByDisplayValue('Diesel').closest('tr');
    expect(remainingDieselRow).toBeTruthy();
    expect(within(remainingDieselRow!).getAllByText('Unit Mismatch').length).toBeGreaterThan(0);
  }, 20000);

  it('imports newly ready rows from a previously partially imported document without duplicating existing rows', async () => {
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      {
        id: 'factor-electricity-ab-2026',
        name: 'Electricity - Alberta - 2026',
        type: 'EMISSION',
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        unit: 'kWh',
        factorValue: 0.53,
        resultUnit: 'kgCO2e',
        sourceYear: 2026,
        effectiveYear: 2026,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        isDefault: true,
        isSystemDefault: true,
      },
    ] as any);
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'partial-doc',
          fileName: 'partial-import.csv',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'partial-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        { activityType: 'Electricity', amount: 100, unit: 'kWh', country: 'Canada', province: 'AB', startDate: '2026-07-01', sourceReference: 'EXISTING-ELEC-001', sourceRow: 2 },
        { activityType: 'Electricity', amount: 12500, unit: 'kWh', country: 'Canada', province: 'AB', startDate: '2026-07-20', sourceRow: 4 },
        { activityType: 'Electricity', amount: 500, unit: 'kWh', country: 'Canada', province: '', startDate: '2026-07-21', sourceReference: 'REVIEW-ELEC-005', sourceRow: 5 },
      ],
      sourceRowCount: 3,
      extractedRowCount: 3,
      possibleMissingRows: 0,
      warning: null,
    });
    vi.mocked(getDocumentExtraction).mockResolvedValue({
      documentId: 'partial-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        { activityType: 'Electricity', amount: 100, unit: 'kWh', country: 'Canada', province: 'AB', startDate: '2026-07-01', sourceReference: 'EXISTING-ELEC-001', sourceRow: 2 },
        { activityType: 'Electricity', amount: 12500, unit: 'kWh', country: 'Canada', province: 'AB', startDate: '2026-07-20', sourceRow: 4 },
        { activityType: 'Electricity', amount: 500, unit: 'kWh', country: 'Canada', province: '', startDate: '2026-07-21', sourceReference: 'REVIEW-ELEC-005', sourceRow: 5 },
      ],
      sourceRowCount: 3,
      extractedRowCount: 3,
      possibleMissingRows: 0,
      warning: null,
    });
    vi.mocked(confirmDocumentImport).mockRejectedValue(new DuplicateDocumentImportError());
    vi.mocked(getAllActivityData).mockResolvedValue([
      {
        id: 'existing-row-2',
        sourceDocumentId: 'partial-doc',
        sourceRow: 2,
        sourceReference: 'EXISTING-ELEC-001',
        activityType: 'ELECTRICITY',
        recordDate: '2026-07-01',
        quantity: 100,
        unit: 'kWh',
      },
    ] as any);
    vi.mocked(createActivityData).mockResolvedValue({
      id: 'created-row-4',
    } as any);

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledTimes(1);
    });

    expect(createActivityData).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceDocumentId: 'partial-doc',
        sourceRow: 4,
        activityType: 'ELECTRICITY',
      }),
    );
    expect(calculateMetrics).toHaveBeenCalledWith(['created-row-4']);

    let importEventCall: Parameters<typeof trackActivityEvent> | undefined;
    await waitFor(() => {
      importEventCall = vi.mocked(trackActivityEvent).mock.calls.find(
        ([event]) => event.eventName === 'RECORDS_IMPORTED',
      ) as Parameters<typeof trackActivityEvent> | undefined;
      expect(importEventCall).toBeTruthy();
    });
    expect(importEventCall?.[0].metadata).toEqual(
      expect.objectContaining({
        totalRowsConsidered: 3,
        includedEmissionsCreated: 1,
        trackedMetricsCreated: 0,
        alreadyImportedSkipped: 1,
        needsReviewSkipped: 1,
        duplicateSkipped: 0,
        otherSkipped: 0,
        rowsNotImported: 2,
        recordsRequiringReview: 1,
      }),
    );
  }, 20000);

  it('auto-applies a default estimated date and imports the row without row-by-row suggestion', async () => {
    const uploadDate = failedDocument.createdAt.slice(0, 10);
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'missing-date-doc',
          fileName: 'missing-date.csv',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'missing-date-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'Natural Gas',
          amount: 100,
          unit: 'm3',
          country: 'Canada',
          startDate: '/',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    const row = screen.getByDisplayValue('Natural Gas').closest('tr');
    expect(row).toBeTruthy();
    expect(within(row!).getByDisplayValue(uploadDate)).toBeInTheDocument();
    expect(within(row!).getByText(`Date estimated: ${uploadDate}`)).toBeInTheDocument();
    expect(within(row!).queryByText(/Use Suggestion/i)).not.toBeInTheDocument();
    expect(within(row!).queryByText('Missing Date')).not.toBeInTheDocument();
    expect(within(row!).getByText('Ready')).toBeInTheDocument();
    expect(within(row!).getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Confirm Import' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    const importedActivities = vi.mocked(confirmDocumentImport).mock.calls[0][1];
    expect(importedActivities).toHaveLength(1);
    expect(importedActivities[0]).toMatchObject({
      activityType: 'NATURAL_GAS',
      recordDate: uploadDate,
      dateEstimated: true,
    });
  });

  it('shows completion, clears draft review, and redirects after a full successful import', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'complete-import-doc',
          fileName: 'complete-import.csv',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'complete-import-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'Natural Gas',
          amount: 100,
          unit: 'm3',
          country: 'Canada',
          startDate: '2026-07-20',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter initialEntries={['/input-data']}>
        <Routes>
          <Route path="/input-data" element={<UploadPage />} />
          <Route
            path="/calculation-review"
            element={
              <>
                <div>Calculation Review route</div>
                <LocationStateProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    expect(screen.getByText('Draft Records Review')).toBeInTheDocument();
    expect(screen.getByText('Extracted rows: 1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    expect(
      await screen.findByText(
        'Import completed successfully. The selected records have been saved as Data Records. 1 record imported. 0 records require review. Redirecting to Calculation Review...',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Draft Records Review')).not.toBeInTheDocument();
    expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    expect(calculateMetrics).toHaveBeenCalledWith(['created-1']);

    await waitFor(() => {
      expect(screen.getByText('Calculation Review route')).toBeInTheDocument();
    }, { timeout: 2500 });
    expect(screen.getByTestId('location-state')).toHaveTextContent(
      JSON.stringify({
        selectedDocumentIds: ['complete-import-doc'],
        reportScope: 'selectedDocuments',
      }),
    );
  });

  it('clears preview row selection when an edit makes the row invalid', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'json-doc',
          fileName: 'activity-records.json',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'json-doc',
      status: 'PROCESSED',
      parsedActivities: [
        {
          activityType: 'Electricity',
          amount: 12500,
          unit: 'kWh',
          country: 'Canada',
          province: 'AB',
          startDate: '2026-01-01',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    const row = screen.getByDisplayValue('Electricity').closest('tr');
    expect(row).toBeTruthy();
    expect(within(row!).getByRole('checkbox')).toBeChecked();
    expect(within(row!).getByText('Ready')).toBeInTheDocument();

    await userEvent.clear(screen.getByDisplayValue('Alberta'));

    await waitFor(() => {
      expect(within(row!).getAllByText('Missing Province').length).toBeGreaterThan(0);
    });
    expect(within(row!).getByText('Province required')).toBeInTheDocument();
    expect(
      within(row!)
        .getAllByText('Missing Province')
        .some(
          (element) =>
            element.getAttribute('title') ===
            'Electricity records require province before factor matching.',
        ),
    ).toBe(true);
    expect(within(row!).getByRole('checkbox')).not.toBeChecked();
    expect(within(row!).getByRole('checkbox')).toBeDisabled();
  });

  it('shows a friendly error when retry extraction returns 500', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [failedDocument],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockRejectedValue(
      new ApiError(
        500,
        'The document could not be processed. Please try again.',
        null,
        'EXTRACTION_FAILED',
        'Internal server error',
      ),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    expect(extractDocument).toHaveBeenCalledWith('doc-1');
    expect(
      await screen.findByText('We could not extract data from this file. Please check the file format or try uploading it again.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Needs Attention')).toBeInTheDocument();
  });

  it('marks retry extraction as file missing when backend returns 404', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [failedDocument],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockRejectedValue(
      new ApiError(
        404,
        'The original file is no longer available. Please upload it again.',
        null,
        'FILE_MISSING',
        'Uploaded file is no longer available. Please upload it again.',
      ),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    expect(extractDocument).toHaveBeenCalledWith('doc-1');
    expect(
      await screen.findByText('This file is no longer available. Please upload it again.'),
    ).toBeInTheDocument();
    expect((await screen.findAllByText('Re-upload Required')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Upload Again/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Delete Source Document$/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Open document actions for failed-invoice.pdf/i }),
    ).not.toBeInTheDocument();
  });

  it('uses spreadsheet file types when Upload Again is clicked for a spreadsheet source', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'spreadsheet-missing-doc',
          fileName: 'carbonlite_needs_review_test.xlsx',
          type: 'SPREADSHEET',
          status: 'FILE_MISSING',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Upload Again/i }));

    const fileInput = document.getElementById('document-upload-input') as HTMLInputElement;
    await waitFor(() => expect(fileInput.accept).toContain('.xlsx'));
    expect(fileInput.accept).toContain('.csv');
    expect(fileInput.accept).toContain('.xls');
    expect(fileInput.accept).not.toContain('.pdf');

    await userEvent.upload(
      fileInput,
      new File(['replacement workbook bytes'], 'carbonlite_needs_review_test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );

    expect(await screen.findByText(/carbonlite_needs_review_test\.xlsx ·/i)).toBeInTheDocument();

    vi.mocked(uploadDocument).mockResolvedValueOnce({
      id: 'replacement-spreadsheet-doc',
      fileName: 'carbonlite_needs_review_test.xlsx',
      fileUrl: '',
      type: 'SPREADSHEET',
      status: 'UPLOADED',
      createdAt: '2026-06-10T00:00:00.000Z',
      updatedAt: '2026-06-10T00:00:00.000Z',
    } as any);
    vi.mocked(getDocuments).mockResolvedValueOnce({
      items: [
        {
          ...failedDocument,
          id: 'replacement-spreadsheet-doc',
          fileName: 'carbonlite_needs_review_test.xlsx',
          type: 'SPREADSHEET',
          status: 'UPLOADED',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValueOnce({
      documentId: 'replacement-spreadsheet-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [],
      sourceRowCount: 0,
      extractedRowCount: 0,
      possibleMissingRows: false,
      warning: null,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Extract Data' }));

    expect(uploadDocument).toHaveBeenCalledWith({
      file: expect.objectContaining({ name: 'carbonlite_needs_review_test.xlsx' }),
      type: 'SPREADSHEET',
    });
  });

  it('rejects document files selected for a spreadsheet Upload Again replacement', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'spreadsheet-missing-doc',
          fileName: 'carbonlite_needs_review_test.xlsx',
          type: 'SPREADSHEET',
          status: 'FILE_MISSING',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Upload Again/i }));

    const fileInput = document.getElementById('document-upload-input') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['pdf bytes'], 'wrong-replacement.pdf', { type: 'application/pdf' })],
      },
    });

    expect(
      await screen.findByText(
        'wrong-replacement.pdf is not supported. Please select a supported spreadsheet file (.csv, .xlsx, or .xls).',
      ),
    ).toBeInTheDocument();
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it('keeps document file types when Upload Again is clicked for a PDF source', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          status: 'FILE_MISSING',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Upload Again/i }));

    const fileInput = document.getElementById('document-upload-input') as HTMLInputElement;
    await waitFor(() => expect(fileInput.accept).toContain('.pdf'));
    expect(fileInput.accept).toContain('.jpg');
    expect(fileInput.accept).toContain('.png');
    expect(fileInput.accept).toContain('.heic');
    expect(fileInput.accept).not.toContain('.xlsx');
  });

  it('shows a friendly error when saved extraction preview is missing', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          status: 'REVIEW_REQUIRED',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(getDocumentExtraction).mockRejectedValue(
      new ApiError(
        404,
        'Preview data is no longer available. Please extract the document again.',
        null,
        'EXTRACTION_NOT_FOUND',
        'Cannot GET /api/document-extraction/doc-1',
      ),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Review Rows/i }));

    expect(getDocumentExtraction).toHaveBeenCalledWith('doc-1');
    expect(
      await screen.findByText('Preview data is no longer available. Please extract the document again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Cannot GET|API 404|document-extraction/i)).not.toBeInTheDocument();
  });

  it('keeps document available and shows no-data message when retry finds no rows', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [failedDocument],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'doc-1',
      status: 'NO_DATA_FOUND',
      parsedActivities: [],
      sourceRowCount: 0,
      extractedRowCount: 0,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    expect(extractDocument).toHaveBeenCalledWith('doc-1');
    expect(
      await screen.findByText('No emissions data detected. You can view the file or retry extraction.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('failed-invoice.pdf')).toBeInTheDocument();
  });
});
