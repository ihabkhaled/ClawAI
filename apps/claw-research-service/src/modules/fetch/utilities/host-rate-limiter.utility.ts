import {
  FETCH_STRATEGY_MIN_HOST_INTERVAL_MS,
  HOST_RATE_LIMITER_PRUNE_THRESHOLD,
} from '../constants/fetch-strategy.constants';

/**
 * In-process politeness gate: at most one request per key per interval,
 * enforced by delaying the caller (a rate limiter, not a circuit breaker).
 * The key is a host for origin politeness, or a fixed name for a shared
 * third party such as the reader proxy.
 *
 * Per-replica memory, not Redis: research-service runs one replica, so a
 * shared store would add a round trip for no correctness gain. Concurrent
 * callers for the same key are serialized — the slot is reserved before the
 * wait, so two callers arriving together do not both pass.
 */
export class HostRateLimiter {
  private readonly nextSlotByKey = new Map<string, number>();

  constructor(private readonly minIntervalMs: number = FETCH_STRATEGY_MIN_HOST_INTERVAL_MS) {}

  /**
   * Waits until `key` may be used again. `intervalMs` overrides the default
   * gap for this key when it is longer (a robots.txt `Crawl-delay`).
   */
  async waitForTurn(
    key: string,
    intervalMs: number | null = null,
    now: () => number = Date.now,
  ): Promise<void> {
    const currentTime = now();
    this.pruneExpired(currentTime);
    const nextSlot = this.nextSlotByKey.get(key) ?? currentTime;
    const startAt = Math.max(currentTime, nextSlot);
    this.nextSlotByKey.set(key, startAt + Math.max(this.minIntervalMs, intervalMs ?? 0));
    const wait = startAt - currentTime;
    if (wait > 0) {
      await sleep(wait);
    }
  }

  /** Drops keys whose slot is already in the past, so the map stays bounded. */
  private pruneExpired(currentTime: number): void {
    if (this.nextSlotByKey.size < HOST_RATE_LIMITER_PRUNE_THRESHOLD) {
      return;
    }
    for (const [key, slot] of this.nextSlotByKey) {
      if (slot <= currentTime) {
        this.nextSlotByKey.delete(key);
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
