import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { aggregateActivityUsage } from '../utils/activityAggregation';
import { normalizeActivityType } from '../utils/activityType';

type GoldenDatasetRow = {
  activityType: string;
  quantity: number;
  unit: string;
  province: string;
};

type Scope = 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';

const goldenDatasetPath = resolve(process.cwd(), 'apps/web-e2e/fixtures/pilot-golden-dataset.csv');
const factorRegistry: Record<string, { factorValue: number; scope: Scope }> = {
  'ELECTRICITY:Alberta:kWh': { factorValue: 0.53, scope: 'SCOPE_2' },
  'ELECTRICITY:British Columbia:kWh': { factorValue: 0.02, scope: 'SCOPE_2' },
  'ELECTRICITY:Ontario:kWh': { factorValue: 0.12, scope: 'SCOPE_2' },
  'NATURAL_GAS::m3': { factorValue: 1.89, scope: 'SCOPE_1' },
  'GASOLINE::liters': { factorValue: 2.31, scope: 'SCOPE_1' },
  'DIESEL::liters': { factorValue: 2.68, scope: 'SCOPE_1' },
  'AIR_TRAVEL::km': { factorValue: 0.115, scope: 'SCOPE_3' },
  'HOTEL::nights': { factorValue: 15, scope: 'SCOPE_3' },
};

function parseGoldenDataset(): GoldenDatasetRow[] {
  const [headerLine, ...lines] = readFileSync(goldenDatasetPath, 'utf8').trim().split(/\r?\n/);
  const headers = headerLine.split(',');

  return lines.map((line) => {
    const values = line.split(',');
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));

    return {
      activityType: row.activityType,
      quantity: Number(row.quantity),
      unit: row.unit,
      province: row.province,
    };
  });
}

function normalizeQuantityForFactor(row: GoldenDatasetRow) {
  if (normalizeActivityType(row.activityType) === 'ELECTRICITY' && row.unit === 'MWh') {
    return {
      quantity: row.quantity * 1000,
      unit: 'kWh',
    };
  }

  return {
    quantity: row.quantity,
    unit: row.unit,
  };
}

function getFactorKey(row: GoldenDatasetRow) {
  const activityType = normalizeActivityType(row.activityType);
  const normalized = normalizeQuantityForFactor(row);
  const province = activityType === 'ELECTRICITY' ? row.province : '';
  return `${activityType}:${province}:${normalized.unit}`;
}

describe('pilot golden dataset fixture', () => {
  it('matches the stable Pilot Demo v0.1 report dataset without Ground Transport', () => {
    const rows = parseGoldenDataset();

    expect(rows).toHaveLength(10);
    expect(rows.map((row) => row.activityType)).not.toContain('Ground Transport');
    expect(rows.map((row) => row.activityType)).not.toContain('GROUND_TRANSPORT');

    expect(rows).toEqual([
      expect.objectContaining({ activityType: 'Electricity', quantity: 12500, unit: 'kWh', province: 'Alberta' }),
      expect.objectContaining({ activityType: 'Electricity', quantity: 100, unit: 'kWh', province: 'British Columbia' }),
      expect.objectContaining({ activityType: 'Electricity', quantity: 1000, unit: 'kWh', province: 'Ontario' }),
      expect.objectContaining({ activityType: 'Natural Gas', quantity: 1000, unit: 'm3' }),
      expect.objectContaining({ activityType: 'Gasoline', quantity: 500, unit: 'liters' }),
      expect.objectContaining({ activityType: 'Diesel', quantity: 100, unit: 'liters' }),
      expect.objectContaining({ activityType: 'Air Travel', quantity: 5000, unit: 'km' }),
      expect.objectContaining({ activityType: 'Hotel', quantity: 10, unit: 'nights' }),
      expect.objectContaining({ activityType: 'Water', quantity: 100, unit: 'm3' }),
      expect.objectContaining({ activityType: 'Electricity', quantity: 50, unit: 'MWh', province: 'Alberta' }),
    ]);
  });

  it('preserves golden dataset calculation totals and tracked-only Water treatment', () => {
    const rows = parseGoldenDataset();
    const scopeTotals = {
      SCOPE_1: 0,
      SCOPE_2: 0,
      SCOPE_3: 0,
    };
    let includedGhgRecords = 0;
    let trackedOperationalMetrics = 0;
    let recordsRequiringReview = 0;

    rows.forEach((row) => {
      const activityType = normalizeActivityType(row.activityType);
      if (activityType === 'WATER') {
        trackedOperationalMetrics += 1;
        return;
      }

      const factor = factorRegistry[getFactorKey(row)];
      if (!factor) {
        recordsRequiringReview += 1;
        return;
      }

      const normalized = normalizeQuantityForFactor(row);
      scopeTotals[factor.scope] += normalized.quantity * factor.factorValue;
      includedGhgRecords += 1;
    });

    const totalCalculatedEmissions =
      scopeTotals.SCOPE_1 + scopeTotals.SCOPE_2 + scopeTotals.SCOPE_3;
    const usageTotals = aggregateActivityUsage(rows);
    const waterRow = rows.find((row) => normalizeActivityType(row.activityType) === 'WATER');
    const mwhElectricity = rows.find(
      (row) =>
        normalizeActivityType(row.activityType) === 'ELECTRICITY' &&
        row.unit === 'MWh',
    );
    const normalizedMwhElectricity = mwhElectricity
      ? normalizeQuantityForFactor(mwhElectricity)
      : null;

    expect(includedGhgRecords).toBe(9);
    expect(trackedOperationalMetrics).toBe(1);
    expect(recordsRequiringReview).toBe(0);
    expect(waterRow).toEqual(
      expect.objectContaining({ activityType: 'Water', quantity: 100, unit: 'm3' }),
    );

    expect(scopeTotals.SCOPE_1).toBe(3313);
    expect(scopeTotals.SCOPE_2).toBe(33247);
    expect(scopeTotals.SCOPE_3).toBe(725);
    expect(totalCalculatedEmissions).toBe(37285);

    expect(usageTotals.electricity).toBe(63600);
    expect(normalizedMwhElectricity).toEqual({ quantity: 50000, unit: 'kWh' });
    expect(
      normalizedMwhElectricity && normalizedMwhElectricity.quantity * 0.53,
    ).toBe(26500);
  });
});
