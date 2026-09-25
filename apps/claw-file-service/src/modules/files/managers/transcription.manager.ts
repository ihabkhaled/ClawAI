import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type FileTranscribeCompletedPayload,
  type FileTranscribeFailedPayload,
  type FileTranscribeFailureReasonCode,
  type FileTranscribeRequestedPayload,
} from '@claw/shared-types';
import { type File, FileIngestionStatus } from '../../../generated/prisma';
import { readFile } from '../../../common/utilities';
import { FilesRepository } from '../repositories/files.repository';
import { TranscriptionCapabilityClient } from '../clients/transcription-capability.client';
import { TranscriptionMeterManager } from './transcription-meter.manager';
import {
  DerivedTranscriptionStatus,
  TranscriptionAttemptStatus,
  TranscriptionReserveStatus,
} from '../../../common/enums';
import { transcribeWithGemini } from '../adapters/gemini-transcription.adapter';
import { transcribeWithOpenAi } from '../adapters/openai-transcription.adapter';
import {
  AUDIO_PLACEHOLDER_PREFIX,
  GEMINI_TRANSCRIPTION_DEFAULT_BASE_URL,
  MAX_TRANSCRIBABLE_AUDIO_BYTES,
  OPENAI_TRANSCRIPTION_DEFAULT_BASE_URL,
  OPENAI_TRANSCRIPTION_MODEL,
  TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE,
  TRANSCRIPTION_TOO_LARGE_MESSAGE,
} from '../constants/transcription.constants';
import {
  type TranscriptionAttemptOutcome,
  type TranscriptionCapability,
  type TranscriptionProviderResult,
  type TranscriptionRequestContext,
  type TranscriptionRunOutcome,
} from '../types/transcription.types';
import {
  type DerivedAudioTranscriptionInput,
  type DerivedAudioTranscriptionOutcome,
} from '../types/video-processing.types';
import { transcribeJobSchema } from '../dto/transcribe-job.dto';
import { isAudioModalityRejection } from '../utilities/transcription-error.utility';

/**
 * B6b — turns an uploaded audio file into a transcript, out of band.
 *
 * Shape copied from `FileProcessingManager#runOcrFallback`: extra async work
 * that lives INSIDE file-service, updates the row through
 * `FilesRepository.saveExtractionResult` and narrates itself on the bus. The
 * write stays in-process deliberately — there is no HTTP route that sets
 * `extractedText`, and adding one would hand every other service a way to
 * rewrite what a model is shown for a file.
 *
 * The row is never destroyed on failure. An audio upload has already reached
 * COMPLETED with a readable placeholder by the time the job runs; a failed
 * transcription records WHY in `extractionError` and leaves that placeholder
 * alone, because turning a usable attachment into a FAILED row would be a
 * worse outcome than the missing transcript.
 */
@Injectable()
export class TranscriptionManager implements OnModuleInit {
  private readonly logger = new Logger(TranscriptionManager.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly rabbitMQService: RabbitMQService,
    private readonly capabilityClient: TranscriptionCapabilityClient,
    private readonly meter: TranscriptionMeterManager,
  ) {}

  /**
   * Subscribing at module init is load-bearing, not tidiness. The topic
   * exchange DROPS a routing key with no bound queue and the queue is asserted
   * by the consumer; producer and consumer are both file-service, so the
   * consumer must exist before `FileProcessingManager` can publish the first
   * request (see the note at EventPattern.FILE_TRANSCRIBE_REQUESTED).
   */
  async onModuleInit(): Promise<void> {
    await this.rabbitMQService.subscribe(
      EventPattern.FILE_TRANSCRIBE_REQUESTED,
      async (data: unknown) => {
        await this.handleJob(data);
      },
    );
    this.logger.log('onModuleInit: subscribed to file.transcribe_requested');
  }

  /**
   * Never throws. A throw here is retried three times and then dead-lettered,
   * which for a provider outage means the same provider called four times and
   * four FAILED events on one file. The failure is recorded on the row instead,
   * where the user can actually see it.
   */
  async handleJob(data: unknown): Promise<void> {
    const parsed = transcribeJobSchema.safeParse(data);
    if (!parsed.success) {
      this.logger.error('handleJob: malformed file.transcribe_requested payload — dropping');
      return;
    }
    const { fileId, userId } = parsed.data;

    const file = await this.filesRepository.findById(fileId);
    if (file === null) {
      this.logger.warn(`handleJob: fileId=${fileId} no longer exists`);
      this.publishFailed(fileId, userId, 'FILE_NOT_FOUND', 'The file row no longer exists.');
      return;
    }

    // Precedes metering on purpose: a redelivered job for a file that already
    // carries a transcript must not take a PAYG hold at all.
    if (this.hasTranscript(file)) {
      this.logger.log(
        `handleJob: fileId=${fileId} already transcribed (${String(file.extractedText?.length ?? 0)} chars) — skipping`,
      );
      return;
    }

    const candidates = await this.capabilityClient.findCapableModels();
    if (candidates.length === 0) {
      this.logger.warn(`handleJob: fileId=${fileId} — no audio-capable connector configured`);
      await this.recordFailure(file, TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE);
      this.publishFailed(
        fileId,
        userId,
        'NO_CAPABLE_CONNECTOR',
        TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE,
      );
      return;
    }

    await this.runTranscription(file, userId, candidates);
  }

  /**
   * The audio-upload path: size guard, read, run the candidate loop, then the
   * ONE write for this row (transcript, or the reason there is none).
   */
  private async runTranscription(
    file: File,
    userId: string,
    candidates: TranscriptionCapability[],
  ): Promise<void> {
    const startedAt = Date.now();

    // Refused BEFORE any provider is contacted, because the cost is the
    // call, not the storage, and this guard is independent of which
    // candidate ends up handling the request.
    if (!this.isTranscribableSize(file)) {
      this.logger.warn(
        `runTranscription: refusing ${file.id} — ${String(file.sizeBytes)} bytes exceeds ` +
          `${String(MAX_TRANSCRIBABLE_AUDIO_BYTES)}`,
      );
      await this.recordFailure(file, TRANSCRIPTION_TOO_LARGE_MESSAGE);
      this.publishFailed(file.id, userId, 'AUDIO_TOO_LARGE', TRANSCRIPTION_TOO_LARGE_MESSAGE);
      return;
    }

    let base64: string;
    try {
      base64 = this.readAudioBase64(file);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Unknown transcription error';
      this.logger.error(`runTranscription: fileId=${file.id} unreadable — ${reason}`);
      await this.recordFailure(file, `Audio transcription failed: ${reason}`);
      this.publishFailed(
        file.id,
        userId,
        this.classify(reason),
        `Audio transcription failed: ${reason}`,
      );
      return;
    }

    const context: TranscriptionRequestContext = {
      fileId: file.id,
      userId,
      base64,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    };
    const outcome = await this.runCandidates(context, candidates);
    if (outcome !== null) {
      await this.applyUploadOutcome(file, userId, outcome, startedAt);
    }
  }

  /** The single write + event for an audio upload, whichever way the loop ended. */
  private async applyUploadOutcome(
    file: File,
    userId: string,
    outcome: TranscriptionRunOutcome,
    startedAt: number,
  ): Promise<void> {
    const provider = outcome.capability.provider;
    if (outcome.status === TranscriptionAttemptStatus.COMPLETED) {
      await this.filesRepository.saveExtractionResult(file.id, {
        extractedText: outcome.transcript,
        extractionError: null,
        status: FileIngestionStatus.COMPLETED,
      });
      const durationMs = Date.now() - startedAt;
      const payload: FileTranscribeCompletedPayload = {
        fileId: file.id,
        userId,
        provider,
        model: outcome.model,
        characters: outcome.transcript.length,
        durationMs,
        timestamp: new Date().toISOString(),
      };
      void this.rabbitMQService.publish(EventPattern.FILE_TRANSCRIBE_COMPLETED, payload);
      this.logger.log(
        `runTranscription: fileId=${file.id} provider=${provider} model=${outcome.model} chars=${String(outcome.transcript.length)} durationMs=${String(durationMs)}`,
      );
      return;
    }
    if (outcome.status === TranscriptionAttemptStatus.REFUSED) {
      await this.recordFailure(file, outcome.reason);
      this.publishFailed(
        file.id,
        userId,
        outcome.reasonCode,
        outcome.reason,
        provider,
        outcome.model,
      );
      return;
    }
    const reason = `Audio transcription failed: ${outcome.reason}`;
    await this.recordFailure(file, reason);
    this.publishFailed(
      file.id,
      userId,
      this.classify(outcome.reason),
      reason,
      provider,
      outcome.model,
    );
  }

  /**
   * Transcribes audio DERIVED from another upload — a video's audio track
   * (multimodal batch 7). Same candidate loop, same PAYG meter, charged to the
   * same uploader, but it never writes the row: `VideoProcessingManager` owns
   * the video row's single write. The request id carries the scope
   * (`transcription:${fileId}:video-audio:${provider}`), so a redelivered job
   * re-uses its hold and never collides with an audio upload's. Never throws.
   */
  async transcribeDerivedAudio(
    input: DerivedAudioTranscriptionInput,
  ): Promise<DerivedAudioTranscriptionOutcome> {
    if (input.sizeBytes > MAX_TRANSCRIBABLE_AUDIO_BYTES) {
      this.logger.warn(`transcribeDerivedAudio: fileId=${input.fileId} derived track too large`);
      return { status: DerivedTranscriptionStatus.FAILED, reason: TRANSCRIPTION_TOO_LARGE_MESSAGE };
    }
    let candidates: TranscriptionCapability[];
    try {
      candidates = await this.capabilityClient.findCapableModels();
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'capability lookup failed';
      return { status: DerivedTranscriptionStatus.FAILED, reason };
    }
    const outcome = await this.runCandidates(
      {
        fileId: input.fileId,
        userId: input.userId,
        base64: input.audioBase64,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        audioSeconds: input.audioSeconds,
        requestScope: input.requestScope,
        instruction: input.instruction,
      },
      candidates,
    );
    if (outcome === null) {
      return {
        status: DerivedTranscriptionStatus.FAILED,
        reason: TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE,
      };
    }
    if (outcome.status !== TranscriptionAttemptStatus.COMPLETED) {
      this.logger.warn(
        `transcribeDerivedAudio: fileId=${input.fileId} provider=${outcome.capability.provider} status=${outcome.status}`,
      );
      return { status: DerivedTranscriptionStatus.FAILED, reason: outcome.reason };
    }
    this.logger.log(
      `transcribeDerivedAudio: fileId=${input.fileId} provider=${outcome.capability.provider} model=${outcome.model} chars=${String(outcome.transcript.length)}`,
    );
    return {
      status: DerivedTranscriptionStatus.TRANSCRIBED,
      text: outcome.transcript,
      segments: outcome.result.segments ?? [],
      provider: outcome.capability.provider,
      model: outcome.model,
    };
  }

  /**
   * Walks `candidates` in priority order, stopping at the first success.
   * Returns null only for an empty list. Never writes the row.
   *
   * A candidate the connector catalog marked audio-capable can still be one
   * the provider itself refuses for that exact model — a stale or
   * over-broad `supportsAudio` sync, not a real outage. That refusal
   * (`isAudioModalityRejection`) is the ONLY reason this falls through to
   * the next candidate; every other failure (rate limit, auth, a bad
   * recording, an empty transcript) stops here and is returned as a real
   * failure — falling through on those would mean paying a second provider
   * for a request that was never going to succeed.
   *
   * A PAYG credit refusal is not a throw at all: `attemptCandidate` returns
   * `REFUSED` and this loop stops there. Trying the next provider after "you
   * have no credit" would only be refused again — or, worse, charged.
   */
  private async runCandidates(
    context: TranscriptionRequestContext,
    candidates: TranscriptionCapability[],
  ): Promise<TranscriptionRunOutcome | null> {
    const firstCandidate = candidates.at(0);
    if (firstCandidate === undefined) {
      this.logger.error(`runCandidates: fileId=${context.fileId} called with no candidates`);
      return null;
    }

    let lastReason = 'Unknown transcription error';
    let lastCapability = firstCandidate;
    for (const [index, capability] of candidates.entries()) {
      lastCapability = capability;
      const model = this.effectiveModel(capability);
      try {
        const outcome = await this.attemptCandidate(context, capability);
        return { ...outcome, capability, model };
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : 'Unknown transcription error';
        lastReason = reason;
        const hasNextCandidate = index < candidates.length - 1;
        if (isAudioModalityRejection(error) && hasNextCandidate) {
          this.logger.warn(
            `runCandidates: fileId=${context.fileId} provider=${capability.provider} model=${model} refused the audio modality — falling through to the next candidate (${reason})`,
          );
          continue;
        }
        this.logger.error(
          `runCandidates: fileId=${context.fileId} provider=${capability.provider} model=${model} failed — ${reason}`,
        );
        break;
      }
    }
    return {
      status: TranscriptionAttemptStatus.FAILED,
      reason: lastReason,
      capability: lastCapability,
      model: this.effectiveModel(lastCapability),
    };
  }

  /**
   * One candidate, start to finish, inside a PAYG hold. THROWS on any
   * provider failure — an empty transcript included — after releasing the
   * hold, so `runCandidates` is the only place that decides whether a
   * failure is recoverable (fall through) or terminal. Returns `REFUSED` (no
   * provider call made) when the credit check says no, and `COMPLETED` with
   * the transcript once the hold is settled on measured units.
   */
  private async attemptCandidate(
    context: TranscriptionRequestContext,
    capability: TranscriptionCapability,
  ): Promise<TranscriptionAttemptOutcome> {
    const model = this.effectiveModel(capability);
    const config = await this.capabilityClient.fetchConnectorConfig(capability.provider);
    const baseUrl = config.baseUrl ?? this.defaultBaseUrl(capability.provider);

    // Charged to the UPLOADER — the job's userId — per attempt. The requestId
    // is per provider, so a modality fall-through is a second, separate hold.
    const reservation = await this.meter.reserve({
      userId: context.userId,
      fileId: context.fileId,
      provider: capability.provider,
      model,
      sizeBytes: context.sizeBytes,
      ...(context.audioSeconds === undefined ? {} : { audioSeconds: context.audioSeconds }),
      ...(context.requestScope === undefined ? {} : { requestScope: context.requestScope }),
    });
    if (reservation.status === TranscriptionReserveStatus.REFUSED) {
      // No provider call: a refused hold means nothing was spent.
      return {
        status: TranscriptionAttemptStatus.REFUSED,
        reasonCode: reservation.reasonCode,
        reason: reservation.reason,
      };
    }
    const { meterHold } = reservation;

    let result: TranscriptionProviderResult;
    let transcript: string;
    try {
      result = await this.callProvider(
        capability.provider,
        baseUrl,
        config.apiKey,
        context,
        model,
        meterHold.hold.maxOutputTokens,
      );
      // Trimmed HERE as well as in each adapter. Whitespace is what a provider
      // returns when it heard nothing, and a row holding three spaces would
      // pass every "has a transcript" check while telling the user nothing.
      transcript = result.text.trim();
      if (transcript.length === 0) {
        throw new Error('The provider returned an empty transcript.');
      }
    } catch (error: unknown) {
      // The user got no transcript, so the hold goes back rather than being
      // settled — a provider error, a timeout and an empty answer alike.
      await this.meter.release(meterHold, error);
      throw error;
    }

    await this.meter.finalize(meterHold, result);
    return { status: TranscriptionAttemptStatus.COMPLETED, transcript, result };
  }

  private async callProvider(
    provider: string,
    baseUrl: string,
    apiKey: string,
    context: TranscriptionRequestContext,
    model: string,
    maxOutputTokens: number,
  ): Promise<TranscriptionProviderResult> {
    const { base64, mimeType, instruction } = context;
    if (provider === 'GEMINI') {
      // The GRANTED ceiling from the hold, never the requested one (rule 37 item 2).
      // The instruction is passed only when the caller has its own (a video's
      // timestamped lines); an audio upload keeps the adapter's default.
      return instruction === undefined
        ? transcribeWithGemini(baseUrl, apiKey, base64, mimeType, model, maxOutputTokens)
        : transcribeWithGemini(
            baseUrl,
            apiKey,
            base64,
            mimeType,
            model,
            maxOutputTokens,
            instruction,
          );
    }
    if (provider === 'OPENAI') {
      // verbose_json already carries timestamped segments; no instruction needed.
      return transcribeWithOpenAi(baseUrl, apiKey, base64, mimeType, model);
    }
    // Unreachable while the capability client filters on
    // TRANSCRIPTION_PROVIDER_PRIORITY; kept so adding a provider there without
    // an adapter fails loudly instead of returning an empty transcript.
    throw new Error(`No transcription adapter for provider ${provider}`);
  }

  /**
   * The bytes actually uploaded. `files.content` is base64 of the original
   * upload — NOT extracted text — so it is used as-is; the on-disk copy is the
   * fallback for a row stored before the column existed.
   */
  /**
   * Whether this file is small enough to be worth sending to a provider.
   *
   * Byte count, not duration — measuring duration means decoding every
   * container format we accept, which is a real dependency for a guard whose
   * job is to refuse obvious abuse. Bytes are the honest approximation until
   * that is worth doing, and they are the number we already have.
   */
  private isTranscribableSize(file: File): boolean {
    return file.sizeBytes <= MAX_TRANSCRIBABLE_AUDIO_BYTES;
  }

  private readAudioBase64(file: File): string {
    if (typeof file.content === 'string' && file.content.length > 0) {
      return file.content;
    }
    try {
      return readFile(file.storagePath).toString('base64');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unreadable';
      throw new Error(`The stored audio could not be read (${message}).`);
    }
  }

  /**
   * OpenAI's snapshot rows are chat deployments, so the routed modelKey names
   * something that cannot transcribe. The lookup proves OpenAI is configured;
   * the transcription endpoint's own model is named by constant.
   */
  private effectiveModel(capability: TranscriptionCapability): string {
    return capability.provider === 'OPENAI' ? OPENAI_TRANSCRIPTION_MODEL : capability.model;
  }

  private defaultBaseUrl(provider: string): string {
    return provider === 'OPENAI'
      ? OPENAI_TRANSCRIPTION_DEFAULT_BASE_URL
      : GEMINI_TRANSCRIPTION_DEFAULT_BASE_URL;
  }

  /**
   * A row counts as transcribed only when it carries text that is not the
   * `[Audio file: …]` placeholder. Comparing against the prefix rather than
   * against emptiness is what stops the job re-running forever on a file whose
   * only content is that placeholder — and stops it overwriting a real
   * transcript if the request is redelivered.
   */
  private hasTranscript(file: File): boolean {
    const text = file.extractedText;
    if (typeof text !== 'string') {
      return false;
    }
    const trimmed = text.trim();
    return trimmed.length > 0 && !trimmed.startsWith(AUDIO_PLACEHOLDER_PREFIX);
  }

  /** Records the reason WITHOUT touching the text the row already serves. */
  private async recordFailure(file: File, reason: string): Promise<void> {
    await this.filesRepository.saveExtractionResult(file.id, {
      extractedText: file.extractedText,
      extractionError: reason,
      status: FileIngestionStatus.COMPLETED,
    });
  }

  private classify(reason: string): FileTranscribeFailureReasonCode {
    if (reason.includes('empty transcript')) {
      return 'EMPTY_TRANSCRIPT';
    }
    return reason.includes('could not be read') ? 'AUDIO_UNREADABLE' : 'PROVIDER_ERROR';
  }

  private publishFailed(
    fileId: string,
    userId: string,
    reasonCode: FileTranscribeFailureReasonCode,
    reason: string,
    provider?: string,
    model?: string,
  ): void {
    const payload: FileTranscribeFailedPayload = {
      fileId,
      userId,
      reason,
      reasonCode,
      provider,
      model,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_TRANSCRIBE_FAILED, payload);
  }

  /** Exported shape of the job this manager consumes, for the producer side. */
  static buildRequest(file: File): FileTranscribeRequestedPayload {
    return {
      fileId: file.id,
      userId: file.userId,
      filename: file.filename,
      mimeType: file.mimeType,
      timestamp: new Date().toISOString(),
    };
  }
}
