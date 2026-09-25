import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { resolveOpenAiImageQuality } from '../utilities/openai-image-quality.utility';
import { isPaygCreditExhaustedError, type PaygHold, PaygMeter } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpGet, httpPost } from '@common/utilities';
import { BusinessException } from '../../../common/errors';
import {
  IMAGE_PAYG_IMAGES_PER_REQUEST,
  IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS,
  IMAGE_PAYG_PROMPT_TOKENS,
  IMAGE_STORE_FAILED_LOG_REASON,
  IMAGE_STORE_FAILED_RELEASE_REASON,
} from '../constants/image-payg.constants';
import { imageSettlement } from '../utilities/image-settlement.utility';
import { meteredImageModelKey } from '../utilities/image-price-key.utility';
import { providerImageDownloadHosts } from '../utilities/provider-image-download.utility';
import {
  type ConnectorConfigResponse,
  type ExecuteImageInput,
  type GenerateImageResult,
  type ImageProviderOutcome,
  type ImageProviderResponse,
  type ImageReference,
  type ImageReferenceFileResponse,
  type ImageSettlement,
  type StoreImageResponse,
} from '../types/image-generation.types';
import { type ImageProgressCallback } from '../types/image-progress.types';
import {
  IMAGE_REFERENCE_CONTENT_PATH,
  IMAGE_REFERENCE_FETCH_TIMEOUT_MS,
  IMAGE_REFERENCE_MAX_BASE64_LENGTH,
} from '../constants/image-reference.constants';
import { SD_DEFAULT_STEPS } from '../constants/stable-diffusion.constants';
import { generateWithOpenAI } from '../adapters/openai-image.adapter';
import { generateWithGemini } from '../adapters/gemini-image.adapter';
import { generateWithStableDiffusion } from '../adapters/stable-diffusion.adapter';
import { generateWithXai } from '../adapters/xai-image.adapter';
import { XAI_DEFAULT_BASE_URL } from '../constants/xai-image.constants';
import {
  IMAGE_CANCELLED_LOG_REASON,
  IMAGE_CANCELLED_RELEASE_REASON,
} from '../constants/image-cancel.constants';
import { imageCancelled } from '../utilities/image-cancel.utility';
import { imageFailure } from '../adapter.utilities/provider-error.utility';
import { ImageFailureCode, ImageProviderCancel } from '../../../common/enums';
import { randomUUID } from 'node:crypto';
import { ComfyUIProgressAdapter } from '../../runtime-progress/adapters/comfyui-progress.adapter';
import { StableDiffusionWebuiProgressAdapter } from '../../runtime-progress/adapters/stable-diffusion-webui-progress.adapter';
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
  /**
   * generationId → ComfyUI prompt id for the runs executing IN THIS PROCESS.
   * Set when ComfyUI accepts the workflow, removed when the call settles.
   * A cancel that lands on another replica finds nothing here and does not
   * interrupt (discard only) — never an untargeted interrupt.
   */
  private readonly comfyPromptIds = new Map<string, string>();

  constructor(
    private readonly comfyAdapter: ComfyUIProgressAdapter,
    private readonly payg: PaygMeter,
    private readonly sdProgressAdapter: StableDiffusionWebuiProgressAdapter,
  ) {}

  async execute(params: ExecuteImageInput): Promise<GenerateImageResult> {
    const startTime = Date.now();

    this.logger.log(
      `execute: starting image generation — provider=${params.provider} model=${params.model} userId=${params.userId}`,
    );
    this.logger.debug(
      `execute: dimensions=${String(params.width ?? 1024)}x${String(params.height ?? 1024)} promptLen=${String(params.prompt.length)}`,
    );

    await this.assertNotCancelled(params, undefined);
    this.logger.debug('execute: calling provider');
    const { response: providerResponse, settlement } = await this.callProvider(params);
    // A cancel that landed while the provider worked: the result is dropped
    // BEFORE it is stored, and the hold goes back rather than being settled.
    await this.assertNotCancelled(params, settlement);
    this.logger.debug(
      `execute: provider returned — hasBase64=${String(Boolean(providerResponse.imageBase64))} hasUrl=${String(Boolean(providerResponse.imageUrl))} mimeType=${providerResponse.mimeType}`,
    );

    this.logger.debug('execute: storing generated image');
    let fileId: string;
    try {
      fileId = await this.storeImage(params, providerResponse);
    } catch (error: unknown) {
      // The hold is still OPEN: no file means no image for the user, so the
      // user pays nothing and the platform absorbs the provider cost.
      await this.releaseUnpersisted(settlement);
      throw error;
    }
    const latencyMs = Date.now() - startTime;

    this.logger.log(`execute: completed — fileId=${fileId} latencyMs=${String(latencyMs)}`);

    return {
      fileId,
      revisedPrompt: providerResponse.revisedPrompt ?? null,
      latencyMs,
      ...(settlement === undefined ? {} : { settlement }),
    };
  }

  /**
   * Finalizes a paid attempt on its measured units. Called by the caller only
   * AFTER the generated image is persisted (file stored AND asset row written).
   * A local attempt carries no settlement and this is a no-op.
   */
  async settle(settlement: ImageSettlement | undefined): Promise<void> {
    if (settlement === undefined) {
      return;
    }
    await this.payg.finalize(settlement.hold, settlement.usage, settlement.calls);
    // `providerCostTicks` is xAI's self-reported price, logged for
    // reconciliation against our charge (the hold = imageUnits x the seeded
    // per-image rate). It is never billed from.
    this.logger.log(
      `imageSettlement reservationId=${String(settlement.hold.reservationId)} outcome=FINALIZED imageUnits=${String(settlement.calls.imageUnits ?? 0)} heldMicroUsd=${String(settlement.hold.heldMicroUsd)} providerCostTicks=${String(settlement.providerCostTicks ?? 'n/a')}`,
    );
  }

  /**
   * Gives a paid attempt's hold back when its image could not be persisted.
   * Idempotent on the auth side (rule 37 item 11): a second release is a no-op.
   */
  async releaseUnpersisted(settlement: ImageSettlement | undefined): Promise<void> {
    if (settlement === undefined) {
      return;
    }
    await this.payg.release(settlement.hold, IMAGE_STORE_FAILED_RELEASE_REASON);
    this.logger.warn(
      `imageSettlement reservationId=${String(settlement.hold.reservationId)} outcome=RELEASED reason=${IMAGE_STORE_FAILED_LOG_REASON}`,
    );
  }

  /**
   * Gives a paid attempt's hold back because the user cancelled it. Never a
   * finalize: the user did not receive the image. Returns whether a hold
   * existed (a local attempt carries none). Idempotent on the auth side.
   */
  async releaseCancelled(settlement: ImageSettlement | undefined): Promise<boolean> {
    if (settlement === undefined) {
      return false;
    }
    await this.payg.release(settlement.hold, IMAGE_CANCELLED_RELEASE_REASON);
    this.logger.log(
      `imageSettlement reservationId=${String(settlement.hold.reservationId)} outcome=RELEASED reason=${IMAGE_CANCELLED_LOG_REASON}`,
    );
    return true;
  }

  /**
   * Best-effort upstream stop for a cancelled in-flight generation — only
   * when it provably cannot stop anyone else's job.
   *
   * - ComfyUI: a TARGETED `POST /interrupt { prompt_id }`, and only when this
   *   process holds this generation's prompt id. Unknown id → no call.
   * - SD WebUI: `/sdapi/v1/interrupt` has no job target and image-service
   *   neither serializes SD calls nor holds a job id it could check, so it
   *   can never prove this generation is the one running. Never called.
   * - Cloud (OpenAI/Gemini/xAI): no cancel exists.
   *
   * Every no-call case reports UNSUPPORTED; the execution path discards the
   * result when the call returns.
   */
  async requestProviderCancel(
    generationId: string,
    provider: string,
  ): Promise<ImageProviderCancel> {
    const promptId =
      provider === IMAGE_PROVIDER_LOCAL_COMFYUI ? this.comfyPromptIds.get(generationId) : undefined;
    if (promptId === undefined) {
      this.logger.debug(
        `requestProviderCancel: no targeted interrupt for provider=${provider} generationId=${generationId}`,
      );
      return ImageProviderCancel.UNSUPPORTED;
    }
    await this.comfyAdapter.cancel(AppConfig.get().COMFYUI_BASE_URL, promptId);
    return ImageProviderCancel.REQUESTED;
  }

  /** Throws the cancel exception (after releasing any open hold) when the row was cancelled. */
  private async assertNotCancelled(
    params: ExecuteImageInput,
    settlement: ImageSettlement | undefined,
  ): Promise<void> {
    if (params.isCancelled === undefined || !(await params.isCancelled())) {
      return;
    }
    const holdReleased = await this.releaseCancelled(settlement);
    this.logger.log(
      `execute: cancelled — provider=${params.provider} holdReleased=${String(holdReleased)}`,
    );
    throw imageCancelled();
  }

  private async callProvider(params: ExecuteImageInput): Promise<ImageProviderOutcome> {
    this.logger.debug(`callProvider: dispatching to ${params.provider}/${params.model}`);
    const { provider, model, prompt, width, height } = params;
    const w = width ?? 1024;
    const h = height ?? 1024;

    if (provider === IMAGE_PROVIDER_LOCAL) {
      this.logger.debug(
        `callProvider: routing to local Stable Diffusion provider — hasReference=${String(Boolean(params.referenceImageBase64))}`,
      );
      return {
        response: await this.observeSdProgress(params.onProgress, async () =>
          this.callLocalProvider(
            prompt,
            w,
            h,
            params.referenceImageBase64,
            params.referenceImageMimeType,
          ),
        ),
      };
    }

    if (provider === IMAGE_PROVIDER_LOCAL_COMFYUI) {
      this.logger.debug(
        `callProvider: routing to local ComfyUI provider — model=${model} size=${String(w)}x${String(h)}`,
      );
      return {
        response: await this.callComfyUIProvider(prompt, w, h, model, params),
      };
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
   * One paid image generation: reserve → provider call → an OPEN hold carrying
   * the measured units. A provider throw releases here; otherwise the hold is
   * settled by the caller once the image is persisted (`settle`), or released
   * when persisting fails (`releaseUnpersisted`) — rule 37 item 17.
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
  ): Promise<ImageProviderOutcome> {
    this.logger.debug(`callMeteredCloudProvider: fetching config for ${connectorProvider}`);
    const config = await this.fetchConnectorConfig(connectorProvider);
    const hold = await this.reserveImageHold(
      params,
      connectorProvider,
      meteredImageModelKey(params.provider, params.model, width, height),
    );

    try {
      // `hold.maxOutputTokens` is DELIBERATELY NOT PASSED to either image API.
      // An image response is not token-bounded: `POST /images/generations` has
      // no max-token field, and `:generateContent` with an IMAGE response
      // modality ignores one. There is no request parameter for the affordability
      // clamp (D6) to land in, so for this surface the clamp only sizes the hold
      // — it cannot physically bound the answer the way it does for text.
      const response = await this.dispatchCloudProvider(params, config, width, height);
      this.logger.debug(
        `callMeteredCloudProvider: provider=${connectorProvider} returned — hold stays open until the image is persisted`,
      );
      return { response, settlement: imageSettlement(hold, response) };
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
        resolveOpenAiImageQuality(params.model, params.quality),
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
    meteredModel: string,
  ): Promise<PaygHold> {
    try {
      const hold = await this.payg.reserve({
        userId: params.userId,
        requestId: params.requestId,
        provider: connectorProvider,
        // The PRICE row, not the provider model: `gpt-image-1@1536x1024` for a
        // size-priced model (seed v7), the dearest Grok row for an unknown Grok
        // image model (seed v8), the model id otherwise. Finalize settles on
        // this same reservation, so reserve and finalize price identically.
        model: meteredModel,
        surface: PaygSurface.IMAGE,
        promptTokens: IMAGE_PAYG_PROMPT_TOKENS,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS,
        // EXPECTED images. On a per-image price (OpenAI, Grok) this is what the hold
        // is made of; on a token price (Gemini) the rate row has no per-image
        // column and it adds nothing.
        imageUnits: IMAGE_PAYG_IMAGES_PER_REQUEST,
      });
      this.logger.log(
        `reserveImageHold: provider=${connectorProvider} priceKey=${meteredModel} metered=${String(hold.metered)} held=${String(hold.heldMicroUsd)}`,
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
    params: ExecuteImageInput,
  ): Promise<ImageProviderResponse> {
    const { generationId, onProgress } = params;
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
        // Every WebSocket-derived envelope goes to the generation's SSE
        // stream. It used to be dropped here, so the card sat on
        // "Generating" with no stage while ComfyUI reported every node.
        onEvent: (event) => onProgress?.(event),
        onPromptAccepted: (promptId) => {
          if (generationId !== undefined) {
            this.comfyPromptIds.set(generationId, promptId);
          }
        },
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
    } finally {
      if (generationId !== undefined) {
        this.comfyPromptIds.delete(generationId);
      }
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

  /**
   * Reads a stored reference image back from file-service for a retry.
   *
   * file-service checks that `userId` owns the file and answers 404 otherwise,
   * so a reference is only ever re-read for the generation's owner. Any miss —
   * deleted file, service down, no bytes, over the size cap — is a
   * `REFERENCE_UNAVAILABLE` failure: generating without the image would
   * silently turn an edit into an unrelated new picture.
   */
  async loadStoredReference(fileId: string, userId: string): Promise<ImageReference> {
    const config = AppConfig.get();
    const url = `${config.FILE_SERVICE_URL}${IMAGE_REFERENCE_CONTENT_PATH}/${encodeURIComponent(fileId)}/content?userId=${encodeURIComponent(userId)}`;
    let file: ImageReferenceFileResponse;
    try {
      file = await httpGet<ImageReferenceFileResponse>(url, {
        timeout: IMAGE_REFERENCE_FETCH_TIMEOUT_MS,
        headers: { Authorization: buildInterServiceAuthHeader() },
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`loadStoredReference: file-service refused fileId=${fileId} — ${detail}`);
      throw imageFailure(ImageFailureCode.REFERENCE_UNAVAILABLE, detail);
    }
    const base64 = file.content ?? '';
    if (base64.length === 0 || base64.length > IMAGE_REFERENCE_MAX_BASE64_LENGTH) {
      this.logger.warn(
        `loadStoredReference: unusable reference fileId=${fileId} base64Len=${String(base64.length)}`,
      );
      throw imageFailure(
        ImageFailureCode.REFERENCE_UNAVAILABLE,
        'reference bytes missing or too large',
      );
    }
    this.logger.debug(`loadStoredReference: fileId=${fileId} base64Len=${String(base64.length)}`);
    return { base64, mimeType: file.mimeType };
  }

  /**
   * Runs a synchronous SD WebUI call while polling its progress endpoint.
   *
   * The poll is bounded three ways: it stops in `finally` the moment the call
   * settles (the txt2img request itself has `SD_TIMEOUT_MS`), the adapter gives
   * up after `SD_PROGRESS_MAX_CONSECUTIVE_ERRORS`, and it never runs faster than
   * `CLAW_IMAGE_PROGRESS_POLL_INTERVAL_MS` (Zod floor 300 ms). An envelope that
   * lands after the call settled is dropped, so a late poll cannot drag the
   * card back to "generating" after it moved on.
   */
  private async observeSdProgress(
    onProgress: ImageProgressCallback | undefined,
    run: () => Promise<ImageProviderResponse>,
  ): Promise<ImageProviderResponse> {
    if (!onProgress) {
      return run();
    }
    const config = AppConfig.get();
    const session = this.sdProgressAdapter.start({
      sdUrl: config.STABLE_DIFFUSION_URL,
      runId: randomUUID(),
      totalSteps: SD_DEFAULT_STEPS,
      intervalMs: config.CLAW_IMAGE_PROGRESS_POLL_INTERVAL_MS,
      preview: false,
    });
    const state = { active: true };
    const pump = async (): Promise<void> => {
      for await (const event of session.events) {
        if (!state.active) {
          return;
        }
        onProgress(event);
      }
    };
    void pump().catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : 'progress pump failed';
      this.logger.warn(`observeSdProgress: progress stream ended early — ${msg}`);
    });
    try {
      return await run();
    } finally {
      state.active = false;
      session.stop();
    }
  }
}
