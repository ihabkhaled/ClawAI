import type { UserEntitlements } from '@claw/shared-entitlements';
import { PlanModelAccessMode } from '@claw/shared-types';

import { HealingPoolService } from '../healing-pool.service';

const entitlements = {
  userId: 'owner-1',
  isAdmin: false,
  modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
  allowedModels: [],
  plan: { name: 'Pro', slug: 'pro' },
} as unknown as UserEntitlements;

describe('HealingPoolService', () => {
  it('builds the pool from the plan and the catalog', async () => {
    const service = new HealingPoolService(
      { getEntitlements: vi.fn().mockResolvedValue(entitlements) } as never,
      {
        listModels: vi
          .fn()
          .mockResolvedValue([
            { provider: 'GEMINI', model: 'flash', windowTokens: 1_000_000, usageTier: 'LOW' },
          ]),
      } as never,
      { forPlan: vi.fn().mockResolvedValue(new Map()) } as never,
    );

    const pool = await service.forOwner('owner-1');

    expect(pool?.pool).toHaveLength(1);
    expect(pool?.safeDefault).toMatchObject({ model: 'flash' });
  });

  it('answers no pool, never an error, when the plan cannot be read', async () => {
    const service = new HealingPoolService(
      { getEntitlements: vi.fn().mockRejectedValue(new Error('auth down')) } as never,
      { listModels: vi.fn().mockResolvedValue([]) } as never,
      { forPlan: vi.fn().mockResolvedValue(new Map()) } as never,
    );
    await expect(service.forOwner('owner-1')).resolves.toBeUndefined();
  });

  it('answers no pool when the catalog cannot be read', async () => {
    const service = new HealingPoolService(
      { getEntitlements: vi.fn().mockResolvedValue(entitlements) } as never,
      { listModels: vi.fn().mockRejectedValue(new Error('connector down')) } as never,
      { forPlan: vi.fn().mockResolvedValue(new Map()) } as never,
    );
    await expect(service.forOwner('owner-1')).resolves.toBeUndefined();
  });
});
