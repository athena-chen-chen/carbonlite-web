import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import {
  buildDataReadinessSummary,
  buildCarbonCreditReadinessAssessment,
  CARBON_CREDIT_READINESS_DISCLAIMER,
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

  it('uses the same values shown in the Metrics Summary cards', () => {
    const rows = buildMetricsSummaryTableRows({
      usageTotals,
      totalEstimatedEmissionsKgCO2e: 1234.5,
      recordsIncluded: 8,
    });

    expect(rows).toEqual([
      {
        metricType: 'Fuel Usage — Diesel',
        unit: 'liters',
        totalValue: '1,710',
        category: 'input',
        activityType: 'DIESEL',
      },
      {
        metricType: 'Fuel Usage — Natural Gas',
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
        metricType: 'Carbon Emissions',
        unit: 'kgCO2e',
        totalValue: '1,234.50',
        category: 'calculated',
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
    expect(screen.getByText('Review Calculation Issues above.')).toBeInTheDocument();
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
            { activityDataId: 'activity-2', activityType: 'WASTE', unit: 'kg' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('No calculated emissions yet.')).toBeInTheDocument();
    expect(screen.getByText('Tracked Metrics')).toBeInTheDocument();
    expect(screen.getByText('Water / m3 — 1 record')).toBeInTheDocument();
    expect(screen.getByText('Waste / kg — 1 record')).toBeInTheDocument();
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
    expect(screen.getByText('Carbon Emissions')).toBeInTheDocument();
    expect(screen.getByText('231')).toBeInTheDocument();
    expect(screen.getByText('kgCO2e')).toBeInTheDocument();
    expect(
      screen.getByText('Calculated from: 100 liters gasoline × 2.31 kgCO2e/liters'),
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
    expect(within(dialog).getByText('100 × 2.31 = 231 kgCO2e')).toBeInTheDocument();
    expect(within(dialog).getByText('Matching Explanation')).toBeInTheDocument();
    expect(within(dialog).getByText('Matched factor')).toBeInTheDocument();
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
    expect(screen.getByText('CO₂ Emissions')).toBeInTheDocument();
    expect(screen.getAllByText('1,234.50 kg CO2e').length).toBeGreaterThan(0);

    const table = screen.getByRole('table');
    expect(within(table).queryByText('Count')).not.toBeInTheDocument();
    expect(within(table).getByText('Input Data')).toBeInTheDocument();
    expect(within(table).getByText('Calculated Result')).toBeInTheDocument();
    expect(within(table).getByText('Carbon Emissions')).toBeInTheDocument();
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
    expect(summary.recordsRequiringReview).toBe(4);
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
      calculationFormula: '100 liters × 2.68 kgCO2e/liters = 268 kgCO2e',
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
    expect(screen.getByText('Loading summary...')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading Fuel Usage')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading Electricity')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading CO₂ Emissions')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading Records Included in Summary')).toBeInTheDocument();
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

function waitForDateDebounce() {
  return new Promise((resolve) => window.setTimeout(resolve, 550));
}
