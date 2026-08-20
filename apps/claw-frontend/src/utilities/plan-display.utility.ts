// Formats a token count with locale grouping (e.g. 100000 → "100,000").
export function formatTokenCount(value: number): string {
  return value.toLocaleString();
}

// Renders a nullable numeric limit: null → caller-supplied "unlimited" label,
// otherwise the locale-grouped number.
export function formatNullableLimit(
  value: number | null | undefined,
  unlimitedLabel: string,
): string {
  return value === null || value === undefined ? unlimitedLabel : value.toLocaleString();
}

// Clamped 0–100 usage percentage for the quota meter. Unlimited plans report 0
// (the meter is hidden by the caller in that case).
export function computeUsagePercent(used: number, dailyLimit: number): number {
  if (dailyLimit <= 0) {
    return 0;
  }
  const pct = Math.round((used / dailyLimit) * 100);
  return Math.min(100, Math.max(0, pct));
}
