/**
 * Runs tasks that share a key one after another, in arrival order, inside this process.
 * Tasks with different keys never wait for each other. A failing task releases the next one.
 * The map holds an entry only while a task is queued or running, so it cannot grow.
 */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();
  private readonly waiting = new Map<string, number>();

  /** How many tasks for this key are queued or running right now. */
  pending(key: string): number {
    return this.waiting.get(key) ?? 0;
  }

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const turn: { finish?: () => void } = {};
    const current = new Promise<void>((resolve) => {
      turn.finish = resolve;
    });
    const tail = previous.then(() => current);
    this.tails.set(key, tail);
    this.waiting.set(key, this.pending(key) + 1);
    try {
      await previous;
      return await task();
    } finally {
      turn.finish?.();
      const left = this.pending(key) - 1;
      if (left <= 0) this.waiting.delete(key);
      else this.waiting.set(key, left);
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}
