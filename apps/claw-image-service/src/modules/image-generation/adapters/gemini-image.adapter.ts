import { Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { httpPost } from '@common/utilities';

import { ImageFailureCode } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import {
  buildGeminiRequest,
  describeMissingImage,
  isModelLevelRefusal,
  normalizeGeminiModelId,
  readGeminiImage,
} from '../adapter.utilities/gemini-image-request.utility';
import {
  extractProviderErrorMessage,
  imageFailure,
  toImageProviderException,
} from '../adapter.utilities/provider-error.utility';
import {
  GEMINI_API_KEY_HEADER,
  GEMINI_IMAGE_TIMEOUT_MS,
  GEMINI_OPENAI_COMPAT_SUFFIX,
  IMAGE_CAPABLE_MODELS,
} from '../constants/gemini-image.constants';
import type { ImageProviderResponse } from '../types/image-generation.types';
import type { GeminiGenerateContentResponse } from '../types/gemini-image.types';

const logger = new Logger('GeminiImageAdapter');

/**
 * One Gemini image via `:generateContent` with the IMAGE response modality.
 *
 * The REQUESTED model is tried first, then the known-capable list. The fallback
 * exists for catalog entries that cannot serve `:generateContent` — the
 * `imagen-*` family answers 404 on this key (Google has shut Imagen down in the
 * Gemini API), and the log names what actually served the request.
 */
export const generateWithGemini = async (
  baseUrl: string,
  apiKey: string,
  prompt: string,
  model: string,
  referenceImageBase64?: string,
  referenceImageMimeType?: string,
): Promise<ImageProviderResponse> => {
  const cleanBaseUrl = baseUrl.replace(GEMINI_OPENAI_COMPAT_SUFFIX, '');
  const requested = normalizeGeminiModelId(model);
  const body = buildGeminiRequest(prompt, referenceImageBase64, referenceImageMimeType);
  const candidates = [requested, ...IMAGE_CAPABLE_MODELS.filter((m) => m !== requested)];
  logger.log(
    `generateWithGemini: requested=${requested} candidates=${String(candidates.length)} promptLen=${String(prompt.length)}`,
  );
  let lastError: unknown = null;
  for (const geminiModel of candidates) {
    let response: GeminiGenerateContentResponse;
    try {
      // `cleanBaseUrl` comes from the connector row an operator configures, so
      // it is declared to the SSRF guard. The key rides in a header: the shared
      // client logs request URLs, and `?key=` put it in the log.
      response = await httpPost<GeminiGenerateContentResponse>(
        `${cleanBaseUrl}/models/${geminiModel}:generateContent`,
        body,
        { headers: { [GEMINI_API_KEY_HEADER]: apiKey }, timeout: GEMINI_IMAGE_TIMEOUT_MS },
        declaredHost(cleanBaseUrl),
      );
    } catch (error: unknown) {
      logger.warn(
        `generateWithGemini: ${geminiModel} refused — ${extractProviderErrorMessage(error)}`,
      );
      if (!isModelLevelRefusal(error)) {
        throw toImageProviderException(error, 'Gemini');
      }
      lastError = toImageProviderException(error, 'Gemini');
      continue;
    }
    const image = readGeminiImage(response, prompt, geminiModel);
    if (image !== null) {
      if (geminiModel !== requested) {
        logger.warn(
          `generateWithGemini: ${requested} could not serve the request; generated with ${geminiModel} instead`,
        );
      }
      return image;
    }
    const missing = describeMissingImage(response);
    if (missing.code === String(ImageFailureCode.CONTENT_REJECTED)) {
      throw missing;
    }
    lastError = missing;
  }
  throw lastError instanceof BusinessException
    ? lastError
    : imageFailure(ImageFailureCode.PROVIDER_FAILURE, 'All Gemini image generation models failed');
};
