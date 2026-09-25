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

/** A finite number above zero: how a provider-published context window is accepted. */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * A whole number above zero: the only shape a provider-published output
 * ceiling is trusted in. Anything else (a string, 0, a fraction) leaves the
 * ceiling unknown rather than storing a guess.
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
