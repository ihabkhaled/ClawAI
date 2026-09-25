import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PaygSurface } from '@claw/shared-types';
import { estimateTextTokens } from '@claw/shared-utilities';

import { SpeechAttemptOutcome } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import { SpeechConnectorClient } from '../clients/speech-connector.client';
import { SpeechProviderClient } from '../clients/speech-provider.client';
import { TtsVoiceCandidatesClient } from '../clients/tts-voice-candidates.client';
import {
  SPEECH_UNIT_PRICED_OUTPUT_TOKENS,
  TTS_CLAMPED_CODE,
  TTS_CLAMPED_MESSAGE,
  TTS_CREDIT_CHECK_UNAVAILABLE_CODE,
  TTS_CREDIT_CHECK_UNAVAILABLE_MESSAGE,
  TTS_FAILED_CODE,
  TTS_FAILED_MESSAGE,
  TTS_UNAVAILABLE_CODE,
  TTS_UNAVAILABLE_MESSAGE,
} from '../constants/speech.constants';
import { AccessControlService } from '../services/access-control.service';
import type {
  SpeechAttemptRecord,
  SpeechAttemptResult,
  SpeechCandidate,
  SpeechHold,
  SpeechSynthesisInput,
  SpeechSynthesisResult,
  SpeechTokenUsage,
} from '../types/speech.types';
import {
  geminiSpeechOutputTokens,
  geminiSpeechPromptTokens,
  isPerCharacterPriced,
  isSpeechTimeout,
  measuredSpeechUsage,
  speechReleaseReason,
  speechRequestId,
  toSpeechCandidates,
} from '../utilities/speech.utility';

/**
 * Walks the admin's TTS_VOICE candidates for one "Read aloud" (multimodal
 * batch 9) and meters every paid attempt on `PaygSurface.TTS`:
 *
 *   key check -> reserve (expected units) -> provider call -> finalize
 *   (measured units) | release
 *
 * - OpenAI tts-1 / tts-1-hd reserve and settle `ttsCharacters` (priced per
 *   character); Gemini TTS reserves a token estimate and settles on
 *   `usageMetadata` (rule 37 item 17).
 * - A provider with no connector key is skipped BEFORE any hold.
 * - A provider rejection or outage releases its hold and moves on under a
 *   distinct requestId; a credit refusal, a clamped hold or an unverifiable
 *   meter ENDS the walk (rule 37 item 18); a deadline releases and ends it
 *   too, so the user waits for one timeout, not one per candidate.
 */
@Injectable()
export class SpeechSynthesisManager {
  private readonly logger = new Logger(SpeechSynthesisManager.name);

  constructor(
    private readonly candidatesClient: TtsVoiceCandidatesClient,
    private readonly connector: SpeechConnectorClient,
    private readonly provider: SpeechProviderClient,
    private readonly accessControl: AccessControlService,
  ) {}

  /** Admin candidates chat-service can call, in order. */
  async candidates(): Promise<SpeechCandidate[]> {
    return toSpeechCandidates(await this.candidatesClient.resolve());
  }

  /** Whether at least one supported candidate's provider has a connector key. */
  async hasConfiguredVoice(): Promise<boolean> {
    for (const candidate of await this.candidates()) {
      if (await this.connector.isConfigured(candidate.provider)) {
        return true;
      }
    }
    return false;
  }

  async synthesize(input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    const candidates = await this.candidates();
    const attempts: SpeechAttemptRecord[] = [];
    for (const [index, candidate] of candidates.entries()) {
      const result = await this.attempt(input, candidate, index);
      attempts.push(result.record);
      this.logger.log(
        `ttsAttempt ${JSON.stringify({ messageId: input.messageId, ...result.record })}`,
      );
      if (result.audio !== undefined) {
        return { audio: result.audio, candidate, attempts };
      }
      if (result.record.outcome === SpeechAttemptOutcome.TIMED_OUT) {
        throw new BusinessException(
          TTS_FAILED_MESSAGE,
          TTS_FAILED_CODE,
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
    }
    const nothingTried = attempts.every(
      (attempt) => attempt.outcome === SpeechAttemptOutcome.NOT_CONFIGURED,
    );
    throw nothingTried
      ? new BusinessException(
          TTS_UNAVAILABLE_MESSAGE,
          TTS_UNAVAILABLE_CODE,
          HttpStatus.SERVICE_UNAVAILABLE,
        )
      : new BusinessException(TTS_FAILED_MESSAGE, TTS_FAILED_CODE, HttpStatus.BAD_GATEWAY);
  }

  private async attempt(
    input: SpeechSynthesisInput,
    candidate: SpeechCandidate,
    index: number,
  ): Promise<SpeechAttemptResult> {
    const started = Date.now();
    const record = (
      outcome: SpeechAttemptOutcome,
      requestId: string | null,
    ): SpeechAttemptRecord => ({
      provider: candidate.provider,
      model: candidate.model,
      requestId,
      outcome,
      latencyMs: Date.now() - started,
    });
    const apiKey = await this.connector.resolveApiKey(candidate.provider);
    if (apiKey === null) {
      return { record: record(SpeechAttemptOutcome.NOT_CONFIGURED, null) };
    }
    // Throws the terminal 402 / 503 itself: a refusal never reaches the next candidate.
    const held = await this.reserve(input, candidate, index);
    try {
      const audio = await this.provider.synthesize({
        candidate,
        text: input.speakable.text,
        apiKey,
        maxOutputTokens: held.hold.maxOutputTokens,
      });
      await this.finalize(held, candidate, input, audio.usage);
      return { record: record(SpeechAttemptOutcome.SUCCEEDED, held.requestId), audio };
    } catch (error: unknown) {
      await this.accessControl.releaseCredit(held.hold, speechReleaseReason(error));
      const outcome = isSpeechTimeout(error)
        ? SpeechAttemptOutcome.TIMED_OUT
        : SpeechAttemptOutcome.FAILED;
      return { record: record(outcome, held.requestId) };
    }
  }

  /** The hold for one attempt, or a terminal refusal. Never a silent fall-through. */
  private async reserve(
    input: SpeechSynthesisInput,
    candidate: SpeechCandidate,
    index: number,
  ): Promise<SpeechHold> {
    const perCharacter = isPerCharacterPriced(candidate);
    const requestId = speechRequestId(
      input.messageId,
      input.speakable.contentHash,
      input.generation,
      index,
    );
    const promptTokens = perCharacter
      ? 0
      : geminiSpeechPromptTokens(estimateTextTokens(input.speakable.text));
    const outputTokens = perCharacter
      ? SPEECH_UNIT_PRICED_OUTPUT_TOKENS
      : geminiSpeechOutputTokens(input.speakable.characters, candidate.maxTokens);
    let hold: SpeechHold['hold'];
    try {
      hold = await this.accessControl.reserveCredit({
        userId: input.userId,
        requestId,
        provider: candidate.provider,
        model: candidate.model,
        surface: PaygSurface.TTS,
        promptTokens,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: outputTokens,
        ...(perCharacter ? { ttsCharacters: input.speakable.characters } : {}),
      });
    } catch (error: unknown) {
      this.logger.warn(`reserve: TTS hold refused requestId=${requestId}`);
      throw error instanceof BusinessException
        ? error
        : new BusinessException(
            TTS_CREDIT_CHECK_UNAVAILABLE_MESSAGE,
            TTS_CREDIT_CHECK_UNAVAILABLE_CODE,
            HttpStatus.SERVICE_UNAVAILABLE,
          );
    }
    if (hold.clamped) {
      // Speech cut off mid-sentence is worse than none; the money goes back.
      await this.accessControl.releaseCredit(hold, 'CANCELLED');
      throw new BusinessException(
        TTS_CLAMPED_MESSAGE,
        TTS_CLAMPED_CODE,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return { hold, requestId, promptTokens, outputTokens };
  }

  /** Settles on what was measured: characters sent (OpenAI) or usageMetadata (Gemini). */
  private async finalize(
    held: SpeechHold,
    candidate: SpeechCandidate,
    input: SpeechSynthesisInput,
    usage: SpeechTokenUsage | null,
  ): Promise<void> {
    if (isPerCharacterPriced(candidate)) {
      await this.accessControl.finalizeCredit(
        held.hold,
        { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
        { toolCalls: 0, ttsCharacters: input.speakable.characters },
      );
      return;
    }
    const measured = measuredSpeechUsage(usage, held.promptTokens, held.outputTokens);
    await this.accessControl.finalizeCredit(
      held.hold,
      { ...measured, cachedPromptTokens: 0, reasoningTokens: 0 },
      { toolCalls: 0 },
    );
  }
}
