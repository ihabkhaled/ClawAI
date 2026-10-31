/**
 * Counting semaphore: at most `permits` tasks run at once, the rest wait in
 * arrival order. Used for the process-wide crawl worker cap (ADR-211), where
 * per-site pools alone would multiply (sites x workers).
 */
export class Semaphore {
  private available: number;
  private readonly waiters: Array<() => void> = [];

  constructor(permits: number) {
    this.available = Math.max(1, Math.floor(permits));
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next === undefined) {
      this.available += 1;
      return;
    }
    next();
  }
}
