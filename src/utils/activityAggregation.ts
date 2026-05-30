export type ActivityUsageRecord = {
  activityType?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
};

export type FuelUsageBreakdownItem = {
  activityType: string;
  total: number;
  unit: string;
};

export type ActivityUsageTotals = {
  fuel: number;
  electricity: number;
  fuelUnitLabel: string;
  electricityUnitLabel: string;
  fuelUsageBreakdown: FuelUsageBreakdownItem[];
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

function normalizeUnit(unit?: string | null) {
  return String(unit ?? '').trim() || '-';
}

export function formatActivityTypeLabel(activityType: string) {
  return activityType
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function aggregateActivityUsage(
  records: ActivityUsageRecord[],
): ActivityUsageTotals {
  const totals = records.reduce<ActivityUsageTotals>(
    (totals, record) => {
      const activityType = normalizeActivityType(record.activityType);
      const quantity = toQuantity(record.quantity);
      const unit = normalizeUnit(record.unit);

      if (FUEL_ACTIVITY_TYPES.has(activityType)) {
        totals.fuel += quantity;
        const existing = totals.fuelUsageBreakdown.find(
          (item) => item.activityType === activityType && item.unit === unit,
        );

        if (existing) {
          existing.total += quantity;
        } else {
          totals.fuelUsageBreakdown.push({
            activityType,
            total: quantity,
            unit,
          });
        }
      }

      if (activityType === 'ELECTRICITY') {
        totals.electricity += quantity;
      }

      return totals;
    },
    {
      fuel: 0,
      electricity: 0,
      fuelUnitLabel: 'Grouped by type and unit',
      electricityUnitLabel: 'kWh',
      fuelUsageBreakdown: [],
    },
  );

  totals.fuelUsageBreakdown.sort((a, b) =>
    `${a.activityType}:${a.unit}`.localeCompare(`${b.activityType}:${b.unit}`),
  );

  return totals;
}

export function formatActivityUsageValue(total: number, unitLabel: string) {
  return `${total} ${unitLabel}`;
}

export function formatFuelUsageBreakdown(
  breakdown: FuelUsageBreakdownItem[] = [],
) {
  if (!breakdown.length) return '0';

  return breakdown
    .map(
      (item) =>
        `${item.total} ${item.unit} ${formatActivityTypeLabel(item.activityType)}`,
    )
    .join('\n');
}
