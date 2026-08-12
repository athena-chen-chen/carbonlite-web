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
      { activityType: 'DIESEL', total: 120, unit: 'liters' },
      { activityType: 'GASOLINE', total: 20, unit: 'liters' },
      { activityType: 'NATURAL_GAS', total: 300, unit: 'm3' },
    ]);
    expect(totals.electricity).toBe(450);
  });

  it('uses the same grouped fuel totals for Metrics Summary and Reports cards', () => {
    const metricsSummaryTotals = aggregateActivityUsage(records);
    const reportsTotals = aggregateActivityUsage(records);

    expect(metricsSummaryTotals).toEqual(reportsTotals);
    expect(formatFuelUsageBreakdown(metricsSummaryTotals.fuelUsageBreakdown)).toBe(
      'Diesel: 120 liters\nGasoline: 20 liters\nNatural Gas: 300 m3',
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
      { activityType: 'diesel', quantity: 10, unit: 'L' },
      { activityType: ' electricity ', quantity: 15, unit: 'KWH' },
    ]);

    expect(totals.fuel).toBe(10);
    expect(totals.fuelUsageBreakdown).toEqual([
      { activityType: 'DIESEL', total: 10, unit: 'liters' },
    ]);
    expect(totals.electricity).toBe(15);
  });

  it('normalizes compatible electricity units to kWh before summing', () => {
    const totals = aggregateActivityUsage([
      { activityType: 'ELECTRICITY', quantity: 12500, unit: 'kWh' },
      { activityType: 'ELECTRICITY', quantity: 100, unit: 'kWh' },
      { activityType: 'ELECTRICITY', quantity: 1000, unit: 'kWh' },
      { activityType: 'ELECTRICITY', quantity: 50, unit: 'MWh' },
      { activityType: 'WATER', quantity: 100, unit: 'm3' },
    ]);

    expect(totals.electricity).toBe(63600);
    expect(totals.electricityUnitLabel).toBe('kWh');
    expect(formatActivityUsageValue(totals.electricity, totals.electricityUnitLabel)).toBe(
      '63,600 kWh',
    );
  });

  it('builds a complete input activity breakdown for pilot review', () => {
    const totals = aggregateActivityUsage([
      { activityType: 'ELECTRICITY', quantity: 12500, unit: 'kWh' },
      { activityType: 'ELECTRICITY', quantity: 100, unit: 'kWh' },
      { activityType: 'ELECTRICITY', quantity: 1000, unit: 'kWh' },
      { activityType: 'ELECTRICITY', quantity: 50, unit: 'MWh' },
      { activityType: 'NATURAL_GAS', quantity: 1000, unit: 'm3' },
      { activityType: 'GASOLINE', quantity: 500, unit: 'liters' },
      { activityType: 'DIESEL', quantity: 100, unit: 'liters' },
      { activityType: 'AIR_TRAVEL', quantity: 5000, unit: 'km' },
      { activityType: 'HOTEL', quantity: 10, unit: 'nights' },
      { activityType: 'WATER', quantity: 100, unit: 'm3' },
    ]);

    expect(totals.activityUsageBreakdown).toEqual([
      { activityType: 'ELECTRICITY', total: 63600, unit: 'kWh' },
      { activityType: 'NATURAL_GAS', total: 1000, unit: 'm3' },
      { activityType: 'GASOLINE', total: 500, unit: 'liters' },
      { activityType: 'DIESEL', total: 100, unit: 'liters' },
      { activityType: 'AIR_TRAVEL', total: 5000, unit: 'km' },
      { activityType: 'HOTEL', total: 10, unit: 'nights' },
      { activityType: 'WATER', total: 100, unit: 'm3', trackedOnly: true },
    ]);
  });

  it('does not combine incompatible fuel units into one display value', () => {
    const totals = aggregateActivityUsage([
      { activityType: 'DIESEL', quantity: 1710, unit: 'L' },
      { activityType: 'NATURAL_GAS', quantity: 400, unit: 'm3' },
    ]);

    expect(formatFuelUsageBreakdown(totals.fuelUsageBreakdown)).toBe(
      'Diesel: 1,710 liters\nNatural Gas: 400 m3',
    );
    expect(formatFuelUsageBreakdown(totals.fuelUsageBreakdown)).not.toContain('L / m3');
  });

  it('excludes invalid numeric units from fuel totals and reports records needing review', () => {
    const totals = aggregateActivityUsage([
      { activityType: 'DIESEL', quantity: 105.3, unit: '20' },
      { activityType: 'DIESEL', quantity: 760, unit: 'LTR' },
      { activityType: 'NATURAL_GAS', quantity: 18900, unit: null },
    ]);

    expect(formatFuelUsageBreakdown(totals.fuelUsageBreakdown)).toBe(
      'Diesel: 760 liters',
    );
    expect(totals.invalidFuelRecordCount).toBe(2);
  });
});
