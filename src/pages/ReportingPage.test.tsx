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
    expect(screen.queryByText(/Records imported from Golden Test Data/i)).not.toBeInTheDocument();

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
    expect(screen.getByText(/Records imported from Golden Test Data/i)).toBeInTheDocument();
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
    expect(boundarySection).toHaveTextContent('Pilot review account · Sample boundary information · Read-only');
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
    expect(screen.getAllByText(/37,285 kgCO2e|37,285 kg CO2e/i).length).toBeGreaterThan(0);
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
    expect(String(regulatoryBody.flat().join('\n'))).toContain('Alberta TIER compliance reporting');
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
    expect(
      within(boundarySection).getByText('Supplier locations outside the pilot boundary'),
    ).toBeInTheDocument();
    expect(
      within(boundarySection).getByText('Scope 3 includes selected business travel records only.'),
    ).toBeInTheDocument();
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

  it('shows Not specified instead of sample boundary wording for empty customer boundary fields', async () => {
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
    await userEvent.click(within(boundarySection).getByRole('button', { name: 'Expand Reporting Boundary' }));

    expect(boundarySection).not.toHaveTextContent(/Sample Canadian operations/i);
    expect(boundarySection).not.toHaveTextContent(/Sample facilities/i);
    expect(within(boundarySection).getAllByText('Not specified').length).toBeGreaterThanOrEqual(5);
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
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      calculationDetails: [
        {
          activityDataId: 'gas-calgary',
          activityType: 'NATURAL_GAS',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Canada',
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
          jurisdiction: 'Canada',
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
          jurisdiction: 'Canada',
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
          activityDataId: 'air-unassigned',
          activityType: 'AIR_TRAVEL',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Canada',
          activityQuantity: 5000,
          activityUnit: 'km',
          factorSource: 'System factor',
          factorVerified: true,
          calculatedEmissionsKgCO2e: 575,
          status: 'CALCULATED',
          sourceType: 'SPREADSHEET',
        },
        {
          activityDataId: 'water-calgary',
          activityType: 'WATER',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Canada',
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
          jurisdiction: 'Canada',
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
    expect(siteSection).toHaveTextContent('Organization total: 9,240 kgCO2e');
    expect(siteSection).toHaveTextContent('2 site/facility groups');

    await userEvent.click(
      within(siteSection).getByRole('button', { name: /Expand Emissions by Site \/ Facility/i }),
    );

    expect(within(siteSection).getByText('Calgary Shop')).toBeInTheDocument();
    expect(within(siteSection).getByText('Unassigned')).toBeInTheDocument();
    expect(within(siteSection).getByText('1,890 kgCO2e')).toBeInTheDocument();
    expect(within(siteSection).getByText('6,625 kgCO2e')).toBeInTheDocument();
    expect(within(siteSection).getByText('8,665 kgCO2e')).toBeInTheDocument();
    expect(within(siteSection).getAllByText('575 kgCO2e').length).toBeGreaterThan(0);
    expect(siteSection).toHaveTextContent('Electricity: 6,625 kgCO2e');
    expect(siteSection).toHaveTextContent('Natural Gas: 1,890 kgCO2e');
    expect(siteSection).toHaveTextContent('Business Travel - Accommodation: 150 kgCO2e');

    const thresholdSection = screen.getByRole('region', {
      name: 'Facility-Level Reporting Threshold Reference',
    });
    expect(thresholdSection).toHaveTextContent('10,000 tCO2e/year screening reference');
    expect(thresholdSection).toHaveTextContent('100,000 tCO2e/year Alberta TIER large-emitter screening reference');

    await userEvent.click(
      within(thresholdSection).getByRole('button', {
        name: /Expand Facility-Level Reporting Threshold Reference/i,
      }),
    );

    expect(thresholdSection).toHaveTextContent(
      'Threshold screening only. This does not constitute regulatory compliance advice.',
    );
    expect(within(thresholdSection).getByText('Calgary Shop')).toBeInTheDocument();
    expect(within(thresholdSection).getByText('8,665 kgCO2e (8.7 tCO2e)')).toBeInTheDocument();
    expect(thresholdSection).toHaveTextContent('0.09%');
    expect(thresholdSection).toHaveTextContent('Below threshold reference');
    expect(thresholdSection).not.toHaveTextContent(/\bcompliant\b|\bnon-compliant\b/i);

    await userEvent.click(screen.getByRole('button', { name: /Download PDF/i }));
    const sitePdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Calgary Shop') && row.includes('8,665 kgCO2e'));
    });

    expect(sitePdfCall).toBeDefined();

    const thresholdPdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Calgary Shop') && row.includes('Below threshold reference'));
    });

    expect(thresholdPdfCall).toBeDefined();
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
      return headers.includes('Readiness Signal') && body.some((row) => row[0] === 'Import Readiness');
    });
    const carbonCreditReadinessCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Readiness Level') || row.includes('Disclaimer'));
    });

    expect(traceabilityCall?.[1]).toMatchObject({
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });
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
      'Source Reference',
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
    expect(dataQualityNotesBody).toContain('matched to an emissions factor and included in the calculated GHG total');
    expect(dataQualityNotesBody).toContain('Import Readiness Meaning');
    expect(dataQualityNotesBody).toContain('complete enough to proceed without manual review');
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
