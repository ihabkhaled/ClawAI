import { BadRequestException } from '@nestjs/common';
import type { UserEntitlements } from '@claw/shared-entitlements';
import { Locale, Permission, PlanModelAccessMode, ThreadPublicationType } from '@claw/shared-types';

import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import type { StoredGenerationSelections } from '../../types/generation-preflight.types';
import { GenerationPreflightService } from '../generation-preflight.service';

type Fallbacks = Array<{ provider: string; model: string }>;

const role = (id: string, provider: string, fallbacks: Fallbacks) => ({
  id,
  provider,
  model: 'm1',
  maxOutputTokens: 1024,
  fallbacks,
});

const request = (fallbacks: Fallbacks): StartThreadGenerationDto => ({
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'key-1',
  correlationId: 'corr-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: Locale.EN,
  topic: 'A sufficiently detailed topic for research',
  publicationType: ThreadPublicationType.ARTICLE,
  authors: [
    role('author-1', 'GEMINI', []),
    role('author-2', 'GEMINI', fallbacks),
    role('author-3', 'OPENAI', []),
  ],
  judge: role('judge', 'OPENAI', []),
  critic: role('critic', 'OPENAI', []),
});

const entitlements: UserEntitlements = {
  userId: 'owner-1',
  role: 'USER',
  isAdmin: false,
  permissions: [Permission.THREAD_GENERATION_USE],
  modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
  allowedModels: [],
  plan: null,
  allowedProviders: [],
  quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false, adminBypass: false },
};

function setup() {
  const adapter = { getEntitlements: vi.fn().mockResolvedValue(entitlements) };
  const catalog = { isKnown: vi.fn().mockResolvedValue(true) };
  return {
    service: new GenerationPreflightService(adapter as never, catalog as never),
    adapter,
    catalog,
  };
}

const seat = (roleId: string, roleKind: string, provider: string, fallbacks: Fallbacks) => ({
  roleId,
  roleKind,
  provider,
  model: 'm1',
  fallbacks,
});

describe('GenerationPreflightService same-provider fallback (N-01)', () => {
  it('refuses a start whose fallback shares its primary provider, before any lookup', async () => {
    const { service, adapter, catalog } = setup();

    const failure = await service
      .assertCanStart('owner-1', request([{ provider: 'GEMINI', model: 'm2' }]))
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(BadRequestException);
    expect((failure as BadRequestException).getResponse()).toMatchObject({
      code: 'THREAD_FALLBACK_SAME_PROVIDER',
      role: 'author',
      roleId: 'author-2',
    });
    expect(catalog.isKnown).not.toHaveBeenCalled();
    expect(adapter.getEntitlements).not.toHaveBeenCalled();
  });

  it('accepts a fallback on another provider', async () => {
    const { service } = setup();

    await expect(
      service.assertCanStart('owner-1', request([{ provider: 'OPENAI', model: 'm2' }])),
    ).resolves.toBeUndefined();
  });

  it('refuses the same on a retry', async () => {
    const { service } = setup();
    const stored: StoredGenerationSelections = {
      spendCapMicroUsd: '2000000',
      roles: [
        seat('author-1', 'AUTHOR', 'GEMINI', [{ provider: 'GEMINI', model: 'm9' }]),
        seat('author-2', 'AUTHOR', 'GEMINI', []),
        seat('author-3', 'AUTHOR', 'OPENAI', []),
        seat('judge', 'JUDGE', 'OPENAI', []),
        seat('critic', 'CRITIC', 'OPENAI', []),
      ],
    };

    await expect(
      service.assertCanRetry('owner-1', stored, { idempotencyKey: 'r1' }),
    ).rejects.toMatchObject({ response: { code: 'THREAD_FALLBACK_SAME_PROVIDER' } });
  });
});
