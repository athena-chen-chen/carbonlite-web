import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  buildMetricsSummaryTableRows,
  groupMissingFactors,
  MetricsSummarySection,
} from '../components/MetricsSummarySection';

describe('buildMetricsSummaryTableRows', () => {
  const usageTotals = {
    fuel: 1540,
    electricity: 1800,
    fuelUnitLabel: 'L / m3',
    electricityUnitLabel: 'kWh',
  };

  it('uses the same values shown in the Metrics Summary cards', () => {
    const rows = buildMetricsSummaryTableRows({
      usageTotals,
      totalEstimatedEmissionsKgCO2e: 1234.5,
      recordsIncluded: 8,
    });

    expect(rows).toEqual([
      {
        metricType: 'CARBON_EMISSION',
        unit: 'kgCO2e',
        totalValue: '1234.5 kg CO2e',
        count: 8,
      },
      {
        metricType: 'FUEL_USAGE',
        unit: 'L / m3',
        totalValue: '1540 L / m3',
        count: 8,
      },
      {
        metricType: 'ELECTRICITY',
        unit: 'kWh',
        totalValue: '1800 kWh',
        count: 8,
      },
    ]);
  });

  it('is not empty when records are included in the summary', () => {
    const rows = buildMetricsSummaryTableRows({
      usageTotals: {
        fuel: 0,
        electricity: 0,
        fuelUnitLabel: 'L / m3',
        electricityUnitLabel: 'kWh',
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
          metricType: 'CARBON_EMISSION',
          unit: 'kgCO2e',
          totalValue: '268 kg CO2e',
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
      { activityType: 'WASTE', unit: 'kg', count: 1 },
      { activityType: 'WATER', unit: 'm3', count: 2 },
    ]);
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
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Fuel Usage')).toBeInTheDocument();
    expect(screen.getAllByText('1540 L / m3').length).toBeGreaterThan(0);
    expect(screen.getByText('CO₂ Emissions')).toBeInTheDocument();
    expect(screen.getAllByText('1234.5 kg CO2e').length).toBeGreaterThan(0);

    const table = screen.getByRole('table');
    expect(within(table).getByText('CARBON_EMISSION')).toBeInTheDocument();
    expect(within(table).getByText('FUEL_USAGE')).toBeInTheDocument();
    expect(within(table).getByText('ELECTRICITY')).toBeInTheDocument();
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
});
