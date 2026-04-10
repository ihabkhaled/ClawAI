import { Logger } from '@nestjs/common';
import { httpPost } from '@common/utilities';
import type { ImageProviderResponse } from '../types/image-generation.types';
import type { SDTxt2ImgResponse } from '../types/stable-diffusion.types';

const logger = new Logger('StableDiffusionAdapter');

export const generateWithStableDiffusion = async (
  sdUrl: string,
  prompt: string,
  width: number,
  height: number,
): Promise<ImageProviderResponse> => {
  logger.log(`generateWithStableDiffusion: starting — sdUrl=${sdUrl} size=${String(width)}x${String(height)}`);
  logger.debug(`generateWithStableDiffusion: promptLen=${String(prompt.length)}`);

  logger.debug(`generateWithStableDiffusion: sending POST to ${sdUrl}/sdapi/v1/txt2img`);
  const response = await httpPost<SDTxt2ImgResponse>(
    `${sdUrl}/sdapi/v1/txt2img`,
    {
      prompt,
      width,
      height,
      steps: 20,
      cfg_scale: 7,
      batch_size: 1,
    },
    { timeout: 180_000 },
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

