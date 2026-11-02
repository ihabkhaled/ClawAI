import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaygSurface, VideoProcessingFailureReason } from '@claw/shared-types';
import {
  TranscribeReadErrorCode,
  TranscriptionAttemptStatus,
  TranscriptionCreditRefusalCode,
  TranscriptionMetricSource,
  VideoPlanDecision,
} from '../../../common/enums';
import { TranscribeReadException } from '../../../common/errors';
import { FileMediaMetricsService } from '../../metrics/services/file-media-metrics.service';
import { TranscriptionCapabilityClient } from '../clients/transcription-capability.client';
import { MAX_TRANSCRIBABLE_AUDIO_BYTES } from '../constants/transcription.constants';
import {
  TRANSCRIBE_READ_AUDIO_TOO_LARGE_MESSAGE,
  TRANSCRIBE_READ_EMPTY_MESSAGE,
  TRANSCRIBE_READ_ENTITLEMENTS_UNAVAILABLE_MESSAGE,
  TRANSCRIBE_READ_EXTRACTION_FAILED_MESSAGE,
  TRANSCRIBE_READ_MAX_VIDEO_SECONDS,
  TRANSCRIBE_READ_NO_AUDIO_TRACK_MESSAGE,
  TRANSCRIBE_READ_NO_SPEECH_MESSAGE,
  TRANSCRIBE_READ_TOOL_UNAVAILABLE_MESSAGE,
  TRANSCRIBE_READ_UNAVAILABLE_MESSAGE,
  TRANSCRIBE_READ_UNREADABLE_MESSAGE,
  TRANSCRIBE_READ_UNSUPPORTED_MESSAGE,
  TRANSCRIBE_READ_VIDEO_DISABLED_MESSAGE,
  transcribeReadTooLongMessage,
} from '../constants/transcribe-read.constants';
import { VIDEO_AUDIO_MIME_TYPE, VIDEO_MAX_PIXELS } from '../constants/video-processing.constants';
import { type TranscribeTextDto } from '../dto/transcribe-text.dto';
import { type ReadAudio, type TranscribeReadResult } from '../types/transcribe-read.types';
import {
  type TranscriptionCapability,
  type TranscriptionRunOutcome,
} from '../types/transcription.types';
import { type MediaWorkspace, type VideoProbeSummary } from '../types/video-processing.types';
import { probeAudioSeconds } from '../utilities/audio-duration.utility';
import { boundReadText, classifyReadMedia } from '../utilities/transcribe-read-media.utility';
import { isSilentPeak } from '../utilities/volume-detect.utility';
import { TranscriptionManager } from './transcription.manager';
import { VideoMediaManager } from './video-media.manager';
import { VideoPlanLimitManager } from './video-plan-limit.manager';

/**
 * The stateless, BILLED read of audio or video as text
 * (`POST /files/transcribe-text`). See `transcribe-read.constants.ts` for the
 * design record (providers, billing, rule 46).
 *
 * Reuses, and does not rewrite: `TranscriptionManager#runCandidates` (the
 * ranked, bounded provider walk and the reserve -> call -> finalize/release
 * metering, booked to `PaygSurface.TRANSCRIPTION_READ`), `VideoMediaManager`
 * (ffprobe / ffmpeg through the one allowed entry) and `VideoPlanLimitManager`.
 * Nothing is persisted and no event is published.
 */
@Injectable()
export class TranscriptionReadManager {
  private readonly logger = new Logger(TranscriptionReadManager.name);

  constructor(
    private readonly capabilityClient: TranscriptionCapabilityClient,
    private readonly transcription: TranscriptionManager,
    private readonly media: VideoMediaManager,
    private readonly planLimit: VideoPlanLimitManager,
    private readonly metrics: FileMediaMetricsService,
  ) {}

  async read(userId: string, dto: TranscribeTextDto): Promise<TranscribeReadResult> {
    const classification = classifyReadMedia(dto.fileName, dto.mimeType);
    if (classification === null) {
      throw this.refuse(
        TranscribeReadErrorCode.UNSUPPORTED_MEDIA_TYPE,
        TRANSCRIBE_READ_UNSUPPORTED_MESSAGE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const bytes = Buffer.from(dto.contentBase64, 'base64');
    if (bytes.length === 0) {
      throw this.refuse(
        TranscribeReadErrorCode.EMPTY_MEDIA,
        TRANSCRIBE_READ_EMPTY_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }
    return classification.kind === 'audio'
      ? this.readAudio(userId, bytes, classification.mimeType)
      : this.readVideo(userId, bytes);
  }

  private async readAudio(
    userId: string,
    bytes: Buffer,
    mimeType: string,
  ): Promise<TranscribeReadResult> {
    if (bytes.length > MAX_TRANSCRIBABLE_AUDIO_BYTES) {
      throw this.refuse(
        TranscribeReadErrorCode.AUDIO_TOO_LARGE,
        TRANSCRIBE_READ_AUDIO_TOO_LARGE_MESSAGE,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    const base64 = bytes.toString('base64');
    // Fails open to the byte-derived estimate, exactly like the upload path:
    // the hold is never sized to zero.
    const seconds = await probeAudioSeconds(base64);
    return this.transcribe(userId, { base64, mimeType, sizeBytes: bytes.length, seconds });
  }

  /** The audio TRACK only: no frames are extracted, so there is no vision cost. */
  private async readVideo(userId: string, bytes: Buffer): Promise<TranscribeReadResult> {
    const track = await this.media.withBufferWorkspace(bytes, async (workspace) =>
      this.extractTrack(userId, workspace),
    );
    return this.transcribe(userId, track);
  }

  private async extractTrack(userId: string, workspace: MediaWorkspace): Promise<ReadAudio> {
    const probe = await this.media.probe(workspace);
    if (!probe.ok) {
      throw probe.reason === VideoProcessingFailureReason.TOOL_UNAVAILABLE
        ? this.refuse(
            TranscribeReadErrorCode.TOOL_UNAVAILABLE,
            TRANSCRIBE_READ_TOOL_UNAVAILABLE_MESSAGE,
            HttpStatus.SERVICE_UNAVAILABLE,
          )
        : this.unreadable();
    }
    const { summary } = probe;
    if (
      summary.durationMs <= 0 ||
      (summary.hasVideo && summary.width * summary.height > VIDEO_MAX_PIXELS)
    ) {
      throw this.unreadable();
    }
    await this.assertWithinDuration(userId, summary);
    if (!summary.hasAudio) {
      throw this.refuse(
        TranscribeReadErrorCode.NO_AUDIO_TRACK,
        TRANSCRIBE_READ_NO_AUDIO_TRACK_MESSAGE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const track = await this.media.extractAudio(workspace, summary.durationMs);
    if (track === null) {
      throw this.refuse(
        TranscribeReadErrorCode.AUDIO_EXTRACTION_FAILED,
        TRANSCRIBE_READ_EXTRACTION_FAILED_MESSAGE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    // Silence gate BEFORE the paid step: no hold, no provider call. An
    // unmeasurable track (null) fails open to transcription.
    const peakDb = await this.media.measurePeakVolume(workspace);
    if (peakDb !== null && isSilentPeak(peakDb)) {
      throw this.refuse(
        TranscribeReadErrorCode.NO_SPEECH,
        TRANSCRIBE_READ_NO_SPEECH_MESSAGE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return {
      base64: track.toString('base64'),
      mimeType: VIDEO_AUDIO_MIME_TYPE,
      sizeBytes: track.length,
      seconds: Math.ceil(summary.durationMs / 1000),
    };
  }

  /**
   * Cap = min(plan `maxVideoSeconds`, 1800 s). `null` plan limit = unlimited
   * (the 1800 s global cap still applies), `0` = video disabled, an unreadable
   * plan fails CLOSED (the paid step must not run on a guess).
   */
  private async assertWithinDuration(userId: string, summary: VideoProbeSummary): Promise<void> {
    const globalCapMs = TRANSCRIBE_READ_MAX_VIDEO_SECONDS * 1000;
    const plan = await this.planLimit.check(userId, summary.durationMs);
    if (plan.decision === VideoPlanDecision.ENTITLEMENTS_UNAVAILABLE) {
      throw this.refuse(
        TranscribeReadErrorCode.ENTITLEMENTS_UNAVAILABLE,
        TRANSCRIBE_READ_ENTITLEMENTS_UNAVAILABLE_MESSAGE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (plan.decision === VideoPlanDecision.DISABLED) {
      throw this.refuse(
        TranscribeReadErrorCode.VIDEO_DISABLED_FOR_PLAN,
        TRANSCRIBE_READ_VIDEO_DISABLED_MESSAGE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const planSeconds = plan.limitSeconds ?? TRANSCRIBE_READ_MAX_VIDEO_SECONDS;
    const effectiveSeconds = Math.min(planSeconds, TRANSCRIBE_READ_MAX_VIDEO_SECONDS);
    if (plan.decision === VideoPlanDecision.TOO_LONG || summary.durationMs > globalCapMs) {
      throw this.refuse(
        TranscribeReadErrorCode.MEDIA_TOO_LONG,
        transcribeReadTooLongMessage(effectiveSeconds),
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  /** The metered provider walk. Every refusal is a typed exception; nothing is stored. */
  private async transcribe(userId: string, audio: ReadAudio): Promise<TranscribeReadResult> {
    const startedAt = Date.now();
    const candidates = await this.candidates();
    const outcome = await this.transcription.runCandidates(
      {
        // userId + uuid: the PAYG request id is `transcription-read:${fileId}:${provider}`.
        fileId: `${userId}:${randomUUID()}`,
        userId,
        base64: audio.base64,
        mimeType: audio.mimeType,
        sizeBytes: audio.sizeBytes,
        surface: PaygSurface.TRANSCRIPTION_READ,
        ...(audio.seconds === undefined ? {} : { audioSeconds: audio.seconds }),
      },
      candidates,
    );
    if (outcome === null) {
      throw this.unavailable();
    }
    this.metrics.recordTranscriptionJob(
      TranscriptionMetricSource.READ,
      outcome.status,
      Date.now() - startedAt,
    );
    return this.toResult(outcome, audio);
  }

  private toResult(outcome: TranscriptionRunOutcome, audio: ReadAudio): TranscribeReadResult {
    if (outcome.status === TranscriptionAttemptStatus.REFUSED) {
      throw outcome.reasonCode === TranscriptionCreditRefusalCode.CREDIT_CHECK_UNAVAILABLE
        ? this.refuse(
            TranscribeReadErrorCode.CREDIT_CHECK_UNAVAILABLE,
            outcome.reason,
            HttpStatus.SERVICE_UNAVAILABLE,
          )
        : this.refuse(
            TranscribeReadErrorCode.INSUFFICIENT_CREDIT,
            outcome.reason,
            HttpStatus.PAYMENT_REQUIRED,
          );
    }
    if (outcome.status !== TranscriptionAttemptStatus.COMPLETED) {
      // FAILED (every provider failed or answered empty) or CANCELLED (no
      // signal is passed, so it cannot happen): the holds were already released.
      const reason = outcome.status === TranscriptionAttemptStatus.FAILED ? outcome.reason : '';
      this.logger.warn(
        `toResult: status=${outcome.status} provider=${outcome.capability.provider}`,
      );
      throw this.refuse(
        TranscribeReadErrorCode.FAILED,
        reason.length > 0 ? reason : TRANSCRIBE_READ_UNAVAILABLE_MESSAGE,
        HttpStatus.BAD_GATEWAY,
      );
    }
    const bounded = boundReadText(outcome.transcript);
    return {
      text: bounded.text,
      durationSeconds: audio.seconds ?? Math.ceil(outcome.result.durationSeconds ?? 0),
      provider: outcome.capability.provider,
      model: outcome.model,
      truncated: bounded.truncated,
    };
  }

  private async candidates(): Promise<TranscriptionCapability[]> {
    try {
      return await this.capabilityClient.findCapableModels();
    } catch (error: unknown) {
      this.logger.error(
        `candidates: capability lookup failed — ${error instanceof Error ? error.message : String(error)}`,
      );
      throw this.unavailable();
    }
  }

  private unavailable(): TranscribeReadException {
    return this.refuse(
      TranscribeReadErrorCode.UNAVAILABLE,
      TRANSCRIBE_READ_UNAVAILABLE_MESSAGE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private unreadable(): TranscribeReadException {
    return this.refuse(
      TranscribeReadErrorCode.MEDIA_UNREADABLE,
      TRANSCRIBE_READ_UNREADABLE_MESSAGE,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  private refuse(
    code: TranscribeReadErrorCode,
    message: string,
    status: HttpStatus,
  ): TranscribeReadException {
    return new TranscribeReadException(code, message, status);
  }
}
