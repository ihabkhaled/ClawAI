/**
 * Narrows an `unknown` value to a plain string-keyed record. Returns
 * `undefined` for null, primitives, and arrays so callers can short-circuit
 * before reading nested fields off a malformed response.
 */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

/**
 * Coerces an arbitrary `unknown` field into a finite, non-negative integer
 * token count, or `undefined` when the value is absent / not a finite number.
 * Defensive against strings ("123"), nulls, NaN, Infinity, and negatives.
 */
export function toTokenCount(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const coerced = Number(value);
  if (!Number.isFinite(coerced) || coerced < 0) {
    return undefined;
  }
  return Math.floor(coerced);
}

/**
 * Reads a numeric token field by key from a (possibly undefined) record,
 * coercing it through {@link toTokenCount}.
 */
export function readCount(
  record: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  if (record === undefined) {
    return undefined;
  }
  return toTokenCount(record[key]);
}

/**
 * Reads a numeric token field nested one level down, e.g.
 * `usage.prompt_tokens_details.cached_tokens`. Returns `undefined` when either
 * level is absent or malformed, so a provider that omits the detail block is
 * indistinguishable from one that never had it — which is the correct outcome:
 * both mean "no measured sub-count".
 */
export function readNestedCount(
  record: Record<string, unknown> | undefined,
  outerKey: string,
  innerKey: string,
): number | undefined {
  return readCount(asRecord(record?.[outerKey]), innerKey);
}

/**
 * Sums the defined values of a set of optional counts, returning `undefined`
 * when every one of them is absent.
 *
 * `undefined` and `0` are NOT interchangeable here: `undefined` means the
 * provider reported nothing and the normalizer should fall back to estimating
 * from text, while `0` is a measured zero that must suppress the estimate.
 */
export function sumDefinedCounts(...values: Array<number | undefined>): number | undefined {
  const present = values.filter((value): value is number => value !== undefined);
  if (present.length === 0) {
    return undefined;
  }
  return present.reduce((total, value) => total + value, 0);
}
