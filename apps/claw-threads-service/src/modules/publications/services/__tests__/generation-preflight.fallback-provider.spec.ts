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

/**
 * ADR-181: a team that uses one provider has no other provider to fall back to, and most failures
 * (a refused reply, a model-specific 400, a window) are the model's, not the provider's. A
 * fallback of another model on the same provider is therefore allowed; the pipeline drops only a
 * fallback that is the primary itself, and says so in the step log.
 */
describe('GenerationPreflightService same-provider fallback (ADR-181)', () => {
  it('accepts a start whose fallback is another model of its primary provider', async () => {
    const { service, catalog } = setup();

    await expect(
      service.assertCanStart('owner-1', request([{ provider: 'GEMINI', model: 'm2' }])),
    ).resolves.toBeUndefined();
    // The fallback is looked up and plan-checked like any other model.
    expect(catalog.isKnown).toHaveBeenCalledWith({ provider: 'GEMINI', model: 'm2' });
  });

  it('accepts a fallback on another provider', async () => {
    const { service } = setup();

    await expect(
      service.assertCanStart('owner-1', request([{ provider: 'OPENAI', model: 'm2' }])),
    ).resolves.toBeUndefined();
  });

  it('still refuses a fallback the catalog does not know, same provider or not', async () => {
    const { service, catalog } = setup();
    catalog.isKnown.mockImplementation(({ model }: { model: string }) =>
      Promise.resolve(model !== 'nope'),
    );

    await expect(
      service.assertCanStart('owner-1', request([{ provider: 'GEMINI', model: 'nope' }])),
    ).rejects.toMatchObject({ response: { code: 'THREAD_MODEL_UNKNOWN' } });
  });

  it('accepts the same on a retry', async () => {
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
    ).resolves.toBeUndefined();
  });
});
