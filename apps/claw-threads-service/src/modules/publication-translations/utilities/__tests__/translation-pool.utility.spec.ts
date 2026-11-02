import { mapWithLimit } from '../translation-pool.utility';

describe('mapWithLimit', () => {
  it('keeps the order of the items whatever order the work finishes in', async () => {
    const result = await mapWithLimit([30, 5, 15], 2, async (delay, index) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return `${String(index)}:${String(delay)}`;
    });

    expect(result).toEqual(['0:30', '1:5', '2:15']);
  });

  it('never runs more than the limit at once', async () => {
    let running = 0;
    let peak = 0;

    await mapWithLimit([1, 2, 3, 4, 5, 6], 2, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
    });

    expect(peak).toBe(2);
  });

  it('stops taking new items after a failure and throws that failure', async () => {
    const seen: number[] = [];

    await expect(
      mapWithLimit([1, 2, 3, 4, 5, 6], 1, async (item) => {
        seen.push(item);
        if (item === 2) throw new Error('boom');
        return item;
      }),
    ).rejects.toThrow('boom');
    expect(seen).toEqual([1, 2]);
  });

  it('answers an empty list without starting any work', async () => {
    await expect(mapWithLimit([], 3, () => Promise.resolve(1))).resolves.toEqual([]);
  });
});
