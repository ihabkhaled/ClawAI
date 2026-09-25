import { vi } from 'vitest';

import { PROVIDER_BREAKER_OPEN_MS } from '../../constants/provider-credit.constants';
import { ProviderBreakerAdmission } from '../../enums/provider-breaker-admission.enum';
import { ProviderBreakerReason } from '../../enums/provider-breaker-reason.enum';
import { ProviderBreakerSource } from '../../enums/provider-breaker-source.enum';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { type RedisClientPort } from '../../../../infrastructure/redis/types/redis-client.types';
import { ProviderBreakerStore } from '../../repositories/provider-breaker.store';
import {
  type StoredProviderBreakerEntry,
  type StoredProviderBreakerState,
} from '../../types/provider-circuit-breaker.types';
import { ProviderCircuitBreakerManager } from '../provider-circuit-breaker.manager';

const redisClient = (): RedisClientPort => ({
  ping: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  eval: vi.fn(),
  evalRuntimeV2: vi.fn(),
  disconnect: vi.fn(),
  quit: vi.fn(),
  lrange: vi.fn(),
});

/**
 * The Redis store with the Lua scripts' semantics in memory: one state map
 * and one probe map shared by every "replica" that holds this instance.
 * (The scripts themselves are covered by provider-breaker.store.spec.ts.)
 */
class SharedRedisFake extends ProviderBreakerStore {
  down = false;
  readonly states = new Map<string, StoredProviderBreakerState>();
  readonly probes = new Map<string, number>();
  readonly closed: string[] = [];
  readonly tripped: string[] = [];

  constructor() {
    super(new RedisService(redisClient()));
  }

  override async admit(provider: string, now: number): Promise<ProviderBreakerAdmission> {
    this.failWhenDown();
    const state = this.states.get(provider);
    if (state === undefined) return ProviderBreakerAdmission.CLOSED;
    if (now < state.openUntil) return ProviderBreakerAdmission.OPEN;
    const probeAt = this.probes.get(provider);
    if (probeAt !== undefined && now < probeAt + PROVIDER_BREAKER_OPEN_MS) {
      return ProviderBreakerAdmission.OPEN;
    }
    this.probes.set(provider, now);
    return ProviderBreakerAdmission.PROBE;
  }

  override async trip(provider: string, state: StoredProviderBreakerState): Promise<void> {
    this.failWhenDown();
    this.tripped.push(provider);
    this.states.set(provider, state);
    this.probes.delete(provider);
  }

  override async close(provider: string): Promise<boolean> {
    this.failWhenDown();
    this.closed.push(provider);
    this.probes.delete(provider);
    return this.states.delete(provider);
  }

  override async list(): Promise<StoredProviderBreakerEntry[]> {
    this.failWhenDown();
    return [...this.states.entries()].map(([provider, state]) => ({
      ...state,
      provider,
      probing: this.probes.has(provider),
    }));
  }

  private failWhenDown(): void {
    if (this.down) throw new Error('ECONNREFUSED');
  }
}

const sharedRedis = (): SharedRedisFake => new SharedRedisFake();

describe('ProviderCircuitBreakerManager (ADR-125)', () => {
  beforeEach(() => {
    ProviderCircuitBreakerManager.resetAll();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('in memory (no store: hand-built, or the pre-addendum behaviour)', () => {
    it('is closed until an account exhaustion is recorded', async () => {
      const breaker = new ProviderCircuitBreakerManager();
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
      await breaker.recordOutcome('OPENAI', true);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(false);
      // Per provider: Anthropic is untouched.
      await expect(breaker.allowsCall('ANTHROPIC')).resolves.toBe(true);
    });

    it('is shared by every instance (one per process, not per request)', async () => {
      await new ProviderCircuitBreakerManager().recordOutcome('OPENAI', true);
      await expect(new ProviderCircuitBreakerManager().allowsCall('OPENAI')).resolves.toBe(false);
    });

    it('half-opens after the window: exactly ONE probe, others still skip', async () => {
      const breaker = new ProviderCircuitBreakerManager();
      await breaker.recordOutcome('OPENAI', true);
      vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(false);
    });

    it('a successful probe closes it; a failed probe re-opens for another window', async () => {
      const breaker = new ProviderCircuitBreakerManager();
      await breaker.recordOutcome('OPENAI', true);
      vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
      await breaker.recordOutcome('OPENAI', true);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(false);

      vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
      await breaker.recordOutcome('OPENAI', false);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
    });

    it('a stuck probe does not keep the provider closed forever', async () => {
      const breaker = new ProviderCircuitBreakerManager();
      await breaker.recordOutcome('OPENAI', true);
      vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
      // The probe never reports back; after another window a new probe is allowed.
      vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
    });

    it('lists skipped providers with reason and skipped-until, marked MEMORY', async () => {
      vi.setSystemTime(new Date('2026-09-25T10:00:00.000Z'));
      const breaker = new ProviderCircuitBreakerManager();
      await breaker.recordOutcome('ANTHROPIC', true);
      await expect(breaker.list()).resolves.toEqual({
        source: ProviderBreakerSource.MEMORY,
        providers: [
          {
            provider: 'ANTHROPIC',
            reason: ProviderBreakerReason.ACCOUNT_CREDIT_EXHAUSTED,
            skippedUntil: '2026-09-25T10:10:00.000Z',
            trippedAt: '2026-09-25T10:00:00.000Z',
            probing: false,
          },
        ],
      });
    });

    it('clear re-admits the provider at once', async () => {
      const breaker = new ProviderCircuitBreakerManager();
      await breaker.recordOutcome('OPENAI', true);
      await expect(breaker.clear('OPENAI')).resolves.toEqual({ provider: 'OPENAI', cleared: true });
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
      await expect(breaker.clear('OPENAI')).resolves.toEqual({
        provider: 'OPENAI',
        cleared: false,
      });
    });
  });

  describe('shared through Redis across replicas (ADR-125 addendum)', () => {
    it('one exhaustion on replica A skips the provider on replica B', async () => {
      const redis = sharedRedis();
      const replicaA = new ProviderCircuitBreakerManager(redis);
      await replicaA.recordOutcome('OPENAI', true);
      // Replica B is a different process: its in-memory copy is empty.
      ProviderCircuitBreakerManager.resetAll();
      const replicaB = new ProviderCircuitBreakerManager(redis);
      await expect(replicaB.allowsCall('OPENAI')).resolves.toBe(false);
    });

    it('half-open lets exactly ONE probe through across replicas', async () => {
      const redis = sharedRedis();
      await new ProviderCircuitBreakerManager(redis).recordOutcome('OPENAI', true);
      vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
      const answers = await Promise.all(
        [1, 2, 3, 4].map(() => new ProviderCircuitBreakerManager(redis).allowsCall('OPENAI')),
      );
      expect(answers.filter(Boolean)).toHaveLength(1);
    });

    it('the probe replica closes it fleet-wide on success', async () => {
      const redis = sharedRedis();
      const probe = new ProviderCircuitBreakerManager(redis);
      await probe.recordOutcome('OPENAI', true);
      vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
      await expect(probe.allowsCall('OPENAI')).resolves.toBe(true);
      await probe.recordOutcome('OPENAI', false);
      expect(redis.closed).toEqual(['OPENAI']);
      await expect(new ProviderCircuitBreakerManager(redis).allowsCall('OPENAI')).resolves.toBe(
        true,
      );
    });

    it('an ordinary answered call costs no Redis write', async () => {
      const redis = sharedRedis();
      const breaker = new ProviderCircuitBreakerManager(redis);
      await expect(breaker.allowsCall('GEMINI')).resolves.toBe(true);
      await breaker.recordOutcome('GEMINI', false);
      expect(redis.closed).toEqual([]);
      expect(redis.tripped).toEqual([]);
    });

    it('Redis down: falls back to this replica’s in-memory copy, never throws', async () => {
      const redis = sharedRedis();
      redis.down = true;
      const breaker = new ProviderCircuitBreakerManager(redis);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
      await breaker.recordOutcome('OPENAI', true);
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(false);
      const listed = await breaker.list();
      expect(listed.source).toBe(ProviderBreakerSource.MEMORY);
      expect(listed.providers.map((row) => row.provider)).toEqual(['OPENAI']);
    });

    it('Redis answering "closed" drops a stale outage-time copy', async () => {
      const redis = sharedRedis();
      redis.down = true;
      const breaker = new ProviderCircuitBreakerManager(redis);
      await breaker.recordOutcome('OPENAI', true);
      redis.down = false;
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
      redis.down = true;
      await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
    });

    it('lists from Redis and clears fleet-wide', async () => {
      vi.setSystemTime(new Date('2026-09-25T10:00:00.000Z'));
      const redis = sharedRedis();
      const breaker = new ProviderCircuitBreakerManager(redis);
      await breaker.recordOutcome('OPENAI', true);
      const listed = await breaker.list();
      expect(listed.source).toBe(ProviderBreakerSource.REDIS);
      expect(listed.providers).toEqual([
        expect.objectContaining({
          provider: 'OPENAI',
          skippedUntil: '2026-09-25T10:10:00.000Z',
          probing: false,
        }),
      ]);
      await expect(breaker.clear('OPENAI')).resolves.toEqual({ provider: 'OPENAI', cleared: true });
      ProviderCircuitBreakerManager.resetAll();
      await expect(new ProviderCircuitBreakerManager(redis).allowsCall('OPENAI')).resolves.toBe(
        true,
      );
    });
  });
});
