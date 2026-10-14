import { ServiceUnavailableException } from '@nestjs/common';
import type { UserEntitlements } from '@claw/shared-entitlements';
import { PlanModelAccessMode } from '@claw/shared-types';

import { RecommendedTeamService } from '../recommended-team.service';

const entitlements = {
  userId: 'owner-1',
  isAdmin: false,
  modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
  allowedModels: [],
  plan: { name: 'Free', slug: 'free' },
} as unknown as UserEntitlements;

function setup() {
  const adapter = { getEntitlements: vi.fn().mockResolvedValue(entitlements) };
  const catalog = {
    listModels: vi
      .fn()
      .mockResolvedValue([
        { provider: 'GEMINI', model: 'flash', windowTokens: null, usageTier: 'LOW' },
      ]),
  };
  const service = new RecommendedTeamService(adapter as never, catalog as never);
  return { service, adapter, catalog };
}

describe('RecommendedTeamService', () => {
  afterEach(() => vi.useRealTimers());

  it('returns the plan name, the team and a status per model', async () => {
    const { service, adapter } = setup();

    const result = await service.get('owner-1');

    expect(result.planName).toBe('Free');
    expect(result.team?.judge.model).toBe('flash');
    expect(result.models).toEqual([{ provider: 'GEMINI', model: 'flash', status: 'AVAILABLE' }]);
    expect(adapter.getEntitlements).toHaveBeenCalledWith('owner-1', { enforceTrial: false });
  });

  it('caches per owner for 60 seconds, then reads again', async () => {
    vi.useFakeTimers();
    const { service, adapter } = setup();

    await service.get('owner-1');
    await service.get('owner-1');
    expect(adapter.getEntitlements).toHaveBeenCalledTimes(1);

    await service.get('owner-2');
    expect(adapter.getEntitlements).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(60_001);
    await service.get('owner-1');
    expect(adapter.getEntitlements).toHaveBeenCalledTimes(3);
  });

  it('fails closed with 503 when the plan lookup fails, and caches nothing', async () => {
    const { service, adapter } = setup();
    adapter.getEntitlements.mockRejectedValueOnce(new Error('down'));

    await expect(service.get('owner-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.get('owner-1')).resolves.toMatchObject({ planName: 'Free' });
  });

  it('propagates an unreadable catalog as the catalog client reports it', async () => {
    const { service, catalog } = setup();
    catalog.listModels.mockRejectedValueOnce(new ServiceUnavailableException('catalog'));

    await expect(service.get('owner-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
