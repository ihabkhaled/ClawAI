import { Semaphore } from '../semaphore.utility';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('Semaphore', () => {
  it('never lets more than the permits run at once, and runs them all', async () => {
    const semaphore = new Semaphore(3);
    let inFlight = 0;
    let max = 0;
    const done: number[] = [];
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        semaphore.run(async () => {
          inFlight += 1;
          max = Math.max(max, inFlight);
          await sleep(5);
          inFlight -= 1;
          done.push(i);
        }),
      ),
    );
    expect(max).toBe(3);
    expect(done).toHaveLength(12);
  });

  it('releases the permit when a task throws', async () => {
    const semaphore = new Semaphore(1);
    await expect(semaphore.run(async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await expect(semaphore.run(async () => 'next')).resolves.toBe('next');
  });
});
