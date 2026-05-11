/// Counts rows by a given key. Skips null/undefined keys.
export function countBy<T extends Record<string, unknown>>(
  rows: ReadonlyArray<T>,
  keyExtractor: (row: T) => string | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const key = keyExtractor(row);
    if (key === null || key === undefined || key === '') continue;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/// Mean of a numeric field, skipping null/undefined.
export function meanOf<T extends Record<string, unknown>>(
  rows: ReadonlyArray<T>,
  extractor: (row: T) => number | null | undefined,
): number {
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    const v = extractor(row);
    if (v === null || v === undefined || Number.isNaN(v)) continue;
    sum += v;
    count += 1;
  }
  return count === 0 ? 0 : Number((sum / count).toFixed(4));
}

/// Share of rows matching a predicate (0..1).
export function shareWhere<T>(rows: ReadonlyArray<T>, predicate: (row: T) => boolean): number {
  if (rows.length === 0) return 0;
  let matches = 0;
  for (const row of rows) if (predicate(row)) matches += 1;
  return Number((matches / rows.length).toFixed(4));
}
