import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { SpeechUnavailableReason } from '@claw/shared-types';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { MessageRole } from '../../../generated/prisma';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { SpeechFileStoreClient } from '../clients/speech-file-store.client';
import {
  SPEECH_MAX_CHARACTERS,
  TEXT_TO_SPEECH_PLAN_FEATURE,
  TTS_NOTHING_TO_READ_CODE,
  TTS_NOTHING_TO_READ_MESSAGE,
} from '../constants/speech.constants';
import { SpeechSynthesisManager } from '../managers/speech-synthesis.manager';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import type {
  MessageSpeechResponse,
  SpeakableText,
  SpeechAvailability,
  SpeechSourceMessage,
  SpeechSynthesisResult,
  StoredSpeech,
} from '../types/speech.types';
import { prepareSpeakableText } from '../utilities/speakable-text.utility';
import {
  readStoredSpeech,
  speechFilename,
  toSpeechResponse,
  withStoredSpeech,
} from '../utilities/speech.utility';
import { AccessControlService } from './access-control.service';

/**
 * "Read aloud" — text-to-speech of one assistant reply (multimodal batch 9).
 *
 * Order is load-bearing: ownership (404 for a stranger, like a missing id) →
 * plan gate (403 before anything paid) → replay a stored synthesis of the
 * SAME text for free → synthesise (metered, `SpeechSynthesisManager`) → store
 * the audio as the owner's file → record `metadata.speech` (never the bytes).
 * Concurrent requests for the same reply on one replica share one synthesis.
 */
@Injectable()
export class MessageSpeechService {
  private readonly logger = new Logger(MessageSpeechService.name);
  private readonly inFlight = new Map<string, Promise<MessageSpeechResponse>>();

  constructor(
    private readonly messages: ChatMessagesRepository,
    private readonly threads: ChatThreadsRepository,
    private readonly accessControl: AccessControlService,
    private readonly synthesis: SpeechSynthesisManager,
    private readonly files: SpeechFileStoreClient,
  ) {}

  async getAvailability(userId: string): Promise<SpeechAvailability> {
    let onPlan: boolean;
    try {
      onPlan = await this.accessControl.hasPlanFeatureFor(userId, TEXT_TO_SPEECH_PLAN_FEATURE);
    } catch {
      return { available: false, reason: SpeechUnavailableReason.TEMPORARILY_UNAVAILABLE };
    }
    if (!onPlan) {
      return { available: false, reason: SpeechUnavailableReason.PLAN_DISABLED };
    }
    return (await this.synthesis.hasConfiguredVoice())
      ? { available: true, reason: null }
      : { available: false, reason: SpeechUnavailableReason.NO_VOICE_CONFIGURED };
  }

  async synthesize(userId: string, messageId: string): Promise<MessageSpeechResponse> {
    const message = await this.loadOwnedReply(userId, messageId);
    await this.accessControl.assertTextToSpeechAccess(userId);
    const speakable = prepareSpeakableText(message.content, SPEECH_MAX_CHARACTERS);
    if (speakable.characters === 0) {
      throw new BusinessException(
        TTS_NOTHING_TO_READ_MESSAGE,
        TTS_NOTHING_TO_READ_CODE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const key = `${userId}:${messageId}:${speakable.contentHash}`;
    const running = this.inFlight.get(key);
    if (running !== undefined) {
      return running;
    }
    const work = this.replayOrSynthesize(userId, message, speakable).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, work);
    return work;
  }

  /** The assistant reply, or the same 404 a missing id gets (rules/16 IDOR). */
  private async loadOwnedReply(userId: string, messageId: string): Promise<SpeechSourceMessage> {
    const message = await this.messages.findById(messageId);
    const thread = message === null ? null : await this.threads.findById(message.threadId);
    if (message === null || thread?.userId !== userId) {
      throw new EntityNotFoundException('ChatMessage', messageId);
    }
    if (message.role !== MessageRole.ASSISTANT) {
      throw new BusinessException(
        TTS_NOTHING_TO_READ_MESSAGE,
        TTS_NOTHING_TO_READ_CODE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return { id: message.id, content: message.content, metadata: message.metadata };
  }

  private async replayOrSynthesize(
    userId: string,
    message: SpeechSourceMessage,
    speakable: SpeakableText,
  ): Promise<MessageSpeechResponse> {
    const stored = readStoredSpeech(message.metadata);
    // null = file-service could not say; replay rather than charge twice.
    if (
      stored?.contentHash === speakable.contentHash &&
      (await this.files.exists(stored.fileId, userId)) !== false
    ) {
      this.logger.log(`synthesize: replay messageId=${message.id} fileId=${stored.fileId}`);
      return toSpeechResponse(stored, true);
    }
    const generation = (stored?.generation ?? 0) + 1;
    const result = await this.synthesis.synthesize({
      userId,
      messageId: message.id,
      speakable,
      generation,
    });
    const speech = await this.storeAudio(userId, message.id, speakable, result, generation);
    await this.messages.updateMetadata(message.id, withStoredSpeech(message.metadata, speech));
    return toSpeechResponse(speech, false);
  }

  /** The audio as the owner's file; what `metadata.speech` records about it. */
  private async storeAudio(
    userId: string,
    messageId: string,
    speakable: SpeakableText,
    result: SpeechSynthesisResult,
    generation: number,
  ): Promise<StoredSpeech> {
    const filename = speechFilename(messageId, result.audio.mimeType);
    const fileId = await this.files.store({
      userId,
      filename,
      mimeType: result.audio.mimeType,
      bytes: result.audio.bytes,
      transcript: speakable.text,
    });
    return {
      fileId,
      filename,
      mimeType: result.audio.mimeType,
      provider: result.candidate.provider,
      model: result.candidate.model,
      characters: speakable.characters,
      truncated: speakable.truncated,
      contentHash: speakable.contentHash,
      generation,
    };
  }
}
