import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from '../utilities/bounded-parallel.utility';

describe('mapWithConcurrency', () => {
  it('returns results in input order whatever order the calls finish in', async () => {
    const delays = [30, 5, 20, 1];
    const result = await mapWithConcurrency(delays, 4, async (delay, index) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return `call-${String(index)}`;
    });
    expect(result).toEqual(['call-0', 'call-1', 'call-2', 'call-3']);
  });

  it('runs independent calls at the same time but never more than the limit', async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 10 }), 4, async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
    });
    expect(peak).toBe(4);
  });

  it('handles an empty list and a limit of zero', async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
    expect(await mapWithConcurrency([1, 2], 0, async (n) => n * 2)).toEqual([2, 4]);
  });
});
