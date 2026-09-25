import { type Mock, type MockInstance, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import {
  EntitlementsRequestError,
  type PlanFeatureGates,
  type UserEntitlements,
} from '@claw/shared-entitlements';

import { BusinessException } from '../../../common/errors';
import { ImageGenerationStatus } from '../../../generated/prisma';
import { ImageExecutionManager } from '../managers/image-execution.manager';
import { ImagePlanGateManager } from '../managers/image-plan-gate.manager';
import { ImageGenerationService } from '../services/image-generation.service';
import type { ImageGenerationRecord } from '../types/image-generation.types';

// ADR-122: image generation and image edit are the paid half of the media
// split, and image-service — the service that executes them — refuses a plan
// without `allowImageGeneration` before a row, a PAYG hold or a provider call.

const FREE_GATES = { allowImageGeneration: false } as PlanFeatureGates;
const PAID_GATES = { allowImageGeneration: true } as PlanFeatureGates;

const entitlements = (gates: PlanFeatureGates, isAdmin = false): UserEntitlements => ({
  userId: 'user-1',
  role: isAdmin ? 'ADMIN' : 'USER',
  isAdmin,
  permissions: [],
  plan: {
    id: 'plan-1',
    slug: 'free',
    name: 'Free',
    isTrial: true,
    trialEndsAt: null,
    isTrialExpired: false,
    limits: {
      dailyTokens: 50_000,
      weeklyTokens: null,
      monthlyTokens: null,
      chatsPerDay: null,
      messagesPerDay: null,
      workspaceConnections: null,
      contextPacks: null,
      memoryItems: null,
      maxVideoSeconds: 60,
    },
    featureGates: gates,
  },
  allowedModels: [],
  allowedProviders: [],
  quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false, adminBypass: false },
});

const record = (overrides: Partial<ImageGenerationRecord> = {}): ImageGenerationRecord => ({
  id: 'img-1',
  userId: 'user-1',
  threadId: null,
  userMessageId: null,
  assistantMessageId: null,
  prompt: 'a lighthouse at dusk',
  revisedPrompt: null,
  provider: 'IMAGE_OPENAI',
  model: 'gpt-image-1',
  width: 1024,
  height: 1024,
  quality: null,
  style: null,
  status: ImageGenerationStatus.FAILED,
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  latencyMs: null,
  supersededById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assets: [],
  ...overrides,
});

const captureError = async (promise: Promise<unknown>): Promise<BusinessException> => {
  const error: unknown = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BusinessException);
  return error as BusinessException;
};

const flush = async (): Promise<void> => {
  for (let i = 0; i < 8; i += 1) {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
};

type Harness = {
  service: ImageGenerationService;
  getEntitlements: Mock;
  reserve: Mock;
  execute: MockInstance<ImageExecutionManager['execute']>;
  create: Mock;
  updateStatus: Mock;
  fetchSpy: Mock;
};

/**
 * A REAL gate over a mocked auth adapter, and a REAL execution manager over a
 * mocked PAYG meter — so "no hold and no provider call" is asserted on the
 * objects that would actually do them, not on a stub that could never have.
 */
const build = (answer: () => Promise<UserEntitlements>): Harness => {
  const getEntitlements = vi.fn(answer);
  const reserve = vi.fn();
  const fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  const executionManager = new ImageExecutionManager(
    {} as never,
    { reserve } as never,
    {} as never,
  );
  const execute = vi.spyOn(executionManager, 'execute');
  const create = vi.fn().mockResolvedValue(record({ status: ImageGenerationStatus.QUEUED }));
  const updateStatus = vi.fn().mockResolvedValue(record());
  const repo = {
    create,
    updateStatus,
    findById: vi.fn().mockResolvedValue(record({ status: ImageGenerationStatus.QUEUED })),
    createEvent: vi.fn().mockResolvedValue(undefined),
    findReferenceAsset: vi.fn().mockResolvedValue(null),
    createSuccessor: create,
    createAsset: vi.fn().mockResolvedValue({
      id: 'asset-1',
      url: '/api/v1/files/download/file-1',
      downloadUrl: '/api/v1/files/download/file-1',
      mimeType: 'image/png',
      width: null,
      height: null,
      sizeBytes: null,
    }),
  };
  const service = new ImageGenerationService(
    repo as never,
    executionManager,
    { publish: vi.fn() } as never,
    { publish: vi.fn().mockResolvedValue(undefined) } as never,
    new ImagePlanGateManager({ getEntitlements } as never),
  );
  return { service, getEntitlements, reserve, execute, create, updateStatus, fetchSpy };
};

const GENERATE = {
  prompt: 'a lighthouse at dusk',
  provider: 'IMAGE_OPENAI',
  model: 'gpt-image-1',
  userId: 'user-1',
};

describe('image generation plan gate (ADR-122)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('a free plan', () => {
    const free = (): Harness => build(async () => entitlements(FREE_GATES));

    it('is refused on the chat-dispatched internal generate with 403 PLAN_FEATURE_DISABLED', async () => {
      const h = free();

      const error = await captureError(h.service.enqueueGeneration(GENERATE));
      await flush();

      expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(error.code).toBe('PLAN_FEATURE_DISABLED');
      expect(h.getEntitlements).toHaveBeenCalledWith('user-1');
      expect(h.create).not.toHaveBeenCalled();
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.reserve).not.toHaveBeenCalled();
      expect(h.fetchSpy).not.toHaveBeenCalled();
    });

    it('is refused for an image EDIT (a reference image) the same way', async () => {
      const h = free();

      const error = await captureError(
        h.service.enqueueGeneration({
          ...GENERATE,
          referenceImageBase64: 'aGVsbG8=',
          referenceImageMimeType: 'image/png',
        }),
      );

      expect(error.code).toBe('PLAN_FEATURE_DISABLED');
      expect(h.reserve).not.toHaveBeenCalled();
    });

    it.each([
      ['internal retry', (h: Harness) => h.service.retryGeneration('img-1')],
      ['owner retry', (h: Harness) => h.service.retryGenerationForUser('img-1', 'user-1')],
      [
        'internal retry-alternate',
        (h: Harness) => h.service.retryWithAlternateModel('img-1', 'IMAGE_GEMINI', 'g'),
      ],
      [
        'owner retry-alternate',
        (h: Harness) =>
          h.service.retryWithAlternateModelForUser('img-1', 'user-1', 'IMAGE_GEMINI', 'g'),
      ],
    ])('is refused on %s before the job is re-queued or billed', async (_name, run) => {
      const h = free();

      const error = await captureError(run(h));
      await flush();

      expect(error.code).toBe('PLAN_FEATURE_DISABLED');
      expect(h.updateStatus).not.toHaveBeenCalled();
      expect(h.create).not.toHaveBeenCalled();
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.reserve).not.toHaveBeenCalled();
    });
  });

  describe('a paid plan', () => {
    it('proceeds to the job on the internal generate', async () => {
      const h = build(async () => entitlements(PAID_GATES));
      h.execute.mockResolvedValue({ fileId: 'file-1', revisedPrompt: null, latencyMs: 5 });

      await h.service.enqueueGeneration(GENERATE);
      await flush();

      expect(h.create).toHaveBeenCalledTimes(1);
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('proceeds on a retry', async () => {
      const h = build(async () => entitlements(PAID_GATES));
      h.execute.mockResolvedValue({ fileId: 'file-1', revisedPrompt: null, latencyMs: 5 });

      await h.service.retryGenerationForUser('img-1', 'user-1');
      await flush();

      expect(h.updateStatus).toHaveBeenCalled();
      expect(h.execute).toHaveBeenCalled();
    });
  });

  it('lets ADMIN through even on a plan that locks the feature', async () => {
    const h = build(async () => entitlements(FREE_GATES, true));
    h.execute.mockResolvedValue({ fileId: 'file-1', revisedPrompt: null, latencyMs: 5 });

    await h.service.enqueueGeneration(GENERATE);

    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it('fails CLOSED with 503 ENTITLEMENTS_UNAVAILABLE when auth-service cannot answer', async () => {
    const h = build(async () => {
      throw new TypeError('fetch failed');
    });

    const error = await captureError(h.service.enqueueGeneration(GENERATE));

    expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(error.code).toBe('ENTITLEMENTS_UNAVAILABLE');
    expect(h.create).not.toHaveBeenCalled();
    expect(h.reserve).not.toHaveBeenCalled();
  });

  it('passes auth-service stated refusals through with their own code', async () => {
    const h = build(async () => {
      throw new EntitlementsRequestError(HttpStatus.FORBIDDEN, 'PLAN_TRIAL_EXPIRED');
    });

    const error = await captureError(h.service.enqueueGeneration(GENERATE));

    expect(error.code).toBe('PLAN_TRIAL_EXPIRED');
    expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
  });
});
