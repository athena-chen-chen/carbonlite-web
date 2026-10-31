import { normalizeTerminologyToken } from './terminology';

type CustomerStatusContext = {
  activityType?: string | null;
  quantity?: string | number | null;
};

const HOTEL_REPAIR_GUIDANCE = 'Use room-night, or provide Rooms and Nights.';
const AIR_TRAVEL_REPAIR_GUIDANCE = 'Provide origin, destination, passengers, and trip type.';

export function formatCustomerStatusLabel(status?: string | null) {
  const normalized = normalizeTerminologyToken(status);
  const labels: Record<string, string> = {
    MATCHED: 'Factor matched',
    MATCHED_PRIOR_YEAR: 'Factor matched',
    CALCULATED: 'Calculated',
    INCLUDED: 'Included in totals',
    EXCLUDED: 'Not included in totals',
    MISSING_FACTOR: 'No applicable factor',
    NO_FACTOR_FOUND: 'No applicable factor',
    FACTOR_NOT_APPROVED: 'No approved factor',
    UNIT_MISMATCH: 'Unit needs correction',
    INVALID_UNIT: 'Unit needs correction',
    MISSING_PROVINCE: 'Province needed',
    MISSING_JURISDICTION: 'Province needed',
    REQUIRES_REVIEW: 'Needs review',
    NEEDS_REVIEW: 'Needs review',
    TRACKED_ONLY: 'Tracked metric',
    TRACKED_METRIC: 'Tracked metric',
    READY: 'Ready for calculation',
  };

  return labels[normalized] ?? '';
}

export function getCustomerStatusMessage(
  status: string | null | undefined,
  context: CustomerStatusContext = {},
) {
  const normalized = normalizeTerminologyToken(status);
  const activityType = normalizeTerminologyToken(context.activityType);
  const quantity = context.quantity;

  if (quantity !== undefined && quantity !== null) {
    const numericQuantity = Number(quantity);
    if (String(quantity).trim() === '' || !Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      return 'Enter a quantity greater than 0.';
    }
  }

  if (activityType === 'HOTEL' && ['UNIT_MISMATCH', 'INVALID_UNIT', 'MISSING_FACTOR', 'NO_FACTOR_FOUND'].includes(normalized)) {
    return HOTEL_REPAIR_GUIDANCE;
  }

  if (activityType === 'AIR_TRAVEL' && ['UNIT_MISMATCH', 'INVALID_UNIT', 'MISSING_FACTOR', 'NO_FACTOR_FOUND'].includes(normalized)) {
    return AIR_TRAVEL_REPAIR_GUIDANCE;
  }

  switch (normalized) {
    case 'MISSING_FACTOR':
    case 'NO_FACTOR_FOUND':
      return 'No applicable emission factor was found.';
    case 'FACTOR_NOT_APPROVED':
      return 'A matching factor exists but is not approved for this calculation.';
    case 'UNIT_MISMATCH':
      return 'The activity unit is not compatible with the available factor.';
    case 'INVALID_UNIT':
      return 'This unit is not supported for the selected activity.';
    case 'MISSING_PROVINCE':
    case 'MISSING_JURISDICTION':
      return activityType === 'ELECTRICITY'
        ? 'Select a province before this electricity record can be calculated.'
        : 'This record needs review.';
    case 'MATCHED':
    case 'MATCHED_PRIOR_YEAR':
      return 'Factor matched.';
    case 'CALCULATED':
      return 'Calculated.';
    case 'INCLUDED':
      return 'Included in totals.';
    case 'EXCLUDED':
      return getExcludedFromTotalsMessage();
    default:
      return 'This record needs review.';
  }
}

export function getExcludedFromTotalsMessage() {
  return 'This record is not included in totals until the issue is resolved.';
}

export function containsInternalStatusPresentation(value?: string | null) {
  const text = String(value ?? '');
  return /\b(?:MISSING_FACTOR|FACTOR_NOT_APPROVED|UNIT_MISMATCH|MISSING_PROVINCE|INVALID_UNIT|MATCHED|CALCULATED|INCLUDED)\b|excludedFromTotals\s*=\s*(?:true|false)/.test(text);
}

export const CUSTOMER_REPAIR_GUIDANCE = {
  hotel: HOTEL_REPAIR_GUIDANCE,
  airTravel: AIR_TRAVEL_REPAIR_GUIDANCE,
} as const;
