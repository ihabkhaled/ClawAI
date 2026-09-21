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
import { transcribeWithGemini } from '../adapters/gemini-transcription.adapter';
import { transcribeWithOpenAi } from '../adapters/openai-transcription.adapter';
import {
  AUDIO_PLACEHOLDER_PREFIX,
  GEMINI_TRANSCRIPTION_DEFAULT_BASE_URL,
  OPENAI_TRANSCRIPTION_DEFAULT_BASE_URL,
  OPENAI_TRANSCRIPTION_MODEL,
  TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE,
} from '../constants/transcription.constants';
import { type TranscriptionCapability } from '../types/transcription.types';
import { transcribeJobSchema } from '../dto/transcribe-job.dto';

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

    if (this.hasTranscript(file)) {
      this.logger.log(
        `handleJob: fileId=${fileId} already transcribed (${String(file.extractedText?.length ?? 0)} chars) — skipping`,
      );
      return;
    }

    const capability = await this.capabilityClient.findCapableModel();
    if (capability === null) {
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

    await this.runTranscription(file, userId, capability);
  }

  private async runTranscription(
    file: File,
    userId: string,
    capability: TranscriptionCapability,
  ): Promise<void> {
    const startedAt = Date.now();
    const model = this.effectiveModel(capability);
    try {
      const base64 = this.readAudioBase64(file);
      const config = await this.capabilityClient.fetchConnectorConfig(capability.provider);
      const baseUrl = config.baseUrl ?? this.defaultBaseUrl(capability.provider);
      // Trimmed HERE as well as in each adapter. Whitespace is what a provider
      // returns when it heard nothing, and a row holding three spaces would
      // pass every "has a transcript" check while telling the user nothing.
      const raw = await this.callProvider(
        capability.provider,
        baseUrl,
        config.apiKey,
        base64,
        file.mimeType,
        model,
      );
      const transcript = raw.trim();

      if (transcript.length === 0) {
        throw new Error('The provider returned an empty transcript.');
      }

      await this.filesRepository.saveExtractionResult(file.id, {
        extractedText: transcript,
        extractionError: null,
        status: FileIngestionStatus.COMPLETED,
      });

      const durationMs = Date.now() - startedAt;
      const payload: FileTranscribeCompletedPayload = {
        fileId: file.id,
        userId,
        provider: capability.provider,
        model,
        characters: transcript.length,
        durationMs,
        timestamp: new Date().toISOString(),
      };
      void this.rabbitMQService.publish(EventPattern.FILE_TRANSCRIBE_COMPLETED, payload);
      this.logger.log(
        `runTranscription: fileId=${file.id} provider=${capability.provider} model=${model} chars=${String(transcript.length)} durationMs=${String(durationMs)}`,
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Unknown transcription error';
      this.logger.error(`runTranscription: fileId=${file.id} failed — ${reason}`);
      await this.recordFailure(file, `Audio transcription failed: ${reason}`);
      this.publishFailed(
        file.id,
        userId,
        this.classify(reason),
        `Audio transcription failed: ${reason}`,
        capability.provider,
        model,
      );
    }
  }

  private async callProvider(
    provider: string,
    baseUrl: string,
    apiKey: string,
    base64: string,
    mimeType: string,
    model: string,
  ): Promise<string> {
    if (provider === 'GEMINI') {
      return transcribeWithGemini(baseUrl, apiKey, base64, mimeType, model);
    }
    if (provider === 'OPENAI') {
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
