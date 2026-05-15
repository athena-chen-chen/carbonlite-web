export const activityTypes = [
  'DIESEL',
  'GASOLINE',
  'NATURAL_GAS',
  'ELECTRICITY',
  'WATER',
  'WASTE',
  'AIR_TRAVEL',
  'HOTEL',
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
  HOTEL: 'nights',
  SHIPPING: 'ton-km',
  CUSTOM: '',
};
