import { Logger } from '@nestjs/common';
import { httpPost } from '@common/utilities';
import {
  SD_BATCH_SIZE,
  SD_DEFAULT_CFG_SCALE,
  SD_DEFAULT_STEPS,
  SD_MAX_DIMENSION,
  SD_TIMEOUT_MS,
} from '../constants/stable-diffusion.constants';
import type { ImageProviderResponse } from '../types/image-generation.types';
import type { SDTxt2ImgResponse } from '../types/stable-diffusion.types';

const logger = new Logger('StableDiffusionAdapter');

export const generateWithStableDiffusion = async (
  sdUrl: string,
  prompt: string,
  width: number,
  height: number,
): Promise<ImageProviderResponse> => {
  const cappedWidth = Math.min(width, SD_MAX_DIMENSION);
  const cappedHeight = Math.min(height, SD_MAX_DIMENSION);
  logger.log(`generateWithStableDiffusion: starting — sdUrl=${sdUrl} size=${String(cappedWidth)}x${String(cappedHeight)}`);
  logger.debug(`generateWithStableDiffusion: promptLen=${String(prompt.length)}`);

  logger.debug(`generateWithStableDiffusion: sending POST to ${sdUrl}/sdapi/v1/txt2img`);
  const response = await httpPost<SDTxt2ImgResponse>(
    `${sdUrl}/sdapi/v1/txt2img`,
    {
      prompt,
      width: cappedWidth,
      height: cappedHeight,
      steps: SD_DEFAULT_STEPS,
      cfg_scale: SD_DEFAULT_CFG_SCALE,
      batch_size: SD_BATCH_SIZE,
    },
    { timeout: SD_TIMEOUT_MS },
  );

  logger.debug(`generateWithStableDiffusion: response received — imageCount=${String(response.images?.length ?? 0)}`);
  const firstImage = response.images?.[0];
  if (!firstImage) {
    logger.error('generateWithStableDiffusion: Stable Diffusion returned no images');
    throw new Error('Stable Diffusion returned no images');
  }

  logger.log(`generateWithStableDiffusion: image generated — base64Len=${String(firstImage.length)}`);
  return {
    imageBase64: firstImage,
    revisedPrompt: undefined,
    mimeType: 'image/png',
  };
};
