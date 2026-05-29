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
