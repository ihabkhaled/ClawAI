import { type Mock, vi } from 'vitest';

import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { type RedisClientPort } from '../../../../infrastructure/redis/types/redis-client.types';
import {
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
} from '../../constants/provider-breaker.constants';
import { ProviderBreakerAdmission } from '../../enums/provider-breaker-admission.enum';
import { ProviderBreakerReason } from '../../enums/provider-breaker-reason.enum';
import { ProviderBreakerStore } from '../provider-breaker.store';

const STATE = {
  openUntil: 1_000_600_000,
  reason: ProviderBreakerReason.ACCOUNT_CREDIT_EXHAUSTED,
  trippedAt: 1_000_000_000,
};

function build(): { store: ProviderBreakerStore; evalMock: Mock } {
  const evalMock = vi.fn();
  const client: RedisClientPort = {
    ping: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    eval: evalMock,
    evalRuntimeV2: vi.fn(),
    disconnect: vi.fn(),
    quit: vi.fn(),
    lrange: vi.fn(),
  };
  return { store: new ProviderBreakerStore(new RedisService(client)), evalMock };
}

describe('ProviderBreakerStore (ADR-125 addendum)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [0, ProviderBreakerAdmission.CLOSED],
    [1, ProviderBreakerAdmission.OPEN],
    [2, ProviderBreakerAdmission.PROBE],
  ])('admit maps script answer %s to %s', async (answer, admission) => {
    const { store, evalMock } = build();
    evalMock.mockResolvedValue(answer);
    await expect(store.admit('OPENAI', 1_234)).resolves.toBe(admission);
    const [script, keyCount, stateKey, probeKey, now, probeTtl, stateTtl, token] = evalMock.mock
      .calls[0] as unknown[];
    expect(script).toBe(PROVIDER_BREAKER_ADMIT_SCRIPT);
    expect(keyCount).toBe(2);
    expect(stateKey).toBe(`${PROVIDER_BREAKER_STATE_KEY_PREFIX}OPENAI`);
    expect(probeKey).toBe(`${PROVIDER_BREAKER_PROBE_KEY_PREFIX}OPENAI`);
    expect(now).toBe('1234');
    expect(probeTtl).toBe(String(PROVIDER_BREAKER_PROBE_TTL_MS));
    expect(stateTtl).toBe(String(PROVIDER_BREAKER_STATE_TTL_MS));
    expect(typeof token).toBe('string');
  });

  it('the admit script takes the probe with SET NX PX (one probe fleet-wide)', () => {
    expect(PROVIDER_BREAKER_ADMIT_SCRIPT).toContain("'NX', 'PX'");
  });

  it('trip writes the JSON state with a TTL and indexes the provider', async () => {
    const { store, evalMock } = build();
    evalMock.mockResolvedValue(1);
    await store.trip('ANTHROPIC', STATE);
    expect(evalMock).toHaveBeenCalledWith(
      PROVIDER_BREAKER_TRIP_SCRIPT,
      3,
      `${PROVIDER_BREAKER_STATE_KEY_PREFIX}ANTHROPIC`,
      `${PROVIDER_BREAKER_PROBE_KEY_PREFIX}ANTHROPIC`,
      PROVIDER_BREAKER_INDEX_KEY,
      JSON.stringify(STATE),
      String(PROVIDER_BREAKER_STATE_TTL_MS),
      'ANTHROPIC',
    );
  });

  it('close reports whether a breaker existed', async () => {
    const { store, evalMock } = build();
    evalMock.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await expect(store.close('OPENAI')).resolves.toBe(true);
    await expect(store.close('OPENAI')).resolves.toBe(false);
    expect(evalMock.mock.calls[0]?.[0]).toBe(PROVIDER_BREAKER_CLOSE_SCRIPT);
  });

  it('list parses provider/state/probing triples and skips malformed rows', async () => {
    const { store, evalMock } = build();
    evalMock.mockResolvedValue([
      'OPENAI',
      JSON.stringify(STATE),
      1,
      'BROKEN',
      '{not json',
      0,
      'OLD',
      JSON.stringify({ openUntil: 'soon' }),
      0,
    ]);
    await expect(store.list()).resolves.toEqual([{ ...STATE, provider: 'OPENAI', probing: true }]);
    expect(evalMock.mock.calls[0]?.slice(0, 5)).toEqual([
      PROVIDER_BREAKER_LIST_SCRIPT,
      1,
      PROVIDER_BREAKER_INDEX_KEY,
      PROVIDER_BREAKER_STATE_KEY_PREFIX,
      PROVIDER_BREAKER_PROBE_KEY_PREFIX,
    ]);
  });

  it('list of a non-array answer is empty', async () => {
    const { store, evalMock } = build();
    evalMock.mockResolvedValue(null);
    await expect(store.list()).resolves.toEqual([]);
  });

  it('a Redis that never answers rejects after the deadline instead of hanging the call', async () => {
    vi.useFakeTimers();
    const { store, evalMock } = build();
    evalMock.mockReturnValue(new Promise(() => {}));
    const pending = store.admit('OPENAI', 1);
    const assertion = expect(pending).rejects.toThrow(/exceeded/u);
    await vi.advanceTimersByTimeAsync(PROVIDER_BREAKER_REDIS_DEADLINE_MS + 1);
    await assertion;
  });
});
