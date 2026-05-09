/**
 * Build stable, collision-free React keys for arrays whose elements may
 * legitimately repeat (e.g. digest highlights aggregated from multiple
 * sources). Returns one entry per input item: `{ key, item }`. Identical
 * values get an `__n` suffix on later occurrences so each key is unique
 * without falling back to the array index — keeps `react/no-array-index-key`
 * happy and keeps reconciliation stable as long as the input order is.
 */
export function withDedupedKeys<T>(
  items: T[],
  getValue: (item: T) => string,
): Array<{ key: string; item: T }> {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const value = getValue(item);
    const n = (seen.get(value) ?? 0) + 1;
    seen.set(value, n);
    return { key: n === 1 ? value : `${value}__${n}`, item };
  });
}
