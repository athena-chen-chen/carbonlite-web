import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import {
  buildDataReadinessSummary,
  buildCarbonCreditReadinessAssessment,
  CARBON_CREDIT_READINESS_DISCLAIMER,
  formatHotspotExclusionNote,
  buildHotspotAnalysis,
  buildMetricsSummaryTableRows,
  groupMissingFactors,
  MetricsSummarySection,
} from '../components/MetricsSummarySection';
import { MetricsSummaryPage } from './MetricsSummaryPage';
import {
  loadDefaultMetricsDateRange,
  loadMetricsOverview,
} from '../services/metricsOverview';
import { pilotExpectedEmissions } from '../test/pilotEmissionsFixture';

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

afterEach(() => {
  cleanup();
});

const goldenTrailUsageTotals = {
  fuel: 3313,
  electricity: 63600,
  fuelUnitLabel: 'Grouped by type and unit',
  electricityUnitLabel: 'kWh',
  fuelUsageBreakdown: [
    { activityType: 'NATURAL_GAS', total: 1000, unit: 'm3' },
    { activityType: 'GASOLINE', total: 500, unit: 'liters' },
    { activityType: 'DIESEL', total: 100, unit: 'liters' },
  ],
  activityUsageBreakdown: [
    { activityType: 'ELECTRICITY', total: 63600, unit: 'kWh' },
    { activityType: 'NATURAL_GAS', total: 1000, unit: 'm3' },
    { activityType: 'GASOLINE', total: 500, unit: 'liters' },
    { activityType: 'DIESEL', total: 100, unit: 'liters' },
    { activityType: 'AIR_TRAVEL', total: 5000, unit: 'km' },
    { activityType: 'HOTEL', total: 10, unit: 'nights' },
    { activityType: 'WATER', total: 100, unit: 'm3', trackedOnly: true },
  ],
};

const goldenTrailCountSummary = {
  totalRecordsFound: 10,
  processedRecords: 9,
  skippedRecords: 1,
  missingFactorRecords: 0,
  skippedReasons: {
    missingFactor: 0,
    outsideDateRange: 0,
    outsideScope: 0,
    invalidData: 0,
  },
};

function goldenTrailDetail(overrides: Record<string, unknown>) {
  return {
    activityDataId: 'activity-hidden-id',
    activityType: 'ELECTRICITY',
    recordDate: '2026-07-20',
    dateEstimated: false,
    reportingYear: 2026,
    jurisdiction: 'Canada',
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: 'Canada',
    activityQuantity: 100,
    activityUnit: 'kWh',
    normalizedUnit: 'kWh',
    factorId: 'factor-hidden-id',
    factorName: 'CarbonLite factor',
    factorValue: 1,
    factorInputUnit: 'kWh',
    factorResultUnit: 'kgCO2e',
    factorSource: 'CarbonLite',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite MVP Default Factors v1.0',
    factorVersion: 'CarbonLite MVP Default Factors v1.0',
    sourceYear: 2025,
    factorVerified: false,
    factorType: 'System',
    factorConfidenceLevel: 'Pilot Estimate',
    factorVerificationStatus: 'Internal Review Required',
    factorAssumptions: 'Pilot-stage default factor. Review before formal reporting.',
    calculatedEmissionsKgCO2e: 100,
    status: 'CALCULATED',
    sourceType: 'UPLOAD',
    sourceReference: 'pilot-golden-dataset.csv',
    ...overrides,
  } as any;
}

const goldenTrailCalculationDetails = [
  goldenTrailDetail({
    activityDataId: 'activity-electricity-ab',
    factorId: 'factor-electricity-ab-id',
    factorName: 'Electricity - Alberta',
    factorVerificationStatus: 'DRAFT',
    jurisdiction: 'Alberta, Canada',
    jurisdictionRegion: 'Alberta',
    factorJurisdictionRegion: 'Alberta',
    activityQuantity: 12500,
    activityUnit: 'kWh',
    factorValue: 0.53,
    calculatedEmissionsKgCO2e: 6625,
    factorDefaultScope: 'SCOPE_2',
  }),
  goldenTrailDetail({
    activityDataId: 'activity-electricity-bc',
    factorName: 'Electricity - British Columbia',
    jurisdiction: 'British Columbia, Canada',
    jurisdictionRegion: 'British Columbia',
    factorJurisdictionRegion: 'British Columbia',
    activityQuantity: 100,
    activityUnit: 'kWh',
    factorValue: 0.02,
    calculatedEmissionsKgCO2e: 2,
    factorDefaultScope: 'SCOPE_2',
  }),
  goldenTrailDetail({
    activityDataId: 'activity-electricity-on',
    factorName: 'Electricity - Ontario',
    jurisdiction: 'Ontario, Canada',
    jurisdictionRegion: 'Ontario',
    factorJurisdictionRegion: 'Ontario',
    activityQuantity: 1000,
    activityUnit: 'kWh',
    factorValue: 0.12,
    calculatedEmissionsKgCO2e: 120,
    factorDefaultScope: 'SCOPE_2',
  }),
  goldenTrailDetail({
    activityDataId: 'activity-electricity-mwh',
    factorName: 'Electricity - Alberta',
    jurisdiction: 'Alberta, Canada',
    jurisdictionRegion: 'Alberta',
    factorJurisdictionRegion: 'Alberta',
    activityQuantity: 50,
    activityUnit: 'MWh',
    normalizedUnit: 'kWh',
    factorValue: 0.53,
    calculationFormula: '50,000 × 0.53 = 26,500 kgCO2e',
    calculatedEmissionsKgCO2e: 26500,
    factorDefaultScope: 'SCOPE_2',
  }),
  goldenTrailDetail({
    activityDataId: 'activity-natural-gas',
    activityType: 'NATURAL_GAS',
    factorName: 'Natural Gas - Canada',
    factorInputUnit: 'm3',
    normalizedUnit: 'm3',
    activityQuantity: 1000,
    activityUnit: 'm3',
    factorValue: 1.89,
    calculatedEmissionsKgCO2e: 1890,
    factorDefaultScope: 'SCOPE_1',
  }),
  goldenTrailDetail({
    activityDataId: 'activity-gasoline',
    activityType: 'GASOLINE',
    factorName: 'Gasoline - Canada',
    factorInputUnit: 'liters',
    normalizedUnit: 'liters',
    activityQuantity: 500,
    activityUnit: 'liters',
    factorValue: 2.31,
    calculatedEmissionsKgCO2e: 1155,
    factorDefaultScope: 'SCOPE_1',
  }),
  goldenTrailDetail({
    activityDataId: 'activity-diesel',
    activityType: 'DIESEL',
    factorName: 'Diesel - Canada',
    factorInputUnit: 'liters',
    normalizedUnit: 'liters',
    activityQuantity: 100,
    activityUnit: 'liters',
    factorValue: 2.68,
    calculatedEmissionsKgCO2e: 268,
    factorDefaultScope: 'SCOPE_1',
  }),
  goldenTrailDetail({
    activityDataId: 'activity-air-travel',
    activityType: 'AIR_TRAVEL',
    factorName: 'Air Travel - Canada',
    factorInputUnit: 'km',
    normalizedUnit: 'km',
    activityQuantity: 5000,
    activityUnit: 'km',
    factorValue: 0.115,
    calculatedEmissionsKgCO2e: 575,
    factorDefaultScope: 'SCOPE_3',
  }),
  goldenTrailDetail({
    activityDataId: 'activity-hotel',
    activityType: 'HOTEL',
    factorName: 'Hotel - Canada',
    factorInputUnit: 'nights',
    normalizedUnit: 'nights',
    activityQuantity: 10,
    activityUnit: 'nights',
    factorValue: 15,
    calculatedEmissionsKgCO2e: 150,
    factorDefaultScope: 'SCOPE_3',
  }),
  goldenTrailDetail({
    activityDataId: 'activity-water',
    activityType: 'WATER',
    factorName: null,
    factorValue: null,
    activityQuantity: 100,
    activityUnit: 'm3',
    calculatedEmissionsKgCO2e: null,
    status: 'TRACKED_ONLY',
    factorDefaultScope: 'TRACKED_METRIC',
  }),
];

describe('buildMetricsSummaryTableRows', () => {
  const usageTotals = {
    fuel: 2110,
    electricity: 1800,
    fuelUnitLabel: 'Grouped by type and unit',
    electricityUnitLabel: 'kWh',
    fuelUsageBreakdown: [
      { activityType: 'DIESEL', total: 1710, unit: 'liters' },
      { activityType: 'NATURAL_GAS', total: 400, unit: 'm3' },
    ],
  };

  it('uses the same values shown in the Calculation Review cards', () => {
    const rows = buildMetricsSummaryTableRows({
      usageTotals,
      totalEstimatedEmissionsKgCO2e: 1234.5,
      recordsIncluded: 8,
    });

    expect(rows).toEqual([
      {
        metricType: 'Diesel',
        unit: 'liters',
        totalValue: '1,710',
        category: 'input',
        activityType: 'DIESEL',
      },
      {
        metricType: 'Natural Gas',
        unit: 'm3',
        totalValue: '400',
        category: 'input',
        activityType: 'NATURAL_GAS',
      },
      {
        metricType: 'Electricity',
        unit: 'kWh',
        totalValue: '1,800',
        category: 'input',
        activityType: 'ELECTRICITY',
      },
      {
        metricType: 'Total Calculated Emissions',
        unit: 'kgCO2e',
        totalValue: '1,234.50',
        category: 'calculated',
      },
    ]);
  });

  it('displays normalized electricity input totals in the Calculation Summary table', () => {
    const rows = buildMetricsSummaryTableRows({
      usageTotals: {
        fuel: 3313,
        electricity: 63600,
        fuelUnitLabel: 'Grouped by type and unit',
        electricityUnitLabel: 'kWh',
        fuelUsageBreakdown: [
          { activityType: 'NATURAL_GAS', total: 1000, unit: 'm3' },
          { activityType: 'GASOLINE', total: 500, unit: 'liters' },
          { activityType: 'DIESEL', total: 100, unit: 'liters' },
        ],
        activityUsageBreakdown: [
          { activityType: 'ELECTRICITY', total: 63600, unit: 'kWh' },
          { activityType: 'NATURAL_GAS', total: 1000, unit: 'm3' },
          { activityType: 'GASOLINE', total: 500, unit: 'liters' },
          { activityType: 'DIESEL', total: 100, unit: 'liters' },
          { activityType: 'AIR_TRAVEL', total: 5000, unit: 'km' },
          { activityType: 'HOTEL', total: 10, unit: 'nights' },
          { activityType: 'WATER', total: 100, unit: 'm3', trackedOnly: true },
        ],
      },
      totalEstimatedEmissionsKgCO2e: 37285,
      recordsIncluded: 9,
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricType: 'Electricity',
          unit: 'kWh',
          totalValue: '63,600',
          category: 'input',
          activityType: 'ELECTRICITY',
        }),
        expect.objectContaining({
          metricType: 'Air Travel',
          unit: 'km',
          totalValue: '5,000',
          category: 'input',
          activityType: 'AIR_TRAVEL',
        }),
        expect.objectContaining({
          metricType: 'Hotel',
          unit: 'nights',
          totalValue: '10',
          category: 'input',
          activityType: 'HOTEL',
        }),
        expect.objectContaining({
          metricType: 'Water',
          unit: 'm3',
          totalValue: '100',
          category: 'input',
          activityType: 'WATER',
          trackedOnly: true,
        }),
        expect.objectContaining({
          metricType: 'Total Calculated Emissions',
          unit: 'kgCO2e',
          totalValue: '37,285',
          category: 'calculated',
        }),
      ]),
    );
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
          metricType: 'Total Calculated Emissions',
          unit: 'kgCO2e',
          totalValue: '268',
          category: 'calculated',
        }),
      ]),
    );
  });

  it('does not build calculation rows when no records are included', () => {
    const rows = buildMetricsSummaryTableRows({
      usageTotals,
      totalEstimatedEmissionsKgCO2e: 0,
      recordsIncluded: 0,
    });

    expect(rows).toEqual([]);
  });

  it('shows no activity records state when there is no data', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={{
            fuel: 0,
            electricity: 0,
            fuelUnitLabel: 'Grouped by type and unit',
            electricityUnitLabel: 'kWh',
            fuelUsageBreakdown: [],
          }}
          totalEstimatedEmissionsKgCO2e={0}
          countSummary={{
            totalRecordsFound: 0,
            processedRecords: 0,
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

    expect(
      screen.getByText('No activity records yet. Import activity data to generate metrics.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No metrics yet.')).not.toBeInTheDocument();
  });

  it('explains when records exist but no emissions can be calculated', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={{
            fuel: 0,
            electricity: 0,
            fuelUnitLabel: 'Grouped by type and unit',
            electricityUnitLabel: 'kWh',
            fuelUsageBreakdown: [],
          }}
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
            { activityDataId: 'activity-1', activityType: 'DIESEL', unit: 'tonnes' },
            { activityDataId: 'activity-2', activityType: 'HOTEL', unit: 'nights' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('No calculated emissions yet.')).toBeInTheDocument();
    expect(
      screen.getByText(/Records exist, but emissions could not be calculated/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Review Data Quality & Tracked Metrics above.')).toBeInTheDocument();
    expect(screen.queryByText('No metrics yet.')).not.toBeInTheDocument();
  });

  it('shows tracked-only metrics separately when no emissions are calculated', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={{
            fuel: 0,
            electricity: 0,
            fuelUnitLabel: 'Grouped by type and unit',
            electricityUnitLabel: 'kWh',
            fuelUsageBreakdown: [],
          }}
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
            { activityDataId: 'activity-1', activityType: 'WATER', unit: 'm³' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('No calculated emissions yet.')).toBeInTheDocument();
    expect(screen.getByText('Tracked Metrics')).toBeInTheDocument();
    expect(screen.getByText('Water / m3 — 1 record')).toBeInTheDocument();
    expect(screen.queryByText('No metrics yet.')).not.toBeInTheDocument();
  });

  it('groups missing conversion factors by activity type and unit', () => {
    const groups = groupMissingFactors([
      { activityDataId: 'activity-1', activityType: 'WATER', unit: 'm3' },
      { activityDataId: 'activity-2', activityType: 'WATER', unit: 'm3' },
      { activityDataId: 'activity-3', activityType: 'WASTE', unit: 'kg' },
    ]);

    expect(groups).toEqual([
      {
        activityType: 'WASTE',
        unit: 'kg',
        count: 1,
        availableUnitsForActivityType: [],
        activityDataIds: ['activity-3'],
      },
      {
        activityType: 'WATER',
        unit: 'm3',
        count: 2,
        availableUnitsForActivityType: [],
        activityDataIds: ['activity-1', 'activity-2'],
      },
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

    expect(screen.getByText('No factor found for: DIESEL / tons')).toBeInTheDocument();
    expect(screen.getByText(/A factor exists for DIESEL \/ liters/i)).toBeInTheDocument();
    expect(
      screen.getByText(/create a custom factor for DIESEL \/ tons or convert tons to liters before import/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 ton diesel ≈ 1190 liters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Factor/i })).toBeInTheDocument();
  });

  it('renders one record as input data flowing to calculated emissions', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={{
            fuel: 100,
            electricity: 0,
            fuelUnitLabel: 'Grouped by type and unit',
            electricityUnitLabel: 'kWh',
            fuelUsageBreakdown: [
              { activityType: 'GASOLINE', total: 100, unit: 'liters' },
            ],
          }}
          totalEstimatedEmissionsKgCO2e={231}
          countSummary={{
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
          }}
          calculationDetails={[
            {
              activityDataId: 'activity-1',
              activityType: 'GASOLINE',
              recordDate: '2026-01-01',
              dateEstimated: false,
              reportingYear: 2026,
              jurisdiction: 'Alberta, Canada',
              activityQuantity: 100,
              activityUnit: 'liters',
              factorId: 'factor-1',
              factorName: 'Gasoline factor',
              factorValue: 2.31,
              factorInputUnit: 'liters',
              factorResultUnit: 'kgCO2e',
              factorPriority: 'CUSTOM',
              factorSource: 'ECCC',
              sourceAuthority: 'ECCC',
              sourceYear: 2025,
              factorVerified: true,
              factorType: 'Custom',
              calculatedEmissionsKgCO2e: 231,
              status: 'CALCULATED',
              sourceType: 'MANUAL',
              sourceReference: null,
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Calculation Summary')).toBeInTheDocument();
    expect(screen.getByText('One activity record can contribute multiple metrics. Input metrics show the activity data used, while calculated results show estimated emissions.')).toBeInTheDocument();
    expect(screen.getByText('Input Data')).toBeInTheDocument();
    expect(screen.getAllByText('100 liters').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gasoline').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Calculation relationship')).toHaveTextContent('↓');
    expect(screen.getByText('Calculated Result')).toBeInTheDocument();
    expect(screen.getAllByText('Total Calculated Emissions').length).toBeGreaterThan(0);
    expect(screen.getByText('231')).toBeInTheDocument();
    expect(screen.getByText('kgCO2e')).toBeInTheDocument();
    expect(
      screen.getByText('Calculated from: 100 liters gasoline × 2.31 kgCO2e/liter'),
    ).toBeInTheDocument();
    expect(screen.getByText('Calculation details and traceability (1 records)')).toBeInTheDocument();
    expect(screen.getAllByText('Manual entry').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Calculation details and traceability (1 records)'));

    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Factor Source' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Formula' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Matching Explanation' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View calculation details for Gasoline/i }));

    const dialog = screen.getByRole('dialog', { name: /Calculation detail/i });
    expect(within(dialog).getByText('Factor Source')).toBeInTheDocument();
    expect(within(dialog).getByText('ECCC 2025')).toBeInTheDocument();
    expect(within(dialog).getByText('Formula')).toBeInTheDocument();
    expect(within(dialog).getByText('100 liters × 2.31 kgCO2e/liter = 231 kgCO2e')).toBeInTheDocument();
    expect(within(dialog).getByText('Matching Explanation')).toBeInTheDocument();
    expect(within(dialog).getByText('Matched factor')).toBeInTheDocument();
  });

  it('opens the Total calculation trail with included records, tracked metrics, factors, and no raw ids', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={goldenTrailUsageTotals}
          totalEstimatedEmissionsKgCO2e={37285}
          countSummary={goldenTrailCountSummary}
          calculationDetails={goldenTrailCalculationDetails}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'View Calculation Trail' })[0]);

    const dialog = screen.getByRole('dialog', { name: /Total Calculated Emissions Calculation Trail/i });
    expect(dialog.parentElement).toHaveStyle({
      position: 'fixed',
      zIndex: '5000',
      overflow: 'hidden',
    });
    expect(dialog).toHaveStyle({
      display: 'flex',
      maxHeight: 'calc(100vh - 96px)',
      overflow: 'hidden',
    });
    expect(within(dialog).getByRole('region', { name: /Calculation trail content/i })).toHaveStyle({
      overflowY: 'auto',
      minHeight: '0',
    });
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(within(dialog).getByText('37,285 kgCO2e')).toBeInTheDocument();
    expect(within(dialog).getByText('Included records').parentElement).toHaveTextContent('9');
    expect(within(dialog).getByText('Tracked metrics').parentElement).toHaveTextContent('1');
    expect(within(dialog).getByText('Electricity - Alberta')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('CarbonLite MVP Default Factors v1.0');
    expect(within(dialog).getAllByText('Internal Review Required').length).toBeGreaterThan(0);
    expect(dialog).not.toHaveTextContent(/\bDraft\b/);
    expect(within(dialog).getByText(/Water is tracked as an operational metric/i)).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('activity-electricity-ab');
    expect(dialog).not.toHaveTextContent('factor-electricity-ab-id');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: /Total Calculated Emissions Calculation Trail/i })).not.toBeInTheDocument();
  });

  it('shows draft-stored pilot electricity verification as internal review in detail modals', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={{
            fuel: 0,
            electricity: 100,
            fuelUnitLabel: 'Grouped by type and unit',
            electricityUnitLabel: 'kWh',
            fuelUsageBreakdown: [],
          }}
          totalEstimatedEmissionsKgCO2e={53}
          countSummary={{
            totalRecordsFound: 1,
            processedRecords: 1,
            skippedRecords: 0,
            missingFactorRecords: 0,
          }}
          calculationDetails={[
            goldenTrailDetail({
              activityDataId: 'activity-electricity-draft-verification',
              factorName: 'Electricity - Alberta',
              jurisdiction: 'Alberta, Canada',
              jurisdictionRegion: 'Alberta',
              factorJurisdictionRegion: 'Alberta',
              activityQuantity: 100,
              activityUnit: 'kWh',
              factorValue: 0.53,
              calculatedEmissionsKgCO2e: 53,
              factorDefaultScope: 'SCOPE_2',
              factorVerificationStatus: 'DRAFT',
            }),
          ]}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Calculation details and traceability (1 records)'));
    fireEvent.click(screen.getByRole('button', { name: /View calculation details for Electricity/i }));

    const dialog = screen.getByRole('dialog', { name: /Calculation detail/i });
    expect(within(dialog).getByText('Verification')).toBeInTheDocument();
    expect(within(dialog).getByText('Internal Review Required')).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent(/\bDraft\b/);
  });

  it('filters calculation trails by Scope 1, Scope 2, Scope 3, and activity category', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={goldenTrailUsageTotals}
          totalEstimatedEmissionsKgCO2e={37285}
          countSummary={goldenTrailCountSummary}
          calculationDetails={goldenTrailCalculationDetails}
        />
      </MemoryRouter>,
    );

    const scopeSection = screen.getByRole('region', { name: /Emissions by Scope/i });
    const scopeButtons = within(scopeSection).getAllByRole('button', {
      name: 'View Calculation Trail',
    });

    fireEvent.click(scopeButtons[0]);
    let dialog = screen.getByRole('dialog', { name: /Scope 1 Calculation Trail/i });
    expect(within(dialog).getByText('3,313 kgCO2e')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Natural Gas · Canada/i).length).toBeGreaterThan(0);
    expect(within(dialog).queryByText(/Electricity · Alberta · 12,500 kWh/i)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('Close calculation trail'));

    fireEvent.click(scopeButtons[1]);
    dialog = screen.getByRole('dialog', { name: /Scope 2 Calculation Trail/i });
    expect(within(dialog).getByText('33,247 kgCO2e')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/50 MWh × 1,000 = 50,000 kWh/i).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/Electricity ·/i).length).toBeGreaterThanOrEqual(4);
    fireEvent.click(within(dialog).getByLabelText('Close calculation trail'));

    fireEvent.click(scopeButtons[2]);
    dialog = screen.getByRole('dialog', { name: /Scope 3 Calculation Trail/i });
    expect(within(dialog).getByText('725 kgCO2e')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Air Travel · Canada/i).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/Hotel · Canada/i).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText('Consultant Review Recommended').length).toBeGreaterThan(0);
    fireEvent.click(within(dialog).getByLabelText('Close calculation trail'));

    const hotspotSection = screen.getByRole('region', { name: /Emissions Hotspots/i });
    fireEvent.click(
      within(hotspotSection).getAllByRole('button', {
        name: 'View Calculation Trail',
      })[0],
    );
    dialog = screen.getByRole('dialog', { name: /Electricity Calculation Trail/i });
    expect(within(dialog).getByText('33,247 kgCO2e')).toBeInTheDocument();
    expect(within(dialog).getByText('Included records').parentElement).toHaveTextContent('4');
    expect(within(dialog).queryByText(/Natural Gas/i)).not.toBeInTheDocument();
  });

  it('shows missing factor records as review required in the calculation trail without crashing', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={goldenTrailUsageTotals}
          totalEstimatedEmissionsKgCO2e={37285}
          countSummary={{
            ...goldenTrailCountSummary,
            totalRecordsFound: 11,
            skippedRecords: 2,
            missingFactorRecords: 1,
          }}
          calculationDetails={[
            ...goldenTrailCalculationDetails,
            {
              activityDataId: 'activity-missing-factor',
              activityType: 'ELECTRICITY',
              recordDate: '2026-07-20',
              dateEstimated: false,
              reportingYear: 2026,
              jurisdiction: 'Quebec, Canada',
              jurisdictionCountry: 'Canada',
              jurisdictionRegion: 'Quebec',
              activityQuantity: 100,
              activityUnit: 'kWh',
              factorSource: '',
              factorVerified: false,
              calculatedEmissionsKgCO2e: null,
              status: 'MISSING_FACTOR',
              sourceType: 'UPLOAD',
              sourceReference: 'pilot-golden-dataset.csv',
            },
          ]}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'View Calculation Trail' })[0]);

    const dialog = screen.getByRole('dialog', { name: /Total Calculated Emissions Calculation Trail/i });
    expect(within(dialog).getByText('Records Requiring Review')).toBeInTheDocument();
    expect(within(dialog).getByText('No matched factor available. Review required.')).toBeInTheDocument();
  });

  it('shows calculated imported electricity emissions under Scope 2', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={{
            fuel: 0,
            electricity: 1200,
            fuelUnitLabel: 'Grouped by type and unit',
            electricityUnitLabel: 'kWh',
            fuelUsageBreakdown: [],
          }}
          totalEstimatedEmissionsKgCO2e={144}
          countSummary={{
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
          }}
          calculationDetails={[
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
              factorPriority: 'SYSTEM',
              factorSource: 'CarbonLite system defaults',
              sourceAuthority: 'CarbonLite system defaults',
              sourceYear: 2025,
              factorVerified: true,
              factorType: 'System',
              factorDefaultScope: 'Scope 1',
              factorScope: 'Scope 1',
              calculatedEmissionsKgCO2e: 144,
              status: 'CALCULATED',
              sourceType: 'AI_EXTRACTION',
              sourceReference: 'activity-records.json',
            },
          ]}
        />
      </MemoryRouter>,
    );

    const scopeSection = screen.getByRole('region', { name: /Emissions by Scope/i });
    expect(within(scopeSection).getByText('Scope 1').parentElement).toHaveTextContent('0 kg CO2e');
    expect(within(scopeSection).getByText('Scope 2').parentElement).toHaveTextContent('144 kg CO2e');
    expect(within(scopeSection).getByText('Scope 3').parentElement).toHaveTextContent('0 kg CO2e');
  });

  it('reconciles total emissions to Scope 1 + Scope 2 + Scope 3 and excludes review rows', () => {
    render(
      <MemoryRouter>
        <MetricsSummarySection
          usageTotals={{
            fuel: 200,
            electricity: 500,
            fuelUnitLabel: 'Grouped by type and unit',
            electricityUnitLabel: 'kWh',
            fuelUsageBreakdown: [
              { activityType: 'DIESEL', total: 100, unit: 'liters' },
              { activityType: 'NATURAL_GAS', total: 100, unit: 'm3' },
            ],
          }}
          totalEstimatedEmissionsKgCO2e={pilotExpectedEmissions.totalKgCO2e}
          countSummary={{
            totalRecordsFound: 8,
            processedRecords: 4,
            skippedRecords: 4,
            missingFactorRecords: 1,
            skippedReasons: {
              missingFactor: 1,
              outsideDateRange: 0,
              outsideScope: 0,
              invalidData: 3,
            },
          }}
          calculationDetails={[
            {
              activityDataId: 'scope-1',
              activityType: 'DIESEL',
              activityQuantity: 100,
              activityUnit: 'L',
              calculatedEmissionsKgCO2e: pilotExpectedEmissions.scope1KgCO2e,
              status: 'CALCULATED',
            },
            {
              activityDataId: 'scope-2',
              activityType: 'ELECTRICITY',
              jurisdictionCountry: 'Canada',
              jurisdictionRegion: 'Alberta',
              activityQuantity: 500,
              activityUnit: 'kWh',
              calculatedEmissionsKgCO2e: pilotExpectedEmissions.scope2KgCO2e,
              status: 'CALCULATED',
            },
            {
              activityDataId: 'scope-3',
              activityType: 'AIR_TRAVEL',
              activityQuantity: 1325,
              activityUnit: 'km',
              calculatedEmissionsKgCO2e: pilotExpectedEmissions.scope3KgCO2e,
              status: 'CALCULATED',
            },
            {
              activityDataId: 'water',
              activityType: 'WATER',
              activityQuantity: 1000,
              activityUnit: 'm3',
              calculatedEmissionsKgCO2e: null,
              status: 'TRACKED_ONLY',
            },
            {
              activityDataId: 'missing-province',
              activityType: 'ELECTRICITY',
              activityQuantity: 100,
              activityUnit: 'kWh',
              calculatedEmissionsKgCO2e: null,
              status: 'MISSING_JURISDICTION',
            },
            {
              activityDataId: 'missing-factor',
              activityType: 'ELECTRICITY',
              jurisdictionRegion: 'Quebec',
              activityQuantity: 100,
              activityUnit: 'kWh',
              calculatedEmissionsKgCO2e: null,
              status: 'MISSING_FACTOR',
            },
            {
              activityDataId: 'unit-mismatch',
              activityType: 'DIESEL',
              activityQuantity: 20,
              activityUnit: 'bottles',
              calculatedEmissionsKgCO2e: null,
              status: 'INVALID_UNIT',
            },
          ]}
        />
      </MemoryRouter>,
    );

    const scopeSection = screen.getByRole('region', { name: /Emissions by Scope/i });
    expect(within(scopeSection).getByText('Scope 1').parentElement).toHaveTextContent('457 kg CO2e');
    expect(within(scopeSection).getByText('Scope 2').parentElement).toHaveTextContent('265 kg CO2e');
    expect(within(scopeSection).getByText('Scope 3').parentElement).toHaveTextContent('210 kg CO2e');
    expect(screen.getByText('932 kg CO2e')).toBeInTheDocument();
    expect(
      pilotExpectedEmissions.scope1KgCO2e +
        pilotExpectedEmissions.scope2KgCO2e +
        pilotExpectedEmissions.scope3KgCO2e,
    ).toBe(pilotExpectedEmissions.totalKgCO2e);
  });

  it('renders the shared summary section with multiple records and populated calculation table', () => {
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
    expect(screen.getByText(/Diesel: 1,710 liters/)).toBeInTheDocument();
    expect(screen.getByText(/Natural Gas: 400 m3/)).toBeInTheDocument();
    expect(screen.queryByText(/L \/ m3/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Total Calculated Emissions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1,234.50 kg CO2e').length).toBeGreaterThan(0);

    const table = screen.getByRole('table');
    expect(within(table).queryByText('Count')).not.toBeInTheDocument();
    expect(within(table).getByText('Input Data')).toBeInTheDocument();
    expect(within(table).getByText('Calculated Result')).toBeInTheDocument();
    expect(within(table).getByText('Total Calculated Emissions')).toBeInTheDocument();
    expect(within(table).getByText('1,710 liters')).toBeInTheDocument();
    expect(within(table).getByText('Diesel')).toBeInTheDocument();
    expect(within(table).getByText('400 m3')).toBeInTheDocument();
    expect(within(table).getByText('Natural Gas')).toBeInTheDocument();
    expect(within(table).getByText('1,800 kWh')).toBeInTheDocument();
    expect(within(table).getByText('Electricity')).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '1,710' })).toBeInTheDocument();
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
            { activityDataId: 'activity-1', activityType: 'DIESEL', unit: 'tonnes' },
            { activityDataId: 'activity-2', activityType: 'DIESEL', unit: 'tonnes' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Calculation Issues')).toBeInTheDocument();
    expect(screen.getByText('Missing Factor')).toBeInTheDocument();
    expect(screen.getByText('No factor found for: DIESEL / tonnes')).toBeInTheDocument();
    expect(screen.getByText(/2 records/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Factor/i })).toBeInTheDocument();
  });

  it('shows missing unit as missing data without create factor action', () => {
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
            { activityDataId: 'activity-1', activityType: 'ELECTRICITY', unit: null },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Missing Data')).toBeInTheDocument();
    expect(screen.getByText('Electricity — missing unit')).toBeInTheDocument();
    expect(screen.getByText('Missing unit. Please review this record.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fix Record/i })).toBeInTheDocument();
    expect(screen.queryByText(/ELECTRICITY \/ null/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Factor/i })).not.toBeInTheDocument();
  });

  it('shows invalid numeric units as invalid unit without create factor action', () => {
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
            { activityDataId: 'activity-1', activityType: 'ELECTRICITY', unit: '50' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Invalid Unit')).toBeInTheDocument();
    expect(screen.getByText('Electricity — invalid unit')).toBeInTheDocument();
    expect(
      screen.getByText('Invalid unit detected. Please review this record.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fix Record/i })).toBeInTheDocument();
    expect(screen.queryByText(/ELECTRICITY \/ 50/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Factor/i })).not.toBeInTheDocument();
  });

  it('shows water as tracked metric only without create factor action', () => {
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
            { activityDataId: 'activity-1', activityType: 'WATER', unit: 'm3' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Data Quality & Tracked Metrics')).toBeInTheDocument();
    expect(screen.queryByText('Calculation Issues')).not.toBeInTheDocument();
    expect(screen.getByText('Informational')).toBeInTheDocument();
    expect(screen.getByText('Water / m3 — tracked only')).toBeInTheDocument();
    expect(screen.getByText('Tracked metric only. No emission factor required.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Factor/i })).not.toBeInTheDocument();
  });

  it('groups water m3 variants into one tracked-only issue group', () => {
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
            { activityDataId: 'activity-1', activityType: 'WATER', unit: 'm³' },
            { activityDataId: 'activity-2', activityType: 'WATER', unit: 'm3' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Data Quality & Tracked Metrics')).toBeInTheDocument();
    expect(screen.queryByText('Calculation Issues')).not.toBeInTheDocument();
    expect(screen.getByText('Water / m3 — tracked only')).toBeInTheDocument();
    expect(screen.getAllByText(/2 records/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Informational')).toHaveLength(1);
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
    expect(screen.getByText('Calculation issues')).toBeInTheDocument();
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

describe('buildHotspotAnalysis', () => {
  function detail(overrides: Partial<any>) {
    return {
      activityDataId: `record-${Math.random()}`,
      activityType: 'DIESEL',
      activityQuantity: 1,
      activityUnit: 'liters',
      normalizedUnit: 'liters',
      calculatedEmissionsKgCO2e: null,
      calculatedEmission: null,
      status: 'CALCULATED',
      ...overrides,
    };
  }

  it('groups calculated emissions by activity type and ranks descending', () => {
    const analysis = buildHotspotAnalysis([
      detail({ activityType: 'DIESEL', calculatedEmissionsKgCO2e: 400 }),
      detail({ activityType: 'GASOLINE', calculatedEmissionsKgCO2e: 100 }),
      detail({ activityType: 'NATURAL_GAS', calculatedEmissionsKgCO2e: 500 }),
    ]);

    expect(analysis.totalCalculatedEmissions).toBe(1000);
    expect(analysis.categoryHotspots.map((row) => row.activityType)).toEqual([
      'NATURAL_GAS',
      'DIESEL',
      'GASOLINE',
    ]);
    expect(analysis.categoryHotspots[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        percentageOfTotal: 50,
        hotspotLevel: 'HIGH',
      }),
    );
  });

  it('classifies excluded tracked-only and invalid-unit records separately', () => {
    const analysis = buildHotspotAnalysis([
      detail({ activityType: 'DIESEL', calculatedEmissionsKgCO2e: 268 }),
      detail({ activityType: 'WATER', status: 'TRACKED_ONLY' }),
      detail({ activityType: 'DIESEL', status: 'INVALID_UNIT', calculatedEmissionsKgCO2e: null }),
    ]);

    expect(analysis.excludedRecordCount).toBe(2);
    expect(analysis.excludedCategories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityType: 'WATER',
          reason: 'TRACKED_ONLY',
          excludedRecordCount: 1,
        }),
        expect.objectContaining({
          activityType: 'DIESEL',
          reason: 'INVALID_UNIT',
          excludedRecordCount: 1,
        }),
      ]),
    );
  });

  it('formats tracked-only hotspot exclusions without treating Water as review error', () => {
    const analysis = buildHotspotAnalysis([
      detail({ activityType: 'ELECTRICITY', calculatedEmissionsKgCO2e: 100 }),
      detail({ activityType: 'WATER', status: 'TRACKED_ONLY' }),
    ]);

    expect(formatHotspotExclusionNote(analysis)).toBe(
      '1 tracked operational metric was excluded from the calculated GHG emissions total. No records require review for this report scope.',
    );
    expect(formatHotspotExclusionNote(analysis)).not.toMatch(/1 records|missing factor|invalid unit|requiring review/i);
    expect(analysis.focusRecommendations.map((item) => item.message).join(' ')).not.toMatch(/1 records were excluded/i);
  });

  it('formats mixed tracked metrics and review records separately', () => {
    const analysis = buildHotspotAnalysis([
      detail({ activityType: 'ELECTRICITY', calculatedEmissionsKgCO2e: 100 }),
      detail({ activityType: 'WATER', status: 'TRACKED_ONLY' }),
      detail({ activityType: 'DIESEL', status: 'INVALID_UNIT', calculatedEmissionsKgCO2e: null }),
    ]);

    expect(formatHotspotExclusionNote(analysis)).toBe(
      'Tracked operational metrics are excluded from the calculated GHG emissions total by design. Some additional records require review before they can be included.',
    );
  });

  it('returns no hotspots and a recommendation when no records are calculated', () => {
    const analysis = buildHotspotAnalysis([
      detail({ activityType: 'HOTEL', status: 'MISSING_FACTOR', calculatedEmissionsKgCO2e: null }),
      detail({ activityType: 'ELECTRICITY', status: 'MISSING_JURISDICTION', calculatedEmissionsKgCO2e: null }),
    ]);

    expect(analysis.totalCalculatedEmissions).toBe(0);
    expect(analysis.categoryHotspots).toEqual([]);
    expect(analysis.focusRecommendations[0]).toEqual(
      expect.objectContaining({
        priority: 'HIGH',
        title: 'No calculated emissions available yet',
      }),
    );
  });
});

describe('buildDataReadinessSummary', () => {
  function detail(overrides: Partial<any>) {
    return {
      activityDataId: `record-${Math.random()}`,
      activityType: 'DIESEL',
      activityQuantity: 100,
      activityUnit: 'liters',
      recordDate: '2026-06-30',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      sourceReference: 'Receipt #123',
      calculatedEmissionsKgCO2e: 268,
      status: 'CALCULATED',
      ...overrides,
    };
  }

  it('scores complete calculated records as good readiness', () => {
    const summary = buildDataReadinessSummary([
      detail({ activityType: 'DIESEL' }),
      detail({ activityType: 'GASOLINE', activityUnit: 'L' }),
    ]);

    expect(summary.level).toBe('Good');
    expect(summary.recordsReadyForCalculation).toBe(2);
    expect(summary.recordsRequiringReview).toBe(0);
    expect(Number.isNaN(summary.score)).toBe(false);
  });

  it('counts invalid units, missing jurisdiction, missing factors, and tracked metrics', () => {
    const summary = buildDataReadinessSummary([
      detail({ activityType: 'DIESEL', status: 'INVALID_UNIT', activityUnit: 'bottles', calculatedEmissionsKgCO2e: null }),
      detail({ activityType: 'ELECTRICITY', status: 'MISSING_JURISDICTION', jurisdictionRegion: null, calculatedEmissionsKgCO2e: null }),
      detail({ activityType: 'HOTEL', status: 'MISSING_FACTOR', calculatedEmissionsKgCO2e: null }),
      detail({ activityType: 'WATER', status: 'TRACKED_ONLY', calculatedEmissionsKgCO2e: null }),
    ]);

    expect(summary.recordsReadyForCalculation).toBe(0);
    expect(summary.recordsRequiringReview).toBe(3);
    expect(summary.invalidUnitCount).toBe(1);
    expect(summary.missingJurisdictionCount).toBe(1);
    expect(summary.missingFactorCount).toBe(1);
    expect(summary.trackedOnlyCount).toBe(1);
  });

  it('returns an incomplete non-NaN score for empty data', () => {
    const summary = buildDataReadinessSummary([]);

    expect(summary.score).toBe(0);
    expect(summary.level).toBe('Incomplete');
    expect(Number.isNaN(summary.score)).toBe(false);
  });
});

describe('buildCarbonCreditReadinessAssessment', () => {
  function detail(overrides: Partial<any>) {
    return {
      activityDataId: `record-${Math.random()}`,
      activityType: 'DIESEL',
      activityQuantity: 100,
      activityUnit: 'liters',
      recordDate: '2026-06-30',
      recordYear: 2026,
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      sourceReference: 'Receipt #123',
      sourceAuthority: 'CarbonLite System Defaults',
      sourceDocument: 'CarbonLite MVP Default Factors v1.0',
      factorYear: 2025,
      factorValue: 2.68,
      calculationFormula: '100 liters × 2.68 kgCO2e/liter = 268 kgCO2e',
      calculatedEmissionsKgCO2e: 268,
      status: 'CALCULATED',
      ...overrides,
    };
  }

  it('returns not ready when there are no records', () => {
    const assessment = buildCarbonCreditReadinessAssessment(
      [],
      buildDataReadinessSummary([]),
    );

    expect(assessment.readinessLevel).toBe('NOT_READY');
    expect(assessment.summary).toMatch(/Not ready for assessment/i);
    expect(assessment.disclaimer).toBe(CARBON_CREDIT_READINESS_DISCLAIMER);
  });

  it('is not ready when current data exists but explicit baseline/current periods are missing', () => {
    const details = [detail({ recordYear: 2026, calculatedEmissionsKgCO2e: 268 })];
    const assessment = buildCarbonCreditReadinessAssessment(
      details,
      buildDataReadinessSummary(details),
    );

    expect(assessment.readinessLevel).toBe('NOT_READY');
    expect(assessment.checklist.find((item) => item.key === 'baseline-data')?.status).toBe('MISSING');
    expect(assessment.summary).toMatch(/baseline\/current periods/i);
  });

  it('does not infer reductions from record years without explicit baseline/current periods', () => {
    const details = [
      detail({ recordYear: 2025, recordDate: '2025-06-30', calculatedEmissionsKgCO2e: 500 }),
      detail({ recordYear: 2026, recordDate: '2026-06-30', calculatedEmissionsKgCO2e: 300 }),
    ];
    const assessment = buildCarbonCreditReadinessAssessment(
      details,
      buildDataReadinessSummary(details),
    );

    expect(assessment.readinessLevel).toBe('NOT_READY');
    expect(assessment.reductionAmount).toBeNull();
    expect(assessment.reductionPercentage).toBeNull();
    expect(assessment.summary).toMatch(/baseline\/current periods/i);
    expect(assessment.summary.toLowerCase()).not.toContain('eligible');
  });

  it('reduces readiness when many records require review', () => {
    const details = [
      detail({ recordYear: 2025, calculatedEmissionsKgCO2e: 500 }),
      detail({ recordYear: 2026, calculatedEmissionsKgCO2e: 300 }),
      detail({ status: 'INVALID_UNIT', calculatedEmissionsKgCO2e: null }),
      detail({ status: 'MISSING_FACTOR', calculatedEmissionsKgCO2e: null }),
      detail({ status: 'MISSING_JURISDICTION', calculatedEmissionsKgCO2e: null }),
    ];
    const assessment = buildCarbonCreditReadinessAssessment(
      details,
      buildDataReadinessSummary(details),
    );

    expect(assessment.score).toBeLessThan(100);
    expect(assessment.nextSteps).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Resolve records requiring review/i),
      ]),
    );
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
    vi.useRealTimers();
    vi.mocked(loadDefaultMetricsDateRange).mockResolvedValue({
      startDate: '2025-01-01',
      endDate: '2026-12-31',
      hasActivityRecords: false,
    });
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
        dateFrom: '2025-01-01',
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

    expect(await screen.findByText('Calculating metrics...')).toBeInTheDocument();
    expect(screen.getByText('Loading calculation summary...')).toBeInTheDocument();
    expect(screen.queryByText('No activity records yet. Import activity data to generate metrics.')).not.toBeInTheDocument();
    expect(screen.queryByText('0 kg CO2e')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-01-01')).not.toBeDisabled();
    expect(screen.getByDisplayValue('2026-12-31')).not.toBeDisabled();

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

    fireEvent.change(screen.getByDisplayValue('2025-01-01'), {
      target: { value: '2026-02-01' },
    });
    await waitForDateDebounce();

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
    expect(screen.getByText(/Diesel: 240 L/)).toBeInTheDocument();

    let resolveRefresh!: (value: any) => void;
    vi.mocked(loadMetricsOverview).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }) as any,
    );

    fireEvent.change(screen.getByDisplayValue('2025-01-01'), {
      target: { value: '2026-02-01' },
    });
    await waitForDateDebounce();

    expect(await screen.findByText('Refreshing metrics...')).toBeInTheDocument();
    expect(screen.getByText(/Diesel: 240 L/)).toBeInTheDocument();

    resolveRefresh(overview);

    await waitFor(() => {
      expect(loadMetricsOverview).toHaveBeenLastCalledWith({
        recalculate: true,
        dateFrom: '2026-02-01',
        dateTo: '2026-12-31',
      });
    });
  });

  it('does not refresh for temporary invalid date edits', async () => {
    render(
      <MemoryRouter>
        <MetricsSummaryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByDisplayValue('2025-01-01'), {
      target: { value: '' },
    });
    await waitForDateDebounce();

    expect(loadMetricsOverview).toHaveBeenCalledTimes(1);
  });

  it('uses detected 2025 activity range by default', async () => {
    vi.mocked(loadDefaultMetricsDateRange).mockResolvedValueOnce({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      hasActivityRecords: true,
    });

    render(
      <MemoryRouter>
        <MetricsSummaryPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(loadMetricsOverview).toHaveBeenCalledWith({
        recalculate: true,
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      });
    });

    expect(screen.getByDisplayValue('2025-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-12-31')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2025 Full Year/i })).toBeInTheDocument();
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
      await screen.findByText('Unable to load calculation review. Please try again.'),
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

function waitForDateDebounce() {
  return new Promise((resolve) => window.setTimeout(resolve, 550));
}
