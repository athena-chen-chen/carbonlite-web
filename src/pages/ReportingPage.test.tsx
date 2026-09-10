import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
import {
  loadOrganizationProfile,
  saveOrganizationProfile,
} from '../services/organizationProfile';
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

describe('ReportingPage audit trail', () => {
  it('shows a loading indication while report data is preparing', async () => {
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
    expect(screen.getAllByText(/37,285 kgCO2e|37,285 kg CO2e/i).length).toBeGreaterThan(0);
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

    const boundarySection = screen.getByRole('region', { name: 'Inventory Boundary' });
    expect(boundarySection).toHaveTextContent(
      '2026 reporting period · Scope 1, Scope 2, selected Scope 3 · Sample Canadian operations',
    );
    const boundaryToggle = within(boundarySection).getByRole('button', { name: 'Expand Inventory Boundary' });
    expect(boundaryToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(boundarySection).queryByText('Organization / Workspace')).not.toBeInTheDocument();
    await userEvent.click(boundaryToggle);
    expect(boundaryToggle).toHaveAttribute('aria-expanded', 'true');
    expect(boundaryToggle).toHaveTextContent('Collapse');
    expect(within(boundarySection).getByText('Organization / Workspace')).toBeInTheDocument();
    expect(within(boundarySection).getByText('CarbonLite Sample Workspace')).toBeInTheDocument();
    await userEvent.click(boundaryToggle);
    expect(boundaryToggle).toHaveAttribute('aria-expanded', 'false');
    expect(boundaryToggle).toHaveTextContent('Expand');
    expect(within(boundarySection).queryByText('Organization / Workspace')).not.toBeInTheDocument();

    expect(screen.queryByText(/Workflow history for this workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Recent import and report workflow events/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No workflow audit events recorded yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/raw audit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/audit event id/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/internal workflow/i)).not.toBeInTheDocument();
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

  it('uses saved organization profile values in the report Inventory Boundary', async () => {
    const adminUser = {
      email: 'admin@example.com',
      role: 'ADMIN' as const,
      organizationId: 'report-boundary-workspace',
      organizationName: 'KACH CANADA LTD.',
    };
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    saveOrganizationProfile(
      {
        ...loadOrganizationProfile(adminUser),
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
      },
      adminUser,
    );

    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    const boundarySection = screen.getByRole('region', { name: 'Inventory Boundary' });
    await userEvent.click(within(boundarySection).getByRole('button', { name: 'Expand Inventory Boundary' }));

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

    await userEvent.click(screen.getByRole('button', { name: /Download PDF/i }));
    const inventoryBoundaryPdfCall = vi.mocked(autoTable).mock.calls.find(([, options]) => {
      const body = (options as { body?: unknown[][] } | undefined)?.body ?? [];
      return body.some((row) => row.includes('Saved Calgary and Ontario reporting boundary'));
    });

    expect(inventoryBoundaryPdfCall).toBeDefined();
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
