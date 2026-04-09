import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpPost, httpGet } from '@common/utilities';
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

    this.logger.log(`Generating image: provider=${params.provider}, model=${params.model}`);

    const providerResponse = await this.callProvider(params);
    const fileId = await this.storeImage(params, providerResponse);
    const latencyMs = Date.now() - startTime;

    this.logger.log(`Image generated: fileId=${fileId}, latencyMs=${String(latencyMs)}`);

    return {
      fileId,
      revisedPrompt: providerResponse.revisedPrompt ?? null,
      latencyMs,
    };
  }

  private async callProvider(params: GenerateImageParams): Promise<ImageProviderResponse> {
    const { provider, model, prompt, width, height, quality, style } = params;
    const w = width ?? 1024;
    const h = height ?? 1024;

    if (provider === IMAGE_PROVIDER_LOCAL) {
      return this.callLocalProvider(prompt, w, h);
    }

    const connectorProvider = this.mapToConnectorProvider(provider);
    const config = await this.fetchConnectorConfig(connectorProvider);

    if (provider === IMAGE_PROVIDER_OPENAI) {
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
      return generateWithGemini(
        config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta',
        config.apiKey,
        prompt,
        model,
      );
    }

    throw new BusinessException(
      `Unsupported image provider: ${provider}`,
      'UNSUPPORTED_IMAGE_PROVIDER',
    );
  }

  private async callLocalProvider(
    prompt: string,
    width: number,
    height: number,
  ): Promise<ImageProviderResponse> {
    const config = AppConfig.get();
    try {
      return await generateWithStableDiffusion(config.STABLE_DIFFUSION_URL, prompt, width, height);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Stable Diffusion unavailable';
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
    const config = AppConfig.get();
    let base64Data: string;

    if (response.imageBase64) {
      base64Data = response.imageBase64;
    } else if (response.imageUrl) {
      base64Data = await this.downloadImageAsBase64(response.imageUrl);
    } else {
      throw new BusinessException(
        'Provider returned neither URL nor base64 image data',
        'IMAGE_RESPONSE_EMPTY',
      );
    }

    const extension = response.mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const timestamp = Date.now();
    const filename = `generated-${timestamp}.${extension}`;

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

    return storeResponse.fileId;
  }

  private async downloadImageAsBase64(url: string): Promise<string> {
    this.logger.debug('Downloading image from provider URL...');
    const imageBuffer = await httpGet<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 60_000,
    });
    return Buffer.from(imageBuffer).toString('base64');
  }

  private mapToConnectorProvider(imageProvider: string): string {
    if (imageProvider === IMAGE_PROVIDER_OPENAI) {
      return 'OPENAI';
    }
    if (imageProvider === IMAGE_PROVIDER_GEMINI) {
      return 'GEMINI';
    }
    return imageProvider;
  }

  private async fetchConnectorConfig(provider: string): Promise<ConnectorConfigResponse> {
    const config = AppConfig.get();
    const encoded = encodeURIComponent(provider);
    const url = `${config.CONNECTOR_SERVICE_URL}/api/v1/internal/connectors/config?provider=${encoded}`;

    try {
      return await httpGet<ConnectorConfigResponse>(url, { timeout: 10_000 });
    } catch {
      throw new BusinessException(
        `Failed to fetch connector config for ${provider}`,
        'CONNECTOR_CONFIG_FETCH_FAILED',
      );
    }
  }
}
