/**
 * Maps `items` with at most `limit` calls in flight, returning results in INPUT
 * order whatever order they finish in. Used where independent calls may overlap
 * but their results must still line up with their ids (a model's tool calls, the
 * pages of one search): `Promise.all` has no bound, a plain loop has no overlap.
 *
 * A rejected call rejects the whole map, like `Promise.all`; callers that need
 * per-item failure catch inside `fn`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const settled = new Map<number, R>();
  // One shared iterator: each worker pulls the next (index, item) pair, so at most
  // `limit` calls are in flight and every index is claimed exactly once.
  const pending = items.entries();
  const worker = async (): Promise<void> => {
    for (const [index, item] of pending) {
      settled.set(index, await fn(item, index));
    }
  };
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker);
  await Promise.all(workers);
  return Array.from({ length: items.length }, (_, index) => settled.get(index) as R);
}
