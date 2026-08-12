import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type GoldenDatasetRow = {
  activityType: string;
  quantity: number;
  unit: string;
  province: string;
};

const goldenDatasetPath = resolve(process.cwd(), 'apps/web-e2e/fixtures/pilot-golden-dataset.csv');

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
});
