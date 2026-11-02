/**
 * Runs `run` over `items` with at most `limit` at once and returns the results in the order of the
 * items. The first failure stops lanes from taking new items and is the one that is thrown.
 */
export async function mapWithLimit<Item, Result>(
  items: readonly Item[],
  limit: number,
  run: (item: Item, index: number) => Promise<Result>,
): Promise<Result[]> {
  const results = new Map<number, Result>();
  let next = 0;
  let stopped = false;
  const lane = async (): Promise<void> => {
    while (!stopped && next < items.length) {
      const index = next;
      next += 1;
      try {
        results.set(index, await run(items.at(index) as Item, index));
      } catch (error: unknown) {
        stopped = true;
        throw error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return items.map((_, index) => results.get(index) as Result);
}
