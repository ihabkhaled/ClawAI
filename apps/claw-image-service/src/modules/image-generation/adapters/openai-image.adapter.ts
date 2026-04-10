import { Logger } from '@nestjs/common';
import { httpPost } from '@common/utilities';
import type { ImageProviderResponse } from '../types/image-generation.types';
import type { OpenAIImageResponse } from '../types/openai-image.types';

const logger = new Logger('OpenAIImageAdapter');

export async function generateWithOpenAI(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  model: string,
  width: number,
  height: number,
  quality?: string,
  style?: string,
): Promise<ImageProviderResponse> {
  const size = `${String(width)}x${String(height)}` as string;
  logger.log(`generateWithOpenAI: starting — model=${model} size=${size} quality=${quality ?? 'default'} style=${style ?? 'default'}`);

  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    size,
    response_format: 'url',
  };

  if (quality) {
    logger.debug(`generateWithOpenAI: applying quality=${quality}`);
    body['quality'] = quality;
  }
  if (style) {
    logger.debug(`generateWithOpenAI: applying style=${style}`);
    body['style'] = style;
  }

  logger.debug(`generateWithOpenAI: sending POST to ${baseUrl}/images/generations`);
  const response = await httpPost<OpenAIImageResponse>(`${baseUrl}/images/generations`, body, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 120_000,
  });

  logger.debug(`generateWithOpenAI: response received — imageCount=${String(response.data.length)}`);
  const firstImage = response.data[0];
  if (!firstImage) {
    logger.error('generateWithOpenAI: OpenAI returned no image data');
    throw new Error('OpenAI returned no image data');
  }

  logger.log(`generateWithOpenAI: image generated — hasUrl=${String(Boolean(firstImage.url))} hasRevisedPrompt=${String(Boolean(firstImage.revised_prompt))}`);
  return {
    imageUrl: firstImage.url,
    revisedPrompt: firstImage.revised_prompt,
    mimeType: 'image/png',
  };
}

