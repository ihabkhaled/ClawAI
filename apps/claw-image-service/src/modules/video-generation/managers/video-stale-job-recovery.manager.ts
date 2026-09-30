import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';

import { VideoFailureCode } from '../../../common/enums';
import { videoFailureMessage } from '../constants/video-failure.constants';
import {
  VIDEO_STALE_AFTER_MS,
  VIDEO_STALE_SWEEP_INTERVAL_MS,
} from '../constants/video-generation.constants';
import { VideoGenerationRepository } from '../repositories/video-generation.repository';
import { VideoExecutionManager } from './video-execution.manager';

/**
 * Ends video jobs whose process died.
 *
 * A generation runs fire-and-forget inside the process that accepted it, so a
 * restart mid-job would leave the row GENERATING forever and the PAYG hold open.
 * At boot every running row belongs to the dead process (image-service runs one
 * replica), and on a bounded interval a row untouched past the wait budget plus a
 * margin is one too. Each row goes through ONE conditional write, so a live
 * completion, failure or cancel that lands first always wins; only rows this
 * sweep actually moved get their hold released (never finalized).
 */
@Injectable()
export class VideoStaleJobRecoveryManager implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(VideoStaleJobRecoveryManager.name);
  private timer: NodeJS.Timeout | undefined;
  private sweeping = false;

  constructor(
    private readonly repository: VideoGenerationRepository,
    private readonly execution: VideoExecutionManager,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sweep(0);
    this.timer = setInterval(() => {
      void this.sweep(VIDEO_STALE_AFTER_MS);
    }, VIDEO_STALE_SWEEP_INTERVAL_MS);
    // Never keep the process alive just for this timer.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** One bounded, single-flight pass. Never throws; returns how many rows it timed out. */
  async sweep(ageMs: number): Promise<number> {
    if (this.sweeping) {
      return 0;
    }
    this.sweeping = true;
    try {
      const cutoff = new Date(Date.now() - ageMs);
      const stale = await this.repository.findStale(cutoff);
      let recovered = 0;
      for (const row of stale) {
        const code = VideoFailureCode.GENERATION_INTERRUPTED;
        const moved = await this.repository.timeOutIfStale(row.id, cutoff, {
          errorCode: code,
          errorMessage: videoFailureMessage(code),
        });
        if (!moved) {
          continue;
        }
        recovered += 1;
        if (row.paygReservationId !== null) {
          await this.execution.releaseAbandoned(row.paygReservationId, row.id);
        }
      }
      if (recovered > 0) {
        this.logger.warn(
          `videoStaleRecovery recovered=${String(recovered)} ageMs=${String(ageMs)}`,
        );
      }
      return recovered;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`videoStaleRecovery sweep failed: ${message}`);
      return 0;
    } finally {
      this.sweeping = false;
    }
  }
}
