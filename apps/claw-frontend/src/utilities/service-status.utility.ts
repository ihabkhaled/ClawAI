import {
  STATUS_BASIS_POINTS_PER_UNIT,
  STATUS_FULL_COVERAGE_BASIS_POINTS,
} from '@/constants/service-status.constants';

/**
 * An uptime in integer basis points as a localized percentage with two
 * decimals (9,965 → "99.65%", "٩٩٫٦٥٪" …). Null when nothing was measured.
 * Basis points divide exactly into two decimals, so this never rounds.
 */
export function formatUptimePercent(basisPoints: number | null, locale: string): string | null {
  if (basisPoints === null) {
    return null;
  }
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(basisPoints / STATUS_BASIS_POINTS_PER_UNIT);
}

/** A coverage below this is worth saying out loud next to the uptime. */
export function isPartialCoverage(coverageBasisPoints: number): boolean {
  return coverageBasisPoints < STATUS_FULL_COVERAGE_BASIS_POINTS;
}

/** A coverage as a whole localized percentage ("7%"). */
export function formatCoveragePercent(coverageBasisPoints: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
    coverageBasisPoints / STATUS_BASIS_POINTS_PER_UNIT,
  );
}

/**
 * An incident length in the viewer's language: whole minutes under an hour,
 * then hours and minutes, then days and hours ("1 hr, 25 min").
 */
export function formatIncidentDuration(seconds: number, locale: string): string {
  const unit = (value: number, name: 'day' | 'hour' | 'minute'): string =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'short' }).format(
      value,
    );
  const list = (parts: string[]): string =>
    new Intl.ListFormat(locale, { style: 'narrow', type: 'unit' }).format(parts);

  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) {
    return unit(totalMinutes, 'minute');
  }
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    const minutes = totalMinutes % 60;
    return minutes === 0
      ? unit(totalHours, 'hour')
      : list([unit(totalHours, 'hour'), unit(minutes, 'minute')]);
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours === 0 ? unit(days, 'day') : list([unit(days, 'day'), unit(hours, 'hour')]);
}

/** A timestamp in the viewer's language and time zone. */
export function formatIncidentTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}
