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
  TranscriptionFailureKind,
  TranscriptionReserveStatus,
  TranscriptionResponseIssue,
} from '../../../common/enums';
import { TranscriptionResponseError } from '../../../common/errors';
import { transcribeWithGemini } from '../adapters/gemini-transcription.adapter';
import { transcribeWithOpenAi } from '../adapters/openai-transcription.adapter';
import {
  AUDIO_PLACEHOLDER_PREFIX,
  GEMINI_TRANSCRIPTION_DEFAULT_BASE_URL,
  MAX_TRANSCRIBABLE_AUDIO_BYTES,
  OPENAI_TRANSCRIPTION_DEFAULT_BASE_URL,
  OPENAI_TRANSCRIPTION_MODEL,
  TRANSCRIPTION_CALLS_PER_CANDIDATE,
  TRANSCRIPTION_CONTENT_BLOCKED_MESSAGE,
  TRANSCRIPTION_EMPTY_TRANSCRIPT_ERROR,
  TRANSCRIPTION_INCOMPLETE_MESSAGE,
  TRANSCRIPTION_MAX_PROVIDER_CALLS,
  TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE,
  TRANSCRIPTION_NO_USABLE_MODEL_MESSAGE,
  TRANSCRIPTION_PROVIDER_BUSY_MESSAGE,
  TRANSCRIPTION_PROVIDER_FAILED_MESSAGE,
  TRANSCRIPTION_PROVIDER_UNAVAILABLE_MESSAGE,
  TRANSCRIPTION_RATE_LIMIT_BACKOFF_MS,
  TRANSCRIPTION_TOO_LARGE_MESSAGE,
} from '../constants/transcription.constants';
import {
  type TranscriptionAttemptOutcome,
  type TranscriptionCapability,
  type TranscriptionProviderResult,
  type TranscriptionRequestContext,
  type TranscriptionRunOutcome,
  type TranscriptionWalkState,
} from '../types/transcription.types';
import {
  type DerivedAudioTranscriptionInput,
  type DerivedAudioTranscriptionOutcome,
} from '../types/video-processing.types';
import { transcribeJobSchema } from '../dto/transcribe-job.dto';
import { classifyTranscriptionFailure } from '../utilities/transcription-error.utility';
import { waitForTranscriptionBackoff } from '../utilities/transcription-backoff.utility';

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
    if (outcome.status === TranscriptionAttemptStatus.CANCELLED) {
      // Unreachable for an audio upload (it passes no signal); nothing to write.
      this.logger.warn(`runTranscription: fileId=${file.id} cancelled — no write`);
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
    // Already user-safe: the walk never hands back a raw transport message.
    await this.recordFailure(file, outcome.reason);
    this.publishFailed(
      file.id,
      userId,
      this.classify(outcome.reason),
      outcome.reason,
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
    if (input.signal?.aborted === true) {
      return { status: DerivedTranscriptionStatus.CANCELLED, holdReleased: false };
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
        signal: input.signal,
      },
      candidates,
    );
    if (outcome === null) {
      return {
        status: DerivedTranscriptionStatus.FAILED,
        reason: TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE,
      };
    }
    if (outcome.status === TranscriptionAttemptStatus.CANCELLED) {
      this.logger.warn(
        `transcribeDerivedAudio: fileId=${input.fileId} provider=${outcome.capability.provider} cancelled holdReleased=${String(outcome.holdReleased)}`,
      );
      return { status: DerivedTranscriptionStatus.CANCELLED, holdReleased: outcome.holdReleased };
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
   * Walks `candidates` (already ranked by `selectTranscriptionCandidates`),
   * stopping at the first success. Returns null only for an empty list.
   * Never writes the row.
   *
   * What may happen after a failed call depends on WHY it failed
   * (`classifyTranscriptionFailure`):
   *  - MODEL_REJECTED (the modality 400, a 404): this model is wrong for
   *    audio, the provider processed nothing — try the next candidate, which
   *    may be another model of the SAME provider.
   *  - RATE_LIMITED (a transient 429): nothing was processed. One short
   *    backoff and one retry of the same model, once per JOB; after that the
   *    provider is skipped, never looped on.
   *  - QUOTA_EXHAUSTED (OpenAI `insufficient_quota`): that key cannot pay.
   *    Skip the provider without retrying.
   *  - EMPTY_RESPONSE (a 200 with no text, or reasoning-only parts): one
   *    retry of the same model, once per JOB, under the next request id
   *    (`…:GEMINI:2`); after that the next candidate. The provider is not
   *    blocked — another of its models may hear the audio.
   *  - INCOMPLETE_RESPONSE (a 200 cut off at MAX_TOKENS): the next candidate,
   *    no same-model retry — the same ceiling would cut at the same place.
   *  - TERMINAL (5xx, network, a SAFETY/RECITATION block): stop. It may have
   *    been processed, or another model would block it too.
   *
   * `TRANSCRIPTION_MAX_PROVIDER_CALLS` bounds the whole walk, retries
   * included. A PAYG refusal is a `REFUSED` result, not a throw, and ends the
   * walk: the next provider would only be refused again, or charged.
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

    const walk: TranscriptionWalkState = {
      calls: 0,
      backoffUsed: false,
      emptyRetryUsed: false,
      blockedProviders: new Set<string>(),
      providerCalls: new Map<string, number>(),
      seen: new Set<TranscriptionFailureKind>(),
      last: firstCandidate,
    };
    for (const capability of candidates) {
      if (this.isCancelled(context)) {
        // A cancel ends the walk: never a reason to try the next provider.
        return {
          status: TranscriptionAttemptStatus.CANCELLED,
          holdReleased: false,
          capability: walk.last,
          model: this.effectiveModel(walk.last),
        };
      }
      if (walk.blockedProviders.has(capability.provider)) {
        continue;
      }
      const outcome = await this.tryCandidate(context, capability, walk);
      if (outcome !== null) {
        return outcome;
      }
    }
    return {
      status: TranscriptionAttemptStatus.FAILED,
      reason: this.exhaustedReason(walk.seen),
      capability: walk.last,
      model: this.effectiveModel(walk.last),
    };
  }

  /**
   * At most `TRANSCRIPTION_CALLS_PER_CANDIDATE` calls on one candidate: the
   * first, plus one retry (the job-wide 429 retry or the job-wide empty-answer
   * retry). Each call takes the next `providerAttempt`, so a retry is its own
   * hold under its own request id. Returns the final outcome, or null when the
   * walk should move to the next candidate.
   */
  private async tryCandidate(
    context: TranscriptionRequestContext,
    capability: TranscriptionCapability,
    walk: TranscriptionWalkState,
  ): Promise<TranscriptionRunOutcome | null> {
    const { provider } = capability;
    const model = this.effectiveModel(capability);
    for (let call = 0; call < TRANSCRIPTION_CALLS_PER_CANDIDATE; call += 1) {
      if (walk.calls >= TRANSCRIPTION_MAX_PROVIDER_CALLS) {
        this.logger.warn(
          `runCandidates: fileId=${context.fileId} stopping after ${String(walk.calls)} provider calls`,
        );
        return null;
      }
      walk.calls += 1;
      walk.last = capability;
      const providerAttempt = (walk.providerCalls.get(provider) ?? 0) + 1;
      walk.providerCalls.set(provider, providerAttempt);
      try {
        const outcome = await this.attemptCandidate(context, capability, providerAttempt);
        return { ...outcome, capability, model };
      } catch (error: unknown) {
        const raw = error instanceof Error ? error.message : 'Unknown transcription error';
        const kind = classifyTranscriptionFailure(error);
        if (kind === TranscriptionFailureKind.TERMINAL) {
          this.logger.error(
            `runCandidates: fileId=${context.fileId} provider=${provider} model=${model} failed — ${raw}`,
          );
          return {
            status: TranscriptionAttemptStatus.FAILED,
            reason: this.terminalReason(error),
            capability,
            model,
          };
        }
        walk.seen.add(kind);
        this.logger.warn(
          `runCandidates: fileId=${context.fileId} provider=${provider} model=${model} kind=${kind} — ${raw}`,
        );
        if (await this.retrySameCandidate(kind, walk)) {
          continue;
        }
        if (this.blocksProvider(kind)) {
          walk.blockedProviders.add(provider);
        }
        return null;
      }
    }
    return null;
  }

  /**
   * Whether the SAME candidate gets one more call: the job's one backoff
   * retry after a transient 429, or its one retry after an empty 200. Both
   * are once per job, so the walk can never spin on one model.
   */
  private async retrySameCandidate(
    kind: TranscriptionFailureKind,
    walk: TranscriptionWalkState,
  ): Promise<boolean> {
    if (kind === TranscriptionFailureKind.RATE_LIMITED && !walk.backoffUsed) {
      walk.backoffUsed = true;
      await waitForTranscriptionBackoff(TRANSCRIPTION_RATE_LIMIT_BACKOFF_MS);
      return true;
    }
    if (kind === TranscriptionFailureKind.EMPTY_RESPONSE && !walk.emptyRetryUsed) {
      // No delay: an empty answer is not a rate signal.
      walk.emptyRetryUsed = true;
      return true;
    }
    return false;
  }

  /**
   * A rate limit or an exhausted quota belongs to the KEY, so every model of
   * that provider is skipped. A refused model, an empty answer and a cut-off
   * answer belong to the MODEL, so the provider's next model still gets a turn.
   */
  private blocksProvider(kind: TranscriptionFailureKind): boolean {
    return (
      kind === TranscriptionFailureKind.RATE_LIMITED ||
      kind === TranscriptionFailureKind.QUOTA_EXHAUSTED
    );
  }

  /**
   * The user-facing reason when every candidate failed recoverably. Busy beats
   * the rest; then what the recording itself told us (nothing heard, or cut
   * off); then a key out of quota; then a catalog that offered no usable model.
   */
  private exhaustedReason(seen: ReadonlySet<TranscriptionFailureKind>): string {
    if (seen.has(TranscriptionFailureKind.RATE_LIMITED)) {
      return TRANSCRIPTION_PROVIDER_BUSY_MESSAGE;
    }
    if (seen.has(TranscriptionFailureKind.EMPTY_RESPONSE)) {
      return `Audio transcription failed: ${TRANSCRIPTION_EMPTY_TRANSCRIPT_ERROR}`;
    }
    if (seen.has(TranscriptionFailureKind.INCOMPLETE_RESPONSE)) {
      return TRANSCRIPTION_INCOMPLETE_MESSAGE;
    }
    return seen.has(TranscriptionFailureKind.QUOTA_EXHAUSTED)
      ? TRANSCRIPTION_PROVIDER_UNAVAILABLE_MESSAGE
      : TRANSCRIPTION_NO_USABLE_MODEL_MESSAGE;
  }

  /**
   * A content-policy block is the provider's own finding about the recording,
   * so the user is told; any other raw reason is a transport string and stays
   * in the log.
   */
  private terminalReason(error: unknown): string {
    return error instanceof TranscriptionResponseError &&
      error.issue === TranscriptionResponseIssue.BLOCKED
      ? TRANSCRIPTION_CONTENT_BLOCKED_MESSAGE
      : TRANSCRIPTION_PROVIDER_FAILED_MESSAGE;
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
    providerAttempt: number,
  ): Promise<TranscriptionAttemptOutcome> {
    const model = this.effectiveModel(capability);
    if (this.isCancelled(context)) {
      // Cancelled before the hold: nothing reserved, nothing called.
      return { status: TranscriptionAttemptStatus.CANCELLED, holdReleased: false };
    }
    const config = await this.capabilityClient.fetchConnectorConfig(capability.provider);
    const baseUrl = config.baseUrl ?? this.defaultBaseUrl(capability.provider);

    // Charged to the UPLOADER — the job's userId — per attempt. The requestId
    // is per provider CALL (`providerAttempt`), so a second model or the 429
    // retry is a second, separate hold, never a reuse of a released one.
    const reservation = await this.meter.reserve({
      userId: context.userId,
      fileId: context.fileId,
      provider: capability.provider,
      model,
      sizeBytes: context.sizeBytes,
      providerAttempt,
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
        throw new TranscriptionResponseError(
          TranscriptionResponseIssue.EMPTY,
          TRANSCRIPTION_EMPTY_TRANSCRIPT_ERROR,
        );
      }
    } catch (error: unknown) {
      if (this.isCancelled(context)) {
        // A user cancel aborted the call: RELEASED as CANCELLED, and returned
        // (not thrown) so the walk cannot read it as a provider failure.
        await this.meter.releaseCancelled(meterHold);
        return { status: TranscriptionAttemptStatus.CANCELLED, holdReleased: true };
      }
      // The user got no transcript, so the hold goes back rather than being
      // settled — a provider error, a timeout and an empty answer alike.
      await this.meter.release(meterHold, error);
      throw error;
    }

    if (this.isCancelled(context)) {
      // The answer raced the cancel. The user gets no transcript (the video is
      // recorded cancelled), so the hold is released, never finalized.
      await this.meter.releaseCancelled(meterHold);
      return { status: TranscriptionAttemptStatus.CANCELLED, holdReleased: true };
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
    const { base64, mimeType, instruction, signal } = context;
    if (provider === 'GEMINI' && signal !== undefined) {
      // The video path: cancellable. `instruction` undefined → the adapter default.
      return transcribeWithGemini(
        baseUrl,
        apiKey,
        base64,
        mimeType,
        model,
        maxOutputTokens,
        instruction,
        signal,
      );
    }
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
      return signal === undefined
        ? transcribeWithOpenAi(baseUrl, apiKey, base64, mimeType, model)
        : transcribeWithOpenAi(baseUrl, apiKey, base64, mimeType, model, signal);
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

  /**
   * Whether the caller's cancel signal has fired. A method, not an inline
   * check, because the signal flips across awaits and an inline read would be
   * narrowed away by the compiler after the first one.
   */
  private isCancelled(context: TranscriptionRequestContext): boolean {
    return context.signal?.aborted === true;
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
