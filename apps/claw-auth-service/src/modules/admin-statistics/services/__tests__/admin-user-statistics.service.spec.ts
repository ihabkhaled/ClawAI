import { buildPeriodKeys } from '../../../quota/utilities/quota-reservation.utility';
import { AdminUserStatisticsService } from '../admin-user-statistics.service';

describe('AdminUserStatisticsService', () => {
  const NOW = new Date('2026-08-01T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function buildTokens(): { sumUsageBreakdown: jest.Mock } {
    return {
      sumUsageBreakdown: jest
        .fn()
        .mockResolvedValueOnce({
          inputTokens: 100,
          outputTokens: 25,
          totalTokens: 125,
          requestCount: 3,
        })
        .mockResolvedValueOnce({
          inputTokens: 700,
          outputTokens: 200,
          totalTokens: 900,
          requestCount: 11,
        })
        .mockResolvedValueOnce({
          inputTokens: 2000,
          outputTokens: 400,
          totalTokens: 2400,
          requestCount: 42,
        }),
    };
  }

  it('sums each token window over the UTC day, ISO week and calendar month to date', async () => {
    const tokens = buildTokens();
    const credits = { aggregateMonthlyConsumption: jest.fn().mockResolvedValue([]) };
    const service = new AdminUserStatisticsService(tokens as never, credits as never);

    const result = await service.getUsageForUser('user-1');

    expect(tokens.sumUsageBreakdown).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      fromDate: '2026-08-01',
      throughDate: '2026-08-01',
    });
    expect(tokens.sumUsageBreakdown).toHaveBeenNthCalledWith(2, {
      userId: 'user-1',
      fromDate: '2026-07-27',
      throughDate: '2026-08-01',
    });
    expect(tokens.sumUsageBreakdown).toHaveBeenNthCalledWith(3, {
      userId: 'user-1',
      fromDate: '2026-08-01',
      throughDate: '2026-08-01',
    });
    expect(result.tokens.day).toEqual({
      periodKey: buildPeriodKeys(NOW).dayKey,
      fromDate: '2026-08-01',
      throughDate: '2026-08-01',
      inputTokens: 100,
      outputTokens: 25,
      totalTokens: 125,
      requestCount: 3,
    });
    expect(result.tokens.week.totalTokens).toBe(900);
    expect(result.tokens.month.requestCount).toBe(42);
  });

  it('labels each window with the period key its own calendar unit uses', async () => {
    const tokens = buildTokens();
    const credits = { aggregateMonthlyConsumption: jest.fn().mockResolvedValue([]) };
    const service = new AdminUserStatisticsService(tokens as never, credits as never);

    const result = await service.getUsageForUser('user-1');
    const expected = buildPeriodKeys(NOW);

    // Asserted against the shared builder rather than hardcoded strings: ISO
    // week-years are their own trap and `period-key.utility` already owns that
    // proof. What matters here is that the day window is not labelled with the
    // month's key, which is the mistake a hand-written fan-out actually makes.
    expect(result.tokens.day.periodKey).toBe(expected.dayKey);
    expect(result.tokens.week.periodKey).toBe(expected.weekKey);
    expect(result.tokens.month.periodKey).toBe(expected.monthKey);
    expect(result.tokens.week.periodKey).not.toBe(result.tokens.month.periodKey);
  });

  it('asks for credit consumption from the first of the twelfth month back', async () => {
    const tokens = buildTokens();
    const credits = { aggregateMonthlyConsumption: jest.fn().mockResolvedValue([]) };
    const service = new AdminUserStatisticsService(tokens as never, credits as never);

    await service.getUsageForUser('user-1');

    expect(credits.aggregateMonthlyConsumption).toHaveBeenCalledWith({
      userId: 'user-1',
      from: new Date('2025-09-01T00:00:00.000Z'),
    });
  });

  it('serialises micro-USD as a string so no digits are lost in JSON', async () => {
    const tokens = buildTokens();
    const credits = {
      aggregateMonthlyConsumption: jest.fn().mockResolvedValue([
        { monthKey: '2026-08', consumedMicroUsd: 9_007_199_254_740_993n, entryCount: 4n },
        { monthKey: '2026-07', consumedMicroUsd: 4_100_000n, entryCount: 912n },
      ]),
    };
    const service = new AdminUserStatisticsService(tokens as never, credits as never);

    const result = await service.getUsageForUser('user-1');

    // One past Number.MAX_SAFE_INTEGER. Through a number this becomes
    // ...992 and the panel quietly reports a figure that was never charged.
    expect(result.creditsByMonth[0]).toEqual({
      monthKey: '2026-08',
      consumedMicroUsd: '9007199254740993',
      entryCount: 4,
    });
    expect(result.creditsByMonth[1]?.consumedMicroUsd).toBe('4100000');
    expect(result.creditsByMonth[1]?.entryCount).toBe(912);
  });

  it('reports a user with no settled spend as an empty series, not zeroed months', async () => {
    const tokens = buildTokens();
    const credits = { aggregateMonthlyConsumption: jest.fn().mockResolvedValue([]) };
    const service = new AdminUserStatisticsService(tokens as never, credits as never);

    const result = await service.getUsageForUser('user-1');

    expect(result.creditsByMonth).toEqual([]);
    expect(result.userId).toBe('user-1');
    expect(result.generatedAt).toBe(NOW.toISOString());
  });
});
