import { vi } from 'vitest';

import { AudioFailureCode } from '../../../../common/enums';
import { BusinessException } from '../../../../common/errors';
import { AudioGenerationStatus, AudioKind } from '../../../../generated/prisma';
import type { AudioGenerationRecord } from '../../types/audio-generation.types';
import { audioFailure } from '../../utilities/audio-provider-error.utility';
import { AudioGenerationService } from '../audio-generation.service';

const row = (over: Partial<AudioGenerationRecord> = {}): AudioGenerationRecord => ({
  id: 'gen-1',
  userId: 'user-1',
  workspaceId: null,
  threadId: 'thread-1',
  messageId: 'msg-1',
  assistantMessageId: null,
  kind: AudioKind.SPEECH,
  prompt: 'Hello there',
  provider: 'AUDIO_OPENAI',
  model: 'tts-1',
  voice: 'alloy',
  format: 'mp3',
  status: AudioGenerationStatus.QUEUED,
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  latencyMs: null,
  supersededById: null,
  paygReservationId: 'res-secret',
  createdAt: new Date('2026-10-31T10:00:00Z'),
  updatedAt: new Date('2026-10-31T10:00:00Z'),
  assets: [],
  ...over,
});

const RESULT = {
  fileId: 'file-1',
  sizeBytes: 100,
  mimeType: 'audio/mpeg',
  durationSeconds: 3,
  latencyMs: 900,
  settlement: { hold: {}, usage: {}, calls: { ttsCharacters: 11 } },
};

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('AudioGenerationService', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let execution: Record<string, ReturnType<typeof vi.fn>>;
  let planGate: { assertCanGenerate: ReturnType<typeof vi.fn> };
  let service: AudioGenerationService;

  const dto = {
    userId: 'user-1',
    kind: 'SPEECH' as const,
    provider: 'AUDIO_OPENAI',
    prompt: 'Hello there',
    threadId: 'thread-1',
    messageId: 'msg-1',
  };

  beforeEach(() => {
    repo = {
      create: vi.fn().mockResolvedValue(row()),
      createSuccessor: vi.fn(),
      findById: vi.fn(),
      markRunning: vi.fn().mockResolvedValue(true),
      setReservation: vi.fn(),
      addOutputAsset: vi.fn().mockResolvedValue(undefined),
      complete: vi.fn().mockResolvedValue(true),
      fail: vi.fn().mockResolvedValue(true),
      cancelIfActive: vi.fn().mockResolvedValue(true),
      isCancelled: vi.fn().mockResolvedValue(false),
    };
    execution = {
      execute: vi.fn().mockResolvedValue(RESULT),
      settle: vi.fn().mockResolvedValue(undefined),
      releaseUnpersisted: vi.fn().mockResolvedValue(undefined),
    };
    planGate = { assertCanGenerate: vi.fn().mockResolvedValue(undefined) };
    service = new AudioGenerationService(repo as never, execution as never, planGate as never);
  });

  describe('enqueueGeneration', () => {
    it('checks the plan BEFORE any row is written, fills defaults, then returns at once', async () => {
      const record = await service.enqueueGeneration(dto);

      expect(planGate.assertCanGenerate).toHaveBeenCalledWith('user-1');
      expect(planGate.assertCanGenerate.mock.invocationCallOrder[0]).toBeLessThan(
        repo['create']!.mock.invocationCallOrder[0]!,
      );
      expect(repo['create']).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'SPEECH', model: 'tts-1', voice: 'alloy', format: 'mp3' }),
      );
      expect(record.id).toBe('gen-1');
      await flush();
    });

    it('replaces a voice the provider does not offer (a style word like "calm") with its default', async () => {
      await service.enqueueGeneration({ ...dto, voice: 'calm' });

      expect(repo['create']).toHaveBeenCalledWith(expect.objectContaining({ voice: 'alloy' }));
      await flush();
    });

    it('keeps a voice the provider does offer', async () => {
      await service.enqueueGeneration({ ...dto, voice: 'nova' });

      expect(repo['create']).toHaveBeenCalledWith(expect.objectContaining({ voice: 'nova' }));
      await flush();
    });

    it('defaults music to Lyria Clip and stores no voice', async () => {
      await service.enqueueGeneration({ ...dto, kind: 'MUSIC', provider: 'AUDIO_GEMINI' });

      expect(repo['create']).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'MUSIC', model: 'lyria-3-clip-preview', voice: null }),
      );
      await flush();
    });

    it('refuses a locked plan without writing a row', async () => {
      planGate.assertCanGenerate.mockRejectedValue(
        new BusinessException('locked', 'IMAGE_PLAN_FEATURE_DISABLED', 403),
      );

      await expect(service.enqueueGeneration(dto)).rejects.toMatchObject({
        code: 'IMAGE_PLAN_FEATURE_DISABLED',
      });
      expect(repo['create']).not.toHaveBeenCalled();
    });

    it('refuses an unknown provider and music on OpenAI', async () => {
      await expect(
        service.enqueueGeneration({ ...dto, provider: 'AUDIO_XAI' }),
      ).rejects.toMatchObject({
        code: 'UNSUPPORTED_AUDIO_PROVIDER',
      });
      await expect(service.enqueueGeneration({ ...dto, kind: 'MUSIC' })).rejects.toMatchObject({
        code: 'UNSUPPORTED_AUDIO_PROVIDER',
      });
      expect(repo['create']).not.toHaveBeenCalled();
    });
  });

  describe('the background job', () => {
    it('stores the asset, completes, then settles the hold', async () => {
      await service.enqueueGeneration(dto);
      await flush();

      expect(repo['addOutputAsset']).toHaveBeenCalledWith(
        expect.objectContaining({
          storageKey: 'file-1',
          mimeType: 'audio/mpeg',
          durationSeconds: 3,
        }),
      );
      expect(execution['settle']).toHaveBeenCalledWith(RESULT.settlement);
      expect(repo['complete']!.mock.invocationCallOrder[0]).toBeLessThan(
        execution['settle']!.mock.invocationCallOrder[0]!,
      );
    });

    it('releases instead of settling when a cancel won the race', async () => {
      repo['complete']!.mockResolvedValue(false);

      await service.enqueueGeneration(dto);
      await flush();

      expect(execution['releaseUnpersisted']).toHaveBeenCalledWith(RESULT.settlement);
      expect(execution['settle']).not.toHaveBeenCalled();
    });

    it('records a provider failure with its code and the fixed sentence', async () => {
      execution['execute']!.mockRejectedValue(
        audioFailure(AudioFailureCode.CONTENT_REJECTED, 'secret detail'),
      );

      await service.enqueueGeneration(dto);
      await flush();

      expect(repo['fail']).toHaveBeenCalledWith(
        'gen-1',
        'FAILED',
        AudioFailureCode.CONTENT_REJECTED,
        expect.not.stringContaining('secret detail'),
      );
    });

    it('records a timeout as TIMED_OUT', async () => {
      execution['execute']!.mockRejectedValue(audioFailure(AudioFailureCode.GENERATION_TIMED_OUT));

      await service.enqueueGeneration(dto);
      await flush();

      expect(repo['fail']).toHaveBeenCalledWith(
        'gen-1',
        'TIMED_OUT',
        AudioFailureCode.GENERATION_TIMED_OUT,
        expect.any(String),
      );
    });

    it('records a credit refusal with the credit sentence', async () => {
      execution['execute']!.mockRejectedValue(
        new BusinessException('x', 'PAYG_CREDIT_EXHAUSTED', 402),
      );

      await service.enqueueGeneration(dto);
      await flush();

      expect(repo['fail']).toHaveBeenCalledWith(
        'gen-1',
        'FAILED',
        'PAYG_CREDIT_EXHAUSTED',
        expect.stringContaining('credit'),
      );
    });

    it('writes nothing for a user cancel', async () => {
      execution['execute']!.mockRejectedValue(
        new BusinessException('c', 'AUDIO_GENERATION_CANCELLED', 409),
      );

      await service.enqueueGeneration(dto);
      await flush();

      expect(repo['fail']).not.toHaveBeenCalled();
    });

    it('does nothing when the row is no longer QUEUED', async () => {
      repo['markRunning']!.mockResolvedValue(false);

      await service.enqueueGeneration(dto);
      await flush();

      expect(execution['execute']).not.toHaveBeenCalled();
    });
  });

  describe('reads and owner routes', () => {
    it('returns the internal contract shape with an asset', async () => {
      repo['findById']!.mockResolvedValue(
        row({
          status: AudioGenerationStatus.COMPLETED,
          assets: [
            {
              id: 'a1',
              generationId: 'gen-1',
              storageKey: 'file-1',
              url: '/api/v1/files/download/file-1',
              downloadUrl: '/api/v1/files/download/file-1',
              mimeType: 'audio/mpeg',
              sizeBytes: 100,
              durationSeconds: 3,
            },
          ],
        }),
      );

      const view = await service.getInternalById('gen-1');

      expect(view).toEqual({
        id: 'gen-1',
        status: 'COMPLETED',
        assetUrl: '/api/v1/files/download/file-1',
        mimeType: 'audio/mpeg',
        durationSec: 3,
        provider: 'AUDIO_OPENAI',
        model: 'tts-1',
        kind: 'SPEECH',
      });
    });

    it('carries errorCode and errorMessage on a failure and never the reservation id', async () => {
      repo['findById']!.mockResolvedValue(
        row({
          status: AudioGenerationStatus.FAILED,
          errorCode: 'AUDIO_PROVIDER_FAILURE',
          errorMessage: 'msg',
        }),
      );

      const view = await service.getInternalById('gen-1');

      expect(view).toMatchObject({ errorCode: 'AUDIO_PROVIDER_FAILURE', errorMessage: 'msg' });
      expect(JSON.stringify(view)).not.toContain('res-secret');
    });

    it('404s a missing id and hides a stranger behind the same 404', async () => {
      repo['findById']!.mockResolvedValue(null);
      await expect(service.getInternalById('x')).rejects.toMatchObject({
        code: 'ENTITY_NOT_FOUND',
      });

      repo['findById']!.mockResolvedValue(row({ userId: 'someone-else' }));
      await expect(service.getWithLatestForUser('gen-1', 'user-1')).rejects.toMatchObject({
        code: 'ENTITY_NOT_FOUND',
      });
    });

    it('follows the retry chain to the latest row', async () => {
      repo['findById']!.mockResolvedValueOnce(
        row({ status: AudioGenerationStatus.FAILED, supersededById: 'gen-2' }),
      ).mockResolvedValueOnce(row({ id: 'gen-2', status: AudioGenerationStatus.COMPLETED }));

      const view = await service.getWithLatestForUser('gen-1', 'user-1');

      expect(view.latest.id).toBe('gen-2');
      expect(view.id).toBe('gen-1');
    });

    it('cancels idempotently and reports the row status', async () => {
      repo['findById']!.mockResolvedValue(row({ status: AudioGenerationStatus.CANCELLED }));
      repo['cancelIfActive']!.mockResolvedValue(false);

      expect(await service.cancelGenerationForUser('gen-1', 'user-1')).toEqual({
        id: 'gen-1',
        status: 'CANCELLED',
        cancelled: false,
      });
    });

    it('retries only the latest failed row, behind the plan gate', async () => {
      repo['findById']!.mockResolvedValue(row({ status: AudioGenerationStatus.FAILED }));
      repo['createSuccessor']!.mockResolvedValue(row({ id: 'gen-2' }));

      const successor = await service.retryGenerationForUser('gen-1', 'user-1');

      expect(planGate.assertCanGenerate).toHaveBeenCalledWith('user-1');
      expect(repo['createSuccessor']).toHaveBeenCalledWith(
        'gen-1',
        expect.objectContaining({ prompt: 'Hello there' }),
      );
      expect(successor.id).toBe('gen-2');
      await flush();
    });

    it('refuses to retry a completed or already superseded row', async () => {
      repo['findById']!.mockResolvedValue(row({ status: AudioGenerationStatus.COMPLETED }));
      await expect(service.retryGenerationForUser('gen-1', 'user-1')).rejects.toMatchObject({
        code: 'AUDIO_NOT_RETRYABLE',
      });

      repo['findById']!.mockResolvedValue(
        row({ status: AudioGenerationStatus.FAILED, supersededById: 'gen-2' }),
      );
      await expect(service.retryGenerationForUser('gen-1', 'user-1')).rejects.toMatchObject({
        code: 'AUDIO_NOT_RETRYABLE',
      });
    });
  });
});
