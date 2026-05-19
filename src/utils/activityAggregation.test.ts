import {
  aggregateActivityUsage,
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
    expect(totals.electricity).toBe(450);
  });

  it('uses the same totals for Metrics Summary and Reports cards', () => {
    const metricsSummaryTotals = aggregateActivityUsage(records);
    const reportsTotals = aggregateActivityUsage(records);

    expect(metricsSummaryTotals).toEqual(reportsTotals);
    expect(
      formatActivityUsageValue(
        metricsSummaryTotals.fuel,
        metricsSummaryTotals.fuelUnitLabel,
      ),
    ).toBe('440 L / m3');
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
    expect(totals.electricity).toBe(15);
  });
});
