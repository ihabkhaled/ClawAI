import { Logger } from '@nestjs/common';
import { extractGeminiUsage } from '@claw/shared-utilities';
import { httpPost } from '@common/utilities';
import { IMAGE_CAPABLE_MODELS } from '../constants/gemini-image.constants';
import type { ImageProviderResponse } from '../types/image-generation.types';
import type {
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
  GeminiPart,
} from '../types/gemini-image.types';

const logger = new Logger('GeminiImageAdapter');

export const generateWithGemini = async (
  baseUrl: string,
  apiKey: string,
  prompt: string,
  model: string,
  referenceImageBase64?: string,
  referenceImageMimeType?: string,
): Promise<ImageProviderResponse> => {
  const cleanBaseUrl = baseUrl.replace('/openai', '');
  let lastError: unknown = null;

  logger.log(
    `generateWithGemini: starting — promptLen=${String(prompt.length)} hasReference=${String(Boolean(referenceImageBase64))}`,
  );
  // Build request parts: optional reference image + text prompt
  const requestParts: GeminiPart[] = [];
  let systemInstruction: string | undefined;

  if (referenceImageBase64 && referenceImageMimeType) {
    logger.debug(
      `generateWithGemini: including reference image — mimeType=${referenceImageMimeType} base64Len=${String(referenceImageBase64.length)}`,
    );
    // Include the reference image so Gemini can see it and generate similar
    requestParts.push(
      {
        inlineData: {
          mimeType: referenceImageMimeType,
          data: referenceImageBase64,
        },
      },
      {
        text: `Look at the reference image above carefully. Generate a NEW image that closely reproduces the same visual appearance — matching the subject, composition, colors, lighting, style, textures, and mood as closely as possible.\n\nDetailed instructions:\n${prompt}`,
      },
    );
    systemInstruction =
      'You are an image generation model. When a reference image is provided, your primary goal is to generate a new image that visually matches the reference as closely as possible. Preserve the same art style, color palette, composition, lighting, and subject matter. Only deviate from the reference where the user explicitly requests changes.';
    logger.log('generateWithGemini: including reference image in request');
  } else {
    logger.debug('generateWithGemini: no reference image — using text prompt only');
    requestParts.push({ text: `Generate an image: ${prompt}` });
  }

  // The REQUESTED model first, then the known-capable list as fallback.
  //
  // This parameter used to be ignored entirely (`_model`), so every Gemini
  // image request — imagen-4.0-ultra, gemini-3-pro-image, anything — was served
  // by whichever hardcoded model answered first, in practice always
  // gemini-2.5-flash-image. A user picked one model and silently received
  // another, while PAYG metered them against the price of the one they picked.
  //
  // The fallback list is kept: a model the catalog exposes but that cannot
  // actually serve `:generateContent` (imagen-* speaks `:predict`) still has to
  // produce an image rather than an error. The difference is that the choice is
  // now attempted before it is overridden, and the log names what served it.
  const candidates = [model, ...IMAGE_CAPABLE_MODELS.filter((m) => m !== model)];
  logger.debug(
    `generateWithGemini: requested=${model} trying ${String(candidates.length)} candidate model(s)`,
  );
  for (const geminiModel of candidates) {
    {
      const url = `${cleanBaseUrl}/models/${geminiModel}:generateContent?key=${apiKey}`;
      logger.debug(`generateWithGemini: trying model=${geminiModel}`);

      try {
        const requestBody: GeminiGenerateContentRequest = {
          contents: [{ parts: requestParts }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        };

        if (systemInstruction) {
          requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const response = await httpPost<GeminiGenerateContentResponse>(url, requestBody, {
          timeout: 120_000,
        });

        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts ?? [];
        const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));

        if (imagePart?.inlineData) {
          if (geminiModel !== model) {
            logger.warn(
              `generateWithGemini: ${model} could not serve the request; generated with ${geminiModel} instead`,
            );
          }
          logger.log(`Gemini image generated via ${geminiModel}`);
          const revisedPrompt = parts.find((p) => p.text)?.text;
          // Gemini DOES report usage for an image call — `usageMetadata` on the
          // same envelope a text call returns, with the generated image billed
          // as a block of candidate tokens. Reading it is what lets the PAYG
          // finalize settle a Gemini image against measured numbers instead of
          // the zeros an OpenAI image is stuck with. The text fallbacks cover a
          // response that omits the block entirely.
          const usage = extractGeminiUsage(response, {
            promptText: prompt,
            completionText: revisedPrompt,
          });
          logger.debug(
            `generateWithGemini: usage — prompt=${String(usage.promptTokens)} completion=${String(usage.completionTokens)} estimated=${String(usage.estimated)}`,
          );
          return {
            imageBase64: imagePart.inlineData.data,
            revisedPrompt,
            mimeType: imagePart.inlineData.mimeType ?? 'image/png',
            usage,
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
};
