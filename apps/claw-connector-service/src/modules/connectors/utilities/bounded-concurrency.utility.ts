/**
 * Maps `items` through `task` with at most `limit` tasks in flight, keeping
 * input order in the result. `task` must not throw — callers turn failures
 * into values so one bad item cannot reject the batch.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  // One iterator shared by every worker: each `next()` hands out the next
  // unclaimed item, so no two workers ever take the same one.
  const pending = items.entries();
  const settled = new Map<number, R>();
  const worker = async (): Promise<void> => {
    for (const [index, item] of pending) {
      settled.set(index, await task(item));
    }
  };
  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));
  return items.map((_, index) => settled.get(index) as R);
}
