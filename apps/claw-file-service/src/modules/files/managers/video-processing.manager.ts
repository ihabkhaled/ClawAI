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
import { DerivedTranscriptionStatus, VideoPlanDecision } from '../../../common/enums';
import { MediaSourceUnreadableError } from '../../../common/errors';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { FilesRepository } from '../repositories/files.repository';
import { videoProcessJobSchema } from '../dto/video-process-job.dto';
import {
  VIDEO_AUDIO_EXTRACTION_FAILED_MESSAGE,
  VIDEO_AUDIO_MIME_TYPE,
  VIDEO_ENTITLEMENTS_UNAVAILABLE_MESSAGE,
  VIDEO_FRAME_MIME_TYPE,
  VIDEO_PLACEHOLDER_PREFIX,
  VIDEO_PROCESSING_LOCK_KEY_PREFIX,
  VIDEO_PROCESSING_LOCK_TTL_SECONDS,
  VIDEO_TRANSCRIPTION_INSTRUCTION,
  VIDEO_TRANSCRIPTION_REQUEST_SCOPE,
} from '../constants/video-processing.constants';
import {
  type MediaWorkspace,
  type VideoAnalysis,
  type VideoAudioOutcome,
  type VideoFailureDetail,
  type VideoMediaMetadata,
  type VideoProbeSummary,
} from '../types/video-processing.types';
import { validateProbeSummary } from '../utilities/video-probe.utility';
import {
  boundSegments,
  buildVideoDocument,
  describeVideoFailure,
  parseTimestampedTranscript,
} from '../utilities/video-document.utility';
import { VideoMediaManager } from './video-media.manager';
import { VideoPlanLimitManager } from './video-plan-limit.manager';
import { TranscriptionManager } from './transcription.manager';

/**
 * Multimodal batch 7 — turns a stored video into a timestamped document.
 *
 * probe (ffprobe) → global limits → thumbnail → the uploader's plan limit →
 * audio track (ffmpeg) → transcription through the EXISTING metered path →
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
    return (
      file.mimeType.startsWith('video/') &&
      file.ingestionStatus === FileIngestionStatus.COMPLETED &&
      file.extractionError === null &&
      (file.extractedText ?? '').startsWith(VIDEO_PLACEHOLDER_PREFIX)
    );
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
    let analysis: VideoAnalysis;
    try {
      analysis = await this.videoMedia.withWorkspace(file, (workspace) =>
        this.analyse(file, workspace),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      const reason =
        error instanceof MediaSourceUnreadableError
          ? VideoProcessingFailureReason.SOURCE_UNREADABLE
          : VideoProcessingFailureReason.PROCESSING_ERROR;
      this.logger.error(`process: fileId=${file.id} reason=${reason} — ${message}`);
      analysis = this.failure(reason, { message }, null, null);
    }
    await (analysis.ok
      ? this.saveSuccess(file, analysis, startedAt)
      : this.saveFailure(file, analysis));
  }

  private async analyse(file: File, workspace: MediaWorkspace): Promise<VideoAnalysis> {
    const probe = await this.videoMedia.probe(workspace);
    if (!probe.ok) {
      return this.failure(probe.reason, { message: probe.detail }, null, null);
    }
    const { summary } = probe;
    const invalid = validateProbeSummary(summary);
    if (invalid !== null) {
      return this.failure(invalid, { summary }, summary, null);
    }
    const thumbnail = await this.videoMedia.extractThumbnail(workspace, summary.durationMs);
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
    const audio =
      plan.decision === VideoPlanDecision.ENTITLEMENTS_UNAVAILABLE
        ? this.skippedAudio(summary)
        : await this.transcribeTrack(file, workspace, summary);
    return { ok: true, summary, thumbnail, audio };
  }

  /** The audio track through the existing metered transcription path. Never throws. */
  private async transcribeTrack(
    file: File,
    workspace: MediaWorkspace,
    summary: VideoProbeSummary,
  ): Promise<VideoAudioOutcome> {
    if (!summary.hasAudio) {
      return this.audioOutcome(VideoAudioStatus.NO_AUDIO_TRACK, null);
    }
    const track = await this.videoMedia.extractAudio(workspace, summary.durationMs);
    if (track === null) {
      return this.audioOutcome(
        VideoAudioStatus.EXTRACTION_FAILED,
        VIDEO_AUDIO_EXTRACTION_FAILED_MESSAGE,
      );
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
    });
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

  private failure(
    reason: VideoProcessingFailureReason,
    detail: VideoFailureDetail,
    summary: VideoProbeSummary | null,
    thumbnail: Buffer | null,
  ): VideoAnalysis {
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
    await this.filesRepository.saveVideoExtractionResult(file.id, {
      extractedText: buildVideoDocument({ filename: file.filename, summary, audio }),
      extractionError: null,
      status: FileIngestionStatus.COMPLETED,
      metadata: { media },
    });
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

  private async saveFailure(
    file: File,
    analysis: Extract<VideoAnalysis, { ok: false }>,
  ): Promise<void> {
    const media: VideoMediaMetadata = {
      ...this.baseMedia(file, analysis.summary, analysis.thumbnail),
      failureReason: analysis.reason,
    };
    // FAILED for the PROCESSING, not the file: the upload stays stored and
    // downloadable; only the analysis (and any paid step) did not happen.
    await this.filesRepository.saveVideoExtractionResult(file.id, {
      extractedText: null,
      extractionError: analysis.message,
      status: FileIngestionStatus.FAILED,
      metadata: { media },
    });
    this.publishFailed(file.id, file.userId, analysis.reason, analysis.message);
    this.logger.warn(`videoFailed: fileId=${file.id} reason=${analysis.reason}`);
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
