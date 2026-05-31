import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import {
  buildMetricsSummaryTableRows,
  groupMissingFactors,
  MetricsSummarySection,
} from '../components/MetricsSummarySection';
import { MetricsSummaryPage } from './MetricsSummaryPage';
import { loadMetricsOverview } from '../services/metricsOverview';

vi.mock('../services/metricsOverview', async () => {
  const actual = await vi.importActual<typeof import('../services/metricsOverview')>(
    '../services/metricsOverview',
  );

  return {
    ...actual,
    loadMetricsOverview: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
});

describe('buildMetricsSummaryTableRows', () => {
  const usageTotals = {
    fuel: 2110,
    electricity: 1800,
    fuelUnitLabel: 'Grouped by type and unit',
    electricityUnitLabel: 'kWh',
    fuelUsageBreakdown: [
      { activityType: 'DIESEL', total: 1710, unit: 'L' },
      { activityType: 'NATURAL_GAS', total: 400, unit: 'm3' },
    ],
  };

  it('uses the same values shown in the Metrics Summary cards', () => {
    const rows = buildMetricsSummaryTableRows({
      usageTotals,
      totalEstimatedEmissionsKgCO2e: 1234.5,
      recordsIncluded: 8,
    });

    expect(rows).toEqual([
      {
        metricType: 'Carbon Emissions',
        unit: 'kgCO2e',
        totalValue: '1234.5',
      },
      {
        metricType: 'Fuel Usage — Diesel',
        unit: 'L',
        totalValue: '1710',
      },
      {
        metricType: 'Fuel Usage — Natural Gas',
        unit: 'm3',
        totalValue: '400',
      },
      {
        metricType: 'Electricity',
        unit: 'kWh',
        totalValue: '1800',
      },
    ]);
  });

  it('is not empty when records are included in the summary', () => {
    const rows = buildMetricsSummaryTableRows({
      usageTotals: {
        fuel: 0,
        electricity: 0,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [],
      },
      totalEstimatedEmissionsKgCO2e: 268,
      recordsIncluded: 1,
    });

    expect(rows).toHaveLength(1);
  });

  it('includes a CO2e row when estimated emissions exists', () => {
    const rows = buildMetricsSummaryTableRows({
      usageTotals,
      totalEstimatedEmissionsKgCO2e: 268,
      recordsIncluded: 1,
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricType: 'Carbon Emissions',
          unit: 'kgCO2e',
          totalValue: '268',
        }),
      ]),
    );
  });

  it('shows empty state data when no records are included', () => {
    const rows = buildMetricsSummaryTableRows({
      usageTotals,
      totalEstimatedEmissionsKgCO2e: 0,
      recordsIncluded: 0,
    });

    expect(rows).toEqual([]);
  });

  it('groups missing conversion factors by activity type and unit', () => {
    const groups = groupMissingFactors([
      { activityDataId: 'activity-1', activityType: 'WATER', unit: 'm3' },
      { activityDataId: 'activity-2', activityType: 'WATER', unit: 'm3' },
      { activityDataId: 'activity-3', activityType: 'WASTE', unit: 'kg' },
    ]);

    expect(groups).toEqual([
      { activityType: 'WASTE', unit: 'kg', count: 1, availableUnitsForActivityType: [] },
      { activityType: 'WATER', unit: 'm3', count: 2, availableUnitsForActivityType: [] },
    ]);
  });

  it('shows same-activity unit mismatch guidance for diesel tons', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={usageTotals}
          totalEstimatedEmissionsKgCO2e={0}
          countSummary={{
            totalRecordsFound: 1,
            processedRecords: 0,
            skippedRecords: 1,
            missingFactorRecords: 1,
            skippedReasons: {
              missingFactor: 1,
              outsideDateRange: 0,
              outsideScope: 0,
              invalidData: 0,
            },
          }}
          missingFactors={[
            {
              activityDataId: 'activity-1',
              activityType: 'DIESEL',
              unit: 'tons',
              availableUnitsForActivityType: ['liters'],
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('DIESEL / tons')).toBeInTheDocument();
    expect(screen.getByText(/A factor exists for DIESEL \/ liters/i)).toBeInTheDocument();
    expect(
      screen.getByText(/create a custom factor for DIESEL \/ tons or convert tons to liters before import/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 ton diesel ≈ 1190 liters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Factor/i })).toBeInTheDocument();
  });

  it('renders the shared summary section with populated cards and totals table', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={usageTotals}
          totalEstimatedEmissionsKgCO2e={1234.5}
          countSummary={{
            totalRecordsFound: 8,
            processedRecords: 8,
            skippedRecords: 0,
            missingFactorRecords: 0,
            skippedReasons: {
              missingFactor: 0,
              outsideDateRange: 0,
              outsideScope: 0,
              invalidData: 0,
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Fuel Usage')).toBeInTheDocument();
    expect(screen.getByText(/1710 L Diesel/)).toBeInTheDocument();
    expect(screen.getByText(/400 m3 Natural Gas/)).toBeInTheDocument();
    expect(screen.queryByText(/L \/ m3/)).not.toBeInTheDocument();
    expect(screen.getByText('CO₂ Emissions')).toBeInTheDocument();
    expect(screen.getAllByText('1234.5 kg CO2e').length).toBeGreaterThan(0);

    const table = screen.getByRole('table');
    expect(within(table).queryByText('Count')).not.toBeInTheDocument();
    expect(within(table).getByText('Carbon Emissions')).toBeInTheDocument();
    expect(within(table).getByText('Fuel Usage — Diesel')).toBeInTheDocument();
    expect(within(table).getByText('Fuel Usage — Natural Gas')).toBeInTheDocument();
    expect(within(table).getByText('Electricity')).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '1710' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '400' })).toBeInTheDocument();
  });

  it('shows specific missing factor details and create factor action', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={usageTotals}
          totalEstimatedEmissionsKgCO2e={0}
          countSummary={{
            totalRecordsFound: 2,
            processedRecords: 0,
            skippedRecords: 2,
            missingFactorRecords: 2,
            skippedReasons: {
              missingFactor: 2,
              outsideDateRange: 0,
              outsideScope: 0,
              invalidData: 0,
            },
          }}
          missingFactors={[
            { activityDataId: 'activity-1', activityType: 'WATER', unit: 'm3' },
            { activityDataId: 'activity-2', activityType: 'WATER', unit: 'm3' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Some records were skipped because no matching conversion factor was found/i),
    ).toBeInTheDocument();
    expect(screen.getByText('WATER / m3')).toBeInTheDocument();
    expect(screen.getByText(/2 records/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Factor/i })).toBeInTheDocument();
  });

  it('shows record reconciliation and skipped reasons', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={usageTotals}
          totalEstimatedEmissionsKgCO2e={1234.5}
          countSummary={{
            totalRecordsFound: 15,
            processedRecords: 9,
            skippedRecords: 6,
            missingFactorRecords: 2,
            skippedReasons: {
              missingFactor: 2,
              outsideDateRange: 3,
              outsideScope: 1,
              invalidData: 0,
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Record Reconciliation')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText(/total activity records found/i)).toBeInTheDocument();
    expect(screen.getAllByText('9').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/records included in summary/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);
    expect(screen.getByText(/records skipped/i)).toBeInTheDocument();
    expect(screen.getByText('Missing conversion factors')).toBeInTheDocument();
    expect(screen.getByText('Outside selected date range')).toBeInTheDocument();
    expect(screen.getByText('Outside selected report scope')).toBeInTheDocument();
  });

  it('shows all records included when nothing is skipped', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={usageTotals}
          totalEstimatedEmissionsKgCO2e={1234.5}
          countSummary={{
            totalRecordsFound: 8,
            processedRecords: 8,
            skippedRecords: 0,
            missingFactorRecords: 0,
            skippedReasons: {
              missingFactor: 0,
              outsideDateRange: 0,
              outsideScope: 0,
              invalidData: 0,
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('All records included')).toBeInTheDocument();
  });
});

describe('MetricsSummaryPage automatic refresh UX', () => {
  const overview = {
    summary: {
      totalsByMetric: [],
      totalsByFacility: [],
    },
    activities: [
      { id: 'activity-1', activityType: 'DIESEL', quantity: 240, unit: 'L' },
    ],
    usageTotals: {
      fuel: 240,
      electricity: 0,
      fuelUnitLabel: 'Grouped by type and unit',
      electricityUnitLabel: 'kWh',
      fuelUsageBreakdown: [
        { activityType: 'DIESEL', total: 240, unit: 'L' },
      ],
    },
    totalEstimatedEmissionsKgCO2e: 643.2,
    totalRecordsFound: 1,
    processedRecords: 1,
    skippedRecords: 0,
    missingFactorRecords: 0,
    skippedReasons: {
      missingFactor: 0,
      outsideDateRange: 0,
      outsideScope: 0,
      invalidData: 0,
    },
    matchedFactorsCount: 1,
    missingFactors: [],
    matchedActivityEmissions: [],
    conversionFactorsUsed: [],
    totalRecords: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadMetricsOverview).mockResolvedValue(overview as any);
  });

  it('auto loads metrics on page load and removes Generate Metrics', async () => {
    render(
      <MemoryRouter>
        <MetricsSummaryPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /Generate Metrics/i })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(loadMetricsOverview).toHaveBeenCalledWith({
        recalculate: true,
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      });
    });

    expect(await screen.findByText(/Last updated:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
  });

  it('shows first-load loading state and skeletons', async () => {
    let resolveOverview!: (value: any) => void;
    vi.mocked(loadMetricsOverview).mockReturnValue(
      new Promise((resolve) => {
        resolveOverview = resolve;
      }) as any,
    );

    render(
      <MemoryRouter>
        <MetricsSummaryPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Calculating metrics...')).toBeInTheDocument();
    expect(screen.getByText('Loading summary...')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading Fuel Usage')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading Electricity')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading CO₂ Emissions')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading Records Included in Summary')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-01-01')).toBeDisabled();
    expect(screen.getByDisplayValue('2026-12-31')).toBeDisabled();

    resolveOverview(overview);

    expect(await screen.findByText(/Last updated:/i)).toBeInTheDocument();
  });

  it('refreshes automatically when the date range changes', async () => {
    render(
      <MemoryRouter>
        <MetricsSummaryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByDisplayValue('2026-01-01'), {
      target: { value: '2026-02-01' },
    });

    await waitFor(() => {
      expect(loadMetricsOverview).toHaveBeenLastCalledWith({
        recalculate: true,
        dateFrom: '2026-02-01',
        dateTo: '2026-12-31',
      });
    });
  });

  it('keeps previous results visible with refreshing status on date change', async () => {
    render(
      <MemoryRouter>
        <MetricsSummaryPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Last updated:/i)).toBeInTheDocument();
    expect(screen.getByText(/240 L Diesel/)).toBeInTheDocument();

    let resolveRefresh!: (value: any) => void;
    vi.mocked(loadMetricsOverview).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }) as any,
    );

    fireEvent.change(screen.getByDisplayValue('2026-01-01'), {
      target: { value: '2026-02-01' },
    });

    expect(await screen.findByText('Refreshing metrics...')).toBeInTheDocument();
    expect(screen.getByText(/240 L Diesel/)).toBeInTheDocument();

    resolveRefresh(overview);

    await waitFor(() => {
      expect(loadMetricsOverview).toHaveBeenLastCalledWith({
        recalculate: true,
        dateFrom: '2026-02-01',
        dateTo: '2026-12-31',
      });
    });
  });

  it('refreshes when activity or factor changes mark metrics stale', async () => {
    render(
      <MemoryRouter>
        <MetricsSummaryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event('carbonlite:metrics-stale'));

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalledTimes(2));
  });

  it('shows a friendly error when metrics fail to load', async () => {
    vi.mocked(loadMetricsOverview).mockRejectedValueOnce(new Error('backend down'));

    render(
      <MemoryRouter>
        <MetricsSummaryPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Unable to load metrics summary. Please try again.'),
    ).toBeInTheDocument();
  });

  it('does not fire duplicate identical requests while one is in progress', async () => {
    vi.mocked(loadMetricsOverview).mockReturnValue(new Promise(() => undefined) as any);

    render(
      <MemoryRouter>
        <MetricsSummaryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event('carbonlite:metrics-stale'));
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalledTimes(1));
  });
});
