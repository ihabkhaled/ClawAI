import { vi } from 'vitest';
import type { PaygMeter } from '@claw/shared-entitlements';
import { AccessControlService } from '../access-control.service';
import { BillingErrorCode, ModelCostClass, PlanModelAccessMode } from '@claw/shared-types';

const getEntitlements = vi.fn();
const finalizeQuota = vi.fn();
const recordFeatureUsage = vi.fn();
const reserveFeatureUsage = vi.fn();
const settleFeatureUsage = vi.fn();
// Exposure is a network call to connector-service; the harness stubs it so the
// suite tests the gate's decision, not connectivity. Default: exposed.
const isExposed = vi.fn().mockResolvedValue(true);
const getCostClass = vi.fn();
const getCostClasses = vi.fn();

vi.mock('../../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return {
      isExposed: (...args: unknown[]) => isExposed(...args),
      getCostClass: (...args: unknown[]) => getCostClass(...args),
      getCostClasses: (...args: unknown[]) => getCostClasses(...args),
    };
  }),
}));

vi.mock('@claw/shared-entitlements', async () => {
  const actual = await vi.importActual('@claw/shared-entitlements');
  return {
    ...actual,
    EntitlementsAdapter: vi.fn(function () {
      return {
        getEntitlements: (...args: unknown[]) => getEntitlements(...args),
        finalizeQuota: (...args: unknown[]) => finalizeQuota(...args),
        recordFeatureUsage: (...args: unknown[]) => recordFeatureUsage(...args),
        reserveFeatureUsage: (...args: unknown[]) => reserveFeatureUsage(...args),
        settleFeatureUsage: (...args: unknown[]) => settleFeatureUsage(...args),
      };
    }),
  };
});

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn().mockReturnValue({ AUTH_SERVICE_URL: 'http://auth:4001' }) },
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

// The PAYG meter is injected now. These suites test the plan / quota / exposure
// gates, not credit, so a stub that reports "not metered" keeps every existing
// assertion about those gates unchanged.
const paygMeter = {
  reserve: vi.fn().mockResolvedValue({
    metered: false,
    maxOutputTokens: 4096,
    clamped: false,
    reservationId: null,
    heldMicroUsd: 0,
    availableAfterMicroUsd: 0,
    reason: 'NOT_PAYG',
  }),
  finalize: vi.fn().mockResolvedValue(undefined),
  release: vi.fn().mockResolvedValue(undefined),
} as unknown as PaygMeter;

describe('AccessControlService', () => {
  let service: AccessControlService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AccessControlService(paygMeter);
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

  it('keeps model rows inside the plan cost-class ceiling', async () => {
    getEntitlements.mockResolvedValue(
      ent({
        modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
        allowedCostClasses: [ModelCostClass.FREE, ModelCostClass.CHEAP, ModelCostClass.STANDARD],
        allowedModels: [
          {
            provider: 'OPENAI',
            model: 'astra',
            isAllowed: true,
            allowAsPrimary: true,
            allowAsFallback: true,
            allowAsJudge: true,
            allowInCompare: true,
            dailyTokenLimitOverride: null,
          },
        ],
      }),
    );
    getCostClass.mockResolvedValue(ModelCostClass.PREMIUM);

    await expect(
      service.assertCanSendMessage('u1', { provider: 'OPENAI', model: 'astra' }),
    ).rejects.toMatchObject({ code: 'MODEL_NOT_ALLOWED_FOR_PLAN' });
  });

  it.each([
    [ModelCostClass.FREE, [ModelCostClass.FREE, ModelCostClass.CHEAP, ModelCostClass.STANDARD]],
    [ModelCostClass.CHEAP, [ModelCostClass.FREE, ModelCostClass.CHEAP, ModelCostClass.STANDARD]],
    [ModelCostClass.STANDARD, [ModelCostClass.FREE, ModelCostClass.CHEAP, ModelCostClass.STANDARD]],
    [ModelCostClass.PREMIUM, Object.values(ModelCostClass)],
    [ModelCostClass.ULTRA, Object.values(ModelCostClass)],
  ])(
    'lets an explicit %s pick through when the plan allows that class',
    async (costClass, allowed) => {
      getEntitlements.mockResolvedValue(
        ent({
          modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
          allowedCostClasses: allowed,
        }),
      );
      getCostClass.mockResolvedValue(costClass);
      isExposed.mockResolvedValue(true);

      await expect(
        service.assertCanSendMessage('u1', { provider: 'OPENAI', model: 'any-model' }),
      ).resolves.toBeDefined();
    },
  );

  it('refuses a model whose cost class is unknown on a cost-class plan', async () => {
    getEntitlements.mockResolvedValue(
      ent({
        modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
        allowedCostClasses: Object.values(ModelCostClass),
      }),
    );
    getCostClass.mockResolvedValue(null);
    isExposed.mockResolvedValue(true);

    await expect(
      service.assertCanSendMessage('u1', { provider: 'OPENAI', model: 'unpriced' }),
    ).rejects.toMatchObject({ code: 'MODEL_NOT_ALLOWED_FOR_PLAN' });
  });

  describe('listModelAccess (the picker list)', () => {
    const freeClasses = [ModelCostClass.FREE, ModelCostClass.CHEAP, ModelCostClass.STANDARD];
    const models = [
      { provider: 'OLLAMA', model: 'kimi-k3' },
      { provider: 'OPENAI', model: 'gpt-5.4-mini' },
      { provider: 'GROK', model: 'grok-4.7' },
      { provider: 'GROK', model: 'unpriced' },
    ];
    const classes = new Map<string, ModelCostClass | null>([
      ['OLLAMA/kimi-k3', ModelCostClass.FREE],
      ['OPENAI/gpt-5.4-mini', ModelCostClass.STANDARD],
      ['GROK/grok-4.7', ModelCostClass.PREMIUM],
      ['GROK/unpriced', null],
    ]);

    it('a Free plan allows its classes and refuses the dearer and the unpriced', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
          allowedCostClasses: freeClasses,
        }),
      );
      getCostClasses.mockResolvedValue(classes);

      const result = await service.listModelAccess('u1', models);

      expect(result.map((entry) => entry.allowed)).toEqual([true, true, false, false]);
    });

    it('a paid plan with every class allows every priced model', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
          allowedCostClasses: Object.values(ModelCostClass),
        }),
      );
      getCostClasses.mockResolvedValue(classes);

      const result = await service.listModelAccess('u1', models);

      expect(result.map((entry) => entry.allowed)).toEqual([true, true, true, false]);
    });

    it('answers exactly as the send gate does for the same model', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
          allowedCostClasses: freeClasses,
        }),
      );
      getCostClasses.mockResolvedValue(classes);
      isExposed.mockResolvedValue(true);
      getCostClass.mockImplementation((provider: string, model: string) =>
        Promise.resolve(classes.get(`${provider}/${model}`) ?? null),
      );

      const listed = await service.listModelAccess('u1', models);
      for (const entry of listed) {
        const sent = service.assertCanSendMessage('u1', {
          provider: entry.provider,
          model: entry.model,
        });
        if (entry.allowed) {
          await expect(sent).resolves.toBeDefined();
        } else {
          await expect(sent).rejects.toMatchObject({ code: 'MODEL_NOT_ALLOWED_FOR_PLAN' });
        }
      }
    });

    it('an administrator is allowed everything without a class lookup', async () => {
      getEntitlements.mockResolvedValue(ent({ isAdmin: true }));
      getCostClasses.mockClear();

      const result = await service.listModelAccess('u1', models);

      expect(result.every((entry) => entry.allowed)).toBe(true);
      expect(getCostClasses).not.toHaveBeenCalled();
    });

    it('an allow-all plan needs no class lookup', async () => {
      getEntitlements.mockResolvedValue(ent({ modelAccessMode: PlanModelAccessMode.ALLOW_ALL }));
      getCostClasses.mockClear();

      const result = await service.listModelAccess('u1', models);

      expect(result.every((entry) => entry.allowed)).toBe(true);
      expect(getCostClasses).not.toHaveBeenCalled();
    });

    it('a model routing could not answer for is refused, like a send would be', async () => {
      getEntitlements.mockResolvedValue(
        ent({
          modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
          allowedCostClasses: freeClasses,
        }),
      );
      getCostClasses.mockResolvedValue(new Map());

      const result = await service.listModelAccess('u1', models);

      expect(result.every((entry) => !entry.allowed)).toBe(true);
    });
  });

  it('rejects when quota exhausted (429)', async () => {
    getEntitlements.mockResolvedValue(
      ent({ quota: { dailyLimit: 100, used: 100, remaining: 0, unlimited: false } }),
    );
    // The stable machine code, not a message key: the frontend error map keys
    // on QUOTA_DAILY_EXCEEDED, so a message key here meant nothing matched and
    // the user saw the backend's English regardless of locale.
    await expect(service.assertCanSendMessage('u1', {})).rejects.toMatchObject({
      code: BillingErrorCode.QUOTA_DAILY_EXCEEDED,
    });
  });

  it('ADMIN/unlimited bypasses quota and plan model checks, but not exposure', async () => {
    getEntitlements.mockResolvedValue(
      ent({ isAdmin: true, quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: true } }),
    );
    isExposed.mockResolvedValue(true);
    await expect(
      service.assertCanSendMessage('u1', { provider: 'ANTHROPIC', model: 'claude-opus' }),
    ).resolves.toMatchObject({ isAdmin: true });
    expect(isExposed).toHaveBeenCalledWith('ANTHROPIC', 'claude-opus');
  });

  it('refuses an unexposed model even for an administrator', async () => {
    // Exposure is what ClawAI is willing to offer at all. A plan can widen who
    // may use an offered model; it cannot make an unexposed one usable, and an
    // admin bypass here would let a deployment nobody exposed reach a provider.
    getEntitlements.mockResolvedValue(
      ent({ isAdmin: true, quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: true } }),
    );
    isExposed.mockResolvedValue(false);
    await expect(
      service.assertCanSendMessage('u1', { provider: 'ANTHROPIC', model: 'claude-opus' }),
    ).rejects.toMatchObject({ code: 'MODEL_NOT_EXPOSED' });
  });

  it('fails closed when the entitlements service is unreachable', async () => {
    getEntitlements.mockRejectedValue(new Error('auth down'));
    await expect(service.assertCanSendMessage('u1', {})).rejects.toMatchObject({
      code: 'ENTITLEMENTS_UNAVAILABLE',
    });
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

    it('fails closed on entitlements outage', async () => {
      getEntitlements.mockRejectedValue(new Error('auth down'));
      await expect(
        service.assertCanSendMessage('u1', { requireFeature: 'allowCompareMode' }),
      ).rejects.toMatchObject({ code: 'ENTITLEMENTS_UNAVAILABLE' });
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

  // ADR-110: the AI-file allowance. A limit is a business rule, so an
  // unreachable auth-service lets the file through instead of blocking it.
  // ADR-122: the low-in-the-turn question the media gates ask.
  describe('hasPlanFeatureFor', () => {
    it('answers false for a free plan without the media gate, true for a paid one', async () => {
      getEntitlements.mockResolvedValueOnce(
        ent({ plan: { id: 'p1', slug: 'free', name: 'Free', featureGates: {} } }),
      );
      await expect(service.hasPlanFeatureFor('u1', 'allowImageGeneration')).resolves.toBe(false);

      getEntitlements.mockResolvedValueOnce(
        ent({
          plan: {
            id: 'p2',
            slug: 'pro',
            name: 'Pro',
            featureGates: { allowImageGeneration: true, allowHelperVision: true },
          },
        }),
      );
      await expect(service.hasPlanFeatureFor('u1', 'allowHelperVision')).resolves.toBe(true);
    });

    it('answers true for ADMIN whatever the plan says', async () => {
      getEntitlements.mockResolvedValueOnce(ent({ isAdmin: true, role: 'ADMIN' }));
      await expect(service.hasPlanFeatureFor('u1', 'allowTextToSpeech')).resolves.toBe(true);
    });

    it('throws the 503 rather than guessing when entitlements are unreachable', async () => {
      getEntitlements.mockRejectedValueOnce(new Error('auth down'));
      await expect(service.hasPlanFeatureFor('u1', 'allowImageGeneration')).rejects.toMatchObject({
        code: 'ENTITLEMENTS_UNAVAILABLE',
      });
    });
  });

  // Multimodal batch 8: native video is gated on the plan's maxVideoSeconds.
  describe('maxVideoSecondsFor', () => {
    const planWith = (maxVideoSeconds: number | null) =>
      ent({
        plan: {
          id: 'p1',
          slug: 'free',
          name: 'Free',
          featureGates: {},
          limits: { maxVideoSeconds },
        },
      });

    it('reads the plan limit: 60 s free, null unlimited, 0 disabled', async () => {
      getEntitlements.mockResolvedValueOnce(planWith(60));
      await expect(service.maxVideoSecondsFor('u1')).resolves.toBe(60);
      getEntitlements.mockResolvedValueOnce(planWith(null));
      await expect(service.maxVideoSecondsFor('u1')).resolves.toBeNull();
      getEntitlements.mockResolvedValueOnce(planWith(0));
      await expect(service.maxVideoSecondsFor('u1')).resolves.toBe(0);
    });

    it('is unlimited for ADMIN', async () => {
      getEntitlements.mockResolvedValueOnce(ent({ isAdmin: true, role: 'ADMIN' }));
      await expect(service.maxVideoSecondsFor('u1')).resolves.toBeNull();
    });

    it('throws when entitlements are unreachable, so the caller fails closed', async () => {
      getEntitlements.mockRejectedValueOnce(new Error('auth down'));
      await expect(service.maxVideoSecondsFor('u1')).rejects.toMatchObject({
        code: 'ENTITLEMENTS_UNAVAILABLE',
      });
    });
  });

  describe('feature reservations', () => {
    it('passes the auth-service decision through', async () => {
      reserveFeatureUsage.mockResolvedValueOnce({
        allowed: false,
        reason: 'FEATURE_TRIAL_EXHAUSTED',
        used: 15,
        limit: 15,
        window: 'DAY',
      });
      await expect(service.reserveFeature('u1', 'FILE_GENERATION', 'req-1')).resolves.toMatchObject(
        { allowed: false, used: 15 },
      );
      expect(reserveFeatureUsage).toHaveBeenCalledWith({
        userId: 'u1',
        feature: 'FILE_GENERATION',
        requestId: 'req-1',
      });
    });

    it('allows the run, with nothing to settle, when auth-service is unreachable', async () => {
      reserveFeatureUsage.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await expect(service.reserveFeature('u1', 'FILE_GENERATION', 'req-2')).resolves.toEqual({
        allowed: true,
        reservationId: null,
      });
    });

    it('settles a reservation and skips an unmetered one', async () => {
      settleFeatureUsage.mockResolvedValue(undefined);
      await service.settleFeature('r1', 'CONSUME');
      await service.settleFeature(null, 'CONSUME');
      expect(settleFeatureUsage).toHaveBeenCalledTimes(1);
      expect(settleFeatureUsage).toHaveBeenCalledWith('r1', 'CONSUME');
    });

    it('never throws when settling fails', async () => {
      settleFeatureUsage.mockRejectedValueOnce(new Error('down'));
      await expect(service.settleFeature('r1', 'RELEASE')).resolves.toBeUndefined();
    });
  });
});
