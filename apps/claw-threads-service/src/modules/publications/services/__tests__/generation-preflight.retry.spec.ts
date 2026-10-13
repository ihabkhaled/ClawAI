import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { PlanFeatureGates, UserEntitlements } from '@claw/shared-entitlements';
import { Permission, PlanModelAccessMode } from '@claw/shared-types';

import { GenerationPreflightService } from '../generation-preflight.service';

const entry = (provider: string, model: string, allowAsFallback = true) => ({
  provider,
  model,
  isAllowed: true,
  allowAsPrimary: true,
  allowAsFallback,
  allowAsJudge: false,
  allowInCompare: true,
  dailyTokenLimitOverride: null,
});

const gates = (overrides: Partial<PlanFeatureGates> = {}): PlanFeatureGates =>
  ({
    allowResearchMode: true,
    allowJudgeMode: true,
    allowCriticReview: true,
    ...overrides,
  }) as PlanFeatureGates;

function entitlements(overrides: Partial<UserEntitlements> = {}): UserEntitlements {
  return {
    userId: 'owner-1',
    role: 'USER',
    isAdmin: false,
    permissions: [Permission.THREAD_GENERATION_USE],
    modelAccessMode: PlanModelAccessMode.ALLOW_LIST,
    allowedModels: [entry('GEMINI', 'gemini-2.5-flash'), entry('OPENAI', 'gpt-5-mini')],
    allowedProviders: ['GEMINI', 'OPENAI'],
    plan: {
      id: 'plan-1',
      slug: 'free',
      name: 'Free',
      isTrial: false,
      trialEndsAt: null,
      isTrialExpired: false,
      limits: {} as NonNullable<UserEntitlements['plan']>['limits'],
      featureGates: gates(),
    },
    quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false, adminBypass: false },
    ...overrides,
  };
}

const stored = {
  spendCapMicroUsd: '2000000',
  roles: [
    {
      roleId: 'author-1',
      roleKind: 'AUTHOR',
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      fallbacks: [{ provider: 'OPENAI', model: 'gpt-5-mini' }],
    },
    {
      roleId: 'judge',
      roleKind: 'JUDGE',
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      fallbacks: [],
    },
    {
      roleId: 'critic',
      roleKind: 'CRITIC',
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      fallbacks: [],
    },
  ],
};

function setup(
  options: { known?: (provider: string, model: string) => boolean; ent?: UserEntitlements } = {},
) {
  const adapter = { getEntitlements: vi.fn().mockResolvedValue(options.ent ?? entitlements()) };
  const catalog = {
    isKnown: vi
      .fn()
      .mockImplementation(async ({ provider, model }: { provider: string; model: string }) =>
        options.known ? options.known(provider, model) : true,
      ),
  };
  return {
    service: new GenerationPreflightService(adapter as never, catalog as never),
    adapter,
    catalog,
  };
}

const retryInput = { idempotencyKey: 'retry-1' };

function askedModels(calls: unknown[][]): string[] {
  return calls.map(([ref]) => {
    const { provider, model } = ref as { provider: string; model: string };
    return `${provider}/${model}`;
  });
}

describe('GenerationPreflightService.assertCanRetry (D-01)', () => {
  it('passes when the stored models are still known and on the plan, and checks them', async () => {
    const { service, catalog } = setup();

    await expect(service.assertCanRetry('owner-1', stored, retryInput)).resolves.toBeUndefined();

    const asked = askedModels(catalog.isKnown.mock.calls);
    expect(asked.sort()).toEqual(['GEMINI/gemini-2.5-flash', 'OPENAI/gpt-5-mini']);
  });

  it('refuses an unknown model named in models[] with the catalog code before anything is held', async () => {
    const { service } = setup({ known: (_provider, model) => model !== 'totally-fake' });

    const outcome = service.assertCanRetry('owner-1', stored, {
      ...retryInput,
      models: [{ roleId: 'author-1', provider: 'GEMINI', model: 'totally-fake' }],
    });

    await expect(outcome).rejects.toBeInstanceOf(BadRequestException);
    await expect(outcome).rejects.toMatchObject({
      response: { code: 'THREAD_MODEL_UNKNOWN', roleId: 'author-1', model: 'totally-fake' },
    });
  });

  it('refuses a model the plan excludes that is named in models[]', async () => {
    const { service } = setup();

    const outcome = service.assertCanRetry('owner-1', stored, {
      ...retryInput,
      models: [{ roleId: 'judge', provider: 'GEMINI', model: 'gemini-3.5-flash' }],
    });

    await expect(outcome).rejects.toBeInstanceOf(ForbiddenException);
    await expect(outcome).rejects.toMatchObject({
      response: { code: 'MODEL_NOT_ALLOWED_FOR_PLAN', roleId: 'judge' },
    });
  });

  it('checks the stored models when none are given: a fallback the plan has since lost is refused', async () => {
    const { service } = setup({
      ent: entitlements({ allowedModels: [entry('GEMINI', 'gemini-2.5-flash')] }),
    });

    await expect(service.assertCanRetry('owner-1', stored, retryInput)).rejects.toMatchObject({
      response: { code: 'MODEL_NOT_ALLOWED_FOR_PLAN', provider: 'OPENAI', model: 'gpt-5-mini' },
    });
  });

  it('checks the stored models when none are given: a model that left the catalog is refused', async () => {
    const { service } = setup({ known: (_provider, model) => model !== 'gemini-2.5-flash' });

    await expect(service.assertCanRetry('owner-1', stored, retryInput)).rejects.toMatchObject({
      response: { code: 'THREAD_MODEL_UNKNOWN' },
    });
  });

  it('drops the old fallbacks on the new primary’s provider, as the generation service does', async () => {
    const { service, catalog } = setup();

    await service.assertCanRetry('owner-1', stored, {
      ...retryInput,
      models: [{ roleId: 'author-1', provider: 'OPENAI', model: 'gpt-5-mini' }],
    });

    const asked = askedModels(catalog.isKnown.mock.calls);
    expect(asked.sort()).toEqual(['GEMINI/gemini-2.5-flash', 'OPENAI/gpt-5-mini']);
  });

  it('answers 400 for a role id the job does not have', async () => {
    const { service } = setup();

    await expect(
      service.assertCanRetry('owner-1', stored, {
        ...retryInput,
        models: [{ roleId: 'author-9', provider: 'GEMINI', model: 'gemini-2.5-flash' }],
      }),
    ).rejects.toThrow('Unknown role in model changes');
  });

  it('refuses a new spend cap below one cent (no float arithmetic: 0.009999 USD is 9,999 micro-USD)', async () => {
    const { service } = setup();

    await expect(
      service.assertCanRetry('owner-1', stored, { ...retryInput, spendCapUsd: 0.009999 }),
    ).rejects.toMatchObject({ response: { code: 'THREAD_SPEND_CAP_TOO_LOW', capMicroUsd: 9_999 } });
    await expect(
      service.assertCanRetry('owner-1', stored, { ...retryInput, spendCapUsd: 0.01 }),
    ).resolves.toBeUndefined();
  });

  it('refuses a stored cap that is below the floor when no new one is given', async () => {
    const { service } = setup();

    await expect(
      service.assertCanRetry('owner-1', { ...stored, spendCapMicroUsd: '5000' }, retryInput),
    ).rejects.toMatchObject({ response: { code: 'THREAD_SPEND_CAP_TOO_LOW' } });
  });

  it('refuses an owner who no longer has the permission', async () => {
    const { service } = setup({ ent: entitlements({ permissions: [] }) });

    await expect(service.assertCanRetry('owner-1', stored, retryInput)).rejects.toMatchObject({
      response: { code: 'THREAD_GENERATION_NOT_PERMITTED' },
    });
  });

  it('fails closed when the plan cannot be read', async () => {
    const { service, adapter } = setup();
    adapter.getEntitlements.mockRejectedValue(new Error('down'));

    await expect(service.assertCanRetry('owner-1', stored, retryInput)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('ignores seats that are not author, judge or critic', async () => {
    const { service, catalog } = setup();

    await service.assertCanRetry(
      'owner-1',
      {
        ...stored,
        roles: [
          ...stored.roles,
          { roleId: 'research', roleKind: 'RESEARCH', provider: 'X', model: 'y', fallbacks: [] },
        ],
      },
      retryInput,
    );

    expect(catalog.isKnown).not.toHaveBeenCalledWith({ provider: 'X', model: 'y' });
  });
});

describe('GenerationPreflightService.explainBudgetDenial (D-09)', () => {
  const notInPlan = new ForbiddenException({
    message: 'generic',
    code: 'THREAD_GENERATION_NOT_IN_PLAN',
    statusCode: 403,
  });

  it('says the allowance is used up when the plan has every feature', async () => {
    const { service } = setup();

    const explained = await service.explainBudgetDenial('owner-1', notInPlan);

    expect(explained?.getResponse()).toMatchObject({
      code: 'THREAD_GENERATION_ALLOWANCE_UNAVAILABLE',
      statusCode: 403,
    });
    expect(JSON.stringify(explained?.getResponse())).toMatch(/allowance is used up/u);
    expect(JSON.stringify(explained?.getResponse())).not.toMatch(/does not include/u);
  });

  it('names the features a plan really lacks', async () => {
    const base = entitlements();
    const { service } = setup({
      ent: {
        ...base,
        plan: base.plan
          ? {
              ...base.plan,
              featureGates: gates({ allowJudgeMode: false, allowCriticReview: false }),
            }
          : null,
      },
    });

    const explained = await service.explainBudgetDenial('owner-1', notInPlan);

    expect(explained?.getResponse()).toMatchObject({
      code: 'THREAD_GENERATION_NOT_IN_PLAN',
      missingFeatures: 'Judge review, Critic review',
    });
    expect(JSON.stringify(explained?.getResponse())).toMatch(/Free plan does not include/u);
  });

  it('says not in plan when the account has no plan at all', async () => {
    const { service } = setup({ ent: entitlements({ plan: null }) });

    const explained = await service.explainBudgetDenial('owner-1', notInPlan);

    expect(explained?.getResponse()).toMatchObject({ code: 'THREAD_GENERATION_NOT_IN_PLAN' });
  });

  it('leaves any other error alone and does not read the plan', async () => {
    const { service, adapter } = setup();

    await expect(service.explainBudgetDenial('owner-1', new Error('boom'))).resolves.toBeNull();
    await expect(
      service.explainBudgetDenial('owner-1', new ForbiddenException('other 403')),
    ).resolves.toBeNull();
    await expect(
      service.explainBudgetDenial('owner-1', new BadRequestException('bad')),
    ).resolves.toBeNull();
    expect(adapter.getEntitlements).not.toHaveBeenCalled();
  });

  it('keeps the original answer when the plan cannot be read', async () => {
    const { service, adapter } = setup();
    adapter.getEntitlements.mockRejectedValue(new Error('down'));

    await expect(service.explainBudgetDenial('owner-1', notInPlan)).resolves.toBeNull();
  });
});
