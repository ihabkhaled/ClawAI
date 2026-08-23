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

const mockRepo = (): Record<keyof PlansRepository, jest.Mock> => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  findDefault: jest.fn(),
  findEffectiveForUser: jest.fn(),
  findActiveTrialState: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  setActive: jest.fn(),
  makeDefault: jest.fn(),
  reorder: jest.fn(),
  countActiveAssignments: jest.fn(),
  replaceModelAccess: jest.fn(),
  assignUserToPlan: jest.fn(),
  assignTrialPlanOnce: jest.fn(),
  listUserIdsOnPlan: jest.fn(),
  findRetirementReplacement: jest.fn(),
  retirePlan: jest.fn(),
  listPendingRetirementMigrations: jest.fn(),
  recordRetirementMigrationOutcome: jest.fn(),
});

describe('PlansService', () => {
  let service: PlansService;
  let repo: ReturnType<typeof mockRepo>;
  let exposedModels: { findExposed: jest.Mock };

  beforeEach(() => {
    repo = mockRepo();
    // Default: connector-service says every requested pair is real and exposed.
    // Tests that care about rejection narrow this per case.
    exposedModels = {
      findExposed: jest.fn(async (pairs: Array<{ provider: string; model: string }>) => pairs),
    };
    service = new PlansService(
      repo as unknown as PlansRepository,
      exposedModels as unknown as ExposedModelClient,
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

  it('assignUserToPlan assigns an active plan', async () => {
    repo.findById.mockResolvedValue(proPlan);
    await service.assignUserToPlan('u1', 'plan-pro', 'admin');
    expect(repo.assignUserToPlan).toHaveBeenCalledWith('u1', 'plan-pro', 'admin');
  });

  it('rejects a trial plan already redeemed by the account', async () => {
    repo.findById.mockResolvedValue({ ...freePlan, isTrial: true, trialDurationDays: 30 });
    repo.assignTrialPlanOnce.mockResolvedValue(null);
    await expect(service.assignUserToPlan('u1', 'plan-free', 'admin')).rejects.toThrow(
      /already used/i,
    );
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
  });
});
