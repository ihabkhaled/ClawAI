import { Logger } from '@nestjs/common';
import { httpPost } from '@common/utilities';
import { type ImageProviderResponse } from '../types/image-generation.types';

const logger = new Logger('GeminiImageAdapter');

// Gemini models that support image generation via generateContent + IMAGE modality
const IMAGE_CAPABLE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
];

export async function generateWithGemini(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  _model: string,
  referenceImageBase64?: string,
  referenceImageMimeType?: string,
): Promise<ImageProviderResponse> {
  const cleanBaseUrl = baseUrl.replace('/openai', '');
  let lastError: unknown = null;

  // Build request parts: optional reference image + text prompt
  const requestParts: GeminiPart[] = [];

  if (referenceImageBase64 && referenceImageMimeType) {
    // Include the reference image so Gemini can see it and generate similar
    requestParts.push({
      inlineData: {
        mimeType: referenceImageMimeType,
        data: referenceImageBase64,
      },
    });
    requestParts.push({ text: prompt });
    logger.log('Including reference image in Gemini image generation request');
  } else {
    requestParts.push({ text: `Generate an image: ${prompt}` });
  }

  // Try each model
  for (const geminiModel of IMAGE_CAPABLE_MODELS) {
    {
      const url = `${cleanBaseUrl}/models/${geminiModel}:generateContent?key=${apiKey}`;
      logger.debug(`Trying Gemini image gen: ${geminiModel}`);

      try {
        const response = await httpPost<GeminiGenerateContentResponse>(
          url,
          {
            contents: [{ parts: requestParts }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          },
          { timeout: 120_000 },
        );

        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts ?? [];
        const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));

        if (imagePart?.inlineData) {
          logger.log(`Gemini image generated via ${geminiModel}`);
          return {
            imageBase64: imagePart.inlineData.data,
            revisedPrompt: parts.find((p) => p.text)?.text,
            mimeType: imagePart.inlineData.mimeType ?? 'image/png',
          };
        }

        const textPart = parts.find((p) => p.text);
        lastError = new Error(`Gemini returned text but no image: ${textPart?.text ?? 'empty'}`);
      } catch (error: unknown) {
        const axiosErr = error as { response?: { status?: number; data?: unknown } };
        const status = axiosErr.response?.status;
        if (status === 400 || status === 404) {
          logger.debug(`${geminiModel}: ${String(status)}, trying next`);
          lastError = error;
          continue;
        }
        throw error;
      }
    }
  }

  throw lastError ?? new Error('All Gemini image generation models failed');
}

type GeminiInlineData = {
  mimeType: string;
  data: string;
};

type GeminiPart = {
  text?: string;
  inlineData?: GeminiInlineData;
};

type GeminiContent = {
  parts: GeminiPart[];
};

type GeminiCandidate = {
  content: GeminiContent;
};

type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
};
