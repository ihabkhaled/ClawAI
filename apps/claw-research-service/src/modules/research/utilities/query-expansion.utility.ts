/** Whitespace collapsed and trimmed; the dedupe key is this, lower-cased. */
export function collapseQuery(query: string): string {
  return query.trim().replaceAll(/\s+/gu, ' ');
}

/** Case-insensitive identity of a query. */
export function normaliseQueryKey(query: string): string {
  return collapseQuery(query).toLowerCase();
}

/**
 * The expansion queries a run will actually send (research engine B2): the
 * caller's extra queries, minus any that repeat the primary or each other
 * (case- and whitespace-insensitive), in the caller's order, at most `cap`.
 */
export function planExpansionQueries(
  primary: string,
  extras: readonly string[],
  cap: number,
): string[] {
  if (cap <= 0) {
    return [];
  }
  const seen = new Set([normaliseQueryKey(primary)]);
  const planned: string[] = [];
  for (const raw of extras) {
    const query = collapseQuery(raw);
    const key = query.toLowerCase();
    if (query.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    planned.push(query);
    if (planned.length >= cap) {
      break;
    }
  }
  return planned;
}
