import { HttpStatus } from '@nestjs/common';
import { type Mock, vi } from 'vitest';
import { EventPattern } from '@claw/shared-types';

import { BusinessException } from '../../../common/errors';
import { ImageProviderCancel } from '../../../common/enums';
import { ImageGenerationStatus } from '../../../generated/prisma';
import { IMAGE_GENERATION_SUPERSEDED_CODE } from '../constants/image-supersession.constants';
import { ImageGenerationService } from '../services/image-generation.service';
import { imageCancelled } from '../utilities/image-cancel.utility';
import type {
  ExecuteImageInput,
  GenerateImageResult,
  ImageGenerationRecord,
  ImageSettlement,
} from '../types/image-generation.types';
import {
  baseRecord,
  buildInMemoryImageRepo,
  flushImageJobs as flush,
  type InMemoryImageRepo,
} from './fixtures/in-memory-image-repo.fixture';

const OWNER = 'user-1';
const STRANGER = 'user-2';

const SETTLEMENT: ImageSettlement = {
  hold: {
    metered: true,
    reservationId: 'res-image-1',
    maxOutputTokens: 8192,
    clamped: false,
    heldMicroUsd: 41_000,
    availableAfterMicroUsd: 959_000,
    reason: null,
  },
  usage: { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
  calls: { imageUnits: 1 },
};
const PAID_OK: GenerateImageResult = {
  fileId: 'file-out',
  revisedPrompt: null,
  latencyMs: 5,
  settlement: SETTLEMENT,
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const deferred = <T>(): Deferred<T> => {
  let resolve: (value: T) => void = () => {
    // replaced synchronously by the Promise executor below
  };
  let reject: (error: unknown) => void = () => {
    // replaced synchronously by the Promise executor below
  };
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

type ExecutionMock = {
  execute: Mock;
  loadStoredReference: Mock;
  settle: Mock;
  releaseUnpersisted: Mock;
  releaseCancelled: Mock;
  requestProviderCancel: Mock;
  discardStoredImage: Mock;
};

type Replica = {
  service: ImageGenerationService;
  exec: ExecutionMock;
  publish: Mock;
  busPublish: Mock;
};

const buildExecution = (): ExecutionMock => ({
  execute: vi.fn(),
  loadStoredReference: vi.fn(),
  settle: vi.fn().mockResolvedValue(undefined),
  releaseUnpersisted: vi.fn().mockResolvedValue(undefined),
  releaseCancelled: vi.fn((settlement: unknown) => Promise.resolve(settlement !== undefined)),
  requestProviderCancel: vi.fn().mockResolvedValue(ImageProviderCancel.UNSUPPORTED),
  discardStoredImage: vi.fn().mockResolvedValue(undefined),
});

/** One service instance = one replica. Replicas share ONLY the repository (the DB). */
const replica = (repo: InMemoryImageRepo): Replica => {
  const exec = buildExecution();
  const publish = vi.fn();
  const busPublish = vi.fn().mockResolvedValue(undefined);
  const service = new ImageGenerationService(
    repo as never,
    exec as never,
    { publish } as never,
    { publish: busPublish } as never,
    { assertCanGenerate: vi.fn().mockResolvedValue(undefined) } as never,
  );
  return { service, exec, publish, busPublish };
};

const statusEvents = (publish: Mock, id: string): string[] =>
  publish.mock.calls
    .map((call) => call[0] as { generationId: string; status: string })
    .filter((event) => event.generationId === id)
    .map((event) => event.status);

const busPatterns = (busPublish: Mock): string[] =>
  busPublish.mock.calls.map((call) => String(call[0]));

describe('ImageGenerationService — user cancellation (POST /images/:id/cancel)', () => {
  let repo: InMemoryImageRepo;
  let a: Replica;

  const seed = (overrides: Partial<ImageGenerationRecord>): void => {
    repo = buildInMemoryImageRepo(baseRecord(overrides));
    a = replica(repo);
  };

  /** Starts an AUTO job whose provider call hangs until the test resolves it. */
  const startInFlight = async (
    replicaUnderTest: Replica,
  ): Promise<{ id: string; call: Deferred<GenerateImageResult> }> => {
    const call = deferred<GenerateImageResult>();
    replicaUnderTest.exec.execute.mockReturnValueOnce(call.promise);
    const record = await replicaUnderTest.service.enqueueGeneration({
      prompt: 'a cute cat',
      provider: 'IMAGE_GEMINI',
      model: 'gemini-2.5-flash-image',
      userId: OWNER,
      isAutoMode: true,
    });
    await flush();
    expect(repo.rows.get(record.id)?.status).toBe(ImageGenerationStatus.GENERATING);
    return { id: record.id, call };
  };

  beforeEach(() => {
    seed({});
  });

  it('cancel before start: QUEUED → CANCELLED, no provider call, no hold, no upstream cancel', async () => {
    const result = await a.service.cancelGenerationForUser('img-1', OWNER);

    expect(result).toEqual({ generationId: 'img-1', status: ImageGenerationStatus.CANCELLED });
    expect(repo.rows.get('img-1')?.status).toBe(ImageGenerationStatus.CANCELLED);
    expect(a.exec.execute).not.toHaveBeenCalled();
    expect(a.exec.requestProviderCancel).not.toHaveBeenCalled();
    expect(a.exec.releaseCancelled).not.toHaveBeenCalled();
    expect(repo.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        generationId: 'img-1',
        status: ImageGenerationStatus.CANCELLED,
        payloadJson: { fromStatus: 'QUEUED', providerCancel: ImageProviderCancel.NOT_STARTED },
      }),
    );
    expect(statusEvents(a.publish, 'img-1')).toEqual([ImageGenerationStatus.CANCELLED]);
  });

  it('cancel while STARTING: the job stops before the provider (no execute → no reserve)', async () => {
    const gate = deferred<undefined>();
    repo.createEvent.mockImplementationOnce(() => Promise.resolve(undefined));
    repo.createEvent.mockImplementationOnce(async () => gate.promise);
    const record = await a.service.enqueueGeneration({
      prompt: 'a cute cat',
      provider: 'IMAGE_GEMINI',
      model: 'gemini-2.5-flash-image',
      userId: OWNER,
    });
    await flush();
    expect(repo.rows.get(record.id)?.status).toBe(ImageGenerationStatus.STARTING);

    await a.service.cancelGenerationForUser(record.id, OWNER);
    gate.resolve(undefined);
    await flush();

    expect(a.exec.execute).not.toHaveBeenCalled();
    expect(repo.rows.get(record.id)?.status).toBe(ImageGenerationStatus.CANCELLED);
    expect(statusEvents(a.publish, record.id)).not.toContain(ImageGenerationStatus.GENERATING);
  });

  describe('cancel mid-flight (provider call in progress)', () => {
    it('provider resolves after the cancel: no asset, hold RELEASED not finalized, no successor, stays CANCELLED', async () => {
      const { id, call } = await startInFlight(a);

      const result = await a.service.cancelGenerationForUser(id, OWNER);
      expect(result.status).toBe(ImageGenerationStatus.CANCELLED);
      call.resolve(PAID_OK);
      await flush();

      expect(repo.createAsset).not.toHaveBeenCalled();
      expect(a.exec.releaseCancelled).toHaveBeenCalledWith(SETTLEMENT);
      expect(a.exec.settle).not.toHaveBeenCalled();
      expect(repo.createSuccessor).not.toHaveBeenCalled();
      expect(repo.rows.get(id)?.status).toBe(ImageGenerationStatus.CANCELLED);
      expect(statusEvents(a.publish, id)).not.toContain(ImageGenerationStatus.COMPLETED);
      expect(statusEvents(a.publish, id)).not.toContain(ImageGenerationStatus.FINALIZING);
      expect(busPatterns(a.busPublish)).toEqual([]);
    });

    it('a cloud provider is not claimed to stop: providerCancel=unsupported is recorded', async () => {
      const { id, call } = await startInFlight(a);

      await a.service.cancelGenerationForUser(id, OWNER);
      call.resolve(PAID_OK);
      await flush();

      expect(a.exec.requestProviderCancel).toHaveBeenCalledWith(id, 'IMAGE_GEMINI');
      expect(repo.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ImageGenerationStatus.CANCELLED,
          payloadJson: {
            fromStatus: 'GENERATING',
            providerCancel: ImageProviderCancel.UNSUPPORTED,
          },
        }),
      );
    });

    it('execute reports the cancel itself: no FAILED, no image.failed, no successor', async () => {
      const { id, call } = await startInFlight(a);

      await a.service.cancelGenerationForUser(id, OWNER);
      call.reject(imageCancelled());
      await flush();

      expect(repo.updateStatus).not.toHaveBeenCalledWith(id, 'FAILED', expect.anything());
      expect(repo.createSuccessor).not.toHaveBeenCalled();
      expect(busPatterns(a.busPublish)).not.toContain(EventPattern.IMAGE_FAILED);
      expect(repo.rows.get(id)?.status).toBe(ImageGenerationStatus.CANCELLED);
    });

    it('a provider error after the cancel (e.g. an interrupted local run) is not written as FAILED', async () => {
      const { id, call } = await startInFlight(a);

      await a.service.cancelGenerationForUser(id, OWNER);
      call.reject(new Error('interrupted'));
      await flush();

      expect(repo.rows.get(id)?.status).toBe(ImageGenerationStatus.CANCELLED);
      expect(repo.createSuccessor).not.toHaveBeenCalled();
      expect(busPatterns(a.busPublish)).not.toContain(EventPattern.IMAGE_FAILED);
      expect(statusEvents(a.publish, id)).not.toContain(ImageGenerationStatus.FAILED);
    });

    it('cancel landing after the asset row but before COMPLETED: asset removed, hold released, never settled', async () => {
      const { id, call } = await startInFlight(a);
      repo.createAsset.mockImplementationOnce(async () => {
        await a.service.cancelGenerationForUser(id, OWNER);
        return { id: 'asset-late', url: 'u', downloadUrl: 'u', mimeType: 'image/png' };
      });

      call.resolve(PAID_OK);
      await flush();

      expect(repo.deleteAsset).toHaveBeenCalledWith('asset-late');
      expect(a.exec.releaseCancelled).toHaveBeenCalledWith(SETTLEMENT);
      expect(a.exec.settle).not.toHaveBeenCalled();
      expect(repo.rows.get(id)?.status).toBe(ImageGenerationStatus.CANCELLED);
      expect(busPatterns(a.busPublish)).not.toContain('image.generated');
    });

    // ADR-120 addendum 3: the bytes reached file-service, then the cancel won the
    // FINALIZING write. The stored file must not be left unreferenced.
    it('bytes stored, then the cancel wins before FINALIZING: stored file deleted once, hold released, no asset', async () => {
      const { id, call } = await startInFlight(a);

      await a.service.cancelGenerationForUser(id, OWNER);
      call.resolve(PAID_OK);
      await flush();

      expect(a.exec.discardStoredImage).toHaveBeenCalledTimes(1);
      expect(a.exec.discardStoredImage).toHaveBeenCalledWith('file-out', OWNER, id);
      expect(a.exec.releaseCancelled).toHaveBeenCalledWith(SETTLEMENT);
      expect(a.exec.settle).not.toHaveBeenCalled();
      expect(repo.createAsset).not.toHaveBeenCalled();
      expect(repo.rows.get(id)?.status).toBe(ImageGenerationStatus.CANCELLED);
    });

    it('cancel wins after the asset row: asset row AND stored file both removed, hold released', async () => {
      const { id, call } = await startInFlight(a);
      repo.createAsset.mockImplementationOnce(async () => {
        await a.service.cancelGenerationForUser(id, OWNER);
        return { id: 'asset-late', url: 'u', downloadUrl: 'u', mimeType: 'image/png' };
      });

      call.resolve(PAID_OK);
      await flush();

      expect(repo.deleteAsset).toHaveBeenCalledWith('asset-late');
      expect(a.exec.discardStoredImage).toHaveBeenCalledTimes(1);
      expect(a.exec.discardStoredImage).toHaveBeenCalledWith('file-out', OWNER, id);
      expect(a.exec.releaseCancelled).toHaveBeenCalledWith(SETTLEMENT);
      expect(a.exec.settle).not.toHaveBeenCalled();
    });

    it('a completed generation never deletes its stored file', async () => {
      const { id, call } = await startInFlight(a);

      call.resolve(PAID_OK);
      await flush();

      expect(repo.rows.get(id)?.status).toBe(ImageGenerationStatus.COMPLETED);
      expect(a.exec.discardStoredImage).not.toHaveBeenCalled();
      expect(a.exec.settle).toHaveBeenCalledWith(SETTLEMENT);
    });
  });

  it('local SD WebUI in flight: the manager is asked (it decides; see manager spec)', async () => {
    seed({ provider: 'IMAGE_LOCAL', model: 'sd-1.5', status: ImageGenerationStatus.GENERATING });

    await a.service.cancelGenerationForUser('img-1', OWNER);

    expect(a.exec.requestProviderCancel).toHaveBeenCalledWith('img-1', 'IMAGE_LOCAL');
  });

  it('local ComfyUI in flight: the manager is asked with this generation id', async () => {
    seed({ provider: 'IMAGE_LOCAL_COMFYUI', status: ImageGenerationStatus.FINALIZING });

    await a.service.cancelGenerationForUser('img-1', OWNER);

    expect(a.exec.requestProviderCancel).toHaveBeenCalledWith('img-1', 'IMAGE_LOCAL_COMFYUI');
  });

  it('cancel after complete: 200 no-op returning COMPLETED, nothing written', async () => {
    seed({ status: ImageGenerationStatus.COMPLETED });

    const result = await a.service.cancelGenerationForUser('img-1', OWNER);

    expect(result).toEqual({ generationId: 'img-1', status: ImageGenerationStatus.COMPLETED });
    expect(repo.cancelIfActive).not.toHaveBeenCalled();
    expect(repo.createEvent).not.toHaveBeenCalled();
    expect(a.publish).not.toHaveBeenCalled();
  });

  it.each([ImageGenerationStatus.FAILED, ImageGenerationStatus.TIMED_OUT])(
    'cancel of a %s row is a no-op that returns the unchanged status',
    async (status) => {
      seed({ status });
      const result = await a.service.cancelGenerationForUser('img-1', OWNER);
      expect(result.status).toBe(status);
      expect(repo.rows.get('img-1')?.status).toBe(status);
    },
  );

  it('double cancel is idempotent: same body, one CANCELLED event, one upstream cancel', async () => {
    seed({ status: ImageGenerationStatus.GENERATING });

    const first = await a.service.cancelGenerationForUser('img-1', OWNER);
    const second = await a.service.cancelGenerationForUser('img-1', OWNER);

    expect(first).toEqual(second);
    expect(second.status).toBe(ImageGenerationStatus.CANCELLED);
    expect(repo.createEvent).toHaveBeenCalledTimes(1);
    expect(a.exec.requestProviderCancel).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a stranger', 'img-1', STRANGER],
    ['a missing id', 'img-404', OWNER],
  ])('%s gets the same 404 and nothing changes', async (_label, id, userId) => {
    const error: unknown = await a.service.cancelGenerationForUser(id, userId).then(
      () => null,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(BusinessException);
    expect(error).toMatchObject({ code: 'IMAGE_NOT_FOUND' });
    expect((error as BusinessException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(repo.rows.get('img-1')?.status).toBe(ImageGenerationStatus.QUEUED);
    expect(repo.cancelIfActive).not.toHaveBeenCalled();
  });

  it('replica-safe: a cancel taken by replica B is seen by the job running on replica A', async () => {
    const { id, call } = await startInFlight(a);
    const b = replica(repo);

    await b.service.cancelGenerationForUser(id, OWNER);
    const probe = (a.exec.execute.mock.calls[0]?.[0] as ExecuteImageInput).isCancelled;
    expect(await probe?.()).toBe(true);
    call.resolve(PAID_OK);
    await flush();

    expect(repo.createAsset).not.toHaveBeenCalled();
    expect(a.exec.releaseCancelled).toHaveBeenCalledWith(SETTLEMENT);
    expect(a.exec.settle).not.toHaveBeenCalled();
    expect(repo.rows.get(id)?.status).toBe(ImageGenerationStatus.CANCELLED);
    expect(statusEvents(a.publish, id)).toContain(ImageGenerationStatus.CANCELLED);
  });

  describe('retry from CANCELLED', () => {
    it('retry runs as a successor row; the CANCELLED row is never re-opened', async () => {
      seed({ status: ImageGenerationStatus.CANCELLED });
      a.exec.execute.mockResolvedValue(PAID_OK);

      const successor = await a.service.retryGenerationForUser('img-1', OWNER);
      await flush();

      expect(successor.id).not.toBe('img-1');
      expect(repo.rows.get('img-1')?.status).toBe(ImageGenerationStatus.CANCELLED);
      expect(repo.rows.get('img-1')?.supersededById).toBe(successor.id);
      expect(repo.rows.get(successor.id)?.status).toBe(ImageGenerationStatus.COMPLETED);
      expect(repo.rows.get(successor.id)?.provider).toBe('IMAGE_GEMINI');
      expect(a.exec.settle).toHaveBeenCalledWith(SETTLEMENT);
      const view = await a.service.getWithLatestForUser('img-1', OWNER);
      expect(view.latest.id).toBe(successor.id);
    });

    it('retry-alternate from CANCELLED creates a successor on another model', async () => {
      seed({ status: ImageGenerationStatus.CANCELLED });
      a.exec.execute.mockResolvedValue(PAID_OK);

      const successor = await a.service.retryWithAlternateModelForUser('img-1', OWNER);
      await flush();

      expect(successor.id).not.toBe('img-1');
      expect(repo.rows.get('img-1')?.supersededById).toBe(successor.id);
      expect(repo.rows.get(successor.id)?.status).toBe(ImageGenerationStatus.COMPLETED);
    });

    it('the superseded CANCELLED row cannot be retried a second time (409)', async () => {
      seed({ status: ImageGenerationStatus.CANCELLED });
      a.exec.execute.mockResolvedValue(PAID_OK);
      await a.service.retryGenerationForUser('img-1', OWNER);
      await flush();

      const error: unknown = await a.service.retryGenerationForUser('img-1', OWNER).then(
        () => null,
        (caught: unknown) => caught,
      );
      expect(error).toMatchObject({ code: IMAGE_GENERATION_SUPERSEDED_CODE });
    });
  });
});
