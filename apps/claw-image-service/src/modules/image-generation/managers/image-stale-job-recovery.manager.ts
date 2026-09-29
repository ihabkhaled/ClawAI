import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { EventPattern, type ImageFailedPayload } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { ImageGenerationStatus } from '../../../generated/prisma';
import { ImageFailureCode } from '../../../common/enums';
import { imageFailureMessage } from '../constants/image-failure.constants';
import {
  IMAGE_BOOT_RECOVERY_GRACE_MS,
  IMAGE_STALE_JOB_THRESHOLD_MS,
  IMAGE_STALE_SWEEP_BATCH_SIZE,
  IMAGE_STALE_SWEEP_INTERVAL_MS,
} from '../constants/image-stale-recovery.constants';
import { ImageGenerationRepository } from '../repositories/image-generation.repository';
import { ImageGenerationEventsService } from '../services/image-generation-events.service';
import { type ImageStaleJobRecord } from '../types/image-stale-recovery.types';
import { ImageExecutionManager } from './image-execution.manager';

/**
 * Ends image jobs whose process died.
 *
 * A generation runs fire-and-forget inside the process that accepted it, so a
 * restart mid-job left the row QUEUED/GENERATING forever: the spinner never
 * stopped and the PAYG hold was only reclaimed by auth-service's sweeper much
 * later. This manager times such rows out — at boot (every running row belongs
 * to the dead process; image-service runs one replica) and on a bounded
 * interval (a row untouched past the slowest provider deadline plus margin).
 *
 * Each row goes through ONE conditional write (`timeOutIfStale`), so a live
 * completion, failure or cancel that lands first always wins. Only the rows
 * this sweep actually moved get their hold released (never finalized) and the
 * same SSE + `image.failed` a normal failure emits.
 */
@Injectable()
export class ImageStaleJobRecoveryManager implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ImageStaleJobRecoveryManager.name);
  private timer: NodeJS.Timeout | undefined;
  private sweeping = false;

  constructor(
    private readonly repository: ImageGenerationRepository,
    private readonly executionManager: ImageExecutionManager,
    private readonly eventsService: ImageGenerationEventsService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sweep(IMAGE_BOOT_RECOVERY_GRACE_MS);
    this.timer = setInterval(() => {
      void this.sweep(IMAGE_STALE_JOB_THRESHOLD_MS);
    }, IMAGE_STALE_SWEEP_INTERVAL_MS);
    // Never keep the process alive just for this timer.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * One bounded pass: at most `IMAGE_STALE_SWEEP_BATCH_SIZE` rows untouched for
   * `ageMs`. Single-flight — a tick that finds the previous one still running
   * skips. Never throws; returns how many rows it timed out.
   */
  async sweep(ageMs: number): Promise<number> {
    if (this.sweeping) {
      return 0;
    }
    this.sweeping = true;
    try {
      const cutoff = new Date(Date.now() - ageMs);
      const stale = await this.repository.findStaleActive(cutoff, IMAGE_STALE_SWEEP_BATCH_SIZE);
      let recovered = 0;
      for (const row of stale) {
        if (await this.recover(row, cutoff)) {
          recovered += 1;
        }
      }
      if (recovered > 0) {
        this.logger.warn(
          `imageStaleRecovery recovered=${String(recovered)} ageMs=${String(ageMs)}`,
        );
      }
      return recovered;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`imageStaleRecovery sweep failed: ${msg}`);
      return 0;
    } finally {
      this.sweeping = false;
    }
  }

  private async recover(row: ImageStaleJobRecord, cutoff: Date): Promise<boolean> {
    const errorCode = ImageFailureCode.GENERATION_INTERRUPTED;
    const errorMessage = imageFailureMessage(errorCode);
    const timedOut = await this.repository.timeOutIfStale(row.id, cutoff, {
      errorCode,
      errorMessage,
    });
    if (timedOut === null) {
      // Finished, failed or cancelled since the read: the live path owns it.
      return false;
    }
    this.logger.warn(
      `imageStaleRecovery generationId=${row.id} fromStatus=${row.status} outcome=TIMED_OUT holdReleased=${String(row.paygReservationId !== null)}`,
    );
    if (row.paygReservationId !== null) {
      await this.executionManager.releaseAbandoned(row.paygReservationId, row.id);
    }
    await this.repository.createEvent({
      generationId: row.id,
      status: ImageGenerationStatus.TIMED_OUT,
      payloadJson: { errorCode, errorMessage },
    });
    this.eventsService.publish({
      generationId: row.id,
      status: ImageGenerationStatus.TIMED_OUT,
      provider: row.provider,
      model: row.model,
      errorCode,
      errorMessage,
    });
    const failedEvent: ImageFailedPayload = {
      generationId: row.id,
      userId: row.userId,
      provider: row.provider,
      model: row.model,
      prompt: row.prompt,
      errorCode,
      errorMessage,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQ.publish(EventPattern.IMAGE_FAILED, failedEvent);
    return true;
  }
}
