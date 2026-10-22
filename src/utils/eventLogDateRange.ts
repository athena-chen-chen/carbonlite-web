export const EVENT_LOG_TIME_ZONE = 'America/Edmonton';
export const EVENT_LOG_PERIODS = [
  { value: 'LAST_HOUR', label: 'Last hour' },
  { value: 'TODAY', label: 'Today' },
  { value: 'LAST_24_HOURS', label: 'Last 24 hours' },
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'CUSTOM', label: 'Custom' },
] as const;
export type EventLogPeriod = typeof EVENT_LOG_PERIODS[number]['value'];
export type EventLogDateRange = { start: string; end: string };

const mountainFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_LOG_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

export function formatEventLogDateTime(instant: string | Date): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  const parts = Object.fromEntries(mountainFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${String(date.getUTCMilliseconds()).padStart(3, '0')}`;
}

// datetime-local values are Mountain wall times, never browser-local dates.
// Reject nonexistent spring-forward times; use the first occurrence of ambiguous
// fall-back times, unless preserving an exact instant from the selected preset.
export function parseEventLogDateTime(value: string, preferredInstant?: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value)) return null;
  const wall = new Date(`${value}Z`);
  if (!Number.isFinite(wall.getTime())) return null;
  const canonical = wall.toISOString().slice(0, -1);
  if (!canonical.startsWith(value)) return null;
  if (preferredInstant && formatEventLogDateTime(preferredInstant) === canonical) return preferredInstant;

  const offsets = new Set<number>();
  // Sampling both sides of the date covers DST offset changes without assuming
  // either UTC-6 or UTC-7, including midnight on a transition day.
  for (const hours of [-24, 0, 24]) {
    const sample = new Date(wall.getTime() + hours * 3_600_000);
    offsets.add(new Date(`${formatEventLogDateTime(sample)}Z`).getTime() - sample.getTime());
  }
  const candidates = [...offsets].map((offset) => new Date(wall.getTime() - offset).toISOString())
    .filter((candidate) => formatEventLogDateTime(candidate) === canonical).sort();
  return candidates[0] ?? null;
}

export function getEventLogDateRange(period: Exclude<EventLogPeriod, 'CUSTOM'>, now: Date): EventLogDateRange {
  const end = now.toISOString();
  if (period === 'TODAY') {
    const midnight = `${formatEventLogDateTime(now).slice(0, 10)}T00:00:00.000`;
    const start = parseEventLogDateTime(midnight);
    if (!start) throw new Error('Unable to resolve Mountain Time midnight.');
    return { start, end };
  }
  const hours = { LAST_HOUR: 1, LAST_24_HOURS: 24, LAST_7_DAYS: 7 * 24, LAST_30_DAYS: 30 * 24 }[period];
  return { start: new Date(now.getTime() - hours * 3_600_000).toISOString(), end };
}

export function validateEventLogCustomRange(startValue: string, endValue: string, preferred?: EventLogDateRange) {
  if (!startValue || !endValue) return { error: 'Enter both start and end date/time.', range: null };
  const start = parseEventLogDateTime(startValue, preferred?.start);
  const end = parseEventLogDateTime(endValue, preferred?.end);
  if (!start || !end) return { error: 'Enter valid Mountain Time dates. Times skipped during daylight saving are not valid.', range: null };
  if (end <= start) return { error: 'End date/time must be later than start date/time.', range: null };
  return { error: null, range: { start, end } };
}
