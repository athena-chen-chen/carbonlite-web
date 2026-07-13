export const activityTypes = [
  'ELECTRICITY',
  'NATURAL_GAS',
  'GASOLINE',
  'DIESEL',
  'AIR_TRAVEL',
  'HOTEL',
  'GROUND_TRANSPORT',
  'WATER',
  'BUSINESS_TRAVEL',
  'WASTE',
  'SHIPPING',
  'CUSTOM',
];

export const defaultActivityType = activityTypes[0];

export const activityTypeDefaultUnits: Record<string, string> = {
  DIESEL: 'liters',
  GASOLINE: 'liters',
  NATURAL_GAS: 'm3',
  ELECTRICITY: 'kWh',
  WATER: 'm3',
  WASTE: 'kg',
  AIR_TRAVEL: 'km',
  BUSINESS_TRAVEL: 'km',
  HOTEL: 'nights',
  GROUND_TRANSPORT: 'km',
  SHIPPING: 'ton-km',
  CUSTOM: '',
};
