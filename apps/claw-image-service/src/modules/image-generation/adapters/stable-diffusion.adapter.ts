import { Logger } from '@nestjs/common';
import { httpPost } from '@common/utilities';
import { type ImageProviderResponse } from '../types/image-generation.types';

const logger = new Logger('StableDiffusionAdapter');

export async function generateWithStableDiffusion(
  sdUrl: string,
  prompt: string,
  width: number,
  height: number,
): Promise<ImageProviderResponse> {
  logger.debug(`Calling Stable Diffusion: ${sdUrl}`);

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

  const firstImage = response.images?.[0];
  if (!firstImage) {
    throw new Error('Stable Diffusion returned no images');
  }

  return {
    imageBase64: firstImage,
    revisedPrompt: undefined,
    mimeType: 'image/png',
  };
}

type SDTxt2ImgResponse = {
  images?: string[];
  parameters?: Record<string, unknown>;
  info?: string;
};
