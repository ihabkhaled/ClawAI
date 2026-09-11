/**
 * Runs `worker` over every item with at most `limit` in flight at once.
 *
 * Not a queue library: a crawl fetching 20 pages one at a time would take
 * 20x as long as it needs to, and fetching all 20 at once is an unbounded
 * burst against one host. This is the minimum needed to bound concurrency
 * without a dependency — `limit` workers each pull the next unclaimed index
 * until none are left.
 */
export async function runWithConcurrencyLimit<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }
  let cursor = 0;
  const runNext = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) {
        await worker(item, index);
      }
    }
  };
  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, runNext));
}
