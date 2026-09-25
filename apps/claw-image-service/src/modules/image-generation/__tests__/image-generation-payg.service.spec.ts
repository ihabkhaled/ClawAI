import { type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode } from '@claw/shared-types';
import type { RabbitMQService } from '@claw/shared-rabbitmq';

import { BusinessException } from '../../../common/errors';
import { IMAGE_CREDIT_FAILURE_MESSAGE } from '../constants/image-payg.constants';
import { ImageGenerationService } from '../services/image-generation.service';
import type { ImageExecutionManager } from '../managers/image-execution.manager';
import type { ImageGenerationEventsService } from '../services/image-generation-events.service';
import type { ImageGenerationRepository } from '../repositories/image-generation.repository';
import {
  buildInMemoryImageRepo,
  flushImageJobs as flush,
  type InMemoryImageRepo,
} from './fixtures/in-memory-image-repo.fixture';

const creditRefusal = (): BusinessException =>
  new BusinessException(
    'Image generation is not covered by the available credit',
    BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
    HttpStatus.PAYMENT_REQUIRED,
  );

describe('ImageGenerationService — PAYG credit failures (U4)', () => {
  let repo: InMemoryImageRepo;
  let execute: Mock;
  let events: { publish: Mock; subscribe: Mock };
  let service: ImageGenerationService;

  beforeEach(() => {
    repo = buildInMemoryImageRepo();
    execute = vi.fn();
    events = { publish: vi.fn(), subscribe: vi.fn() };
    service = new ImageGenerationService(
      repo as unknown as ImageGenerationRepository,
      { execute } as unknown as ImageExecutionManager,
      events as unknown as ImageGenerationEventsService,
      { publish: vi.fn().mockResolvedValue(undefined) } as unknown as RabbitMQService,
      { assertCanGenerate: vi.fn().mockResolvedValue(undefined) } as never,
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
