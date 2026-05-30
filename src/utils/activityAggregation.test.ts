import {
  aggregateActivityUsage,
  formatFuelUsageBreakdown,
  formatActivityUsageValue,
  type ActivityUsageRecord,
} from './activityAggregation';

const records: ActivityUsageRecord[] = [
  { activityType: 'DIESEL', quantity: 120, unit: 'L' },
  { activityType: 'GASOLINE', quantity: '20', unit: 'L' },
  { activityType: 'NATURAL_GAS', quantity: 300, unit: 'm3' },
  { activityType: 'ELECTRICITY', quantity: '450', unit: 'kWh' },
  { activityType: 'WATER', quantity: 1000, unit: 'm3' },
];

describe('activity usage aggregation', () => {
  it('aggregates fuel and electricity from imported activity records', () => {
    const totals = aggregateActivityUsage(records);

    expect(totals.fuel).toBe(440);
    expect(totals.fuelUsageBreakdown).toEqual([
      { activityType: 'DIESEL', total: 120, unit: 'L' },
      { activityType: 'GASOLINE', total: 20, unit: 'L' },
      { activityType: 'NATURAL_GAS', total: 300, unit: 'm3' },
    ]);
    expect(totals.electricity).toBe(450);
  });

  it('uses the same grouped fuel totals for Metrics Summary and Reports cards', () => {
    const metricsSummaryTotals = aggregateActivityUsage(records);
    const reportsTotals = aggregateActivityUsage(records);

    expect(metricsSummaryTotals).toEqual(reportsTotals);
    expect(formatFuelUsageBreakdown(metricsSummaryTotals.fuelUsageBreakdown)).toBe(
      '120 L Diesel\n20 L Gasoline\n300 m3 Natural Gas',
    );
    expect(
      formatActivityUsageValue(
        reportsTotals.electricity,
        reportsTotals.electricityUnitLabel,
      ),
    ).toBe('450 kWh');
  });

  it('normalizes activity type casing before matching', () => {
    const totals = aggregateActivityUsage([
      { activityType: 'diesel', quantity: 10 },
      { activityType: ' electricity ', quantity: 15 },
    ]);

    expect(totals.fuel).toBe(10);
    expect(totals.fuelUsageBreakdown).toEqual([
      { activityType: 'DIESEL', total: 10, unit: '-' },
    ]);
    expect(totals.electricity).toBe(15);
  });

  it('does not combine incompatible fuel units into one display value', () => {
    const totals = aggregateActivityUsage([
      { activityType: 'DIESEL', quantity: 1710, unit: 'L' },
      { activityType: 'NATURAL_GAS', quantity: 400, unit: 'm3' },
    ]);

    expect(formatFuelUsageBreakdown(totals.fuelUsageBreakdown)).toBe(
      '1710 L Diesel\n400 m3 Natural Gas',
    );
    expect(formatFuelUsageBreakdown(totals.fuelUsageBreakdown)).not.toContain('L / m3');
  });
});
