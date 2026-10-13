import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { UserEntitlements } from '@claw/shared-entitlements';
import { Locale, Permission, PlanModelAccessMode, ThreadPublicationType } from '@claw/shared-types';

import { ThreadGenerationErrorCode } from '../../../../common/enums/thread-generation-error-code.enum';
import { ThreadGenerationRoleKind } from '../../../../common/enums/thread-generation-role-kind.enum';
import { MIN_THREAD_SPEND_CAP_MICRO_USD } from '../../constants/generation-preflight.constants';
import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import {
  assertGenerationPermitted,
  assertModelsKnown,
  assertModelsOnPlan,
  assertSpendCapAllowed,
  collectPreflightRoles,
  describeRoleSeat,
  distinctModelRefs,
  modelKey,
} from '../generation-preflight.utility';

type RoleRequest = StartThreadGenerationDto['judge'];

function role(
  id: string,
  provider: string,
  model: string,
  fallbacks: RoleRequest['fallbacks'] = [],
): RoleRequest {
  return { id, provider, model, maxOutputTokens: 1024, fallbacks };
}

const request: StartThreadGenerationDto = {
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'key-1',
  correlationId: 'corr-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: Locale.ES,
  topic: 'A sufficiently detailed topic for research',
  publicationType: ThreadPublicationType.ARTICLE,
  authors: [
    role('author-1', 'OLLAMA', 'gpt-oss:20b'),
    role('author-2', 'GROQ', 'llama-3.3-70b', [{ provider: 'OLLAMA', model: 'gpt-oss:20b' }]),
    role('author-3', 'OLLAMA', 'gpt-oss:20b'),
  ],
  judge: role('judge', 'OLLAMA', 'gpt-oss:120b'),
  critic: role('critic', 'GEMINI', 'gemini-2.5-flash'),
};

type AllowedModels = UserEntitlements['allowedModels'];

function allowed(...pairs: Array<[string, string]>): AllowedModels {
  return pairs.map(([provider, model]) => ({
    provider,
    model,
    isAllowed: true,
    allowAsPrimary: true,
    allowAsFallback: true,
    allowAsJudge: false,
    allowInCompare: true,
    dailyTokenLimitOverride: null,
  }));
}

const freePlan: NonNullable<UserEntitlements['plan']> = {
  id: 'plan-free',
  slug: 'free',
  name: 'Free',
  isTrial: false,
  trialEndsAt: null,
  isTrialExpired: false,
  limits: {
    dailyTokens: null,
    weeklyTokens: null,
    monthlyTokens: null,
    chatsPerDay: null,
    messagesPerDay: null,
    workspaceConnections: null,
    contextPacks: null,
    memoryItems: null,
    maxVideoSeconds: null,
    maxInstalledPlugins: null,
    maxUserMcpServers: null,
    maxPluginCallsPerDay: null,
  },
  featureGates: {} as NonNullable<UserEntitlements['plan']>['featureGates'],
};

function entitlements(overrides: Partial<UserEntitlements> = {}): UserEntitlements {
  return {
    userId: 'owner-1',
    role: 'USER',
    isAdmin: false,
    permissions: [Permission.THREAD_GENERATION_USE],
    plan: freePlan,
    modelAccessMode: PlanModelAccessMode.ALLOW_LIST,
    allowedModels: allowed(['OLLAMA', 'gpt-oss:20b'], ['OLLAMA', 'gpt-oss:120b']),
    allowedProviders: ['OLLAMA'],
    quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false, adminBypass: false },
    ...overrides,
  };
}

type Refusal = { status: number; body: Record<string, unknown> };

function refusal(run: () => void): Refusal {
  try {
    run();
  } catch (error) {
    if (error instanceof BadRequestException || error instanceof ForbiddenException) {
      const body: unknown = error.getResponse();
      return { status: error.getStatus(), body: body as Record<string, unknown> };
    }
    throw error;
  }
  throw new Error('expected a refusal');
}

describe('collectPreflightRoles', () => {
  it('lists authors, judge and critic with their fallbacks and seats', () => {
    const roles = collectPreflightRoles(request);

    expect(
      roles.map(
        (entry) =>
          `${entry.kind}:${String(entry.position)}:${modelKey(entry)}:${String(entry.isFallback)}`,
      ),
    ).toEqual([
      'author:1:OLLAMA/gpt-oss:20b:false',
      'author:2:GROQ/llama-3.3-70b:false',
      'author:2:OLLAMA/gpt-oss:20b:true',
      'author:3:OLLAMA/gpt-oss:20b:false',
      'judge:1:OLLAMA/gpt-oss:120b:false',
      'critic:1:GEMINI/gemini-2.5-flash:false',
    ]);
  });

  it('asks the catalog once per distinct model', () => {
    expect(distinctModelRefs(collectPreflightRoles(request)).map(modelKey)).toEqual([
      'OLLAMA/gpt-oss:20b',
      'GROQ/llama-3.3-70b',
      'OLLAMA/gpt-oss:120b',
      'GEMINI/gemini-2.5-flash',
    ]);
  });

  it('names the seats for people', () => {
    const [author, , , , judge, critic] = collectPreflightRoles(request);

    expect(author && describeRoleSeat(author)).toBe('Author 1');
    expect(judge && describeRoleSeat(judge)).toBe('Judge');
    expect(critic && describeRoleSeat(critic)).toBe('Critic');
    expect(critic?.kind).toBe(ThreadGenerationRoleKind.CRITIC);
  });
});

describe('assertSpendCapAllowed', () => {
  it('refuses 1 micro-USD with a 400 and a machine code naming the minimum', () => {
    const result = refusal(() => assertSpendCapAllowed(1));

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      code: ThreadGenerationErrorCode.SPEND_CAP_TOO_LOW,
      minimumMicroUsd: MIN_THREAD_SPEND_CAP_MICRO_USD,
      capMicroUsd: 1,
      statusCode: 400,
    });
    expect(String(result.body.message)).toContain('$0.01');
  });

  it('accepts exactly the minimum and anything above it, and refuses one below', () => {
    expect(() => assertSpendCapAllowed(MIN_THREAD_SPEND_CAP_MICRO_USD)).not.toThrow();
    expect(() => assertSpendCapAllowed(MIN_THREAD_SPEND_CAP_MICRO_USD - 1)).toThrow(
      BadRequestException,
    );
    expect(() => assertSpendCapAllowed(5_000_000)).not.toThrow();
  });
});

describe('assertGenerationPermitted', () => {
  it('refuses a role without the Thread generation permission with a 403 code', () => {
    const result = refusal(() => assertGenerationPermitted(entitlements({ permissions: [] })));

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ code: ThreadGenerationErrorCode.NOT_PERMITTED });
  });

  it('lets an administrator through without listing the permission', () => {
    expect(() =>
      assertGenerationPermitted(entitlements({ permissions: [], isAdmin: true })),
    ).not.toThrow();
  });
});

describe('assertModelsKnown', () => {
  const roles = collectPreflightRoles(request);
  const all = new Set(distinctModelRefs(roles).map(modelKey));

  it('passes when the catalog knows every model', () => {
    expect(() => assertModelsKnown(roles, all)).not.toThrow();
  });

  it('refuses a made-up model with a 400 that names the seat and the model', () => {
    const known = new Set(all);
    known.delete('GROQ/llama-3.3-70b');

    const result = refusal(() => assertModelsKnown(roles, known));

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      code: ThreadGenerationErrorCode.MODEL_UNKNOWN,
      role: 'author',
      roleId: 'author-2',
      provider: 'GROQ',
      model: 'llama-3.3-70b',
    });
    expect(String(result.body.message)).toContain('Author 2');
    expect(String(result.body.message)).toContain('GROQ/llama-3.3-70b');
  });

  it('says "fallback model" when the unknown model is a fallback', () => {
    const withBadFallback = collectPreflightRoles({
      ...request,
      judge: role('judge', 'OLLAMA', 'gpt-oss:120b', [
        { provider: 'GROQ', model: 'no-such-model' },
      ]),
    });

    const result = refusal(() => assertModelsKnown(withBadFallback, all));

    expect(String(result.body.message)).toContain('fallback model GROQ/no-such-model');
    expect(String(result.body.message)).toContain('Judge');
  });
});

describe('assertModelsOnPlan', () => {
  const roles = collectPreflightRoles(request);

  it("names the role, the model and the caller's own plan when the plan excludes a model", () => {
    const result = refusal(() => assertModelsOnPlan(entitlements(), roles));

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      code: ThreadGenerationErrorCode.MODEL_NOT_ALLOWED_FOR_PLAN,
      role: 'author',
      roleId: 'author-2',
      provider: 'GROQ',
      model: 'llama-3.3-70b',
      plan: 'free',
    });
    expect(result.body.message).toBe(
      'Author 2 uses GROQ/llama-3.3-70b, which your Free plan does not include. Pick a model your plan includes, or upgrade to a plan that lists it.',
    );
  });

  it('is per role: a model allowed for one seat does not excuse the others', () => {
    const onlyCritic = entitlements({ allowedModels: allowed(['GEMINI', 'gemini-2.5-flash']) });

    const result = refusal(() => assertModelsOnPlan(onlyCritic, roles));

    expect(result.body).toMatchObject({ role: 'author', roleId: 'author-1' });
  });

  it('does not refuse for a fallback the plan excludes', () => {
    const plan = entitlements({
      allowedModels: allowed(
        ['OLLAMA', 'gpt-oss:20b'],
        ['OLLAMA', 'gpt-oss:120b'],
        ['GROQ', 'llama-3.3-70b'],
        ['GEMINI', 'gemini-2.5-flash'],
      ),
    });
    const withDeniedFallback = collectPreflightRoles({
      ...request,
      judge: role('judge', 'OLLAMA', 'gpt-oss:120b', [{ provider: 'OPENAI', model: 'gpt-5' }]),
    });

    expect(() => assertModelsOnPlan(plan, withDeniedFallback)).not.toThrow();
  });

  it('lets an unrestricted plan and an administrator use any model', () => {
    expect(() =>
      assertModelsOnPlan(entitlements({ modelAccessMode: PlanModelAccessMode.ALLOW_ALL }), roles),
    ).not.toThrow();
    expect(() =>
      assertModelsOnPlan(
        entitlements({ isAdmin: true, modelAccessMode: PlanModelAccessMode.DENY_ALL }),
        roles,
      ),
    ).not.toThrow();
  });

  it('refuses everything on a deny-all plan and says "current" when there is no plan', () => {
    const result = refusal(() =>
      assertModelsOnPlan(
        entitlements({ modelAccessMode: PlanModelAccessMode.DENY_ALL, plan: null }),
        roles,
      ),
    );

    expect(result.body).toMatchObject({ roleId: 'author-1', plan: 'none' });
    expect(String(result.body.message)).toContain('your current plan');
  });

  it("never puts another user's data in the error", () => {
    const result = refusal(() => assertModelsOnPlan(entitlements(), roles));

    expect(JSON.stringify(result.body)).not.toContain('owner-1');
    expect(Object.keys(result.body).sort()).toEqual(
      ['code', 'message', 'model', 'plan', 'provider', 'role', 'roleId', 'statusCode'].sort(),
    );
  });
});
