import { PlansService } from '../plans.service';
import { type PlansRepository } from '../../repositories/plans.repository';

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
  create: jest.fn(),
  update: jest.fn(),
  setActive: jest.fn(),
  makeDefault: jest.fn(),
  reorder: jest.fn(),
  countActiveAssignments: jest.fn(),
  replaceModelAccess: jest.fn(),
  assignUserToPlan: jest.fn(),
  listUserIdsOnPlan: jest.fn(),
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
  });
});
