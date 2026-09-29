import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';

import { type File } from '../../../../generated/prisma';
import type { RedisService } from '../../../../infrastructure/redis/redis.service';
import type { FilesRepository } from '../../repositories/files.repository';
import {
  VIDEO_PROCESSING_STALE_MS,
  VIDEO_STALE_ATTEMPTS_TTL_SECONDS,
  VIDEO_STALE_BOOT_GRACE_MS,
  VIDEO_STALE_MAX_REQUEUES,
  VIDEO_STALE_SWEEP_BATCH_SIZE,
  VIDEO_STALE_SWEEP_INTERVAL_MS,
} from '../../constants/video-processing.constants';
import type { FileProcessingManager } from '../file-processing.manager';
import type { VideoProcessingManager } from '../video-processing.manager';
import { VideoStaleRecoveryManager } from '../video-stale-recovery.manager';

const NOW = new Date('2026-09-29T12:00:00.000Z');
const LIVE_OWNER = 'owner-this-process';
const LOCK_KEY = 'file:video-process-lock:video-1';
const ATTEMPTS_KEY = 'file:video-requeue-attempts:video-1';

type Harness = {
  manager: VideoStaleRecoveryManager;
  findStale: Mock;
  touch: Mock;
  redisGet: Mock;
  deleteIfValue: Mock;
  increment: Mock;
  requestVideoProcessing: Mock;
  failStalled: Mock;
};

const staleFile = { id: 'video-1', mimeType: 'video/mp4', userId: 'user-1' } as File;

function build(): Harness {
  const findStale = vi.fn().mockResolvedValue([]);
  const touch = vi.fn().mockResolvedValue(true);
  const redisGet = vi.fn().mockResolvedValue(null);
  const deleteIfValue = vi.fn().mockResolvedValue(true);
  const increment = vi.fn().mockResolvedValue(1);
  const requestVideoProcessing = vi.fn().mockResolvedValue(undefined);
  const failStalled = vi.fn().mockResolvedValue(true);
  const manager = new VideoStaleRecoveryManager(
    {
      findStaleVideoPlaceholders: findStale,
      touchVideoPlaceholder: touch,
    } as Partial<FilesRepository> as FilesRepository,
    {
      get: redisGet,
      deleteIfValue,
      incrementWithTtl: increment,
    } as Partial<RedisService> as RedisService,
    { requestVideoProcessing } as Partial<FileProcessingManager> as FileProcessingManager,
    {
      failStalled,
      ownsLock: (value: string) => value === LIVE_OWNER,
    } as Partial<VideoProcessingManager> as VideoProcessingManager,
  );
  return {
    manager,
    findStale,
    touch,
    redisGet,
    deleteIfValue,
    increment,
    requestVideoProcessing,
    failStalled,
  };
}

describe('VideoStaleRecoveryManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('re-queues a stale video, clearing only the dead lock value', async () => {
    const h = build();
    h.findStale.mockResolvedValue([staleFile]);
    h.redisGet.mockResolvedValue('owner-dead-process');

    expect(await h.manager.sweep(VIDEO_PROCESSING_STALE_MS)).toBe(1);

    expect(h.findStale).toHaveBeenCalledWith(
      new Date(NOW.getTime() - VIDEO_PROCESSING_STALE_MS),
      VIDEO_STALE_SWEEP_BATCH_SIZE,
    );
    expect(h.deleteIfValue).toHaveBeenCalledWith(LOCK_KEY, 'owner-dead-process');
    expect(h.increment).toHaveBeenCalledWith(ATTEMPTS_KEY, VIDEO_STALE_ATTEMPTS_TTL_SECONDS);
    expect(h.touch).toHaveBeenCalledWith('video-1');
    expect(h.requestVideoProcessing).toHaveBeenCalledWith(staleFile);
    expect(h.failStalled).not.toHaveBeenCalled();
  });

  it('re-queues without touching Redis locks when no lock exists', async () => {
    const h = build();
    h.findStale.mockResolvedValue([staleFile]);

    await h.manager.sweep(VIDEO_PROCESSING_STALE_MS);

    expect(h.deleteIfValue).not.toHaveBeenCalled();
    expect(h.requestVideoProcessing).toHaveBeenCalledTimes(1);
  });

  it('leaves fresh rows untouched (none older than the cutoff)', async () => {
    const h = build();

    expect(await h.manager.sweep(VIDEO_PROCESSING_STALE_MS)).toBe(0);
    expect(h.redisGet).not.toHaveBeenCalled();
    expect(h.requestVideoProcessing).not.toHaveBeenCalled();
  });

  it('skips a video whose lock is held by a live job in this process', async () => {
    const h = build();
    h.findStale.mockResolvedValue([staleFile]);
    h.redisGet.mockResolvedValue(LIVE_OWNER);

    expect(await h.manager.sweep(VIDEO_PROCESSING_STALE_MS)).toBe(0);
    expect(h.deleteIfValue).not.toHaveBeenCalled();
    expect(h.increment).not.toHaveBeenCalled();
    expect(h.requestVideoProcessing).not.toHaveBeenCalled();
  });

  it('ends the video FAILED once the re-queue attempts are used up', async () => {
    const h = build();
    h.findStale.mockResolvedValue([staleFile]);
    h.increment.mockResolvedValue(VIDEO_STALE_MAX_REQUEUES + 1);

    expect(await h.manager.sweep(VIDEO_PROCESSING_STALE_MS)).toBe(1);
    expect(h.failStalled).toHaveBeenCalledWith(staleFile, VIDEO_STALE_MAX_REQUEUES);
    expect(h.requestVideoProcessing).not.toHaveBeenCalled();
    expect(h.touch).not.toHaveBeenCalled();
  });

  it('never throws when the database read fails', async () => {
    const h = build();
    h.findStale.mockRejectedValue(new Error('db down'));

    await expect(h.manager.sweep(VIDEO_PROCESSING_STALE_MS)).resolves.toBe(0);
  });

  it('is single-flight: an overlapping sweep is skipped', async () => {
    const h = build();
    let finish: (rows: File[]) => void = () => {};
    h.findStale.mockReturnValue(
      new Promise<File[]>((resolve) => {
        finish = resolve;
      }),
    );

    const first = h.manager.sweep(VIDEO_PROCESSING_STALE_MS);
    expect(await h.manager.sweep(VIDEO_PROCESSING_STALE_MS)).toBe(0);
    finish([]);
    await first;
    expect(h.findStale).toHaveBeenCalledTimes(1);
  });

  it('boot sweeps with the short grace, ticks on the interval, and stops on destroy', async () => {
    const h = build();

    await h.manager.onApplicationBootstrap();
    expect(h.findStale).toHaveBeenLastCalledWith(
      new Date(NOW.getTime() - VIDEO_STALE_BOOT_GRACE_MS),
      VIDEO_STALE_SWEEP_BATCH_SIZE,
    );

    await vi.advanceTimersByTimeAsync(VIDEO_STALE_SWEEP_INTERVAL_MS);
    expect(h.findStale).toHaveBeenCalledTimes(2);

    h.manager.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(VIDEO_STALE_SWEEP_INTERVAL_MS * 3);
    expect(h.findStale).toHaveBeenCalledTimes(2);
  });
});
