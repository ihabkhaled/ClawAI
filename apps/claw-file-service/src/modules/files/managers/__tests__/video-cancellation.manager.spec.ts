// Pack section 72 — user cancellation of a processing video. The route half
// (idempotent cancel, conditional write) and the job half (checkpoints, the
// bounded poll that aborts a running child) against an in-memory Redis that
// two manager instances share, the way two replicas share the real one.

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { EventPattern, VideoProcessingFailureReason } from '@claw/shared-types';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import { VideoProcessingStep } from '../../../../common/enums';
import { VideoCancellationManager } from '../video-cancellation.manager';
import {
  VIDEO_CANCEL_MAX_POLLS,
  VIDEO_CANCEL_POLL_INTERVAL_MS,
} from '../../constants/video-processing.constants';

const FLAG = 'claw:file:video:cancel:video-1';

const buildFile = (overrides: Partial<File> = {}): File =>
  ({
    id: 'video-1',
    userId: 'owner-1',
    filename: 'clip.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 4096,
    storagePath: '/data/files/clip.mp4',
    content: null,
    extractedText: '[Video file: clip.mp4]',
    extractionError: null,
    ingestionStatus: FileIngestionStatus.COMPLETED,
    retentionExpiresAt: null,
    parentFileId: null,
    isExtracted: false,
    archivePath: null,
    extractionMetadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as File;

const CANCELLED_ROW = {
  ingestionStatus: FileIngestionStatus.FAILED,
  extractedText: null,
  extractionError: 'Processing was cancelled.',
};

interface Harness {
  store: Map<string, string>;
  redis: { get: Mock; set: Mock };
  files: { saveVideoExtractionResult: Mock; findById: Mock };
  rabbit: { publish: Mock };
  replica: () => VideoCancellationManager;
}

const buildHarness = (): Harness => {
  const store = new Map<string, string>();
  const redis = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
  const files = {
    saveVideoExtractionResult: vi.fn().mockResolvedValue(true),
    findById: vi.fn(),
  };
  const rabbit = { publish: vi.fn().mockResolvedValue(undefined) };
  const replica = (): VideoCancellationManager =>
    new VideoCancellationManager(files as never, redis as never, rabbit as never);
  return { store, redis, files, rabbit, replica };
};

describe('VideoCancellationManager', () => {
  let h: Harness;

  beforeEach(() => {
    h = buildHarness();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('cancel (the route half)', () => {
    it('cancels a processing video: flag set, cancelled FAILED written, one failed event', async () => {
      const answer = await h.replica().cancel(buildFile());

      expect(answer).toEqual({
        fileId: 'video-1',
        ingestionStatus: FileIngestionStatus.FAILED,
        cancelled: true,
      });
      expect(h.redis.set).toHaveBeenCalledWith(FLAG, '1', 900);
      const write = h.files.saveVideoExtractionResult.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(write).toMatchObject({
        extractedText: null,
        extractionError: 'Processing was cancelled.',
        status: FileIngestionStatus.FAILED,
        metadata: {
          media: {
            sizeBytes: 4096,
            failureReason: VideoProcessingFailureReason.PROCESSING_CANCELLED,
          },
        },
      });
      expect(h.rabbit.publish).toHaveBeenCalledTimes(1);
      expect(h.rabbit.publish).toHaveBeenCalledWith(
        EventPattern.FILE_VIDEO_PROCESS_FAILED,
        expect.objectContaining({
          fileId: 'video-1',
          userId: 'owner-1',
          reasonCode: VideoProcessingFailureReason.PROCESSING_CANCELLED,
          reason: 'Processing was cancelled.',
        }),
      );
    });

    it('double cancel is idempotent: the second call is a no-op answering FAILED', async () => {
      const manager = h.replica();
      await manager.cancel(buildFile());
      const second = await manager.cancel(buildFile(CANCELLED_ROW));

      expect(second).toEqual({
        fileId: 'video-1',
        ingestionStatus: FileIngestionStatus.FAILED,
        cancelled: false,
      });
      expect(h.files.saveVideoExtractionResult).toHaveBeenCalledTimes(1);
      expect(h.rabbit.publish).toHaveBeenCalledTimes(1);
    });

    it('not a video → no-op with the current effective status', async () => {
      const pdf = buildFile({
        mimeType: 'application/pdf',
        extractedText: 'Quarterly report',
      });
      const answer = await h.replica().cancel(pdf);
      expect(answer).toEqual({
        fileId: 'video-1',
        ingestionStatus: FileIngestionStatus.COMPLETED,
        cancelled: false,
      });
      expect(h.redis.set).not.toHaveBeenCalled();
      expect(h.files.saveVideoExtractionResult).not.toHaveBeenCalled();
    });

    it('a video that already FAILED for another reason is left alone', async () => {
      const answer = await h.replica().cancel(
        buildFile({
          ingestionStatus: FileIngestionStatus.FAILED,
          extractedText: null,
          extractionError: 'The video could not be read.',
        }),
      );
      expect(answer.cancelled).toBe(false);
      expect(answer.ingestionStatus).toBe(FileIngestionStatus.FAILED);
      expect(h.files.saveVideoExtractionResult).not.toHaveBeenCalled();
    });

    it('losing the race to the document is a no-op: never clobbers it, answers COMPLETED', async () => {
      h.files.saveVideoExtractionResult.mockResolvedValue(false);
      h.files.findById.mockResolvedValue(
        buildFile({ extractedText: 'Video "clip.mp4" — length 00:12.' }),
      );
      const answer = await h.replica().cancel(buildFile());

      expect(answer).toEqual({
        fileId: 'video-1',
        ingestionStatus: FileIngestionStatus.COMPLETED,
        cancelled: false,
      });
      expect(h.rabbit.publish).not.toHaveBeenCalled();
    });
  });

  describe('watch (the job half)', () => {
    it('replica-safe: a cancel on one instance aborts the job watched by another, through the poll', async () => {
      vi.useFakeTimers();
      const jobReplica = h.replica();
      const watch = jobReplica.startWatch('video-1');
      watch.step = VideoProcessingStep.AUDIO_EXTRACT;

      await h.replica().cancel(buildFile());
      expect(watch.controller.signal.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(VIDEO_CANCEL_POLL_INTERVAL_MS);

      expect(h.redis.get).toHaveBeenCalledWith(FLAG);
      expect(watch.controller.signal.aborted).toBe(true);
      expect(watch.cancelled).toBe(true);
      expect(watch.childKilled).toBe(true);
      expect(watch.timer).toBeNull();
      jobReplica.stopWatch(watch);
    });

    it('a checkpoint reads the flag directly and does not report a child kill between steps', async () => {
      const manager = h.replica();
      const watch = manager.startWatch('video-1');
      expect(await manager.checkpoint(watch, VideoProcessingStep.THUMBNAIL)).toBe(false);

      h.store.set(FLAG, '1');
      expect(await manager.checkpoint(watch, VideoProcessingStep.PLAN_CHECK)).toBe(true);
      expect(watch.controller.signal.aborted).toBe(true);
      expect(watch.childKilled).toBe(false);
      // The step where the cancel was seen is kept for the log line.
      expect(await manager.checkpoint(watch, VideoProcessingStep.SAVE)).toBe(true);
      expect(watch.step).toBe(VideoProcessingStep.PLAN_CHECK);
      manager.stopWatch(watch);
    });

    it('the poll is bounded: it stops itself after VIDEO_CANCEL_MAX_POLLS', async () => {
      vi.useFakeTimers();
      const manager = h.replica();
      const watch = manager.startWatch('video-1');

      await vi.advanceTimersByTimeAsync(
        VIDEO_CANCEL_POLL_INTERVAL_MS * (VIDEO_CANCEL_MAX_POLLS + 5),
      );

      expect(watch.timer).toBeNull();
      expect(h.redis.get).toHaveBeenCalledTimes(VIDEO_CANCEL_MAX_POLLS);
      expect(watch.controller.signal.aborted).toBe(false);
    });

    it('stopWatch clears the poll: no Redis reads after the job ends', async () => {
      vi.useFakeTimers();
      const manager = h.replica();
      const watch = manager.startWatch('video-1');
      manager.stopWatch(watch);
      await vi.advanceTimersByTimeAsync(VIDEO_CANCEL_POLL_INTERVAL_MS * 5);
      expect(h.redis.get).not.toHaveBeenCalled();
    });

    it('an unreadable flag fails open: the job carries on', async () => {
      h.redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
      const manager = h.replica();
      const watch = manager.startWatch('video-1');
      expect(await manager.checkpoint(watch, VideoProcessingStep.PROBE)).toBe(false);
      expect(watch.controller.signal.aborted).toBe(false);
      manager.stopWatch(watch);
    });
  });
});
