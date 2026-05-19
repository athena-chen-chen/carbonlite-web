export type ActivityUsageRecord = {
  activityType?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
};

export type ActivityUsageTotals = {
  fuel: number;
  electricity: number;
  fuelUnitLabel: string;
  electricityUnitLabel: string;
};

const FUEL_ACTIVITY_TYPES = new Set([
  'DIESEL',
  'GASOLINE',
  'NATURAL_GAS',
  'PROPANE',
  'FUEL',
]);

function normalizeActivityType(activityType?: string | null) {
  return String(activityType ?? '').trim().toUpperCase();
}

function toQuantity(value?: string | number | null) {
  const quantity = Number(value ?? 0);
  return Number.isFinite(quantity) ? quantity : 0;
}

export function aggregateActivityUsage(
  records: ActivityUsageRecord[],
): ActivityUsageTotals {
  return records.reduce<ActivityUsageTotals>(
    (totals, record) => {
      const activityType = normalizeActivityType(record.activityType);
      const quantity = toQuantity(record.quantity);

      if (FUEL_ACTIVITY_TYPES.has(activityType)) {
        totals.fuel += quantity;
      }

      if (activityType === 'ELECTRICITY') {
        totals.electricity += quantity;
      }

      return totals;
    },
    {
      fuel: 0,
      electricity: 0,
      fuelUnitLabel: 'L / m3',
      electricityUnitLabel: 'kWh',
    },
  );
}

export function formatActivityUsageValue(total: number, unitLabel: string) {
  return `${total} ${unitLabel}`;
}
