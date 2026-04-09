import { Logger } from '@nestjs/common';
import { httpPost } from '@common/utilities';
import { type ImageProviderResponse } from '../types/image-generation.types';

const logger = new Logger('GeminiImageAdapter');

export async function generateWithGemini(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  model: string,
): Promise<ImageProviderResponse> {
  logger.debug(`Calling Gemini image generation: ${model}`);

  const response = await httpPost<GeminiImageResponse>(
    `${baseUrl}/models/${model}:predict`,
    {
      instances: [{ prompt }],
      parameters: { sampleCount: 1 },
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 120_000,
    },
  );

  const firstPrediction = response.predictions?.[0];
  if (!firstPrediction) {
    throw new Error('Gemini returned no image predictions');
  }

  return {
    imageBase64: firstPrediction.bytesBase64Encoded,
    revisedPrompt: undefined,
    mimeType: firstPrediction.mimeType ?? 'image/png',
  };
}

type GeminiPrediction = {
  bytesBase64Encoded: string;
  mimeType?: string;
};

type GeminiImageResponse = {
  predictions?: GeminiPrediction[];
};
