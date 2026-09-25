import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type FileVideoProcessFailedPayload,
  VideoProcessingFailureReason,
} from '@claw/shared-types';
import { type File, FileIngestionStatus } from '../../../generated/prisma';
import { VideoCancelOutcome, VideoProcessingStep } from '../../../common/enums';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { FilesRepository } from '../repositories/files.repository';
import {
  VIDEO_CANCEL_FLAG_KEY_PREFIX,
  VIDEO_CANCEL_FLAG_TTL_SECONDS,
  VIDEO_CANCEL_FLAG_VALUE,
  VIDEO_CANCEL_MAX_POLLS,
  VIDEO_CANCEL_POLL_INTERVAL_MS,
  VIDEO_MEDIA_CHILD_STEPS,
} from '../constants/video-processing.constants';
import { type VideoCancelResult, type VideoCancelWatch } from '../types/video-processing.types';
import {
  isVideoAwaitingProcessing,
  resolveEffectiveIngestionStatus,
} from '../utilities/effective-ingestion.utility';
import { OWNER_PLACEHOLDER_PROCESSING_CEILING_MS } from '../constants/effective-ingestion.constants';
import { describeVideoFailure } from '../utilities/video-document.utility';

/**
 * User cancellation of a video still processing (pack section 72: "do not
 * fake provider cancellation; persist correct local state; release PAYG
 * holds").
 *
 * Replica-safe by construction: the only shared state is the Redis flag
 * `claw:file:video:cancel:<fileId>` and the row. The cancel route sets the
 * flag AND, while the row is still the placeholder, writes the cancelled
 * result itself (conditional, so it cannot clobber a document that just
 * landed). A job on any replica reads the flag at every step boundary and
 * through a bounded poll while a child or a provider call runs; the poll
 * aborts the job's signal, which SIGKILLs ffmpeg and aborts the provider HTTP
 * call (the hold is then RELEASED as CANCELLED, never finalized).
 *
 * A cancelled video is FAILED with `PROCESSING_CANCELLED`, never
 * COMPLETED-with-a-note: COMPLETED would tell chat-service the document is
 * ready and route the note to a model as content.
 */
@Injectable()
export class VideoCancellationManager {
  private readonly logger = new Logger(VideoCancellationManager.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly redis: RedisService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  static flagKey(fileId: string): string {
    return `${VIDEO_CANCEL_FLAG_KEY_PREFIX}:${fileId}`;
  }

  /**
   * The route's half. Idempotent: a row that is not a processing video (not a
   * video, ready, failed, already cancelled) is a no-op answered with its
   * current effective status. The caller has already proved ownership.
   */
  async cancel(file: File): Promise<VideoCancelResult> {
    if (!isVideoAwaitingProcessing(file)) {
      this.logCancel(file.id, VideoProcessingStep.REQUESTED, VideoCancelOutcome.NOOP, false, false);
      return this.result(file, false);
    }
    await this.redis.set(
      VideoCancellationManager.flagKey(file.id),
      VIDEO_CANCEL_FLAG_VALUE,
      VIDEO_CANCEL_FLAG_TTL_SECONDS,
    );
    const message = describeVideoFailure(VideoProcessingFailureReason.PROCESSING_CANCELLED);
    const written = await this.filesRepository.saveVideoExtractionResult(file.id, {
      extractedText: null,
      extractionError: message,
      status: FileIngestionStatus.FAILED,
      metadata: {
        media: {
          sizeBytes: file.sizeBytes,
          thumbnailBase64: null,
          thumbnailMimeType: null,
          failureReason: VideoProcessingFailureReason.PROCESSING_CANCELLED,
          processedAt: new Date().toISOString(),
        },
      },
    });
    if (!written) {
      // The job's document (or another cancel) landed between the read and
      // this write. The flag stays: it is harmless to a finished job and stops
      // one that is somehow still running.
      const current = await this.filesRepository.findById(file.id);
      this.logCancel(file.id, VideoProcessingStep.REQUESTED, VideoCancelOutcome.NOOP, false, false);
      return this.result(current ?? file, false);
    }
    this.publishCancelled(file.id, file.userId, message);
    this.logCancel(
      file.id,
      VideoProcessingStep.REQUESTED,
      VideoCancelOutcome.CANCELLED,
      false,
      false,
    );
    return { fileId: file.id, ingestionStatus: FileIngestionStatus.FAILED, cancelled: true };
  }

  /** The published failure for a cancel, whoever recorded it (route or job). */
  publishCancelled(fileId: string, userId: string, reason: string): void {
    const payload: FileVideoProcessFailedPayload = {
      fileId,
      userId,
      reasonCode: VideoProcessingFailureReason.PROCESSING_CANCELLED,
      reason,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_VIDEO_PROCESS_FAILED, payload);
  }

  /**
   * The job's half: a watch that polls the flag every
   * `VIDEO_CANCEL_POLL_INTERVAL_MS`, at most `VIDEO_CANCEL_MAX_POLLS` times.
   * The caller MUST `stopWatch` it in a `finally`.
   */
  startWatch(fileId: string): VideoCancelWatch {
    const watch: VideoCancelWatch = {
      fileId,
      controller: new AbortController(),
      timer: null,
      polls: 0,
      pollInFlight: false,
      step: VideoProcessingStep.PROBE,
      cancelled: false,
      childKilled: false,
      holdReleased: false,
    };
    watch.timer = setInterval(() => {
      void this.poll(watch);
    }, VIDEO_CANCEL_POLL_INTERVAL_MS);
    return watch;
  }

  stopWatch(watch: VideoCancelWatch): void {
    if (watch.timer !== null) {
      clearInterval(watch.timer);
      watch.timer = null;
    }
  }

  /**
   * A step boundary: records the step about to run and reads the flag
   * directly (not only through the poll), so a cancel is seen before the next
   * child is spawned or the next hold is taken. True = stop now. Once
   * cancelled, the recorded step stays the one where the cancel was seen.
   */
  async checkpoint(watch: VideoCancelWatch, step: VideoProcessingStep): Promise<boolean> {
    if (watch.cancelled) {
      return true;
    }
    watch.step = step;
    if (await this.isFlagged(watch.fileId)) {
      // Between steps: no child is running, nothing is killed.
      this.trip(watch, false);
    }
    return watch.cancelled;
  }

  /** The job's `videoCancel` line. Never carries transcript text or a balance. */
  logCancel(
    fileId: string,
    step: VideoProcessingStep,
    outcome: VideoCancelOutcome,
    holdReleased: boolean,
    childKilled: boolean,
  ): void {
    this.logger.log(
      `videoCancel fileId=${fileId} step=${step} outcome=${outcome} holdReleased=${String(holdReleased)} childKilled=${String(childKilled)}`,
    );
  }

  private async poll(watch: VideoCancelWatch): Promise<void> {
    if (watch.pollInFlight || watch.cancelled) {
      return;
    }
    watch.polls += 1;
    if (watch.polls > VIDEO_CANCEL_MAX_POLLS) {
      this.stopWatch(watch);
      return;
    }
    watch.pollInFlight = true;
    try {
      if (await this.isFlagged(watch.fileId)) {
        // Mid-step: an ffmpeg/ffprobe step has its child running right now.
        this.trip(watch, VIDEO_MEDIA_CHILD_STEPS.has(watch.step));
      }
    } finally {
      watch.pollInFlight = false;
    }
  }

  /** Latches the cancel and aborts the job's signal (kills a child, aborts HTTP). */
  private trip(watch: VideoCancelWatch, childRunning: boolean): void {
    if (watch.cancelled) {
      return;
    }
    watch.cancelled = true;
    watch.childKilled = childRunning;
    watch.controller.abort();
    this.stopWatch(watch);
  }

  /** A Redis fault reads as "not cancelled": the job carries on, and says so. */
  private async isFlagged(fileId: string): Promise<boolean> {
    try {
      return (await this.redis.get(VideoCancellationManager.flagKey(fileId))) !== null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`isFlagged: fileId=${fileId} flag unreadable — continuing (${message})`);
      return false;
    }
  }

  private result(file: File, cancelled: boolean): VideoCancelResult {
    return {
      fileId: file.id,
      ingestionStatus: resolveEffectiveIngestionStatus(file, {
        ceilingMs: OWNER_PLACEHOLDER_PROCESSING_CEILING_MS,
      }),
      cancelled,
    };
  }
}
