import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { isPaygCreditExhaustedError, type PaygHold, PaygMeter } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';
import { buildInterServiceAuthHeader, httpGet, httpPost } from '@common/utilities';

import { AppConfig } from '../../../app/config/app.config';
import { AUDIO_PROVIDER_CONNECTORS, AUDIO_PROVIDER_GEMINI } from '../../../common/constants';
import { AudioFailureCode } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import { AUDIO_CLIENTS } from '../constants/audio-provider-clients.constants';
import {
  AUDIO_CANCELLED_RELEASE_REASON,
  AUDIO_CONNECTOR_TIMEOUT_MS,
  AUDIO_MAX_BYTES,
  AUDIO_STALE_RELEASE_REASON,
  AUDIO_STORE_FAILED_RELEASE_REASON,
  AUDIO_STORE_TIMEOUT_MS,
  GEMINI_DEFAULT_BASE_URL,
  OPENAI_DEFAULT_BASE_URL,
} from '../constants/audio-generation.constants';
import type {
  AudioProviderConfig,
  AudioSettlement,
  ConnectorConfigResponse,
  ExecuteAudioInput,
  ExecuteAudioResult,
  StoreAudioResponse,
} from '../types/audio-generation.types';
import { audioCancelled } from '../utilities/audio-cancel.utility';
import { audioFailure } from '../utilities/audio-provider-error.utility';
import {
  abandonedAudioHold,
  audioHoldUnits,
  audioMeterMode,
  audioSettlement,
} from '../utilities/audio-settlement.utility';
import { audioPriceKey } from '../utilities/audio-wire.utility';

const FILE_EXTENSIONS: ReadonlyMap<string, string> = new Map([
  ['audio/mpeg', 'mp3'],
  ['audio/wav', 'wav'],
]);

/**
 * One paid audio generation: reserve a hold sized on the expected units (characters,
 * one song, or Gemini tokens), make the provider's single synchronous call, store the
 * file, then hand back a settlement the caller finalizes only after the asset row is
 * written (rule 37 item 17). A failure anywhere before that releases the hold: the
 * user got no audio, so the user pays nothing.
 */
@Injectable()
export class AudioExecutionManager {
  private readonly logger = new Logger(AudioExecutionManager.name);

  constructor(private readonly payg: PaygMeter) {}

  async execute(input: ExecuteAudioInput): Promise<ExecuteAudioResult> {
    const startedAt = Date.now();
    const connector = AUDIO_PROVIDER_CONNECTORS.get(input.provider);
    const client = AUDIO_CLIENTS.get(`${input.kind}:${input.provider}`);
    if (connector === undefined || client === undefined) {
      throw new BusinessException(
        `Unsupported audio provider or kind: ${input.kind} ${input.provider}`,
        'UNSUPPORTED_AUDIO_PROVIDER',
      );
    }
    await this.assertNotCancelled(input, undefined);
    const config = await this.fetchConnectorConfig(connector, input.provider);
    const units = audioHoldUnits(input);
    const hold = await this.reserveHold(input, connector, units);
    await this.recordHold(input, hold);

    let result: Awaited<ReturnType<typeof client.synthesize>>;
    try {
      await this.assertNotCancelled(input, hold);
      this.assertNotClamped(hold);
      result = await client.synthesize(config, {
        model: input.model,
        prompt: input.prompt,
        voice: input.voice,
        format: input.format,
        ...(audioMeterMode(input.kind, input.provider, input.model) === 'TOKENS'
          ? { maxOutputTokens: hold.maxOutputTokens }
          : {}),
      });
      await this.assertNotCancelled(input, hold);
    } catch (error: unknown) {
      // Idempotent on the auth side: a hold already released is a no-op.
      await this.payg.release(hold, 'PROVIDER_ERROR');
      throw error;
    }
    if (result.bytes.length === 0) {
      await this.payg.release(hold, 'PROVIDER_ERROR');
      throw audioFailure(AudioFailureCode.NO_AUDIO_RETURNED, 'the provider sent an empty file');
    }
    if (result.bytes.length > AUDIO_MAX_BYTES) {
      await this.payg.release(hold, AUDIO_STORE_FAILED_RELEASE_REASON);
      throw audioFailure(AudioFailureCode.AUDIO_TOO_LARGE, `${String(result.bytes.length)} bytes`);
    }

    const settlement = audioSettlement(hold, input, result.usage, units);
    let fileId: string;
    try {
      fileId = await this.storeAudio(input, result.bytes, result.mimeType);
    } catch (error: unknown) {
      await this.releaseUnpersisted(settlement);
      throw error;
    }
    return {
      fileId,
      sizeBytes: result.bytes.length,
      mimeType: result.mimeType,
      durationSeconds: result.durationSeconds,
      latencyMs: Date.now() - startedAt,
      settlement,
    };
  }

  /** Finalizes a paid attempt on its measured units, after the audio is persisted. */
  async settle(settlement: AudioSettlement): Promise<void> {
    await this.payg.finalize(settlement.hold, settlement.usage, settlement.calls);
    this.logger.log(
      `audioSettlement reservationId=${String(settlement.hold.reservationId)} outcome=FINALIZED heldMicroUsd=${String(settlement.hold.heldMicroUsd)}`,
    );
  }

  /** Gives the hold back when the audio could not be persisted. */
  async releaseUnpersisted(settlement: AudioSettlement): Promise<void> {
    await this.payg.release(settlement.hold, AUDIO_STORE_FAILED_RELEASE_REASON);
    this.logger.warn(
      `audioSettlement reservationId=${String(settlement.hold.reservationId)} outcome=RELEASED reason=STORE_FAILED`,
    );
  }

  /** Gives back the hold of an attempt whose process died (stale-job recovery). */
  async releaseAbandoned(reservationId: string, generationId: string): Promise<void> {
    await this.payg.release(abandonedAudioHold(reservationId), AUDIO_STALE_RELEASE_REASON);
    this.logger.log(
      `audioSettlement reservationId=${reservationId} generationId=${generationId} outcome=RELEASED reason=INTERRUPTED`,
    );
  }

  /**
   * Gemini TTS bills output tokens, so a ceiling clamped to the balance would cut the
   * speech off mid-sentence. The money goes back and the user is told, never a partial.
   */
  private assertNotClamped(hold: PaygHold): void {
    if (!hold.clamped) {
      return;
    }
    throw new BusinessException(
      'Audio generation is not covered by the available credit',
      'PAYG_CREDIT_CLAMPED',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  private async assertNotCancelled(
    input: ExecuteAudioInput,
    hold: PaygHold | undefined,
  ): Promise<void> {
    if (!(await input.isCancelled())) {
      return;
    }
    if (hold !== undefined) {
      await this.payg.release(hold, AUDIO_CANCELLED_RELEASE_REASON);
    }
    this.logger.log(
      `execute: cancelled — provider=${input.provider} generationId=${input.generationId} holdReleased=${String(hold !== undefined)}`,
    );
    throw audioCancelled();
  }

  private async reserveHold(
    input: ExecuteAudioInput,
    connector: string,
    units: ReturnType<typeof audioHoldUnits>,
  ): Promise<PaygHold> {
    try {
      const hold = await this.payg.reserve({
        userId: input.userId,
        requestId: input.requestId,
        provider: connector,
        // The PRICE row: the bare model id the routing seed prices.
        model: audioPriceKey(input.model),
        surface: PaygSurface.TTS,
        cachedPromptTokens: 0,
        ...units,
      });
      this.logger.log(
        `reserveHold: provider=${connector} model=${input.model} kind=${input.kind} metered=${String(hold.metered)} held=${String(hold.heldMicroUsd)}`,
      );
      return hold;
    } catch (error: unknown) {
      if (isPaygCreditExhaustedError(error)) {
        this.logger.warn(
          `reserveHold: refused provider=${connector} code=${error.errorCode} available=${String(error.availableMicroUsd)}`,
        );
        throw new BusinessException(
          'Audio generation is not covered by the available credit',
          error.errorCode,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      this.logger.error('reserveHold: unexpected meter failure');
      throw error;
    }
  }

  private async recordHold(input: ExecuteAudioInput, hold: PaygHold): Promise<void> {
    if (!hold.metered || hold.reservationId === null) {
      return;
    }
    try {
      await input.onHoldReserved(hold.reservationId);
    } catch {
      this.logger.warn(
        `recordHold: could not store reservationId=${hold.reservationId} generationId=${input.generationId}`,
      );
    }
  }

  private async fetchConnectorConfig(
    connector: string,
    provider: string,
  ): Promise<AudioProviderConfig> {
    const config = AppConfig.get();
    const url = `${config.CONNECTOR_SERVICE_URL}/api/v1/internal/connectors/config?provider=${encodeURIComponent(connector)}`;
    try {
      const result = await httpGet<ConnectorConfigResponse>(url, {
        timeout: AUDIO_CONNECTOR_TIMEOUT_MS,
        headers: { Authorization: buildInterServiceAuthHeader() },
      });
      return {
        apiKey: result.apiKey,
        baseUrl:
          result.baseUrl ??
          (provider === AUDIO_PROVIDER_GEMINI ? GEMINI_DEFAULT_BASE_URL : OPENAI_DEFAULT_BASE_URL),
      };
    } catch {
      this.logger.error(`fetchConnectorConfig: failed to fetch config for ${connector}`);
      throw audioFailure(AudioFailureCode.CONNECTOR_NOT_CONFIGURED, connector);
    }
  }

  private async storeAudio(
    input: ExecuteAudioInput,
    bytes: Buffer,
    mimeType: string,
  ): Promise<string> {
    const config = AppConfig.get();
    try {
      const stored = await httpPost<StoreAudioResponse>(
        `${config.FILE_SERVICE_URL}/api/v1/internal/files/store-generated-audio`,
        {
          userId: input.userId,
          filename: `generated-${input.kind.toLowerCase()}-${String(Date.now())}.${FILE_EXTENSIONS.get(mimeType) ?? 'mp3'}`,
          mimeType,
          base64Data: bytes.toString('base64'),
          transcript: input.prompt.slice(0, 20_000),
        },
        {
          timeout: AUDIO_STORE_TIMEOUT_MS,
          headers: { Authorization: buildInterServiceAuthHeader() },
        },
      );
      return stored.fileId;
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`storeAudio: file-service refused the generated audio — ${detail}`);
      throw audioFailure(AudioFailureCode.STORAGE_FAILED, detail);
    }
  }
}
