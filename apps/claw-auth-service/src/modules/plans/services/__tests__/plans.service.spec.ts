import { PlansService } from '../plans.service';
import { type PlansRepository } from '../../repositories/plans.repository';
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
  create: jest.fn(),
  update: jest.fn(),
  setActive: jest.fn(),
  makeDefault: jest.fn(),
  reorder: jest.fn(),
  countActiveAssignments: jest.fn(),
  replaceModelAccess: jest.fn(),
  assignUserToPlan: jest.fn(),
  listUserIdsOnPlan: jest.fn(),
  findRetirementReplacement: jest.fn(),
  retirePlan: jest.fn(),
  listPendingRetirementMigrations: jest.fn(),
  recordRetirementMigrationOutcome: jest.fn(),
});

describe('PlansService', () => {
  let service: PlansService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(() => {
    repo = mockRepo();
    service = new PlansService(repo as unknown as PlansRepository);
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
    expect(view.modelAccessMode).toBe(PlanModelAccessMode.ALLOW_ALL);
  });
});
