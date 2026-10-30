import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import type { UserEntitlements } from '@claw/shared-entitlements';
import {
  Locale,
  ModelCostClass,
  Permission,
  PlanModelAccessMode,
  ThreadPublicationType,
} from '@claw/shared-types';

import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import { costClassKey } from '../../utilities/model-cost-class.utility';
import { GenerationPreflightService } from '../generation-preflight.service';

const role = (id: string, model: string) => ({
  id,
  provider: 'GEMINI',
  model,
  maxOutputTokens: 1024,
  fallbacks: [],
});

function requestFor(model: string): StartThreadGenerationDto {
  return {
    capMicroUsd: 2_000_000,
    sourceThreadId: 'thread-1',
    idempotencyKey: 'key-1',
    correlationId: 'corr-1',
    publicIntentVersion: 'threads-public-v1',
    contentLocale: Locale.EN,
    topic: 'A sufficiently detailed topic for research',
    publicationType: ThreadPublicationType.ARTICLE,
    authors: [role('author-1', model), role('author-2', model), role('author-3', model)],
    judge: role('judge', model),
    critic: role('critic', model),
  };
}

const free = {
  userId: 'owner-1',
  role: 'USER',
  isAdmin: false,
  permissions: [Permission.THREAD_GENERATION_USE],
  modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
  allowedCostClasses: [ModelCostClass.FREE, ModelCostClass.CHEAP],
  allowedModels: [],
  plan: { name: 'Free', slug: 'free' },
} as unknown as UserEntitlements;

const answered = new Map([
  [costClassKey('GEMINI', 'flash'), ModelCostClass.CHEAP],
  [costClassKey('GEMINI', 'pro'), ModelCostClass.PREMIUM],
  [costClassKey('GEMINI', 'unpriced'), null],
]);

function setup(classes: Map<string, ModelCostClass | null>) {
  const forPlan = vi.fn().mockResolvedValue(classes);
  const service = new GenerationPreflightService(
    { getEntitlements: vi.fn().mockResolvedValue(free) } as never,
    { isKnown: vi.fn().mockResolvedValue(true) } as never,
    { forPlan } as never,
  );
  return { service, forPlan };
}

describe('GenerationPreflightService on a cost-class plan (ADR-198)', () => {
  it('lets a Free user start with a cheap model, asking routing once per distinct model', async () => {
    const { service, forPlan } = setup(answered);

    await expect(service.assertCanStart('owner-1', requestFor('flash'))).resolves.toBeUndefined();
    expect(forPlan).toHaveBeenCalledWith(free, [{ provider: 'GEMINI', model: 'flash' }]);
  });

  it('refuses a premium model with the plan error', async () => {
    const { service } = setup(answered);
    const failure = await service
      .assertCanStart('owner-1', requestFor('pro'))
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ForbiddenException);
    expect((failure as ForbiddenException).getResponse()).toMatchObject({
      code: 'MODEL_NOT_ALLOWED_FOR_PLAN',
    });
  });

  it('refuses an unpriced model', async () => {
    const { service } = setup(answered);
    await expect(service.assertCanStart('owner-1', requestFor('unpriced'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('refuses with 503, not a guess, when routing could not answer', async () => {
    const { service } = setup(new Map());
    await expect(service.assertCanStart('owner-1', requestFor('flash'))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
