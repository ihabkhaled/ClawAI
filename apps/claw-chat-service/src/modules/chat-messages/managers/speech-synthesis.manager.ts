import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PaygSurface } from '@claw/shared-types';
import { estimateTextTokens } from '@claw/shared-utilities';

import { SpeechAttemptOutcome } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import { SpeechConnectorClient } from '../clients/speech-connector.client';
import { SpeechProviderClient } from '../clients/speech-provider.client';
import { TtsVoiceCandidatesClient } from '../clients/tts-voice-candidates.client';
import {
  SPEECH_CANCELLED_LOG_REASON,
  SPEECH_CANCELLED_RELEASE_REASON,
  SPEECH_RATE_LIMIT_RETRIES,
  SPEECH_SEGMENT_TIMEOUT_RETRIES,
  SPEECH_STORE_FAILED_LOG_REASON,
  SPEECH_STORE_FAILED_RELEASE_REASON,
  SPEECH_UNIT_PRICED_OUTPUT_TOKENS,
  TTS_CANCELLED_CODE,
  TTS_CANCELLED_MESSAGE,
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
import {
  isSpeechRateLimited,
  rateLimitBackoffMs,
  waitMs,
} from '../utilities/speech-rate-limit.utility';

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
 * - A RATE_LIMITED attempt (429 / RESOURCE_EXHAUSTED) is released, the job
 *   is told (`onRateLimited`: it drops to one call in flight), and the SAME
 *   candidate is retried after the provider's hint or 1.5 s / 3 s / 6 s with
 *   jitter (each wait ≤ 10 s), at most 3 times, never past the deadline —
 *   then the walk moves on.
 * - A CANCELLED job (`input.signal` aborted by the owner's stop) starts no
 *   new attempt and no rate-limit wait; an attempt in flight has its local
 *   HTTP request aborted, and its hold — or a hold whose result arrived after
 *   the stop — is RELEASED (`CANCELLED`), never finalized: the result is
 *   discarded. The provider may still finish upstream; nothing claims it
 *   stopped. The walk then throws `TTS_CANCELLED`.
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
   * One SEGMENT through the candidate walk. Per candidate: an attempt; on a
   * timeout ONE retry, on a rate limit up to `SPEECH_RATE_LIMIT_RETRIES`
   * retries after a bounded wait — each a new requestId and a new hold —
   * before the next candidate. A provider rejection moves on at once. A
   * credit refusal / clamp / unverifiable meter throws from `reserve` and ends
   * the walk (rule 37 item 18); so does the job deadline.
   */
  async synthesize(input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    const candidates = await this.candidates();
    const attempts: SpeechAttemptRecord[] = [];
    for (const candidate of candidates) {
      const delivered = await this.walkCandidate(input, candidate, attempts);
      if (delivered !== null) {
        return delivered;
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

  /**
   * Attempts on ONE candidate until it delivers or gives up. Bounded: at most
   * 1 + `SPEECH_SEGMENT_TIMEOUT_RETRIES` + `SPEECH_RATE_LIMIT_RETRIES` calls.
   */
  private async walkCandidate(
    input: SpeechSynthesisInput,
    candidate: SpeechCandidate,
    attempts: SpeechAttemptRecord[],
  ): Promise<SpeechSynthesisResult | null> {
    let timeoutRetries = 0;
    let rateLimitRetries = 0;
    let again = true;
    while (again) {
      this.throwIfCancelled(input);
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
      const outcome = result.record.outcome;
      if (outcome === SpeechAttemptOutcome.CANCELLED) {
        this.throwIfCancelled(input);
      }
      if (outcome === SpeechAttemptOutcome.TIMED_OUT) {
        timeoutRetries += 1;
        again = timeoutRetries <= SPEECH_SEGMENT_TIMEOUT_RETRIES;
      } else if (outcome === SpeechAttemptOutcome.RATE_LIMITED) {
        rateLimitRetries += 1;
        again = await this.waitForRateLimitRetry(
          input,
          candidate,
          rateLimitRetries,
          result.retryAfterMs ?? null,
        );
      } else {
        again = false;
      }
    }
    return null;
  }

  /**
   * Tells the job (it drops to one call in flight), then waits out the
   * backoff when a retry is still allowed AND its attempt would still fit the
   * job window after the wait. False = move on to the next candidate; a retry
   * that cannot fit is never started.
   */
  private async waitForRateLimitRetry(
    input: SpeechSynthesisInput,
    candidate: SpeechCandidate,
    retryNumber: number,
    hintMs: number | null,
  ): Promise<boolean> {
    input.onRateLimited?.();
    const wait =
      retryNumber > SPEECH_RATE_LIMIT_RETRIES
        ? null
        : rateLimitBackoffMs(retryNumber, hintMs, Math.random());
    const fits =
      wait !== null &&
      speechAttemptTimeoutMs(
        candidate.timeoutMs,
        input.segment.characters,
        input.deadlineAt,
        Date.now() + wait,
      ) !== null;
    this.logger.warn(
      `ttsAttempt outcome=${SpeechAttemptOutcome.RATE_LIMITED} messageId=${input.messageId} segment=${String(input.segment.index + 1)} provider=${candidate.provider} retry=${String(retryNumber)}/${String(SPEECH_RATE_LIMIT_RETRIES)} hintMs=${String(hintMs)} retryInMs=${fits ? String(wait) : 'none'}`,
    );
    if (wait === null || !fits) {
      return false;
    }
    await waitMs(wait, input.signal);
    return true;
  }

  /** Read fresh at every checkpoint: the owner's stop can land during any await. */
  private isCancelled(input: SpeechSynthesisInput): boolean {
    return input.signal?.aborted === true;
  }

  /** The owner stopped the job: no further attempt, wait or candidate. */
  private throwIfCancelled(input: SpeechSynthesisInput): void {
    if (this.isCancelled(input)) {
      throw new BusinessException(TTS_CANCELLED_MESSAGE, TTS_CANCELLED_CODE, HttpStatus.CONFLICT);
    }
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
    if (this.isCancelled(input)) {
      // Cancelled before any hold: nothing reserved, nothing called.
      return { record: record(SpeechAttemptOutcome.CANCELLED, null) };
    }
    // Throws the terminal 402 / 503 itself: a refusal never reaches the next candidate.
    const held = await this.reserve(input, candidate, attemptNumber);
    try {
      const audio = await this.provider.synthesize({
        candidate,
        text: input.segment.text,
        apiKey,
        maxOutputTokens: held.hold.maxOutputTokens,
        signal: input.signal,
      });
      if (this.isCancelled(input)) {
        // The answer arrived after the owner's stop: discarded, never charged.
        await this.releaseCancelled(held);
        return { record: record(SpeechAttemptOutcome.CANCELLED, held.requestId) };
      }
      // Measured now, settled after the store: the hold stays open until then.
      const settlement = speechSettlement(held, candidate, input.segment.characters, audio.usage);
      return {
        record: record(SpeechAttemptOutcome.SUCCEEDED, held.requestId),
        delivered: { audio, settlement },
      };
    } catch (error: unknown) {
      if (this.isCancelled(input)) {
        // Our own abort (the owner's stop), not the provider's answer.
        await this.releaseCancelled(held);
        return { record: record(SpeechAttemptOutcome.CANCELLED, held.requestId) };
      }
      // Released, never finalized: a rejected / rate-limited / timed-out call is never charged.
      await this.accessControl.releaseCredit(held.hold, speechReleaseReason(error));
      if (isSpeechRateLimited(error)) {
        return {
          record: record(SpeechAttemptOutcome.RATE_LIMITED, held.requestId),
          retryAfterMs: error.retryAfterMs,
        };
      }
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
   * Gives the hold back when the audio could not be stored — or was discarded
   * because the owner stopped the job first: the user gets no audio, so the
   * user pays nothing. Idempotent on the auth side (rule 37 item 11).
   */
  async releaseUnstored(settlement: SpeechSettlement, cancelled = false): Promise<void> {
    await this.accessControl.releaseCredit(
      settlement.held.hold,
      cancelled ? SPEECH_CANCELLED_RELEASE_REASON : SPEECH_STORE_FAILED_RELEASE_REASON,
    );
    this.logger.warn(
      `ttsSettlement reservationId=${String(settlement.held.hold.reservationId)} outcome=RELEASED reason=${cancelled ? SPEECH_CANCELLED_LOG_REASON : SPEECH_STORE_FAILED_LOG_REASON}`,
    );
  }

  /** A cancelled attempt's hold goes back; never finalized (rule 37 item 17). */
  private async releaseCancelled(held: SpeechHold): Promise<void> {
    await this.accessControl.releaseCredit(held.hold, SPEECH_CANCELLED_RELEASE_REASON);
    this.logger.log(
      `ttsSettlement reservationId=${String(held.hold.reservationId)} outcome=RELEASED reason=${SPEECH_CANCELLED_LOG_REASON}`,
    );
  }
}
