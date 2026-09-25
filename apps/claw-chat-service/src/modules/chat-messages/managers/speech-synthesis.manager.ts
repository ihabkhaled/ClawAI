import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PaygSurface } from '@claw/shared-types';
import { estimateTextTokens } from '@claw/shared-utilities';

import { SpeechAttemptOutcome } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import { SpeechConnectorClient } from '../clients/speech-connector.client';
import { SpeechProviderClient } from '../clients/speech-provider.client';
import { TtsVoiceCandidatesClient } from '../clients/tts-voice-candidates.client';
import {
  SPEECH_SEGMENT_TIMEOUT_RETRIES,
  SPEECH_STORE_FAILED_LOG_REASON,
  SPEECH_STORE_FAILED_RELEASE_REASON,
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
  SpeechSettlement,
  SpeechSynthesisInput,
  SpeechSynthesisResult,
} from '../types/speech.types';
import {
  geminiSpeechOutputTokens,
  geminiSpeechPromptTokens,
  isPerCharacterPriced,
  isSpeechTimeout,
  speechAttemptTimeoutMs,
  speechReleaseReason,
  speechRequestId,
  speechSettlement,
  toSpeechCandidates,
} from '../utilities/speech.utility';

/**
 * Walks the admin's TTS_VOICE candidates for ONE SEGMENT of a progressive
 * "Read aloud" (multimodal batch 9; segmented 2026-09-25) and meters every
 * paid attempt on `PaygSurface.TTS`:
 *
 *   key check -> reserve (expected units) -> provider call -> [caller
 *   stores the audio] -> settle: finalize (measured units) | release
 *
 * The winning hold is returned OPEN with the units measured from the
 * provider response. The caller finalizes it (`settle`) only once the audio
 * is stored and `metadata.speech` written, and releases it
 * (`releaseUnstored`) when that fails: the user never pays for audio they did
 * not receive; the provider cost is absorbed by the platform.
 *
 * - OpenAI tts-1 / tts-1-hd reserve and settle `ttsCharacters` (priced per
 *   character); Gemini TTS reserves a token estimate and settles on
 *   `usageMetadata` (rule 37 item 17).
 * - A provider with no connector key is skipped BEFORE any hold.
 * - A provider rejection or outage releases its hold and moves on under a
 *   distinct requestId; a credit refusal, a clamped hold or an unverifiable
 *   meter ENDS the walk (rule 37 item 18). A timed-out attempt is released
 *   (TIMEOUT) and retried ONCE on the same candidate under a new requestId,
 *   then the walk moves on; no attempt starts past the job deadline.
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

  /**
   * One SEGMENT through the candidate walk. Per candidate: an attempt, and on
   * a timeout ONE retry on the same candidate (a new requestId, a new hold)
   * before the next candidate. A provider rejection moves on at once. A credit
   * refusal / clamp / unverifiable meter throws from `reserve` and ends the
   * walk (rule 37 item 18); so does the job deadline.
   */
  async synthesize(input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    const candidates = await this.candidates();
    const attempts: SpeechAttemptRecord[] = [];
    for (const candidate of candidates) {
      for (let retry = 0; retry <= SPEECH_SEGMENT_TIMEOUT_RETRIES; retry += 1) {
        const timeoutMs = speechAttemptTimeoutMs(
          candidate.timeoutMs,
          input.segment.characters,
          input.deadlineAt,
          Date.now(),
        );
        if (timeoutMs === null) {
          throw new BusinessException(
            TTS_FAILED_MESSAGE,
            TTS_FAILED_CODE,
            HttpStatus.GATEWAY_TIMEOUT,
          );
        }
        const result = await this.attempt(input, { ...candidate, timeoutMs }, attempts.length + 1);
        attempts.push(result.record);
        this.logger.log(
          `ttsAttempt ${JSON.stringify({ messageId: input.messageId, segment: input.segment.index + 1, ...result.record })}`,
        );
        if (result.delivered !== undefined) {
          return { ...result.delivered, candidate, attempts };
        }
        if (result.record.outcome !== SpeechAttemptOutcome.TIMED_OUT) {
          break;
        }
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
    attemptNumber: number,
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
    const held = await this.reserve(input, candidate, attemptNumber);
    try {
      const audio = await this.provider.synthesize({
        candidate,
        text: input.segment.text,
        apiKey,
        maxOutputTokens: held.hold.maxOutputTokens,
      });
      // Measured now, settled after the store: the hold stays open until then.
      const settlement = speechSettlement(held, candidate, input.segment.characters, audio.usage);
      return {
        record: record(SpeechAttemptOutcome.SUCCEEDED, held.requestId),
        delivered: { audio, settlement },
      };
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
    attemptNumber: number,
  ): Promise<SpeechHold> {
    const perCharacter = isPerCharacterPriced(candidate);
    const requestId = speechRequestId(
      input.messageId,
      input.contentHash,
      input.generation,
      input.segment.index,
      attemptNumber,
    );
    const promptTokens = perCharacter
      ? 0
      : geminiSpeechPromptTokens(estimateTextTokens(input.segment.text));
    const outputTokens = perCharacter
      ? SPEECH_UNIT_PRICED_OUTPUT_TOKENS
      : geminiSpeechOutputTokens(input.segment.characters, candidate.maxTokens);
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
        ...(perCharacter ? { ttsCharacters: input.segment.characters } : {}),
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

  /** Finalizes a delivered synthesis on its measured units — only after the audio is stored. */
  async settle(settlement: SpeechSettlement): Promise<void> {
    await this.accessControl.finalizeCredit(
      settlement.held.hold,
      settlement.usage,
      settlement.calls,
    );
    this.logger.log(
      `ttsSettlement reservationId=${String(settlement.held.hold.reservationId)} outcome=FINALIZED`,
    );
  }

  /**
   * Gives the hold back when the audio could not be stored: the user gets no
   * audio, so the user pays nothing. Idempotent on the auth side (rule 37 item 11).
   */
  async releaseUnstored(settlement: SpeechSettlement): Promise<void> {
    await this.accessControl.releaseCredit(
      settlement.held.hold,
      SPEECH_STORE_FAILED_RELEASE_REASON,
    );
    this.logger.warn(
      `ttsSettlement reservationId=${String(settlement.held.hold.reservationId)} outcome=RELEASED reason=${SPEECH_STORE_FAILED_LOG_REASON}`,
    );
  }
}
