import { render, screen, waitFor } from '@testing-library/react';
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

  it('logs PDF_EXPORTED, not REPORT_GENERATED, when downloading the PDF', async () => {
    render(
      <MemoryRouter>
        <ReportingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalled());
    vi.mocked(trackActivityEvent).mockClear();

    const pdfButton = screen.getByRole('button', { name: /Download PDF/i });
    expect(pdfButton).toBeEnabled();
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
      return headers.includes('Readiness Signal') && body.some((row) => row[0] === 'Data Readiness Score');
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
    expect(dataQualityNotesBody).toContain('Data Quality Coverage Meaning');
    expect(dataQualityNotesBody).toContain('calculated as GHG emissions records');
    expect(dataQualityNotesBody).toContain('Data Readiness Score Meaning');
    expect(dataQualityNotesBody).toContain('Broader pilot readiness signal');
    expect(dataQualityNotesBody).toContain('Coverage vs Readiness');
    expect(dataQualityNotesBody).toContain('related but not identical');
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
