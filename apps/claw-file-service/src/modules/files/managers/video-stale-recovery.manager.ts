import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';

import { type File } from '../../../generated/prisma';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { FilesRepository } from '../repositories/files.repository';
import {
  VIDEO_PROCESSING_LOCK_KEY_PREFIX,
  VIDEO_PROCESSING_STALE_MS,
  VIDEO_STALE_ATTEMPTS_KEY_PREFIX,
  VIDEO_STALE_ATTEMPTS_TTL_SECONDS,
  VIDEO_STALE_BOOT_GRACE_MS,
  VIDEO_STALE_MAX_REQUEUES,
  VIDEO_STALE_SWEEP_BATCH_SIZE,
  VIDEO_STALE_SWEEP_INTERVAL_MS,
} from '../constants/video-processing.constants';
import { VideoStaleOutcome } from '../../../common/enums';
import { FileProcessingManager } from './file-processing.manager';
import { VideoProcessingManager } from './video-processing.manager';

/**
 * Re-queues video jobs lost to a restart.
 *
 * The job holds `file:video-process-lock:<id>` (15 min TTL) and deletes it
 * only when it finishes, so a process that died mid-job left the lock behind:
 * RabbitMQ redelivered the message, the handler found the lock taken, skipped
 * and acked, and the video stayed a placeholder until someone opened it.
 *
 * Per stale placeholder: a lock owned by THIS process is a live job → skip.
 * A lock written by any other owner is a dead process's (one replica) →
 * compare-and-delete that exact value. Then the attempt counter: past
 * `VIDEO_STALE_MAX_REQUEUES` the video ends FAILED (`failStalled`); otherwise
 * it is re-queued through `requestVideoProcessing` and its clock restarts.
 */
@Injectable()
export class VideoStaleRecoveryManager implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(VideoStaleRecoveryManager.name);
  private timer: NodeJS.Timeout | undefined;
  private sweeping = false;

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly redis: RedisService,
    private readonly fileProcessing: FileProcessingManager,
    private readonly videoProcessing: VideoProcessingManager,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sweep(VIDEO_STALE_BOOT_GRACE_MS);
    this.timer = setInterval(() => {
      void this.sweep(VIDEO_PROCESSING_STALE_MS);
    }, VIDEO_STALE_SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** One bounded, single-flight pass. Never throws; returns how many rows it acted on. */
  async sweep(ageMs: number): Promise<number> {
    if (this.sweeping) {
      return 0;
    }
    this.sweeping = true;
    try {
      const cutoff = new Date(Date.now() - ageMs);
      const stale = await this.filesRepository.findStaleVideoPlaceholders(
        cutoff,
        VIDEO_STALE_SWEEP_BATCH_SIZE,
      );
      let acted = 0;
      for (const file of stale) {
        const outcome = await this.recover(file);
        this.logger.log(`videoStaleRecovery fileId=${file.id} outcome=${outcome}`);
        if (outcome !== VideoStaleOutcome.SKIPPED_LIVE_LOCK) {
          acted += 1;
        }
      }
      return acted;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`videoStaleRecovery sweep failed: ${msg}`);
      return 0;
    } finally {
      this.sweeping = false;
    }
  }

  private async recover(file: File): Promise<VideoStaleOutcome> {
    const lockKey = `${VIDEO_PROCESSING_LOCK_KEY_PREFIX}:${file.id}`;
    const lockValue = await this.redis.get(lockKey);
    if (lockValue !== null) {
      if (this.videoProcessing.ownsLock(lockValue)) {
        return VideoStaleOutcome.SKIPPED_LIVE_LOCK;
      }
      // Only the exact dead value: a job that re-took the lock meanwhile keeps it.
      await this.redis.deleteIfValue(lockKey, lockValue);
    }
    const attempts = await this.redis.incrementWithTtl(
      `${VIDEO_STALE_ATTEMPTS_KEY_PREFIX}:${file.id}`,
      VIDEO_STALE_ATTEMPTS_TTL_SECONDS,
    );
    if (attempts > VIDEO_STALE_MAX_REQUEUES) {
      await this.videoProcessing.failStalled(file, attempts - 1);
      return VideoStaleOutcome.FAILED_EXHAUSTED;
    }
    await this.filesRepository.touchVideoPlaceholder(file.id);
    await this.fileProcessing.requestVideoProcessing(file);
    return VideoStaleOutcome.REQUEUED;
  }
}
