import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpGet, httpPost } from '@common/utilities';
import { BusinessException } from '../../../common/errors';
import {
  type ConnectorConfigResponse,
  type GenerateImageParams,
  type GenerateImageResult,
  type ImageProviderResponse,
  type StoreImageResponse,
} from '../types/image-generation.types';
import { generateWithOpenAI } from '../adapters/openai-image.adapter';
import { generateWithGemini } from '../adapters/gemini-image.adapter';
import { generateWithStableDiffusion } from '../adapters/stable-diffusion.adapter';
import {
  IMAGE_PROVIDER_GEMINI,
  IMAGE_PROVIDER_LOCAL,
  IMAGE_PROVIDER_OPENAI,
} from '../../../common/constants';

@Injectable()
export class ImageExecutionManager {
  private readonly logger = new Logger(ImageExecutionManager.name);

  async execute(params: GenerateImageParams): Promise<GenerateImageResult> {
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

  private async callProvider(params: GenerateImageParams): Promise<ImageProviderResponse> {
    this.logger.debug(`callProvider: dispatching to ${params.provider}/${params.model}`);
    const { provider, model, prompt, width, height, quality, style } = params;
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

    this.logger.debug(`callProvider: mapping provider ${provider} to connector provider`);
    const connectorProvider = this.mapToConnectorProvider(provider);
    this.logger.debug(`callProvider: fetching connector config for ${connectorProvider}`);
    const config = await this.fetchConnectorConfig(connectorProvider);
    this.logger.debug(
      `callProvider: connector config fetched — baseUrl=${config.baseUrl ?? 'default'}`,
    );

    if (provider === IMAGE_PROVIDER_OPENAI) {
      this.logger.debug('callProvider: routing to OpenAI image generation');
      return generateWithOpenAI(
        config.baseUrl ?? 'https://api.openai.com/v1',
        config.apiKey,
        prompt,
        model,
        w,
        h,
        quality,
        style,
      );
    }

    if (provider === IMAGE_PROVIDER_GEMINI) {
      this.logger.debug(
        `callProvider: routing to Gemini image generation — hasReference=${String(Boolean(params.referenceImageBase64))}`,
      );
      return generateWithGemini(
        config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta',
        config.apiKey,
        prompt,
        model,
        params.referenceImageBase64,
        params.referenceImageMimeType,
      );
    }

    this.logger.error(`callProvider: unsupported image provider=${provider}`);
    throw new BusinessException(
      `Unsupported image provider: ${provider}`,
      'UNSUPPORTED_IMAGE_PROVIDER',
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
    params: GenerateImageParams,
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
    const storeResponse = await httpPost<StoreImageResponse>(
      `${config.FILE_SERVICE_URL}/api/v1/internal/files/store-image`,
      {
        userId: params.userId,
        filename,
        mimeType: response.mimeType,
        base64Data,
      },
      { timeout: 30_000 },
    );

    this.logger.debug(`storeImage: file stored — fileId=${storeResponse.fileId}`);
    return storeResponse.fileId;
  }

  private async downloadImageAsBase64(url: string): Promise<string> {
    this.logger.debug('downloadImageAsBase64: downloading image from provider URL');
    const startTime = Date.now();
    const imageBuffer = await httpGet<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 60_000,
    });
    const durationMs = Date.now() - startTime;
    const base64 = Buffer.from(imageBuffer).toString('base64');
    this.logger.debug(
      `downloadImageAsBase64: downloaded — durationMs=${String(durationMs)} base64Len=${String(base64.length)}`,
    );
    return base64;
  }

  private mapToConnectorProvider(imageProvider: string): string {
    this.logger.debug(`mapToConnectorProvider: mapping ${imageProvider}`);
    if (imageProvider === IMAGE_PROVIDER_OPENAI) {
      return 'OPENAI';
    }
    if (imageProvider === IMAGE_PROVIDER_GEMINI) {
      return 'GEMINI';
    }
    return imageProvider;
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
      this.logger.error(`fetchConnectorConfig: failed to fetch config for ${provider}`);
      throw new BusinessException(
        `Failed to fetch connector config for ${provider}`,
        'CONNECTOR_CONFIG_FETCH_FAILED',
      );
    }
  }
}
