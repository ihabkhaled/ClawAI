import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { UserEntitlements } from '@claw/shared-entitlements';
import { Locale, Permission, PlanModelAccessMode, ThreadPublicationType } from '@claw/shared-types';

import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import { GenerationPreflightService } from '../generation-preflight.service';

const role = (id: string, provider: string, model: string) => ({
  id,
  provider,
  model,
  maxOutputTokens: 1024,
  fallbacks: [],
});

const request: StartThreadGenerationDto = {
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'key-1',
  correlationId: 'corr-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: Locale.EN,
  topic: 'A sufficiently detailed topic for research',
  publicationType: ThreadPublicationType.ARTICLE,
  authors: [
    role('author-1', 'OLLAMA', 'gpt-oss:20b'),
    role('author-2', 'OLLAMA', 'gpt-oss:20b'),
    role('author-3', 'OLLAMA', 'gpt-oss:20b'),
  ],
  judge: role('judge', 'OLLAMA', 'gpt-oss:120b'),
  critic: role('critic', 'OLLAMA', 'gpt-oss:20b'),
};

const entry = (model: string) => ({
  provider: 'OLLAMA',
  model,
  isAllowed: true,
  allowAsPrimary: true,
  allowAsFallback: true,
  allowAsJudge: false,
  allowInCompare: true,
  dailyTokenLimitOverride: null,
});

function freeEntitlements(overrides: Partial<UserEntitlements> = {}): UserEntitlements {
  const base: Pick<
    UserEntitlements,
    'userId' | 'role' | 'isAdmin' | 'permissions' | 'modelAccessMode' | 'allowedModels'
  > = {
    userId: 'owner-1',
    role: 'USER',
    isAdmin: false,
    permissions: [Permission.THREAD_GENERATION_USE],
    modelAccessMode: PlanModelAccessMode.ALLOW_LIST,
    allowedModels: [entry('gpt-oss:20b'), entry('gpt-oss:120b')],
  };
  return {
    ...base,
    plan: null,
    allowedProviders: ['OLLAMA'],
    quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false, adminBypass: false },
    ...overrides,
  };
}

function setup(options: { known?: boolean; entitlements?: UserEntitlements } = {}) {
  const adapter = {
    getEntitlements: vi.fn().mockResolvedValue(options.entitlements ?? freeEntitlements()),
  };
  const catalog = { isKnown: vi.fn().mockResolvedValue(options.known ?? true) };
  const service = new GenerationPreflightService(adapter as never, catalog as never);
  return { service, adapter, catalog };
}

describe('GenerationPreflightService', () => {
  it('lets a valid request through and asks the catalog once per distinct model', async () => {
    const { service, adapter, catalog } = setup();

    await expect(service.assertCanStart('owner-1', request)).resolves.toBeUndefined();
    expect(catalog.isKnown).toHaveBeenCalledTimes(2);
    expect(adapter.getEntitlements).toHaveBeenCalledWith('owner-1', { enforceTrial: false });
  });

  it('refuses a 1 micro-USD cap before it looks anything up', async () => {
    const { service, adapter, catalog } = setup();

    await expect(
      service.assertCanStart('owner-1', { ...request, capMicroUsd: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(catalog.isKnown).not.toHaveBeenCalled();
    expect(adapter.getEntitlements).not.toHaveBeenCalled();
  });

  it('refuses a made-up model as unknown, not as a plan problem', async () => {
    const { service } = setup({ known: false });

    const failure = await service
      .assertCanStart('owner-1', request)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(BadRequestException);
    expect((failure as BadRequestException).getResponse()).toMatchObject({
      code: 'THREAD_MODEL_UNKNOWN',
    });
  });

  it('refuses a catalog model the plan does not include with a 403 naming role and model', async () => {
    const { service } = setup();
    const groq = { ...request, judge: role('judge', 'GROQ', 'llama-3.3-70b') };

    const failure = await service.assertCanStart('owner-1', groq).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ForbiddenException);
    expect((failure as ForbiddenException).getResponse()).toMatchObject({
      code: 'MODEL_NOT_ALLOWED_FOR_PLAN',
      role: 'judge',
      model: 'llama-3.3-70b',
      plan: 'none',
    });
  });

  it('refuses an account whose role lacks the permission', async () => {
    const { service } = setup({ entitlements: freeEntitlements({ permissions: [] }) });

    const failure = await service
      .assertCanStart('owner-1', request)
      .catch((error: unknown) => error);

    expect((failure as ForbiddenException).getResponse()).toMatchObject({
      code: 'THREAD_GENERATION_NOT_PERMITTED',
    });
  });

  it('fails closed with 503 when the plan lookup fails', async () => {
    const { service, adapter } = setup();
    adapter.getEntitlements.mockRejectedValue(new Error('auth down'));

    await expect(service.assertCanStart('owner-1', request)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails closed when the catalog cannot be read', async () => {
    const { service, catalog } = setup();
    catalog.isKnown.mockRejectedValue(
      new ServiceUnavailableException('Model catalog is unavailable'),
    );

    await expect(service.assertCanStart('owner-1', request)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
