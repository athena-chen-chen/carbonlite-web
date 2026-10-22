import { goldenReport } from '../reports/pdf/__tests__/goldenFixtures';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReportingPage from './ReportingPage';
import {
  loadDefaultMetricsDateRange,
  loadMetricsOverview,
} from '../services/metricsOverview';
import {
  getWorkflowActivityEvents,
  trackActivityEvent,
  type ActivityEventItem,
} from '../services/activityEvents';
import { OPEN_FEEDBACK_OVERLAY_EVENT } from '../utils/feedbackOverlay';

vi.mock('../services/metricsOverview', async () => {
  const actual = await vi.importActual<typeof import('../services/metricsOverview')>(
    '../services/metricsOverview',
  );

  return {
    ...actual,
    loadDefaultMetricsDateRange: vi.fn(),
    loadMetricsOverview: vi.fn(),
  };
});

vi.mock('../services/activityEvents', () => ({
  getWorkflowActivityEvents: vi.fn(),
  trackActivityEvent: vi.fn(),
}));

vi.mock('../services/analytics.service', () => ({
  track: vi.fn(),
}));

vi.mock('../services/ga4.service', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('../services/auditLogs', () => ({
  createClientAuditLog: vi.fn().mockResolvedValue({}),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn((doc: { lastAutoTable?: { finalY: number } }) => {
    doc.lastAutoTable = { finalY: 48 };
  }),
}));

async function readBlobAsText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function LocationProbe() {
  const location = useLocation();
  return <div>Current path: {location.pathname}</div>;
}

async function openExportMenu() {
  await userEvent.click(screen.getByRole('button', { name: /^Export reports$/i }));
}

async function downloadTechnicalReviewPackage() {
  await openExportMenu();
  await userEvent.click(screen.getByRole('menuitem', { name: /Technical Emissions Report \(PDF\)/i }));
}

function enmaxMissingCostOverview() {
  return {
    summary: {},
    activities: [],
    usageTotals: {
      fuel: 3,
      electricity: 358,
      fuelUnitLabel: 'Grouped by type and unit',
      electricityUnitLabel: 'kWh',
      fuelUsageBreakdown: [{ activityType: 'NATURAL_GAS', total: 3, unit: 'GJ' }],
      invalidFuelRecordCount: 0,
      invalidElectricityRecordCount: 0,
    },
    totalEstimatedEmissionsKgCO2e: 338.06,
    totalRecordsFound: 3,
    recordsIncluded: 2,
    processedRecords: 2,
    skippedRecords: 1,
    skippedReasons: {
      missingFactor: 0,
      outsideDateRange: 0,
      outsideScope: 0,
      invalidData: 0,
    },
    missingFactorRecords: 0,
    matchedFactorsCount: 2,
    missingFactors: [],
    matchedActivityEmissions: [],
    conversionFactorsUsed: [
      {
        factorId: 'factor-electricity-carbonlite',
        activityType: 'ELECTRICITY',
        factorName: 'CarbonLite System Defaults',
        factorValue: 0.53,
        inputUnit: 'kWh',
        resultUnit: 'kgCO2e',
        jurisdiction: 'Alberta, Canada',
        factorYear: 2025,
        sourceAuthority: 'CarbonLite System Defaults',
        sourceDocument: 'CarbonLite System Defaults',
        factorType: 'System',
        verified: false,
        verificationStatus: 'Pilot Estimate',
        confidenceLevel: 'Internal Review Required',
      },
      {
        factorId: 'factor-natural-gas-eccc',
        activityType: 'NATURAL_GAS',
        factorName: 'Natural gas combustion',
        factorValue: 49.44,
        inputUnit: 'GJ',
        resultUnit: 'kgCO2e',
        jurisdiction: 'Canada (Generic)',
        factorYear: 2025,
        sourceAuthority: 'Environment and Climate Change Canada',
        sourceDocument: 'National Inventory Report',
        factorType: 'System',
        verified: false,
        verificationStatus: 'Internal Review Required',
        confidenceLevel: 'High',
      },
    ],
    calculationDetails: [
      {
        activityDataId: 'enmax-electricity',
        activityType: 'ELECTRICITY',
        recordDate: '2025-08-01',
        activityQuantity: 358,
        activityUnit: 'kWh',
        factorId: 'factor-electricity-carbonlite',
        factorName: 'CarbonLite System Defaults',
        factorValue: 0.53,
        factorInputUnit: 'kWh',
        factorResultUnit: 'kgCO2e/kWh',
        factorSource: 'CarbonLite System Defaults',
        sourceAuthority: 'CarbonLite System Defaults',
        sourceDocument: 'CarbonLite System Defaults',
        factorVerified: false,
        factorVerificationStatus: 'Pilot Estimate',
        factorConfidenceLevel: 'Internal Review Required',
        factorType: 'System',
        status: 'CALCULATED',
        calculatedEmissionsKgCO2e: 189.74,
        scope: 'SCOPE_2',
        sourceType: 'PDF',
        sourceFileName: '2025_August_01.pdf',
        sourceDocumentId: 'document-enmax',
        sourceReference: 'ENMAX electricity',
        sourceTextSnippet: 'Electricity delivery and usage total amount $214.55',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        costCad: null,
      },
      {
        activityDataId: 'enmax-natural-gas',
        activityType: 'NATURAL_GAS',
        recordDate: '2025-08-01',
        activityQuantity: 3,
        activityUnit: 'GJ',
        factorId: 'factor-natural-gas-eccc',
        factorName: 'Natural gas combustion',
        factorValue: 49.44,
        factorInputUnit: 'GJ',
        factorResultUnit: 'kgCO2e/GJ',
        factorJurisdictionCountry: 'Canada',
        factorJurisdictionRegion: 'Canada',
        factorYear: 2025,
        factorSource: 'Environment and Climate Change Canada',
        sourceAuthority: 'Environment and Climate Change Canada',
        sourceDocument: 'National Inventory Report',
        factorVerified: false,
        factorVerificationStatus: 'Internal Review Required',
        factorConfidenceLevel: 'High',
        factorType: 'System',
        status: 'CALCULATED',
        calculatedEmissionsKgCO2e: 148.32,
        scope: 'SCOPE_1',
        sourceType: 'PDF',
        sourceFileName: '2025_August_01.pdf',
        sourceDocumentId: 'document-enmax',
        sourceReference: 'ENMAX natural gas',
        sourceTextSnippet: 'Natural gas bill total amount $64.00',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        costCad: null,
      },
      {
        activityDataId: 'enmax-water',
        activityType: 'WATER',
        recordDate: '2025-08-01',
        activityQuantity: 6,
        activityUnit: 'm3',
        status: 'TRACKED_ONLY',
        calculatedEmissionsKgCO2e: null,
        sourceType: 'PDF',
        sourceFileName: '2025_August_01.pdf',
        sourceDocumentId: 'document-enmax',
        sourceReference: 'ENMAX water',
        sourceTextSnippet: 'Water charges total $18.00',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        costCad: null,
      },
    ],
    sourceReviewRows: [],
    invalidRecordCount: 0,
    dataQualityCoverage: 100,
    totalRecords: 3,
    recordsInScope: 3,
  } as Awaited<ReturnType<typeof loadMetricsOverview>>;
}

function sourceReviewOverview(sourceFileNames: string[]) {
  return {
    summary: {},
    activities: [],
    usageTotals: {
      fuel: 0,
      electricity: 0,
      fuelUnitLabel: 'Grouped by type and unit',
      electricityUnitLabel: 'kWh',
      fuelUsageBreakdown: [],
      invalidFuelRecordCount: 0,
      invalidElectricityRecordCount: 0,
    },
    totalEstimatedEmissionsKgCO2e: 0,
    totalRecordsFound: sourceFileNames.length,
    recordsIncluded: 0,
    processedRecords: 0,
    skippedRecords: sourceFileNames.length,
    skippedReasons: {
      missingFactor: 0,
      outsideDateRange: 0,
      outsideScope: 0,
      invalidData: 0,
    },
    missingFactorRecords: 0,
    matchedFactorsCount: 0,
    missingFactors: [],
    matchedActivityEmissions: [],
    conversionFactorsUsed: [],
    calculationDetails: [],
    sourceReviewRows: sourceFileNames.map((sourceFileName, index) => ({
      id: `review-source-${index}`,
      sourceDocumentId: `document-source-${index}`,
      rowId: `source-row-${index}`,
      status: index % 2 === 0 ? 'READY' : 'NEEDS_REVIEW',
      activityType: 'ELECTRICITY',
      sourceFileName,
      sourceReference: `SOURCE-${index + 1}`,
      issues: index % 2 === 0 ? [] : [{ code: 'MISSING_UNIT', message: 'Unit is required.' }],
    })),
    invalidRecordCount: 0,
    dataQualityCoverage: 0,
    totalRecords: sourceFileNames.length,
    recordsInScope: sourceFileNames.length,
  } as Awaited<ReturnType<typeof loadMetricsOverview>>;
}

async function renderGeneratedSourceReviewSection(sourceFileNames: string[]) {
  vi.mocked(loadMetricsOverview).mockResolvedValue(sourceReviewOverview(sourceFileNames));

  render(
    <MemoryRouter>
      <ReportingPage />
    </MemoryRouter>,
  );

  await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
  await userEvent.click(screen.getByRole('button', { name: /Generate Report/i }));
  return screen.getByRole('region', { name: /Source Data Status/i });
}

function getSourceReviewMetricValue(section: HTMLElement, label: string, value: string) {
  const labelElement = within(section).getByText(label);
  const card = labelElement.closest('div');

  expect(card).not.toBeNull();
  return within(card as HTMLElement).getByText(value);
}

describe('ReportingPage audit trail', () => {
  it('shows a loading indication while report data is preparing', async () => {
    localStorage.clear();
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'pilot@example.com',
        organizationName: 'KACH CANADA LTD.',
      }),
    );
    vi.mocked(loadDefaultMetricsDateRange).mockResolvedValue({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      hasActivityRecords: true,
    });
    vi.mocked(getWorkflowActivityEvents).mockResolvedValue([]);

    let resolveOverview!: (value: Awaited<ReturnType<typeof loadMetricsOverview>>) => void;
    vi.mocked(loadMetricsOverview).mockReturnValue(
      new Promise((resolve) => {
        resolveOverview = resolve;
      }) as ReturnType<typeof loadMetricsOverview>,
    );

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('status')).toHaveTextContent('Preparing report data...');
    expect(screen.queryByText('No reporting data found.')).not.toBeInTheDocument();
    expect(screen.queryByText('No records found for the selected period.')).not.toBeInTheDocument();

    resolveOverview({
      summary: {},
      activities: [
        {
          id: 'activity-1',
          activityType: 'NATURAL_GAS',
          recordDate: '2026-07-20',
          quantity: 1000,
          unit: 'm3',
          sourceType: 'SPREADSHEET',
        },
      ],
      usageTotals: {
        fuel: 0,
        electricity: 0,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 37285,
      totalRecordsFound: 10,
      recordsIncluded: 9,
      processedRecords: 9,
      skippedRecords: 1,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
      },
      missingFactorRecords: 0,
      matchedFactorsCount: 1,
      missingFactors: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      calculationDetails: [
        {
          activityDataId: 'activity-1',
          activityType: 'NATURAL_GAS',
          activityQuantity: 1000,
          activityUnit: 'm3',
          status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 1890,
          scope: 'SCOPE_1',
        },
      ],
      invalidRecordCount: 0,
      dataQualityCoverage: 100,
      totalRecords: 10,
      recordsInScope: 10,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Report Scope/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Reporting Boundary/i })).toBeInTheDocument();
  });

  const workflowEvent: ActivityEventItem = {
    id: 'event-1',
    eventName: 'RECORDS_IMPORTED',
    createdAt: '2026-08-14T17:22:00.000Z',
    userEmail: 'pilot@example.com',
    metadata: {
      sourceFileName: 'Golden Test Data.xlsx',
      includedEmissionsRecords: 9,
      trackedOnlyRecords: 1,
      rowsNotImported: 0,
      totalRowsConsidered: 10,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'pilot@example.com',
        organizationName: 'KACH CANADA LTD.',
      }),
    );
    vi.mocked(loadDefaultMetricsDateRange).mockResolvedValue({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      hasActivityRecords: true,
    });
    vi.mocked(loadMetricsOverview).mockResolvedValue({
      summary: {},
      activities: [
        {
          id: 'activity-1',
          activityType: 'NATURAL_GAS',
          recordDate: '2026-07-20',
          quantity: 1000,
          unit: 'm3',
          sourceType: 'SPREADSHEET',
        },
      ],
      usageTotals: {
        fuel: 0,
        electricity: 0,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 37285,
      totalRecordsFound: 10,
      recordsIncluded: 9,
      processedRecords: 9,
      skippedRecords: 1,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
      },
      missingFactorRecords: 0,
      matchedFactorsCount: 1,
      missingFactors: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      calculationDetails: [
        {
          activityDataId: 'activity-1',
          activityType: 'NATURAL_GAS',
          activityQuantity: 1000,
          activityUnit: 'm3',
          status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 1890,
          scope: 'SCOPE_1',
        },
      ],
      invalidRecordCount: 0,
      dataQualityCoverage: 100,
      totalRecords: 10,
      recordsInScope: 10,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);
    vi.mocked(getWorkflowActivityEvents).mockResolvedValue({
      items: [workflowEvent],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(trackActivityEvent).mockResolvedValue({} as ActivityEventItem);
  });

  afterEach(() => {
    localStorage.clear();
    delete (jsPDF.API as any).save;
    delete (jsPDF.API as any).text;
  });

  it.each(['success', 'failure'] as const)('disables every export while a new date request loads and after its %s', async (outcome) => {
    const { container } = render(<MemoryRouter><ReportingPage /></MemoryRouter>);
    const trigger = screen.getByRole('button', { name: /^Export reports$/i });
    await waitFor(() => expect(trigger).toBeEnabled());
    await openExportMenu();
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
    items.forEach((item) => expect(item).toBeEnabled());
    const nextOverview = await vi.mocked(loadMetricsOverview).mock.results[0].value;
    let resolve!: (value: typeof nextOverview) => void;
    let reject!: (error: Error) => void;
    vi.mocked(loadMetricsOverview).mockReturnValueOnce(new Promise((yes, no) => { resolve = yes; reject = no; }));
    const start = container.querySelector<HTMLInputElement>('input[type="date"]')!;
    fireEvent.change(start, { target: { value: '2026-04-01' } });
    fireEvent.blur(start);
    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalledTimes(2));
    expect(trigger).toBeDisabled();
    items.forEach((item) => expect(item).toBeDisabled());
    await act(async () => outcome === 'success' ? resolve(nextOverview) : reject(new Error('B failed')));
    if (outcome === 'success') {
      expect(trigger).toBeEnabled();
      items.forEach((item) => expect(item).toBeEnabled());
    } else {
      expect(trigger).toBeDisabled();
      items.forEach((item) => expect(item).toBeDisabled());
      expect(screen.getByText(/Unable to generate|could not|failed|try again/i)).toBeInTheDocument();
    }
  });

  it('prevents date edits until the default range loads so initialization cannot overwrite the selected period', async () => {
    let resolveRange!: (value: Awaited<ReturnType<typeof loadDefaultMetricsDateRange>>) => void;
    vi.mocked(loadDefaultMetricsDateRange).mockReturnValueOnce(new Promise(resolve => {
      resolveRange = resolve;
    }));
    const { container } = render(<MemoryRouter><ReportingPage /></MemoryRouter>);
    const dates = container.querySelectorAll<HTMLInputElement>('input[type="date"]');
    expect(dates).toHaveLength(2);
    expect(dates[0]).toBeDisabled();
    expect(dates[1]).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generating...', exact: true })).toBeDisabled();
    expect(loadMetricsOverview).not.toHaveBeenCalled();

    await act(async () => resolveRange({ startDate: '2025-08-31', endDate: '2026-10-14', hasActivityRecords: true }));
    await waitFor(() => expect(dates[0]).toBeEnabled());
    fireEvent.change(dates[0], { target: { value: '2025-08-01' } });
    fireEvent.blur(dates[0]);
    await waitFor(() => expect(loadMetricsOverview).toHaveBeenLastCalledWith(expect.objectContaining({ dateFrom: '2025-08-01', dateTo: '2026-10-14' })));
    await waitFor(() => expect(dates[0]).toBeEnabled());
    expect(dates[0]).toHaveValue('2025-08-01');
  });

  it('keeps a fresh workspace empty and refreshes persisted import history once', async () => {
    const imported: ActivityEventItem = {
      id: 'batch-event-1', eventName: 'ACTIVITY_RECORD_IMPORTED', organizationId: 'workspace-a', userId: 'actor-a',
      createdAt: '2026-10-14T14:00:00.000Z', entityType: 'Document', entityId: 'source-1',
      metadata: { sourceFileName: 'carbonlite_field_mapping_test.xlsx', createdRecordCount: 5, trackedMetricCount: 0, unresolvedRowCount: 0 },
    };
    vi.mocked(getWorkflowActivityEvents).mockResolvedValueOnce({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    vi.mocked(getWorkflowActivityEvents).mockResolvedValue({ items: [imported], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    render(<MemoryRouter><ReportingPage /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: /Expand Audit Trail/ }));
    expect(await screen.findByText('No workflow audit events recorded yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Refresh', exact: true }));
    expect(await screen.findByText('Import confirmed')).toBeInTheDocument();
    expect(screen.getByText(/5 activity records imported from carbonlite_field_mapping_test.xlsx/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Refresh', exact: true }));
    await waitFor(() => expect(getWorkflowActivityEvents).toHaveBeenCalledTimes(3));
    expect(screen.getAllByText('Import confirmed')).toHaveLength(1);
    expect(getWorkflowActivityEvents).toHaveBeenLastCalledWith({ pageSize: 20 });
  });

  it('shows a query failure instead of claiming that history is empty', async () => {
    vi.mocked(getWorkflowActivityEvents).mockRejectedValue(new Error('Network unavailable'));
    render(<MemoryRouter><ReportingPage /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: /Expand Audit Trail/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load workflow history');
    expect(screen.queryByText('No workflow audit events recorded yet.')).not.toBeInTheDocument();
  });

  it('keeps workflow audit collapsed and does not log report generated on load', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    const auditToggle = screen.getByRole('button', { name: /Audit Trail/i });
    expect(auditToggle).toHaveAttribute('aria-expanded', 'false');
    expect(auditToggle).toHaveTextContent('Expand');
    expect(screen.queryByText(/Records processed from Golden Test Data/i)).not.toBeInTheDocument();

    expect(trackActivityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'REPORT_VIEWED' }),
    );
    expect(trackActivityEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'REPORT_GENERATED' }),
    );

    await userEvent.click(auditToggle);

    expect(auditToggle).toHaveAttribute('aria-expanded', 'true');
    expect(auditToggle).toHaveTextContent('Collapse');
    expect(await screen.findByText('Records imported')).toBeInTheDocument();
    expect(screen.getByText(/Records processed from Golden Test Data/i)).toBeInTheDocument();
    expect(screen.getByText(/10 rows processed in total/i)).toBeInTheDocument();
  });

  it('shows reconciled import audit categories for previously imported skipped rows', async () => {
    vi.mocked(getWorkflowActivityEvents).mockResolvedValueOnce({
      items: [
        {
          ...workflowEvent,
          metadata: {
            sourceFileName: 'carbonlite_needs_review_test.xlsx',
            totalRowsConsidered: 9,
            includedEmissionsCreated: 1,
            trackedMetricsCreated: 1,
            alreadyImportedSkipped: 1,
            needsReviewSkipped: 6,
            duplicateSkipped: 0,
            otherSkipped: 0,
            rowsNotImported: 7,
          },
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /Audit Trail/i }));

    expect(
      screen.getByText(
        /Records processed from carbonlite_needs_review_test\.xlsx: 1 emissions record imported, 1 tracked metric imported, 1 previously imported record skipped, 6 records still require review\. 9 rows processed in total\./i,
      ),
    ).toBeInTheDocument();
  });

  it('shows optional cost completeness numerator and denominator in Data Quality Notes', async () => {
    vi.mocked(loadMetricsOverview).mockResolvedValue({
      summary: {},
      activities: [],
      usageTotals: {
        fuel: 0,
        electricity: 0,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 579.4,
      totalRecordsFound: 3,
      recordsIncluded: 2,
      processedRecords: 2,
      skippedRecords: 1,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
      },
      missingFactorRecords: 0,
      matchedFactorsCount: 2,
      missingFactors: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      calculationDetails: [
        {
          activityDataId: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          recordDate: '2026-03-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          activityQuantity: 980,
          activityUnit: 'kWh',
          factorSource: 'System factor',
          factorVerified: true,
          calculatedEmissionsKgCO2e: 519.4,
          status: 'CALCULATED',
          sourceType: 'IMPORT',
          sourceReference: 'MARCH-ELEC-001',
          costCad: 214.55,
        },
        {
          activityDataId: 'activity-march-water-007',
          activityType: 'WATER',
          recordDate: '2026-03-07',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          activityQuantity: 18,
          activityUnit: 'm3',
          factorSource: 'Tracked metric',
          factorVerified: false,
          calculatedEmissionsKgCO2e: null,
          status: 'TRACKED_ONLY',
          sourceType: 'IMPORT',
          sourceReference: 'MARCH-WATER-007',
          costCad: 64,
        },
        {
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          recordDate: '2026-03-10',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Ontario, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Ontario',
          activityQuantity: 4,
          activityUnit: 'nights',
          factorSource: 'System factor',
          factorVerified: true,
          calculatedEmissionsKgCO2e: 60,
          status: 'CALCULATED',
          sourceType: 'IMPORT',
          sourceReference: 'MARCH-HOTEL-010',
          costCad: 720,
        },
      ],
      invalidRecordCount: 0,
      dataQualityCoverage: 100,
      totalRecords: 3,
      recordsInScope: 3,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    const section = await screen.findByRole('region', { name: /Data Quality Notes/i });
    expect(section).toHaveTextContent('Optional Data Completeness');
    expect(section).toHaveTextContent('100%');
    expect(section).toHaveTextContent('3 of 3 imported activity records include optional cost data');

    await downloadTechnicalReviewPackage();
    const dataQualityNotesCall = vi.mocked(autoTable).mock.calls.find(([, options]) =>
      JSON.stringify((options as { body?: unknown[][] }).body).includes('Optional Data Completeness'),
    );
    const dataQualityNotesBody = JSON.stringify(
      (dataQualityNotesCall?.[1] as { body?: unknown[][] } | undefined)?.body,
    );
    expect(dataQualityNotesBody).toContain('Optional Data Completeness');
    expect(dataQualityNotesBody).toContain('100%');
    expect(dataQualityNotesBody).toContain('3 of 3 imported activity records include optional cost data');
  });

  it('renders short source filenames normally with the complete filename available', async () => {
    const sourceFileName = 'source.xlsx';
    const sourceReviewSection = await renderGeneratedSourceReviewSection([sourceFileName]);

    const sourceFileValue = getSourceReviewMetricValue(sourceReviewSection, 'Source Files', sourceFileName);
    expect(sourceFileValue).toHaveTextContent(sourceFileName);
    expect(sourceFileValue).toHaveAttribute('title', sourceFileName);

    const sourceFileCard = sourceFileValue.closest('div');
    expect(sourceFileCard).toHaveStyle('min-width: 0');
    expect(sourceReviewSection).toHaveTextContent('Source Rows Assessed');
    expect(sourceReviewSection).toHaveTextContent('Rows Resolved / Imported');
    expect(sourceReviewSection).toHaveTextContent('Source Rows Still Needing Attention');
  });

  it('wraps and clamps long source filenames without widening the Source Files card', async () => {
    const sourceFileNames = [
      'carbonlite_needs_review_test.xlsx',
      'averyveryveryveryveryveryveryveryveryverylongunbrokenfilenamewithoutnaturalseparators.xlsx',
    ];
    const expectedSourceFiles = sourceFileNames.join(', ');
    const sourceReviewSection = await renderGeneratedSourceReviewSection(sourceFileNames);

    const sourceFileValue = getSourceReviewMetricValue(
      sourceReviewSection,
      'Source Files',
      expectedSourceFiles,
    );
    expect(sourceFileValue).toHaveAttribute('title', expectedSourceFiles);
    expect(sourceFileValue).toHaveStyle(`
      display: -webkit-box;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      overflow-wrap: anywhere;
      -webkit-line-clamp: 2;
    `);

    const sourceFileCard = sourceFileValue.closest('div');
    expect(sourceFileCard).toHaveStyle('min-width: 0');
    expect(getSourceReviewMetricValue(sourceReviewSection, 'Source Rows Assessed', '2')).toBeInTheDocument();
    expect(getSourceReviewMetricValue(sourceReviewSection, 'Rows Resolved / Imported', '1 of 2')).toBeInTheDocument();
  });

  it('uses structured spreadsheet counts for imported XLSX rows even when raw sourceType looks document-like', async () => {
    const calculationDetails = Array.from({ length: 5 }, (_, index) => ({
      activityDataId: `field-mapping-${index + 1}`,
      activityType: 'ELECTRICITY',
      recordDate: '2026-01-31',
      dateEstimated: false,
      reportingYear: 2026,
      jurisdiction: 'Alberta, Canada',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      activityQuantity: 100 + index,
      activityUnit: 'kWh',
      factorSource: 'CarbonLite',
      factorVerified: true,
      calculatedEmissionsKgCO2e: 10 + index,
      status: 'CALCULATED' as const,
      sourceType: 'DOCUMENT_AI',
      sourceDocumentId: 'document-field-mapping',
      sourceFileName: 'carbonlite_field_mapping_test.xlsx',
      sourceSheetName: 'Operations_2026',
      sourceRow: index + 2,
      sourceReference: `SOURCE-${index + 1}`,
    }));

    vi.mocked(loadMetricsOverview).mockResolvedValue({
      ...sourceReviewOverview([]),
      totalEstimatedEmissionsKgCO2e: 60,
      totalRecordsFound: 5,
      recordsIncluded: 5,
      processedRecords: 5,
      skippedRecords: 0,
      calculationDetails,
      sourceReviewRows: [],
      totalRecords: 5,
      recordsInScope: 5,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /Generate Report/i }));
    const sourceReviewSection = screen.getByRole('region', { name: /Source Data Status/i });

    expect(getSourceReviewMetricValue(sourceReviewSection, 'Source Rows Assessed', '5')).toBeInTheDocument();
    expect(getSourceReviewMetricValue(sourceReviewSection, 'Rows Resolved / Imported', '5 of 5')).toBeInTheDocument();
    expect(getSourceReviewMetricValue(sourceReviewSection, 'Source Rows Still Needing Attention', '0')).toBeInTheDocument();
    expect(sourceReviewSection).not.toHaveTextContent('Limited');
    expect(sourceReviewSection).not.toHaveTextContent(/document import/i);
  });

  it('shows unresolved source spreadsheet review rows separately from imported report records and PDF totals', async () => {
    const sourceReviewRows = [
      {
        id: 'review-march-elec-001',
        sourceDocumentId: 'doc-march',
        rowId: 'march-elec-001',
        status: 'READY',
        activityType: 'ELECTRICITY',
        recordDate: '2026-03-01',
        quantity: 980,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'March',
        sourceRow: 2,
        sourceReference: 'MARCH-ELEC-001',
        issues: [],
      },
      {
        id: 'review-march-hotel-010',
        sourceDocumentId: 'doc-march',
        rowId: 'march-hotel-010',
        status: 'READY',
        activityType: 'HOTEL',
        recordDate: '2026-03-10',
        quantity: 4,
        unit: 'nights',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Ontario',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'March',
        sourceRow: 11,
        sourceReference: 'MARCH-HOTEL-010',
        issues: [],
      },
      {
        id: 'review-march-water-007',
        sourceDocumentId: 'doc-march',
        rowId: 'march-water-007',
        status: 'TRACKED_ONLY',
        activityType: 'WATER',
        recordDate: '2026-03-07',
        quantity: 18,
        unit: 'm3',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'March',
        sourceRow: 8,
        sourceReference: 'MARCH-WATER-007',
        issues: [],
      },
      ...[
        ['MARCH-ELEC-002', 'ELECTRICITY', 'MISSING_PROVINCE', 'Province is required for electricity rows.', 3, 760, 'kWh'],
        ['MARCH-GAS-003', 'NATURAL_GAS', 'MISSING_UNIT', 'Unit is required.', 4, 100, ''],
        ['MARCH-FUEL-004', 'GASOLINE', 'INVALID_QUANTITY', 'Quantity must be a number greater than 0.', 5, null, 'L'],
        ['MARCH-OTHER-005', '', 'MISSING_ACTIVITY_TYPE', 'Activity type is required.', 6, 1, 'each'],
        ['MARCH-DIESEL-006', 'DIESEL', 'UNIT_MISMATCH', 'Diesel requires liters.', 7, 240, 'kg'],
        ['MARCH-AIR-008', 'AIR_TRAVEL', 'MISSING_QUANTITY', 'Quantity is required.', 9, null, 'km'],
      ].map(([sourceReference, activityType, code, message, sourceRow, quantity, unit]) => ({
        id: `review-${sourceReference}`,
        sourceDocumentId: 'doc-march',
        rowId: String(sourceReference).toLowerCase(),
        status: 'NEEDS_REVIEW' as const,
        activityType: String(activityType),
        recordDate: '2026-03-01',
        quantity: quantity as number | null,
        unit: String(unit),
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: code === 'MISSING_PROVINCE' ? null : 'Alberta',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'March',
        sourceRow: sourceRow as number,
        sourceReference: String(sourceReference),
        issues: [
          {
            code: String(code),
            field: 'source',
            message: String(message),
          },
        ],
        calculationStatus: String(code),
        reportTreatment: 'EXCLUDED',
      })),
    ];

    vi.mocked(loadMetricsOverview).mockResolvedValue({
      summary: {},
      activities: [],
      usageTotals: {
        fuel: 0,
        electricity: 0,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 579.4,
      totalRecordsFound: 3,
      recordsIncluded: 2,
      processedRecords: 2,
      skippedRecords: 1,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
      },
      missingFactorRecords: 0,
      matchedFactorsCount: 2,
      missingFactors: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      calculationDetails: [
        {
          activityDataId: 'activity-march-elec-001',
          sourceDocumentId: 'doc-march',
          activityType: 'ELECTRICITY',
          activityQuantity: 980,
          activityUnit: 'kWh',
          status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 519.4,
          sourceReference: 'MARCH-ELEC-001',
        },
        {
          activityDataId: 'activity-march-water-007',
          sourceDocumentId: 'doc-march',
          activityType: 'WATER',
          activityQuantity: 18,
          activityUnit: 'm3',
          status: 'TRACKED_ONLY',
          calculatedEmissionsKgCO2e: null,
          sourceReference: 'MARCH-WATER-007',
        },
        {
          activityDataId: 'activity-march-hotel-010',
          sourceDocumentId: 'doc-march',
          activityType: 'HOTEL',
          activityQuantity: 4,
          activityUnit: 'nights',
          status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 60,
          sourceReference: 'MARCH-HOTEL-010',
        },
      ],
      sourceReviewRows,
      invalidRecordCount: 0,
      dataQualityCoverage: 100,
      totalRecords: 3,
      recordsInScope: 3,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryAllByText(/2 calculated/i).length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: /Generate Report/i }));
    const dataQualitySection = screen.getByRole('region', { name: /Data Quality Notes/i });
    expect(dataQualitySection).toHaveTextContent('Imported Activity Records Needing Attention');
    expect(dataQualitySection).toHaveTextContent('Source Rows Still Needing Attention');
    expect(dataQualitySection).toHaveTextContent('6');

    const sourceReviewSection = screen.getByRole('region', { name: /Source Data Status/i });
    expect(sourceReviewSection).toHaveTextContent('3 of 9 source rows resolved/imported · 6 need attention');
    expect(sourceReviewSection).toHaveTextContent('Source Rows Assessed');
    expect(sourceReviewSection).toHaveTextContent('Rows Resolved / Imported');
    expect(sourceReviewSection).toHaveTextContent('3 of 9');
    expect(sourceReviewSection).toHaveTextContent('MARCH-ELEC-002');
    expect(sourceReviewSection).toHaveTextContent('MARCH-AIR-008');
    expect(sourceReviewSection).toHaveTextContent('Quantity is required.');

    await downloadTechnicalReviewPackage();
    const pdfBodies = vi.mocked(autoTable).mock.calls.map(([, options]) =>
      JSON.stringify((options as { body?: unknown[][] } | undefined)?.body ?? []),
    );
    expect(pdfBodies.some((body) => body.includes('Source Rows Still Needing Attention') && body.includes('6'))).toBe(true);
    expect(pdfBodies.join(' ')).not.toContain('No records need attention for this report scope');
    const sourceRowsPdfBody = pdfBodies.find((body) => body.includes('MARCH-ELEC-002')) ?? '';
    expect(sourceRowsPdfBody).toContain('MARCH-GAS-003');
    expect(sourceRowsPdfBody).toContain('MARCH-FUEL-004');
    expect(sourceRowsPdfBody).toContain('MARCH-OTHER-005');
    expect(sourceRowsPdfBody).toContain('MARCH-DIESEL-006');
    expect(sourceRowsPdfBody).toContain('MARCH-AIR-008');
    expect(sourceRowsPdfBody).toContain('Missing Province');
    expect(sourceRowsPdfBody).toContain('Missing Unit');
    expect(sourceRowsPdfBody).toContain('Invalid Quantity');
    expect(sourceRowsPdfBody).toContain('Missing Activity Type');
    expect(sourceRowsPdfBody).toContain('Unit Mismatch');
    expect(sourceRowsPdfBody).toContain('Missing Quantity');
    expect(sourceRowsPdfBody).not.toContain('MISSING_PROVINCE');
    expect(sourceRowsPdfBody).not.toContain('INVALID_QUANTITY');
    expect(sourceRowsPdfBody).toContain('Quantity is required.');
    expect(sourceRowsPdfBody).toContain('Diesel requires liters.');

    const sourceRowsAppendixCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return headers.includes('Issue Type') && headers.includes('Issue') && headers.includes('Action');
    });
    const sourceRowsAppendixOptions = sourceRowsAppendixCall?.[1] as {
      columnStyles?: Record<number, { cellWidth?: number }>;
      tableWidth?: number;
      margin?: { left?: number; right?: number };
    };
    const sourceRowsColumnWidth = Object.values(sourceRowsAppendixOptions.columnStyles ?? {}).reduce(
      (total, style) => total + Number(style.cellWidth ?? 0),
      0,
    );
    expect(sourceRowsAppendixOptions.margin).toMatchObject({ left: 14, right: 14 });
    expect(sourceRowsAppendixOptions.tableWidth).toBe(265);
    expect(sourceRowsColumnWidth).toBeLessThanOrEqual(265);
  });

  it('uses compact hotspot rank header and tracked metric wording in the technical PDF', async () => {
    vi.mocked(loadMetricsOverview).mockResolvedValue({
      summary: {},
      activities: [],
      usageTotals: {
        fuel: 0,
        electricity: 980,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 579.4,
      totalRecordsFound: 3,
      recordsIncluded: 2,
      processedRecords: 2,
      skippedRecords: 1,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
      },
      missingFactorRecords: 0,
      matchedFactorsCount: 2,
      missingFactors: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      calculationDetails: [
        {
          activityDataId: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          activityQuantity: 980,
          activityUnit: 'kWh',
          status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 519.4,
          scope: 'SCOPE_2',
          sourceReference: 'MARCH-ELEC-001',
        },
        {
          activityDataId: 'activity-march-water-007',
          activityType: 'WATER',
          activityQuantity: 18,
          activityUnit: 'm3',
          status: 'TRACKED_ONLY',
          calculatedEmissionsKgCO2e: null,
          sourceReference: 'MARCH-WATER-007',
        },
        {
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          activityQuantity: 4,
          activityUnit: 'nights',
          status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 60,
          scope: 'SCOPE_3',
          sourceReference: 'MARCH-HOTEL-010',
        },
      ],
      sourceReviewRows: [],
      invalidRecordCount: 0,
      dataQualityCoverage: 100,
      totalRecords: 3,
      recordsInScope: 3,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await downloadTechnicalReviewPackage();

    const hotspotCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return headers.includes('Focus Message') && headers.includes('Hotspot Level');
    });
    expect(hotspotCall).toBeDefined();
    expect((hotspotCall?.[1] as { head?: string[][] } | undefined)?.head?.[0]?.[0]).toBe('#');
    expect((hotspotCall?.[1] as { head?: string[][] } | undefined)?.head?.[0]).not.toContain('Rank');

    const allPdfTables = vi.mocked(autoTable).mock.calls.map(([, options]) =>
      JSON.stringify(options ?? {}),
    ).join(' ');
    expect(allPdfTables).toContain('Tracked Metric. Not included in the GHG emissions total.');
    expect(allPdfTables).not.toContain('Tracked only.');
  });

  it('fits the record-level source evidence appendix within the landscape printable width', async () => {
    const splitCalls: Array<{ text: string; width: number }> = [];
    const originalSplitTextToSize = (jsPDF.API as any).splitTextToSize;
    (jsPDF.API as any).splitTextToSize = function splitTextToSizeMock(
      this: any,
      text: string,
      width: number,
    ) {
      splitCalls.push({ text, width });
      return [text];
    };

    vi.mocked(loadMetricsOverview).mockResolvedValue({
      summary: {},
      activities: [
        {
          id: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          recordDate: '2026-03-01',
          quantity: 980,
          unit: 'kWh',
          sourceType: 'SPREADSHEET',
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceReference: 'MARCH-ELEC-001',
          sourceRow: 2,
        },
        {
          id: 'activity-march-water-007',
          activityType: 'WATER',
          recordDate: '2026-03-07',
          quantity: 18,
          unit: 'm3',
          sourceType: 'SPREADSHEET',
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceReference: 'MARCH-WATER-007',
          sourceRow: 8,
        },
        {
          id: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          recordDate: '2026-03-10',
          quantity: 4,
          unit: 'nights',
          sourceType: 'SPREADSHEET',
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceReference: 'MARCH-HOTEL-010',
          sourceRow: 11,
        },
      ],
      usageTotals: {
        fuel: 0,
        electricity: 0,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 579.4,
      totalRecordsFound: 3,
      recordsIncluded: 2,
      processedRecords: 2,
      skippedRecords: 1,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
      },
      missingFactorRecords: 0,
      matchedFactorsCount: 2,
      missingFactors: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      calculationDetails: [
        {
          activityDataId: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          recordDate: '2026-03-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          activityQuantity: 980,
          activityUnit: 'kWh',
          factorSource: 'System factor',
          factorVerified: true,
          calculatedEmissionsKgCO2e: 519.4,
          status: 'CALCULATED',
          sourceType: 'IMPORT',
        },
        {
          activityDataId: 'activity-march-water-007',
          activityType: 'WATER',
          recordDate: '2026-03-07',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          activityQuantity: 18,
          activityUnit: 'm3',
          factorSource: 'Tracked metric',
          factorVerified: false,
          calculatedEmissionsKgCO2e: null,
          status: 'TRACKED_ONLY',
          sourceType: 'IMPORT',
        },
        {
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          recordDate: '2026-03-10',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Ontario, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Ontario',
          activityQuantity: 4,
          activityUnit: 'nights',
          factorSource: 'System factor',
          factorVerified: true,
          calculatedEmissionsKgCO2e: 60,
          status: 'CALCULATED',
          sourceType: 'IMPORT',
        },
      ],
      invalidRecordCount: 0,
      dataQualityCoverage: 100,
      totalRecords: 3,
      recordsInScope: 3,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await downloadTechnicalReviewPackage();

    const appendixAIntro = splitCalls.find((call) =>
      call.text.includes('Detailed record-level source evidence retained'),
    );
    const appendixBIntro = splitCalls.find((call) =>
      call.text.includes('ActivityData or the GHG emissions total'),
    );
    expect(appendixAIntro?.width).toBeGreaterThan(180);
    expect(appendixBIntro?.width).toBeGreaterThan(180);
    expect(appendixAIntro?.width).toBeLessThan(265);
    expect(appendixBIntro?.width).toBeLessThan(265);

    const appendixCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return headers.includes('Source / Import Method') && headers.includes('Validation Note');
    });
    expect(appendixCall).toBeDefined();

    const appendixOptions = appendixCall?.[1] as {
      body?: unknown[][];
      columnStyles?: Record<number, { cellWidth?: number }>;
      margin?: { left?: number; right?: number };
      tableWidth?: number;
      rowPageBreak?: string;
      showHead?: string;
    };
    const totalColumnWidth = Object.values(appendixOptions.columnStyles ?? {}).reduce(
      (total, style) => total + Number(style.cellWidth ?? 0),
      0,
    );
    expect(appendixOptions.margin).toMatchObject({ left: 14, right: 14 });
    expect(appendixOptions.tableWidth).toBe(265);
    expect(totalColumnWidth).toBeLessThanOrEqual(265);
    expect(appendixOptions.rowPageBreak).toBe('avoid');
    expect(appendixOptions.showHead).toBe('everyPage');

    const appendixText = JSON.stringify(appendixOptions.body ?? []);
    expect(appendixText).toContain('Business Travel - Accommodation');
    expect(appendixText).toContain('carbonlite_needs_review_test.xlsx');
    expect(appendixText).toContain('MARCH-ELEC-001 · Line item 2');
    expect(appendixText).toContain('MARCH-WATER-007 · Line item 8');
    expect(appendixText).toContain('MARCH-HOTEL-010 · Line item 11');
    expect(appendixText).toContain('Matched');
    expect(appendixText).toContain('Tracked Metric');

    (jsPDF.API as any).splitTextToSize = originalSplitTextToSize;
  });

  it('shows one global expand/collapse control pair that controls report sections', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /Generate Report/i }));

    expect(screen.getAllByRole('button', { name: 'Expand all' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Collapse all' })).toHaveLength(1);

    expect(screen.getByRole('button', { name: /Expand Activity Records/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: /Expand G\. Emissions Breakdown/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));

    expect(screen.getByRole('button', { name: /Collapse Activity Records/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Collapse G\. Emissions Breakdown/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Collapse all' }));

    expect(screen.getByRole('button', { name: /Expand Activity Records/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: /Expand G\. Emissions Breakdown/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('shows report context while hiding internal workflow audit details for pilot reviewer accounts', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'reviewer@example.com',
        organizationName: 'CarbonLite Sample Workspace',
        role: 'VIEWER',
        accountType: 'PILOT_REVIEWER',
      }),
    );

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument();

    const reportScopeSection = screen.getByRole('region', { name: 'Report Scope' });
    const reportScopeToggle = within(reportScopeSection).getByRole('button', { name: /Report Scope/i });
    expect(reportScopeToggle).toBeInTheDocument();
    expect(reportScopeToggle).toHaveAttribute('aria-expanded', 'true');
    expect(reportScopeSection).toHaveTextContent(/Date Range/i);
    expect(reportScopeSection).toHaveTextContent(/2026-01-01 to 2026-12-31/i);

    const boundarySection = screen.getByRole('region', { name: 'Reporting Boundary' });
    expect(boundarySection).toHaveTextContent(
      '2026-01-01 to 2026-12-31 · Scope 1, Scope 2, selected Scope 3 · Sample Canadian operations',
    );
    const boundaryToggle = within(boundarySection).getByRole('button', { name: 'Expand Reporting Boundary' });
    expect(boundaryToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(boundarySection).queryByText('Organization / Workspace')).not.toBeInTheDocument();
    await userEvent.click(boundaryToggle);
    expect(boundaryToggle).toHaveAttribute('aria-expanded', 'true');
    expect(boundaryToggle).toHaveTextContent('Collapse');
    expect(boundarySection).toHaveTextContent(/Pilot review account/i);
    expect(boundarySection).toHaveTextContent(/Read-only/i);
    expect(within(boundarySection).queryByRole('button', { name: /Edit in Organization & Boundary/i })).not.toBeInTheDocument();
    expect(within(boundarySection).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(boundarySection).getByText('Organization / Workspace')).toBeInTheDocument();
    expect(within(boundarySection).getByText('CarbonLite Sample Workspace')).toBeInTheDocument();
    await userEvent.click(boundaryToggle);
    expect(boundaryToggle).toHaveAttribute('aria-expanded', 'false');
    expect(boundaryToggle).toHaveTextContent('Expand');
    expect(within(boundarySection).queryByText('Organization / Workspace')).not.toBeInTheDocument();

    const regulatorySection = screen.getByRole('region', { name: 'Regulatory Reporting Reference' });
    expect(regulatorySection).toHaveTextContent(
      /Reference only · Not an official filing or compliance determination/i,
    );
    const regulatoryToggle = within(regulatorySection).getByRole('button', {
      name: 'Expand Regulatory Reporting Reference',
    });
    expect(regulatoryToggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(regulatoryToggle);
    expect(regulatoryToggle).toHaveAttribute('aria-expanded', 'true');
    expect(regulatorySection).toHaveTextContent(/CRA fuel charge return/i);
    expect(regulatorySection).toHaveTextContent(/official GHGRP submission/i);
    expect(regulatorySection).toHaveTextContent(/TIER compliance report/i);
    expect(regulatorySection).toHaveTextContent(/third-party verification/i);
    expect(regulatorySection).toHaveTextContent(/regulatory compliance advice/i);
    expect(regulatorySection).toHaveTextContent(/Federal GHGRP Single Window reporting/i);
    expect(regulatorySection).not.toHaveTextContent(/Alberta SGRR \/ SWIM reporting/i);
    expect(regulatorySection).not.toHaveTextContent(/Alberta TIER compliance reporting/i);
    expect(regulatorySection).not.toHaveTextContent(/CRA fuel charge forms, where applicable/i);
    expect(regulatorySection).not.toHaveTextContent(/Historical federal fuel-charge requirements may apply/i);

    expect(screen.queryByText(/Workflow history for this workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Recent import and report workflow events/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No workflow audit events recorded yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/raw audit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/audit event id/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/internal workflow logs/i)).not.toBeInTheDocument();
    expect(getWorkflowActivityEvents).not.toHaveBeenCalled();

    expect(screen.getByText(/Have feedback on this page/i)).toBeInTheDocument();
    const feedbackListener = vi.fn();
    window.addEventListener(OPEN_FEEDBACK_OVERLAY_EVENT, feedbackListener);
    const sendFeedbackButton = screen.getByRole('button', { name: 'Send Feedback' });
    expect(sendFeedbackButton).not.toHaveAttribute('href');
    await userEvent.click(sendFeedbackButton);
    expect(feedbackListener).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_FEEDBACK_OVERLAY_EVENT, feedbackListener);
    expect(screen.queryByRole('button', { name: /Reset Demo Data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Report Scope/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/37,285 kg CO₂e/i).length).toBeGreaterThan(0);
  });

  it('shows Regulatory Reporting Reference for regular customer users', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'customer@example.com',
        organizationName: 'KACH CANADA LTD.',
        role: 'ADMIN',
        accountType: 'CUSTOMER',
      }),
    );

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    const regulatorySection = await screen.findByRole('region', { name: 'Regulatory Reporting Reference' });
    expect(regulatorySection).toBeInTheDocument();
    await userEvent.click(
      within(regulatorySection).getByRole('button', {
        name: 'Expand Regulatory Reporting Reference',
      }),
    );

    expect(regulatorySection).toHaveTextContent(/emissions data readiness and internal workflow review only/i);
    expect(regulatorySection).toHaveTextContent(/Federal GHGRP Single Window reporting/i);
  });

  it('does not add Alberta regulatory references from profile province when report records are Ontario-only', async () => {
    localStorage.removeItem('accessToken');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'ontario@example.com',
        organizationName: 'Ontario Operator Ltd.',
        role: 'ADMIN',
        accountType: 'CUSTOMER',
      }),
    );
    localStorage.setItem(
      'carbonlite:organization-profile:Ontario Operator Ltd.',
      JSON.stringify({
        organizationName: 'Ontario Operator Ltd.',
        industry: 'Technology',
        country: 'Canada',
        provinceOrState: 'Alberta',
        city: 'Calgary',
        reportingPeriodStart: '2026-01-01',
        reportingPeriodEnd: '2026-12-31',
        geographicBoundary: 'Ontario-only operating sites',
        includedFacilitiesOrLocations: 'Toronto warehouse',
        includedScopes: 'Scope 1 and Scope 2',
      }),
    );
    vi.mocked(loadMetricsOverview).mockResolvedValueOnce({
      summary: {},
      activities: [
        {
          id: 'activity-ontario-electricity',
          activityType: 'ELECTRICITY',
          recordDate: '2026-07-20',
          quantity: 1000,
          unit: 'kWh',
          sourceType: 'SPREADSHEET',
          jurisdictionRegion: 'Ontario',
          jurisdiction: 'Ontario, Canada',
        } as any,
      ],
      usageTotals: {
        fuel: 0,
        electricity: 1000,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 40,
      totalRecordsFound: 1,
      recordsIncluded: 1,
      processedRecords: 1,
      skippedRecords: 0,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
      },
      missingFactorRecords: 0,
      matchedFactorsCount: 1,
      missingFactors: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      calculationDetails: [
        {
          activityDataId: 'activity-ontario-electricity',
          activityType: 'ELECTRICITY',
          recordDate: '2026-07-20',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Ontario, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Ontario',
          activityQuantity: 1000,
          activityUnit: 'kWh',
          factorSource: 'Ontario factor',
          factorVerified: true,
          calculatedEmissionsKgCO2e: 40,
          status: 'CALCULATED',
          sourceType: 'SPREADSHEET',
        },
      ],
      invalidRecordCount: 0,
      dataQualityCoverage: 100,
      totalRecords: 1,
      recordsInScope: 1,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    const regulatorySection = screen.getByRole('region', { name: 'Regulatory Reporting Reference' });
    await userEvent.click(
      within(regulatorySection).getByRole('button', {
        name: 'Expand Regulatory Reporting Reference',
      }),
    );

    expect(regulatorySection).toHaveTextContent(/Federal GHGRP Single Window reporting/i);
    expect(regulatorySection).not.toHaveTextContent(/Alberta SGRR \/ SWIM reporting/i);
    expect(regulatorySection).not.toHaveTextContent(/Alberta TIER compliance reporting/i);
    expect(regulatorySection).not.toHaveTextContent(/CRA fuel charge forms, where applicable/i);
  });

  it('shows historical federal fuel-charge context for pre-April-2025 periods without making it current', async () => {
    vi.mocked(loadDefaultMetricsDateRange).mockResolvedValueOnce({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      hasActivityRecords: true,
    });

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    expect((await screen.findAllByText(/2024-01-01 to 2024-12-31/i)).length).toBeGreaterThan(0);

    const regulatorySection = screen.getByRole('region', { name: 'Regulatory Reporting Reference' });
    await userEvent.click(
      within(regulatorySection).getByRole('button', {
        name: 'Expand Regulatory Reporting Reference',
      }),
    );

    expect(regulatorySection).toHaveTextContent(/Current regulatory\/reporting references/i);
    expect(regulatorySection).toHaveTextContent(/Historical \/ period-specific reference/i);
    expect(regulatorySection).toHaveTextContent(
      /Historical federal fuel-charge requirements may be relevant for reporting periods before April 1, 2025/i,
    );
    expect(regulatorySection).not.toHaveTextContent(/CRA fuel charge forms, where applicable/i);
    expect(regulatorySection).not.toHaveTextContent(/required to file/i);
  });

  it('shows transitional fuel-charge context for periods spanning April 1, 2025', async () => {
    vi.mocked(loadDefaultMetricsDateRange).mockResolvedValueOnce({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      hasActivityRecords: true,
    });

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    expect((await screen.findAllByText(/2025-01-01 to 2025-12-31/i)).length).toBeGreaterThan(0);

    const boundarySection = screen.getByRole('region', { name: 'Reporting Boundary' });
    expect(boundarySection).toHaveTextContent(
      '2025-01-01 to 2025-12-31',
    );
    await userEvent.click(within(boundarySection).getByRole('button', { name: 'Expand Reporting Boundary' }));
    expect(within(boundarySection).getByText('Reporting period')).toBeInTheDocument();
    expect(within(boundarySection).getByText('2025-01-01 to 2025-12-31')).toBeInTheDocument();
    expect(boundarySection).not.toHaveTextContent('2026-01-01 to 2026-12-31');

    const regulatorySection = screen.getByRole('region', { name: 'Regulatory Reporting Reference' });
    await userEvent.click(
      within(regulatorySection).getByRole('button', {
        name: 'Expand Regulatory Reporting Reference',
      }),
    );

    expect(regulatorySection).toHaveTextContent(
      /Historical federal fuel-charge requirements may apply to activities before April 1, 2025/i,
    );
    expect(regulatorySection).toHaveTextContent(
      /The federal fuel charge ceased for activities after March 31, 2025/i,
    );
    expect(regulatorySection).not.toHaveTextContent(/CRA fuel charge forms, where applicable/i);
  });

	  it('logs PDF_EXPORTED, not REPORT_GENERATED, when downloading the PDF', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    vi.mocked(trackActivityEvent).mockClear();

    const exportButton = screen.getByRole('button', { name: /^Export reports$/i });
    await waitFor(() => expect(exportButton).toBeEnabled());
    await downloadTechnicalReviewPackage();

    await waitFor(() => {
      expect(trackActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'PDF_EXPORTED' }),
      );
    });
	    expect(trackActivityEvent).not.toHaveBeenCalledWith(
	      expect.objectContaining({ eventName: 'REPORT_GENERATED' }),
	    );
	  });

  it('adds document-control metadata and dynamic footer text to the PDF export', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await downloadTechnicalReviewPackage();

    const reportInfoCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row[0] === 'Report ID');
    });
    expect(reportInfoCall).toBeDefined();

    const reportInfoRows = (reportInfoCall?.[1] as { body?: unknown[][] } | undefined)?.body ?? [];
    const reportInfo = new Map(reportInfoRows.map((row) => [String(row[0]), String(row[1])]));
    const reportId = reportInfo.get('Report ID') ?? '';
    expect(reportId).toMatch(/^CL-DRAFT-2026-[0-9A-Z]{7}$/);
    expect(reportInfo.get('Report Version')).toBe('0.1');
    expect(reportInfo.get('Report Status')).toBe('Pilot Draft');
    expect(reportInfo.get('Generated With')).toBe('CarbonLite Pilot Demo v0.1');
    expect(reportInfo.get('Prepared By')).toBe('CarbonLite');
    expect(reportInfo.get('Reviewer')).toBe('Not yet assigned');
    expect(reportInfo.get('Reviewer Sign-off Status')).toBe('Not reviewed');
    expect(reportInfo.get('Generated With')).not.toBe(reportInfo.get('Report Version'));
  });

  it('offers separate Executive Summary and Technical Emissions Report PDF outputs from the same report snapshot', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());

    const exportButton = screen.getByRole('button', { name: /^Export reports$/i });
    await waitFor(() => expect(exportButton).toBeEnabled());

    await openExportMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /Executive Summary \(PDF\)/i }));
    const executiveReportInfoCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row[0] === 'Output Profile' && row[1] === 'Executive Summary');
    });
    const executiveSnapshotCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row[0] === 'Estimated Emissions');
    });
    expect(executiveReportInfoCall).toBeDefined();
    expect(executiveSnapshotCall).toBeDefined();

    const executiveReportInfoRows =
      (executiveReportInfoCall?.[1] as { body?: unknown[][] } | undefined)?.body ?? [];
    const executiveReportId = String(
      executiveReportInfoRows.find((row) => row[0] === 'Report ID')?.[1] ?? '',
    );

    vi.mocked(autoTable).mockClear();
    await downloadTechnicalReviewPackage();
    const technicalReportInfoCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row[0] === 'Output Profile' && row[1] === 'Technical Emissions Report');
    });
    const traceabilityCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return headers.includes('Calculation') && headers.includes('Validation Note');
    });
    expect(technicalReportInfoCall).toBeDefined();
    expect(traceabilityCall).toBeDefined();

    const technicalReportInfoRows =
      (technicalReportInfoCall?.[1] as { body?: unknown[][] } | undefined)?.body ?? [];
    const technicalReportId = String(
      technicalReportInfoRows.find((row) => row[0] === 'Report ID')?.[1] ?? '',
    );
    expect(technicalReportId).toBe(executiveReportId);
  });

  it('keeps the golden Executive Summary to two pages with all page-two sections present', async () => {
    const savedPageCounts: number[] = [];
    const textCalls: string[] = [];
    (jsPDF.API as any).save = function saveMock(this: any) {
      savedPageCounts.push(this.getNumberOfPages());
      return this;
    };
    (jsPDF.API as any).text = function textMock(this: any, text: string | string[]) {
      textCalls.push(Array.isArray(text) ? text.join(' ') : String(text));
      return this;
    };

    vi.mocked(loadMetricsOverview).mockResolvedValue({
      summary: {},
      activities: [],
      usageTotals: {
        fuel: 0,
        electricity: 980,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 579.4,
      totalRecordsFound: 3,
      recordsIncluded: 2,
      processedRecords: 2,
      skippedRecords: 1,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
        trackedOnly: 1,
      },
      missingFactorRecords: 0,
      matchedFactorsCount: 2,
      missingFactors: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [
        {
          activityType: 'ELECTRICITY',
          factorName: 'Electricity - Alberta',
          factorValue: 0.53,
          inputUnit: 'kWh',
          resultUnit: 'kgCO2e',
          jurisdiction: 'Alberta, Canada',
          factorYear: 2025,
          factorVerified: false,
        },
        {
          activityType: 'HOTEL',
          factorName: 'Hotel stays',
          factorValue: 15,
          inputUnit: 'night',
          resultUnit: 'kgCO2e',
          jurisdiction: 'Canada (Generic)',
          factorYear: 2025,
          factorVerified: false,
        },
      ],
      calculationDetails: [
        {
          activityDataId: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          activityQuantity: 980,
          activityUnit: 'kWh',
          status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 519.4,
          scope: 'SCOPE_2',
          sourceReference: 'MARCH-ELEC-001',
          costCad: 214.55,
        },
        {
          activityDataId: 'activity-march-water-007',
          activityType: 'WATER',
          activityQuantity: 18,
          activityUnit: 'm3',
          status: 'TRACKED_ONLY',
          calculatedEmissionsKgCO2e: null,
          sourceReference: 'MARCH-WATER-007',
          costCad: 64,
        },
        {
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          activityQuantity: 4,
          activityUnit: 'nights',
          status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 60,
          scope: 'SCOPE_3',
          sourceReference: 'MARCH-HOTEL-010',
          costCad: 720,
        },
      ],
      sourceReviewRows: [
        ...Array.from({ length: 3 }, (_, index) => ({
          id: `ready-${index}`,
          sourceDocumentId: 'doc-march',
          rowId: `ready-${index}`,
          status: index === 2 ? 'TRACKED_ONLY' : 'READY',
          sourceReference: `READY-${index}`,
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
        })),
        ...Array.from({ length: 6 }, (_, index) => ({
          id: `review-${index}`,
          sourceDocumentId: 'doc-march',
          rowId: `review-${index}`,
          status: 'NEEDS_REVIEW',
          sourceReference: `REVIEW-${index}`,
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          issues: [{ code: 'MISSING_FIELD', message: 'Source row requires review.' }],
        })),
      ],
      invalidRecordCount: 0,
      dataQualityCoverage: 100,
      totalRecords: 3,
      recordsInScope: 3,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await openExportMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /Executive Summary \(PDF\)/i }));

    expect(savedPageCounts).toEqual([2]);
    const tableBodies = vi.mocked(autoTable).mock.calls.map(([, options]) =>
      JSON.stringify((options as { head?: unknown[][]; body?: unknown[][] } | undefined) ?? {}),
    );
    const renderedText = textCalls.join(' ');
    expect(renderedText).toContain('Executive Snapshot');
    expect(tableBodies.join(' ')).toContain('Top Estimated Contributors');
    expect(renderedText).toContain('Emissions Overview');
    expect(renderedText).toContain('Reporting Readiness');
    expect(renderedText).toContain('Key Attention Priorities');
    expect(tableBodies.join(' ')).toContain('Assign a reviewer and complete report review before formal use.');
    expect(tableBodies.join(' ')).not.toContain('Complete reviewer review before formal use.');
    expect(renderedText).toContain('Limitations');
    expect(tableBodies.join(' ')).toContain('579.40 kg CO2e');
    expect(tableBodies.join(' ')).toContain('6 need attention');

    delete (jsPDF.API as any).save;
    delete (jsPDF.API as any).text;
  });

  it('uses distinct review and pilot-stage factor wording in the ENMAX Executive Summary', async () => {
    const savedPageCounts: number[] = [];
    (jsPDF.API as any).save = function saveMock(this: any) {
      savedPageCounts.push(this.getNumberOfPages());
      return this;
    };
    vi.mocked(loadMetricsOverview).mockResolvedValue(enmaxMissingCostOverview());

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await openExportMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /Executive Summary \(PDF\)/i }));

    const tableBodies = vi.mocked(autoTable).mock.calls.map(([, options]) =>
      JSON.stringify((options as { head?: unknown[][]; body?: unknown[][] } | undefined) ?? {}),
    ).join(' ');
    expect(savedPageCounts).toEqual([2]);
    expect(tableBodies).toContain('338.06 kg CO2e');
    expect(tableBodies).toContain(
      'Validate both emission factors before formal use; replace pilot-stage factors where appropriate.',
    );
    expect(tableBodies).not.toContain('Validate or replace 2 pilot-stage emission factors.');
  });

  it('renders ENMAX optional cost completeness as missing and uses document Appendix B wording', async () => {
    const splitCalls: string[] = [];
    const savedPageCounts: number[] = [];
    const originalSplitTextToSize = (jsPDF.API as any).splitTextToSize;
    (jsPDF.API as any).save = function saveMock(this: any) {
      savedPageCounts.push(this.getNumberOfPages());
      return this;
    };
    (jsPDF.API as any).splitTextToSize = function splitTextToSizeMock(
      this: any,
      text: string,
      width: number,
    ) {
      splitCalls.push(text);
      return originalSplitTextToSize.call(this, text, width);
    };
    vi.mocked(loadMetricsOverview).mockResolvedValue(enmaxMissingCostOverview());

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    const section = await screen.findByRole('region', { name: /Data Quality Notes/i });
    expect(section).toHaveTextContent('Optional Data Completeness');
    expect(section).toHaveTextContent('0%');
    expect(section).toHaveTextContent('0 of 3 imported activity records include optional cost data');

    await downloadTechnicalReviewPackage();

    const allPdfTables = vi.mocked(autoTable).mock.calls.map(([, options]) =>
      JSON.stringify((options as { head?: unknown[][]; body?: unknown[][] } | undefined) ?? {}),
    ).join(' ');
    const allSplitText = splitCalls.join(' ');
    expect(allPdfTables).toContain('Optional Data Completeness');
    expect(allPdfTables).toContain('0%');
    expect(allPdfTables).toContain('0 of 3 imported activity records include optional cost data');
    expect(allPdfTables).toContain('338.06 kg CO2e');
    expect(allSplitText).toContain('Environment and Climate Change Canada');
    expect(allPdfTables).toContain('49.44');
    expect(allSplitText).toContain(
      'Structured unresolved source-data rows are not available for this document import.',
    );
    expect(allSplitText).not.toContain('Source spreadsheet rows');
    expect(savedPageCounts).toEqual([3]);

    (jsPDF.API as any).splitTextToSize = originalSplitTextToSize;
    delete (jsPDF.API as any).save;
  });

  it('renders continued Factor Details headings before carried-over factor blocks', async () => {
    const textCalls: string[] = [];
    (jsPDF.API as any).text = function textMock(this: any, text: string | string[]) {
      textCalls.push(Array.isArray(text) ? text.join(' ') : String(text));
      return this;
    };
    const longAssumption =
      'Pilot-stage factor assumption retained for layout pagination review. '.repeat(12);

    vi.mocked(loadMetricsOverview).mockResolvedValue({
      summary: {},
      activities: [],
      usageTotals: {
        fuel: 0,
        electricity: 100,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 579.4,
      totalRecordsFound: 10,
      recordsIncluded: 10,
      processedRecords: 10,
      skippedRecords: 0,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
        trackedOnly: 0,
      },
      missingFactorRecords: 0,
      matchedFactorsCount: 10,
      missingFactors: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: Array.from({ length: 10 }, (_, index) => ({
        factorId: `layout-factor-${index}`,
        activityType: index % 2 === 0 ? 'ELECTRICITY' : 'HOTEL',
        factorName: `Layout Test Factor ${index + 1}`,
        factorValue: index % 2 === 0 ? 0.53 : 15,
        inputUnit: index % 2 === 0 ? 'kWh' : 'night',
        resultUnit: 'kgCO2e',
        jurisdiction: index % 2 === 0 ? 'Alberta, Canada' : 'Canada (Generic)',
        factorYear: 2025,
        factorVerified: false,
        assumptions: longAssumption,
      })),
      calculationDetails: Array.from({ length: 10 }, (_, index) => ({
        activityDataId: `layout-activity-${index}`,
        activityType: index % 2 === 0 ? 'ELECTRICITY' : 'HOTEL',
        activityQuantity: index % 2 === 0 ? 196 : .8,
        activityUnit: index % 2 === 0 ? 'kWh' : 'nights',
        factorId: `layout-factor-${index}`,
        factorName: `Layout Test Factor ${index + 1}`,
        factorValue: index % 2 === 0 ? .53 : 15,
        status: 'CALCULATED',
        calculatedEmissionsKgCO2e: index % 2 === 0 ? 103.88 : 12,
        scope: index % 2 === 0 ? 'SCOPE_2' : 'SCOPE_3',
        sourceReference: `LAYOUT-${index}`,
      })),
      invalidRecordCount: 0,
      dataQualityCoverage: 100,
      totalRecords: 10,
      recordsInScope: 10,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await downloadTechnicalReviewPackage();

    const renderedText = textCalls.join(' ');
    expect(renderedText).toContain('Factor Details / Assumptions');
    expect(renderedText).toContain('Factor Details / Assumptions (continued)');
    expect(renderedText).toContain('Factor: Layout Test Factor 10');
    expect(renderedText.indexOf('Calculation Traceability')).toBeGreaterThan(
      renderedText.indexOf('Factor: Layout Test Factor 10'),
    );

    delete (jsPDF.API as any).text;
  });

		  it('includes Regulatory Reporting Reference in the PDF export', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await downloadTechnicalReviewPackage();

    const regulatoryPdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) =>
        row.some((cell) => String(cell).includes('CRA fuel charge return')),
      );
    });

    expect(regulatoryPdfCall).toBeDefined();
    const regulatoryBody = (regulatoryPdfCall?.[1] as { body?: unknown[][] } | undefined)?.body ?? [];
    expect(String(regulatoryBody.flat().join('\n'))).toContain('Federal GHGRP Single Window reporting');
    expect(String(regulatoryBody.flat().join('\n'))).toContain('Current regulatory/reporting references');
    expect(String(regulatoryBody.flat().join('\n'))).toContain('Regulatory threshold provenance');
    expect(String(regulatoryBody.flat().join('\n'))).toContain(
      'Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.',
    );
    expect(String(regulatoryBody.flat().join('\n'))).not.toContain('CRA fuel charge forms, where applicable');
    expect(String(regulatoryBody.flat().join('\n'))).not.toContain('Historical federal fuel-charge requirements');
    expect(String(regulatoryBody.flat().join('\n'))).not.toContain('Alberta TIER compliance reporting');

    const calculationQualityCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Imported Activity Attention Reasons'));
    });
    expect(calculationQualityCall).toBeDefined();
    const calculationQualityBody = JSON.stringify(
      (calculationQualityCall?.[1] as { body?: unknown[][] } | undefined)?.body ?? [],
    );
    expect(calculationQualityBody).toContain('Imported Activity Attention Reasons');
    expect(calculationQualityBody).not.toContain('"Review Reasons"');
  });

  it('opens the unified Export menu and downloads the report CSV export', async () => {
    const exportedBlobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      exportedBlobs.push(blob as Blob);
      return 'blob:review-package';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await openExportMenu();

    expect(screen.getByRole('menu', { name: /Export report/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Executive Summary \(PDF\)/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Technical Emissions Report \(PDF\)/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Data Export \(CSV\)/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('menuitem', { name: /Data Export \(CSV\)/i }));

    const csv = await readBlobAsText(exportedBlobs[0]);
    expect(csv).toContain('Record No.,Activity Type,Record Date,Quantity');
    expect(csv).toContain('Natural Gas');
    expect(csv).toContain('Calculated Emissions kgCO2e');
    expect(csv).not.toContain('activity-1');
    expect(csv).not.toContain('organizationId');
  });

  it('downloads ENMAX CSV rows with missing Cost CAD as blank cells', async () => {
    const exportedBlobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      exportedBlobs.push(blob as Blob);
      return 'blob:enmax-csv';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.mocked(loadMetricsOverview).mockResolvedValueOnce({
      summary: {},
      activities: [],
      usageTotals: {
        fuel: 0,
        electricity: 0,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 338.06,
      totalRecordsFound: 3,
      recordsIncluded: 2,
      processedRecords: 2,
      skippedRecords: 1,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
      },
      missingFactorRecords: 0,
      matchedFactorsCount: 2,
      missingFactors: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      calculationDetails: [
        {
          activityDataId: 'enmax-electricity',
          activityType: 'ELECTRICITY',
          recordDate: '2025-08-01',
          activityQuantity: 358,
          activityUnit: 'kWh',
          status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 189.74,
          calculationStatus: 'CALCULATED',
          matchingStatus: 'MATCHED',
          sourceReference: 'ENMAX electricity',
          costCad: null,
        },
        {
          activityDataId: 'enmax-natural-gas',
          activityType: 'NATURAL_GAS',
          recordDate: '2025-08-01',
          activityQuantity: 3,
          activityUnit: 'GJ',
          status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 148.32,
          calculationStatus: 'CALCULATED',
          matchingStatus: 'MATCHED',
          sourceReference: 'ENMAX natural gas',
          costCad: null,
        },
        {
          activityDataId: 'enmax-water',
          activityType: 'WATER',
          recordDate: '2025-08-01',
          activityQuantity: 6,
          activityUnit: 'm3',
          status: 'TRACKED_ONLY',
          calculatedEmissionsKgCO2e: null,
          calculationStatus: 'TRACKED_ONLY',
          matchingStatus: 'TRACKED_ONLY',
          sourceReference: 'ENMAX water',
          costCad: null,
        },
      ],
      invalidRecordCount: 0,
      dataQualityCoverage: 100,
      totalRecords: 3,
      recordsInScope: 3,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await openExportMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /Data Export \(CSV\)/i }));

    const csv = await readBlobAsText(exportedBlobs[0]);
    expect(csv).toContain('\n1,Electricity,2025-08-01,358,358 kWh,kWh,,');
    expect(csv).toContain('\n2,Natural Gas,2025-08-01,3,3 GJ,GJ,,');
    expect(csv).toContain('\n3,Water,2025-08-01,6,6 m3,m3,,');
  });

  it('hides carbon credit readiness notes from the standard web report by default', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());

    expect(screen.queryByText('Appendix: Optional Carbon Credit Readiness Notes')).not.toBeInTheDocument();
    expect(screen.queryByText('Optional Carbon Credit Screening Notes')).not.toBeInTheDocument();
    expect(screen.queryByText(/does not determine eligibility for carbon credits/i)).not.toBeInTheDocument();
  });

  it('uses saved organization profile values in the read-only report Reporting Boundary', async () => {
    const adminUser = {
      email: 'admin@example.com',
      role: 'ADMIN' as const,
      organizationId: 'report-boundary-workspace',
      organizationName: 'KACH CANADA LTD.',
    };
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    localStorage.setItem('accessToken', 'report-boundary-token');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
        organizationName: 'KACH CANADA LTD.',
        industry: 'Technology',
        country: 'Canada',
        provinceOrState: 'Alberta',
        city: 'Calgary',
        geographicBoundary: 'Saved Calgary and Ontario reporting boundary',
        includedFacilitiesOrLocations: 'Calgary office; Ontario distribution partner',
        excludedFacilitiesOrLocations: 'Supplier locations outside the pilot boundary',
        includedScopes: 'Scope 1, Scope 2, and selected Scope 3 pilot categories',
        scope3CoverageNote: 'Scope 3 includes selected business travel records only.',
        exclusionsAndLimitations: 'Excluded supplier categories outside the pilot review.',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    render(
      <MemoryRouter initialEntries={['/reports']}>
        <Routes>
          <Route
            path="/reports"
            element={<ReportingPage />}
          />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    const boundarySection = screen.getByRole('region', { name: 'Reporting Boundary' });
    expect(boundarySection).toHaveTextContent(
      '2026-01-01 to 2026-12-31 · Scope 1, Scope 2, selected Scope 3 · Saved Calgary and Ontario reporting boundary',
    );
    await userEvent.click(within(boundarySection).getByRole('button', { name: 'Expand Reporting Boundary' }));

    expect(within(boundarySection).getByText('KACH CANADA LTD.')).toBeInTheDocument();
    expect(
      within(boundarySection).getByText('Saved Calgary and Ontario reporting boundary'),
    ).toBeInTheDocument();
    expect(within(boundarySection).getByText('Boundary status')).toBeInTheDocument();
    expect(within(boundarySection).getByText('Complete')).toBeInTheDocument();
    expect(
      within(boundarySection).getByText('Supplier locations outside the pilot boundary'),
    ).toBeInTheDocument();
    expect(
      within(boundarySection).getByText('Scope 3 includes selected business travel records only.'),
    ).toBeInTheDocument();
    expect(within(boundarySection).getByText('CarbonLite calculation coverage')).toBeInTheDocument();
    expect(within(boundarySection).getByText('Scope 1, Scope 2, selected Scope 3')).toBeInTheDocument();
    expect(within(boundarySection).queryByRole('textbox')).not.toBeInTheDocument();

    await downloadTechnicalReviewPackage();
    const inventoryBoundaryPdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Saved Calgary and Ontario reporting boundary'));
    });

    expect(inventoryBoundaryPdfCall).toBeDefined();

    await userEvent.click(
      within(boundarySection).getByRole('button', { name: /Edit in Organization & Boundary/i }),
    );
    expect(await screen.findByText('Current path: /organization-profile')).toBeInTheDocument();
  });

  it('shows incomplete configured boundary while keeping pilot calculation coverage independent of imported scopes', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'customer@example.com',
        role: 'ADMIN',
        accountType: 'CUSTOMER',
        organizationId: 'customer-empty-boundary',
        organizationName: 'KACH CANADA LTD.',
      }),
    );
    localStorage.setItem('accessToken', 'customer-empty-boundary-token');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            organizationName: 'KACH CANADA LTD.',
            country: 'Canada',
            reportingPeriodStart: '2026-01-01',
            reportingPeriodEnd: '2026-12-31',
            geographicBoundary: '',
            includedFacilitiesOrLocations: '',
            excludedFacilitiesOrLocations: '',
            includedScopes: '',
            scope3CoverageNote: '',
            exclusionsAndLimitations: '',
            boundaryNotes: '',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    const boundarySection = screen.getByRole('region', { name: 'Reporting Boundary' });
    expect(boundarySection).toHaveTextContent(
      '2026-01-01 to 2026-12-31 · Boundary not fully specified',
    );
    expect(boundarySection).not.toHaveTextContent(
      '2026-01-01 to 2026-12-31 · Scope 1, Scope 2, selected Scope 3',
    );
    await userEvent.click(within(boundarySection).getByRole('button', { name: 'Expand Reporting Boundary' }));

    expect(boundarySection).toHaveTextContent('Configured reporting boundary');
    expect(boundarySection).toHaveTextContent('Boundary status');
    expect(boundarySection).toHaveTextContent('Not fully specified');
    expect(boundarySection).toHaveTextContent(
      'Reporting boundary information is incomplete. Calculation results may still be reviewed, but boundary assumptions should be confirmed before formal reporting.',
    );
    expect(boundarySection).not.toHaveTextContent(/Sample Canadian operations/i);
    expect(boundarySection).not.toHaveTextContent(/Sample facilities/i);
    expect(within(boundarySection).getAllByText('Not specified').length).toBeGreaterThanOrEqual(5);
    expect(boundarySection).toHaveTextContent('CarbonLite calculation coverage');
    expect(boundarySection).toHaveTextContent('Scope 1, Scope 2, selected Scope 3');
    expect(boundarySection).toHaveTextContent(
      "This describes the activity categories CarbonLite currently calculates. It does not replace the organization's configured reporting boundary.",
    );
    expect(within(boundarySection).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows emissions by site/facility and includes the breakdown in PDF export', async () => {
    vi.mocked(loadMetricsOverview).mockResolvedValue({
      summary: {},
      activities: [],
      usageTotals: {
        fuel: 0,
        electricity: 0,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
        invalidFuelRecordCount: 0,
        invalidElectricityRecordCount: 0,
      },
      totalEstimatedEmissionsKgCO2e: 9240,
      totalRecordsFound: 6,
      recordsIncluded: 4,
      processedRecords: 4,
      skippedRecords: 2,
      skippedReasons: {
        missingFactor: 1,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
      },
      missingFactorRecords: 1,
      matchedFactorsCount: 3,
      missingFactors: [],
      matchedActivityEmissions: [
        {
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          quantity: 4,
          unit: 'nights',
          estimatedEmissionsKgCO2e: 575,
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-HOTEL-010',
          jurisdiction: 'Ontario, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Ontario',
          factorId: 'hotel-canada-generic',
        },
      ],
      conversionFactorsUsed: [],
      calculationDetails: [
        {
          activityDataId: 'gas-calgary',
          activityType: 'NATURAL_GAS',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          jurisdictionSource: 'record',
          facilityName: 'Calgary Shop',
          activityQuantity: 1000,
          activityUnit: 'm3',
          factorSource: 'System factor',
          factorVerified: true,
          calculatedEmissionsKgCO2e: 1890,
          status: 'CALCULATED',
          sourceType: 'SPREADSHEET',
        },
        {
          activityDataId: 'electricity-calgary',
          activityType: 'ELECTRICITY',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          jurisdictionSource: 'record',
          facilityName: 'Calgary Shop',
          activityQuantity: 12500,
          activityUnit: 'kWh',
          factorSource: 'System factor',
          factorVerified: true,
          calculatedEmissionsKgCO2e: 6625,
          status: 'CALCULATED',
          sourceType: 'SPREADSHEET',
        },
        {
          activityDataId: 'hotel-calgary',
          activityType: 'HOTEL',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          jurisdictionSource: 'record',
          facilityName: 'Calgary Shop',
          activityQuantity: 10,
          activityUnit: 'nights',
          factorSource: 'System factor',
          factorVerified: true,
          calculatedEmissionsKgCO2e: 150,
          status: 'CALCULATED',
          sourceType: 'SPREADSHEET',
        },
        {
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Ontario, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Ontario',
          jurisdictionSource: 'record',
          facilityName: 'Toronto Client Visit',
          activityQuantity: 4,
          activityUnit: 'nights',
          factorSource: 'Canada (Generic) hotel factor',
          factorJurisdictionRegion: 'Canada (Generic)',
          factorVerified: true,
          calculatedEmissionsKgCO2e: 575,
          status: 'CALCULATED',
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-HOTEL-010',
        },
        {
          activityDataId: 'water-calgary',
          activityType: 'WATER',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          jurisdictionSource: 'record',
          facilityName: 'Calgary Shop',
          activityQuantity: 100,
          activityUnit: 'm3',
          factorSource: 'Tracked metric',
          factorVerified: false,
          calculatedEmissionsKgCO2e: 0,
          status: 'TRACKED_ONLY',
          sourceType: 'SPREADSHEET',
        },
        {
          activityDataId: 'missing-factor-calgary',
          activityType: 'ELECTRICITY',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          jurisdictionSource: 'record',
          facilityName: 'Calgary Shop',
          activityQuantity: 100,
          activityUnit: 'kWh',
          factorSource: 'Missing factor',
          factorVerified: false,
          calculatedEmissionsKgCO2e: null,
          status: 'MISSING_FACTOR',
          sourceType: 'SPREADSHEET',
        },
      ],
      invalidRecordCount: 0,
      dataQualityCoverage: 80,
      totalRecords: 6,
      recordsInScope: 6,
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /Generate Report/i }));
    const siteSection = screen.getByRole('region', { name: 'Emissions by Site / Facility' });
    expect(siteSection).toHaveTextContent('Organization total: 9,240 kg CO₂e');
    expect(siteSection).toHaveTextContent('2 site/facility groups');

    await userEvent.click(
      within(siteSection).getByRole('button', { name: /Expand Emissions by Site \/ Facility/i }),
    );

    expect(within(siteSection).getByText('Calgary Shop')).toBeInTheDocument();
    expect(within(siteSection).getByText('Toronto Client Visit')).toBeInTheDocument();
    expect(within(siteSection).getByText('1,890 kg CO₂e')).toBeInTheDocument();
    expect(within(siteSection).getByText('6,625 kg CO₂e')).toBeInTheDocument();
    expect(within(siteSection).getByText('8,665 kg CO₂e')).toBeInTheDocument();
    expect(within(siteSection).getAllByText('575 kg CO₂e').length).toBeGreaterThan(0);
    expect(siteSection).toHaveTextContent('Electricity: 6,625 kg CO₂e');
    expect(siteSection).toHaveTextContent('Natural Gas: 1,890 kg CO₂e');
    expect(siteSection).toHaveTextContent('Business Travel - Accommodation: 575 kg CO₂e');

    const thresholdSection = screen.getByRole('region', {
      name: 'Facility-Level Reporting Threshold Reference',
    });
    expect(thresholdSection).toHaveTextContent('Regulatory threshold screening provenance not configured');

    await userEvent.click(
      within(thresholdSection).getByRole('button', {
        name: /Expand Facility-Level Reporting Threshold Reference/i,
      }),
    );

    expect(thresholdSection).toHaveTextContent(
      'Threshold screening only. This does not constitute regulatory compliance advice.',
    );
    expect(thresholdSection).toHaveTextContent(
      'Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.',
    );
    expect(within(thresholdSection).getByText('Calgary Shop')).toBeInTheDocument();
    expect(within(thresholdSection).getByText('8,665 kg CO₂e (8.7 t CO₂e)')).toBeInTheDocument();
    expect(thresholdSection).toHaveTextContent('Alberta, Canada');
    expect(thresholdSection).toHaveTextContent('Reviewed regulatory source provenance is required before threshold screening.');
    expect(thresholdSection).not.toHaveTextContent('Alberta TIER pilot screening reference');
    expect(thresholdSection).not.toHaveTextContent('100,000');
    const torontoThresholdRow = within(thresholdSection)
      .getByText('Toronto Client Visit')
      .closest('tr');
    expect(torontoThresholdRow).toBeTruthy();
    expect(torontoThresholdRow).toHaveTextContent('Ontario, Canada');
    expect(torontoThresholdRow).toHaveTextContent('Not configured');
    expect(torontoThresholdRow).toHaveTextContent('Not evaluated');
    expect(torontoThresholdRow).toHaveTextContent('Not evaluated');
    expect(torontoThresholdRow).toHaveTextContent(
      'Jurisdiction-specific threshold screening is not currently configured for Ontario.',
    );
    expect(torontoThresholdRow).not.toHaveTextContent('Jurisdiction required');
    expect(torontoThresholdRow).not.toHaveTextContent('Alberta TIER');
    expect(torontoThresholdRow).not.toHaveTextContent('100,000');
    expect(thresholdSection).not.toHaveTextContent(/\bcompliant\b|\bnon-compliant\b/i);

    await downloadTechnicalReviewPackage();
    const sitePdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Calgary Shop') && row.includes('8,665 kg CO2e'));
    });

    expect(sitePdfCall).toBeDefined();
    const pdfText = JSON.stringify(
      vi.mocked(autoTable).mock.calls.map(([, options]) => (options as { body?: unknown[][] }).body ?? []),
    );
    expect(pdfText).toContain('8,665 kg CO2e');
    expect(pdfText).toContain('Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.');
    expect(pdfText).not.toContain('100,000 t CO2e/year');
    expect(pdfText).not.toContain('CO ‚e');
    expect(pdfText).not.toContain('CO,e');
    expect(pdfText).not.toContain('�');

    const thresholdPdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Calgary Shop') && row.includes('Not configured'));
    });

    expect(thresholdPdfCall).toBeDefined();
    const thresholdPdfBody = (thresholdPdfCall?.[1] as { body?: unknown[][] } | undefined)?.body ?? [];
    const torontoPdfRow = thresholdPdfBody.find((row) => row.includes('Toronto Client Visit')) ?? [];
    expect(String(torontoPdfRow.join('\n'))).toContain('Ontario, Canada');
    expect(String(torontoPdfRow.join('\n'))).toContain('Not configured');
    expect(String(torontoPdfRow.join('\n'))).toContain('Not evaluated');
    expect(String(torontoPdfRow.join('\n'))).toContain(
      'Jurisdiction-specific threshold screening is not currently configured for Ontario.',
    );
    expect(String(torontoPdfRow.join('\n'))).not.toContain('Jurisdiction required');
    expect(String(torontoPdfRow.join('\n'))).not.toContain('Alberta TIER');
    expect(String(torontoPdfRow.join('\n'))).not.toContain('100,000');

    const activityPdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) =>
      JSON.stringify((options as { head?: unknown[][] } | undefined)?.head ?? []).includes(
        'Activity Jurisdiction',
      ),
    );
    expect(activityPdfCall).toBeDefined();
    const activityPdfBody = JSON.stringify(
      (activityPdfCall?.[1] as { body?: unknown[][] } | undefined)?.body ?? [],
    );
    expect(activityPdfBody).toContain('Ontario, Canada');
    expect(activityPdfBody).toContain('MARCH-HOTEL-010');
  });

  it('keeps Calculation Traceability PDF rows together and repeats headers across pages', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());

    await downloadTechnicalReviewPackage();

    const traceabilityCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return headers.includes('Calculation') && headers.includes('Validation Note');
    });
    const sourceEvidenceCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return headers.includes('Source Input') && headers.includes('Validation Note');
    });
    const sourceEvidenceSummaryCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return (
	        headers.includes('Source Input') &&
	        headers.includes('Included GHG Records') &&
	        headers.includes('Imported Records Needing Attention') &&
	        !headers.includes('Validation Note')
      );
    });
    const factorSummaryCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return headers.includes('Factor') && headers.includes('Source Year') && headers.includes('Used Records');
    });
    const dataQualityNotesCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return headers.includes('Item') && headers.includes('Status') && body.some((row) => row[0] === 'Calculation Coverage');
    });
    const carbonCreditReadinessCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Readiness Level') || row.includes('Disclaimer'));
    });

    expect(traceabilityCall?.[1]).toMatchObject({
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });
    const traceabilityBody = JSON.stringify(
      (traceabilityCall?.[1] as { body?: unknown[][] } | undefined)?.body ?? [],
    );
    expect(traceabilityBody).not.toContain('CO₂e');
    expect(traceabilityBody).not.toContain('CO ‚e');
    expect(traceabilityBody).not.toContain('CO,e');
    expect(sourceEvidenceCall?.[1]).toMatchObject({
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      tableWidth: 265,
      margin: expect.objectContaining({ left: 14, right: 14 }),
      styles: expect.objectContaining({ fontSize: 7.2, overflow: 'linebreak' }),
      columnStyles: expect.objectContaining({
        4: expect.objectContaining({ cellWidth: 36 }),
        6: expect.objectContaining({ cellWidth: 42 }),
        7: expect.objectContaining({ cellWidth: 23 }),
        9: expect.objectContaining({ cellWidth: 47 }),
      }),
    });
    expect(sourceEvidenceSummaryCall?.[1]).toMatchObject({
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });
    expect((sourceEvidenceSummaryCall?.[1] as { head?: string[][] } | undefined)?.head?.[0]).toEqual([
      'Source Input',
      'Source Type',
      'Import Method',
      'Record-Level References',
      'Included GHG Records',
      'Tracked Metrics',
      'Imported Records Needing Attention',
    ]);
    expect(factorSummaryCall?.[1]).toMatchObject({
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });
    expect((factorSummaryCall?.[1] as { head?: string[][] } | undefined)?.head?.[0]).toEqual([
      'Factor',
      'Value',
      'Unit',
      'Jurisdiction',
      'Source Year',
      'Verification',
      'Used Records',
    ]);
    const dataQualityNotesBody = JSON.stringify(
      (dataQualityNotesCall?.[1] as { body?: unknown[][] } | undefined)?.body,
    );
    expect(dataQualityNotesBody).toContain('Calculation Coverage');
    expect(dataQualityNotesBody).toContain('eligible emission-bearing records were calculated as GHG emissions records');
    expect(dataQualityNotesBody).toContain('Reporting boundary defined');
    expect(dataQualityNotesBody).toContain('Reviewer approval');
    expect(dataQualityNotesBody).toContain('Optional Data Completeness');
    expect(dataQualityNotesCall?.[1]).toMatchObject({
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 38 },
        2: { cellWidth: 92 },
      },
    });
    expect(carbonCreditReadinessCall).toBeUndefined();
  });
});

it('shows Golden A imported records separately from unresolved rows in a selected-document report', async () => {
  const { report, input } = goldenReport('messy');
  const scopedOverview = {
    ...sourceReviewOverview([]),
    activities: input.activities,
    calculationDetails: input.calculationDetails,
    matchedActivityEmissions: input.matchedActivityEmissions,
    conversionFactorsUsed: input.conversionFactorsUsed,
    sourceReviewRows: input.reviewRows,
    totalEstimatedEmissionsKgCO2e: 579.4,
    totalRecordsFound: 3, recordsInScope: 3, totalRecords: 3,
    processedRecords: 2, recordsIncluded: 2, dataQualityCoverage: 100,
  };
  vi.mocked(loadDefaultMetricsDateRange).mockResolvedValue({ startDate: '2026-01-01', endDate: '2026-12-31', hasActivityRecords: true });
  vi.mocked(getWorkflowActivityEvents).mockResolvedValue([]);
  vi.mocked(loadMetricsOverview).mockResolvedValue(scopedOverview as any);
  render(<MemoryRouter initialEntries={[{ pathname: '/reports', state: { reportScope: 'selectedDocuments', selectedDocumentIds: ['doc-partial'] } }]}><ReportingPage /></MemoryRouter>);
  const context = screen.getByRole('region', { name: 'Document review scope' });
  await waitFor(() => expect(context).toHaveTextContent('Imported records: 3 · Unresolved source rows: 6'));
  expect(context).toHaveTextContent('carbonlite_needs_review_test.xlsx');
  expect(context).toHaveTextContent('Unresolved source rows remain excluded until corrected and imported.');
  expect(within(context).getByRole('link', { name: 'View Calculation Results' })).toHaveAttribute('href', '/metrics-summary');
  expect(loadMetricsOverview).toHaveBeenCalledWith({ recalculate: true, requireSourceReviewRows: true, selectedDocumentIds: ['doc-partial'] });
  // Both source completeness and calculation coverage remain independently represented.
  expect(report.inventory).toMatchObject({ importedRecordCount: 3, includedRecordCount: 2, trackedMetricCount: 1, totalKgCO2e: 579.4 });
  expect(report.sourceReview.needsReviewCount).toBe(6);
  expect(report.calculationQuality.calculationCoverage).toContain('100%');
});
