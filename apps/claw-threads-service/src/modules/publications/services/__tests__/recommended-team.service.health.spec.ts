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

describe('RecommendedTeamService with model health', () => {
  it('marks a failing model DEGRADED, keeps it selectable and still answers when it is the only one', async () => {
    const adapter = { getEntitlements: vi.fn().mockResolvedValue(entitlements) };
    const catalog = {
      listModels: vi
        .fn()
        .mockResolvedValue([
          { provider: 'GEMINI', model: 'flash', windowTokens: null, usageTier: 'LOW' },
        ]),
    };
    const health = {
      current: vi.fn().mockResolvedValue(new Map([['GEMINI/flash', { ok: 0, failed: 8 }]])),
    };
    const service = new RecommendedTeamService(
      adapter as never,
      catalog as never,
      { forPlan: vi.fn().mockResolvedValue(new Map()) } as never,
      health as never,
    );

    const result = await service.get('owner-1');

    expect(result.models[0]).toMatchObject({ status: 'DEGRADED' });
    expect(result.excluded).toEqual([]);
    expect(result.team?.judge.model).toBe('flash');
  });
});
