import { vi } from 'vitest';

import { VideoFailureCode } from '../../../../common/enums';
import { BusinessException } from '../../../../common/errors';
import { VideoGenerationStatus } from '../../../../generated/prisma';
import type { VideoGenerationRecord } from '../../types/video-generation.types';
import { videoFailure } from '../../utilities/video-provider-error.utility';
import { VideoGenerationService } from '../video-generation.service';

const row = (over: Partial<VideoGenerationRecord> = {}): VideoGenerationRecord => ({
  id: 'gen-1',
  userId: 'user-1',
  threadId: 'thread-1',
  userMessageId: 'msg-1',
  assistantMessageId: null,
  prompt: 'A lighthouse at dusk',
  originalPrompt: null,
  provider: 'VIDEO_GEMINI',
  model: 'veo-3.1-fast-generate-preview',
  durationSeconds: 4,
  aspectRatio: '16:9',
  isAutoMode: true,
  sourceFileId: null,
  status: VideoGenerationStatus.QUEUED,
  errorCode: null,
  errorMessage: null,
  providerOperationId: 'op-secret',
  startedAt: null,
  completedAt: null,
  latencyMs: null,
  supersededById: null,
  paygReservationId: 'res-secret',
  createdAt: new Date('2026-09-30T10:00:00Z'),
  updatedAt: new Date('2026-09-30T10:00:00Z'),
  assets: [],
  ...over,
});

const RESULT = {
  fileId: 'file-1',
  sizeBytes: 100,
  mimeType: 'video/mp4',
  durationSeconds: 4,
  latencyMs: 90_000,
  settlement: { hold: {}, usage: {}, calls: { videoSeconds: 4 } },
};

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('VideoGenerationService', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let execution: Record<string, ReturnType<typeof vi.fn>>;
  let planGate: { assertCanGenerate: ReturnType<typeof vi.fn> };
  let sourceImages: { load: ReturnType<typeof vi.fn> };
  let service: VideoGenerationService;

  const dto = {
    prompt: 'A lighthouse at dusk',
    provider: 'VIDEO_GEMINI',
    model: 'veo-3.1-fast-generate-preview',
    userId: 'user-1',
    durationSeconds: 4,
    aspectRatio: '16:9' as const,
    isAutoMode: true,
  };

  beforeEach(() => {
    repo = {
      create: vi.fn().mockResolvedValue(row()),
      createSuccessor: vi.fn(),
      findById: vi.fn(),
      markStarting: vi.fn().mockResolvedValue(true),
      advance: vi.fn().mockResolvedValue(true),
      setOperation: vi.fn(),
      setReservation: vi.fn(),
      addOutputAsset: vi.fn().mockResolvedValue(undefined),
      complete: vi.fn().mockResolvedValue(true),
      fail: vi.fn().mockResolvedValue(true),
      cancelIfActive: vi.fn().mockResolvedValue(true),
      isCancelled: vi.fn().mockResolvedValue(false),
      linkAssistantMessage: vi.fn().mockResolvedValue(1),
    };
    execution = {
      execute: vi.fn().mockResolvedValue(RESULT),
      settle: vi.fn().mockResolvedValue(undefined),
      releaseUnpersisted: vi.fn().mockResolvedValue(undefined),
    };
    planGate = { assertCanGenerate: vi.fn().mockResolvedValue(undefined) };
    sourceImages = { load: vi.fn().mockResolvedValue({ base64: 'QUJD', mimeType: 'image/png' }) };
    service = new VideoGenerationService(
      repo as never,
      execution as never,
      planGate as never,
      sourceImages as never,
    );
  });

  describe('enqueueGeneration', () => {
    it('checks the plan BEFORE any row is written, then returns at once', async () => {
      const record = await service.enqueueGeneration(dto);

      expect(planGate.assertCanGenerate).toHaveBeenCalledWith('user-1');
      expect(planGate.assertCanGenerate.mock.invocationCallOrder[0]).toBeLessThan(
        repo['create']!.mock.invocationCallOrder[0]!,
      );
      expect(record.id).toBe('gen-1');
      await flush();
    });

    it('refuses a locked plan without writing a row', async () => {
      planGate.assertCanGenerate.mockRejectedValue(
        new BusinessException('locked', 'PLAN_FEATURE_DISABLED', 403),
      );

      await expect(service.enqueueGeneration(dto)).rejects.toMatchObject({
        code: 'PLAN_FEATURE_DISABLED',
      });
      expect(repo['create']).not.toHaveBeenCalled();
    });

    it('refuses a provider it does not know, including the shut-down OpenAI Sora', async () => {
      await expect(
        service.enqueueGeneration({ ...dto, provider: 'VIDEO_OPENAI' }),
      ).rejects.toMatchObject({ code: 'UNSUPPORTED_VIDEO_PROVIDER' });
      expect(repo['create']).not.toHaveBeenCalled();
    });
  });

  describe('running a job', () => {
    it('stores the asset, completes the row, then settles on the seconds', async () => {
      await service.enqueueGeneration(dto);
      await flush();

      expect(repo['markStarting']).toHaveBeenCalledWith('gen-1');
      expect(repo['addOutputAsset']).toHaveBeenCalledWith(
        expect.objectContaining({
          generationId: 'gen-1',
          storageKey: 'file-1',
          durationSeconds: 4,
        }),
      );
      expect(repo['complete']).toHaveBeenCalledWith('gen-1', 90_000);
      expect(execution['settle']).toHaveBeenCalledWith(RESULT.settlement);
      // Settled only AFTER the row says COMPLETED.
      expect(repo['complete']!.mock.invocationCallOrder[0]).toBeLessThan(
        execution['settle']!.mock.invocationCallOrder[0]!,
      );
    });

    it('releases instead of settling when a cancel won the race after the clip was stored', async () => {
      repo['complete']!.mockResolvedValue(false);

      await service.enqueueGeneration(dto);
      await flush();

      expect(execution['releaseUnpersisted']).toHaveBeenCalledWith(RESULT.settlement);
      expect(execution['settle']).not.toHaveBeenCalled();
    });

    it('records a failure with the fixed sentence for its code', async () => {
      execution['execute']!.mockRejectedValue(
        new BusinessException('provider said no', VideoFailureCode.CONTENT_REJECTED, 502),
      );
      repo['createSuccessor']!.mockResolvedValue(row({ id: 'gen-2', provider: 'VIDEO_GROK' }));
      execution['execute']!.mockRejectedValueOnce(
        new BusinessException('provider said no', VideoFailureCode.CONTENT_REJECTED, 502),
      ).mockRejectedValueOnce(
        new BusinessException('also no', VideoFailureCode.CONTENT_REJECTED, 502),
      );

      await service.enqueueGeneration(dto);
      await flush();

      expect(repo['fail']).toHaveBeenCalledWith(
        'gen-1',
        'FAILED',
        VideoFailureCode.CONTENT_REJECTED,
        expect.stringContaining('content policy'),
      );
    });

    it('marks a provider timeout TIMED_OUT', async () => {
      execution['execute']!.mockRejectedValue(
        new BusinessException('slow', VideoFailureCode.GENERATION_TIMED_OUT, 502),
      );

      await service.enqueueGeneration({ ...dto, isAutoMode: false });
      await flush();

      expect(repo['fail']).toHaveBeenCalledWith(
        'gen-1',
        'TIMED_OUT',
        VideoFailureCode.GENERATION_TIMED_OUT,
        expect.any(String),
      );
    });

    it('does not run a row that was cancelled before it started', async () => {
      repo['markStarting']!.mockResolvedValue(false);

      await service.enqueueGeneration(dto);
      await flush();

      expect(execution['execute']).not.toHaveBeenCalled();
    });

    it('fails the row instead of crashing the process when something escapes the job', async () => {
      execution['execute']!.mockRejectedValue(
        new BusinessException('down', VideoFailureCode.PROVIDER_UNAVAILABLE, 502),
      );
      // AUTO wants a successor row, and creating it blows up.
      repo['createSuccessor']!.mockRejectedValue(new Error('db gone'));

      await service.enqueueGeneration(dto);
      await flush();
      await flush();

      expect(repo['fail']).toHaveBeenCalledWith(
        'gen-1',
        'FAILED',
        VideoFailureCode.PROVIDER_FAILURE,
        expect.any(String),
      );
    });

    it('does not record a user cancel as a failure', async () => {
      execution['execute']!.mockRejectedValue(
        new BusinessException('cancelled', 'VIDEO_GENERATION_CANCELLED', 409),
      );

      await service.enqueueGeneration(dto);
      await flush();

      expect(repo['fail']).not.toHaveBeenCalled();
    });
  });

  describe('image-to-video', () => {
    it('stores the source file id and passes the owner-checked image to the provider call', async () => {
      repo['create']!.mockResolvedValue(row({ sourceFileId: 'img-1' }));

      await service.enqueueGeneration({ ...dto, sourceFileId: 'img-1' });
      await flush();

      expect(repo['create']).toHaveBeenCalledWith(
        expect.objectContaining({ sourceFileId: 'img-1' }),
      );
      expect(sourceImages.load).toHaveBeenCalledWith('img-1', 'user-1');
      expect(execution['execute']).toHaveBeenCalledWith(
        expect.objectContaining({ sourceImage: { base64: 'QUJD', mimeType: 'image/png' } }),
      );
    });

    it('does not load or send an image for a text-to-video row', async () => {
      await service.enqueueGeneration(dto);
      await flush();

      expect(sourceImages.load).not.toHaveBeenCalled();
      expect(execution['execute']).toHaveBeenCalledWith(
        expect.not.objectContaining({ sourceImage: expect.anything() }),
      );
    });

    it('fails with the fixed sentence, before any hold, and never falls back to another provider', async () => {
      repo['create']!.mockResolvedValue(row({ sourceFileId: 'img-1' }));
      sourceImages.load.mockRejectedValue(
        videoFailure(VideoFailureCode.SOURCE_IMAGE_INVALID, 'refused'),
      );

      await service.enqueueGeneration({ ...dto, sourceFileId: 'img-1' });
      await flush();

      expect(execution['execute']).not.toHaveBeenCalled();
      expect(repo['fail']).toHaveBeenCalledWith(
        'gen-1',
        'FAILED',
        VideoFailureCode.SOURCE_IMAGE_INVALID,
        expect.stringContaining('JPEG, PNG or WebP'),
      );
      expect(repo['createSuccessor']).not.toHaveBeenCalled();
    });

    it('a retry reuses the same source image', async () => {
      repo['findById']!.mockResolvedValue(
        row({ status: VideoGenerationStatus.FAILED, sourceFileId: 'img-1' }),
      );
      repo['createSuccessor']!.mockResolvedValue(row({ id: 'gen-3', sourceFileId: 'img-1' }));

      await service.retryGenerationForUser('gen-1', 'user-1');
      await flush();

      expect(repo['createSuccessor']).toHaveBeenCalledWith(
        'gen-1',
        expect.objectContaining({ sourceFileId: 'img-1' }),
      );
      expect(sourceImages.load).toHaveBeenCalledWith('img-1', 'user-1');
    });
  });

  describe('AUTO fallback', () => {
    it('falls through from Gemini to Grok on a provider failure', async () => {
      execution['execute']!.mockRejectedValueOnce(
        new BusinessException('quota', VideoFailureCode.PROVIDER_QUOTA_EXCEEDED, 502),
      );
      repo['createSuccessor']!.mockResolvedValue(
        row({ id: 'gen-2', provider: 'VIDEO_GROK', model: 'grok-imagine-video' }),
      );

      await service.enqueueGeneration(dto);
      await flush();
      await flush();

      expect(repo['createSuccessor']).toHaveBeenCalledWith(
        'gen-1',
        expect.objectContaining({
          provider: 'VIDEO_GROK',
          model: 'grok-imagine-video',
          isAutoMode: true,
        }),
      );
      expect(execution['execute']).toHaveBeenCalledTimes(2);
    });

    it('stops after the last provider, and never falls back for a manual pick', async () => {
      execution['execute']!.mockRejectedValue(
        new BusinessException('down', VideoFailureCode.PROVIDER_UNAVAILABLE, 502),
      );
      repo['create']!.mockResolvedValue(
        row({ provider: 'VIDEO_GROK', model: 'grok-imagine-video' }),
      );

      await service.enqueueGeneration({ ...dto, provider: 'VIDEO_GROK' });
      await flush();
      expect(repo['createSuccessor']).not.toHaveBeenCalled();

      repo['create']!.mockResolvedValue(row({ isAutoMode: false }));
      await service.enqueueGeneration({ ...dto, isAutoMode: false });
      await flush();
      expect(repo['createSuccessor']).not.toHaveBeenCalled();
    });

    it('does not fall back after a credit refusal or a storage failure', async () => {
      execution['execute']!.mockRejectedValueOnce(
        new BusinessException('no credit', 'PAYG_CREDIT_EXHAUSTED', 402),
      );
      await service.enqueueGeneration(dto);
      await flush();

      execution['execute']!.mockRejectedValueOnce(
        new BusinessException('disk', VideoFailureCode.STORAGE_FAILED, 502),
      );
      await service.enqueueGeneration(dto);
      await flush();

      expect(repo['createSuccessor']).not.toHaveBeenCalled();
      expect(repo['fail']).toHaveBeenCalledWith(
        'gen-1',
        'FAILED',
        'PAYG_CREDIT_EXHAUSTED',
        expect.stringContaining('pay-as-you-go credit'),
      );
    });
  });

  describe('Veo model fallback', () => {
    const rejected = () =>
      new BusinessException(
        'Gemini video generation failed: unsupported',
        VideoFailureCode.PROVIDER_REJECTED,
        502,
      );

    it('tries the next Veo model when one is refused, for a manual pick too', async () => {
      repo['create']!.mockResolvedValue(
        row({ isAutoMode: false, model: 'veo-3.1-generate-preview' }),
      );
      repo['createSuccessor']!.mockResolvedValue(
        row({ id: 'gen-2', isAutoMode: false, model: 'veo-3.1-fast-generate-preview' }),
      );
      execution['execute']!.mockRejectedValueOnce(rejected());

      await service.enqueueGeneration({
        ...dto,
        isAutoMode: false,
        model: 'models/veo-3.1-generate-preview',
      });
      await flush();
      await flush();

      expect(repo['createSuccessor']).toHaveBeenCalledWith(
        'gen-1',
        expect.objectContaining({
          provider: 'VIDEO_GEMINI',
          model: 'veo-3.1-fast-generate-preview',
          isAutoMode: false,
        }),
      );
      expect(execution['execute']).toHaveBeenCalledTimes(2);
    });

    it('never revisits a model and stops after the chain for a manual pick', async () => {
      repo['create']!.mockResolvedValue(row({ isAutoMode: false }));
      repo['createSuccessor']!.mockResolvedValueOnce(
        row({ id: 'gen-2', isAutoMode: false, model: 'veo-3.1-lite-generate-preview' }),
      ).mockResolvedValueOnce(
        row({ id: 'gen-3', isAutoMode: false, model: 'veo-3.1-generate-preview' }),
      );
      execution['execute']!.mockRejectedValue(rejected());

      await service.enqueueGeneration({ ...dto, isAutoMode: false });
      for (let i = 0; i < 4; i += 1) {
        await flush();
      }

      expect(repo['createSuccessor']).toHaveBeenCalledTimes(2);
      expect(execution['execute']).toHaveBeenCalledTimes(3);
    });

    it('does not walk the Veo list after a credit refusal', async () => {
      execution['execute']!.mockRejectedValueOnce(
        new BusinessException('no credit', VideoFailureCode.PROVIDER_CREDITS_DEPLETED, 502),
      );
      repo['create']!.mockResolvedValue(row({ isAutoMode: false }));
      await service.enqueueGeneration({ ...dto, isAutoMode: false });
      await flush();
      expect(repo['createSuccessor']).not.toHaveBeenCalled();
    });

    it('stores the provider reason beside a generic rejection', async () => {
      repo['create']!.mockResolvedValue(
        row({ isAutoMode: false, model: 'veo-3.1-generate-preview' }),
      );
      repo['createSuccessor']!.mockResolvedValue(row({ id: 'gen-2', isAutoMode: false }));
      execution['execute']!.mockRejectedValueOnce(rejected());
      await service.enqueueGeneration({ ...dto, isAutoMode: false });
      await flush();
      expect(repo['fail']).toHaveBeenCalledWith(
        'gen-1',
        'FAILED',
        VideoFailureCode.PROVIDER_REJECTED,
        expect.stringContaining('Provider said: unsupported'),
      );
    });
  });

  describe('reading, cancelling, retrying', () => {
    it('hides another user generation behind the same 404 as a missing one', async () => {
      repo['findById']!.mockResolvedValue(row({ userId: 'someone-else' }));

      await expect(service.getWithLatestForUser('gen-1', 'user-1')).rejects.toMatchObject({
        code: 'ENTITY_NOT_FOUND',
      });
      repo['findById']!.mockResolvedValue(null);
      await expect(service.getWithLatestForUser('nope', 'user-1')).rejects.toMatchObject({
        code: 'ENTITY_NOT_FOUND',
      });
    });

    it('never exposes the owner, the provider operation id or the reservation id', async () => {
      repo['findById']!.mockResolvedValue(row());

      const view = await service.getWithLatestForUser('gen-1', 'user-1');
      const json = JSON.stringify(view);

      expect(json).not.toContain('op-secret');
      expect(json).not.toContain('res-secret');
      expect(json).not.toContain('"userId"');
    });

    it('follows the AUTO chain to the head and returns it as `latest`', async () => {
      repo['findById']!.mockResolvedValueOnce(
        row({ status: VideoGenerationStatus.FAILED, supersededById: 'gen-2' }),
      ).mockResolvedValueOnce(
        row({
          id: 'gen-2',
          provider: 'VIDEO_GROK',
          status: VideoGenerationStatus.COMPLETED,
          assets: [
            {
              id: 'a1',
              generationId: 'gen-2',
              storageKey: 'f',
              url: '/api/v1/files/download/f',
              downloadUrl: '/api/v1/files/download/f',
              mimeType: 'video/mp4',
              sizeBytes: 5,
              durationSeconds: 4,
              role: 'OUTPUT' as never,
            },
          ],
        }),
      );

      const view = await service.getWithLatestForUser('gen-1', 'user-1');

      expect(view.status).toBe('FAILED');
      expect(view.latest.id).toBe('gen-2');
      expect(view.latest.asset).toMatchObject({
        mimeType: 'video/mp4',
        downloadUrl: '/api/v1/files/download/f',
      });
    });

    it('cancels an active job, idempotently, and reports the status after', async () => {
      repo['findById']!.mockResolvedValueOnce(row()).mockResolvedValueOnce(
        row({ status: VideoGenerationStatus.CANCELLED }),
      );

      expect(await service.cancelGenerationForUser('gen-1', 'user-1')).toEqual({
        id: 'gen-1',
        status: 'CANCELLED',
        cancelled: true,
      });
    });

    it('retries only the latest failed row, as a successor, after the plan check', async () => {
      repo['findById']!.mockResolvedValue(row({ status: VideoGenerationStatus.FAILED }));
      repo['createSuccessor']!.mockResolvedValue(row({ id: 'gen-3' }));

      const retried = await service.retryGenerationForUser('gen-1', 'user-1');

      expect(retried.id).toBe('gen-3');
      expect(planGate.assertCanGenerate).toHaveBeenCalledWith('user-1');
      expect(repo['createSuccessor']).toHaveBeenCalledWith(
        'gen-1',
        expect.objectContaining({ prompt: 'A lighthouse at dusk' }),
      );
      await flush();
    });

    it.each([
      [VideoGenerationStatus.COMPLETED, null],
      [VideoGenerationStatus.GENERATING, null],
      [VideoGenerationStatus.FAILED, 'gen-2'],
    ])('refuses to retry a %s row (superseded by %s)', async (status, supersededById) => {
      repo['findById']!.mockResolvedValue(row({ status, supersededById }));

      await expect(service.retryGenerationForUser('gen-1', 'user-1')).rejects.toMatchObject({
        code: 'VIDEO_NOT_RETRYABLE',
      });
      expect(repo['createSuccessor']).not.toHaveBeenCalled();
    });
  });
});
