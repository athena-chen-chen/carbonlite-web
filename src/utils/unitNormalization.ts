export type NormalizedUnitResult =
  | {
      status: 'valid';
      value: string;
    }
  | {
      status: 'missing';
      value: 'Missing unit';
    }
  | {
      status: 'invalid';
      value: 'Invalid unit';
    };

const UNIT_ALIASES: Record<string, string> = {
  l: 'liters',
  liter: 'liters',
  liters: 'liters',
  litre: 'liters',
  litres: 'liters',
  ltr: 'liters',
  m3: 'm3',
  cubicmeter: 'm3',
  cubicmeters: 'm3',
  cubicmetre: 'm3',
  cubicmetres: 'm3',
  kwh: 'kWh',
  kwhr: 'kWh',
  kilowatthour: 'kWh',
  kilowatthours: 'kWh',
  tonne: 'tonnes',
  tonnes: 'tonnes',
  metricton: 'tonnes',
  metrictons: 'tonnes',
  night: 'nights',
  nights: 'nights',
  tonkm: 'ton-km',
  tonnekm: 'ton-km',
  tkm: 'ton-km',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  km: 'km',
  kilometer: 'km',
  kilometers: 'km',
  kilometre: 'km',
  kilometres: 'km',
};

export function normalizeUnitForDisplay(value?: string | number | null): NormalizedUnitResult {
  const raw = String(value ?? '').trim();

  if (!raw || ['null', 'undefined', 'nan'].includes(raw.toLowerCase())) {
    return { status: 'missing', value: 'Missing unit' };
  }

  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return { status: 'invalid', value: 'Invalid unit' };
  }

  const compact = raw
    .toLowerCase()
    .replace(/³/g, '3')
    .replace(/[\s._/-]+/g, '');

  return {
    status: 'valid',
    value: UNIT_ALIASES[compact] ?? raw,
  };
}

export function normalizeUnitKey(value?: string | number | null) {
  const normalized = normalizeUnitForDisplay(value);

  if (normalized.status !== 'valid') return '';

  return normalized.value.toLowerCase();
}

export function isInvalidUnit(value?: string | number | null) {
  return normalizeUnitForDisplay(value).status === 'invalid';
}

export function isMissingUnit(value?: string | number | null) {
  return normalizeUnitForDisplay(value).status === 'missing';
}
