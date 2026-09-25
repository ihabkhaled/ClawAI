// Multimodal batch 7 — on-demand frames. VideoMediaManager is faked so no
// ffmpeg is needed; Redis is an in-memory map so the cache is real behaviour.

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../../common/errors';
import { type RedisService } from '../../../../infrastructure/redis/redis.service';
import { type FilesRepository } from '../../repositories/files.repository';
import { type VideoMediaManager } from '../../managers/video-media.manager';
import { VideoFramesService } from '../video-frames.service';
import {
  VIDEO_FRAME_CACHE_TTL_SECONDS,
  VIDEO_FRAME_MAX_BYTES,
  VIDEO_FRAME_MAX_WIDTH,
  VIDEO_FRAMES_RESPONSE_MAX_BYTES,
} from '../../constants/video-processing.constants';

const processedVideo = (overrides: Partial<File> = {}): File =>
  ({
    id: 'video-1',
    userId: 'owner-1',
    filename: 'clip.mp4',
    mimeType: 'video/mp4',
    ingestionStatus: FileIngestionStatus.COMPLETED,
    extractionMetadata: { media: { durationMs: 10_000, failureReason: null, sizeBytes: 1 } },
    ...overrides,
  }) as File;

interface Harness {
  service: VideoFramesService;
  store: Map<string, string>;
  redis: { get: Mock; set: Mock };
  media: { withWorkspace: Mock; extractFrame: Mock };
}

const buildHarness = (file: File | null): Harness => {
  const store = new Map<string, string>();
  const redis = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
  const media = {
    withWorkspace: vi.fn(async (_file: File, work: (ws: unknown) => Promise<unknown>) =>
      work({ dir: '/tmp/claw-media-x', inputPath: '/tmp/claw-media-x/input' }),
    ),
    extractFrame: vi.fn(async (_ws: unknown, timestampMs: number) =>
      Buffer.from(`jpeg@${String(timestampMs)}`),
    ),
  };
  const files = { findById: vi.fn().mockResolvedValue(file) };
  const service = new VideoFramesService(
    files as unknown as FilesRepository,
    redis as unknown as RedisService,
    media as unknown as VideoMediaManager,
  );
  return { service, store, redis, media };
};

const expectBusiness = async (
  promise: Promise<unknown>,
  status: HttpStatus,
  code: string,
): Promise<void> => {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BusinessException);
  expect((error as BusinessException).getStatus()).toBe(status);
  expect((error as BusinessException).code).toBe(code);
};

describe('VideoFramesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns JPEG frames in requested order, deduplicated', async () => {
    const h = buildHarness(processedVideo());
    const frames = await h.service.getFrames('video-1', {
      userId: 'owner-1',
      timestampsMs: [5_000, 0, 5_000],
    });

    expect(frames).toEqual([
      {
        timestampMs: 5_000,
        mimeType: 'image/jpeg',
        base64: Buffer.from('jpeg@5000').toString('base64'),
      },
      { timestampMs: 0, mimeType: 'image/jpeg', base64: Buffer.from('jpeg@0').toString('base64') },
    ]);
    expect(h.media.extractFrame).toHaveBeenCalledTimes(2);
    expect(h.media.extractFrame).toHaveBeenCalledWith(
      expect.anything(),
      5_000,
      VIDEO_FRAME_MAX_WIDTH,
      VIDEO_FRAME_MAX_BYTES,
    );
  });

  it('caches per (file, timestamp) with a short TTL and never re-extracts a cached frame', async () => {
    const h = buildHarness(processedVideo());
    await h.service.getFrames('video-1', { userId: 'owner-1', timestampsMs: [1_000] });
    expect(h.redis.set).toHaveBeenCalledWith(
      'file:video-frame:video-1:1000',
      expect.any(String),
      VIDEO_FRAME_CACHE_TTL_SECONDS,
    );

    h.media.extractFrame.mockClear();
    h.media.withWorkspace.mockClear();
    const again = await h.service.getFrames('video-1', {
      userId: 'owner-1',
      timestampsMs: [1_000],
    });
    expect(again).toHaveLength(1);
    expect(h.media.withWorkspace).not.toHaveBeenCalled();
    expect(h.media.extractFrame).not.toHaveBeenCalled();
  });

  it('still serves frames when Redis is down', async () => {
    const h = buildHarness(processedVideo());
    h.redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
    h.redis.set.mockRejectedValue(new Error('ECONNREFUSED'));
    const frames = await h.service.getFrames('video-1', {
      userId: 'owner-1',
      timestampsMs: [1_000],
    });
    expect(frames).toHaveLength(1);
  });

  it('keeps a seek at the very end inside the clip, but reports the requested time', async () => {
    const h = buildHarness(processedVideo());
    const frames = await h.service.getFrames('video-1', {
      userId: 'owner-1',
      timestampsMs: [10_000],
    });
    expect(h.media.extractFrame).toHaveBeenCalledWith(
      expect.anything(),
      9_750,
      VIDEO_FRAME_MAX_WIDTH,
      VIDEO_FRAME_MAX_BYTES,
    );
    expect(frames[0]?.timestampMs).toBe(10_000);
  });

  it('omits a frame ffmpeg could not produce, and stops at the response byte cap', async () => {
    const h = buildHarness(processedVideo());
    h.media.extractFrame.mockImplementation(async (_ws: unknown, timestampMs: number) =>
      timestampMs === 0
        ? null
        : Buffer.alloc(Math.ceil((VIDEO_FRAMES_RESPONSE_MAX_BYTES * 0.6 * 3) / 4)),
    );
    const frames = await h.service.getFrames('video-1', {
      userId: 'owner-1',
      timestampsMs: [0, 1_000, 2_000],
    });
    expect(frames.map((frame) => frame.timestampMs)).toEqual([1_000]);
  });

  it('404s for another user, never 403 — an id cannot be probed', async () => {
    const h = buildHarness(processedVideo());
    await expect(
      h.service.getFrames('video-1', { userId: 'intruder', timestampsMs: [0] }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
    expect(h.media.withWorkspace).not.toHaveBeenCalled();
  });

  it('404s for a missing row', async () => {
    const h = buildHarness(null);
    await expect(
      h.service.getFrames('nope', { userId: 'owner-1', timestampsMs: [0] }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('400s a timestamp past the end of the video', async () => {
    const h = buildHarness(processedVideo());
    await expectBusiness(
      h.service.getFrames('video-1', { userId: 'owner-1', timestampsMs: [0, 10_001] }),
      HttpStatus.BAD_REQUEST,
      'TIMESTAMP_OUT_OF_RANGE',
    );
  });

  it('400s a file that is not a video', async () => {
    const h = buildHarness(processedVideo({ mimeType: 'image/png' }));
    await expectBusiness(
      h.service.getFrames('video-1', { userId: 'owner-1', timestampsMs: [0] }),
      HttpStatus.BAD_REQUEST,
      'NOT_A_VIDEO',
    );
  });

  it.each([
    ['still carrying its placeholder (no metadata)', { extractionMetadata: null }],
    [
      'over the plan limit',
      {
        ingestionStatus: FileIngestionStatus.FAILED,
        extractionMetadata: {
          media: { durationMs: 61_000, failureReason: 'VIDEO_TOO_LONG_FOR_PLAN' },
        },
      },
    ],
    [
      'with a failure reason on a COMPLETED row',
      { extractionMetadata: { media: { durationMs: 5_000, failureReason: 'CORRUPT_CONTAINER' } } },
    ],
  ])('409s a video %s', async (_label, overrides) => {
    const h = buildHarness(processedVideo(overrides as Partial<File>));
    await expectBusiness(
      h.service.getFrames('video-1', { userId: 'owner-1', timestampsMs: [0] }),
      HttpStatus.CONFLICT,
      'VIDEO_NOT_READY',
    );
  });
});
