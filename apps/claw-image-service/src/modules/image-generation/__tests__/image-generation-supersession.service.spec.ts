import { HttpStatus } from '@nestjs/common';
import { type Mock, vi } from 'vitest';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  type ClawRuntimeProgressEvent,
  EventPattern,
  RuntimeProgressConfidence,
  RuntimeProgressStage,
} from '@claw/shared-types';

import { BusinessException } from '../../../common/errors';
import { ImageFailureCode } from '../../../common/enums';
import { ImageGenerationStatus } from '../../../generated/prisma';
import { IMAGE_SUPERSESSION_MAX_HOPS } from '../constants/image-supersession.constants';
import { imageFailure } from '../adapter.utilities/provider-error.utility';
import { ImageGenerationService } from '../services/image-generation.service';
import { ImageMediaMetricsService } from '../../metrics/services/image-media-metrics.service';
import type { ImageExecutionManager } from '../managers/image-execution.manager';
import type { ImageGenerationEventsService } from '../services/image-generation-events.service';
import type { ImageGenerationRepository } from '../repositories/image-generation.repository';
import type { ExecuteImageInput } from '../types/image-generation.types';
import {
  baseRecord,
  buildInMemoryImageRepo,
  flushImageJobs as flush,
  type InMemoryImageRepo,
} from './fixtures/in-memory-image-repo.fixture';

const OWNER = 'user-1';
const STRANGER = 'user-2';
const OK = { fileId: 'file-out', revisedPrompt: null, latencyMs: 5 };

const captureError = async (promise: Promise<unknown>): Promise<BusinessException> => {
  const error: unknown = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BusinessException);
  return error as BusinessException;
};

describe('ImageGenerationService — supersession, reference reuse and progress', () => {
  let repo: InMemoryImageRepo;
  let execute: Mock;
  let loadStoredReference: Mock;
  let publish: Mock;
  let busPublish: Mock;
  let service: ImageGenerationService;
  let metrics: ImageMediaMetricsService;

  const attempts = (): ExecuteImageInput[] =>
    execute.mock.calls.map((call) => call[0] as ExecuteImageInput);

  const build = (seed = baseRecord()): void => {
    repo = buildInMemoryImageRepo(seed);
    execute = vi.fn();
    loadStoredReference = vi.fn();
    publish = vi.fn();
    busPublish = vi.fn().mockResolvedValue(undefined);
    metrics = new ImageMediaMetricsService();
    service = new ImageGenerationService(
      repo as unknown as ImageGenerationRepository,
      {
        execute,
        loadStoredReference,
        settle: vi.fn().mockResolvedValue(undefined),
        releaseUnpersisted: vi.fn().mockResolvedValue(undefined),
      } as unknown as ImageExecutionManager,
      { publish } as unknown as ImageGenerationEventsService,
      { publish: busPublish } as unknown as RabbitMQService,
      { assertCanGenerate: vi.fn().mockResolvedValue(undefined) } as never,
      metrics,
    );
  };

  const enqueueAuto = async (extra: Record<string, unknown> = {}): Promise<string> => {
    const record = await service.enqueueGeneration({
      prompt: 'a cute cat',
      provider: 'IMAGE_GEMINI',
      model: 'gemini-2.5-flash-image',
      userId: OWNER,
      isAutoMode: true,
      ...extra,
    });
    await flush();
    return record.id;
  };

  beforeEach(() => {
    build();
  });

  describe('metrics (pack §67)', () => {
    it('counts a failed AUTO attempt that handed off as superseded, and its successor as completed', async () => {
      execute.mockRejectedValueOnce(new Error('gemini down')).mockResolvedValueOnce(OK);
      const rootId = await enqueueAuto();

      const text = metrics.render();
      expect(text).toContain(
        'claw_image_generations_total{provider="image_gemini",outcome="superseded"} 1',
      );
      expect(text).toContain(
        'claw_image_generations_total{provider="image_openai",outcome="completed"} 1',
      );
      expect(text).toContain(
        'claw_image_generation_duration_seconds_count{provider="image_openai",outcome="completed"} 1',
      );
      expect(text).not.toContain(rootId);
      expect(text).not.toContain(OWNER);
      expect(text).not.toContain('cute cat');
    });

    it('counts a failure with no successor as failed', async () => {
      execute.mockRejectedValue(new Error('down everywhere'));
      await service.enqueueGeneration({
        prompt: 'a cute cat',
        provider: 'IMAGE_GEMINI',
        model: 'gemini-2.5-flash-image',
        userId: OWNER,
        isAutoMode: false,
      });
      await flush();
      expect(metrics.render()).toContain(
        'claw_image_generations_total{provider="image_gemini",outcome="failed"} 1',
      );
    });
  });

  describe('auto-fallback', () => {
    it('links the failed row to the fallback that succeeded, and GET returns it as latest', async () => {
      execute.mockRejectedValueOnce(new Error('gemini down')).mockResolvedValueOnce(OK);

      const rootId = await enqueueAuto();

      expect(repo.createSuccessor).toHaveBeenCalledTimes(1);
      expect(repo.createSuccessor).toHaveBeenCalledWith(
        rootId,
        expect.objectContaining({ provider: 'IMAGE_OPENAI', userId: OWNER }),
      );
      const successorId = repo.rows.get(rootId)?.supersededById;
      expect(successorId).toBeTruthy();
      const view = await service.getWithLatestForUser(rootId, OWNER);
      expect(view.status).toBe(ImageGenerationStatus.FAILED);
      expect(view.supersededById).toBe(successorId);
      expect(view.latest.id).toBe(successorId);
      expect(view.latest.status).toBe(ImageGenerationStatus.COMPLETED);
    });

    it('names the successor ON the FAILED event, so a live listener can switch before it closes', async () => {
      execute.mockRejectedValueOnce(new Error('gemini down')).mockResolvedValueOnce(OK);

      const rootId = await enqueueAuto();

      const failed = publish.mock.calls
        .map((call) => call[0] as { generationId: string; status: string; supersededById?: string })
        .find((event) => event.generationId === rootId && event.status === 'FAILED');
      expect(failed?.supersededById).toBe(repo.rows.get(rootId)?.supersededById);
    });

    it('carries supersededById on the image.failed BUS event when a successor exists', async () => {
      execute.mockRejectedValueOnce(new Error('gemini down')).mockResolvedValueOnce(OK);

      const rootId = await enqueueAuto();

      const failed = busPublish.mock.calls.filter((call) => call[0] === EventPattern.IMAGE_FAILED);
      expect(failed).toHaveLength(1);
      expect(failed[0]?.[1]).toMatchObject({
        generationId: rootId,
        userId: OWNER,
        supersededById: repo.rows.get(rootId)?.supersededById,
      });
    });

    it('omits supersededById on a terminal image.failed (no successor)', async () => {
      execute.mockRejectedValue(new Error('down everywhere'));

      const rootId = await enqueueAuto({ isAutoMode: false });

      const failed = busPublish.mock.calls.find(
        (call) => call[0] === EventPattern.IMAGE_FAILED && call[1]?.generationId === rootId,
      );
      expect(failed?.[1]).toBeDefined();
      expect(failed?.[1]).not.toHaveProperty('supersededById');
      expect(typeof failed?.[1]?.timestamp).toBe('string');
    });

    it('chains every attempt (root → fallback 1 → fallback 2) and GET follows to the last', async () => {
      execute
        .mockRejectedValueOnce(new Error('a'))
        .mockRejectedValueOnce(new Error('b'))
        .mockResolvedValueOnce(OK);

      const rootId = await enqueueAuto();

      const first = repo.rows.get(rootId)?.supersededById ?? '';
      const second = repo.rows.get(first)?.supersededById ?? '';
      expect(first).not.toBe('');
      expect(second).not.toBe('');
      expect(repo.rows.get(second)?.supersededById).toBeNull();
      const view = await service.getWithLatestForUser(rootId, OWNER);
      expect(view.latest.id).toBe(second);
      expect(view.latest.status).toBe(ImageGenerationStatus.COMPLETED);
    });

    it('takes exactly one paid attempt per row — supersession adds no hold', async () => {
      execute
        .mockRejectedValueOnce(new Error('a'))
        .mockRejectedValueOnce(new Error('b'))
        .mockResolvedValueOnce(OK);

      await enqueueAuto();

      // One execute = one reserve in the manager. Three rows, three attempts,
      // three distinct idempotency keys: the link itself never calls a provider.
      expect(execute).toHaveBeenCalledTimes(3);
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.createSuccessor).toHaveBeenCalledTimes(2);
      const requestIds = attempts().map((input) => input.requestId);
      expect(new Set(requestIds).size).toBe(3);
    });

    it('does not supersede outside AUTO mode', async () => {
      execute.mockRejectedValue(new Error('down'));

      const record = await service.enqueueGeneration({
        prompt: 'a cute cat',
        provider: 'IMAGE_GEMINI',
        model: 'gemini-2.5-flash-image',
        userId: OWNER,
      });
      await flush();

      expect(repo.createSuccessor).not.toHaveBeenCalled();
      const view = await service.getWithLatestForUser(record.id, OWNER);
      expect(view.latest.id).toBe(record.id);
      expect(view.latest.status).toBe(ImageGenerationStatus.FAILED);
    });
  });

  describe('user retry-alternate', () => {
    beforeEach(() => {
      build(baseRecord({ status: ImageGenerationStatus.FAILED }));
    });

    it('links the old row to the new one and tells the old row’s listeners to follow', async () => {
      execute.mockResolvedValue(OK);

      const alternate = await service.retryWithAlternateModelForUser(
        'img-1',
        OWNER,
        'IMAGE_OPENAI',
        'gpt-image-1',
      );
      await flush();

      expect(repo.rows.get('img-1')?.supersededById).toBe(alternate.id);
      expect(publish).toHaveBeenCalledWith(
        expect.objectContaining({ generationId: 'img-1', supersededById: alternate.id }),
      );
      // Refresh restoration: the ORIGINAL id now resolves to the alternate's result.
      const view = await service.getWithLatestForUser('img-1', OWNER);
      expect(view.latest.id).toBe(alternate.id);
      expect(view.latest.status).toBe(ImageGenerationStatus.COMPLETED);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('refuses to retry or branch a row that was already superseded (409, nothing runs)', async () => {
      repo.rows.set(
        'img-1',
        baseRecord({ status: ImageGenerationStatus.FAILED, supersededById: 'img-9' }),
      );

      const retry = await captureError(service.retryGenerationForUser('img-1', OWNER));
      const branch = await captureError(
        service.retryWithAlternateModelForUser('img-1', OWNER, 'IMAGE_OPENAI', 'gpt-image-1'),
      );
      await flush();

      expect(retry.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(retry.code).toBe('IMAGE_GENERATION_SUPERSEDED');
      expect(branch.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(repo.createSuccessor).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
    });
  });

  describe('GET resolves the chain safely', () => {
    const chainOf = (length: number, ownerOf: (index: number) => string = () => OWNER): void => {
      build(baseRecord({ id: 'c-0', status: ImageGenerationStatus.FAILED, supersededById: 'c-1' }));
      for (let index = 1; index < length; index += 1) {
        repo.rows.set(
          `c-${String(index)}`,
          baseRecord({
            id: `c-${String(index)}`,
            userId: ownerOf(index),
            status: ImageGenerationStatus.FAILED,
            supersededById: index < length - 1 ? `c-${String(index + 1)}` : null,
          }),
        );
      }
    };

    it(`follows at most ${String(IMAGE_SUPERSESSION_MAX_HOPS)} links`, async () => {
      chainOf(IMAGE_SUPERSESSION_MAX_HOPS + 5);

      const view = await service.getWithLatestForUser('c-0', OWNER);

      expect(view.latest.id).toBe(`c-${String(IMAGE_SUPERSESSION_MAX_HOPS)}`);
      // Row reads: the root, then one per hop — never the whole chain.
      expect(repo.findById).toHaveBeenCalledTimes(IMAGE_SUPERSESSION_MAX_HOPS + 1);
    });

    it('answers a stranger asking for the root with the same 404 as a missing id', async () => {
      chainOf(3);

      const error = await captureError(service.getWithLatestForUser('c-0', STRANGER));

      expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(error.code).toBe('IMAGE_NOT_FOUND');
    });

    it("stops at the last row the caller owns — never reads through to someone else's", async () => {
      chainOf(4, (index) => (index >= 2 ? STRANGER : OWNER));

      const view = await service.getWithLatestForUser('c-0', OWNER);

      expect(view.latest.id).toBe('c-1');
      expect(JSON.stringify(view)).not.toContain('c-2');
    });

    it('hides even the id of a first link that points at someone else', async () => {
      chainOf(2, () => STRANGER);

      const view = await service.getWithLatestForUser('c-0', OWNER);

      expect(view.latest.id).toBe('c-0');
      expect(view.supersededById).toBeNull();
      expect(view.latest.supersededById).toBeNull();
    });

    it('stops at a dangling link instead of failing the read', async () => {
      build(baseRecord({ supersededById: 'gone' }));

      const view = await service.getWithLatestForUser('img-1', OWNER);

      expect(view.latest.id).toBe('img-1');
    });
  });

  describe('reference image', () => {
    const REFERENCE = {
      referenceImageBase64: 'aGVsbG8=',
      referenceImageMimeType: 'image/png',
      referenceFileId: 'file-ref',
    };

    it('stores an uploaded reference as its file id and sends the bytes on the first attempt', async () => {
      execute.mockResolvedValue(OK);

      const rootId = await enqueueAuto(REFERENCE);

      expect(repo.createReferenceAsset).toHaveBeenCalledWith({
        generationId: rootId,
        fileId: 'file-ref',
        mimeType: 'image/png',
      });
      expect(attempts()[0]).toMatchObject({
        referenceImageBase64: 'aGVsbG8=',
        referenceImageMimeType: 'image/png',
      });
      expect(loadStoredReference).not.toHaveBeenCalled();
    });

    it('sends the same reference to an auto-fallback attempt', async () => {
      execute.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(OK);

      await enqueueAuto(REFERENCE);

      expect(attempts()[1]).toMatchObject({ referenceImageBase64: 'aGVsbG8=' });
    });

    it('re-reads the stored reference on retry-alternate instead of dropping it', async () => {
      execute.mockRejectedValueOnce(new Error('down'));
      const record = await service.enqueueGeneration({
        prompt: 'make it blue',
        provider: 'IMAGE_GEMINI',
        model: 'gemini-2.5-flash-image',
        userId: OWNER,
        ...REFERENCE,
      });
      await flush();
      loadStoredReference.mockResolvedValue({ base64: 'c3RvcmVk', mimeType: 'image/png' });
      execute.mockResolvedValue(OK);

      await service.retryWithAlternateModelForUser(record.id, OWNER, 'IMAGE_OPENAI', 'gpt-image-1');
      await flush();

      expect(loadStoredReference).toHaveBeenCalledWith('file-ref', OWNER);
      expect(attempts()[1]).toMatchObject({
        provider: 'IMAGE_OPENAI',
        referenceImageBase64: 'c3RvcmVk',
      });
    });

    it('re-reads the stored reference on a same-row retry', async () => {
      execute.mockRejectedValueOnce(new Error('down'));
      const record = await service.enqueueGeneration({
        prompt: 'make it blue',
        provider: 'IMAGE_GEMINI',
        model: 'gemini-2.5-flash-image',
        userId: OWNER,
        ...REFERENCE,
      });
      await flush();
      loadStoredReference.mockResolvedValue({ base64: 'c3RvcmVk', mimeType: 'image/png' });
      execute.mockResolvedValue(OK);

      await service.retryGenerationForUser(record.id, OWNER);
      await flush();

      expect(attempts()[1]).toMatchObject({ referenceImageBase64: 'c3RvcmVk' });
    });

    it('fails a retry honestly when the reference cannot be read back — no provider call', async () => {
      execute.mockRejectedValueOnce(new Error('down'));
      const record = await service.enqueueGeneration({
        prompt: 'make it blue',
        provider: 'IMAGE_GEMINI',
        model: 'gemini-2.5-flash-image',
        userId: OWNER,
        ...REFERENCE,
      });
      await flush();
      loadStoredReference.mockRejectedValue(
        imageFailure(ImageFailureCode.REFERENCE_UNAVAILABLE, 'deleted'),
      );

      await service.retryGenerationForUser(record.id, OWNER);
      await flush();

      expect(execute).toHaveBeenCalledTimes(1);
      expect(repo.rows.get(record.id)?.errorCode).toBe('IMAGE_REFERENCE_UNAVAILABLE');
    });

    it('stores nothing for bare base64 with no file id', async () => {
      execute.mockResolvedValue(OK);

      await enqueueAuto({ referenceImageBase64: 'aGVsbG8=', referenceImageMimeType: 'image/png' });

      expect(repo.createReferenceAsset).not.toHaveBeenCalled();
      expect(attempts()[0]).toMatchObject({ referenceImageBase64: 'aGVsbG8=' });
    });
  });

  describe('runtime progress', () => {
    const envelope = (
      confidence: RuntimeProgressConfidence,
      progressPercent?: number,
    ): ClawRuntimeProgressEvent =>
      ({
        stage: RuntimeProgressStage.EXECUTING_NODE,
        runtimeUrl: 'http://comfyui:8188',
        imagePreviewBase64: 'SECRET-PREVIEW',
        metrics: {
          startedAtMs: 0,
          elapsedMs: 1200,
          currentStep: 7,
          totalSteps: 20,
          progressConfidence: confidence,
          ...(progressPercent === undefined ? {} : { progressPercent }),
        },
      }) as unknown as ClawRuntimeProgressEvent;

    const progressEvents = (): Array<{ runtimeProgress?: Record<string, unknown> }> =>
      publish.mock.calls
        .map((call) => call[0] as { runtimeProgress?: Record<string, unknown> })
        .filter((event) => event.runtimeProgress !== undefined);

    it('forwards the stage and observed metrics on the existing SSE stream', async () => {
      execute.mockImplementation(async (input: ExecuteImageInput) => {
        input.onProgress?.(envelope(RuntimeProgressConfidence.RUNTIME_REPORTED, 35));
        return OK;
      });

      await enqueueAuto();

      const [event] = progressEvents();
      expect(event).toMatchObject({
        status: 'GENERATING',
        runtimeProgress: {
          stage: RuntimeProgressStage.EXECUTING_NODE,
          currentStep: 7,
          totalSteps: 20,
          elapsedMs: 1200,
          progressPercent: 35,
        },
      });
      expect(JSON.stringify(event)).not.toContain('SECRET-PREVIEW');
      expect(JSON.stringify(event)).not.toContain('comfyui:8188');
    });

    it('drops an estimated percentage instead of showing a number nobody measured', async () => {
      execute.mockImplementation(async (input: ExecuteImageInput) => {
        input.onProgress?.(envelope(RuntimeProgressConfidence.STAGE_ESTIMATED, 50));
        return OK;
      });

      await enqueueAuto();

      const [event] = progressEvents();
      expect(event?.runtimeProgress).toBeDefined();
      expect(event?.runtimeProgress).not.toHaveProperty('progressPercent');
    });
  });
});
