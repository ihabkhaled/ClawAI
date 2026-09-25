/**
 * The output ceiling a model actually accepts: the smaller of what its
 * catalog publishes and what a provider refusal taught us (ADR-125).
 * `undefined` = unknown (never "unlimited").
 */
export function effectiveMaxOutputTokens(
  catalog: number | null | undefined,
  learned: number | null | undefined,
): number | undefined {
  const known = [catalog, learned].filter(
    (value): value is number => typeof value === 'number' && value > 0,
  );
  return known.length === 0 ? undefined : Math.min(...known);
}
