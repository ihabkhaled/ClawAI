import { vi } from 'vitest';
import {
  PlanFeatureAccessMode,
  PlanFeatureKey,
  PlanFeatureWindow,
} from '../../../../generated/prisma';
import { PlansRepository } from '../plans.repository';

// The maxPluginCallsPerDay column is the payload; the PLUGIN_CALLS rule is what the quota
// reservation enforces. These specs prove the two are written in ONE transaction: a
// failure on either write leaves neither behind, so they cannot disagree.
type Store = { plan: { id: string; maxPluginCallsPerDay: number | null } | null; rule: unknown };

const buildFake = (options: { failRuleWrite?: boolean; stored?: Store['plan'] } = {}) => {
  let committed: Store = { plan: options.stored ?? null, rule: null };
  const ruleUpsert = vi.fn();
  const findUnique = vi.fn(async () => committed.plan);

  const prisma = {
    plan: { findUnique },
    $transaction: async <T>(run: (tx: unknown) => Promise<T>): Promise<T> => {
      // Writes stage on a copy and only replace `committed` when the callback returns.
      const staged: Store = { ...committed };
      const tx = {
        plan: {
          create: async ({ data }: { data: { maxPluginCallsPerDay?: number | null } }) => {
            staged.plan = { id: 'plan-new', maxPluginCallsPerDay: data.maxPluginCallsPerDay ?? 20 };
            return staged.plan;
          },
          update: async ({ data }: { data: { maxPluginCallsPerDay?: number | null } }) => {
            staged.plan = {
              id: 'plan-1',
              maxPluginCallsPerDay:
                data.maxPluginCallsPerDay === undefined
                  ? (staged.plan?.maxPluginCallsPerDay ?? null)
                  : data.maxPluginCallsPerDay,
            };
            return staged.plan;
          },
        },
        planFeatureRule: {
          upsert: async (args: unknown) => {
            ruleUpsert(args);
            if (options.failRuleWrite) {
              throw new Error('rule write failed');
            }
            staged.rule = args;
          },
        },
      };
      const result = await run(tx);
      committed = staged;
      return result;
    },
  };
  return {
    repository: new PlansRepository(prisma as never),
    ruleUpsert,
    state: () => committed,
  };
};

const expectedRule = (accessMode: PlanFeatureAccessMode, limit: number | null) => ({
  where: { planId_feature: { planId: expect.any(String), feature: PlanFeatureKey.PLUGIN_CALLS } },
  update: { accessMode, limit, window: PlanFeatureWindow.DAY },
  create: expect.objectContaining({ accessMode, limit, window: PlanFeatureWindow.DAY }),
});

describe('PlansRepository PLUGIN_CALLS rule in the plan transaction', () => {
  describe('create', () => {
    it('writes the plan and a LIMITED rule from its stored cap in one transaction', async () => {
      const { repository, ruleUpsert, state } = buildFake();

      await repository.create({ slug: 'x', maxPluginCallsPerDay: 750 } as never);

      expect(ruleUpsert).toHaveBeenCalledWith(expectedRule(PlanFeatureAccessMode.LIMITED, 750));
      expect(state().plan).toMatchObject({ id: 'plan-new', maxPluginCallsPerDay: 750 });
      expect(state().rule).not.toBeNull();
    });

    it('derives the rule from the row the database stored, so a column default still gets a rule', async () => {
      const { repository, ruleUpsert } = buildFake();

      await repository.create({ slug: 'x' } as never);

      expect(ruleUpsert).toHaveBeenCalledWith(expectedRule(PlanFeatureAccessMode.LIMITED, 20));
    });

    it('rolls the plan back when the rule write fails, so no plan exists without its rule', async () => {
      const { repository, state } = buildFake({ failRuleWrite: true });

      await expect(
        repository.create({ slug: 'x', maxPluginCallsPerDay: 5 } as never),
      ).rejects.toThrow('rule write failed');

      expect(state().plan).toBeNull();
    });
  });

  describe('update', () => {
    const stored = { id: 'plan-1', maxPluginCallsPerDay: 20 };

    it('changes the column and the rule together', async () => {
      const { repository, ruleUpsert, state } = buildFake({ stored });

      await repository.update('plan-1', { maxPluginCallsPerDay: 300 });

      expect(ruleUpsert).toHaveBeenCalledWith(expectedRule(PlanFeatureAccessMode.LIMITED, 300));
      expect(state().plan?.maxPluginCallsPerDay).toBe(300);
    });

    it('maps null to unlimited and 0 to disabled, which are not interchangeable', async () => {
      const { repository, ruleUpsert } = buildFake({ stored });

      await repository.update('plan-1', { maxPluginCallsPerDay: null });
      await repository.update('plan-1', { maxPluginCallsPerDay: 0 });

      expect(ruleUpsert).toHaveBeenNthCalledWith(
        1,
        expectedRule(PlanFeatureAccessMode.ENABLED, null),
      );
      expect(ruleUpsert).toHaveBeenNthCalledWith(
        2,
        expectedRule(PlanFeatureAccessMode.DISABLED, null),
      );
    });

    it('leaves the rule alone when the update does not mention the cap', async () => {
      const { repository, ruleUpsert } = buildFake({ stored });

      await repository.update('plan-1', { name: 'Renamed' });

      expect(ruleUpsert).not.toHaveBeenCalled();
    });

    it('rolls the column change back when the rule write fails', async () => {
      const { repository, state } = buildFake({ stored, failRuleWrite: true });

      await expect(repository.update('plan-1', { maxPluginCallsPerDay: 999 })).rejects.toThrow(
        'rule write failed',
      );

      expect(state().plan?.maxPluginCallsPerDay).toBe(20);
    });
  });
});
