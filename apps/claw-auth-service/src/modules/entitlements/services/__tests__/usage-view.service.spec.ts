import { PlanFeatureKey } from '../../../../generated/prisma';
import { UsageViewService } from '../usage-view.service';

describe('UsageViewService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports finalized durable token totals for the current UTC day, week and month', async () => {
    const ledger = {
      sumTotalTokens: jest
        .fn()
        .mockResolvedValueOnce(125)
        .mockResolvedValueOnce(900)
        .mockResolvedValueOnce(2400),
    };
    const users = {
      findUserById: jest.fn().mockResolvedValue({ role: 'USER', activePlanId: 'plan-1' }),
    };
    const plans = {
      findEffectiveForUser: jest.fn().mockResolvedValue({
        id: 'plan-1',
        dailyTokenQuota: 1000,
        weeklyTokenQuota: 5000,
        monthlyTokenQuota: 20_000,
      }),
      findDefault: jest.fn(),
    };
    const features = {
      evaluate: jest.fn().mockResolvedValue({
        feature: PlanFeatureKey.WEB_SEARCH,
        allowed: true,
        limit: null,
        used: 0,
        remaining: null,
        window: null,
      }),
      evaluateObserved: jest.fn(),
    };
    const service = new UsageViewService(
      ledger as never,
      users as never,
      plans as never,
      features as never,
    );

    const result = await service.getForUser('user-1');

    expect(ledger.sumTotalTokens).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      fromDate: '2026-08-01',
      throughDate: '2026-08-01',
    });
    expect(ledger.sumTotalTokens).toHaveBeenNthCalledWith(2, {
      userId: 'user-1',
      fromDate: '2026-07-27',
      throughDate: '2026-08-01',
    });
    expect(ledger.sumTotalTokens).toHaveBeenNthCalledWith(3, {
      userId: 'user-1',
      fromDate: '2026-08-01',
      throughDate: '2026-08-01',
    });
    expect(result.day).toMatchObject({ used: 125, remaining: 875 });
    expect(result.week).toMatchObject({ used: 900, remaining: 4100 });
    expect(result.month).toMatchObject({ used: 2400, remaining: 17_600 });
  });

  it('shows durable observed operation counts for a user without a plan', async () => {
    const ledger = { sumTotalTokens: jest.fn().mockResolvedValue(0) };
    const users = {
      findUserById: jest.fn().mockResolvedValue({ role: 'USER', activePlanId: null }),
    };
    const plans = { findEffectiveForUser: jest.fn(), findDefault: jest.fn() };
    const features = {
      evaluate: jest.fn(),
      evaluateObserved: jest.fn(({ feature }) => ({
        feature,
        allowed: true,
        limit: null,
        used: feature === PlanFeatureKey.WEB_SEARCH ? 23 : 0,
        remaining: null,
        window: null,
      })),
    };
    const service = new UsageViewService(
      ledger as never,
      users as never,
      plans as never,
      features as never,
    );

    const result = await service.getForUser('user-1');

    expect(result.features).toContainEqual(
      expect.objectContaining({ feature: PlanFeatureKey.WEB_SEARCH, used: 23, limit: null }),
    );
    expect(features.evaluate).not.toHaveBeenCalled();
  });

  it('does not expose an assigned commercial-plan limit in the admin usage view', async () => {
    const ledger = { sumTotalTokens: jest.fn().mockResolvedValue(321) };
    const users = {
      findUserById: jest.fn().mockResolvedValue({ role: 'ADMIN', activePlanId: 'plan-team' }),
    };
    const plans = { findEffectiveForUser: jest.fn(), findDefault: jest.fn() };
    const features = {
      evaluate: jest.fn(),
      evaluateObserved: jest.fn(({ feature }) => ({
        feature,
        allowed: true,
        limit: null,
        used: 0,
        remaining: null,
        window: null,
      })),
    };
    const service = new UsageViewService(
      ledger as never,
      users as never,
      plans as never,
      features as never,
    );

    const result = await service.getForUser('admin-1');

    expect(result.day).toMatchObject({ used: 321, limit: null, remaining: null });
    expect(result.week).toMatchObject({ used: 321, limit: null, remaining: null });
    expect(result.month).toMatchObject({ used: 321, limit: null, remaining: null });
    expect(plans.findEffectiveForUser).not.toHaveBeenCalled();
    expect(features.evaluate).not.toHaveBeenCalled();
  });
});
