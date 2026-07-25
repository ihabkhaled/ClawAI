import { QuotaService } from '../quota.service';
import { type RedisService } from '../../../../infrastructure/redis/redis.service';
import { type TokenLedgerRepository } from '../../repositories/token-ledger.repository';
import { type WeightedUsageRepository } from '../../repositories/weighted-usage.repository';
import { type QuotaLimits, type WeightedReservationInput } from '../../types/quota.types';

const makeRedisClient = () => ({
  incrby: jest.fn(),
  decrby: jest.fn(),
  expire: jest.fn(),
  eval: jest.fn(),
});

const makeReservationInput = (
  overrides: Partial<WeightedReservationInput> = {},
): WeightedReservationInput => ({
  userId: 'u1',
  planId: 'p1',
  requestId: 'req-1',
  provider: 'OPENAI',
  model: 'gpt-4o',
  workflow: 'chat',
  estimatedWeightedTokens: 1000,
  estimatedCostMicroUsd: 1000n,
  chatsDelta: 0,
  messagesDelta: 1,
  billingPeriodKey: null,
  ...overrides,
});

const makeLimits = (overrides: Partial<QuotaLimits> = {}): QuotaLimits => ({
  dailyWeightedTokens: 50_000,
  weeklyWeightedTokens: 250_000,
  monthlyWeightedTokens: 750_000,
  monthlyProviderCostMicroUsd: 750_000n,
  maxConcurrentRequests: 3,
  dailyChats: 10,
  dailyMessages: 100,
  ...overrides,
});

describe('QuotaService', () => {
  let service: QuotaService;
  let client: ReturnType<typeof makeRedisClient>;
  let redis: { get: jest.Mock; getClient: jest.Mock };
  let ledger: { addUsage: jest.Mock; findForDay: jest.Mock };
  let weighted: {
    createReservation: jest.Mock;
    findByReservationId: jest.Mock;
    finalize: jest.Mock;
    markReleased: jest.Mock;
  };

  beforeEach(() => {
    client = makeRedisClient();
    redis = { get: jest.fn(), getClient: jest.fn().mockReturnValue(client) };
    ledger = { addUsage: jest.fn(), findForDay: jest.fn() };
    weighted = {
      createReservation: jest.fn(),
      findByReservationId: jest.fn(),
      finalize: jest.fn(),
      markReleased: jest.fn(),
    };
    service = new QuotaService(
      redis as unknown as RedisService,
      ledger as unknown as TokenLedgerRepository,
      weighted as unknown as WeightedUsageRepository,
    );
  });

  it('reserve succeeds when under the daily limit', async () => {
    client.incrby.mockResolvedValue(500);
    const res = await service.reserve('u1', 10000, 500);
    expect(res.ok).toBe(true);
    expect(client.decrby).not.toHaveBeenCalled();
  });

  it('sets TTL on the first write of the day', async () => {
    client.incrby.mockResolvedValue(500); // total === estimate → first write
    await service.reserve('u1', 10000, 500);
    expect(client.expire).toHaveBeenCalled();
  });

  it('reserve over the limit releases (decrby) and rejects', async () => {
    client.incrby.mockResolvedValue(10500); // over 10000
    const res = await service.reserve('u1', 10000, 1000);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('QUOTA_EXCEEDED');
      expect(res.snapshot.used).toBe(9500);
      expect(res.snapshot.remaining).toBe(500);
    }
    expect(client.decrby).toHaveBeenCalledWith(expect.any(String), 1000);
  });

  it('finalize adjusts the counter up when actual exceeds estimate and writes the ledger', async () => {
    await service.finalize({
      userId: 'u1',
      planId: 'p1',
      reservationId: 'r',
      estimate: 500,
      actualTotalTokens: 800,
      inputTokens: 300,
      outputTokens: 500,
      provider: 'OPENAI',
      model: 'gpt-4o',
    });
    expect(client.incrby).toHaveBeenCalledWith(expect.any(String), 300);
    expect(ledger.addUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        totalTokens: 800,
        inputTokens: 300,
        outputTokens: 500,
      }),
    );
  });

  it('finalize adjusts the counter down when actual is below estimate', async () => {
    await service.finalize({
      userId: 'u1',
      planId: null,
      reservationId: 'r',
      estimate: 1000,
      actualTotalTokens: 400,
      inputTokens: 200,
      outputTokens: 200,
      provider: 'OPENAI',
      model: 'gpt-4o',
    });
    expect(client.decrby).toHaveBeenCalledWith(expect.any(String), 600);
  });

  it('release decrements the reserved estimate', async () => {
    await service.release('u1', 750);
    expect(client.decrby).toHaveBeenCalledWith(expect.any(String), 750);
  });

  it('getSnapshot computes remaining from the Redis counter', async () => {
    redis.get.mockResolvedValue('3000');
    const snap = await service.getSnapshot('u1', 10000);
    expect(snap).toEqual({ dailyLimit: 10000, used: 3000, remaining: 7000 });
  });

  describe('weighted multi-window reservation', () => {
    it('reserves when every window has room and records the durable row', async () => {
      client.eval.mockResolvedValue([1, '', '0', '0']);
      const result = await service.reserveWeighted(makeReservationInput(), makeLimits());
      expect(result.ok).toBe(true);
      expect(weighted.createReservation).toHaveBeenCalledTimes(1);
    });

    it('passes all seven window keys to a single atomic script', async () => {
      client.eval.mockResolvedValue([1, '', '0', '0']);
      await service.reserveWeighted(makeReservationInput(), makeLimits());
      // Second eval arg is the key count: day, week, month, cost, concurrency,
      // chats, messages — checked together or the check is not atomic.
      expect(client.eval).toHaveBeenCalledWith(
        expect.any(String),
        7,
        ...Array(7 + 15).fill(expect.anything()),
      );
    });

    it('rejects with the window that ran out and does not write a ledger row', async () => {
      client.eval.mockResolvedValue([0, 'WEEK', '250000', '250000']);
      const result = await service.reserveWeighted(makeReservationInput(), makeLimits());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.window).toBe('WEEK');
        expect(result.limit).toBe(250_000);
      }
      expect(weighted.createReservation).not.toHaveBeenCalled();
    });

    it('rejects on the provider-cost ceiling', async () => {
      client.eval.mockResolvedValue([0, 'PROVIDER_COST', '750000', '750000']);
      const result = await service.reserveWeighted(makeReservationInput(), makeLimits());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.window).toBe('PROVIDER_COST');
      }
    });

    it('fails CLOSED when the Lua reply is unrecognisable', async () => {
      client.eval.mockResolvedValue('unexpected');
      const result = await service.reserveWeighted(makeReservationInput(), makeLimits());
      expect(result.ok).toBe(false);
    });

    it('gives the quota back when the durable write fails', async () => {
      client.eval.mockResolvedValue([1, '', '0', '0']);
      weighted.createReservation.mockRejectedValue(new Error('db down'));
      await expect(service.reserveWeighted(makeReservationInput(), makeLimits())).rejects.toThrow(
        'db down',
      );
      // Reserve script + compensating adjust script.
      expect(client.eval).toHaveBeenCalledTimes(2);
    });

    it('finalize charges the overrun when actual exceeds the estimate', async () => {
      weighted.findByReservationId.mockResolvedValue({
        userId: 'u1',
        weightedTokens: 1000,
        estimatedCostMicroUsd: 1000n,
        dayKey: '2026-07-25',
        weekKey: '2026-W30',
        monthKey: '2026-07',
      });
      client.eval.mockResolvedValue(1);
      await service.finalizeWeighted({
        reservationId: 'r1',
        rawInputTokens: 10,
        rawCachedTokens: 0,
        rawReasoningTokens: 0,
        rawOutputTokens: 20,
        toolCallCount: 0,
        actualWeightedTokens: 1500,
        actualCostMicroUsd: 1500n,
      });
      const argv = client.eval.mock.calls[0] as unknown[];
      expect(argv.slice(9, 12)).toEqual(['500', '500', '500']);
      expect(weighted.finalize).toHaveBeenCalled();
    });

    it('finalize refunds the unused remainder when actual is below the estimate', async () => {
      weighted.findByReservationId.mockResolvedValue({
        userId: 'u1',
        weightedTokens: 1000,
        estimatedCostMicroUsd: 1000n,
        dayKey: '2026-07-25',
        weekKey: '2026-W30',
        monthKey: '2026-07',
      });
      client.eval.mockResolvedValue(1);
      await service.finalizeWeighted({
        reservationId: 'r1',
        rawInputTokens: 5,
        rawCachedTokens: 0,
        rawReasoningTokens: 0,
        rawOutputTokens: 5,
        toolCallCount: 0,
        actualWeightedTokens: 400,
        actualCostMicroUsd: 400n,
      });
      const argv = client.eval.mock.calls[0] as unknown[];
      expect(argv.slice(9, 12)).toEqual(['-600', '-600', '-600']);
    });

    it('finalize always frees the concurrency slot', async () => {
      weighted.findByReservationId.mockResolvedValue({
        userId: 'u1',
        weightedTokens: 100,
        estimatedCostMicroUsd: 100n,
        dayKey: '2026-07-25',
        weekKey: '2026-W30',
        monthKey: '2026-07',
      });
      client.eval.mockResolvedValue(1);
      await service.finalizeWeighted({
        reservationId: 'r1',
        rawInputTokens: 1,
        rawCachedTokens: 0,
        rawReasoningTokens: 0,
        rawOutputTokens: 1,
        toolCallCount: 0,
        actualWeightedTokens: 100,
        actualCostMicroUsd: 100n,
      });
      const argv = client.eval.mock.calls[0] as unknown[];
      // ARGV index 5 of 7 is the concurrency delta.
      expect(argv[13]).toBe('-1');
    });

    it('release gives back the full reservation and marks the row RELEASED', async () => {
      weighted.findByReservationId.mockResolvedValue({
        userId: 'u1',
        weightedTokens: 900,
        estimatedCostMicroUsd: 900n,
        dayKey: '2026-07-25',
        weekKey: '2026-W30',
        monthKey: '2026-07',
      });
      client.eval.mockResolvedValue(1);
      await service.releaseWeighted('r1');
      const argv = client.eval.mock.calls[0] as unknown[];
      expect(argv.slice(9, 12)).toEqual(['-900', '-900', '-900']);
      expect(weighted.markReleased).toHaveBeenCalledWith('r1');
    });

    it('release of an unknown reservation is a no-op, not a crash', async () => {
      weighted.findByReservationId.mockResolvedValue(null);
      await service.releaseWeighted('missing');
      expect(client.eval).not.toHaveBeenCalled();
      expect(weighted.markReleased).not.toHaveBeenCalled();
    });
  });
});
