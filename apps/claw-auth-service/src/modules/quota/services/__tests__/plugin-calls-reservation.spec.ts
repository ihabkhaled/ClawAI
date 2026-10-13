import { vi } from 'vitest';
import {
  PlanFeatureAccessMode,
  PlanFeatureKey,
  type PlanFeatureRule,
  PlanFeatureWindow,
} from '../../../../generated/prisma';
import { reserveFeatureUsageSchema, settleFeatureUsageSchema } from '../../dto/quota.dto';
import { FeatureSettlement } from '../../enums/feature-settlement.enum';
import { FeaturePolicyService } from '../feature-policy.service';
import { FeatureUsageConsumptionService } from '../feature-usage-consumption.service';

// PLUGIN_CALLS is reserved by claw-plugin-service before each tool call and settled after it
// (consume when the call ran, release when it failed). Batch 2 proves the auth side already
// works for the new feature key, through the same internal reserve and settle routes
// FILE_GENERATION uses, with no per-feature code.
const rule = (overrides: Partial<PlanFeatureRule>): PlanFeatureRule =>
  ({
    id: 'r1',
    planId: 'free',
    feature: PlanFeatureKey.PLUGIN_CALLS,
    accessMode: PlanFeatureAccessMode.LIMITED,
    limit: 20,
    window: PlanFeatureWindow.DAY,
    ...overrides,
  }) as PlanFeatureRule;

const buildPolicy = (found: PlanFeatureRule | null, used: number) => {
  const usage = {
    reserve: vi.fn().mockResolvedValue({ id: 'res-1' }),
    // Stands in for the repository's atomic count-and-write; its real behaviour is
    // proven in feature-usage.repository.spec.ts.
    reserveWithinLimit: vi
      .fn()
      .mockImplementation(async (p: { limit: number | null }) =>
        p.limit !== null && used >= p.limit
          ? { held: false, used }
          : { held: true, record: { id: 'res-1' } },
      ),
    countActive: vi.fn().mockResolvedValue(used),
    consume: vi.fn(),
    release: vi.fn(),
  };
  const billing = { findFeatureRule: vi.fn().mockResolvedValue(found) };
  const policy = new FeaturePolicyService(billing as never, usage as never);
  return { policy, usage, billing };
};

const input = { userId: 'u1', feature: PlanFeatureKey.PLUGIN_CALLS, requestId: 'call-1' };

describe('PLUGIN_CALLS reservation', () => {
  describe('internal routes accept the feature key', () => {
    it('validates a reserve and a settle body carrying PLUGIN_CALLS', () => {
      expect(reserveFeatureUsageSchema.safeParse(input).success).toBe(true);
      expect(
        settleFeatureUsageSchema.safeParse({
          reservationId: 'res-1',
          outcome: FeatureSettlement.CONSUME,
        }).success,
      ).toBe(true);
    });

    it('still refuses a feature key that does not exist', () => {
      expect(reserveFeatureUsageSchema.safeParse({ ...input, feature: 'NOPE' }).success).toBe(
        false,
      );
    });
  });

  describe('the daily window', () => {
    it('holds a call while the day is under the cap', async () => {
      const { policy, usage } = buildPolicy(rule({}), 19);

      await expect(
        policy.reserve({ ...input, planId: 'free', billingPeriodKey: null }),
      ).resolves.toEqual({ ok: true, reservationId: 'res-1' });
      expect(usage.reserveWithinLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'PLUGIN_CALLS',
          window: PlanFeatureWindow.DAY,
          limit: 20,
        }),
      );
    });

    it('refuses the 21st call on a Free plan with the numbers to show', async () => {
      const { policy } = buildPolicy(rule({}), 20);

      await expect(
        policy.reserve({ ...input, planId: 'free', billingPeriodKey: null }),
      ).resolves.toEqual({ ok: false, reason: 'FEATURE_TRIAL_EXHAUSTED', used: 20, limit: 20 });
    });

    it('refuses everything on a plan whose allowance is 0 (disabled, not unlimited)', async () => {
      const { policy } = buildPolicy(
        rule({ accessMode: PlanFeatureAccessMode.DISABLED, limit: null }),
        0,
      );

      await expect(
        policy.reserve({ ...input, planId: 'free', billingPeriodKey: null }),
      ).resolves.toMatchObject({ ok: false, reason: 'FEATURE_DISABLED' });
    });

    it('never refuses an unlimited plan, however many calls were made', async () => {
      const { policy } = buildPolicy(
        rule({ accessMode: PlanFeatureAccessMode.ENABLED, limit: null }),
        1_000_000,
      );

      await expect(
        policy.reserve({ ...input, planId: 'unlimited', billingPeriodKey: null }),
      ).resolves.toEqual({ ok: true, reservationId: 'res-1' });
    });

    it('fails closed for a plan with no PLUGIN_CALLS rule', async () => {
      const { policy } = buildPolicy(null, 0);

      await expect(
        policy.reserve({ ...input, planId: 'custom', billingPeriodKey: null }),
      ).resolves.toMatchObject({ ok: false, reason: 'FEATURE_DISABLED' });
    });
  });

  describe('through the consumption service', () => {
    const build = (state: unknown, policy: Record<string, unknown>) =>
      new FeatureUsageConsumptionService(
        { getEnforcedForUser: vi.fn().mockResolvedValue(state) } as never,
        policy as never,
      );

    it('observes an administrator without refusing or holding anything', async () => {
      const policy = { reserve: vi.fn(), observe: vi.fn(async () => {}) };
      const service = build({ isAdmin: true, plan: { id: 'pro' } }, policy);

      await expect(service.reserve(input)).resolves.toEqual({
        allowed: true,
        reservationId: null,
      });
      expect(policy.reserve).not.toHaveBeenCalled();
    });

    it('commits a ran call and gives back a failed one', async () => {
      const policy = { consume: vi.fn(async () => {}), release: vi.fn(async () => {}) };
      const service = build({ isAdmin: false, plan: { id: 'free' } }, policy);

      await service.settle('res-1', FeatureSettlement.CONSUME);
      await service.settle('res-2', FeatureSettlement.RELEASE);

      expect(policy.consume).toHaveBeenCalledWith('res-1');
      expect(policy.release).toHaveBeenCalledWith('res-2');
    });
  });
});
