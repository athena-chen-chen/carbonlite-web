import { getAllActivityData } from './activityData';
import { getAllConversionFactors } from './conversionFactors';
import { calculateMetrics, getMetricsSummary } from './metrics';
import { loadMetricsOverview } from './metricsOverview';

vi.mock('./activityData', () => ({
  getAllActivityData: vi.fn(),
}));

vi.mock('./metrics', () => ({
  calculateMetrics: vi.fn(),
  getMetricsSummary: vi.fn(),
}));

vi.mock('./conversionFactors', () => ({
  getAllConversionFactors: vi.fn(),
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

function activityFromDocument(
  id: string,
  documentId: string,
  activityType: string,
  quantity: number,
  unit: string,
) {
  return {
    ...activity(id, activityType, quantity, unit),
    documentId,
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

function factor(overrides: Partial<{
  id: string;
  organizationId: string | null;
  name: string;
  activityType: string;
  unit: string;
  factorValue: string | number;
  isDefault: boolean;
  isSystemDefault: boolean;
  updatedAt: string;
  sourceAuthority: string;
  sourceYear: number;
}> = {}) {
  return {
    id: overrides.id ?? 'factor-1',
    organizationId: overrides.organizationId ?? null,
    name: overrides.name ?? 'Emission factor',
    type: 'EMISSION',
    activityType: overrides.activityType ?? 'DIESEL',
    region: null,
    country: null,
    unit: overrides.unit ?? 'L',
    factorValue: overrides.factorValue ?? 1,
    resultUnit: 'kg CO2e',
    sourceName: null,
    sourceReference: null,
    sourceAuthority: overrides.sourceAuthority ?? null,
    sourceYear: overrides.sourceYear ?? null,
    effectiveFrom: null,
    effectiveTo: null,
    isDefault: overrides.isDefault ?? true,
    isSystemDefault: overrides.isSystemDefault ?? true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('loadMetricsOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(calculateMetrics).mockResolvedValue({ count: 0, items: [] });
    vi.mocked(getAllConversionFactors).mockResolvedValue([]);
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
    expect(overview.totalRecordsFound).toBe(2);
    expect(overview.processedRecords).toBe(0);
    expect(overview.skippedRecords).toBe(2);
    expect(overview.missingFactorRecords).toBe(2);
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
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      factor({ activityType: 'DIESEL', unit: 'L', factorValue: 2.68 }),
    ]);

    const metricsSummaryOverview = await loadMetricsOverview({ recalculate: true });
    const reportsOverview = await loadMetricsOverview({ recalculate: true });

    expect(metricsSummaryOverview.totalEstimatedEmissionsKgCO2e).toBe(321.6);
    expect(reportsOverview.totalEstimatedEmissionsKgCO2e).toBe(321.6);
  });

  it('returns matching totals for Metrics Summary and Reports with the same date range', async () => {
    const dateRange = { dateFrom: '2026-01-01', dateTo: '2026-12-31' };
    vi.mocked(getAllActivityData).mockResolvedValue(
      [
        activity('activity-1', 'DIESEL', 120, 'L'),
        activity('activity-2', 'ELECTRICITY', 450, 'kWh'),
      ],
    );
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('770', 2));
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      factor({ activityType: 'DIESEL', unit: 'L', factorValue: 2 }),
      factor({ activityType: 'ELECTRICITY', unit: 'kWh', factorValue: 0.1 }),
    ]);

    const metricsSummaryOverview = await loadMetricsOverview({
      recalculate: true,
      ...dateRange,
    });
    const reportsOverview = await loadMetricsOverview({
      recalculate: true,
      ...dateRange,
    });

    expect(metricsSummaryOverview.usageTotals).toEqual(reportsOverview.usageTotals);
    expect(metricsSummaryOverview.totalEstimatedEmissionsKgCO2e).toBe(
      reportsOverview.totalEstimatedEmissionsKgCO2e,
    );
    expect(metricsSummaryOverview.totalRecords).toBe(reportsOverview.totalRecords);
    expect(getAllActivityData).toHaveBeenCalledWith(dateRange);
    expect(getMetricsSummary).toHaveBeenCalledWith({
      periodStart: dateRange.dateFrom,
      periodEnd: dateRange.dateTo,
    });
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

  it('calculates DIESEL 100 L with factor 2.68 as 268 kg CO2e', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue(
      [activity('activity-1', 'DIESEL', 100, 'L')],
    );
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      factor({ activityType: 'DIESEL', unit: 'L', factorValue: 2.68 }),
    ]);
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('0', 1));

    const overview = await loadMetricsOverview({ recalculate: true });

    expect(overview.totalEstimatedEmissionsKgCO2e).toBe(268);
    expect(overview.matchedFactorsCount).toBe(1);
    expect(overview.processedRecords).toBe(1);
    expect(overview.skippedRecords).toBe(0);
    expect(overview.missingFactorRecords).toBe(0);
    expect(overview.missingFactors).toEqual([]);
    expect(overview.matchedActivityEmissions).toEqual([
      expect.objectContaining({
        activityDataId: 'activity-1',
        activityType: 'DIESEL',
        estimatedEmissionsKgCO2e: 268,
        factorId: 'factor-1',
      }),
    ]);
    expect(overview.conversionFactorsUsed).toEqual([
      expect.objectContaining({
        factorId: 'factor-1',
        activityType: 'DIESEL',
        factorValue: 2.68,
        inputUnit: 'L',
        factorType: 'System',
      }),
    ]);
  });

  it('calculates ELECTRICITY 100 kWh with matching factor', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue(
      [activity('activity-1', 'ELECTRICITY', 100, 'kWh')],
    );
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      factor({ activityType: 'ELECTRICITY', unit: 'kWh', factorValue: 0.5 }),
    ]);
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('0', 1));

    const overview = await loadMetricsOverview({ recalculate: true });

    expect(overview.totalEstimatedEmissionsKgCO2e).toBe(50);
    expect(overview.matchedFactorsCount).toBe(1);
  });

  it('adds missing factor entries and returns 0 when no factor matches', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue(
      [activity('activity-1', 'WASTE', 100, 'kg')],
    );
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      factor({ activityType: 'DIESEL', unit: 'L', factorValue: 2.68 }),
    ]);
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('0', 1));

    const overview = await loadMetricsOverview({ recalculate: true });

    expect(overview.totalEstimatedEmissionsKgCO2e).toBe(0);
    expect(overview.matchedFactorsCount).toBe(0);
    expect(overview.processedRecords).toBe(0);
    expect(overview.skippedRecords).toBe(1);
    expect(overview.missingFactorRecords).toBe(1);
    expect(overview.missingFactors).toEqual([
      {
        activityDataId: 'activity-1',
        activityType: 'WASTE',
        unit: 'kg',
      },
    ]);
  });

  it('includes previously skipped records after a matching factor is added', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue(
      [activity('activity-1', 'WATER', 10, 'm3')],
    );
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('0', 1));
    vi.mocked(getAllConversionFactors)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        factor({ activityType: 'WATER', unit: 'm3', factorValue: 0.5 }),
      ]);

    const beforeFactor = await loadMetricsOverview({ recalculate: true });
    const afterFactor = await loadMetricsOverview({ recalculate: true });

    expect(beforeFactor.totalEstimatedEmissionsKgCO2e).toBe(0);
    expect(beforeFactor.processedRecords).toBe(0);
    expect(beforeFactor.missingFactors).toEqual([
      {
        activityDataId: 'activity-1',
        activityType: 'WATER',
        unit: 'm3',
      },
    ]);
    expect(afterFactor.totalEstimatedEmissionsKgCO2e).toBe(5);
    expect(afterFactor.processedRecords).toBe(1);
    expect(afterFactor.missingFactors).toEqual([]);
  });

  it('prefers organization custom factor over system default factor', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue(
      [activity('activity-1', 'DIESEL', 100, 'L')],
    );
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      factor({
        id: 'system-factor',
        organizationId: null,
        activityType: 'DIESEL',
        unit: 'L',
        factorValue: 2.68,
        isSystemDefault: true,
      }),
      factor({
        id: 'custom-factor',
        organizationId: 'org-1',
        activityType: 'DIESEL',
        unit: 'liters',
        factorValue: 3,
        isSystemDefault: false,
      }),
    ]);
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('0', 1));

    const overview = await loadMetricsOverview({ recalculate: true });

    expect(overview.totalEstimatedEmissionsKgCO2e).toBe(300);
  });

  it('does not use another organization custom factor for emissions', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue(
      [activity('activity-1', 'DIESEL', 100, 'L')],
    );
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      factor({
        id: 'other-org-factor',
        organizationId: 'org-2',
        activityType: 'DIESEL',
        unit: 'L',
        factorValue: 9,
        isSystemDefault: false,
      }),
      factor({
        id: 'system-factor',
        organizationId: null,
        activityType: 'DIESEL',
        unit: 'L',
        factorValue: 2.68,
        isSystemDefault: true,
      }),
    ]);
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('0', 1));

    const overview = await loadMetricsOverview({ recalculate: true });

    expect(overview.totalEstimatedEmissionsKgCO2e).toBe(268);
  });

  it('calculates report totals from selected record ids only', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue([
      activity('activity-1', 'DIESEL', 100, 'L'),
      activity('activity-2', 'ELECTRICITY', 200, 'kWh'),
      activity('activity-3', 'NATURAL_GAS', 50, 'm3'),
    ]);
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      factor({ activityType: 'DIESEL', unit: 'L', factorValue: 2 }),
      factor({ activityType: 'ELECTRICITY', unit: 'kWh', factorValue: 0.5 }),
      factor({ activityType: 'NATURAL_GAS', unit: 'm3', factorValue: 3 }),
    ]);
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('0', 2));

    const overview = await loadMetricsOverview({
      recalculate: true,
      selectedRecordIds: ['activity-1', 'activity-2'],
    });

    expect(overview.activities.map((item) => item.id)).toEqual([
      'activity-1',
      'activity-2',
    ]);
    expect(overview.usageTotals.fuel).toBe(100);
    expect(overview.usageTotals.electricity).toBe(200);
    expect(overview.totalEstimatedEmissionsKgCO2e).toBe(300);
    expect(overview.totalRecordsFound).toBe(2);
    expect(overview.processedRecords).toBe(2);
    expect(calculateMetrics).toHaveBeenCalledWith(['activity-1', 'activity-2']);
  });

  it('calculates report totals from selected document ids only', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue([
      activityFromDocument('activity-1', 'doc-1', 'DIESEL', 100, 'L'),
      activityFromDocument('activity-2', 'doc-2', 'ELECTRICITY', 200, 'kWh'),
      activityFromDocument('activity-3', 'doc-3', 'NATURAL_GAS', 50, 'm3'),
    ]);
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      factor({ activityType: 'DIESEL', unit: 'L', factorValue: 2 }),
      factor({ activityType: 'ELECTRICITY', unit: 'kWh', factorValue: 0.5 }),
      factor({ activityType: 'NATURAL_GAS', unit: 'm3', factorValue: 3 }),
    ]);
    vi.mocked(getMetricsSummary).mockResolvedValue(summary('0', 2));

    const overview = await loadMetricsOverview({
      recalculate: true,
      selectedDocumentIds: ['doc-1', 'doc-2'],
    });

    expect(overview.activities.map((item) => item.id)).toEqual([
      'activity-1',
      'activity-2',
    ]);
    expect(overview.usageTotals.fuel).toBe(100);
    expect(overview.usageTotals.electricity).toBe(200);
    expect(overview.totalEstimatedEmissionsKgCO2e).toBe(300);
    expect(overview.totalRecordsFound).toBe(2);
    expect(overview.processedRecords).toBe(2);
    expect(calculateMetrics).toHaveBeenCalledWith(['activity-1', 'activity-2']);
  });

  it('changes totals consistently when the date range changes', async () => {
    vi.mocked(getAllActivityData)
      .mockResolvedValueOnce([
        activity('activity-1', 'DIESEL', 120, 'L'),
        activity('activity-2', 'ELECTRICITY', 450, 'kWh'),
      ])
      .mockResolvedValueOnce([
        activity('activity-2', 'ELECTRICITY', 450, 'kWh'),
      ]);
    vi.mocked(getMetricsSummary)
      .mockResolvedValueOnce(summary('770', 2))
      .mockResolvedValueOnce(summary('200', 1));

    const fullYear = await loadMetricsOverview({
      recalculate: true,
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    });
    const february = await loadMetricsOverview({
      recalculate: true,
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
    });

    expect(fullYear.totalRecords).toBe(2);
    expect(fullYear.usageTotals.fuel).toBe(120);
    expect(fullYear.usageTotals.electricity).toBe(450);
    expect(fullYear.carbonMetric?.totalValue).toBe('770');

    expect(february.totalRecords).toBe(1);
    expect(february.usageTotals.fuel).toBe(0);
    expect(february.usageTotals.electricity).toBe(450);
    expect(february.carbonMetric?.totalValue).toBe('200');
  });
});
