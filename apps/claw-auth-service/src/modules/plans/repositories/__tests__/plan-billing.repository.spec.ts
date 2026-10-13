import { vi } from 'vitest';
import {
  PlanFeatureAccessMode,
  PlanFeatureKey,
  PlanFeatureWindow,
} from '../../../../generated/prisma';
import { PlanBillingRepository } from '../plan-billing.repository';

describe('PlanBillingRepository.upsertFeatureRule', () => {
  const build = () => {
    const upsert = vi.fn().mockResolvedValue({});
    const repository = new PlanBillingRepository({ planFeatureRule: { upsert } } as never);
    return { repository, upsert };
  };

  it('upserts on the (plan, feature) key, writing the same values on update and create', async () => {
    const { repository, upsert } = build();
    const rule = {
      accessMode: PlanFeatureAccessMode.LIMITED,
      limit: 20,
      window: PlanFeatureWindow.DAY,
    };

    await repository.upsertFeatureRule('plan-1', PlanFeatureKey.PLUGIN_CALLS, rule);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      where: { planId_feature: { planId: 'plan-1', feature: 'PLUGIN_CALLS' } },
      update: rule,
      create: { planId: 'plan-1', feature: 'PLUGIN_CALLS', ...rule },
    });
  });

  it('keeps an unlimited rule (ENABLED, null limit) distinct from a disabled one', async () => {
    const { repository, upsert } = build();

    await repository.upsertFeatureRule('plan-1', PlanFeatureKey.PLUGIN_CALLS, {
      accessMode: PlanFeatureAccessMode.ENABLED,
      limit: null,
      window: PlanFeatureWindow.DAY,
    });
    await repository.upsertFeatureRule('plan-1', PlanFeatureKey.PLUGIN_CALLS, {
      accessMode: PlanFeatureAccessMode.DISABLED,
      limit: null,
      window: PlanFeatureWindow.DAY,
    });

    expect(upsert.mock.calls[0]?.[0].update).toMatchObject({ accessMode: 'ENABLED', limit: null });
    expect(upsert.mock.calls[1]?.[0].update).toMatchObject({
      accessMode: 'DISABLED',
      limit: null,
    });
  });

  it('resolves to undefined and lets a database error reach the caller', async () => {
    const { repository, upsert } = build();
    const rule = {
      accessMode: PlanFeatureAccessMode.ENABLED,
      limit: null,
      window: PlanFeatureWindow.DAY,
    };

    await expect(
      repository.upsertFeatureRule('p', PlanFeatureKey.PLUGIN_CALLS, rule),
    ).resolves.toBeUndefined();

    upsert.mockRejectedValueOnce(new Error('db down'));
    await expect(
      repository.upsertFeatureRule('p', PlanFeatureKey.PLUGIN_CALLS, rule),
    ).rejects.toThrow('db down');
  });
});
