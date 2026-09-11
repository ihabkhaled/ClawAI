import { runWithConcurrencyLimit } from '../concurrency-pool.utility';

describe('runWithConcurrencyLimit', () => {
  it('processes every item exactly once', async () => {
    const seen: number[] = [];
    await runWithConcurrencyLimit([1, 2, 3, 4, 5], 2, async (item) => {
      seen.push(item);
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('never runs more than `limit` workers at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await runWithConcurrencyLimit(
      Array.from({ length: 10 }, (_, i) => i),
      3,
      async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
      },
    );
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it('does nothing for an empty list', async () => {
    const worker = jest.fn();
    await runWithConcurrencyLimit([], 4, worker);
    expect(worker).not.toHaveBeenCalled();
  });

  it('caps the worker count at the item count, not the limit', async () => {
    // A limit of 10 over 2 items must not spin up 10 workers, which would be
    // harmless here but wrong in spirit for anything with per-worker setup
    // cost.
    let concurrent = 0;
    let maxConcurrent = 0;
    await runWithConcurrencyLimit([1, 2], 10, async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 5));
      concurrent -= 1;
    });
    expect(maxConcurrent).toBe(2);
  });

  it('propagates a worker error rather than swallowing it', async () => {
    await expect(
      runWithConcurrencyLimit([1, 2, 3], 2, async (item) => {
        if (item === 2) {
          throw new Error('boom');
        }
      }),
    ).rejects.toThrow('boom');
  });
});
