export function formatDisplayNumber(value?: string | number | null) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value === null || value === undefined || value === '' ? '-' : String(value);
  }

  const rounded = Number(numericValue.toFixed(2));
  const hasDecimals = !Number.isInteger(rounded);

  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function formatEmissionsValue(value?: string | number | null) {
  return formatDisplayNumber(value);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export function formatCount(count: number, singular: string, plural?: string) {
  return `${count} ${pluralize(count, singular, plural)}`;
}

export function formatEmissionsUnit(unit?: string | null, options?: { ascii?: boolean }) {
  const value = String(unit ?? '').trim();
  const co2e = options?.ascii ? 'CO2e' : 'CO₂e';

  if (!value) return `kg ${co2e}`;

  return value
    .replace(/^(kg|t|g)\s*CO[₂2]e/i, (_match, prefix: string) => `${prefix} ${co2e}`)
    .replace(/\s*\/\s*/g, '/');
}

export function formatEmissionsWithUnit(value?: string | number | null, unit = 'kgCO2e') {
  return `${formatEmissionsValue(value)} ${formatEmissionsUnit(unit)}`;
}

export function formatPdfText(value?: string | number | null) {
  return String(value ?? '').replace(/\u2082/g, '2');
}

export function formatPdfEmissionsUnit(unit?: string | null) {
  return formatEmissionsUnit(unit, { ascii: true });
}

export function formatPdfEmissionsWithUnit(value?: string | number | null, unit = 'kgCO2e') {
  return `${formatEmissionsValue(value)} ${formatPdfEmissionsUnit(unit)}`;
}
