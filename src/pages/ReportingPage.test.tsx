import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import autoTable from 'jspdf-autotable';
import ReportingPage from './ReportingPage';
import {
  loadDefaultMetricsDateRange,
  loadMetricsOverview,
} from '../services/metricsOverview';
import {
  getActivityEvents,
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
  getActivityEvents: vi.fn(),
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
    vi.mocked(getActivityEvents).mockResolvedValue([]);

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
    vi.mocked(getActivityEvents).mockResolvedValue({
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
    vi.mocked(getActivityEvents).mockResolvedValueOnce({
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
    expect(section).toHaveTextContent('3 of 3 imported records include optional cost data');

    await userEvent.click(screen.getByRole('button', { name: /Download PDF/i }));
    const dataQualityNotesCall = vi.mocked(autoTable).mock.calls.find(([, options]) =>
      JSON.stringify((options as { body?: unknown[][] }).body).includes('Optional Data Completeness'),
    );
    const dataQualityNotesBody = JSON.stringify(
      (dataQualityNotesCall?.[1] as { body?: unknown[][] } | undefined)?.body,
    );
    expect(dataQualityNotesBody).toContain(
      '100% · 3 of 3 imported records include optional cost data',
    );
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
    const dataQualitySection = screen.getByRole('region', { name: /Data Quality Notes/i });
    expect(dataQualitySection).toHaveTextContent('Imported Records Requiring Review');
    expect(dataQualitySection).toHaveTextContent('Source Rows Still Requiring Review');
    expect(dataQualitySection).toHaveTextContent('6');

    const sourceReviewSection = screen.getByRole('region', { name: /Source Dataset Review Status/i });
    expect(sourceReviewSection).toHaveTextContent('3 of 9 source rows resolved/imported · 6 require review');
    expect(sourceReviewSection).toHaveTextContent('Reviewable Source Rows');
    expect(sourceReviewSection).toHaveTextContent('Rows Resolved / Imported');
    expect(sourceReviewSection).toHaveTextContent('3 of 9');
    expect(sourceReviewSection).toHaveTextContent('MARCH-ELEC-002');
    expect(sourceReviewSection).toHaveTextContent('MARCH-AIR-008');
    expect(sourceReviewSection).toHaveTextContent('Quantity is required.');

    await userEvent.click(screen.getByRole('button', { name: /Download PDF/i }));
    const pdfBodies = vi.mocked(autoTable).mock.calls.map(([, options]) =>
      JSON.stringify((options as { body?: unknown[][] } | undefined)?.body ?? []),
    );
    expect(pdfBodies.some((body) => body.includes('Source Rows Still Requiring Review') && body.includes('6'))).toBe(true);
    const sourceRowsPdfBody = pdfBodies.find((body) => body.includes('MARCH-ELEC-002')) ?? '';
    expect(sourceRowsPdfBody).toContain('MARCH-GAS-003');
    expect(sourceRowsPdfBody).toContain('MARCH-FUEL-004');
    expect(sourceRowsPdfBody).toContain('MARCH-OTHER-005');
    expect(sourceRowsPdfBody).toContain('MARCH-DIESEL-006');
    expect(sourceRowsPdfBody).toContain('MARCH-AIR-008');
  });

  it('shows one global expand/collapse control pair that controls report sections', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());

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
      '2026 reporting period · Scope 1, Scope 2, selected Scope 3 · Sample Canadian operations',
    );
    const boundaryToggle = within(boundarySection).getByRole('button', { name: 'Expand Reporting Boundary' });
    expect(boundaryToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(boundarySection).queryByText('Organization / Workspace')).not.toBeInTheDocument();
    await userEvent.click(boundaryToggle);
    expect(boundaryToggle).toHaveAttribute('aria-expanded', 'true');
    expect(boundaryToggle).toHaveTextContent('Collapse');
    expect(boundarySection).toHaveTextContent(
      'This reporting boundary is read-only for your account.',
    );
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
    expect(regulatorySection).toHaveTextContent(/Alberta SGRR \/ SWIM reporting/i);
    expect(regulatorySection).toHaveTextContent(/Alberta TIER compliance reporting/i);
    expect(regulatorySection).toHaveTextContent(/CRA fuel charge forms, where applicable/i);

    expect(screen.queryByText(/Workflow history for this workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Recent import and report workflow events/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No workflow audit events recorded yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/raw audit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/audit event id/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/internal workflow logs/i)).not.toBeInTheDocument();
    expect(getActivityEvents).not.toHaveBeenCalled();

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
    const regulatorySection = screen.getByRole('region', { name: 'Regulatory Reporting Reference' });
    expect(regulatorySection).toBeInTheDocument();
    await userEvent.click(
      within(regulatorySection).getByRole('button', {
        name: 'Expand Regulatory Reporting Reference',
      }),
    );

    expect(regulatorySection).toHaveTextContent(/emissions data readiness and internal workflow review only/i);
    expect(regulatorySection).toHaveTextContent(/Federal GHGRP Single Window reporting/i);
  });

  it('logs PDF_EXPORTED, not REPORT_GENERATED, when downloading the PDF', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    vi.mocked(trackActivityEvent).mockClear();

    const pdfButton = screen.getByRole('button', { name: /Download PDF/i });
    await waitFor(() => expect(pdfButton).toBeEnabled());
    await userEvent.click(pdfButton);

    await waitFor(() => {
      expect(trackActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'PDF_EXPORTED' }),
      );
    });
    expect(trackActivityEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'REPORT_GENERATED' }),
    );
  });

  it('includes Regulatory Reporting Reference in the PDF export', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /Download PDF/i }));

    const regulatoryPdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) =>
        row.some((cell) => String(cell).includes('CRA fuel charge return')),
      );
    });

    expect(regulatoryPdfCall).toBeDefined();
    const regulatoryBody = (regulatoryPdfCall?.[1] as { body?: unknown[][] } | undefined)?.body ?? [];
    expect(String(regulatoryBody.flat().join('\n'))).toContain('Federal GHGRP Single Window reporting');
    expect(String(regulatoryBody.flat().join('\n'))).not.toContain('Alberta TIER compliance reporting');
  });

  it('opens Export Review Package menu and downloads calculation traceability CSV', async () => {
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
    await userEvent.click(screen.getByRole('button', { name: /Export Review Package/i }));

    expect(screen.getByRole('menu', { name: /Export review package/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Export Data Records CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Export Site \/ Facility Breakdown/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Export Factor Source Summary/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Export Calculation Traceability/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Export Records Requiring Review/i })).toBeInTheDocument();
    expect(screen.getByText(/not official regulatory submissions/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('menuitem', { name: /Export Calculation Traceability/i }));

    const csv = await readBlobAsText(exportedBlobs[0]);
    expect(csv).toContain('Record Date,Activity Year Used For Matching,Activity Type,Quantity,Unit,Site / Facility');
    expect(csv).toContain('Natural Gas');
    expect(csv).toContain('Calculated Emissions kgCO2e');
    expect(csv).not.toContain('activity-1');
    expect(csv).not.toContain('organizationId');
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
      '2026 reporting period · Scope 1, Scope 2, selected Scope 3 · Saved Calgary and Ontario reporting boundary',
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

    await userEvent.click(screen.getByRole('button', { name: /Download PDF/i }));
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
      '2026 reporting period · Boundary not fully specified',
    );
    expect(boundarySection).not.toHaveTextContent(
      '2026 reporting period · Scope 1, Scope 2, selected Scope 3',
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
    expect(thresholdSection).toHaveTextContent('10,000 t CO₂e/year Canada / federal context');
    expect(thresholdSection).toHaveTextContent('Alberta rows only use 100,000 t CO₂e/year Alberta TIER reference');

    await userEvent.click(
      within(thresholdSection).getByRole('button', {
        name: /Expand Facility-Level Reporting Threshold Reference/i,
      }),
    );

    expect(thresholdSection).toHaveTextContent(
      'Threshold screening only. This does not constitute regulatory compliance advice.',
    );
    expect(within(thresholdSection).getByText('Calgary Shop')).toBeInTheDocument();
    expect(within(thresholdSection).getByText('8,665 kg CO₂e (8.7 t CO₂e)')).toBeInTheDocument();
    expect(thresholdSection).toHaveTextContent('Alberta, Canada');
    expect(thresholdSection).toHaveTextContent('Alberta TIER pilot screening reference');
    expect(thresholdSection).toHaveTextContent('Below threshold / informational only');
    const torontoThresholdRow = within(thresholdSection)
      .getByText('Toronto Client Visit')
      .closest('tr');
    expect(torontoThresholdRow).toBeTruthy();
    expect(torontoThresholdRow).toHaveTextContent('Ontario, Canada');
    expect(torontoThresholdRow).toHaveTextContent('Not configured');
    expect(torontoThresholdRow).toHaveTextContent('—');
    expect(torontoThresholdRow).toHaveTextContent('Not evaluated');
    expect(torontoThresholdRow).toHaveTextContent(
      'Jurisdiction-specific threshold screening is not currently configured for Ontario.',
    );
    expect(torontoThresholdRow).not.toHaveTextContent('Jurisdiction required');
    expect(torontoThresholdRow).not.toHaveTextContent('Alberta TIER');
    expect(torontoThresholdRow).not.toHaveTextContent('100,000');
    expect(thresholdSection).not.toHaveTextContent(/\bcompliant\b|\bnon-compliant\b/i);

    await userEvent.click(screen.getByRole('button', { name: /Download PDF/i }));
    const sitePdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Calgary Shop') && row.includes('8,665 kg CO2e'));
    });

    expect(sitePdfCall).toBeDefined();
    const pdfText = JSON.stringify(
      vi.mocked(autoTable).mock.calls.map(([, options]) => (options as { body?: unknown[][] }).body ?? []),
    );
    expect(pdfText).toContain('8,665 kg CO2e');
    expect(pdfText).toContain('100,000 t CO2e/year');
    expect(pdfText).not.toContain('CO ‚e');
    expect(pdfText).not.toContain('CO,e');
    expect(pdfText).not.toContain('�');

    const thresholdPdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Calgary Shop') && row.includes('Alberta TIER pilot screening reference'));
    });

    expect(thresholdPdfCall).toBeDefined();
    const thresholdPdfBody = (thresholdPdfCall?.[1] as { body?: unknown[][] } | undefined)?.body ?? [];
    const torontoPdfRow = thresholdPdfBody.find((row) => row.includes('Toronto Client Visit')) ?? [];
    expect(String(torontoPdfRow.join('\n'))).toContain('Ontario, Canada');
    expect(String(torontoPdfRow.join('\n'))).toContain('Not configured');
    expect(String(torontoPdfRow.join('\n'))).toContain('—');
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

    await userEvent.click(screen.getByRole('button', { name: /Download PDF/i }));

    const traceabilityCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return headers.includes('Calculation') && headers.includes('Review Note');
    });
    const sourceEvidenceCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return headers.includes('Source File') && headers.includes('Review Note');
    });
    const sourceEvidenceSummaryCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return (
        headers.includes('Source File') &&
        headers.includes('Included GHG Records') &&
        headers.includes('Review Records') &&
        !headers.includes('Review Note')
      );
    });
    const factorSummaryCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      return headers.includes('Factor') && headers.includes('Source Year') && headers.includes('Used Records');
    });
    const dataQualityNotesCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const headers = (options as { head?: string[][] } | undefined)?.head?.[0] ?? [];
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return headers.includes('Readiness Signal') && body.some((row) => row[0] === 'Emissions Workflow Readiness');
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
      styles: expect.objectContaining({ fontSize: 7 }),
      columnStyles: expect.objectContaining({
        4: expect.objectContaining({ cellWidth: 36 }),
        7: expect.objectContaining({ cellWidth: 40 }),
        10: expect.objectContaining({ cellWidth: 36 }),
      }),
    });
    expect(sourceEvidenceSummaryCall?.[1]).toMatchObject({
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });
    expect((sourceEvidenceSummaryCall?.[1] as { head?: string[][] } | undefined)?.head?.[0]).toEqual([
      'Source File',
      'Source Type',
      'Import Method',
      'Record-Level References',
      'Included GHG Records',
      'Tracked Metrics',
      'Review Records',
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
    expect(dataQualityNotesBody).toContain('Calculation Coverage Meaning');
    expect(dataQualityNotesBody).toContain('eligible emission-bearing records were calculated as GHG emissions records');
    expect(dataQualityNotesBody).toContain('Emissions Workflow Readiness Meaning');
    expect(dataQualityNotesBody).toContain('complete enough to calculate, trace, and report without manual correction');
    expect(dataQualityNotesBody).toContain('Optional Data Completeness');
    expect(dataQualityNotesBody).toContain('Coverage vs Readiness');
    expect(dataQualityNotesBody).toContain('may differ');
    expect(dataQualityNotesCall?.[1]).toMatchObject({
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      columnStyles: {
        0: { cellWidth: 58 },
        1: { cellWidth: 122 },
      },
    });
    expect(carbonCreditReadinessCall).toBeUndefined();
  });
});
