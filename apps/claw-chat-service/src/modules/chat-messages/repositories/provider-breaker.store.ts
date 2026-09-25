import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  PROVIDER_BREAKER_ADMIT_OPEN,
  PROVIDER_BREAKER_ADMIT_PROBE,
  PROVIDER_BREAKER_ADMIT_SCRIPT,
  PROVIDER_BREAKER_CLOSE_SCRIPT,
  PROVIDER_BREAKER_INDEX_KEY,
  PROVIDER_BREAKER_LIST_SCRIPT,
  PROVIDER_BREAKER_PROBE_KEY_PREFIX,
  PROVIDER_BREAKER_PROBE_TTL_MS,
  PROVIDER_BREAKER_REDIS_DEADLINE_MS,
  PROVIDER_BREAKER_STATE_KEY_PREFIX,
  PROVIDER_BREAKER_STATE_TTL_MS,
  PROVIDER_BREAKER_TRIP_SCRIPT,
} from '../constants/provider-breaker.constants';
import { ProviderBreakerAdmission } from '../enums/provider-breaker-admission.enum';
import {
  type StoredProviderBreakerEntry,
  type StoredProviderBreakerState,
} from '../types/provider-circuit-breaker.types';
import { parseStoredState } from '../utilities/provider-breaker-state.utility';
import { withDeadline } from '../utilities/with-deadline.utility';

/**
 * The account-exhaustion breaker's shared state (ADR-125 addendum), one per
 * fleet instead of one per replica. Every operation is one Lua script, so
 * admission and the half-open probe are atomic across the 4 prod replicas:
 * the probe is `SET NX PX` — exactly one replica wins it.
 *
 * THROWS when Redis is down or slower than PROVIDER_BREAKER_REDIS_DEADLINE_MS;
 * the manager then answers from its in-memory copy. Nothing here ever waits
 * longer than the deadline in front of a model call.
 */
@Injectable()
export class ProviderBreakerStore {
  constructor(private readonly redis: RedisService) {}

  async admit(provider: string, now: number): Promise<ProviderBreakerAdmission> {
    const answer = await this.run(
      PROVIDER_BREAKER_ADMIT_SCRIPT,
      [this.stateKey(provider), this.probeKey(provider)],
      [
        String(now),
        String(PROVIDER_BREAKER_PROBE_TTL_MS),
        String(PROVIDER_BREAKER_STATE_TTL_MS),
        randomUUID(),
      ],
    );
    if (answer === PROVIDER_BREAKER_ADMIT_PROBE) {
      return ProviderBreakerAdmission.PROBE;
    }
    return answer === PROVIDER_BREAKER_ADMIT_OPEN
      ? ProviderBreakerAdmission.OPEN
      : ProviderBreakerAdmission.CLOSED;
  }

  async trip(provider: string, state: StoredProviderBreakerState): Promise<void> {
    await this.run(
      PROVIDER_BREAKER_TRIP_SCRIPT,
      [this.stateKey(provider), this.probeKey(provider), PROVIDER_BREAKER_INDEX_KEY],
      [JSON.stringify(state), String(PROVIDER_BREAKER_STATE_TTL_MS), provider],
    );
  }

  /** True when a breaker existed and is now gone. */
  async close(provider: string): Promise<boolean> {
    const existed = await this.run(
      PROVIDER_BREAKER_CLOSE_SCRIPT,
      [this.stateKey(provider), this.probeKey(provider), PROVIDER_BREAKER_INDEX_KEY],
      [provider],
    );
    return existed === 1;
  }

  async list(): Promise<StoredProviderBreakerEntry[]> {
    const flat = await this.run(
      PROVIDER_BREAKER_LIST_SCRIPT,
      [PROVIDER_BREAKER_INDEX_KEY],
      [PROVIDER_BREAKER_STATE_KEY_PREFIX, PROVIDER_BREAKER_PROBE_KEY_PREFIX],
    );
    if (!Array.isArray(flat)) {
      return [];
    }
    const entries: StoredProviderBreakerEntry[] = [];
    for (let index = 0; index + 2 < flat.length; index += 3) {
      const provider: unknown = flat[index];
      const raw: unknown = flat[index + 1];
      if (typeof provider !== 'string' || typeof raw !== 'string') {
        continue;
      }
      const state = parseStoredState(raw);
      if (state !== null) {
        entries.push({ ...state, provider, probing: flat[index + 2] === 1 });
      }
    }
    return entries;
  }

  private run(script: string, keys: string[], args: string[]): Promise<unknown> {
    return withDeadline(
      this.redis.evalFailFast(script, keys, args),
      PROVIDER_BREAKER_REDIS_DEADLINE_MS,
      'provider breaker Redis call',
    );
  }

  private stateKey(provider: string): string {
    return `${PROVIDER_BREAKER_STATE_KEY_PREFIX}${provider}`;
  }

  private probeKey(provider: string): string {
    return `${PROVIDER_BREAKER_PROBE_KEY_PREFIX}${provider}`;
  }
}
