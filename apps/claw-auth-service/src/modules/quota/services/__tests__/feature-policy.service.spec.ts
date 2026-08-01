import { FeaturePolicyService } from '../feature-policy.service';
import { type PlanBillingRepository } from '../../../plans/repositories/plan-billing.repository';
import { type FeatureUsageRepository } from '../../repositories/feature-usage.repository';

describe('FeaturePolicyService', () => {
  let service: FeaturePolicyService;
  let planBilling: { findFeatureRule: jest.Mock };
  let usage: { reserve: jest.Mock; countActive: jest.Mock; consume: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    planBilling = { findFeatureRule: jest.fn() };
    usage = {
      reserve: jest.fn().mockResolvedValue({ id: 'rec-1' }),
      countActive: jest.fn().mockResolvedValue(0),
      consume: jest.fn(),
      release: jest.fn(),
    };
    service = new FeaturePolicyService(
      planBilling as unknown as PlanBillingRepository,
      usage as unknown as FeatureUsageRepository,
    );
  });

  describe('evaluate', () => {
    it('denies when the plan has no rule for the feature (fails closed)', async () => {
      planBilling.findFeatureRule.mockResolvedValue(null);
      const snapshot = await service.evaluate({
        userId: 'u1',
        planId: 'p1',
        feature: 'COMPARE_MODE',
        billingPeriodKey: null,
      });
      expect(snapshot.allowed).toBe(false);
    });

    it('denies when the user has no plan at all', async () => {
      const snapshot = await service.evaluate({
        userId: 'u1',
        planId: null,
        feature: 'JUDGE_MODE',
        billingPeriodKey: null,
      });
      expect(snapshot.allowed).toBe(false);
      expect(planBilling.findFeatureRule).not.toHaveBeenCalled();
    });

    it('denies a DISABLED rule', async () => {
      planBilling.findFeatureRule.mockResolvedValue({
        accessMode: 'DISABLED',
        limit: null,
        window: 'MONTH',
      });
      const snapshot = await service.evaluate({
        userId: 'u1',
        planId: 'p1',
        feature: 'RESEARCH_MODE',
        billingPeriodKey: null,
      });
      expect(snapshot.allowed).toBe(false);
    });

    it('reports observed usage for an ENABLED rule without imposing a limit', async () => {
      planBilling.findFeatureRule.mockResolvedValue({
        accessMode: 'ENABLED',
        limit: null,
        window: 'MONTH',
      });
      usage.countActive.mockResolvedValue(23);
      const snapshot = await service.evaluate({
        userId: 'u1',
        planId: 'p1',
        feature: 'MEMORY',
        billingPeriodKey: null,
      });
      expect(snapshot).toMatchObject({ allowed: true, limit: null, used: 23, remaining: null });
    });

    it('reports remaining runs for a LIMITED rule', async () => {
      planBilling.findFeatureRule.mockResolvedValue({
        accessMode: 'LIMITED',
        limit: 10,
        window: 'MONTH',
      });
      usage.countActive.mockResolvedValue(4);
      const snapshot = await service.evaluate({
        userId: 'u1',
        planId: 'p1',
        feature: 'COMPARE_MODE',
        billingPeriodKey: null,
      });
      expect(snapshot).toMatchObject({ allowed: true, limit: 10, used: 4, remaining: 6 });
    });

    it('reports a spent LIMITED allowance as not allowed', async () => {
      planBilling.findFeatureRule.mockResolvedValue({
        accessMode: 'LIMITED',
        limit: 1,
        window: 'LIFETIME',
      });
      usage.countActive.mockResolvedValue(1);
      const snapshot = await service.evaluate({
        userId: 'u1',
        planId: 'p1',
        feature: 'COMPARE_MODE',
        billingPeriodKey: null,
      });
      expect(snapshot).toMatchObject({ allowed: false, remaining: 0 });
    });
  });

  describe('reserve', () => {
    it('holds a run when the allowance has room', async () => {
      planBilling.findFeatureRule.mockResolvedValue({
        accessMode: 'LIMITED',
        limit: 10,
        window: 'MONTH',
      });
      const result = await service.reserve({
        userId: 'u1',
        planId: 'p1',
        feature: 'COMPARE_MODE',
        requestId: 'req-1',
        billingPeriodKey: null,
      });
      expect(result).toEqual({ ok: true, reservationId: 'rec-1' });
    });

    it('refuses a second lifetime trial once the first is spent', async () => {
      planBilling.findFeatureRule.mockResolvedValue({
        accessMode: 'LIMITED',
        limit: 1,
        window: 'LIFETIME',
      });
      usage.countActive.mockResolvedValue(1);
      const result = await service.reserve({
        userId: 'u1',
        planId: 'p1',
        feature: 'JUDGE_MODE',
        requestId: 'req-2',
        billingPeriodKey: null,
      });
      expect(result).toEqual({ ok: false, reason: 'FEATURE_TRIAL_EXHAUSTED', used: 1, limit: 1 });
      expect(usage.reserve).not.toHaveBeenCalled();
    });

    it('counts a LIFETIME allowance against a period-free key so it never resets', async () => {
      planBilling.findFeatureRule.mockResolvedValue({
        accessMode: 'LIMITED',
        limit: 1,
        window: 'LIFETIME',
      });
      await service.reserve({
        userId: 'u1',
        planId: 'p1',
        feature: 'CRITIC_REVIEW',
        requestId: 'req-3',
        billingPeriodKey: null,
      });
      expect(usage.countActive).toHaveBeenCalledWith(
        expect.objectContaining({ periodKey: 'LIFETIME' }),
      );
    });

    it('refuses a DISABLED feature without touching the ledger', async () => {
      planBilling.findFeatureRule.mockResolvedValue({
        accessMode: 'DISABLED',
        limit: null,
        window: 'MONTH',
      });
      const result = await service.reserve({
        userId: 'u1',
        planId: 'p1',
        feature: 'WORKSPACES',
        requestId: 'req-4',
        billingPeriodKey: null,
      });
      expect(result).toMatchObject({ ok: false, reason: 'FEATURE_DISABLED' });
      expect(usage.reserve).not.toHaveBeenCalled();
    });

    it('does not meter an ENABLED feature', async () => {
      planBilling.findFeatureRule.mockResolvedValue({
        accessMode: 'ENABLED',
        limit: null,
        window: 'MONTH',
      });
      const result = await service.reserve({
        userId: 'u1',
        planId: 'p1',
        feature: 'MEMORY',
        requestId: 'req-5',
        billingPeriodKey: null,
      });
      expect(result.ok).toBe(true);
      expect(usage.countActive).not.toHaveBeenCalled();
    });
  });

  it('consume marks the held run as spent', async () => {
    await service.consume('rec-1');
    expect(usage.consume).toHaveBeenCalledWith('rec-1');
  });

  it('release gives the run back so a failed execution is not charged', async () => {
    await service.release('rec-1');
    expect(usage.release).toHaveBeenCalledWith('rec-1');
  });
});
