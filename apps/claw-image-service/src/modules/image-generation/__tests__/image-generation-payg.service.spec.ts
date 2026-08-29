import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode } from '@claw/shared-types';
import type { RabbitMQService } from '@claw/shared-rabbitmq';

import { BusinessException } from '../../../common/errors';
import { ImageGenerationStatus } from '../../../generated/prisma';
import { IMAGE_CREDIT_FAILURE_MESSAGE } from '../constants/image-payg.constants';
import { ImageGenerationService } from '../services/image-generation.service';
import type { ImageExecutionManager } from '../managers/image-execution.manager';
import type { ImageGenerationEventsService } from '../services/image-generation-events.service';
import type { ImageGenerationRepository } from '../repositories/image-generation.repository';
import type { ImageGenerationRecord } from '../types/image-generation.types';

const baseRecord = (overrides: Partial<ImageGenerationRecord> = {}): ImageGenerationRecord => ({
  id: 'img-1',
  userId: 'user-1',
  threadId: null,
  userMessageId: null,
  assistantMessageId: null,
  prompt: 'a cute cat',
  revisedPrompt: null,
  provider: 'IMAGE_GEMINI',
  model: 'gemini-2.5-flash-image',
  width: 1024,
  height: 1024,
  quality: null,
  style: null,
  status: ImageGenerationStatus.QUEUED,
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  latencyMs: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assets: [],
  ...overrides,
});

const creditRefusal = (): BusinessException =>
  new BusinessException(
    'Image generation is not covered by the available credit',
    BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
    HttpStatus.PAYMENT_REQUIRED,
  );

type RepoMock = {
  create: jest.Mock;
  findById: jest.Mock;
  updateStatus: jest.Mock;
  createEvent: jest.Mock;
  createAsset: jest.Mock;
  findByUserId: jest.Mock;
  countByUserId: jest.Mock;
};

/**
 * A repository stand-in that behaves like the real one for the only property
 * these tests care about: what `findById` returns AFTER `updateStatus` has run.
 * The auto-fallback chain reads the row back to decide whether to keep going, so
 * a mock that always answers the same record would make the chain untestable.
 */
const buildRepo = (): RepoMock => {
  const rows = new Map<string, ImageGenerationRecord>();
  rows.set('img-1', baseRecord());
  let nextId = 2;

  return {
    create: jest.fn((data: { provider: string; model: string; userId: string }) => {
      const id = `img-${String(nextId)}`;
      nextId += 1;
      const row = baseRecord({ id, provider: data.provider, model: data.model });
      rows.set(id, row);
      return Promise.resolve(row);
    }),
    findById: jest.fn((id: string) => Promise.resolve(rows.get(id) ?? null)),
    updateStatus: jest.fn(
      (
        id: string,
        status: ImageGenerationRecord['status'],
        extra?: { errorCode?: string; errorMessage?: string },
      ) => {
        const current = rows.get(id) ?? baseRecord({ id });
        const updated = baseRecord({
          ...current,
          status,
          errorCode: extra?.errorCode ?? current.errorCode,
          errorMessage: extra?.errorMessage ?? current.errorMessage,
        });
        rows.set(id, updated);
        return Promise.resolve(updated);
      },
    ),
    createEvent: jest.fn().mockResolvedValue(undefined),
    createAsset: jest.fn().mockResolvedValue({
      id: 'asset-1',
      url: '/api/v1/files/download/file-1',
      downloadUrl: '/api/v1/files/download/file-1',
      mimeType: 'image/png',
      width: null,
      height: null,
      sizeBytes: null,
    }),
    findByUserId: jest.fn().mockResolvedValue([]),
    countByUserId: jest.fn().mockResolvedValue(0),
  };
};

/**
 * Drains the fire-and-forget job started by `void this.processJobWithFallback`.
 *
 * `setImmediate` rather than `Promise.resolve` because each attempt in the
 * chain awaits ~10 times and a microtask-only flush would return while the
 * second attempt was still in flight — which is exactly the assertion these
 * tests make.
 */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 12; i += 1) {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
};

describe('ImageGenerationService — PAYG credit failures (U4)', () => {
  let repo: RepoMock;
  let execute: jest.Mock;
  let events: { publish: jest.Mock; subscribe: jest.Mock };
  let service: ImageGenerationService;

  beforeEach(() => {
    repo = buildRepo();
    execute = jest.fn();
    events = { publish: jest.fn(), subscribe: jest.fn() };
    service = new ImageGenerationService(
      repo as unknown as ImageGenerationRepository,
      { execute } as unknown as ImageExecutionManager,
      events as unknown as ImageGenerationEventsService,
      { publish: jest.fn().mockResolvedValue(undefined) } as unknown as RabbitMQService,
    );
  });

  it('mints a distinct requestId per attempt so a retry is not billed as the first call', async () => {
    execute.mockResolvedValue({ fileId: 'file-1', revisedPrompt: null, latencyMs: 10 });

    await service.retryGeneration('img-1');
    await flush();
    await service.retryGeneration('img-1');
    await flush();

    const first = execute.mock.calls[0]?.[0] as { requestId: string } | undefined;
    const second = execute.mock.calls[1]?.[0] as { requestId: string } | undefined;
    expect(first?.requestId).toContain('img-1:');
    expect(second?.requestId).toContain('img-1:');
    expect(first?.requestId).not.toBe(second?.requestId);
  });

  it('stores the credit errorCode on the row instead of the generic provider failure', async () => {
    execute.mockRejectedValue(creditRefusal());

    await service.retryGeneration('img-1');
    await flush();

    expect(repo.updateStatus).toHaveBeenCalledWith(
      'img-1',
      'FAILED',
      expect.objectContaining({
        errorCode: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
        errorMessage: IMAGE_CREDIT_FAILURE_MESSAGE,
      }),
    );
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
        errorMessage: IMAGE_CREDIT_FAILURE_MESSAGE,
      }),
    );
  });

  it('keeps the generic provider failure for a non-credit error', async () => {
    execute.mockRejectedValue(new Error('gemini exploded'));

    await service.retryGeneration('img-1');
    await flush();

    expect(repo.updateStatus).toHaveBeenCalledWith(
      'img-1',
      'FAILED',
      expect.objectContaining({ errorCode: 'PROVIDER_FAILURE' }),
    );
  });

  it('makes no further PAID attempt once the wallet has refused (E3)', async () => {
    // Every attempt is refused for credit. Without the latch, the chain would
    // walk GEMINI -> OPENAI and bill a second paid provider against a wallet
    // that could not afford the first.
    execute.mockRejectedValue(creditRefusal());

    await service.enqueueGeneration({
      prompt: 'a cute cat',
      provider: 'IMAGE_GEMINI',
      model: 'gemini-2.5-flash-image',
      userId: 'user-1',
      isAutoMode: true,
    });
    await flush();

    const attemptedProviders = execute.mock.calls.map(
      (call) => (call[0] as { provider: string }).provider,
    );
    expect(attemptedProviders).not.toContain('IMAGE_OPENAI');
    // D4: local compute keeps working at zero credit, so the chain degrades to
    // it rather than refusing outright.
    expect(attemptedProviders.slice(1).every((p) => p.startsWith('IMAGE_LOCAL'))).toBe(true);
  });

  it('still walks the full paid chain when the failure was not about credit', async () => {
    execute.mockRejectedValue(new Error('gemini exploded'));

    await service.enqueueGeneration({
      prompt: 'a cute cat',
      provider: 'IMAGE_GEMINI',
      model: 'gemini-2.5-flash-image',
      userId: 'user-1',
      isAutoMode: true,
    });
    await flush();

    const attemptedProviders = execute.mock.calls.map(
      (call) => (call[0] as { provider: string }).provider,
    );
    expect(attemptedProviders).toContain('IMAGE_OPENAI');
  });
});
