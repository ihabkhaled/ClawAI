/**
 * True for a Prisma P2002 unique-constraint failure on the given column.
 *
 * Reads the error's shape rather than its class: the generated client exists
 * twice in a dev container, so `instanceof` against it is unreliable while
 * `code` and `meta.target` are stable. A P2002 whose target cannot be read is
 * NOT claimed — an unidentified constraint must not be reported to a user as
 * "that address is taken".
 */
export function isUniqueViolationOn(error: unknown, column: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { code?: unknown; meta?: { target?: unknown } };
  if (candidate.code !== 'P2002') {
    return false;
  }
  const target = candidate.meta?.target;
  return Array.isArray(target)
    ? target.some((entry) => typeof entry === 'string' && entry.includes(column))
    : typeof target === 'string' && target.includes(column);
}
