import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllActivityData } from './activityData';
import { getAllConversionFactors } from './conversionFactors';
import { getCalculationSummary } from './metrics';
import {
  deriveMetricsDateRange,
  loadDefaultMetricsDateRange,
  loadMetricsOverview,
} from './metricsOverview';

vi.mock('./activityData', () => ({
  getAllActivityData: vi.fn(),
}));

vi.mock('./metrics', () => ({
  getCalculationSummary: vi.fn(),
}));

vi.mock('./conversionFactors', () => ({
  getAllConversionFactors: vi.fn(),
}));

function backendSummary() {
  return {
    totalsByMetric: [
      {
        metricType: 'CARBON_EMISSION',
        unit: 'kgCO2e',
        totalValue: '268',
        count: 1,
      },
    ],
    totalsByFacility: [],
    totalEstimatedEmissionsKgCO2e: 268,
    totalRecordsFound: 2,
    recordsInScope: 2,
    recordsCalculated: 1,
    recordsIncluded: 1,
    processedRecords: 1,
    skippedRecords: 1,
    missingFactorCount: 1,
    missingFactorRecords: 1,
    invalidRecordCount: 0,
    dataQualityCoverage: 50,
    skippedReasons: {
      missingFactor: 1,
      invalidQuantity: 0,
      invalidUnit: 0,
      outsideScope: 0,
      outsideDateRange: 0,
      invalidData: 0,
    },
    usageTotals: {
      fuel: 100,
      electricity: 0,
      fuelUnitLabel: 'Grouped by type and unit',
      electricityUnitLabel: 'kWh',
      fuelUsageBreakdown: [
        { activityType: 'DIESEL', total: 100, unit: 'L' },
      ],
    },
    missingFactors: [
      {
        activityDataId: 'missing-1',
        activityType: 'WATER',
        unit: 'm3',
        availableUnitsForActivityType: [],
      },
    ],
    calculationDetails: [
      {
        activityDataId: 'activity-1',
        activityType: 'DIESEL',
        recordDate: '2025-06-30T00:00:00.000Z',
        dateEstimated: false,
        reportingYear: 2025,
        jurisdiction: 'Alberta, Canada',
        activityQuantity: 100,
        activityUnit: 'L',
        factorId: 'factor-1',
        factorName: 'Diesel factor',
        factorValue: 2.68,
        factorInputUnit: 'liters',
        factorResultUnit: 'kgCO2e',
        factorPriority: 'VERIFIED_SYSTEM',
        factorSource: 'Test Authority',
        sourceAuthority: 'Test Authority',
        sourceDocument: 'Test table',
        sourceUrl: 'https://example.com',
        sourceYear: 2025,
        factorVerified: true,
        factorType: 'System' as const,
        calculatedEmissionsKgCO2e: 268,
        status: 'CALCULATED' as const,
        sourceType: 'MANUAL',
        sourceReference: 'test',
      },
    ],
    matchedActivityEmissions: [
      {
        activityDataId: 'activity-1',
        activityType: 'DIESEL',
        quantity: 100,
        unit: 'L',
        estimatedEmissionsKgCO2e: 268,
        sourceType: 'MANUAL',
        sourceReference: 'test',
        notes: null,
        factorId: 'factor-1',
      },
    ],
    conversionFactorsUsed: [
      {
        factorId: 'factor-1',
        activityType: 'DIESEL',
        factorName: 'Diesel factor',
        factorValue: 2.68,
        inputUnit: 'liters',
        resultUnit: 'kgCO2e',
        jurisdiction: 'Alberta, Canada',
        reportingYear: 2025,
        sourceAuthority: 'Test Authority',
        sourceDocument: 'Test table',
        sourceUrl: 'https://example.com',
        sourceYear: 2025,
        factorType: 'System' as const,
        verified: true,
      },
    ],
    activities: [
      {
        id: 'activity-1',
        activityType: 'DIESEL',
        recordDate: '2025-06-30T00:00:00.000Z',
        quantity: 100,
        unit: 'L',
        sourceType: 'MANUAL',
        sourceReference: 'test',
      },
    ],
  };
}

describe('loadMetricsOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCalculationSummary).mockResolvedValue(backendSummary());
    vi.mocked(getAllConversionFactors).mockResolvedValue([]);
  });

  it('uses the backend calculation summary as the single source of truth', async () => {
    const overview = await loadMetricsOverview({
      recalculate: true,
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });

    expect(getCalculationSummary).toHaveBeenCalledWith({
      periodStart: '2025-01-01',
      periodEnd: '2025-12-31',
      selectedActivityRecordIds: [],
      selectedDocumentIds: [],
    });
    expect(overview.totalEstimatedEmissionsKgCO2e).toBe(268);
    expect(overview.processedRecords).toBe(1);
    expect(overview.dataQualityCoverage).toBe(50);
    expect(overview.calculationDetails[0].factorValue).toBe(2.68);
  });

  it('fills missing calculation-detail jurisdiction from ActivityData for facility reporting', async () => {
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...backendSummary(),
      totalEstimatedEmissionsKgCO2e: 60,
      totalRecordsFound: 1,
      recordsInScope: 1,
      recordsCalculated: 1,
      recordsIncluded: 1,
      processedRecords: 1,
      skippedRecords: 0,
      missingFactorCount: 0,
      missingFactorRecords: 0,
      skippedReasons: {
        missingFactor: 0,
        invalidQuantity: 0,
        invalidUnit: 0,
        outsideScope: 0,
        outsideDateRange: 0,
        invalidData: 0,
      },
      activities: [
        {
          id: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          recordDate: '2026-03-10',
          quantity: 4,
          unit: 'nights',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Ontario',
          facilityName: 'Toronto Client Visit',
          sourceType: 'IMPORT',
          sourceReference: 'MARCH-HOTEL-010',
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceRow: 11,
          costCad: 720,
          costCurrency: 'CAD',
        },
      ],
      calculationDetails: [
        {
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          recordDate: '2026-03-10',
          dateEstimated: false,
          reportingYear: 2026,
          activityQuantity: 4,
          activityUnit: 'nights',
          facilityName: 'Toronto Client Visit',
          factorName: 'Business Travel - Accommodation - Ontario - 2026',
          factorValue: 15,
          factorInputUnit: 'nights',
          factorResultUnit: 'kgCO2e',
          calculatedEmissionsKgCO2e: 60,
          status: 'CALCULATED',
          sourceType: 'IMPORT',
          sourceReference: 'MARCH-HOTEL-010',
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceRow: 11,
        },
      ],
      missingFactors: [],
    } as any);

    const overview = await loadMetricsOverview();
    const hotelDetail = overview.calculationDetails.find(
      (detail) => detail.activityDataId === 'activity-march-hotel-010',
    );

    expect(hotelDetail).toMatchObject({
      jurisdiction: 'Ontario, Canada',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Ontario',
      facilityName: 'Toronto Client Visit',
      sourceReference: 'MARCH-HOTEL-010',
      costCad: 720,
      costCurrency: 'CAD',
    });
  });

  it('passes selected record scope to the same backend service', async () => {
    await loadMetricsOverview({
      selectedActivityRecordIds: ['activity-1', 'activity-2'],
      dateFrom: '2024-01-01',
      dateTo: '2026-12-31',
    });

    expect(getCalculationSummary).toHaveBeenCalledWith({
      periodStart: undefined,
      periodEnd: undefined,
      selectedActivityRecordIds: ['activity-1', 'activity-2'],
      selectedDocumentIds: [],
    });
  });

  it('returns identical values to all consumers for the same request', async () => {
    const metricsPage = await loadMetricsOverview({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });
    const reportsPage = await loadMetricsOverview({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });

    expect(reportsPage.totalEstimatedEmissionsKgCO2e).toBe(
      metricsPage.totalEstimatedEmissionsKgCO2e,
    );
    expect(reportsPage.processedRecords).toBe(metricsPage.processedRecords);
    expect(reportsPage.usageTotals).toEqual(metricsPage.usageTotals);
  });

  it('deduplicates repeated calculation audit rows by activity record id when the full audit is returned', async () => {
    const summary = backendSummary();
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...summary,
      totalRecordsFound: 3,
      recordsInScope: 3,
      recordsCalculated: 3,
      recordsIncluded: 3,
      processedRecords: 3,
      skippedRecords: 1,
      missingFactorCount: 0,
      missingFactorRecords: 0,
      totalEstimatedEmissionsKgCO2e: 639.4,
      dataQualityCoverage: 75,
      missingFactors: [],
      calculationDetails: [
        {
          ...summary.calculationDetails[0],
          activityDataId: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          activityQuantity: 980,
          activityUnit: 'kWh',
          jurisdiction: 'Alberta, Canada',
          calculatedEmissionsKgCO2e: 519.4,
          calculatedEmission: 519.4,
          sourceReference: 'MARCH-ELEC-001',
        },
        {
          ...summary.calculationDetails[0],
          activityDataId: 'activity-march-water-007',
          activityType: 'WATER',
          activityQuantity: 18,
          activityUnit: 'm3',
          jurisdiction: 'Alberta, Canada',
          calculatedEmissionsKgCO2e: 0,
          calculatedEmission: 0,
          calculationStatus: 'TRACKED_ONLY',
          matchingStatus: 'TRACKED_ONLY',
          status: 'TRACKED_ONLY',
          sourceReference: 'MARCH-WATER-007',
        },
        {
          ...summary.calculationDetails[0],
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          activityQuantity: 4,
          activityUnit: 'nights',
          jurisdiction: 'Ontario, Canada',
          calculatedEmissionsKgCO2e: 60,
          calculatedEmission: 60,
          status: 'CALCULATED',
          sourceReference: 'MARCH-HOTEL-010',
        },
        {
          ...summary.calculationDetails[0],
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          activityQuantity: 4,
          activityUnit: 'nights',
          jurisdiction: 'Ontario, Canada',
          calculatedEmissionsKgCO2e: 60,
          calculatedEmission: 60,
          status: 'CALCULATED',
          sourceReference: 'MARCH-HOTEL-010',
        },
      ],
      matchedActivityEmissions: [
        {
          activityDataId: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          quantity: 980,
          unit: 'kWh',
          estimatedEmissionsKgCO2e: 519.4,
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-ELEC-001',
          factorId: 'factor-electricity-ab',
        },
        {
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          quantity: 4,
          unit: 'nights',
          estimatedEmissionsKgCO2e: 60,
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-HOTEL-010',
          factorId: 'factor-hotel-on',
        },
        {
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          quantity: 4,
          unit: 'nights',
          estimatedEmissionsKgCO2e: 60,
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-HOTEL-010',
          factorId: 'factor-hotel-on',
        },
      ],
      activities: [
        {
          id: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          recordDate: '2026-03-01',
          quantity: 980,
          unit: 'kWh',
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-ELEC-001',
        },
        {
          id: 'activity-march-water-007',
          activityType: 'WATER',
          recordDate: '2026-03-07',
          quantity: 18,
          unit: 'm3',
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-WATER-007',
        },
        {
          id: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          recordDate: '2026-03-10',
          quantity: 4,
          unit: 'nights',
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-HOTEL-010',
        },
      ],
    });

    const overview = await loadMetricsOverview({
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    });

    expect(overview.calculationDetails).toHaveLength(3);
    expect(
      overview.calculationDetails.filter(
        (detail) => detail.activityDataId === 'activity-march-hotel-010',
      ),
    ).toHaveLength(1);
    expect(overview.matchedActivityEmissions).toHaveLength(2);
    expect(overview.processedRecords).toBe(2);
    expect(overview.dataQualityCoverage).toBe(100);
    expect(overview.totalEstimatedEmissionsKgCO2e).toBe(579.4);
  });

  it('preserves optional cost metadata from calculation records when ActivityData fallback is stale', async () => {
    const summary = backendSummary();
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...summary,
      totalRecordsFound: 3,
      recordsInScope: 3,
      recordsCalculated: 3,
      recordsIncluded: 3,
      processedRecords: 3,
      skippedRecords: 0,
      missingFactorCount: 0,
      missingFactorRecords: 0,
      totalEstimatedEmissionsKgCO2e: 579.4,
      calculationDetails: [],
      matchedActivityEmissions: [],
      records: [
        {
          activityRecordId: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          quantity: 980,
          unit: 'kWh',
          normalizedQuantity: 980,
          normalizedUnit: 'kWh',
          recordDate: '2026-03-01',
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          calculationStatus: 'CALCULATED',
          calculatedEmissions: 519.4,
          costCad: 214.55,
          costCurrency: 'CAD',
          matching: { matched: true, matchedBy: 'EXACT', message: 'Matched' },
        },
        {
          activityRecordId: 'activity-march-water-007',
          activityType: 'WATER',
          quantity: 18,
          unit: 'm3',
          normalizedQuantity: 18,
          normalizedUnit: 'm3',
          recordDate: '2026-03-07',
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          calculationStatus: 'TRACKED_ONLY',
          calculatedEmissions: null,
          costCad: 64,
          costCurrency: 'CAD',
          matching: { matched: false, matchedBy: 'TRACKED_ONLY', message: 'Tracked metric' },
        },
        {
          activityRecordId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          quantity: 4,
          unit: 'nights',
          normalizedQuantity: 4,
          normalizedUnit: 'nights',
          recordDate: '2026-03-10',
          jurisdiction: 'Ontario, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Ontario',
          calculationStatus: 'CALCULATED',
          calculatedEmissions: 60,
          costCad: 720,
          costCurrency: 'CAD',
          matching: { matched: true, matchedBy: 'EXACT', message: 'Matched' },
        },
      ],
      activities: [
        {
          id: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          recordDate: '2026-03-01',
          quantity: 980,
          unit: 'kWh',
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-ELEC-001',
          costCad: null,
        },
        {
          id: 'activity-march-water-007',
          activityType: 'WATER',
          recordDate: '2026-03-07',
          quantity: 18,
          unit: 'm3',
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-WATER-007',
          costCad: null,
        },
        {
          id: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          recordDate: '2026-03-10',
          quantity: 4,
          unit: 'nights',
          sourceType: 'SPREADSHEET',
          sourceReference: 'MARCH-HOTEL-010',
          costCad: null,
        },
      ],
    });

    const overview = await loadMetricsOverview({
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    });

    expect(
      overview.calculationDetails.map((detail) => [detail.sourceReference, detail.costCad]),
    ).toEqual([
      ['MARCH-ELEC-001', 214.55],
      ['MARCH-WATER-007', 64],
      ['MARCH-HOTEL-010', 720],
    ]);
  });

  it('accepts refactored summary count fields when recordsCalculated is absent', async () => {
    const summary = backendSummary();
    delete (summary as any).recordsCalculated;
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...summary,
      processedRecords: 1,
      recordsIncluded: 1,
    });

    const overview = await loadMetricsOverview({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });

    expect(overview.processedRecords).toBe(1);
    expect(overview.recordsIncluded).toBe(1);
    expect(overview.recordsInScope).toBe(2);
    expect(overview.totalRecordsFound).toBe(2);
  });

  it('reconstructs calculated electricity details from matched emissions when API details are missing', async () => {
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...backendSummary(),
      totalsByMetric: [
        {
          metricType: 'CARBON_EMISSION',
          unit: 'kgCO2e',
          totalValue: '144',
          count: 1,
        },
      ],
      totalEstimatedEmissionsKgCO2e: 144,
      totalRecordsFound: 1,
      recordsInScope: 1,
      recordsCalculated: 1,
      recordsIncluded: 1,
      processedRecords: 1,
      skippedRecords: 0,
      missingFactorCount: 0,
      missingFactorRecords: 0,
      missingFactors: [],
      calculationDetails: [],
      matchedActivityEmissions: [
        {
          activityDataId: 'activity-electricity-1',
          activityType: 'ELECTRICITY',
          quantity: 1200,
          unit: 'kWh',
          estimatedEmissionsKgCO2e: 144,
          sourceType: 'AI_EXTRACTION',
          sourceReference: 'activity-records.json',
          sourceDocumentId: 'document-1',
          notes: 'Imported from document extraction.',
          factorId: 'factor-electricity-ab',
        },
      ],
      conversionFactorsUsed: [
        {
          factorId: 'factor-electricity-ab',
          activityType: 'ELECTRICITY',
          factorName: 'Electricity - Alberta',
          factorValue: 0.12,
          inputUnit: 'kWh',
          resultUnit: 'kgCO2e',
          jurisdiction: 'Alberta, Canada',
          reportingYear: 2026,
          sourceAuthority: 'CarbonLite system defaults',
          sourceDocument: 'Electricity factors',
          sourceUrl: null,
          sourceYear: 2025,
          factorType: 'System' as const,
          verified: true,
        },
      ],
      activities: [
        {
          id: 'activity-electricity-1',
          activityType: 'ELECTRICITY',
          recordDate: '2026-01-01',
          quantity: 1200,
          unit: 'kWh',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceType: 'AI_EXTRACTION',
          sourceReference: 'activity-records.json',
          sourceDocumentId: 'document-1',
        },
      ],
    } as any);

    const overview = await loadMetricsOverview({
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    });

    expect(overview.calculationDetails).toHaveLength(1);
    expect(overview.calculationDetails[0]).toMatchObject({
      activityDataId: 'activity-electricity-1',
      activityType: 'ELECTRICITY',
      status: 'CALCULATED',
      calculatedEmissionsKgCO2e: 144,
      jurisdictionRegion: 'Alberta',
      factorId: 'factor-electricity-ab',
      factorName: 'Electricity - Alberta',
    });
  });

  it('preserves activity site/facility labels on complete calculation details', async () => {
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...backendSummary(),
      totalsByMetric: [
        {
          metricType: 'CARBON_EMISSION',
          unit: 'kgCO2e',
          totalValue: '200',
          count: 2,
        },
      ],
      totalEstimatedEmissionsKgCO2e: 200,
      totalRecordsFound: 3,
      recordsInScope: 3,
      recordsCalculated: 2,
      recordsIncluded: 2,
      processedRecords: 2,
      skippedRecords: 1,
      missingFactorCount: 0,
      missingFactorRecords: 0,
      missingFactors: [],
      calculationDetails: [
        {
          activityDataId: 'activity-calgary',
          activityType: 'NATURAL_GAS',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          activityQuantity: 100,
          activityUnit: 'm3',
          calculatedEmissionsKgCO2e: 150,
          status: 'CALCULATED',
          sourceType: 'AI_EXTRACTION',
        },
        {
          activityDataId: 'activity-unassigned',
          activityType: 'DIESEL',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          activityQuantity: 10,
          activityUnit: 'liters',
          calculatedEmissionsKgCO2e: 50,
          status: 'CALCULATED',
          sourceType: 'AI_EXTRACTION',
        },
        {
          activityDataId: 'activity-water',
          activityType: 'WATER',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          activityQuantity: 100,
          activityUnit: 'm3',
          calculatedEmissionsKgCO2e: 0,
          status: 'TRACKED_ONLY',
          sourceType: 'AI_EXTRACTION',
        },
      ],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      activities: [
        {
          id: 'activity-calgary',
          activityType: 'NATURAL_GAS',
          recordDate: '2026-01-01',
          quantity: 100,
          unit: 'm3',
          facilityId: 'Calgary Office',
          sourceType: 'AI_EXTRACTION',
        },
        {
          id: 'activity-unassigned',
          activityType: 'DIESEL',
          recordDate: '2026-01-01',
          quantity: 10,
          unit: 'liters',
          facilityId: '',
          sourceType: 'AI_EXTRACTION',
        },
        {
          id: 'activity-water',
          activityType: 'WATER',
          recordDate: '2026-01-01',
          quantity: 100,
          unit: 'm3',
          facilityId: 'Red Deer Yard',
          sourceType: 'AI_EXTRACTION',
        },
      ],
    } as any);

    const overview = await loadMetricsOverview({
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    });

    expect(overview.calculationDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityDataId: 'activity-calgary',
          facilityId: 'Calgary Office',
          facilityName: 'Calgary Office',
        }),
        expect.objectContaining({
          activityDataId: 'activity-unassigned',
          facilityId: null,
          facilityName: null,
        }),
        expect.objectContaining({
          activityDataId: 'activity-water',
          facilityId: 'Red Deer Yard',
          facilityName: 'Red Deer Yard',
          status: 'TRACKED_ONLY',
        }),
      ]),
    );
  });

  it('normalizes imported electricity details that use calculationStatus instead of status', async () => {
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...backendSummary(),
      totalEstimatedEmissionsKgCO2e: 144,
      totalRecordsFound: 1,
      recordsInScope: 1,
      recordsCalculated: 1,
      recordsIncluded: 1,
      processedRecords: 1,
      skippedRecords: 0,
      missingFactorCount: 0,
      missingFactorRecords: 0,
      missingFactors: [],
      calculationDetails: [
        {
          activityDataId: 'activity-electricity-1',
          activityType: 'Electricity',
          recordDate: '2026-01-01',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          activityQuantity: 1200,
          activityUnit: 'kWh',
          factorId: 'factor-electricity-ab',
          factorName: 'Electricity - Alberta',
          factorValue: 0.12,
          factorInputUnit: 'kWh',
          factorResultUnit: 'kgCO2e',
          factorSource: 'CarbonLite system defaults',
          factorVerified: true,
          factorType: 'System' as const,
          scopeClassification: 'SCOPE_2',
          calculationStatus: 'CALCULATED',
          calculatedEmissionsKgCO2e: 144,
          sourceType: 'AI_EXTRACTION',
          sourceReference: 'activity-records.json',
        },
      ],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      activities: [
        {
          id: 'activity-electricity-1',
          activityType: 'ELECTRICITY',
          recordDate: '2026-01-01',
          quantity: 1200,
          unit: 'kWh',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceType: 'AI_EXTRACTION',
          sourceReference: 'activity-records.json',
        },
      ],
    } as any);

    const overview = await loadMetricsOverview({
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    });

    expect(overview.calculationDetails[0]).toMatchObject({
      activityType: 'ELECTRICITY',
      status: 'CALCULATED',
      scopeOverride: 'SCOPE_2',
      calculatedEmissionsKgCO2e: 144,
    });
  });

  it('builds scope-ready electricity details from calculation explanation records', async () => {
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...backendSummary(),
      totalEstimatedEmissionsKgCO2e: 144,
      totalRecordsFound: 1,
      recordsInScope: 1,
      recordsCalculated: 1,
      recordsIncluded: 1,
      processedRecords: 1,
      skippedRecords: 0,
      missingFactorCount: 0,
      missingFactorRecords: 0,
      missingFactors: [],
      calculationDetails: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      records: [
        {
          activityRecordId: 'activity-electricity-1',
          activityType: 'Electricity',
          quantity: 1200,
          unit: 'kWh',
          normalizedQuantity: 1200,
          normalizedUnit: 'kWh',
          recordDate: '2026-01-01',
          recordYear: 2026,
          jurisdiction: 'Alberta, Canada',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          calculationStatus: 'CALCULATED',
          calculatedEmissions: 144,
          resultUnit: 'kgCO2e',
          factor: {
            factorId: 'factor-electricity-ab',
            activityType: 'ELECTRICITY',
            factorValue: 0.12,
            inputUnit: 'kWh',
            resultUnit: 'kgCO2e',
            jurisdiction: 'Alberta',
            factorYear: 2025,
            sourceAuthority: 'CarbonLite system defaults',
            sourceDocument: 'Electricity factors',
            sourceYear: 2025,
            verified: true,
            isSystem: true,
          },
          matching: {
            matched: true,
            matchedBy: 'EXACT',
            message: 'Matched electricity factor.',
          },
        },
      ],
      activities: [
        {
          id: 'activity-electricity-1',
          activityType: 'ELECTRICITY',
          recordDate: '2026-01-01',
          quantity: 1200,
          unit: 'kWh',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceType: 'AI_EXTRACTION',
          sourceReference: 'activity-records.json',
        },
      ],
    } as any);

    const overview = await loadMetricsOverview({
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    });

    expect(overview.calculationDetails).toHaveLength(1);
    expect(overview.calculationDetails[0]).toMatchObject({
      activityDataId: 'activity-electricity-1',
      activityType: 'ELECTRICITY',
      status: 'CALCULATED',
      calculatedEmissionsKgCO2e: 144,
      jurisdictionRegion: 'Alberta',
      factorId: 'factor-electricity-ab',
    });
  });

  it('keeps in-scope review records even when no emissions were calculated', async () => {
    const summary = backendSummary();
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...summary,
      totalsByMetric: [],
      totalEstimatedEmissionsKgCO2e: 0,
      recordsCalculated: undefined,
      processedRecords: 0,
      recordsIncluded: 0,
      recordsInScope: 1,
      skippedRecords: 1,
      skippedReasons: {
        missingFactor: 1,
        invalidQuantity: 0,
        invalidUnit: 0,
        outsideScope: 0,
        outsideDateRange: 0,
        invalidData: 0,
      },
      calculationDetails: [
        {
          ...summary.calculationDetails[0],
          status: 'MISSING_FACTOR',
          calculatedEmissionsKgCO2e: null,
        },
      ],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
    } as any);

    const overview = await loadMetricsOverview({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });

    expect(overview.processedRecords).toBe(0);
    expect(overview.recordsInScope).toBe(1);
    expect(overview.skippedRecords).toBe(1);
    expect(overview.calculationDetails).toHaveLength(1);
  });

  it.each([
    ['DIESEL', 'liters', 'Diesel', 'liters', 2.68, 268],
    ['GASOLINE', 'L', 'Gasoline', 'liters', 2.31, 231],
    ['NATURAL_GAS', 'm³', 'Natural Gas', 'm3', 1.89, 189],
  ])(
    'uses visible factor library fallback for %s / %s',
    async (activityType, unit, factorName, factorUnit, factorValue, expectedEmissions) => {
      vi.mocked(getCalculationSummary).mockResolvedValue({
        ...backendSummary(),
        totalsByMetric: [],
        totalEstimatedEmissionsKgCO2e: 0,
        totalRecordsFound: 1,
        recordsInScope: 1,
        recordsCalculated: 0,
        recordsIncluded: 0,
        processedRecords: 0,
        skippedRecords: 1,
        missingFactorCount: 1,
        missingFactorRecords: 1,
        missingFactors: [
          {
            activityDataId: 'activity-1',
            activityType,
            unit,
            availableUnitsForActivityType: [],
          },
        ],
        calculationDetails: [
          {
            ...backendSummary().calculationDetails[0],
            activityType,
            activityUnit: unit,
            status: 'MISSING_FACTOR',
            calculatedEmissionsKgCO2e: null,
          },
        ],
        matchedActivityEmissions: [],
        conversionFactorsUsed: [],
        activities: [
          {
            id: 'activity-1',
            activityType,
            recordDate: '2025-06-30T00:00:00.000Z',
            quantity: 100,
            unit,
            sourceType: 'MANUAL',
            sourceReference: 'test',
          },
        ],
      } as any);
      vi.mocked(getAllConversionFactors).mockResolvedValue([
        {
          id: 'factor-visible',
          organizationId: null,
          name: factorName,
          type: 'EMISSION',
          activityType: null,
          inputUnit: factorUnit,
          unit: factorUnit,
          factorValue,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'CarbonLite system defaults',
          sourceYear: 2025,
          verified: false,
          isDefault: true,
          isSystemDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ] as any);

      const overview = await loadMetricsOverview({
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      });

      expect(overview.processedRecords).toBe(1);
      expect(overview.skippedRecords).toBe(0);
      expect(overview.missingFactorRecords).toBe(0);
      expect(overview.totalEstimatedEmissionsKgCO2e).toBe(expectedEmissions);
      expect(overview.calculationDetails[0]).toMatchObject({
        status: 'CALCULATED',
        factorId: 'factor-visible',
        matchingMessage: 'Matched to CarbonLite System Factor.',
        calculatedEmissionsKgCO2e: expectedEmissions,
      });
      expect(overview.calculationDetails[0].matchingMessage).not.toMatch(/backend factor matching/i);
    },
  );

  it('does not use generic visible factor library fallback for electricity without province', async () => {
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...backendSummary(),
      totalsByMetric: [],
      totalEstimatedEmissionsKgCO2e: 0,
      totalRecordsFound: 1,
      recordsInScope: 1,
      recordsCalculated: 0,
      recordsIncluded: 0,
      processedRecords: 0,
      skippedRecords: 1,
      missingFactorCount: 1,
      missingFactorRecords: 1,
      missingFactors: [
        {
          activityDataId: 'activity-1',
          activityType: 'ELECTRICITY',
          unit: 'KWH',
          availableUnitsForActivityType: [],
        },
      ],
      calculationDetails: [
        {
          ...backendSummary().calculationDetails[0],
          activityType: 'ELECTRICITY',
          activityUnit: 'KWH',
          status: 'MISSING_FACTOR',
          calculatedEmissionsKgCO2e: null,
        },
      ],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      activities: [
        {
          id: 'activity-1',
          activityType: 'ELECTRICITY',
          recordDate: '2025-06-30T00:00:00.000Z',
          quantity: 100,
          unit: 'KWH',
          sourceType: 'MANUAL',
          sourceReference: 'test',
        },
      ],
    } as any);
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      {
        id: 'factor-visible',
        organizationId: null,
        name: 'Electricity - Canada Generic - 2025',
        type: 'EMISSION',
        activityType: null,
        inputUnit: 'kWh',
        unit: 'kWh',
        factorValue: 0.5,
        resultUnit: 'kgCO2e',
        sourceAuthority: 'CarbonLite system defaults',
        sourceYear: 2025,
        verified: false,
        isDefault: true,
        isSystemDefault: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ] as any);

    const overview = await loadMetricsOverview({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });

    expect(overview.processedRecords).toBe(0);
    expect(overview.skippedRecords).toBe(1);
    expect(overview.missingFactorRecords).toBe(1);
    expect(overview.totalEstimatedEmissionsKgCO2e).toBe(0);
    expect(overview.calculationDetails[0]).toMatchObject({
      status: 'MISSING_FACTOR',
      calculatedEmissionsKgCO2e: null,
    });
  });

  it('does not calculate GJ or tonnes records unless a matching factor exists', async () => {
    vi.mocked(getCalculationSummary).mockResolvedValue({
      ...backendSummary(),
      totalRecordsFound: 2,
      recordsInScope: 2,
      recordsCalculated: 0,
      processedRecords: 0,
      skippedRecords: 2,
      missingFactorCount: 2,
      missingFactorRecords: 2,
      missingFactors: [
        { activityDataId: 'activity-1', activityType: 'DIESEL', unit: 'GJ' },
        { activityDataId: 'activity-2', activityType: 'DIESEL', unit: 'tons' },
      ],
      calculationDetails: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      activities: [
        {
          id: 'activity-1',
          activityType: 'DIESEL',
          recordDate: '2025-06-30T00:00:00.000Z',
          quantity: 100,
          unit: 'GJ',
          sourceType: 'MANUAL',
        },
        {
          id: 'activity-2',
          activityType: 'DIESEL',
          recordDate: '2025-06-30T00:00:00.000Z',
          quantity: 100,
          unit: 'tons',
          sourceType: 'MANUAL',
        },
      ],
    } as any);
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      {
        id: 'factor-diesel-liters',
        name: 'Diesel',
        type: 'EMISSION',
        unit: 'liters',
        factorValue: 2.68,
        resultUnit: 'kgCO2e',
        isSystemDefault: true,
        isDefault: true,
      },
    ] as any);

    const overview = await loadMetricsOverview({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });

    expect(overview.processedRecords).toBe(0);
    expect(overview.skippedRecords).toBe(2);
    expect(overview.missingFactorRecords).toBe(2);
  });
});

describe('metrics date range', () => {
  it('uses the full year when all records are in one year', () => {
    expect(
      deriveMetricsDateRange([
        { recordDate: '2025-03-15T00:00:00.000Z' },
        { recordDate: '2025-10-20T00:00:00.000Z' },
      ]),
    ).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      hasActivityRecords: true,
    });
  });

  it('loads activity dates only for initial date range discovery', async () => {
    vi.mocked(getAllActivityData).mockResolvedValue([
      { recordDate: '2024-04-01T00:00:00.000Z' },
      { recordDate: '2025-09-30T00:00:00.000Z' },
    ] as any);

    await expect(loadDefaultMetricsDateRange()).resolves.toEqual({
      startDate: '2024-04-01',
      endDate: '2025-09-30',
      hasActivityRecords: true,
    });
  });
});
