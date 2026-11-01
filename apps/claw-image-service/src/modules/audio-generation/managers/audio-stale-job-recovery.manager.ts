import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';

import { AudioFailureCode } from '../../../common/enums';
import { audioFailureMessage } from '../constants/audio-failure.constants';
import {
  AUDIO_STALE_AFTER_MS,
  AUDIO_STALE_SWEEP_INTERVAL_MS,
} from '../constants/audio-generation.constants';
import { AudioGenerationRepository } from '../repositories/audio-generation.repository';
import { AudioExecutionManager } from './audio-execution.manager';

/**
 * Ends audio jobs whose process died. A generation runs fire-and-forget inside the
 * process that accepted it, so a restart mid-job would leave the row RUNNING forever
 * and the PAYG hold open. At boot every active row belongs to the dead process
 * (image-service runs one replica); on an interval, a row untouched past the wait
 * budget is one too. Each row goes through ONE conditional write, so a live
 * completion, failure or cancel that lands first wins; only rows this sweep moved
 * get their hold released (never finalized).
 */
@Injectable()
export class AudioStaleJobRecoveryManager implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AudioStaleJobRecoveryManager.name);
  private timer: NodeJS.Timeout | undefined;
  private sweeping = false;

  constructor(
    private readonly repository: AudioGenerationRepository,
    private readonly execution: AudioExecutionManager,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sweep(0);
    this.timer = setInterval(() => {
      void this.sweep(AUDIO_STALE_AFTER_MS);
    }, AUDIO_STALE_SWEEP_INTERVAL_MS);
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
        const code = AudioFailureCode.GENERATION_INTERRUPTED;
        const moved = await this.repository.timeOutIfStale(row.id, cutoff, {
          errorCode: code,
          errorMessage: audioFailureMessage(code),
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
          `audioStaleRecovery recovered=${String(recovered)} ageMs=${String(ageMs)}`,
        );
      }
      return recovered;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`audioStaleRecovery sweep failed: ${message}`);
      return 0;
    } finally {
      this.sweeping = false;
    }
  }
}
