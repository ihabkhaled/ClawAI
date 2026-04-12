import { Logger } from '@nestjs/common';
import { httpPost } from '@common/utilities';
import {
  SD_BATCH_SIZE,
  SD_DEFAULT_CFG_SCALE,
  SD_DEFAULT_STEPS,
  SD_IMG2IMG_DENOISING_STRENGTH,
  SD_MAX_DIMENSION,
  SD_TIMEOUT_MS,
} from '../constants/stable-diffusion.constants';
import type { ImageProviderResponse } from '../types/image-generation.types';
import type { SDImg2ImgResponse, SDTxt2ImgResponse } from '../types/stable-diffusion.types';

const logger = new Logger('StableDiffusionAdapter');

export const generateWithStableDiffusion = async (
  sdUrl: string,
  prompt: string,
  width: number,
  height: number,
  referenceImageBase64?: string,
  _referenceImageMimeType?: string,
): Promise<ImageProviderResponse> => {
  const w = Math.min(width, SD_MAX_DIMENSION);
  const h = Math.min(height, SD_MAX_DIMENSION);
  const isImg2Img = Boolean(referenceImageBase64);
  const mode = isImg2Img ? 'img2img' : 'txt2img';
  const endpoint = `${sdUrl}/sdapi/v1/${mode}`;

  logger.log(`${mode}: starting — sdUrl=${sdUrl} size=${String(w)}x${String(h)}`);
  logger.debug(`${mode}: promptLen=${String(prompt.length)}`);

  const body: Record<string, unknown> = {
    prompt,
    width: w,
    height: h,
    steps: SD_DEFAULT_STEPS,
    cfg_scale: SD_DEFAULT_CFG_SCALE,
    batch_size: SD_BATCH_SIZE,
  };

  if (isImg2Img && referenceImageBase64) {
    body['init_images'] = [referenceImageBase64];
    body['denoising_strength'] = SD_IMG2IMG_DENOISING_STRENGTH;
    logger.debug(
      `img2img: refBase64Len=${String(referenceImageBase64.length)} denoising=${String(SD_IMG2IMG_DENOISING_STRENGTH)}`,
    );
  }

  logger.debug(`${mode}: POST ${endpoint}`);
  const response = await httpPost<SDTxt2ImgResponse | SDImg2ImgResponse>(endpoint, body, {
    timeout: SD_TIMEOUT_MS,
  });

  logger.debug(`${mode}: response — imageCount=${String(response.images?.length ?? 0)}`);
  const firstImage = response.images?.[0];
  if (!firstImage) {
    logger.error(`${mode}: Stable Diffusion returned no images`);
    throw new Error(`Stable Diffusion ${mode} returned no images`);
  }

  logger.log(`${mode}: image generated — base64Len=${String(firstImage.length)}`);
  return {
    imageBase64: firstImage,
    revisedPrompt: undefined,
    mimeType: 'image/png',
  };
};
