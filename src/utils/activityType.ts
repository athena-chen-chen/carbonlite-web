const ACTIVITY_TYPE_ALIASES: Record<string, string> = {
  DIESEL: 'DIESEL',
  GASOLINE: 'GASOLINE',
  GAS: 'GASOLINE',
  PETROL: 'GASOLINE',
  NATURAL_GAS: 'NATURAL_GAS',
  ELECTRICITY: 'ELECTRICITY',
  ELECTRIC: 'ELECTRICITY',
  POWER: 'ELECTRICITY',
  WATER: 'WATER',
  WATER_USAGE: 'WATER',
  HOTEL: 'HOTEL',
  HOTELS: 'HOTEL',
  HOTEL_STAY: 'HOTEL',
  ACCOMMODATION: 'HOTEL',
  LODGING: 'HOTEL',
  AIR_TRAVEL: 'AIR_TRAVEL',
  BUSINESS_TRAVEL_FLIGHT: 'AIR_TRAVEL',
  FLIGHT: 'AIR_TRAVEL',
  FLIGHTS: 'AIR_TRAVEL',
  AIRFARE: 'AIR_TRAVEL',
  GROUND_TRANSPORT: 'GROUND_TRANSPORT',
  GROUND_TRANSPORT_TAXI_RIDESHARE: 'GROUND_TRANSPORT',
  TAXI: 'GROUND_TRANSPORT',
  RIDESHARE: 'GROUND_TRANSPORT',
  RIDE_SHARE: 'GROUND_TRANSPORT',
  SHIPPING: 'SHIPPING',
  FREIGHT: 'SHIPPING',
  DELIVERY: 'SHIPPING',
  TRANSPORT: 'SHIPPING',
  WASTE: 'WASTE',
  GARBAGE: 'WASTE',
  LANDFILL: 'WASTE',
  PROPANE: 'PROPANE',
  STEAM: 'STEAM',
  PURCHASED_HEAT: 'PURCHASED_HEAT',
  DISTRICT_HEAT: 'PURCHASED_HEAT',
  PURCHASED_COOLING: 'PURCHASED_COOLING',
  DISTRICT_COOLING: 'PURCHASED_COOLING',
  BUSINESS_TRAVEL: 'BUSINESS_TRAVEL',
  CUSTOM: 'CUSTOM',
};

export function normalizeActivityType(value?: string | null): string | null {
  const normalized = normalizeActivityTypeKey(value);
  if (!normalized) return null;

  return (
    ACTIVITY_TYPE_ALIASES[normalized] ??
    normalizeActivityTypeBySubstring(normalized) ??
    stripActivityTypeSuffix(normalized)
  );
}

export function getActivityTypeLabel(activityType?: string | null): string {
  const normalized = normalizeActivityType(activityType);
  if (!normalized) return 'Not specified';

  return normalized
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeActivityTypeKey(value?: string | null) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[-/]+/g, ' ')
    .replace(/\s+/g, '_');
}

function stripActivityTypeSuffix(value: string) {
  return value
    .replace(/_EMISSION_FACTOR$/, '')
    .replace(/_COMBUSTION$/, '')
    .replace(/_USAGE$/, '');
}

function normalizeActivityTypeBySubstring(value: string) {
  if (value.includes('NATURAL_GAS')) return 'NATURAL_GAS';
  if (value.includes('DIESEL')) return 'DIESEL';
  if (value.includes('GASOLINE')) return 'GASOLINE';
  if (value.includes('ELECTRICITY')) return 'ELECTRICITY';
  if (value.includes('WATER')) return 'WATER';
  if (value.includes('WASTE')) return 'WASTE';
  if (value.includes('AIR_TRAVEL')) return 'AIR_TRAVEL';
  if (value.includes('FLIGHT')) return 'AIR_TRAVEL';
  if (
    value.includes('GROUND_TRANSPORT') ||
    value.includes('TAXI') ||
    value.includes('RIDESHARE') ||
    value.includes('RIDE_SHARE')
  ) {
    return 'GROUND_TRANSPORT';
  }
  if (value.includes('BUSINESS_TRAVEL')) return 'BUSINESS_TRAVEL';
  if (value.includes('SHIPPING') || value.includes('FREIGHT')) return 'SHIPPING';
  if (value.includes('PROPANE')) return 'PROPANE';
  if (value.includes('STEAM')) return 'STEAM';
  if (value.includes('PURCHASED_HEAT') || value.includes('DISTRICT_HEAT')) return 'PURCHASED_HEAT';
  if (value.includes('PURCHASED_COOLING') || value.includes('DISTRICT_COOLING')) {
    return 'PURCHASED_COOLING';
  }
  if (
    value.includes('HOTEL') ||
    value.includes('ACCOMMODATION') ||
    value.includes('LODGING')
  ) {
    return 'HOTEL';
  }

  return null;
}
