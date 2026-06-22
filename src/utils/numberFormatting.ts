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
