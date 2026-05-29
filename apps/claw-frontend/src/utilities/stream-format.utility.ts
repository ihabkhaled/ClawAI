// Presentational formatters for live-stream metrics. Pure, no i18n (units are
// universal); the surrounding labels come from translation keys.

export function formatElapsed(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${String(minutes)}m ${String(remainder)}s`;
}

export function formatTokensPerSecond(tps: number | undefined): string | null {
  if (tps === undefined || !Number.isFinite(tps)) {
    return null;
  }
  return `${tps.toFixed(1)} tok/s`;
}

export function formatStreamTokens(count: number | undefined): string | null {
  if (count === undefined) {
    return null;
  }
  return count.toLocaleString();
}

// Returns a formatted cost string, or null when cost is genuinely unavailable
// so the UI can show "cost unavailable" instead of a misleading $0.
export function formatCostUsd(costUsd: number | undefined, available: boolean): string | null {
  if (!available || costUsd === undefined) {
    return null;
  }
  if (costUsd === 0) {
    return '$0.00';
  }
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(4)}`;
  }
  return `$${costUsd.toFixed(3)}`;
}
