import { AccessControlService } from '../access-control.service';

const getEntitlements = jest.fn();
const finalizeQuota = jest.fn();
const recordFeatureUsage = jest.fn();

jest.mock('@claw/shared-entitlements', () => {
  const actual = jest.requireActual('@claw/shared-entitlements');
  return {
    ...actual,
    EntitlementsAdapter: jest.fn().mockImplementation(() => ({
      getEntitlements: (...args: unknown[]) => getEntitlements(...args),
      finalizeQuota: (...args: unknown[]) => finalizeQuota(...args),
      recordFeatureUsage: (...args: unknown[]) => recordFeatureUsage(...args),
    })),
  };
});

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: jest.fn().mockReturnValue({ AUTH_SERVICE_URL: 'http://auth:4001' }) },
}));

const ent = (overrides: Record<string, unknown> = {}) => ({
  userId: 'u1',
  role: 'USER',
  isAdmin: false,
  permissions: ['CHAT_USE'],
  plan: { id: 'p1', slug: 'free', name: 'Free', featureGates: {} },
  allowedModels: [],
  allowedProviders: [],
  quota: { dailyLimit: 50000, used: 0, remaining: 50000, unlimited: false },
  ...overrides,
});

describe('AccessControlService', () => {
  let service: AccessControlService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AccessControlService();
  });

  it('allows and returns entitlements when no model restriction and quota remaining', async () => {
    getEntitlements.mockResolvedValue(ent());
    await expect(service.assertCanSendMessage('u1', {})).resolves.toMatchObject({
      userId: 'u1',
      isAdmin: false,
    });
  });

  it('rejects a forbidden manual model (403)', async () => {
    getEntitlements.mockResolvedValue(
      ent({
        allowedModels: [
          {
            provider: 'OPENAI',
            model: 'gpt-4o',
            isAllowed: true,
            allowAsPrimary: true,
            allowAsFallback: true,
            allowAsJudge: false,
            allowInCompare: true,
            dailyTokenLimitOverride: null,
          },
        ],
      }),
    );
    await expect(
      service.assertCanSendMessage('u1', { provider: 'ANTHROPIC', model: 'claude-opus' }),
    ).rejects.toMatchObject({ code: 'MODEL_NOT_ALLOWED_FOR_PLAN' });
  });

  it('rejects when quota exhausted (429)', async () => {
    getEntitlements.mockResolvedValue(
      ent({ quota: { dailyLimit: 100, used: 100, remaining: 0, unlimited: false } }),
    );
    await expect(service.assertCanSendMessage('u1', {})).rejects.toMatchObject({
      code: 'quota.dailyLimitExceeded',
    });
  });

  it('ADMIN/unlimited bypasses quota and model checks', async () => {
    getEntitlements.mockResolvedValue(
      ent({ isAdmin: true, quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: true } }),
    );
    await expect(
      service.assertCanSendMessage('u1', { provider: 'ANTHROPIC', model: 'claude-opus' }),
    ).resolves.toMatchObject({ isAdmin: true });
  });

  it('fails OPEN (returns null) when the entitlements service is unreachable', async () => {
    getEntitlements.mockRejectedValue(new Error('auth down'));
    await expect(service.assertCanSendMessage('u1', {})).resolves.toBeNull();
  });

  it('recordUsage swallows adapter errors (fail-soft)', async () => {
    finalizeQuota.mockRejectedValue(new Error('boom'));
    await expect(
      service.recordUsage({
        userId: 'u1',
        planId: 'p1',
        inputTokens: 10,
        outputTokens: 20,
        provider: 'OPENAI',
        model: 'gpt-4o',
      }),
    ).resolves.toBeUndefined();
  });

  it('records feature usage with the caller-provided idempotency key', async () => {
    recordFeatureUsage.mockImplementationOnce(async () => {});

    await service.recordFeatureUsage('u1', 'WEB_SEARCH', 'message-1:1:tool-1');

    expect(recordFeatureUsage).toHaveBeenCalledWith({
      userId: 'u1',
      feature: 'WEB_SEARCH',
      requestId: 'message-1:1:tool-1',
    });
  });

  it('keeps feature accounting fail-soft', async () => {
    recordFeatureUsage.mockRejectedValue(new Error('auth down'));

    await expect(
      service.recordFeatureUsage('u1', 'WEB_FETCH', 'message-1:1:tool-2'),
    ).resolves.toBeUndefined();
  });

  describe('plan feature gating (PLAN_FEATURE_DISABLED)', () => {
    it('rejects when allowCompareMode is locked (403)', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          plan: { id: 'p1', slug: 'free', name: 'Free', featureGates: { allowCompareMode: false } },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', { requireFeature: 'allowCompareMode' }),
      ).rejects.toMatchObject({ code: 'PLAN_FEATURE_DISABLED' });
    });

    it('rejects when allowJudgeMode is locked (403)', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          plan: { id: 'p1', slug: 'free', name: 'Free', featureGates: { allowJudgeMode: false } },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', { requireFeature: 'allowJudgeMode' }),
      ).rejects.toMatchObject({ code: 'PLAN_FEATURE_DISABLED' });
    });

    it('rejects when the plan is missing entirely (403)', async () => {
      getEntitlements.mockResolvedValue(ent({ plan: null }));
      await expect(
        service.assertCanSendMessage('u1', { requireFeature: 'allowCompareMode' }),
      ).rejects.toMatchObject({ code: 'PLAN_FEATURE_DISABLED' });
    });

    it('allows when allowCompareMode is true', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          plan: { id: 'p1', slug: 'pro', name: 'Pro', featureGates: { allowCompareMode: true } },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', { requireFeature: 'allowCompareMode' }),
      ).resolves.toMatchObject({ userId: 'u1' });
    });

    it('ADMIN bypasses the feature gate even when the plan locks it', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          isAdmin: true,
          plan: { id: 'p1', slug: 'free', name: 'Free', featureGates: { allowCompareMode: false } },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', { requireFeature: 'allowCompareMode' }),
      ).resolves.toMatchObject({ isAdmin: true });
    });

    it('fails OPEN (returns null) on entitlements outage — does not block compare', async () => {
      getEntitlements.mockRejectedValue(new Error('auth down'));
      await expect(
        service.assertCanSendMessage('u1', { requireFeature: 'allowCompareMode' }),
      ).resolves.toBeNull();
    });

    it('rejects when judgeEnabled=true but allowJudgeMode plan gate is locked', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          plan: {
            id: 'p1',
            slug: 'free',
            name: 'Free',
            featureGates: { allowCompareMode: true, allowJudgeMode: false },
          },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', { requireFeature: 'allowJudgeMode' }),
      ).rejects.toMatchObject({ code: 'PLAN_FEATURE_DISABLED' });
    });

    it('rejects when researchMode=SEARCH but allowResearchMode plan gate is locked', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          plan: {
            id: 'p1',
            slug: 'free',
            name: 'Free',
            featureGates: { allowResearchMode: false },
          },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', { requireFeature: 'allowResearchMode' }),
      ).rejects.toMatchObject({ code: 'PLAN_FEATURE_DISABLED' });
    });

    it('accepts an array of features when ALL three are unlocked on the plan', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          plan: {
            id: 'p1',
            slug: 'pro',
            name: 'Pro',
            featureGates: {
              allowCompareMode: true,
              allowJudgeMode: true,
              allowResearchMode: true,
            },
          },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', {
          requireFeature: ['allowCompareMode', 'allowJudgeMode', 'allowResearchMode'],
        }),
      ).resolves.toMatchObject({ userId: 'u1' });
    });

    it('rejects when criticEnabled=true but allowCriticReview plan gate is locked', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          plan: {
            id: 'p1',
            slug: 'free',
            name: 'Free',
            featureGates: {
              allowCompareMode: true,
              allowJudgeMode: true,
              allowCriticReview: false,
            },
          },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', {
          requireFeature: ['allowCompareMode', 'allowJudgeMode', 'allowCriticReview'],
        }),
      ).rejects.toMatchObject({ code: 'PLAN_FEATURE_DISABLED' });
    });

    it('allows when allowCriticReview is true alongside judge + compare', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          plan: {
            id: 'p1',
            slug: 'pro',
            name: 'Pro',
            featureGates: {
              allowCompareMode: true,
              allowJudgeMode: true,
              allowCriticReview: true,
            },
          },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', {
          requireFeature: ['allowCompareMode', 'allowJudgeMode', 'allowCriticReview'],
        }),
      ).resolves.toMatchObject({ userId: 'u1' });
    });

    it('ADMIN bypasses allowCriticReview gate even when plan locks it', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          isAdmin: true,
          plan: {
            id: 'p1',
            slug: 'free',
            name: 'Free',
            featureGates: { allowCriticReview: false },
          },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', { requireFeature: 'allowCriticReview' }),
      ).resolves.toMatchObject({ isAdmin: true });
    });

    it('rejects on the first locked feature when an array is passed', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          plan: {
            id: 'p1',
            slug: 'mixed',
            name: 'Mixed',
            featureGates: {
              allowCompareMode: true,
              allowJudgeMode: true,
              allowResearchMode: false,
            },
          },
        }),
      );
      await expect(
        service.assertCanSendMessage('u1', {
          requireFeature: ['allowCompareMode', 'allowJudgeMode', 'allowResearchMode'],
        }),
      ).rejects.toMatchObject({ code: 'PLAN_FEATURE_DISABLED' });
    });
  });
});
