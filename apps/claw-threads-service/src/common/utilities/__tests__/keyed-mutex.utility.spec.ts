import { KeyedMutex } from '../keyed-mutex.utility';

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

describe('KeyedMutex', () => {
  it('runs tasks of one key one after another, in arrival order', async () => {
    const mutex = new KeyedMutex();
    const log: string[] = [];
    const task = (name: string, wait: number) => async () => {
      log.push(`start ${name}`);
      await pause(wait);
      log.push(`end ${name}`);
      return name;
    };

    const results = await Promise.all([
      mutex.run('a', task('first', 20)),
      mutex.run('a', task('second', 1)),
      mutex.run('a', task('third', 1)),
    ]);

    expect(results).toEqual(['first', 'second', 'third']);
    expect(log).toEqual([
      'start first',
      'end first',
      'start second',
      'end second',
      'start third',
      'end third',
    ]);
  });

  it('lets different keys run at the same time', async () => {
    const mutex = new KeyedMutex();
    let running = 0;
    let mostAtOnce = 0;
    const task = async () => {
      running += 1;
      mostAtOnce = Math.max(mostAtOnce, running);
      await pause(15);
      running -= 1;
    };

    await Promise.all([mutex.run('a', task), mutex.run('b', task), mutex.run('c', task)]);

    expect(mostAtOnce).toBe(3);
  });

  it('runs the next task after one fails, and passes the failure on', async () => {
    const mutex = new KeyedMutex();

    const failing = mutex.run('a', async () => {
      await pause(5);
      throw new Error('boom');
    });
    const following = mutex.run('a', async () => 'still ran');

    await expect(failing).rejects.toThrow('boom');
    await expect(following).resolves.toBe('still ran');
  });

  it('counts the queued and running tasks of a key and forgets it when idle', async () => {
    const mutex = new KeyedMutex();
    expect(mutex.pending('a')).toBe(0);

    const first = mutex.run('a', () => pause(10));
    const second = mutex.run('a', () => pause(1));
    expect(mutex.pending('a')).toBe(2);
    expect(mutex.pending('b')).toBe(0);

    await Promise.all([first, second]);

    expect(mutex.pending('a')).toBe(0);
    const internals = mutex as unknown as {
      tails: Map<string, unknown>;
      waiting: Map<string, number>;
    };
    expect(internals.tails.size).toBe(0);
    expect(internals.waiting.size).toBe(0);
  });

  it('keeps 200 simultaneous tasks of one key strictly one at a time', async () => {
    const mutex = new KeyedMutex();
    let running = 0;
    let mostAtOnce = 0;

    await Promise.all(
      Array.from({ length: 200 }, () =>
        mutex.run('a', async () => {
          running += 1;
          mostAtOnce = Math.max(mostAtOnce, running);
          await Promise.resolve();
          running -= 1;
        }),
      ),
    );

    expect(mostAtOnce).toBe(1);
  });
});
