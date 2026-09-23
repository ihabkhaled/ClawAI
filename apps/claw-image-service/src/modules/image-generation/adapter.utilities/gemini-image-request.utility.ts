import { HttpStatus, Logger } from '@nestjs/common';
import { extractGeminiUsage } from '@claw/shared-utilities';

import { ImageFailureCode } from '../../../common/enums';
import { type BusinessException } from '../../../common/errors';
import { imageFailure, readProviderHttpStatus } from './provider-error.utility';
import {
  GEMINI_DEFAULT_IMAGE_MIME_TYPE,
  GEMINI_MODEL_RESOURCE_PREFIX,
} from '../constants/gemini-image.constants';
import { GEMINI_SAFETY_FINISH_REASONS } from '../constants/image-failure.constants';
import type { ImageProviderResponse } from '../types/image-generation.types';
import type {
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
  GeminiPart,
} from '../types/gemini-image.types';

const logger = new Logger('GeminiImageAdapter');

/** `models/gemini-3-pro-image` (catalog id) → `gemini-3-pro-image` (path segment). */
export function normalizeGeminiModelId(model: string): string {
  return model.startsWith(GEMINI_MODEL_RESOURCE_PREFIX)
    ? model.slice(GEMINI_MODEL_RESOURCE_PREFIX.length)
    : model;
}

export function buildGeminiRequest(
  prompt: string,
  referenceImageBase64?: string,
  referenceImageMimeType?: string,
): GeminiGenerateContentRequest {
  const generationConfig = { responseModalities: ['TEXT', 'IMAGE'] };
  if (!referenceImageBase64 || !referenceImageMimeType) {
    logger.debug('generateWithGemini: no reference image — using text prompt only');
    return { contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }], generationConfig };
  }
  logger.log(
    `generateWithGemini: including reference image — mimeType=${referenceImageMimeType} base64Len=${String(referenceImageBase64.length)}`,
  );
  const parts: GeminiPart[] = [
    { inlineData: { mimeType: referenceImageMimeType, data: referenceImageBase64 } },
    {
      text: `Look at the reference image above carefully. Generate a NEW image that closely reproduces the same visual appearance — matching the subject, composition, colors, lighting, style, textures, and mood as closely as possible.\n\nDetailed instructions:\n${prompt}`,
    },
  ];
  return {
    contents: [{ parts }],
    generationConfig,
    systemInstruction: {
      parts: [
        {
          text: 'You are an image generation model. When a reference image is provided, your primary goal is to generate a new image that visually matches the reference as closely as possible. Preserve the same art style, color palette, composition, lighting, and subject matter. Only deviate from the reference where the user explicitly requests changes.',
        },
      ],
    },
  };
}

/** The image in a response, or `null` when the model answered without one. */
export function readGeminiImage(
  response: GeminiGenerateContentResponse,
  prompt: string,
  servedBy: string,
): ImageProviderResponse | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart?.inlineData) {
    return null;
  }
  const revisedPrompt = parts.find((p) => p.text)?.text;
  // Gemini DOES report usage for an image call — `usageMetadata` on the same
  // envelope a text call returns, with the image billed as candidate tokens.
  // Reading it lets the PAYG finalize settle on measured numbers.
  const usage = extractGeminiUsage(response, { promptText: prompt, completionText: revisedPrompt });
  logger.log(
    `Gemini image generated via ${servedBy} — usage prompt=${String(usage.promptTokens)} completion=${String(usage.completionTokens)} estimated=${String(usage.estimated)}`,
  );
  return {
    imageBase64: imagePart.inlineData.data,
    revisedPrompt,
    mimeType: imagePart.inlineData.mimeType || GEMINI_DEFAULT_IMAGE_MIME_TYPE,
    usage,
  };
}

/**
 * Why a 200 carried no image. A safety block is final — another Gemini model
 * would refuse the same prompt — so it stops the candidate walk; a plain text
 * answer lets the next candidate try.
 */
export function describeMissingImage(response: GeminiGenerateContentResponse): BusinessException {
  const reason = response.promptFeedback?.blockReason ?? response.candidates?.[0]?.finishReason;
  if (reason !== undefined && GEMINI_SAFETY_FINISH_REASONS.includes(reason)) {
    return imageFailure(ImageFailureCode.CONTENT_REJECTED, `Gemini blocked the request: ${reason}`);
  }
  const text = response.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ?? 'empty';
  return imageFailure(
    ImageFailureCode.NO_IMAGE_RETURNED,
    `Gemini returned text but no image: ${text.slice(0, 200)}`,
  );
}

/** True for a 400/404 — "this model does not serve this API" — worth trying the next candidate for. */
export function isModelLevelRefusal(error: unknown): boolean {
  const status = readProviderHttpStatus(error);
  return status === Number(HttpStatus.BAD_REQUEST) || status === Number(HttpStatus.NOT_FOUND);
}
