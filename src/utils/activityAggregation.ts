import { formatDisplayNumber } from './numberFormatting';
import { normalizeUnitForDisplay } from './unitNormalization';
import {
  getActivityTypeLabel,
  normalizeActivityType,
} from './activityType';

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

export type ActivityUsageBreakdownItem = FuelUsageBreakdownItem & {
  trackedOnly?: boolean;
};

export type ActivityUsageTotals = {
  fuel: number;
  electricity: number;
  fuelUnitLabel: string;
  electricityUnitLabel: string;
  fuelUsageBreakdown: FuelUsageBreakdownItem[];
  activityUsageBreakdown?: ActivityUsageBreakdownItem[];
  invalidFuelRecordCount?: number;
  invalidElectricityRecordCount?: number;
};

const FUEL_ACTIVITY_TYPES = new Set([
  'DIESEL',
  'GASOLINE',
  'NATURAL_GAS',
  'PROPANE',
  'FUEL',
]);

const ELECTRICITY_UNIT_TO_KWH: Record<string, number> = {
  kWh: 1,
  MWh: 1000,
};

const TRACKED_ONLY_ACTIVITY_TYPES = new Set(['WATER']);

function toQuantity(value?: string | number | null) {
  const quantity = Number(value ?? 0);
  return Number.isFinite(quantity) ? quantity : 0;
}

export function formatActivityTypeLabel(activityType: string) {
  return getActivityTypeLabel(activityType);
}

export function aggregateActivityUsage(
  records: ActivityUsageRecord[],
): ActivityUsageTotals {
  const totals = records.reduce<ActivityUsageTotals>(
    (totals, record) => {
      const activityType = normalizeActivityType(record.activityType) ?? '';
      const quantity = toQuantity(record.quantity);
      const normalizedUnit = normalizeUnitForDisplay(record.unit);
      const hasValidUnit = normalizedUnit.status === 'valid';

      if (FUEL_ACTIVITY_TYPES.has(activityType)) {
        if (!hasValidUnit) {
          totals.invalidFuelRecordCount += 1;
          return totals;
        }

        const unit = normalizedUnit.value;
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
        if (!hasValidUnit) {
          totals.invalidElectricityRecordCount += 1;
          return totals;
        }

        const conversionFactor = ELECTRICITY_UNIT_TO_KWH[normalizedUnit.value];
        if (!conversionFactor) {
          totals.invalidElectricityRecordCount += 1;
          return totals;
        }

        totals.electricity += quantity * conversionFactor;
        addActivityUsageBreakdownItem(totals, {
          activityType,
          total: quantity * conversionFactor,
          unit: 'kWh',
        });
        return totals;
      }

      if (hasValidUnit && activityType) {
        const trackedOnly = TRACKED_ONLY_ACTIVITY_TYPES.has(activityType);
        addActivityUsageBreakdownItem(totals, {
          activityType,
          total: quantity,
          unit: normalizedUnit.value,
          ...(trackedOnly ? { trackedOnly } : {}),
        });
      }

      return totals;
    },
    {
      fuel: 0,
      electricity: 0,
      fuelUnitLabel: 'Grouped by type and unit',
      electricityUnitLabel: 'kWh',
      fuelUsageBreakdown: [],
      activityUsageBreakdown: [],
      invalidFuelRecordCount: 0,
      invalidElectricityRecordCount: 0,
    },
  );

  totals.fuelUsageBreakdown.sort((a, b) =>
    `${a.activityType}:${a.unit}`.localeCompare(`${b.activityType}:${b.unit}`),
  );
  totals.activityUsageBreakdown?.sort(sortActivityBreakdownItems);

  return totals;
}

function addActivityUsageBreakdownItem(
  totals: ActivityUsageTotals,
  item: ActivityUsageBreakdownItem,
) {
  const breakdown = totals.activityUsageBreakdown ?? [];
  totals.activityUsageBreakdown = breakdown;
  const existing = breakdown.find(
    (row) =>
      row.activityType === item.activityType &&
      row.unit === item.unit &&
      Boolean(row.trackedOnly) === Boolean(item.trackedOnly),
  );

  if (existing) {
    existing.total += item.total;
    return;
  }

  breakdown.push({ ...item });
}

function sortActivityBreakdownItems(
  a: ActivityUsageBreakdownItem,
  b: ActivityUsageBreakdownItem,
) {
  const order = [
    'ELECTRICITY',
    'NATURAL_GAS',
    'GASOLINE',
    'DIESEL',
    'AIR_TRAVEL',
    'HOTEL',
    'GROUND_TRANSPORT',
    'SHIPPING',
    'WATER',
  ];
  const orderA = order.indexOf(a.activityType);
  const orderB = order.indexOf(b.activityType);
  const rankA = orderA >= 0 ? orderA : order.length;
  const rankB = orderB >= 0 ? orderB : order.length;

  return rankA - rankB || `${a.activityType}:${a.unit}`.localeCompare(`${b.activityType}:${b.unit}`);
}

export function formatActivityUsageValue(total: number, unitLabel: string) {
  return `${formatDisplayNumber(total)} ${unitLabel}`;
}

export function formatFuelUsageBreakdown(
  breakdown: FuelUsageBreakdownItem[] = [],
) {
  if (!breakdown.length) return '0';

  const lines = breakdown
    .map(
      (item) =>
        `${formatActivityTypeLabel(item.activityType)}: ${formatDisplayNumber(item.total)} ${item.unit}`,
    )
    .join('\n');

  return lines;
}

export function formatInvalidActivityRecordNote(count = 0) {
  if (count <= 0) return '';

  return `${count} ${count === 1 ? 'record needs' : 'records need'} review`;
}
