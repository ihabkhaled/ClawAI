// SSR-safe relative-time formatter using `Intl.RelativeTimeFormat`.
// Returns strings like "5 minutes ago", "in 2 hours", "3 days ago".
// Falls back to the locale-default short date on environments without
// `Intl.RelativeTimeFormat` (very old browsers).

type RelativeUnit = 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year';

const UNITS: ReadonlyArray<{ unit: RelativeUnit; ms: number }> = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
  { unit: 'second', ms: 1000 },
];

export function formatTimeAgo(dateString: string, locale?: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const diffMs = date.getTime() - Date.now();

  if (typeof Intl === 'undefined' || typeof Intl.RelativeTimeFormat !== 'function') {
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  }

  const rtf = new Intl.RelativeTimeFormat(locale ?? 'en', { numeric: 'auto' });

  for (const { unit, ms } of UNITS) {
    const value = diffMs / ms;
    if (Math.abs(value) >= 1) {
      return rtf.format(Math.round(value), unit);
    }
  }
  return rtf.format(0, 'second');
}
