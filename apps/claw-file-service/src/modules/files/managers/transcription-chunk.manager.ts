import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  TranscribeChunkErrorCode,
  TranscriptionAttemptStatus,
  TranscriptionMetricSource,
} from '../../../common/enums';
import { TranscribeChunkException } from '../../../common/errors';
import { FileMediaMetricsService } from '../../metrics/services/file-media-metrics.service';
import { TranscriptionCapabilityClient } from '../clients/transcription-capability.client';
import { TranscriptionRateClient } from '../clients/transcription-rate.client';
import {
  TRANSCRIBE_CHUNK_EMPTY_MESSAGE,
  TRANSCRIBE_CHUNK_FAILED_MESSAGE,
  TRANSCRIBE_CHUNK_LABEL_PREFIX,
  TRANSCRIBE_CHUNK_MAX_BYTES,
  TRANSCRIBE_CHUNK_MAX_SECONDS,
  TRANSCRIBE_CHUNK_PLATFORM_PAYER,
  TRANSCRIBE_CHUNK_TOO_LARGE_MESSAGE,
  TRANSCRIBE_CHUNK_TOO_LONG_MESSAGE,
  TRANSCRIBE_CHUNK_UNAVAILABLE_MESSAGE,
} from '../constants/transcribe-chunk.constants';
import { LOCAL_TRANSCRIPTION_PROVIDER } from '../constants/transcription.constants';
import { type TranscribeChunkDto } from '../dto/transcribe-chunk.dto';
import { type TranscribeChunkResult } from '../types/transcribe-chunk.types';
import {
  type TranscriptionCapability,
  type TranscriptionRunOutcome,
} from '../types/transcription.types';
import { probeAudioSeconds } from '../utilities/audio-duration.utility';
import { estimateChunkCostMicroUsd } from '../utilities/transcribe-chunk-cost.utility';
import { TranscriptionManager } from './transcription.manager';

/**
 * ADR-221 — one Live Intelligence audio chunk read as text at the PLATFORM's
 * cost (`POST /internal/files/transcribe-chunk`). See
 * `transcribe-chunk.constants.ts` for the design record.
 *
 * Reuses, and does not rewrite, `TranscriptionManager#runCandidates` (the
 * ranked Gemini → OpenAI → LOCAL walk, its retry and fall-through rules) with
 * `platformPaid: true`: no wallet hold, an empty answer is `noSpeech`. Nothing
 * is persisted and no event is published.
 */
@Injectable()
export class TranscriptionChunkManager {
  private readonly logger = new Logger(TranscriptionChunkManager.name);

  constructor(
    private readonly capabilityClient: TranscriptionCapabilityClient,
    private readonly transcription: TranscriptionManager,
    private readonly rates: TranscriptionRateClient,
    private readonly metrics: FileMediaMetricsService,
  ) {}

  async transcribe(dto: TranscribeChunkDto): Promise<TranscribeChunkResult> {
    const bytes = Buffer.from(dto.contentBase64, 'base64');
    if (bytes.length === 0) {
      throw this.refuse(
        TranscribeChunkErrorCode.EMPTY_AUDIO,
        TRANSCRIBE_CHUNK_EMPTY_MESSAGE,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (bytes.length > TRANSCRIBE_CHUNK_MAX_BYTES) {
      throw this.refuse(
        TranscribeChunkErrorCode.TOO_LARGE,
        TRANSCRIBE_CHUNK_TOO_LARGE_MESSAGE,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    const base64 = bytes.toString('base64');
    // Fails open: an unmeasurable chunk keeps the byte-derived estimate, and the
    // 2 MiB ceiling still bounds it.
    const seconds = await probeAudioSeconds(base64);
    if (seconds !== undefined && seconds > TRANSCRIBE_CHUNK_MAX_SECONDS) {
      throw this.refuse(
        TranscribeChunkErrorCode.TOO_LONG,
        TRANSCRIBE_CHUNK_TOO_LONG_MESSAGE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const startedAt = Date.now();
    const candidates = await this.candidates();
    const outcome = await this.transcription.runCandidates(
      {
        fileId: `${TRANSCRIBE_CHUNK_LABEL_PREFIX}:${dto.requestId}`,
        userId: TRANSCRIBE_CHUNK_PLATFORM_PAYER,
        base64,
        mimeType: dto.mimeType,
        sizeBytes: bytes.length,
        platformPaid: true,
        ...(seconds === undefined ? {} : { audioSeconds: seconds }),
      },
      candidates,
    );
    if (outcome === null) {
      throw this.unavailable();
    }
    this.metrics.recordTranscriptionJob(
      TranscriptionMetricSource.LIVE_CHUNK,
      outcome.status,
      Date.now() - startedAt,
    );
    return this.toResult(dto, outcome, bytes.length, seconds);
  }

  private async toResult(
    dto: TranscribeChunkDto,
    outcome: TranscriptionRunOutcome,
    sizeBytes: number,
    seconds: number | undefined,
  ): Promise<TranscribeChunkResult> {
    if (outcome.status !== TranscriptionAttemptStatus.COMPLETED) {
      // FAILED (every candidate failed, or a terminal error). REFUSED and
      // CANCELLED cannot happen: no hold is taken and no signal is passed.
      this.logger.warn(
        `toResult: requestId=${dto.requestId} status=${outcome.status} provider=${outcome.capability.provider}`,
      );
      throw this.refuse(
        TranscribeChunkErrorCode.FAILED,
        TRANSCRIBE_CHUNK_FAILED_MESSAGE,
        HttpStatus.BAD_GATEWAY,
      );
    }
    const { provider } = outcome.capability;
    const rates =
      provider === LOCAL_TRANSCRIPTION_PROVIDER
        ? null
        : await this.rates.findRates(provider, outcome.model);
    const costKnown = provider === LOCAL_TRANSCRIPTION_PROVIDER || rates !== null;
    const costMicroUsd = estimateChunkCostMicroUsd(
      {
        provider,
        sizeBytes,
        result: outcome.result,
        ...(seconds === undefined ? {} : { measuredSeconds: seconds }),
      },
      rates,
    );
    const noSpeech = outcome.transcript.length === 0;
    this.logger.log(
      `toResult: requestId=${dto.requestId} provider=${provider} model=${outcome.model} chars=${String(outcome.transcript.length)} noSpeech=${String(noSpeech)} costKnown=${String(costKnown)}`,
    );
    return {
      text: outcome.transcript,
      language: outcome.result.language ?? null,
      provider,
      model: outcome.model.length > 0 ? outcome.model : null,
      durationSeconds: seconds ?? Math.ceil(outcome.result.durationSeconds ?? 0),
      costMicroUsd,
      costKnown,
      noSpeech,
    };
  }

  private async candidates(): Promise<TranscriptionCapability[]> {
    try {
      const candidates = await this.capabilityClient.findCapableModels();
      if (candidates.length === 0) {
        throw this.unavailable();
      }
      return candidates;
    } catch (error: unknown) {
      if (error instanceof TranscribeChunkException) {
        throw error;
      }
      this.logger.error(
        `candidates: capability lookup failed — ${error instanceof Error ? error.message : String(error)}`,
      );
      throw this.unavailable();
    }
  }

  private unavailable(): TranscribeChunkException {
    return this.refuse(
      TranscribeChunkErrorCode.UNAVAILABLE,
      TRANSCRIBE_CHUNK_UNAVAILABLE_MESSAGE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private refuse(
    code: TranscribeChunkErrorCode,
    message: string,
    status: HttpStatus,
  ): TranscribeChunkException {
    return new TranscribeChunkException(code, message, status);
  }
}
