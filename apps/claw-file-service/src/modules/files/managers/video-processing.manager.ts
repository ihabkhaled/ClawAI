import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type FileVideoProcessCompletedPayload,
  type FileVideoProcessFailedPayload,
  type FileVideoProcessRequestedPayload,
  VideoAudioStatus,
  VideoProcessingFailureReason,
} from '@claw/shared-types';
import { type File, FileIngestionStatus } from '../../../generated/prisma';
import {
  DerivedTranscriptionStatus,
  MediaJobKind,
  VideoCancelOutcome,
  VideoPlanDecision,
  VideoProcessingOutcome,
  VideoProcessingStep,
} from '../../../common/enums';
import { FileMediaMetricsService } from '../../metrics/services/file-media-metrics.service';
import { MediaSourceUnreadableError } from '../../../common/errors';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { FilesRepository } from '../repositories/files.repository';
import { videoProcessJobSchema } from '../dto/video-process-job.dto';
import {
  VIDEO_AUDIO_EXTRACTION_FAILED_MESSAGE,
  VIDEO_AUDIO_MIME_TYPE,
  VIDEO_ENTITLEMENTS_UNAVAILABLE_MESSAGE,
  VIDEO_FRAME_MIME_TYPE,
  VIDEO_PROCESSING_LOCK_KEY_PREFIX,
  VIDEO_PROCESSING_LOCK_TTL_SECONDS,
  VIDEO_TRANSCRIPTION_INSTRUCTION,
  VIDEO_TRANSCRIPTION_REQUEST_SCOPE,
} from '../constants/video-processing.constants';
import {
  type MediaWorkspace,
  type VideoAnalysis,
  type VideoAudioOutcome,
  type VideoCancelWatch,
  type VideoFailure,
  type VideoFailureDetail,
  type VideoMediaMetadata,
  type VideoProbeSummary,
} from '../types/video-processing.types';
import { validateProbeSummary } from '../utilities/video-probe.utility';
import { isVideoAwaitingProcessing } from '../utilities/effective-ingestion.utility';
import { isSilentPeak } from '../utilities/volume-detect.utility';
import {
  boundSegments,
  buildVideoDocument,
  describeVideoFailure,
  parseTimestampedTranscript,
} from '../utilities/video-document.utility';
import { videoProcessingOutcome } from '../utilities/video-processing-outcome.utility';
import { VideoMediaManager } from './video-media.manager';
import { VideoPlanLimitManager } from './video-plan-limit.manager';
import { TranscriptionManager } from './transcription.manager';
import { VideoCancellationManager } from './video-cancellation.manager';

/**
 * Multimodal batch 7 — turns a stored video into a timestamped document.
 *
 * probe (ffprobe) → global limits → thumbnail → the uploader's plan limit →
 * audio track (ffmpeg) → silence check (`volumedetect`; silent → NO_SPEECH,
 * nothing charged) → transcription through the EXISTING metered path →
 * ONE write: `extractedText` + status + `extractionMetadata.media` together
 * (rule 42 item 4). Until that write the row carries the `[Video file: …]`
 * placeholder and `getIngestionState` reports PROCESSING (rule 42 item 12's
 * mechanism, extended to video).
 *
 * The paid step is the transcription, so everything that decides whether it
 * may run happens first: a video over the plan limit, or on a plan with video
 * disabled, is recorded FAILED with a readable reason and no hold is taken.
 * When auth-service cannot answer, the paid step fails closed and the free
 * steps still land.
 *
 * Idempotent by fileId: a job whose row no longer carries the placeholder is a
 * no-op, and a per-file Redis lock turns a concurrent duplicate (a redelivery
 * racing the first delivery, or a heal re-queue) into a no-op too — so a
 * video is never transcribed twice.
 *
 * Cancellable (pack section 72, `VideoCancellationManager`): the owner's
 * cancel sets a Redis flag this job reads at every step boundary and through a
 * bounded poll while a child or the provider call runs. A cancel kills the
 * running ffmpeg child, aborts the provider call (its hold RELEASED as
 * CANCELLED), and ends the job FAILED `PROCESSING_CANCELLED`. The single
 * write is conditional on the placeholder, so a late job never overwrites the
 * cancelled result and never publishes a completed event after a cancel.
 */
@Injectable()
export class VideoProcessingManager implements OnModuleInit {
  private readonly logger = new Logger(VideoProcessingManager.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly rabbitMQService: RabbitMQService,
    private readonly redis: RedisService,
    private readonly videoMedia: VideoMediaManager,
    private readonly planLimit: VideoPlanLimitManager,
    private readonly transcription: TranscriptionManager,
    private readonly cancellation: VideoCancellationManager,
    private readonly metrics: FileMediaMetricsService,
  ) {}

  /**
   * Subscribing at module init is load-bearing: the topic exchange drops a
   * routing key with no bound queue, and the queue is asserted by the
   * consumer. Producer and consumer are both file-service.
   */
  async onModuleInit(): Promise<void> {
    await this.rabbitMQService.subscribe(
      EventPattern.FILE_VIDEO_PROCESS_REQUESTED,
      async (data: unknown) => {
        await this.handleJob(data);
      },
    );
    this.logger.log('onModuleInit: subscribed to file.video_process_requested');
  }

  /** The job this manager consumes, for the producer side. */
  static buildRequest(file: File): FileVideoProcessRequestedPayload {
    return {
      fileId: file.id,
      userId: file.userId,
      filename: file.filename,
      mimeType: file.mimeType,
      timestamp: new Date().toISOString(),
    };
  }

  /** A video row still waiting for its document: COMPLETED + placeholder + no reason. */
  static isAwaitingProcessing(file: File): boolean {
    return isVideoAwaitingProcessing(file);
  }

  /**
   * Never records a failure by throwing: every expected failure lands on the
   * row. Only an infrastructure fault (database, Redis) escapes, and the bus
   * retries that — safely, because the job is idempotent.
   */
  async handleJob(data: unknown): Promise<void> {
    const parsed = videoProcessJobSchema.safeParse(data);
    if (!parsed.success) {
      this.logger.error('handleJob: malformed file.video_process_requested payload — dropping');
      return;
    }
    const { fileId, userId } = parsed.data;
    this.metrics.recordQueueWait(MediaJobKind.VIDEO, parsed.data.timestamp, Date.now());
    const file = await this.filesRepository.findById(fileId);
    if (file === null) {
      this.logger.warn(`handleJob: fileId=${fileId} no longer exists`);
      this.publishFailed(
        fileId,
        userId,
        VideoProcessingFailureReason.FILE_NOT_FOUND,
        describeVideoFailure(VideoProcessingFailureReason.FILE_NOT_FOUND),
      );
      return;
    }
    if (!VideoProcessingManager.isAwaitingProcessing(file)) {
      this.logger.log(
        `handleJob: fileId=${fileId} already processed — skipping (no second transcription)`,
      );
      return;
    }
    const lockKey = `${VIDEO_PROCESSING_LOCK_KEY_PREFIX}:${fileId}`;
    if (!(await this.redis.setIfAbsent(lockKey, fileId, VIDEO_PROCESSING_LOCK_TTL_SECONDS))) {
      this.logger.log(`handleJob: fileId=${fileId} already being processed — skipping duplicate`);
      return;
    }
    try {
      await this.process(file);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async process(file: File): Promise<void> {
    const startedAt = Date.now();
    const watch = this.cancellation.startWatch(file.id);
    let analysis: VideoAnalysis;
    try {
      analysis = (await this.cancellation.checkpoint(watch, VideoProcessingStep.PROBE))
        ? this.cancelled(null, null)
        : await this.videoMedia.withWorkspace(file, (workspace) =>
            this.analyse(file, workspace, watch),
          );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      const reason =
        error instanceof MediaSourceUnreadableError
          ? VideoProcessingFailureReason.SOURCE_UNREADABLE
          : VideoProcessingFailureReason.PROCESSING_ERROR;
      this.logger.error(`process: fileId=${file.id} reason=${reason} — ${message}`);
      analysis = this.failure(reason, { message }, null, null);
    } finally {
      this.cancellation.stopWatch(watch);
    }
    // One last read right before the write: a cancel that arrived after the
    // final step still wins, and whatever the job found is discarded.
    if (await this.cancellation.checkpoint(watch, VideoProcessingStep.SAVE)) {
      this.metrics.recordVideoJob(VideoProcessingOutcome.CANCELLED, Date.now() - startedAt);
      await this.saveCancelled(file, analysis, watch);
      return;
    }
    this.metrics.recordVideoJob(videoProcessingOutcome(analysis), Date.now() - startedAt);
    await (analysis.ok
      ? this.saveSuccess(file, analysis, startedAt)
      : this.saveFailure(file, analysis));
  }

  private async analyse(
    file: File,
    workspace: MediaWorkspace,
    watch: VideoCancelWatch,
  ): Promise<VideoAnalysis> {
    const { signal } = watch.controller;
    const probe = await this.videoMedia.probe(workspace, signal);
    if (await this.cancellation.checkpoint(watch, VideoProcessingStep.THUMBNAIL)) {
      return this.cancelled(null, null);
    }
    if (!probe.ok) {
      return this.failure(probe.reason, { message: probe.detail }, null, null);
    }
    const { summary } = probe;
    const invalid = validateProbeSummary(summary);
    if (invalid !== null) {
      return this.failure(invalid, { summary }, summary, null);
    }
    const thumbnail = await this.videoMedia.extractThumbnail(workspace, summary.durationMs, signal);
    if (await this.cancellation.checkpoint(watch, VideoProcessingStep.PLAN_CHECK)) {
      return this.cancelled(summary, thumbnail);
    }
    const plan = await this.planLimit.check(file.userId, summary.durationMs);
    if (plan.decision === VideoPlanDecision.TOO_LONG) {
      const detail = { summary, limitSeconds: plan.limitSeconds };
      return this.failure(
        VideoProcessingFailureReason.VIDEO_TOO_LONG_FOR_PLAN,
        detail,
        summary,
        thumbnail,
      );
    }
    if (plan.decision === VideoPlanDecision.DISABLED) {
      return this.failure(
        VideoProcessingFailureReason.VIDEO_DISABLED_FOR_PLAN,
        { summary },
        summary,
        thumbnail,
      );
    }
    if (await this.cancellation.checkpoint(watch, VideoProcessingStep.AUDIO_EXTRACT)) {
      return this.cancelled(summary, thumbnail);
    }
    const audio =
      plan.decision === VideoPlanDecision.ENTITLEMENTS_UNAVAILABLE
        ? this.skippedAudio(summary)
        : await this.transcribeTrack(file, workspace, summary, watch);
    return audio === null
      ? this.cancelled(summary, thumbnail)
      : { ok: true, summary, thumbnail, audio };
  }

  /**
   * The audio track through the existing metered transcription path. Never
   * throws. Null = cancelled (between steps, or mid-call with the hold
   * released) — the caller records the cancel, never a partial document.
   */
  private async transcribeTrack(
    file: File,
    workspace: MediaWorkspace,
    summary: VideoProbeSummary,
    watch: VideoCancelWatch,
  ): Promise<VideoAudioOutcome | null> {
    if (!summary.hasAudio) {
      return this.audioOutcome(VideoAudioStatus.NO_AUDIO_TRACK, null);
    }
    const { signal } = watch.controller;
    const track = await this.videoMedia.extractAudio(workspace, summary.durationMs, signal);
    if (await this.cancellation.checkpoint(watch, VideoProcessingStep.VOLUME_DETECT)) {
      return null;
    }
    if (track === null) {
      return this.audioOutcome(
        VideoAudioStatus.EXTRACTION_FAILED,
        VIDEO_AUDIO_EXTRACTION_FAILED_MESSAGE,
      );
    }
    // Silence gate BEFORE the paid step: a track whose peak is below the
    // silence threshold has no speech, so no hold is taken and no provider is
    // called. An unmeasurable track (null) fails open to transcription.
    const peakDb = await this.videoMedia.measurePeakVolume(workspace, signal);
    if (await this.cancellation.checkpoint(watch, VideoProcessingStep.TRANSCRIPTION)) {
      return null;
    }
    if (peakDb !== null && isSilentPeak(peakDb)) {
      this.logger.log(
        `transcribeTrack: fileId=${file.id} silent track (max_volume=${String(peakDb)} dB) — NO_SPEECH, transcription skipped`,
      );
      return this.audioOutcome(VideoAudioStatus.NO_SPEECH, null);
    }
    const result = await this.transcription.transcribeDerivedAudio({
      fileId: file.id,
      userId: file.userId,
      audioBase64: track.toString('base64'),
      mimeType: VIDEO_AUDIO_MIME_TYPE,
      sizeBytes: track.length,
      audioSeconds: Math.ceil(summary.durationMs / 1000),
      requestScope: VIDEO_TRANSCRIPTION_REQUEST_SCOPE,
      instruction: VIDEO_TRANSCRIPTION_INSTRUCTION,
      signal,
    });
    if (result.status === DerivedTranscriptionStatus.CANCELLED) {
      watch.holdReleased = result.holdReleased;
      return null;
    }
    if (result.status === DerivedTranscriptionStatus.FAILED) {
      return this.audioOutcome(VideoAudioStatus.TRANSCRIPTION_FAILED, result.reason);
    }
    const segments =
      result.segments.length > 0
        ? boundSegments(result.segments, summary.durationMs)
        : parseTimestampedTranscript(result.text, summary.durationMs);
    return {
      status: VideoAudioStatus.TRANSCRIBED,
      segments,
      reason: null,
      provider: result.provider,
      model: result.model,
    };
  }

  /** Entitlements unreachable: no paid step. A silent video still says so. */
  private skippedAudio(summary: VideoProbeSummary): VideoAudioOutcome {
    return summary.hasAudio
      ? this.audioOutcome(
          VideoAudioStatus.ENTITLEMENTS_UNAVAILABLE,
          VIDEO_ENTITLEMENTS_UNAVAILABLE_MESSAGE,
        )
      : this.audioOutcome(VideoAudioStatus.NO_AUDIO_TRACK, null);
  }

  private audioOutcome(status: VideoAudioStatus, reason: string | null): VideoAudioOutcome {
    return { status, segments: [], reason, provider: null, model: null };
  }

  private cancelled(summary: VideoProbeSummary | null, thumbnail: Buffer | null): VideoFailure {
    return this.failure(VideoProcessingFailureReason.PROCESSING_CANCELLED, {}, summary, thumbnail);
  }

  private failure(
    reason: VideoProcessingFailureReason,
    detail: VideoFailureDetail,
    summary: VideoProbeSummary | null,
    thumbnail: Buffer | null,
  ): VideoFailure {
    return { ok: false, reason, message: describeVideoFailure(reason, detail), summary, thumbnail };
  }

  private async saveSuccess(
    file: File,
    analysis: Extract<VideoAnalysis, { ok: true }>,
    startedAt: number,
  ): Promise<void> {
    const { summary, audio } = analysis;
    const media: VideoMediaMetadata = {
      ...this.baseMedia(file, summary, analysis.thumbnail),
      transcriptSegments: audio.segments,
      audioStatus: audio.status,
      audioReason: audio.reason,
      transcriptionProvider: audio.provider,
      transcriptionModel: audio.model,
      failureReason: null,
    };
    const written = await this.filesRepository.saveVideoExtractionResult(file.id, {
      extractedText: buildVideoDocument({ filename: file.filename, summary, audio }),
      extractionError: null,
      status: FileIngestionStatus.COMPLETED,
      metadata: { media },
    });
    if (!written) {
      // A cancel (or another job) recorded the row first: no overwrite, no event.
      this.logger.warn(`videoProcessed: fileId=${file.id} row already settled — result discarded`);
      return;
    }
    const processingMs = Date.now() - startedAt;
    const payload: FileVideoProcessCompletedPayload = {
      fileId: file.id,
      userId: file.userId,
      durationMs: summary.durationMs,
      hasAudio: summary.hasAudio,
      audioStatus: audio.status,
      transcriptSegmentCount: audio.segments.length,
      processingMs,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_VIDEO_PROCESS_COMPLETED, payload);
    this.logger.log(
      `videoProcessed: fileId=${file.id} durationMs=${String(summary.durationMs)} hasAudio=${String(summary.hasAudio)} audioStatus=${audio.status} segments=${String(audio.segments.length)} thumbnailBytes=${String(analysis.thumbnail?.length ?? 0)} processingMs=${String(processingMs)}`,
    );
  }

  private async saveFailure(file: File, analysis: VideoFailure): Promise<boolean> {
    const media: VideoMediaMetadata = {
      ...this.baseMedia(file, analysis.summary, analysis.thumbnail),
      failureReason: analysis.reason,
    };
    // FAILED for the PROCESSING, not the file: the upload stays stored and
    // downloadable; only the analysis (and any paid step) did not happen.
    const written = await this.filesRepository.saveVideoExtractionResult(file.id, {
      extractedText: null,
      extractionError: analysis.message,
      status: FileIngestionStatus.FAILED,
      metadata: { media },
    });
    if (!written) {
      this.logger.warn(`videoFailed: fileId=${file.id} row already settled — result discarded`);
      return false;
    }
    this.publishFailed(file.id, file.userId, analysis.reason, analysis.message);
    this.logger.warn(`videoFailed: fileId=${file.id} reason=${analysis.reason}`);
    return true;
  }

  /**
   * The job saw the cancel. Whatever it found is discarded; the row gets the
   * cancelled failure unless the route already wrote it — the conditional
   * write decides, so the failed event is published exactly once, by whoever
   * wrote. The probe facts are dropped on purpose (only the thumbnail is
   * kept): with no measured `durationMs`, chat-service's native-video gate can
   * never send a cancelled video's bytes to a model — the same row the route
   * writes.
   */
  private async saveCancelled(
    file: File,
    analysis: VideoAnalysis,
    watch: VideoCancelWatch,
  ): Promise<void> {
    await this.saveFailure(file, this.cancelled(null, analysis.thumbnail));
    this.cancellation.logCancel(
      file.id,
      watch.step,
      VideoCancelOutcome.CANCELLED,
      watch.holdReleased,
      watch.childKilled,
    );
  }

  private baseMedia(
    file: File,
    summary: VideoProbeSummary | null,
    thumbnail: Buffer | null,
  ): VideoMediaMetadata {
    const probe =
      summary === null
        ? {}
        : {
            durationMs: summary.durationMs,
            width: summary.width,
            height: summary.height,
            fps: summary.fps,
            videoCodec: summary.videoCodec,
            audioCodec: summary.audioCodec,
            hasAudio: summary.hasAudio,
            container: summary.container,
          };
    return {
      ...probe,
      sizeBytes: file.sizeBytes,
      thumbnailBase64: thumbnail === null ? null : thumbnail.toString('base64'),
      thumbnailMimeType: thumbnail === null ? null : VIDEO_FRAME_MIME_TYPE,
      processedAt: new Date().toISOString(),
    };
  }

  private publishFailed(
    fileId: string,
    userId: string,
    reasonCode: VideoProcessingFailureReason,
    reason: string,
  ): void {
    const payload: FileVideoProcessFailedPayload = {
      fileId,
      userId,
      reasonCode,
      reason,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_VIDEO_PROCESS_FAILED, payload);
  }
}
