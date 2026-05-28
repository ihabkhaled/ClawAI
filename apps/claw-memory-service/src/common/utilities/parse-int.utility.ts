// Defensive integer parser for untrusted query params (page/limit). A raw
// `Number.parseInt('abc')` yields NaN which, when fed into Prisma `skip`/`take`,
// throws a validation error that surfaces to the client as a 500. This util
// guarantees a positive integer or the provided fallback.
export function parsePositiveInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}
