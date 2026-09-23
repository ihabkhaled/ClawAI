import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { isPaygCreditExhaustedError, type PaygHold, PaygMeter } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpGet, httpPost } from '@common/utilities';
import { BusinessException } from '../../../common/errors';
import {
  IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS,
  IMAGE_PAYG_PROMPT_TOKENS,
} from '../constants/image-payg.constants';
import { providerImageDownloadHosts } from '../utilities/provider-image-download.utility';
import {
  type ConnectorConfigResponse,
  type ExecuteImageInput,
  type GenerateImageResult,
  type ImageProviderResponse,
  type StoreImageResponse,
} from '../types/image-generation.types';
import { generateWithOpenAI } from '../adapters/openai-image.adapter';
import { generateWithGemini } from '../adapters/gemini-image.adapter';
import { generateWithStableDiffusion } from '../adapters/stable-diffusion.adapter';
import { generateWithXai } from '../adapters/xai-image.adapter';
import { XAI_DEFAULT_BASE_URL } from '../constants/xai-image.constants';
import { imageFailure } from '../adapter.utilities/provider-error.utility';
import { ImageFailureCode } from '../../../common/enums';
import { randomUUID } from 'node:crypto';
import { ComfyUIProgressAdapter } from '../../runtime-progress/adapters/comfyui-progress.adapter';
import { buildSd15MinimalWorkflow } from '../../runtime-progress/workflows/sd15-minimal.workflow';
import {
  IMAGE_PROVIDER_CONNECTORS,
  IMAGE_PROVIDER_GROK,
  IMAGE_PROVIDER_LOCAL,
  IMAGE_PROVIDER_LOCAL_COMFYUI,
  IMAGE_PROVIDER_OPENAI,
} from '../../../common/constants';

@Injectable()
export class ImageExecutionManager {
  private readonly logger = new Logger(ImageExecutionManager.name);

  constructor(
    private readonly comfyAdapter: ComfyUIProgressAdapter,
    private readonly payg: PaygMeter,
  ) {}

  async execute(params: ExecuteImageInput): Promise<GenerateImageResult> {
    const startTime = Date.now();

    this.logger.log(
      `execute: starting image generation — provider=${params.provider} model=${params.model} userId=${params.userId}`,
    );
    this.logger.debug(
      `execute: dimensions=${String(params.width ?? 1024)}x${String(params.height ?? 1024)} promptLen=${String(params.prompt.length)}`,
    );

    this.logger.debug('execute: calling provider');
    const providerResponse = await this.callProvider(params);
    this.logger.debug(
      `execute: provider returned — hasBase64=${String(Boolean(providerResponse.imageBase64))} hasUrl=${String(Boolean(providerResponse.imageUrl))} mimeType=${providerResponse.mimeType}`,
    );

    this.logger.debug('execute: storing generated image');
    const fileId = await this.storeImage(params, providerResponse);
    const latencyMs = Date.now() - startTime;

    this.logger.log(`execute: completed — fileId=${fileId} latencyMs=${String(latencyMs)}`);

    return {
      fileId,
      revisedPrompt: providerResponse.revisedPrompt ?? null,
      latencyMs,
    };
  }

  private async callProvider(params: ExecuteImageInput): Promise<ImageProviderResponse> {
    this.logger.debug(`callProvider: dispatching to ${params.provider}/${params.model}`);
    const { provider, model, prompt, width, height } = params;
    const w = width ?? 1024;
    const h = height ?? 1024;

    if (provider === IMAGE_PROVIDER_LOCAL) {
      this.logger.debug(
        `callProvider: routing to local Stable Diffusion provider — hasReference=${String(Boolean(params.referenceImageBase64))}`,
      );
      return this.callLocalProvider(
        prompt,
        w,
        h,
        params.referenceImageBase64,
        params.referenceImageMimeType,
      );
    }

    if (provider === IMAGE_PROVIDER_LOCAL_COMFYUI) {
      this.logger.debug(
        `callProvider: routing to local ComfyUI provider — model=${model} size=${String(w)}x${String(h)}`,
      );
      return this.callComfyUIProvider(prompt, w, h, model);
    }

    const connectorProvider = IMAGE_PROVIDER_CONNECTORS.get(provider);
    if (connectorProvider === undefined) {
      this.logger.error(`callProvider: unsupported image provider=${provider}`);
      throw new BusinessException(
        `Unsupported image provider: ${provider}`,
        'UNSUPPORTED_IMAGE_PROVIDER',
      );
    }

    return this.callMeteredCloudProvider(params, connectorProvider, w, h);
  }

  /**
   * One paid image generation, wrapped in reserve → finalize / release.
   *
   * Reached only after the two local branches above have returned, so nothing
   * that runs on the operator's own GPU ever pays for a round trip to the meter.
   * Whether OpenAI or Gemini actually costs this user money is auth-service's
   * decision, never this manager's — a `metered: false` hold comes back for an
   * admin, a disabled kill switch or a connector an operator has flagged free
   * (ADR-082).
   */
  private async callMeteredCloudProvider(
    params: ExecuteImageInput,
    connectorProvider: string,
    width: number,
    height: number,
  ): Promise<ImageProviderResponse> {
    this.logger.debug(`callMeteredCloudProvider: fetching config for ${connectorProvider}`);
    const config = await this.fetchConnectorConfig(connectorProvider);
    const hold = await this.reserveImageHold(params, connectorProvider);

    try {
      // `hold.maxOutputTokens` is DELIBERATELY NOT PASSED to either image API.
      // An image response is not token-bounded: `POST /images/generations` has
      // no max-token field, and `:generateContent` with an IMAGE response
      // modality ignores one. There is no request parameter for the affordability
      // clamp (D6) to land in, so for this surface the clamp only sizes the hold
      // — it cannot physically bound the answer the way it does for text.
      const response = await this.dispatchCloudProvider(params, config, width, height);
      await this.finalizeImageHold(hold, response, connectorProvider);
      return response;
    } catch (error: unknown) {
      // The user got no image, so the hold goes back rather than being settled.
      // Release is idempotent on the auth side: a double release is a no-op,
      // never a double refund.
      await this.payg.release(hold, 'PROVIDER_ERROR');
      throw error;
    }
  }

  private async dispatchCloudProvider(
    params: ExecuteImageInput,
    config: ConnectorConfigResponse,
    width: number,
    height: number,
  ): Promise<ImageProviderResponse> {
    if (params.provider === IMAGE_PROVIDER_GROK) {
      this.logger.debug('dispatchCloudProvider: routing to xAI image generation');
      return generateWithXai(
        config.baseUrl ?? XAI_DEFAULT_BASE_URL,
        config.apiKey,
        params.prompt,
        params.model,
      );
    }
    if (params.provider === IMAGE_PROVIDER_OPENAI) {
      this.logger.debug('dispatchCloudProvider: routing to OpenAI image generation');
      return generateWithOpenAI(
        config.baseUrl ?? 'https://api.openai.com/v1',
        config.apiKey,
        params.prompt,
        params.model,
        width,
        height,
        params.quality,
        params.style,
      );
    }
    this.logger.debug(
      `dispatchCloudProvider: routing to Gemini — hasReference=${String(Boolean(params.referenceImageBase64))}`,
    );
    return generateWithGemini(
      config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta',
      config.apiKey,
      params.prompt,
      params.model,
      params.referenceImageBase64,
      params.referenceImageMimeType,
    );
  }

  /**
   * Takes the hold, or converts the wallet's refusal into this service's own
   * error vocabulary.
   *
   * A 402 becomes a `BusinessException` carrying the meter's `errorCode`, which
   * `ImageGenerationService` then stores on the row — the only way a refusal on
   * a fire-and-forget job becomes visible to the person waiting for it.
   */
  private async reserveImageHold(
    params: ExecuteImageInput,
    connectorProvider: string,
  ): Promise<PaygHold> {
    try {
      const hold = await this.payg.reserve({
        userId: params.userId,
        requestId: params.requestId,
        provider: connectorProvider,
        model: params.model,
        surface: PaygSurface.IMAGE,
        promptTokens: IMAGE_PAYG_PROMPT_TOKENS,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS,
      });
      this.logger.log(
        `reserveImageHold: provider=${connectorProvider} metered=${String(hold.metered)} held=${String(hold.heldMicroUsd)}`,
      );
      return hold;
    } catch (error: unknown) {
      if (isPaygCreditExhaustedError(error)) {
        this.logger.warn(
          `reserveImageHold: refused provider=${connectorProvider} code=${error.errorCode} available=${String(error.availableMicroUsd)}`,
        );
        throw new BusinessException(
          'Image generation is not covered by the available credit',
          error.errorCode,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      this.logger.error('reserveImageHold: unexpected meter failure');
      throw error;
    }
  }

  /**
   * Settles the hold against whatever the provider was willing to report.
   *
   * Gemini reports real `usageMetadata`, so a Gemini image settles on measured
   * numbers. OpenAI images report NOTHING — the `/images/generations` response
   * has no `usage` block at all — so those settle at zero tokens and the cost
   * has to come from the per-unit image rate instead. See the finding recorded
   * in `IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS`: `calculateCostMicroUsd` does not
   * currently sum `imagePerUnitMicroUsd`, so a zero-token image finalize prices
   * at zero and the whole hold is released.
   */
  private async finalizeImageHold(
    hold: PaygHold,
    response: ImageProviderResponse,
    connectorProvider: string,
  ): Promise<void> {
    const usage = response.usage;
    if (usage === undefined) {
      this.logger.warn(
        `finalizeImageHold: ${connectorProvider} reported no token usage — settling at zero tokens; the per-unit image rate is what should carry this cost`,
      );
    }
    await this.payg.finalize(
      hold,
      {
        promptTokens: usage?.promptTokens ?? 0,
        completionTokens: usage?.completionTokens ?? 0,
        cachedPromptTokens: usage?.cachedPromptTokens ?? 0,
        reasoningTokens: usage?.reasoningTokens ?? 0,
      },
      { toolCalls: 0 },
    );
  }

  private async callLocalProvider(
    prompt: string,
    width: number,
    height: number,
    referenceImageBase64?: string,
    referenceImageMimeType?: string,
  ): Promise<ImageProviderResponse> {
    const config = AppConfig.get();
    this.logger.debug(
      `callLocalProvider: calling Stable Diffusion at ${config.STABLE_DIFFUSION_URL}`,
    );
    try {
      const result = await generateWithStableDiffusion(
        config.STABLE_DIFFUSION_URL,
        prompt,
        width,
        height,
        referenceImageBase64,
        referenceImageMimeType,
      );
      this.logger.debug('callLocalProvider: Stable Diffusion returned successfully');
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Stable Diffusion unavailable';
      this.logger.error(`callLocalProvider: local image generation failed — ${msg}`);
      throw new BusinessException(
        `Local image generation failed: ${msg}`,
        'LOCAL_IMAGE_GENERATION_FAILED',
      );
    }
  }

  private async storeImage(
    params: ExecuteImageInput,
    response: ImageProviderResponse,
  ): Promise<string> {
    this.logger.debug(`storeImage: storing generated image for user ${params.userId}`);
    const config = AppConfig.get();
    let base64Data: string;

    if (response.imageBase64) {
      this.logger.debug(
        `storeImage: using base64 data — length=${String(response.imageBase64.length)}`,
      );
      base64Data = response.imageBase64;
    } else if (response.imageUrl) {
      this.logger.debug('storeImage: downloading image from provider URL');
      base64Data = await this.downloadImageAsBase64(response.imageUrl);
      this.logger.debug(`storeImage: downloaded — base64Len=${String(base64Data.length)}`);
    } else {
      this.logger.error('storeImage: provider returned neither URL nor base64 data');
      throw new BusinessException(
        'Provider returned neither URL nor base64 image data',
        'IMAGE_RESPONSE_EMPTY',
      );
    }

    const extension = response.mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const timestamp = Date.now();
    const filename = `generated-${timestamp}.${extension}`;
    this.logger.debug(`storeImage: storing as filename=${filename} mimeType=${response.mimeType}`);

    this.logger.debug(`storeImage: sending to file service at ${config.FILE_SERVICE_URL}`);
    const storeResponse = await this.postToFileService(
      params.userId,
      filename,
      response.mimeType,
      base64Data,
    );

    this.logger.debug(`storeImage: file stored — fileId=${storeResponse.fileId}`);
    return storeResponse.fileId;
  }

  /**
   * Hands the generated bytes to file-service.
   *
   * A failure HERE is ours, not the provider's: the provider already produced
   * (and billed) the image. It used to surface as `PROVIDER_FAILURE` — "Image
   * generation failed" — while file-service was simply down, which sent every
   * investigation to the wrong service and let the AUTO fallback chain pay two
   * more providers for images it would lose the same way.
   */
  private async postToFileService(
    userId: string,
    filename: string,
    mimeType: string,
    base64Data: string,
  ): Promise<StoreImageResponse> {
    const config = AppConfig.get();
    try {
      return await httpPost<StoreImageResponse>(
        `${config.FILE_SERVICE_URL}/api/v1/internal/files/store-image`,
        { userId, filename, mimeType, base64Data },
        { timeout: 30_000, headers: { Authorization: buildInterServiceAuthHeader() } },
      );
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`storeImage: file-service refused the generated image — ${detail}`);
      throw imageFailure(ImageFailureCode.STORAGE_FAILED, detail);
    }
  }

  /**
   * The ONE call in this service whose host nobody configured.
   *
   * `url` is not configuration: it is whatever the provider put in its own
   * response. Only the OpenAI adapter produces one (dall-e-2/dall-e-3 answer
   * with a link rather than base64; gpt-image-1 never does), and that link is
   * NOT served from the connector's configured `baseUrl` — a dall-e image lives
   * on a blob host that changes per request. So there is no configured base URL
   * whose host this download could be declared against, and a bare
   * `declaredHost(url)` here would allowlist whatever the response said, which
   * is no check at all.
   *
   * `providerImageDownloadHosts` is the honest version: it refuses every
   * private, loopback and link-local host FIRST — the thing a provider image
   * can never legitimately be — and only then hands the host to the guard, so
   * the protocol, embedded-credential, cloud-metadata and no-redirect checks
   * all still run instead of the guard standing down. See that utility for the
   * residual DNS gap (TD-031).
   */
  private async downloadImageAsBase64(url: string): Promise<string> {
    this.logger.debug('downloadImageAsBase64: downloading image from provider URL');
    const startTime = Date.now();
    const imageBuffer = await httpGet<ArrayBuffer>(
      url,
      {
        responseType: 'arraybuffer',
        timeout: 60_000,
      },
      providerImageDownloadHosts(url),
    );
    const durationMs = Date.now() - startTime;
    const base64 = Buffer.from(imageBuffer).toString('base64');
    this.logger.debug(
      `downloadImageAsBase64: downloaded — durationMs=${String(durationMs)} base64Len=${String(base64.length)}`,
    );
    return base64;
  }

  private async callComfyUIProvider(
    prompt: string,
    width: number,
    height: number,
    checkpointName: string | undefined,
  ): Promise<ImageProviderResponse> {
    const config = AppConfig.get();
    const baseUrl = config.COMFYUI_BASE_URL;
    const clientId = `clawai-${randomUUID()}`;
    const runId = randomUUID();
    this.logger.debug(
      `callComfyUIProvider: baseUrl=${baseUrl} clientId=${clientId} runId=${runId}`,
    );
    const workflow = buildSd15MinimalWorkflow(clientId, {
      prompt,
      width,
      height,
      checkpointName,
    });
    try {
      const result = await this.comfyAdapter.streamGenerate({
        runId,
        baseUrl,
        workflow,
        onEvent: () => {},
      });
      this.logger.debug(
        `callComfyUIProvider: completed promptId=${result.promptId} filename=${result.filename} nodes=${String(result.nodeTimings.length)}`,
      );
      return {
        imageBase64: result.imageBase64,
        revisedPrompt: undefined,
        mimeType: result.mimeType,
        width,
        height,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'ComfyUI unavailable';
      this.logger.error(`callComfyUIProvider: failed — ${msg}`);
      throw new BusinessException(
        `ComfyUI image generation failed: ${msg}`,
        'COMFYUI_IMAGE_GENERATION_FAILED',
      );
    }
  }

  private async fetchConnectorConfig(provider: string): Promise<ConnectorConfigResponse> {
    this.logger.debug(`fetchConnectorConfig: fetching config for provider=${provider}`);
    const config = AppConfig.get();
    const encoded = encodeURIComponent(provider);
    const url = `${config.CONNECTOR_SERVICE_URL}/api/v1/internal/connectors/config?provider=${encoded}`;

    try {
      this.logger.debug(`fetchConnectorConfig: requesting ${url}`);
      const result = await httpGet<ConnectorConfigResponse>(url, { timeout: 10_000 });
      this.logger.debug(
        `fetchConnectorConfig: config received — hasApiKey=${String(Boolean(result.apiKey))} baseUrl=${result.baseUrl ?? 'default'}`,
      );
      return result;
    } catch {
      // connector-service answers 404 when no enabled connector exists for the
      // provider — the usual cause, and one only an administrator can fix.
      this.logger.error(`fetchConnectorConfig: failed to fetch config for ${provider}`);
      throw imageFailure(ImageFailureCode.CONNECTOR_NOT_CONFIGURED, provider);
    }
  }
}
