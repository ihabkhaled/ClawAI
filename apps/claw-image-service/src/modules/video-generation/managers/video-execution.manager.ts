import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { isPaygCreditExhaustedError, type PaygHold, PaygMeter } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';
import { buildInterServiceAuthHeader, httpGet, httpPost } from '@common/utilities';

import { AppConfig } from '../../../app/config/app.config';
import { VIDEO_PROVIDER_CONNECTORS, VIDEO_PROVIDER_GEMINI } from '../../../common/constants';
import { VideoFailureCode } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import {
  GEMINI_DEFAULT_BASE_URL,
  VIDEO_CANCELLED_RELEASE_REASON,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_WAIT_MS,
  VIDEO_MIME_TYPE,
  VIDEO_PAYG_NOMINAL_OUTPUT_TOKENS,
  VIDEO_PAYG_PROMPT_TOKENS,
  VIDEO_POLL_INTERVAL_MS,
  VIDEO_STALE_RELEASE_REASON,
  VIDEO_STORE_FAILED_RELEASE_REASON,
  VIDEO_STORE_TIMEOUT_MS,
  XAI_DEFAULT_BASE_URL,
} from '../constants/video-generation.constants';
import { geminiVeoClient, xaiVideoClient } from '../constants/video-provider-clients.constants';
import type {
  ConnectorConfigResponse,
  ExecuteVideoInput,
  ExecuteVideoResult,
  StoreVideoResponse,
  VideoProviderClient,
  VideoProviderConfig,
  VideoSettlement,
} from '../types/video-generation.types';
import { videoCancelled } from '../utilities/video-cancel.utility';
import { videoPriceKey } from '../utilities/video-price-key.utility';
import { videoFailure } from '../utilities/video-provider-error.utility';
import { abandonedVideoHold, videoSettlement } from '../utilities/video-settlement.utility';

const CLIENTS: ReadonlyMap<string, VideoProviderClient> = new Map([
  ['VIDEO_GEMINI', geminiVeoClient],
  ['VIDEO_GROK', xaiVideoClient],
]);

/**
 * One paid video generation: reserve a hold sized on the clip's SECONDS, start the
 * provider's long-running job, poll it, fetch and store the clip, then hand back a
 * settlement the caller finalizes only after the asset row is written (rule 37
 * item 17). A failure anywhere before that releases the hold: the user got no
 * video, so the user pays nothing.
 */
@Injectable()
export class VideoExecutionManager {
  private readonly logger = new Logger(VideoExecutionManager.name);

  constructor(private readonly payg: PaygMeter) {}

  async execute(input: ExecuteVideoInput): Promise<ExecuteVideoResult> {
    const startedAt = Date.now();
    const connector = VIDEO_PROVIDER_CONNECTORS.get(input.provider);
    const client = CLIENTS.get(input.provider);
    if (connector === undefined || client === undefined) {
      throw new BusinessException(
        `Unsupported video provider: ${input.provider}`,
        'UNSUPPORTED_VIDEO_PROVIDER',
      );
    }
    await this.assertNotCancelled(input, undefined);
    const config = await this.fetchConnectorConfig(connector, input.provider);
    const hold = await this.reserveVideoHold(input, connector);
    await this.recordHold(input, hold);

    let bytes: Buffer;
    let seconds = input.durationSeconds;
    try {
      await this.assertNotCancelled(input, hold);
      const operationId = await client.start(config, input);
      await input.onOperation(operationId);
      const done = await this.waitForVideo(input, client, config, operationId, hold);
      seconds = this.measuredSeconds(input, done.durationSeconds);
      bytes = await client.download(config, done.downloadUrl);
      await this.assertNotCancelled(input, hold);
    } catch (error: unknown) {
      // Idempotent on the auth side: a hold already released is a no-op.
      await this.payg.release(hold, 'PROVIDER_ERROR');
      throw error;
    }
    if (bytes.length === 0) {
      await this.payg.release(hold, 'PROVIDER_ERROR');
      throw videoFailure(VideoFailureCode.NO_VIDEO_RETURNED, 'the provider sent an empty file');
    }
    if (bytes.length > VIDEO_MAX_BYTES) {
      await this.payg.release(hold, VIDEO_STORE_FAILED_RELEASE_REASON);
      throw videoFailure(VideoFailureCode.VIDEO_TOO_LARGE, `${String(bytes.length)} bytes`);
    }

    const settlement = videoSettlement(hold, seconds);
    let fileId: string;
    try {
      fileId = await this.storeVideo(input, bytes);
    } catch (error: unknown) {
      await this.releaseUnpersisted(settlement);
      throw error;
    }
    return {
      fileId,
      sizeBytes: bytes.length,
      mimeType: VIDEO_MIME_TYPE,
      durationSeconds: seconds,
      latencyMs: Date.now() - startedAt,
      settlement,
    };
  }

  /** Finalizes a paid attempt on its measured seconds, after the clip is persisted. */
  async settle(settlement: VideoSettlement): Promise<void> {
    await this.payg.finalize(settlement.hold, settlement.usage, settlement.calls);
    this.logger.log(
      `videoSettlement reservationId=${String(settlement.hold.reservationId)} outcome=FINALIZED videoSeconds=${String(settlement.calls.videoSeconds ?? 0)} heldMicroUsd=${String(settlement.hold.heldMicroUsd)}`,
    );
  }

  /** Gives the hold back when the clip could not be persisted. */
  async releaseUnpersisted(settlement: VideoSettlement): Promise<void> {
    await this.payg.release(settlement.hold, VIDEO_STORE_FAILED_RELEASE_REASON);
    this.logger.warn(
      `videoSettlement reservationId=${String(settlement.hold.reservationId)} outcome=RELEASED reason=STORE_FAILED`,
    );
  }

  /** Gives back the hold of an attempt whose process died (stale-job recovery). */
  async releaseAbandoned(reservationId: string, generationId: string): Promise<void> {
    await this.payg.release(abandonedVideoHold(reservationId), VIDEO_STALE_RELEASE_REASON);
    this.logger.log(
      `videoSettlement reservationId=${reservationId} generationId=${generationId} outcome=RELEASED reason=INTERRUPTED`,
    );
  }

  /** Overridable in tests so a poll loop does not really wait. */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private async waitForVideo(
    input: ExecuteVideoInput,
    client: VideoProviderClient,
    config: VideoProviderConfig,
    operationId: string,
    hold: PaygHold,
  ): Promise<{ downloadUrl: string; durationSeconds?: number }> {
    const deadline = Date.now() + VIDEO_MAX_WAIT_MS;
    while (Date.now() < deadline) {
      await this.sleep(VIDEO_POLL_INTERVAL_MS);
      await this.assertNotCancelled(input, hold);
      const result = await client.poll(config, operationId);
      if (result.state === 'DONE') {
        return {
          downloadUrl: result.downloadUrl,
          ...(result.durationSeconds === undefined
            ? {}
            : { durationSeconds: result.durationSeconds }),
        };
      }
      if (result.state === 'FAILED') {
        this.logger.warn(
          `waitForVideo: provider=${input.provider} generationId=${input.generationId} failed — ${result.detail}`,
        );
        throw videoFailure(result.code, result.detail);
      }
    }
    throw videoFailure(
      VideoFailureCode.GENERATION_TIMED_OUT,
      `no result after ${String(VIDEO_MAX_WAIT_MS / 1000)}s`,
    );
  }

  /** Never bills more than was held, and never less than the clip that was asked for is trusted. */
  private measuredSeconds(input: ExecuteVideoInput, reported: number | undefined): number {
    return reported === undefined || reported <= 0
      ? input.durationSeconds
      : Math.min(reported, input.durationSeconds);
  }

  private async assertNotCancelled(
    input: ExecuteVideoInput,
    hold: PaygHold | undefined,
  ): Promise<void> {
    if (!(await input.isCancelled())) {
      return;
    }
    if (hold !== undefined) {
      await this.payg.release(hold, VIDEO_CANCELLED_RELEASE_REASON);
    }
    this.logger.log(
      `execute: cancelled — provider=${input.provider} generationId=${input.generationId} holdReleased=${String(hold !== undefined)}`,
    );
    throw videoCancelled();
  }

  private async reserveVideoHold(input: ExecuteVideoInput, connector: string): Promise<PaygHold> {
    try {
      const hold = await this.payg.reserve({
        userId: input.userId,
        requestId: input.requestId,
        provider: connector,
        // The PRICE row: the bare model id the routing seed prices per second.
        model: videoPriceKey(input.model),
        surface: PaygSurface.VIDEO,
        promptTokens: VIDEO_PAYG_PROMPT_TOKENS,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: VIDEO_PAYG_NOMINAL_OUTPUT_TOKENS,
        // EXPECTED seconds: the whole hold, since a video model has no token price.
        videoSeconds: input.durationSeconds,
      });
      this.logger.log(
        `reserveVideoHold: provider=${connector} model=${input.model} seconds=${String(input.durationSeconds)} metered=${String(hold.metered)} held=${String(hold.heldMicroUsd)}`,
      );
      return hold;
    } catch (error: unknown) {
      if (isPaygCreditExhaustedError(error)) {
        this.logger.warn(
          `reserveVideoHold: refused provider=${connector} code=${error.errorCode} available=${String(error.availableMicroUsd)}`,
        );
        throw new BusinessException(
          'Video generation is not covered by the available credit',
          error.errorCode,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      this.logger.error('reserveVideoHold: unexpected meter failure');
      throw error;
    }
  }

  private async recordHold(input: ExecuteVideoInput, hold: PaygHold): Promise<void> {
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
  ): Promise<VideoProviderConfig> {
    const config = AppConfig.get();
    const url = `${config.CONNECTOR_SERVICE_URL}/api/v1/internal/connectors/config?provider=${encodeURIComponent(connector)}`;
    try {
      const result = await httpGet<ConnectorConfigResponse>(url, { timeout: 10_000 });
      return {
        apiKey: result.apiKey,
        baseUrl:
          result.baseUrl ??
          (provider === VIDEO_PROVIDER_GEMINI ? GEMINI_DEFAULT_BASE_URL : XAI_DEFAULT_BASE_URL),
      };
    } catch {
      this.logger.error(`fetchConnectorConfig: failed to fetch config for ${connector}`);
      throw videoFailure(VideoFailureCode.CONNECTOR_NOT_CONFIGURED, connector);
    }
  }

  private async storeVideo(input: ExecuteVideoInput, bytes: Buffer): Promise<string> {
    const config = AppConfig.get();
    try {
      const stored = await httpPost<StoreVideoResponse>(
        `${config.FILE_SERVICE_URL}/api/v1/internal/files/store-generated-video`,
        {
          userId: input.userId,
          filename: `generated-${String(Date.now())}.mp4`,
          mimeType: VIDEO_MIME_TYPE,
          base64Data: bytes.toString('base64'),
        },
        {
          timeout: VIDEO_STORE_TIMEOUT_MS,
          headers: { Authorization: buildInterServiceAuthHeader() },
        },
      );
      return stored.fileId;
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`storeVideo: file-service refused the generated video — ${detail}`);
      throw videoFailure(VideoFailureCode.STORAGE_FAILED, detail);
    }
  }
}
