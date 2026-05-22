import { getAllActivityData } from './activityData';
import { calculateMetrics, getMetricsSummary } from './metrics';
import { loadMetricsOverview } from './metricsOverview';

vi.mock('./activityData', () => ({
  getAllActivityData: vi.fn(),
}));

vi.mock('./metrics', () => ({
  calculateMetrics: vi.fn(),
  getMetricsSummary: vi.fn(),
}));

const baseActivity = {
  organizationId: 'org-1',
  recordDate: '2026-05-01',
  sourceType: 'MANUAL',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

function activity(id: string, activityType: string, quantity: number, unit: string) {
  return {
    ...baseActivity,
    id,
    activityType,
    quantity,
    unit,
  };
}

function summary(totalValue: string, count: number) {
  return {
    totalsByMetric: [
      {
        metricType: 'CARBON_EMISSION',
        unit: 'kg CO2e',
        totalValue,
        count,
      },
    ],
    totalsByFacility: [],
  };
}

describe('loadMetricsOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(calculateMetrics).mockResolvedValue({ count: 0, items: [] });
  });

  it('uses Activity Data as source of truth for total records', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue(
      [
        activity('activity-1', 'DIESEL', 120, 'L'),
        activity('activity-2', 'ELECTRICITY', 450, 'kWh'),
      ],
    );
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('999', 2));

    const overview = await loadMetricsOverview({ recalculate: true });

    expect(overview.totalRecords).toBe(2);
    expect(calculateMetrics).toHaveBeenCalledWith(['activity-1', 'activity-2']);
    expect(getAllActivityData).toHaveBeenCalledWith({
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('returns one CO2e total for Metrics Summary and Reports to share', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue(
      [activity('activity-1', 'DIESEL', 120, 'L')],
    );
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('321.5', 1));

    const metricsSummaryOverview = await loadMetricsOverview({ recalculate: true });
    const reportsOverview = await loadMetricsOverview({ recalculate: true });

    expect(metricsSummaryOverview.carbonMetric?.totalValue).toBe('321.5');
    expect(reportsOverview.carbonMetric?.totalValue).toBe('321.5');
  });

  it('reflects deleted records after Activity Data reload', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue(
      [activity('activity-2', 'ELECTRICITY', 450, 'kWh')],
    );
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('50', 1));

    const overview = await loadMetricsOverview({ recalculate: true });

    expect(overview.totalRecords).toBe(1);
    expect(overview.activities.map((item) => item.id)).toEqual(['activity-2']);
    expect(overview.carbonMetric?.totalValue).toBe('50');
  });

  it('reflects imported records after Activity Data reload', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue(
      [
        activity('activity-1', 'DIESEL', 120, 'L'),
        activity('activity-2', 'ELECTRICITY', 450, 'kWh'),
        activity('activity-3', 'NATURAL_GAS', 300, 'm3'),
      ],
    );
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('780', 3));

    const overview = await loadMetricsOverview({ recalculate: true });

    expect(overview.totalRecords).toBe(3);
    expect(overview.usageTotals.fuel).toBe(420);
    expect(overview.usageTotals.electricity).toBe(450);
    expect(overview.carbonMetric?.totalValue).toBe('780');
  });
});
