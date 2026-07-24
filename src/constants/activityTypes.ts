export type PilotActivityType =
  | 'ELECTRICITY'
  | 'NATURAL_GAS'
  | 'GASOLINE'
  | 'DIESEL'
  | 'AIR_TRAVEL'
  | 'HOTEL'
  | 'GROUND_TRANSPORT'
  | 'WATER'
  | 'SHIPPING';

export type PilotActivityTypeDefinition = {
  value: PilotActivityType;
  label: string;
  defaultScope?: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';
  reportTreatment: 'Included' | 'Tracked Only';
  provinceRequired: boolean;
  factorRequired: boolean;
  supportedUnits: string[];
};

export const pilotActivityTypeDefinitions: PilotActivityTypeDefinition[] = [
  {
    value: 'ELECTRICITY',
    label: 'Electricity',
    defaultScope: 'SCOPE_2',
    reportTreatment: 'Included',
    provinceRequired: true,
    factorRequired: true,
    supportedUnits: ['kWh'],
  },
  {
    value: 'NATURAL_GAS',
    label: 'Natural Gas',
    defaultScope: 'SCOPE_1',
    reportTreatment: 'Included',
    provinceRequired: false,
    factorRequired: true,
    supportedUnits: ['m3', 'GJ'],
  },
  {
    value: 'GASOLINE',
    label: 'Gasoline',
    defaultScope: 'SCOPE_1',
    reportTreatment: 'Included',
    provinceRequired: false,
    factorRequired: true,
    supportedUnits: ['liters', 'L'],
  },
  {
    value: 'DIESEL',
    label: 'Diesel',
    defaultScope: 'SCOPE_1',
    reportTreatment: 'Included',
    provinceRequired: false,
    factorRequired: true,
    supportedUnits: ['liters', 'L'],
  },
  {
    value: 'AIR_TRAVEL',
    label: 'Air Travel',
    defaultScope: 'SCOPE_3',
    reportTreatment: 'Included',
    provinceRequired: false,
    factorRequired: true,
    supportedUnits: ['km'],
  },
  {
    value: 'HOTEL',
    label: 'Hotel',
    defaultScope: 'SCOPE_3',
    reportTreatment: 'Included',
    provinceRequired: false,
    factorRequired: true,
    supportedUnits: ['nights'],
  },
  {
    value: 'GROUND_TRANSPORT',
    label: 'Ground Transport',
    defaultScope: 'SCOPE_3',
    reportTreatment: 'Included',
    provinceRequired: false,
    factorRequired: true,
    supportedUnits: ['km'],
  },
  {
    value: 'WATER',
    label: 'Water',
    reportTreatment: 'Tracked Only',
    provinceRequired: false,
    factorRequired: false,
    supportedUnits: ['m3'],
  },
  {
    value: 'SHIPPING',
    label: 'Shipping',
    defaultScope: 'SCOPE_3',
    reportTreatment: 'Included',
    provinceRequired: false,
    factorRequired: true,
    supportedUnits: ['ton-km'],
  },
];

export const activityTypes = pilotActivityTypeDefinitions.map((item) => item.value);

export const defaultActivityType = activityTypes[0];

export const activityTypeDefaultUnits: Record<string, string> =
  Object.fromEntries(
    pilotActivityTypeDefinitions.map((item) => [
      item.value,
      item.supportedUnits[0] ?? '',
    ]),
  );

export const pilotActivityTypeLabels: Record<string, string> =
  Object.fromEntries(
    pilotActivityTypeDefinitions.map((item) => [item.value, item.label]),
  );

export const supportedPilotActivityTypeSet = new Set<string>(activityTypes);

export function getPilotActivityTypeDefinition(value?: string | null) {
  return pilotActivityTypeDefinitions.find((item) => item.value === value);
}
