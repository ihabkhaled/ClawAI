import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './constants/redis.constants';
import { REDIS_RELEASE_LOCK_SCRIPT } from './constants/redis-lock.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await (ttlSeconds
      ? this.client.set(key, value, 'EX', ttlSeconds)
      : this.client.set(key, value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Claim a key for `ttlSeconds`, or report how long the existing claim has
   * left. Returns `null` when the claim was taken, and the remaining seconds
   * when someone already holds it.
   *
   * `SET … NX` makes the claim atomic — a GET-then-SET would let two requests
   * arriving together both believe the key was free, which for a resend
   * cooldown means two emails. The TTL read is deliberately a SECOND round trip
   * rather than part of the claim: it only runs on the losing branch, where the
   * exact remaining time is the whole answer.
   */
  async claimCooldown(key: string, ttlSeconds: number): Promise<number | null> {
    const claimed = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    if (claimed === 'OK') {
      return null;
    }
    const remaining = await this.client.ttl(key);
    // -1 (no expiry) and -2 (vanished between the two calls) both mean we
    // cannot state a real remaining time; report the full window rather than a
    // negative number the UI would render as a broken countdown.
    return remaining > 0 ? remaining : ttlSeconds;
  }

  /**
   * Single-flight lock for scheduled work, matching payment-service's semantics
   * exactly (`SET key token EX ttl NX`).
   *
   * `NX` is what makes acquisition atomic — a GET-then-SET would let two
   * replicas both observe a free lock. The TTL is the deadlock escape hatch: a
   * container killed mid-job must not wedge the schedule until someone notices.
   *
   * The caller supplies a per-run `ownerToken` (a random UUID) so
   * {@link releaseLock} can refuse to free a lock that has since been taken over.
   */
  async acquireLock(key: string, ownerToken: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, ownerToken, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /** Releases only if this caller still owns the lock. See the Lua script. */
  async releaseLock(key: string, ownerToken: string): Promise<boolean> {
    const result = await this.client.eval(REDIS_RELEASE_LOCK_SCRIPT, 1, key, ownerToken);
    return result === 1;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
