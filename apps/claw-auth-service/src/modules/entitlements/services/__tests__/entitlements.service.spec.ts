import { PlanModelAccessMode, UserRole } from '@claw/shared-types';
import { EntitlementsService } from '../entitlements.service';
import { type AuthRepository } from '../../../auth/repositories/auth.repository';
import { type RolesService } from '../../../roles/services/roles.service';
import { type PlansRepository } from '../../../plans/repositories/plans.repository';
import { type QuotaService } from '../../../quota/services/quota.service';
import { type PlanWithAccess } from '../../../plans/types/plans.types';

// Verifies the documented PlanModelAccess contract: an EMPTY rows array means
// "no model restriction configured" — the frontend ModelSelector must therefore
// receive every connector model regardless of plan tier. This test pins the
// "empty = unrestricted" semantics so a future filter cannot silently regress
// the chat picker for Free/Pro users.
describe('EntitlementsService — PlanModelAccess "empty = unrestricted" contract', () => {
  let service: EntitlementsService;
  let authRepoMock: jest.Mocked<Pick<AuthRepository, 'findUserById'>>;
  let rolesServiceMock: jest.Mocked<Pick<RolesService, 'resolvePermissionsForUser'>>;
  let plansRepoMock: jest.Mocked<
    Pick<PlansRepository, 'findById' | 'findDefault' | 'findEffectiveForUser'>
  >;
  let quotaServiceMock: jest.Mocked<Pick<QuotaService, 'getSnapshot'>>;

  const baseUser = {
    id: 'u1',
    email: 'a@b.test',
    username: 'alice',
    role: UserRole.USER,
    roleId: null,
    activePlanId: 'plan-free',
    status: 'ACTIVE',
    passwordHash: 'x',
    preferences: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Awaited<ReturnType<AuthRepository['findUserById']>>;

  const freePlanWithNoModelAccess: PlanWithAccess = {
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
    allowCriticReview: false,
    allowWorkspaces: true,
    allowMemory: true,
    allowContextPacks: true,
    modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
    allowedCostClasses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    modelAccess: [],
  } as unknown as PlanWithAccess;

  beforeEach(() => {
    authRepoMock = { findUserById: jest.fn() };
    rolesServiceMock = { resolvePermissionsForUser: jest.fn() };
    plansRepoMock = {
      findById: jest.fn(),
      findDefault: jest.fn().mockResolvedValue(null),
      findEffectiveForUser: jest.fn(),
    };
    quotaServiceMock = { getSnapshot: jest.fn() };

    service = new EntitlementsService(
      authRepoMock as unknown as AuthRepository,
      rolesServiceMock as unknown as RolesService,
      plansRepoMock as unknown as PlansRepository,
      quotaServiceMock as unknown as QuotaService,
    );

    authRepoMock.findUserById.mockResolvedValue(baseUser);
    rolesServiceMock.resolvePermissionsForUser.mockResolvedValue([]);
    quotaServiceMock.getSnapshot.mockResolvedValue({
      dailyLimit: 50000,
      used: 0,
      remaining: 50000,
    });
  });

  it('returns allowedModels=[] (no restriction) when the plan has zero PlanModelAccess rows', async () => {
    plansRepoMock.findById.mockResolvedValue(freePlanWithNoModelAccess);
    plansRepoMock.findEffectiveForUser.mockResolvedValue(freePlanWithNoModelAccess);

    const result = await service.getForUser('u1');

    // Empty allowedModels === "no plan-side restriction configured". The chat
    // ModelSelector then sources its full list from GET /connectors/available-models
    // without any client-side filtering. This is the v1 hot path the type
    // comment in entitlements.types.ts pins as the default behaviour.
    expect(result.allowedModels).toEqual([]);
    expect(result.allowedProviders).toEqual([]);
    expect(result.modelAccessMode).toBe(PlanModelAccessMode.ALLOW_ALL);
    expect(result.plan).not.toBeNull();
    expect(result.plan?.slug).toBe('free');
    expect(result.plan?.limits).toEqual({
      dailyTokens: 50000,
      weeklyTokens: null,
      monthlyTokens: null,
      chatsPerDay: null,
    });
    expect(result.quota.adminBypass).toBe(false);
  });

  it('returns only isAllowed=true rows when PlanModelAccess is populated', async () => {
    const planWithMixedAccess: PlanWithAccess = {
      ...freePlanWithNoModelAccess,
      modelAccessMode: PlanModelAccessMode.ALLOW_LIST,
      modelAccess: [
        {
          id: 'pma1',
          planId: 'plan-free',
          provider: 'OPENAI',
          model: 'gpt-4.1',
          isAllowed: true,
          allowAsPrimary: true,
          allowAsFallback: true,
          allowAsJudge: false,
          allowInCompare: true,
          dailyTokenLimitOverride: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'pma2',
          planId: 'plan-free',
          provider: 'ANTHROPIC',
          model: 'claude-opus-4',
          isAllowed: false,
          allowAsPrimary: false,
          allowAsFallback: false,
          allowAsJudge: false,
          allowInCompare: false,
          dailyTokenLimitOverride: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    } as unknown as PlanWithAccess;

    plansRepoMock.findById.mockResolvedValue(planWithMixedAccess);
    plansRepoMock.findEffectiveForUser.mockResolvedValue(planWithMixedAccess);

    const result = await service.getForUser('u1');

    expect(result.allowedModels).toHaveLength(1);
    expect(result.allowedModels[0]?.provider).toBe('OPENAI');
    expect(result.allowedModels[0]?.model).toBe('gpt-4.1');
    expect(result.allowedProviders).toEqual(['OPENAI']);
    expect(result.modelAccessMode).toBe(PlanModelAccessMode.ALLOW_LIST);
  });

  it('returns allowedModels=[] when the user has no active plan', async () => {
    authRepoMock.findUserById.mockResolvedValue({
      ...baseUser,
      activePlanId: null,
    } as unknown as Awaited<ReturnType<AuthRepository['findUserById']>>);

    const result = await service.getForUser('u1');

    expect(result.allowedModels).toEqual([]);
    expect(result.modelAccessMode).toBe(PlanModelAccessMode.DENY_ALL);
    expect(result.plan).toBeNull();
  });

  it('falls back to the free plan when the paid assignment has expired', async () => {
    plansRepoMock.findEffectiveForUser.mockResolvedValue(null);
    plansRepoMock.findDefault.mockResolvedValue(freePlanWithNoModelAccess);

    const result = await service.getForUser('u1');

    expect(result.plan?.slug).toBe('free');
    expect(plansRepoMock.findById).not.toHaveBeenCalled();
  });

  it('returns one centralized unlimited effective plan for an admin assigned a restricted plan', async () => {
    authRepoMock.findUserById.mockResolvedValue({
      ...baseUser,
      role: UserRole.ADMIN,
      activePlanId: 'plan-team',
    } as unknown as Awaited<ReturnType<AuthRepository['findUserById']>>);
    plansRepoMock.findEffectiveForUser.mockResolvedValue({
      ...freePlanWithNoModelAccess,
      id: 'plan-team',
      name: 'Team',
      slug: 'team',
      dailyTokenQuota: 5000,
      weeklyTokenQuota: 10_000,
      monthlyTokenQuota: 20_000,
      maxChatsPerDay: 5,
      allowResearchMode: false,
      allowCriticReview: false,
    } as unknown as PlanWithAccess);

    const result = await service.getForUser('u1');

    expect(result.plan).toEqual({
      id: 'admin-unlimited',
      slug: 'admin',
      name: 'Admin',
      limits: {
        dailyTokens: null,
        weeklyTokens: null,
        monthlyTokens: null,
        chatsPerDay: null,
      },
      featureGates: {
        allowCompareMode: true,
        allowJudgeMode: true,
        allowResearchMode: true,
        allowCriticReview: true,
        allowWorkspaces: true,
        allowMemory: true,
        allowContextPacks: true,
      },
    });
    expect(result.modelAccessMode).toBe(PlanModelAccessMode.ALLOW_ALL);
    expect(result.allowedModels).toEqual([]);
    expect(result.allowedProviders).toEqual([]);
    expect(result.quota).toEqual({
      dailyLimit: 0,
      used: 0,
      remaining: 0,
      unlimited: true,
      adminBypass: true,
    });
    expect(plansRepoMock.findEffectiveForUser).not.toHaveBeenCalled();
    expect(quotaServiceMock.getSnapshot).not.toHaveBeenCalled();
  });
});
