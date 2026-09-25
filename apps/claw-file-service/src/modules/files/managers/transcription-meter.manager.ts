import { Injectable, Logger } from '@nestjs/common';
import { isPaygCreditExhaustedError, PaygMeter } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';
import { TranscriptionCreditRefusalCode, TranscriptionReserveStatus } from '../../../common/enums';
import { TRANSCRIPTION_PAYG_UNIT_PRICED_OUTPUT_TOKENS } from '../constants/transcription-payg.constants';
import {
  type TranscriptionMeterHold,
  type TranscriptionMeterInput,
  type TranscriptionProviderResult,
  type TranscriptionReserveOutcome,
} from '../types/transcription.types';
import {
  estimateGeminiPromptTokens,
  estimateTranscriptOutputTokens,
  holdAudioSeconds,
  isPerSecondPricedProvider,
  measuredAudioSeconds,
  measuredTokenUsage,
  transcriptionRefusal,
  transcriptionRefusalCode,
  transcriptionReleaseReason,
  transcriptionRequestId,
} from '../utilities/transcription-payg.utility';

/**
 * PAYG metering for one transcription attempt (multimodal batch 4).
 *
 * Thin by design, the same shape as image-service's
 * `ImageExecutionManager#callMeteredCloudProvider`: reserve → the caller makes
 * the provider call → finalize on MEASURED units, or release. Whether the
 * uploader actually pays is auth-service's decision (ADR-082) — an exempt
 * provider, an admin, or a disabled kill switch comes back `metered: false`,
 * and finalize/release are then no-ops. Nothing here special-cases that.
 *
 * Units, per rule 37 item 17:
 *  - OPENAI (whisper-1) is priced per SECOND of input audio. The hold is sized
 *    on a worst-case clip length from the byte size; the finalize carries the
 *    `duration` verbose_json measured.
 *  - GEMINI is priced per TOKEN. The hold is sized on 32 audio tokens/s plus
 *    the instruction; the finalize carries `usageMetadata`.
 *
 * Never logs a balance: rule 37 item 4 forbids a balance beside a user id, and
 * the reservation id is what an operator needs to find the ledger rows.
 */
@Injectable()
export class TranscriptionMeterManager {
  private readonly logger = new Logger(TranscriptionMeterManager.name);

  constructor(private readonly payg: PaygMeter) {}

  /**
   * Takes the hold for one attempt, or says why not. NEVER throws for a credit
   * reason: a 402, a clamped hold, an unreachable meter and an unpriced model
   * all come back as `REFUSED`, so the candidate loop cannot read them as a
   * provider failure and fall through to a second paid provider.
   */
  async reserve(input: TranscriptionMeterInput): Promise<TranscriptionReserveOutcome> {
    const requestId = transcriptionRequestId(
      input.fileId,
      input.provider,
      input.requestScope,
      input.providerAttempt,
    );
    const seconds = holdAudioSeconds(input.sizeBytes, input.audioSeconds);
    const perSecond = isPerSecondPricedProvider(input.provider);
    const promptTokens = perSecond ? 0 : estimateGeminiPromptTokens(seconds);

    let meterHold: TranscriptionMeterHold;
    try {
      const hold = await this.payg.reserve({
        userId: input.userId,
        requestId,
        provider: input.provider,
        model: input.model,
        surface: PaygSurface.TRANSCRIPTION,
        promptTokens,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: perSecond
          ? TRANSCRIPTION_PAYG_UNIT_PRICED_OUTPUT_TOKENS
          : estimateTranscriptOutputTokens(seconds),
        // Per-second rows are held on the EXPECTED seconds. A token-priced row
        // has no audio column, so the seconds would add nothing there.
        ...(perSecond ? { audioSeconds: seconds } : {}),
      });
      meterHold = {
        hold,
        provider: input.provider,
        requestId,
        reservedAudioSeconds: seconds,
        reservedPromptTokens: promptTokens,
      };
    } catch (error: unknown) {
      const code = isPaygCreditExhaustedError(error)
        ? transcriptionRefusalCode(error.errorCode)
        : TranscriptionCreditRefusalCode.CREDIT_CHECK_UNAVAILABLE;
      this.logger.warn(
        `reserve: refused fileId=${input.fileId} requestId=${requestId} surface=${PaygSurface.TRANSCRIPTION} outcome=${code}`,
      );
      return { status: TranscriptionReserveStatus.REFUSED, ...transcriptionRefusal(code) };
    }

    if (meterHold.hold.clamped) {
      // A clamped hold means the balance cannot cover the whole clip. A
      // transcript cut off mid-recording is worse than none (rule 37 item 16:
      // a clamp must be visible), so the hold goes back and the user is told.
      await this.payg.release(meterHold.hold, 'CANCELLED');
      this.logger.warn(
        `reserve: clamped fileId=${input.fileId} reservationId=${String(meterHold.hold.reservationId)} surface=${PaygSurface.TRANSCRIPTION} outcome=${TranscriptionCreditRefusalCode.INSUFFICIENT_CREDIT}`,
      );
      return {
        status: TranscriptionReserveStatus.REFUSED,
        ...transcriptionRefusal(TranscriptionCreditRefusalCode.INSUFFICIENT_CREDIT),
      };
    }

    this.logger.log(
      `reserve: held fileId=${input.fileId} requestId=${requestId} reservationId=${String(meterHold.hold.reservationId)} surface=${PaygSurface.TRANSCRIPTION} metered=${String(meterHold.hold.metered)}`,
    );
    return { status: TranscriptionReserveStatus.HELD, meterHold };
  }

  /** Settles the hold on what the provider measured. Never throws (PaygMeter swallows). */
  async finalize(
    meterHold: TranscriptionMeterHold,
    result: TranscriptionProviderResult,
  ): Promise<void> {
    const { hold } = meterHold;
    if (isPerSecondPricedProvider(meterHold.provider)) {
      const audioSeconds = measuredAudioSeconds(
        result.durationSeconds,
        meterHold.reservedAudioSeconds,
      );
      await this.payg.finalize(
        hold,
        { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
        { toolCalls: 0, audioSeconds },
      );
      this.logFinalize(meterHold, `audioSeconds=${String(audioSeconds)}`);
      return;
    }
    const usage = measuredTokenUsage(result, meterHold.reservedPromptTokens);
    await this.payg.finalize(hold, usage, { toolCalls: 0 });
    this.logFinalize(
      meterHold,
      `promptTokens=${String(usage.promptTokens)} completionTokens=${String(usage.completionTokens)}`,
    );
  }

  /** Gives the hold back: the user got no transcript. Idempotent on the auth side. */
  async release(meterHold: TranscriptionMeterHold, error: unknown): Promise<void> {
    const reason = transcriptionReleaseReason(error);
    await this.payg.release(meterHold.hold, reason);
    this.logger.warn(
      `release: requestId=${meterHold.requestId} reservationId=${String(meterHold.hold.reservationId)} surface=${PaygSurface.TRANSCRIPTION} outcome=RELEASED reason=${reason}`,
    );
  }

  private logFinalize(meterHold: TranscriptionMeterHold, measured: string): void {
    this.logger.log(
      `finalize: requestId=${meterHold.requestId} reservationId=${String(meterHold.hold.reservationId)} surface=${PaygSurface.TRANSCRIPTION} outcome=FINALIZED ${measured}`,
    );
  }
}
