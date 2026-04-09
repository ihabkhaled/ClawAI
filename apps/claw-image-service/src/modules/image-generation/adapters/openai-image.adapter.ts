import { Logger } from '@nestjs/common';
import { httpPost } from '@common/utilities';
import { type ImageProviderResponse } from '../types/image-generation.types';

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

  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    size,
    response_format: 'url',
  };

  if (quality) {
    body['quality'] = quality;
  }
  if (style) {
    body['style'] = style;
  }

  logger.debug(`Calling OpenAI image generation: ${model}, size: ${size}`);

  const response = await httpPost<OpenAIImageResponse>(`${baseUrl}/images/generations`, body, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 120_000,
  });

  const firstImage = response.data[0];
  if (!firstImage) {
    throw new Error('OpenAI returned no image data');
  }

  return {
    imageUrl: firstImage.url,
    revisedPrompt: firstImage.revised_prompt,
    mimeType: 'image/png',
  };
}

type OpenAIImageData = {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
};

type OpenAIImageResponse = {
  created: number;
  data: OpenAIImageData[];
};
