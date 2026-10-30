import type { UserEntitlements } from '@claw/shared-entitlements';
import { ModelCostClass, PlanModelAccessMode } from '@claw/shared-types';

import { costClassKey } from '../../utilities/model-cost-class.utility';
import { RecommendedTeamService } from '../recommended-team.service';

const free = {
  userId: 'owner-1',
  isAdmin: false,
  modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
  allowedCostClasses: [ModelCostClass.FREE, ModelCostClass.CHEAP],
  allowedModels: [],
  plan: { name: 'Free', slug: 'free' },
} as unknown as UserEntitlements;

const models = [
  { provider: 'GEMINI', model: 'flash', windowTokens: 1_000_000, usageTier: 'LOW' },
  { provider: 'GEMINI', model: 'pro', windowTokens: 1_000_000, usageTier: 'HIGH' },
];

function setup(forPlan: ReturnType<typeof vi.fn>) {
  return new RecommendedTeamService(
    { getEntitlements: vi.fn().mockResolvedValue(free) } as never,
    { listModels: vi.fn().mockResolvedValue(models) } as never,
    { forPlan } as never,
  );
}

describe('RecommendedTeamService on a cost-class plan (ADR-198)', () => {
  it('offers the cheap model and marks the premium one as needing a plan', async () => {
    const service = setup(
      vi.fn().mockResolvedValue(
        new Map([
          [costClassKey('GEMINI', 'flash'), ModelCostClass.CHEAP],
          [costClassKey('GEMINI', 'pro'), ModelCostClass.PREMIUM],
        ]),
      ),
    );

    const result = await service.get('owner-1');

    expect(result.team?.judge.model).toBe('flash');
    expect(result.models.map(({ status }) => status)).toEqual(['AVAILABLE', 'NEEDS_PLAN']);
    expect(result.excluded.map(({ model }) => model)).toEqual(['pro']);
  });

  it('offers nothing when routing is down, and does not keep that answer for the next call', async () => {
    const forPlan = vi
      .fn()
      .mockResolvedValueOnce(new Map())
      .mockResolvedValueOnce(new Map([[costClassKey('GEMINI', 'flash'), ModelCostClass.CHEAP]]))
      .mockResolvedValue(
        new Map([
          [costClassKey('GEMINI', 'flash'), ModelCostClass.CHEAP],
          [costClassKey('GEMINI', 'pro'), ModelCostClass.PREMIUM],
        ]),
      );
    const service = setup(forPlan);

    const down = await service.get('owner-1');
    expect(down.team).toBeNull();

    // Short again (only one of two models answered): still not kept.
    await service.get('owner-1');
    const recovered = await service.get('owner-1');
    expect(recovered.team?.judge.model).toBe('flash');
    expect(forPlan).toHaveBeenCalledTimes(3);
  });
});
