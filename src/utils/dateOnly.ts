const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatDateOnly(value?: string | Date | null) {
  if (!value) return '';

  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const match = String(value).match(DATE_ONLY_PATTERN);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : String(value).slice(0, 10);
}

export function getDateOnlyYear(value?: string | Date | null) {
  const dateOnly = formatDateOnly(value);
  const year = Number(dateOnly.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

export function getTodayDateOnly(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateOnly(value?: string | null) {
  const dateOnly = formatDateOnly(value);
  if (!DATE_ONLY_PATTERN.test(dateOnly)) return false;

  const [yearText, monthText, dayText] = dateOnly.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Explicit reporting bounds are calendar dates, never timestamps or inferred defaults. */
export function reportingPeriodError(start?: string, end?: string): string | null {
  if (start === undefined && end === undefined) return null;
  if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
      !isValidDateOnly(start) || !isValidDateOnly(end) || start > end) {
    return 'Enter a valid reporting start and end date, with start on or before end.';
  }
  return null;
}
