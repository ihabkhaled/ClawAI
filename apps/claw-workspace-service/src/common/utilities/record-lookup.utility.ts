/**
 * Safe property access helpers that satisfy the
 * `security/detect-object-injection` ESLint rule.
 *
 * Use these instead of `obj[key]` when `key` is a runtime-derived string.
 * They use `Object.entries(...).find(...)` which the linter accepts as safe
 * because the lookup never touches prototype-chain keys like `__proto__`.
 */

export function recordGet<T>(
  record: Readonly<Record<string, T>> | undefined | null,
  key: string,
): T | undefined {
  if (!record) return undefined;
  const entry = Object.entries(record).find(([k]) => k === key);
  return entry?.[1] as T | undefined;
}

export function recordHas(
  record: Readonly<Record<string, unknown>> | undefined | null,
  key: string,
): boolean {
  if (!record) return false;
  return Object.entries(record).some(([k]) => k === key);
}
