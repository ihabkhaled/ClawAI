import { type Mock, vi } from 'vitest';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import { PlansService } from '../plans.service';
import { type PlansRepository } from '../../repositories/plans.repository';
import { type ExposedModelClient } from '../../clients/exposed-model.client';
import { PlanModelAccessMode } from '../../../../generated/prisma';

const freePlan = {
  id: 'plan-free',
  name: 'Free',
  slug: 'free',
  description: null,
  priceMonthly: null,
  priceYearly: null,
  currency: 'USD',
  displayOrder: 0,
  isDefault: true,
  isPopular: false,
  popularKey: null,
  isActive: true,
  isPublic: true,
  dailyTokenQuota: 50000,
  weeklyTokenQuota: 20_000,
  monthlyTokenQuota: null,
  maxChatsPerDay: null,
  maxMessagesPerDay: null,
  maxWorkspaceConnections: null,
  maxContextPacks: null,
  maxMemoryItems: null,
  allowCompareMode: false,
  allowJudgeMode: false,
  allowResearchMode: false,
  allowWorkspaces: true,
  allowMemory: true,
  allowContextPacks: true,
  modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
  allowedCostClasses: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  modelAccess: [],
};
const proPlan = {
  ...freePlan,
  id: 'plan-pro',
  slug: 'pro',
  isDefault: false,
  dailyTokenQuota: 500000,
};

const mockRepo = (): Record<keyof PlansRepository, Mock> => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  findDefault: vi.fn(),
  findEffectiveForUser: vi.fn(),
  findActiveTrialState: vi.fn(),
  findLatestAssignmentForUser: vi.fn(),
  findTrialRedemption: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setActive: vi.fn(),
  makeDefault: vi.fn(),
  makePopular: vi.fn(),
  clearPopular: vi.fn(),
  reorder: vi.fn(),
  countActiveAssignments: vi.fn(),
  replaceModelAccess: vi.fn(),
  assignUserToPlan: vi.fn(),
  assignDefaultPlan: vi.fn(),
  assignTrialPlanOnce: vi.fn(),
  assignAdminTrialGrant: vi.fn(),
  extendTrial: vi.fn(),
  listUserIdsOnPlan: vi.fn(),
  findRetirementReplacement: vi.fn(),
  retirePlan: vi.fn(),
  listPendingRetirementMigrations: vi.fn(),
  recordRetirementMigrationOutcome: vi.fn(),
  findUserMutabilityFacts: vi.fn().mockResolvedValue({ id: 'user-1', isSuperAdmin: false }),
});

describe('PlansService', () => {
  let service: PlansService;
  let repo: ReturnType<typeof mockRepo>;
  let exposedModels: { findExposed: Mock };
  let rabbit: { publish: Mock };

  beforeEach(() => {
    repo = mockRepo();
    // Default: connector-service says every requested pair is real and exposed.
    // Tests that care about rejection narrow this per case.
    exposedModels = {
      findExposed: vi.fn(async (pairs: Array<{ provider: string; model: string }>) => pairs),
    };
    // The audit log is a real side effect of a model-access mutation, so the
    // publisher is stubbed rather than omitted; the assertions below check that
    // both the grant and the refusal reach it.
    rabbit = { publish: vi.fn(async () => {}) };
    service = new PlansService(
      repo as unknown as PlansRepository,
      exposedModels as unknown as ExposedModelClient,
      rabbit as unknown as RabbitMQService,
    );
  });

  it('createPlan rejects duplicate slug', async () => {
    repo.findBySlug.mockResolvedValue(freePlan);
    await expect(
      service.createPlan({ name: 'Free', slug: 'free', dailyTokenQuota: 1 } as never),
    ).rejects.toThrow(/already exists/);
  });

  it('deactivatePlan refuses to deactivate the default plan', async () => {
    repo.findById.mockResolvedValue(freePlan);
    await expect(service.deactivatePlan('plan-free')).rejects.toThrow(/default/);
    expect(repo.setActive).not.toHaveBeenCalled();
  });

  it('retirePlan migrates users to the deterministic upper replacement', async () => {
    repo.findById.mockResolvedValue(proPlan);
    repo.findRetirementReplacement.mockResolvedValue({ ...proPlan, id: 'plan-team', slug: 'team' });
    repo.retirePlan.mockResolvedValue({
      sourcePlanId: 'plan-pro',
      replacementPlanId: 'plan-team',
      migratedAssignments: 3,
      billingPending: 2,
      alreadyRetired: false,
    });

    const result = await service.retirePlan('plan-pro');

    expect(repo.findRetirementReplacement).toHaveBeenCalledWith('plan-pro');
    expect(repo.retirePlan).toHaveBeenCalledWith('plan-pro', 'plan-team');
    expect(result.billingPending).toBe(2);
  });

  it('retirePlan refuses to retire the default plan', async () => {
    repo.findById.mockResolvedValue(freePlan);
    await expect(service.retirePlan('plan-free')).rejects.toThrow(/default/);
    expect(repo.retirePlan).not.toHaveBeenCalled();
  });

  it('activatePlan refuses to resurrect a retired plan', async () => {
    repo.findById.mockResolvedValue({ ...proPlan, lifecycleStatus: 'RETIRED' });
    await expect(service.activatePlan('plan-pro')).rejects.toThrow(/retired/);
    expect(repo.setActive).not.toHaveBeenCalled();
  });

  it('retirePlan replays the persisted replacement without selecting again', async () => {
    repo.findById.mockResolvedValue({
      ...proPlan,
      lifecycleStatus: 'RETIRED',
      replacementPlanId: 'plan-persisted',
    });
    repo.retirePlan.mockResolvedValue({
      sourcePlanId: 'plan-pro',
      replacementPlanId: 'plan-persisted',
      migratedAssignments: 1,
      billingPending: 1,
      alreadyRetired: true,
    });
    const result = await service.retirePlan('plan-pro');
    expect(repo.findRetirementReplacement).not.toHaveBeenCalled();
    expect(repo.retirePlan).toHaveBeenCalledWith('plan-pro', 'plan-persisted');
    expect(result.alreadyRetired).toBe(true);
  });

  it('assignUserToPlan refuses an inactive plan', async () => {
    repo.findById.mockResolvedValue({ ...proPlan, isActive: false });
    await expect(service.assignUserToPlan('u1', 'plan-pro', 'admin')).rejects.toThrow(/inactive/);
  });

  it('assignUserToPlan assigns an active plan with a duration and reason', async () => {
    repo.findById.mockResolvedValue(proPlan);
    await service.assignUserToPlan('u1', 'plan-pro', 'admin', 3, 'Support gesture');
    expect(repo.assignUserToPlan).toHaveBeenCalledWith(
      'u1',
      'plan-pro',
      'admin',
      expect.any(Date),
      'Support gesture',
      expect.any(Date),
    );
  });

  it('assignUserToPlan grants a non-trial plan for a number of DAYS', async () => {
    repo.findById.mockResolvedValue(proPlan);
    const before = Date.now();
    await service.assignUserToPlan('u1', 'plan-pro', 'admin', undefined, 'Pilot', 90);
    const validUntil = repo.assignUserToPlan.mock.calls[0]?.[3] as Date;
    expect(validUntil.getTime() - before).toBeGreaterThanOrEqual(90 * 86_400_000);
    expect(validUntil.getTime() - before).toBeLessThan(90 * 86_400_000 + 60_000);
  });

  it('assignUserToPlan refuses a day count outside 1..3650', async () => {
    repo.findById.mockResolvedValue(proPlan);
    await expect(
      service.assignUserToPlan('u1', 'plan-pro', 'admin', undefined, 'x', 3651),
    ).rejects.toThrow(/days/i);
    await expect(
      service.assignUserToPlan('u1', 'plan-pro', 'admin', undefined, 'x', 0),
    ).rejects.toThrow(/days/i);
    expect(repo.assignUserToPlan).not.toHaveBeenCalled();
  });

  it('sets a user to the Free trial plan for N days, reopening a spent trial', async () => {
    repo.findById.mockResolvedValue({ ...freePlan, isTrial: true, trialDurationDays: 30 });
    const before = Date.now();
    await service.assignUserToPlan('u1', 'plan-free', 'admin', undefined, 'Goodwill', 365);
    expect(repo.assignAdminTrialGrant).toHaveBeenCalledWith(
      'u1',
      'plan-free',
      'admin',
      expect.any(Date),
      'Goodwill',
      expect.any(Date),
    );
    const expiresAt = repo.assignAdminTrialGrant.mock.calls[0]?.[3] as Date;
    expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(365 * 86_400_000);
    expect(repo.assignTrialPlanOnce).not.toHaveBeenCalled();
    expect(repo.assignDefaultPlan).not.toHaveBeenCalled();
  });

  it('a Free-for-N-days grant needs a reason and a sane day count', async () => {
    repo.findById.mockResolvedValue({ ...freePlan, isTrial: true, trialDurationDays: 30 });
    await expect(
      service.assignUserToPlan('u1', 'plan-free', 'admin', undefined, '  ', 10),
    ).rejects.toThrow(/reason/i);
    await expect(
      service.assignUserToPlan('u1', 'plan-free', 'admin', undefined, 'ok', 5000),
    ).rejects.toThrow(/days/i);
    expect(repo.assignAdminTrialGrant).not.toHaveBeenCalled();
  });

  describe('extendUserTrial', () => {
    const now = Date.now();
    const redemption = (expiresAt: Date) => ({
      id: 'r1',
      userId: 'u1',
      planId: 'plan-free',
      assignmentId: 'a1',
      startedAt: new Date(now - 10 * 86_400_000),
      expiresAt,
      createdAt: new Date(),
    });

    it('stacks the days onto a trial that is still running', async () => {
      const expiresAt = new Date(now + 5 * 86_400_000);
      repo.findTrialRedemption.mockResolvedValue(redemption(expiresAt));
      repo.findLatestAssignmentForUser.mockResolvedValue({ id: 'a1', planId: 'plan-free' });

      const result = await service.extendUserTrial('u1', 'admin', 60, 'Support');

      expect(repo.extendTrial).toHaveBeenCalledWith(
        'u1',
        'a1',
        'plan-free',
        new Date(expiresAt.getTime() + 60 * 86_400_000),
      );
      expect(result.daysRemaining).toBe(65);
    });

    it('reopens a lapsed trial for N days from today', async () => {
      repo.findTrialRedemption.mockResolvedValue(redemption(new Date(now - 3 * 86_400_000)));
      repo.findLatestAssignmentForUser.mockResolvedValue({ id: 'a1', planId: 'plan-free' });

      const result = await service.extendUserTrial('u1', 'admin', 14, 'Reopen');

      expect(result.daysRemaining).toBe(14);
    });

    it('refuses a user who never had a trial', async () => {
      repo.findTrialRedemption.mockResolvedValue(null);
      repo.findLatestAssignmentForUser.mockResolvedValue(null);
      await expect(service.extendUserTrial('u1', 'admin', 5, 'x')).rejects.toThrow(/never had/);
      expect(repo.extendTrial).not.toHaveBeenCalled();
    });

    it('refuses a user whose trial was replaced by another grant', async () => {
      repo.findTrialRedemption.mockResolvedValue(redemption(new Date(now + 86_400_000)));
      repo.findLatestAssignmentForUser.mockResolvedValue({ id: 'a-pro', planId: 'plan-pro' });
      await expect(service.extendUserTrial('u1', 'admin', 5, 'x')).rejects.toThrow(
        /no longer on their free trial/,
      );
      expect(repo.extendTrial).not.toHaveBeenCalled();
    });

    it('audit-logs the action with actor, days and reason', async () => {
      repo.findTrialRedemption.mockResolvedValue(redemption(new Date(now + 86_400_000)));
      repo.findLatestAssignmentForUser.mockResolvedValue({ id: 'a1', planId: 'plan-free' });
      await service.extendUserTrial('u1', 'admin', 5, 'Because');
      const audited = rabbit.publish.mock.calls.find(
        (call) => call[1]?.action === 'plan_trial_days_added',
      );
      expect(audited?.[1]?.metadata).toMatchObject({
        userId: 'u1',
        actorId: 'admin',
        days: 5,
        reason: 'Because',
      });
    });
  });

  describe('updatePlan trial length', () => {
    it('refuses a length on a plan that is not a trial', async () => {
      repo.findById.mockResolvedValue({
        ...proPlan,
        weeklyTokenQuota: null,
        isTrial: false,
        trialDurationDays: null,
      });
      await expect(service.updatePlan('plan-pro', { trialDurationDays: 90 })).rejects.toThrow(
        /Only a trial plan/,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('accepts any length on an existing trial plan', async () => {
      repo.findById.mockResolvedValue({
        ...freePlan,
        weeklyTokenQuota: null,
        isTrial: true,
        trialDurationDays: 30,
      });
      repo.update.mockResolvedValue({
        ...freePlan,
        weeklyTokenQuota: null,
        isTrial: true,
        trialDurationDays: 90,
      });
      const view = await service.updatePlan('plan-free', { trialDurationDays: 90 });
      expect(repo.update).toHaveBeenCalledWith('plan-free', { trialDurationDays: 90 });
      expect(view.trialDurationDays).toBe(90);
    });
  });

  it('assignUserToPlan refuses a missing duration for a non-trial grant', async () => {
    repo.findById.mockResolvedValue(proPlan);
    await expect(
      service.assignUserToPlan('u1', 'plan-pro', 'admin', undefined, 'Support gesture'),
    ).rejects.toThrow(/duration/i);
    expect(repo.assignUserToPlan).not.toHaveBeenCalled();
  });

  it('assignUserToPlan refuses a duration over the 60-month ceiling', async () => {
    repo.findById.mockResolvedValue(proPlan);
    await expect(
      service.assignUserToPlan('u1', 'plan-pro', 'admin', 61, 'Support gesture'),
    ).rejects.toThrow(/duration/i);
  });

  it('assignUserToPlan refuses a missing reason for a non-trial grant', async () => {
    repo.findById.mockResolvedValue(proPlan);
    await expect(service.assignUserToPlan('u1', 'plan-pro', 'admin', 3, undefined)).rejects.toThrow(
      /reason/i,
    );
    expect(repo.assignUserToPlan).not.toHaveBeenCalled();
  });

  it('assignUserToPlan refuses a blank (whitespace-only) reason', async () => {
    repo.findById.mockResolvedValue(proPlan);
    await expect(service.assignUserToPlan('u1', 'plan-pro', 'admin', 3, '   ')).rejects.toThrow(
      /reason/i,
    );
  });

  it('the trial path stays unaffected by duration/reason validation', async () => {
    repo.findById.mockResolvedValue({ ...freePlan, isTrial: true, trialDurationDays: 30 });
    repo.assignTrialPlanOnce.mockResolvedValue({ id: 'assignment-1' });
    // No durationMonths/grantReason passed — must not throw.
    await expect(service.assignUserToPlan('u1', 'plan-free', 'admin')).resolves.toBeDefined();
    expect(repo.assignUserToPlan).not.toHaveBeenCalled();
  });

  it('rejects a NON-default trial plan already redeemed by the account', async () => {
    repo.findById.mockResolvedValue({
      ...freePlan,
      isDefault: false,
      isTrial: true,
      trialDurationDays: 30,
    });
    repo.assignTrialPlanOnce.mockResolvedValue(null);
    await expect(service.assignUserToPlan('u1', 'plan-free', 'admin')).rejects.toThrow(
      /already used/i,
    );
  });

  it('downgrades to the DEFAULT plan even when its trial is already spent', async () => {
    // The default plan is also flagged isTrial, so every downgrade to free ran
    // the trial path, collided with the existing redemption row and failed —
    // once a user had used their trial there was no way back to free at all.
    repo.findById.mockResolvedValue({ ...freePlan, isTrial: true, trialDurationDays: 30 });
    repo.assignTrialPlanOnce.mockResolvedValue(null);

    await expect(service.assignUserToPlan('u1', 'plan-free', 'admin')).resolves.toBeDefined();

    expect(repo.assignDefaultPlan).toHaveBeenCalledWith('u1', 'plan-free');
    // The redemption row is untouched: a spent trial stays spent.
    expect(repo.assignUserToPlan).not.toHaveBeenCalled();
  });

  it('getDefaultPlan throws when none configured', async () => {
    repo.findDefault.mockResolvedValue(null);
    await expect(service.getDefaultPlan()).rejects.toThrow(/default plan/i);
  });

  it('maps Decimal prices to numbers in the view', async () => {
    repo.findById.mockResolvedValue({
      ...proPlan,
      priceMonthly: '20' as unknown as number,
    });
    const view = await service.getPlan('plan-pro');
    expect(view.priceMonthly).toBe(20);
    expect(view.dailyTokenQuota).toBe(500000);
    expect(view.weeklyTokenQuota).toBe(20_000);
    expect(view.modelAccessMode).toBe(PlanModelAccessMode.ALLOW_ALL);
  });

  describe('setModelAccess', () => {
    // Reuse the full fixture: toView reads more of the row than a stub carries.
    const plan = freePlan;

    beforeEach(() => {
      repo.findById.mockResolvedValue(plan);
      repo.replaceModelAccess.mockResolvedValue({ ...plan, modelAccess: [] });
    });

    it('persists rows that connector-service confirms are exposed', async () => {
      const models = [{ provider: 'GEMINI', model: 'gemini-2.5-pro', isAllowed: true }];

      await service.setModelAccess(freePlan.id, { models } as never);

      expect(exposedModels.findExposed).toHaveBeenCalledWith([
        { provider: 'GEMINI', model: 'gemini-2.5-pro' },
      ]);
      expect(repo.replaceModelAccess).toHaveBeenCalledWith(freePlan.id, models);
    });

    it('refuses a model that was never synced and writes nothing', async () => {
      // The whole point of the feature: provider and model arrive as free
      // strings, and before this check a typo or a guess became a durable
      // entitlement indistinguishable from a real one.
      exposedModels.findExposed.mockResolvedValue([]);

      await expect(
        service.setModelAccess(freePlan.id, {
          models: [{ provider: 'GEMINI', model: 'totally-made-up', isAllowed: true }],
        } as never),
      ).rejects.toThrow(/not available to assign/i);

      expect(repo.replaceModelAccess).not.toHaveBeenCalled();
    });

    it('rejects the whole request when only one row is unknown', async () => {
      // All or nothing: a partially applied plan is harder to notice than a
      // refused one.
      exposedModels.findExposed.mockResolvedValue([
        { provider: 'GEMINI', model: 'gemini-2.5-pro' },
      ]);

      await expect(
        service.setModelAccess(freePlan.id, {
          models: [
            { provider: 'GEMINI', model: 'gemini-2.5-pro', isAllowed: true },
            { provider: 'OPENAI', model: 'ghost-model', isAllowed: true },
          ],
        } as never),
      ).rejects.toThrow(/ghost-model/);

      expect(repo.replaceModelAccess).not.toHaveBeenCalled();
    });

    it('does not call connector-service when clearing every model', async () => {
      // An empty list removes access. There is nothing to validate, and asking
      // would fail the request whenever connector-service is down.
      await service.setModelAccess(freePlan.id, { models: [] } as never);

      expect(exposedModels.findExposed).not.toHaveBeenCalled();
      expect(repo.replaceModelAccess).toHaveBeenCalledWith(freePlan.id, []);
    });

    it('audits the grant with the plan and the model identities', async () => {
      // Who was entitled to what has to survive the request. A service log is
      // not enough: it is not queryable and it is not retained with the other
      // administrative actions.
      await service.setModelAccess(freePlan.id, {
        models: [{ provider: 'GEMINI', model: 'gemini-2.5-pro', isAllowed: true }],
      } as never);

      const audited = rabbit.publish.mock.calls.find(
        (call) => call[1]?.action === 'plan_model_access_replaced',
      );
      expect(audited).toBeDefined();
      expect(audited?.[1]?.metadata).toEqual({
        planId: freePlan.id,
        models: ['GEMINI/gemini-2.5-pro'],
      });
    });

    it('audits a refusal so repeated probing is visible', async () => {
      exposedModels.findExposed.mockResolvedValue([]);

      await expect(
        service.setModelAccess(freePlan.id, {
          models: [{ provider: 'GEMINI', model: 'ghost-model', isAllowed: true }],
        } as never),
      ).rejects.toThrow();

      const audited = rabbit.publish.mock.calls.find(
        (call) => call[1]?.action === 'plan_model_access_refused',
      );
      expect(audited).toBeDefined();
      expect(audited?.[1]?.metadata).toEqual({
        planId: freePlan.id,
        rejected: ['GEMINI/ghost-model'],
      });
    });
  });

  describe('the most-popular badge', () => {
    it('is a separate write path from the signup plan', async () => {
      // One flag used to serve both, so the badge always followed whichever
      // plan new signups happened to receive.
      repo.findById.mockResolvedValue(proPlan);

      await service.setPopular('plan-pro');

      expect(repo.makePopular).toHaveBeenCalledWith('plan-pro');
      expect(repo.makeDefault).not.toHaveBeenCalled();
    });

    it('does not touch the signup plan when the badge moves', async () => {
      repo.findById.mockResolvedValue(freePlan);

      await service.setPopular('plan-free');

      expect(repo.makeDefault).not.toHaveBeenCalled();
    });

    it('can clear the badge entirely, leaving the pricing page with none', async () => {
      repo.findAll.mockResolvedValue([]);

      await service.clearPopular();

      expect(repo.clearPopular).toHaveBeenCalledTimes(1);
    });

    it('refuses an unknown plan before writing', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.setPopular('nope')).rejects.toThrow();
      expect(repo.makePopular).not.toHaveBeenCalled();
    });
  });
});
